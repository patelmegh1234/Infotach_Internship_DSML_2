"""
AtmoGraph — GNN Package

Public API for the supply chain Graph Neural Network module.

Quick usage:
    from gnn import create_model, GNNTrainer, GNNInferenceEngine, build_pyg_graph

    model = create_model("disruption_aware", hidden_channels=64)
    engine = GNNInferenceEngine(model_path="models/best_model.pt")
    result = engine.predict(pyg_data)
"""

from .model import SupplyChainGNN, DisruptionAwareGNN, create_model
from .features import encode_node_features, build_pyg_graph, update_node_risk
from .trainer import GNNTrainer
from .inference import GNNInferenceEngine

__all__ = [
    # Models
    "SupplyChainGNN",
    "DisruptionAwareGNN",
    "create_model",
    # Feature engineering
    "encode_node_features",
    "build_pyg_graph",
    "update_node_risk",
    # Training
    "GNNTrainer",
    # Inference
    "GNNInferenceEngine",
]
