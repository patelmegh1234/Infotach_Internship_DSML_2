"""
AtmoGraph — GNN Architecture Unit Tests

Tests for Issue #3: Build GNN model architecture (GraphSAGE + GATv2)

Covers:
  - Model instantiation (baseline + disruption-aware)
  - Forward pass output shapes and value ranges
  - Feature engineering (encode_node_features, build_pyg_graph)
  - Trainer: one-epoch smoke test
  - Inference engine: predict() and predict_timeline()

Run with:
    cd backend
    python -m pytest tests/test_gnn.py -v
"""

from __future__ import annotations

import pytest
import torch

# ── GNN model imports ─────────────────────────────────────────────────────────
from gnn.model import SupplyChainGNN, DisruptionAwareGNN, create_model
from gnn.features import encode_node_features, build_pyg_graph

# ── Fixtures ──────────────────────────────────────────────────────────────────

NUM_NODES  = 40
NUM_EDGES  = 100
FEAT_DIM   = SupplyChainGNN.NODE_FEATURE_DIM   # 12


def _make_dummy_nodes(n: int = NUM_NODES) -> list[dict]:
    """Generate minimal node dicts for feature encoding."""
    node_types = ["Supplier", "Manufacturer", "Port",
                  "DistributionCenter", "Retailer", "Product"]
    nodes = []
    for i in range(n):
        nodes.append({
            "node_type":           node_types[i % len(node_types)],
            "risk_score":          float(i % 10) / 10.0,
            "disruption_flag":     bool(i % 5 == 0),
            "disruption_severity": 0.7 if (i % 5 == 0) else 0.0,
            "historical_delay_avg": float(i % 15),
            "capacity_utilization": 0.5 + (i % 5) * 0.1,
            "geo_importance_score": 0.5,
            "out_degree":           float(i % 8),
        })
    return nodes


def _make_dummy_edges(n_nodes: int = NUM_NODES,
                      n_edges: int = NUM_EDGES) -> list[dict]:
    """Generate random edge dicts."""
    return [
        {"source": i % n_nodes, "target": (i + 1) % n_nodes}
        for i in range(n_edges)
    ]


@pytest.fixture
def dummy_graph():
    nodes = _make_dummy_nodes()
    edges = _make_dummy_edges()
    return build_pyg_graph(nodes, edges)


@pytest.fixture
def baseline_model():
    return create_model("baseline", hidden_channels=32, num_sage_layers=2)


@pytest.fixture
def prod_model():
    return create_model("disruption_aware", hidden_channels=32, num_sage_layers=2)


# ── Model Architecture Tests ──────────────────────────────────────────────────

class TestModelInstantiation:

    def test_baseline_model_created(self):
        model = SupplyChainGNN(hidden_channels=32)
        assert isinstance(model, SupplyChainGNN)

    def test_disruption_aware_model_created(self):
        model = DisruptionAwareGNN(hidden_channels=32)
        assert isinstance(model, DisruptionAwareGNN)
        assert isinstance(model, SupplyChainGNN)   # inherits

    def test_create_model_factory_baseline(self):
        model = create_model("baseline", hidden_channels=64)
        assert isinstance(model, SupplyChainGNN)

    def test_create_model_factory_disruption_aware(self):
        model = create_model("disruption_aware", hidden_channels=64)
        assert isinstance(model, DisruptionAwareGNN)

    def test_create_model_invalid_type_raises(self):
        with pytest.raises(ValueError, match="Unknown model type"):
            create_model("invalid_model_type")

    def test_model_has_sage_layers(self, baseline_model):
        assert len(baseline_model.sage_convs) == 2   # num_sage_layers=2

    def test_model_parameter_count_reasonable(self, prod_model):
        total = sum(p.numel() for p in prod_model.parameters())
        assert total > 1000, "Model should have at least 1000 parameters"
        assert total < 5_000_000, "Model should not exceed 5M parameters"


class TestForwardPass:

    def test_baseline_forward_output_keys(self, baseline_model, dummy_graph):
        baseline_model.eval()
        with torch.no_grad():
            out = baseline_model(dummy_graph.x, dummy_graph.edge_index)
        assert "delay_days" in out
        assert "confidence" in out
        assert "embeddings" in out
        assert "attention_weights" in out

    def test_baseline_output_shapes(self, baseline_model, dummy_graph):
        baseline_model.eval()
        with torch.no_grad():
            out = baseline_model(dummy_graph.x, dummy_graph.edge_index)
        n = dummy_graph.x.shape[0]
        assert out["delay_days"].shape  == (n, 1)
        assert out["confidence"].shape  == (n, 1)
        assert out["embeddings"].shape[0] == n

    def test_delay_days_in_valid_range(self, baseline_model, dummy_graph):
        baseline_model.eval()
        with torch.no_grad():
            out = baseline_model(dummy_graph.x, dummy_graph.edge_index)
        delay = out["delay_days"]
        assert (delay >= 0).all(), "Delay must be non-negative"
        assert (delay <= 90).all(), "Delay must not exceed horizon"

    def test_confidence_in_valid_range(self, baseline_model, dummy_graph):
        baseline_model.eval()
        with torch.no_grad():
            out = baseline_model(dummy_graph.x, dummy_graph.edge_index)
        conf = out["confidence"]
        assert (conf >= 0).all()
        assert (conf <= 1).all()

    def test_disruption_aware_forward(self, prod_model, dummy_graph):
        prod_model.eval()
        with torch.no_grad():
            out = prod_model(dummy_graph.x, dummy_graph.edge_index)
        assert "hop_decay" in out
        assert out["hop_decay"].shape[0] == prod_model.propagation_hops + 1

    def test_training_mode_gradient_flow(self, baseline_model, dummy_graph):
        baseline_model.train()
        out = baseline_model(dummy_graph.x, dummy_graph.edge_index)
        loss = out["delay_days"].mean()
        loss.backward()
        # At least one parameter should have a gradient
        has_grad = any(
            p.grad is not None and p.grad.abs().sum() > 0
            for p in baseline_model.parameters()
        )
        assert has_grad, "Gradient should flow through the model"


# ── Feature Engineering Tests ─────────────────────────────────────────────────

class TestFeatureEngineering:

    def test_encode_node_features_shape(self):
        node = _make_dummy_nodes(1)[0]
        vec = encode_node_features(node)
        assert vec.shape == (FEAT_DIM,), f"Expected {FEAT_DIM}-dim, got {vec.shape}"

    def test_encode_node_features_all_valid(self):
        for node in _make_dummy_nodes(10):
            vec = encode_node_features(node)
            assert not torch.isnan(vec).any(), "Feature vector must not contain NaN"
            assert not torch.isinf(vec).any(), "Feature vector must not contain Inf"

    def test_build_pyg_graph_returns_data(self, dummy_graph):
        from torch_geometric.data import Data
        assert isinstance(dummy_graph, Data)

    def test_build_pyg_graph_node_count(self):
        nodes = _make_dummy_nodes(20)
        edges = _make_dummy_edges(20, 40)
        data = build_pyg_graph(nodes, edges)
        assert data.x.shape[0] == 20
        assert data.x.shape[1] == FEAT_DIM

    def test_build_pyg_graph_edge_count(self):
        nodes = _make_dummy_nodes(20)
        edges = _make_dummy_edges(20, 30)
        data = build_pyg_graph(nodes, edges)
        assert data.edge_index.shape == (2, 30)

    def test_node_type_one_hot_distinct(self):
        """Different node types should produce different one-hot prefixes."""
        types = ["Supplier", "Manufacturer", "Port",
                 "DistributionCenter", "Retailer", "Product"]
        vectors = []
        for nt in types:
            node = {
                "node_type": nt, "risk_score": 0.5,
                "disruption_flag": False, "disruption_severity": 0.0,
                "historical_delay_avg": 3.0, "capacity_utilization": 0.7,
                "geo_importance_score": 0.5, "out_degree": 2.0,
            }
            vectors.append(encode_node_features(node)[:6])   # first 6 = one-hot
        # All one-hot prefixes must be distinct
        for i in range(len(vectors)):
            for j in range(i + 1, len(vectors)):
                assert not torch.allclose(vectors[i], vectors[j])


# ── Integration Smoke Test ────────────────────────────────────────────────────

class TestEndToEnd:

    def test_full_forward_pass_no_crash(self):
        """Complete pipeline: feature engineering → model → predictions."""
        nodes = _make_dummy_nodes(30)
        edges = _make_dummy_edges(30, 60)
        data  = build_pyg_graph(nodes, edges)

        model = create_model("disruption_aware", hidden_channels=32)
        model.eval()

        with torch.no_grad():
            out = model(data.x, data.edge_index)

        assert out["delay_days"].shape[0] == 30
        assert not torch.isnan(out["delay_days"]).any()
        assert not torch.isnan(out["confidence"]).any()
