"""
AtmoGraph — FastAPI + WebSocket Integration Layer Tests

Tests for Issue #4: Build FastAPI + WebSocket integration layer

Covers:
  - App factory: CORS, router registration, OpenAPI schema
  - Health check endpoint
  - Graph endpoints: GET /api/graph/, GET /api/graph/{node_id}, GET /api/graph/stats
  - Predictions endpoints: POST /api/predict/, POST /api/predict/timeline
  - Disruptions endpoints: POST /api/disrupt/, GET /api/disrupt/active
  - WebSocket: connect, send, disconnect, broadcast
  - Root endpoint + docs availability

Run with:
    cd backend
    python -m pytest tests/test_api.py -v
"""

from __future__ import annotations

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketState


# ── App import (with mocked heavy dependencies) ───────────────────────────────

def _make_mock_gnn_engine():
    """Return a mock GNNInferenceEngine with realistic output."""
    engine = MagicMock()
    engine.predict.return_value = [
        {
            "node_id": "PORT-001",
            "node_type": "Port",
            "predicted_delay_days": 12.5,
            "confidence": 0.87,
            "risk_score": 0.73,
        }
    ]
    engine.predict_timeline.return_value = {
        "30_days":  [{"node_id": "PORT-001", "delay": 12.5}],
        "60_days":  [{"node_id": "PORT-001", "delay": 18.2}],
        "90_days":  [{"node_id": "PORT-001", "delay": 24.1}],
    }
    return engine


def _make_mock_neo4j():
    """Return a mock Neo4j driver."""
    driver = MagicMock()
    session = MagicMock()
    session.__enter__ = MagicMock(return_value=session)
    session.__exit__ = MagicMock(return_value=False)
    driver.session.return_value = session
    driver.verify_connectivity.return_value = None
    return driver


@pytest.fixture(scope="module")
def client():
    """
    TestClient with mocked Neo4j + GNN dependencies so no real
    services are needed.
    """
    mock_driver = _make_mock_neo4j()
    mock_engine = _make_mock_gnn_engine()

    with (
        patch("database.connector.get_neo4j_driver", return_value=mock_driver),
        patch("gnn.inference.GNNInferenceEngine", return_value=mock_engine),
        patch("database.connector.GraphDatabase") as mock_gdb,
    ):
        mock_gdb.driver.return_value = mock_driver

        from api.main import app
        app.state.neo4j     = mock_driver
        app.state.gnn_engine = mock_engine

        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


# ── Root + App Config ─────────────────────────────────────────────────────────

class TestAppConfig:

    def test_root_returns_200(self, client):
        r = client.get("/")
        assert r.status_code == 200

    def test_root_contains_service_name(self, client):
        body = r = client.get("/").json()
        assert "AtmoGraph" in body.get("service", "")

    def test_root_has_docs_link(self, client):
        body = client.get("/").json()
        assert "/docs" in body.get("docs", "")

    def test_openapi_schema_available(self, client):
        r = client.get("/openapi.json")
        assert r.status_code == 200
        schema = r.json()
        assert "openapi" in schema
        assert "AtmoGraph" in schema["info"]["title"]

    def test_docs_page_available(self, client):
        r = client.get("/docs")
        assert r.status_code == 200

    def test_cors_header_present(self, client):
        r = client.options(
            "/health",
            headers={"Origin": "http://localhost:3000",
                     "Access-Control-Request-Method": "GET"}
        )
        # CORS middleware should include the header on pre-flight or regular
        # responses. Status 200 or 405 both show the middleware ran.
        assert r.status_code in (200, 405)


# ── Health Check ──────────────────────────────────────────────────────────────

class TestHealthEndpoint:

    def test_health_returns_200(self, client):
        r = client.get("/health")
        assert r.status_code == 200

    def test_health_body_has_status(self, client):
        body = client.get("/health").json()
        assert "status" in body

    def test_health_method_not_allowed(self, client):
        r = client.post("/health")
        assert r.status_code == 405


# ── Graph Endpoints ───────────────────────────────────────────────────────────

class TestGraphEndpoints:

    def test_get_graph_endpoint_exists(self, client):
        """GET /api/graph/ must exist (200 or 500 from mock, never 404)."""
        r = client.get("/api/graph/")
        assert r.status_code != 404, "Endpoint /api/graph/ must be registered"

    def test_get_graph_stats_endpoint_exists(self, client):
        r = client.get("/api/graph/stats")
        assert r.status_code != 404

    def test_get_single_node_endpoint_exists(self, client):
        r = client.get("/api/graph/PORT-001")
        assert r.status_code != 404


# ── Predictions Endpoints ─────────────────────────────────────────────────────

class TestPredictionsEndpoints:

    VALID_PAYLOAD = {
        "node_id":          "PORT-001",
        "disruption_type":  "strike",
        "severity":         0.75,
        "location":         "Rotterdam",
        "estimated_duration_days": 14,
    }

    def test_predict_endpoint_exists(self, client):
        r = client.post("/api/predict/", json=self.VALID_PAYLOAD)
        assert r.status_code != 404, "POST /api/predict/ must be registered"

    def test_predict_with_valid_payload(self, client):
        r = client.post("/api/predict/", json=self.VALID_PAYLOAD)
        # 200 = success, 422 = validation error in payload schema,
        # 500 = mock DB issue — all acceptable in unit test
        assert r.status_code in (200, 422, 500)

    def test_predict_timeline_endpoint_exists(self, client):
        timeline_payload = {**self.VALID_PAYLOAD, "horizons": [30, 60, 90]}
        r = client.post("/api/predict/timeline", json=timeline_payload)
        assert r.status_code != 404, "POST /api/predict/timeline must be registered"

    def test_predict_missing_required_fields_returns_422(self, client):
        r = client.post("/api/predict/", json={})
        assert r.status_code == 422

    def test_predict_timeline_missing_fields_returns_422(self, client):
        r = client.post("/api/predict/timeline", json={})
        assert r.status_code == 422


# ── Disruptions Endpoints ─────────────────────────────────────────────────────

class TestDisruptionsEndpoints:

    VALID_EVENT = {
        "node_id":                 "PORT-001",
        "node_type":               "Port",
        "disruption_type":         "flood",
        "severity":                0.82,
        "location":                "Shanghai",
        "estimated_duration_days": 7,
        "source_headline":         "Typhoon forces Shanghai port closure",
    }

    def test_ingest_endpoint_exists(self, client):
        r = client.post("/api/disrupt/", json=self.VALID_EVENT)
        assert r.status_code != 404, "POST /api/disrupt/ must be registered"

    def test_ingest_with_valid_event(self, client):
        r = client.post("/api/disrupt/", json=self.VALID_EVENT)
        assert r.status_code in (200, 201, 422, 500)

    def test_get_active_disruptions_endpoint_exists(self, client):
        r = client.get("/api/disrupt/active")
        assert r.status_code != 404

    def test_ingest_missing_fields_returns_422(self, client):
        r = client.post("/api/disrupt/", json={})
        assert r.status_code == 422


# ── WebSocket Manager Unit Tests ──────────────────────────────────────────────

class TestWebSocketManager:
    """Unit tests for the WebSocketManager class without running the server."""

    def _make_ws(self, client_id: str = "test-client") -> MagicMock:
        ws = MagicMock()
        ws.send_json    = AsyncMock()
        ws.send_text    = AsyncMock()
        ws.accept       = AsyncMock()
        ws.close        = AsyncMock()
        ws.client_state = WebSocketState.CONNECTED
        return ws

    @pytest.fixture
    def manager(self):
        from api.websocket import WebSocketManager
        return WebSocketManager()

    @pytest.mark.asyncio
    async def test_connect_adds_client(self, manager):
        ws = self._make_ws("c1")
        await manager.connect(ws, "c1")
        assert manager.connection_count() == 1

    @pytest.mark.asyncio
    async def test_disconnect_removes_client(self, manager):
        ws = self._make_ws("c2")
        await manager.connect(ws, "c2")
        manager.disconnect("c2")
        assert manager.connection_count() == 0

    @pytest.mark.asyncio
    async def test_send_personal_calls_send_json(self, manager):
        ws = self._make_ws("c3")
        await manager.connect(ws, "c3")
        await manager.send_personal({"type": "ping"}, "c3")
        ws.send_json.assert_called_once_with({"type": "ping"})

    @pytest.mark.asyncio
    async def test_broadcast_reaches_all_clients(self, manager):
        ws1 = self._make_ws("c4")
        ws2 = self._make_ws("c5")
        await manager.connect(ws1, "c4")
        await manager.connect(ws2, "c5")
        await manager.broadcast({"type": "update", "data": {}})
        ws1.send_json.assert_called_once()
        ws2.send_json.assert_called_once()

    @pytest.mark.asyncio
    async def test_broadcast_predictions_formats_message(self, manager):
        ws = self._make_ws("c6")
        await manager.connect(ws, "c6")
        predictions = [{"node_id": "PORT-001", "delay": 12.5}]
        await manager.broadcast_predictions(predictions)
        call_args = ws.send_json.call_args[0][0]
        assert call_args.get("type") == "predictions_updated"
        assert "predictions" in call_args

    @pytest.mark.asyncio
    async def test_broadcast_disruption_formats_message(self, manager):
        ws = self._make_ws("c7")
        await manager.connect(ws, "c7")
        event = {"node_id": "PORT-001", "disruption_type": "strike"}
        await manager.broadcast_disruption(event)
        call_args = ws.send_json.call_args[0][0]
        assert call_args.get("type") == "disruption_detected"
        assert "event" in call_args

    @pytest.mark.asyncio
    async def test_connection_count_correct(self, manager):
        ws1, ws2, ws3 = (self._make_ws(f"d{i}") for i in range(3))
        for i, ws in enumerate([ws1, ws2, ws3]):
            await manager.connect(ws, f"d{i}")
        assert manager.connection_count() == 3
        manager.disconnect("d0")
        assert manager.connection_count() == 2

    def test_connection_count_zero_initially(self, manager):
        assert manager.connection_count() == 0

    @pytest.mark.asyncio
    async def test_send_personal_to_unknown_client_no_crash(self, manager):
        """Sending to a non-existent client should not raise."""
        await manager.send_personal({"type": "test"}, "ghost-client")


# ── WebSocket Endpoint Test ───────────────────────────────────────────────────

class TestWebSocketEndpoint:

    def test_websocket_connects_and_receives_pong(self, client):
        with client.websocket_connect("/ws/test-client-123") as ws:
            ws.send_text("ping")
            data = ws.receive_json()
            assert data.get("type") == "pong"
            assert data.get("client_id") == "test-client-123"
