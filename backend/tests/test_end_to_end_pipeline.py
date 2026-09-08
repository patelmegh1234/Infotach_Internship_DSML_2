"""
AtmoGraph — End-to-End Integration & Load Test Suite
=====================================================
Validates the full pipeline:
  News Headline -> NLP extraction -> Neo4j / Disruption Ingestion -> GNN inference -> WebSocket Broadcast

Also includes:
  - GNN performance benchmark (< 500ms on 500-node graph)
  - WebSocket concurrent load test (multiple simultaneous connections)

Deliverable for Issue #7 (Megh Patel — Team Leader)
"""

from __future__ import annotations

import asyncio
import time
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.main import app, ws_manager
from api.websocket import WebSocketManager
from gnn.inference import GNNInferenceEngine
from nlp.pipeline import NLPPipeline


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# 1. Full End-to-End Integration Tests
# ---------------------------------------------------------------------------

class TestEndToEndPipeline:
    """
    Validates: paste news headline -> NLP detects disruption ->
    Neo4j / API updated -> GNN runs -> WebSocket broadcasts in real-time.
    """

    def test_nlp_extract_endpoint_with_headline(self, client):
        """Test NLP extraction endpoint with realistic supply chain disruption headline."""
        headline = "Port workers in Rotterdam begin indefinite strike over wage disputes"
        resp = client.post("/api/disrupt/nlp-extract", json={"headline": headline})
        assert resp.status_code == 200, f"Failed: {resp.text}"

        data = resp.json()
        assert data["status"] == "extracted"
        event = data["event"]
        assert "node_id" in event
        assert event["disruption_type"] == "strike"
        assert event["severity"] >= 0.6
        assert event["estimated_duration_days"] >= 7

    def test_disruption_ingest_triggers_gnn_and_broadcast(self, client):
        """
        Ingesting a disruption must:
        1. Store the active disruption
        2. Auto-trigger GNN inference across network
        3. Broadcast disruption and predictions to WebSocket
        """
        payload = {
            "node_id": "PORT-001",
            "node_type": "Port",
            "disruption_type": "flood",
            "location": "Shanghai",
            "severity": 0.88,
            "estimated_duration_days": 14,
            "source_headline": "Super Typhoon forces emergency shutdown of Port of Shanghai",
        }

        resp = client.post("/api/disrupt/", json=payload)
        assert resp.status_code == 200, f"Ingest failed: {resp.text}"

        data = resp.json()
        assert data["status"] == "ingested"
        assert data["node_id"] == "PORT-001"
        assert data.get("gnn_prediction_triggered") is True
        assert "predictions" in data

    def test_full_chain_from_headline_to_prediction(self, client):
        """
        Step 1: Parse headline with NLP extract
        Step 2: Ingest event to trigger GNN and broadcast
        Step 3: Check active disruption registry
        """
        # Step 1: Extract from news headline
        headline = "Magnitude 7.2 earthquake halts production at TSMC semiconductor fabrication facilities in Taiwan"
        extract_resp = client.post("/api/disrupt/nlp-extract", json={"headline": headline})
        assert extract_resp.status_code == 200
        extracted_event = extract_resp.json()["event"]
        assert extracted_event["disruption_type"] == "earthquake"

        # Step 2: Ingest disruption
        ingest_resp = client.post("/api/disrupt/", json=extracted_event)
        assert ingest_resp.status_code == 200
        ingest_data = ingest_resp.json()
        assert ingest_data["status"] == "ingested"

        # Step 3: Query active disruptions
        active_resp = client.get("/api/disrupt/active")
        assert active_resp.status_code == 200
        active_list = active_resp.json().get("active_disruptions", [])
        assert any(
            d.get("disruption_id") == ingest_data["disruption_id"] or d.get("node_id") == extracted_event["node_id"]
            for d in active_list
        )


# ---------------------------------------------------------------------------
# 2. Performance Optimization Benchmark (< 500ms for 500-node graph)
# ---------------------------------------------------------------------------

class TestGNNPerformanceBenchmark:
    """
    Ensures GNN inference runs in < 500ms on a 500-node graph.
    """

    def test_gnn_inference_under_500ms(self):
        # Construct synthetic 500-node multi-tier graph
        node_types = ["Supplier", "Manufacturer", "Port", "DistributionCenter", "Retailer"]
        nodes = []
        for i in range(500):
            t = node_types[i % len(node_types)]
            nodes.append({
                "node_id": f"BENCH-{i:04d}",
                "name": f"Node-{i}",
                "node_type": t,
                "risk_score": 0.25,
                "historical_delay_avg": 1.8,
                "capacity_utilization": 0.85,
                "throughput_teu": 1500000 if t == "Port" else 0,
            })

        edges = []
        for i in range(500):
            edges.append({"source": f"BENCH-{i:04d}", "target": f"BENCH-{(i + 1) % 500:04d}", "relationship": "SUPPLIES"})
            edges.append({"source": f"BENCH-{i:04d}", "target": f"BENCH-{(i + 5) % 500:04d}", "relationship": "SHIPS_TO"})
            edges.append({"source": f"BENCH-{i:04d}", "target": f"BENCH-{(i + 19) % 500:04d}", "relationship": "CONNECTS"})

        engine = GNNInferenceEngine(model_path="models/best_model.pt")
        disruption = {"node_id": "BENCH-0000", "severity": 0.90, "disruption_type": "strike"}

        # Warmup run
        engine.predict(nodes, edges, disruption)

        # Benchmark 5 runs
        latencies_ms = []
        for _ in range(5):
            t0 = time.perf_counter()
            preds = engine.predict(nodes, edges, disruption)
            latencies_ms.append((time.perf_counter() - t0) * 1000)

        avg_latency = sum(latencies_ms) / len(latencies_ms)
        p95_latency = sorted(latencies_ms)[int(len(latencies_ms) * 0.95)]

        print(f"\n[PERFORMANCE] 500 nodes, 1500 edges: Avg={avg_latency:.2f}ms, P95={p95_latency:.2f}ms")
        assert avg_latency < 500, f"Average latency {avg_latency:.2f}ms exceeded 500ms target!"
        assert len(preds) == 500


# ---------------------------------------------------------------------------
# 3. WebSocket Multi-Client Load Test
# ---------------------------------------------------------------------------

class TestWebSocketLoad:
    """
    Tests simultaneous WebSocket connections and broadcast resilience.
    """

    @pytest.mark.asyncio
    async def test_websocket_simultaneous_50_connections(self):
        manager = WebSocketManager()
        clients = []

        # Create 50 virtual clients with async mocks
        for i in range(50):
            mock_ws = MagicMock()
            mock_ws.accept = AsyncMock()
            mock_ws.send_json = AsyncMock()
            mock_ws.send_text = AsyncMock()
            mock_ws.close = AsyncMock()
            cid = f"virtual_client_{i:03d}"
            await manager.connect(mock_ws, cid)
            clients.append((cid, mock_ws))

        assert manager.connection_count() == 50

        # Broadcast disruption event
        event = {
            "disruption_id": "DIS-LOAD-01",
            "node_id": "PORT-001",
            "disruption_type": "strike",
            "severity": 0.85,
        }
        await manager.broadcast_disruption(event)

        # Verify all 50 clients received the message
        for cid, ws in clients:
            ws.send_json.assert_called_once()
            call_arg = ws.send_json.call_args[0][0]
            assert call_arg["type"] == "disruption_detected"
            assert call_arg["event"]["node_id"] == "PORT-001"

        # Broadcast GNN predictions
        predictions = [{"node_id": f"N-{i}", "delay_days": i * 0.5} for i in range(20)]
        await manager.broadcast_predictions(predictions, disruption_id="DIS-LOAD-01")

        for cid, ws in clients:
            assert ws.send_json.call_count == 2
            second_call = ws.send_json.call_args_list[1][0][0]
            assert second_call["type"] == "predictions_updated"
            assert len(second_call["predictions"]) == 20

        # Disconnect all clients
        for cid, _ in clients:
            manager.disconnect(cid)

        assert manager.connection_count() == 0

    def test_websocket_endpoint_connection_and_heartbeat(self, client):
        """Verify both /ws and /ws/{client_id} paths work with heartbeat."""
        # 1. Test /ws (auto client ID)
        with client.websocket_connect("/ws") as ws:
            ws.send_text("ping")
            resp = ws.receive_json()
            assert resp["type"] == "pong"
            assert "client_id" in resp

        # 2. Test /ws/custom-dashboard-1
        with client.websocket_connect("/ws/custom-dashboard-1") as ws:
            ws.send_text("ping")
            resp = ws.receive_json()
            assert resp["type"] == "pong"
            assert resp["client_id"] == "custom-dashboard-1"
