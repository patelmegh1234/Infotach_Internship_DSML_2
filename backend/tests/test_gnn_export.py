"""
Unit and Integration Tests for GNN Training Data Export (Issue #11)
===================================================================
Tests verification of:
  - data/processed/gnn_nodes.json and gnn_edges.json
  - 12-dimensional GNN feature layout
  - Realistic ground truth delay values
  - 80% train / 20% validation split
"""

import json
from pathlib import Path
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
NODES_FILE = PROCESSED_DIR / "gnn_nodes.json"
EDGES_FILE = PROCESSED_DIR / "gnn_edges.json"


@pytest.fixture(scope="module")
def exported_data():
    """Load exported nodes and edges JSON files."""
    assert NODES_FILE.exists(), f"Missing {NODES_FILE}. Run scripts/export_gnn_data.py first."
    assert EDGES_FILE.exists(), f"Missing {EDGES_FILE}. Run scripts/export_gnn_data.py first."

    nodes = json.loads(NODES_FILE.read_text(encoding="utf-8"))
    edges = json.loads(EDGES_FILE.read_text(encoding="utf-8"))
    return nodes, edges


def test_exported_files_non_empty(exported_data):
    nodes, edges = exported_data
    assert len(nodes) >= 150, f"Expected at least 150 nodes, got {len(nodes)}"
    assert len(edges) >= 200, f"Expected at least 200 edges, got {len(edges)}"


def test_required_12_features_present(exported_data):
    nodes, _ = exported_data
    required_keys = [
        "id",
        "node_type",
        "risk_score",
        "disruption_flag",
        "disruption_severity",
        "historical_delay_avg",
        "capacity_utilization",
        "geo_importance_score",
        "ground_truth_delay",
        "split",
        "feature_vector",
    ]

    valid_types = {"Supplier", "Manufacturer", "Port", "DistributionCenter", "Retailer", "Product"}

    for node in nodes:
        nid = node.get("id")
        for k in required_keys:
            assert k in node, f"Node {nid} missing required key: {k}"

        assert node["node_type"] in valid_types, f"Node {nid} has invalid type: {node['node_type']}"
        assert 0.0 <= node["risk_score"] <= 1.0, f"Node {nid} risk_score invalid"
        assert 0.0 <= node["capacity_utilization"] <= 1.0, f"Node {nid} capacity_utilization invalid"
        assert 0.0 <= node["geo_importance_score"] <= 1.0, f"Node {nid} geo_importance_score invalid"
        assert isinstance(node["disruption_flag"], bool), f"Node {nid} disruption_flag must be boolean"

        fv = node["feature_vector"]
        assert len(fv) == 12, f"Node {nid} feature vector dimension is {len(fv)}, expected 12"
        assert all(isinstance(x, (int, float)) for x in fv), f"Node {nid} contains non-numeric features"


def test_ground_truth_delay_validity(exported_data):
    nodes, _ = exported_data
    delays = [n["ground_truth_delay"] for n in nodes]

    assert all(d >= 0.0 for d in delays), "All ground_truth_delay values must be non-negative"
    assert any(d > 10.0 for d in delays), "Ground truth delays should reflect disruption propagation (> 10 days)"
    assert max(delays) <= 120.0, "Delays should not exceed reasonable bound"


def test_train_val_split_ratio(exported_data):
    nodes, _ = exported_data
    train_nodes = [n for n in nodes if n["split"] == "train"]
    val_nodes = [n for n in nodes if n["split"] == "val"]

    assert len(train_nodes) + len(val_nodes) == len(nodes)
    ratio = len(train_nodes) / len(nodes)
    # Expected 80% train with small margin of error due to integer stratification
    assert 0.78 <= ratio <= 0.82, f"Train split ratio {ratio:.3f} outside expected 80% band"


def test_edge_references_valid_nodes(exported_data):
    nodes, edges = exported_data
    node_ids = {n["id"] for n in nodes}

    for edge in edges:
        assert "source" in edge and "target" in edge
        assert edge["source"] in node_ids, f"Edge references missing source: {edge['source']}"
        assert edge["target"] in node_ids, f"Edge references missing target: {edge['target']}"
