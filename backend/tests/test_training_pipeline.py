"""
AtmoGraph — GNN Training Pipeline & Checkpoint Unit Tests
=========================================================
Tests for Issue #5:
  - Synthetic data generation & PyG conversion
  - Model checkpoint saving and loading
  - Training history logging format
  - Inference engine integration with checkpoint
"""

import json
import tempfile
from pathlib import Path

import pytest
import torch
from torch_geometric.data import Data
from torch_geometric.loader import DataLoader

import sys
TEST_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TEST_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from gnn.features import build_pyg_graph, FEATURE_DIM
from gnn.inference import GNNInferenceEngine
from gnn.trainer import GNNTrainer
from scripts.generate_training_data import simulate_disruption_scenario, generate_pyg_dataset


@pytest.fixture
def sample_graph_data():
    nodes = [
        {"id": "SUP-001", "node_type": "Supplier", "risk_score": 0.2, "capacity_utilization": 0.8, "historical_delay_avg": 2.0},
        {"id": "PORT-001", "node_type": "Port", "risk_score": 0.15, "capacity_utilization": 0.7, "historical_delay_avg": 1.5},
        {"id": "MFG-001", "node_type": "Manufacturer", "risk_score": 0.25, "capacity_utilization": 0.85, "historical_delay_avg": 3.0},
        {"id": "DC-001", "node_type": "DistributionCenter", "risk_score": 0.1, "capacity_utilization": 0.6, "historical_delay_avg": 1.0},
        {"id": "RET-001", "node_type": "Retailer", "risk_score": 0.05, "capacity_utilization": 0.5, "historical_delay_avg": 0.5},
    ]
    edges = [
        {"source": "SUP-001", "target": "PORT-001"},
        {"source": "PORT-001", "target": "MFG-001"},
        {"source": "MFG-001", "target": "DC-001"},
        {"source": "DC-001", "target": "RET-001"},
    ]
    return nodes, edges


def test_simulate_disruption_scenario(sample_graph_data):
    nodes, edges = sample_graph_data
    sc_nodes, sc_edges = simulate_disruption_scenario(nodes, edges, scenario_type="supplier_disruption")

    assert len(sc_nodes) == len(nodes)
    assert any(n["disruption_flag"] for n in sc_nodes)
    assert all("ground_truth_delay" in n for n in sc_nodes)
    # Check that delayed nodes have positive delay days
    assert any(float(n["ground_truth_delay"]) > 5.0 for n in sc_nodes)


def test_generate_pyg_dataset_format(sample_graph_data):
    nodes, edges = sample_graph_data
    dataset = generate_pyg_dataset(nodes, edges, num_scenarios=5, seed=123)

    assert len(dataset) == 5
    for data in dataset:
        assert isinstance(data, Data)
        assert data.x.shape == (len(nodes), FEATURE_DIM)
        assert data.y is not None
        assert data.y.shape == (len(nodes), 1)
        assert (data.y >= 0.0).all()


def test_trainer_smoke_and_checkpoint(sample_graph_data):
    nodes, edges = sample_graph_data
    dataset = generate_pyg_dataset(nodes, edges, num_scenarios=4, seed=42)

    with tempfile.TemporaryDirectory() as tmpdir:
        trainer = GNNTrainer(
            model_type="disruption_aware",
            hidden_channels=16,
            num_sage_layers=2,
            checkpoint_dir=tmpdir,
        )

        loader = DataLoader(dataset, batch_size=2)
        history = trainer.train(train_loader=loader, val_loader=loader, epochs=2)

        assert len(history["train_loss"]) == 2
        assert len(history["val_mae"]) == 2
        assert (Path(tmpdir) / "best_model.pt").exists()
        assert (Path(tmpdir) / "training_history.json").exists()

        # Check json content
        with open(Path(tmpdir) / "training_history.json") as f:
            hist_data = json.load(f)
            assert "train_loss" in hist_data
            assert "val_mae" in hist_data
            assert "val_rmse" in hist_data


def test_inference_engine_loads_checkpoint(sample_graph_data):
    nodes, edges = sample_graph_data
    dataset = generate_pyg_dataset(nodes, edges, num_scenarios=2, seed=99)

    with tempfile.TemporaryDirectory() as tmpdir:
        ckpt_file = Path(tmpdir) / "best_model.pt"
        trainer = GNNTrainer(
            model_type="disruption_aware",
            hidden_channels=32,
            num_sage_layers=2,
            checkpoint_dir=tmpdir,
        )
        loader = DataLoader(dataset, batch_size=2)
        trainer.train(loader, loader, epochs=1)

        # Load into GNNInferenceEngine
        engine = GNNInferenceEngine(
            model_path=str(ckpt_file),
            model_type="disruption_aware",
            hidden_channels=32,
            num_sage_layers=2,
        )

        preds = engine.predict(nodes, edges)
        assert len(preds) == len(nodes)
        for p in preds:
            assert "delay_days" in p
            assert "confidence" in p
            assert "risk_level" in p
            assert 0.0 <= p["delay_days"] <= 90.0
            assert 0.0 <= p["confidence"] <= 1.0
