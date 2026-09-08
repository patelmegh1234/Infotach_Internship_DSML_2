"""
AtmoGraph — GNN ↔ Neo4j Live Integration Tests
===============================================
Tests for Issue #6:
  - GET_GNN_FEATURES query schema compatibility with Shubhangi's design
  - Live graph pull with graceful fallback
  - End-to-end GNN inference on POST /api/predict/
  - Real-time WebSocket broadcasting of GNN prediction updates
  - Timeline prediction across multi-horizon forecasts
"""

import json
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

import sys
from pathlib import Path
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api.main import app
from database.queries import GET_GNN_FEATURES, GET_ALL_EDGES
from api.routes.predictions import _pull_live_graph


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_get_gnn_features_query_structure():
    """Verify that GET_GNN_FEATURES contains all columns required by the GNN feature schema."""
    query_upper = GET_GNN_FEATURES.upper()
    assert "MATCH (N)" in query_upper
    assert "OUT_DEGREE" in query_upper
    assert "NODE_TYPE" in query_upper
    assert "RISK_SCORE" in query_upper
    assert "DISRUPTION_FLAG" in query_upper
    assert "DISRUPTION_SEVERITY" in query_upper
    assert "HISTORICAL_DELAY_AVG" in query_upper
    assert "CAPACITY_UTILIZATION" in query_upper
    assert "GEO_IMPORTANCE_SCORE" in query_upper


def test_get_all_edges_query_structure():
    """Verify that GET_ALL_EDGES contains source and target mappings."""
    query_upper = GET_ALL_EDGES.upper()
    assert "MATCH (A)-[R]->(B)" in query_upper
    assert "SOURCE" in query_upper
    assert "TARGET" in query_upper
    assert "RELATIONSHIP" in query_upper


def test_pull_live_graph_with_mock_driver():
    """Verify _pull_live_graph extracts Neo4j session records accurately."""
    mock_driver = MagicMock()
    mock_session = MagicMock()
    mock_driver.session.return_value.__enter__.return_value = mock_session

    mock_nodes_record = [
        {
            "id": "node_1",
            "node_id": "SUP-001",
            "node_type": "Supplier",
            "name": "Tata Steel",
            "country": "India",
            "city": "Jamshedpur",
            "risk_score": 0.3,
            "disruption_flag": False,
            "disruption_severity": 0.0,
            "historical_delay_avg": 2.4,
            "capacity_utilization": 0.82,
            "geo_importance_score": 0.6,
            "out_degree": 2,
        },
        {
            "id": "node_2",
            "node_id": "PORT-001",
            "node_type": "Port",
            "name": "Port of Shanghai",
            "country": "China",
            "city": "Shanghai",
            "risk_score": 0.2,
            "disruption_flag": False,
            "disruption_severity": 0.0,
            "historical_delay_avg": 1.5,
            "capacity_utilization": 0.85,
            "geo_importance_score": 0.98,
            "out_degree": 1,
        }
    ]
    mock_edges_record = [
        {
            "source": "node_1",
            "source_node_id": "SUP-001",
            "target": "node_2",
            "target_node_id": "PORT-001",
            "relationship": "SHIPS_THROUGH",
            "weight": 1.0,
            "lead_time_days": 12,
        }
    ]

    mock_session.run.side_effect = [mock_nodes_record, mock_edges_record]

    nodes, edges = _pull_live_graph(mock_driver)
    assert len(nodes) == 2
    assert nodes[0]["node_id"] == "SUP-001"
    assert len(edges) == 1
    assert edges[0]["relationship"] == "SHIPS_THROUGH"


def test_predict_endpoint_runs_gnn_end_to_end(client):
    """Verify POST /api/predict/ applies disruption and executes GNN inference."""
    payload = {
        "node_id": "SUP-001",
        "risk_score": 0.90,
        "disruption_flag": True,
        "severity": 0.85,
        "disruption_type": "strike",
        "description": "Port workers strike in key terminal",
    }

    response = client.post("/api/predict/", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()
    assert data["status"] == "success"
    assert data["disruption_node"] == "SUP-001"
    assert "predictions" in data
    assert len(data["predictions"]) > 0

    first_pred = data["predictions"][0]
    assert "node_id" in first_pred
    assert "predicted_delay_days" in first_pred
    assert "confidence" in first_pred
    assert "risk_level" in first_pred
    assert first_pred["predicted_delay_days"] >= 0.0


def test_predict_broadcasts_to_websocket(client):
    """Verify that calling POST /api/predict/ broadcasts results to connected WebSocket clients."""
    with client.websocket_connect("/ws/dashboard?client_id=test_broadcaster") as websocket:
        # Initial ping/pong handshake check
        websocket.send_text("ping")
        pong_raw = websocket.receive_text()
        assert "pong" in pong_raw

        # Trigger disruption prediction
        payload = {
            "node_id": "PORT-001",
            "risk_score": 0.95,
            "disruption_flag": True,
            "severity": 0.90,
            "disruption_type": "typhoon",
        }
        resp = client.post("/api/predict/", json=payload)
        assert resp.status_code == 200

        # Receive broadcasted message on WebSocket
        ws_msg_raw = websocket.receive_text()
        ws_msg = json.loads(ws_msg_raw)

        assert ws_msg["type"] == "predictions_updated"
        assert ws_msg["disruption_id"] == "PORT-001"
        assert "predictions" in ws_msg
        assert len(ws_msg["predictions"]) > 0


def test_predict_timeline_endpoint(client):
    """Verify POST /api/predict/timeline predicts multi-horizon cascading impact."""
    payload = {
        "disruption": {
            "node_id": "SUP-001",
            "risk_score": 0.85,
            "disruption_flag": True,
            "severity": 0.80,
            "disruption_type": "material_shortage",
        },
        "horizons": [30, 60, 90],
    }

    response = client.post("/api/predict/timeline", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "success"
    assert "timeline" in data
    assert "30_days" in data["timeline"] or 30 in data["timeline"]
    assert "60_days" in data["timeline"] or 60 in data["timeline"]
    assert "90_days" in data["timeline"] or 90 in data["timeline"]
