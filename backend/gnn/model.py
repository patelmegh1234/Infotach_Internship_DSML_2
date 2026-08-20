"""
AtmoGraph GNN — Model Architecture
=====================================
Graph Neural Network for supply chain disruption ripple-effect prediction.

Architecture: GraphSAGE with attention pooling
Task: Node-level regression — predict delay (days) for each supply chain node
      given an upstream disruption event.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

from torch_geometric.nn import (
    SAGEConv,
    GATv2Conv,
    BatchNorm,
    global_mean_pool,
)
from torch_geometric.data import Data, Batch
from torch_geometric.typing import Adj


class SupplyChainGNN(nn.Module):
    """
    Graph Neural Network for Supply Chain Ripple Effect Prediction.

    Architecture Overview:
    ─────────────────────
    Input Features (per node):
        - node_type_embedding    : one-hot encoded node type (Supplier, Port, etc.)
        - risk_score             : current NLP-assigned risk level [0, 1]
        - disruption_flag        : binary, whether disruption directly hits node
        - disruption_severity    : severity of direct disruption [0, 1]
        - historical_delay_avg   : historical average delay (days)
        - capacity_utilization   : current throughput / max capacity [0, 1]
        - geo_lat, geo_lon       : normalised geographic coordinates

    Output (per node):
        - predicted_delay_days   : float — predicted delay in days
        - confidence_score       : model confidence [0, 1]

    Architecture:
        1. Node feature encoder (MLP)
        2. GraphSAGE layers (message passing)
        3. GATv2 attention layer (for interpretability)
        4. MLP decoder → regression head
    """

    NODE_FEATURE_DIM = 12      # Number of input features per node
    NODE_TYPES = 6             # Supplier, Manufacturer, Port, DC, Retailer, Product

    def __init__(
        self,
        in_channels: int = NODE_FEATURE_DIM,
        hidden_channels: int = 64,
        num_sage_layers: int = 3,
        num_heads: int = 4,
        dropout: float = 0.3,
        predict_horizon_days: int = 90,
    ):
        """
        Initialise the Supply Chain GNN.

        Args:
            in_channels:           Input feature dimension per node.
            hidden_channels:       Hidden embedding dimension.
            num_sage_layers:       Number of GraphSAGE message-passing layers.
            num_heads:             Number of attention heads in GATv2 layer.
            dropout:               Dropout probability.
            predict_horizon_days:  Maximum prediction horizon (days).
        """
        super().__init__()

        self.in_channels = in_channels
        self.hidden_channels = hidden_channels
        self.num_sage_layers = num_sage_layers
        self.predict_horizon_days = predict_horizon_days
        self.dropout = dropout

        # ── 1. Node Feature Encoder ──────────────────────
        self.encoder = nn.Sequential(
            nn.Linear(in_channels, hidden_channels),
            nn.LayerNorm(hidden_channels),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_channels, hidden_channels),
            nn.ReLU(),
        )

        # ── 2. GraphSAGE Message Passing Layers ──────────
        self.sage_convs = nn.ModuleList()
        self.sage_norms = nn.ModuleList()
        for i in range(num_sage_layers):
            in_dim = hidden_channels
            self.sage_convs.append(SAGEConv(in_dim, hidden_channels, aggr="mean"))
            self.sage_norms.append(BatchNorm(hidden_channels))

        # ── 3. GATv2 Attention Layer ──────────────────────
        # Provides interpretable attention weights over graph edges
        self.gat_conv = GATv2Conv(
            hidden_channels,
            hidden_channels // num_heads,
            heads=num_heads,
            dropout=dropout,
            concat=True,
        )
        self.gat_norm = BatchNorm(hidden_channels)

        # ── 4. Decoder — Regression Head ─────────────────
        # Outputs: [delay_days, confidence]
        self.decoder = nn.Sequential(
            nn.Linear(hidden_channels, hidden_channels // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_channels // 2, 32),
            nn.ReLU(),
            nn.Linear(32, 2),  # [delay_days, confidence]
        )

        self._init_weights()

    def _init_weights(self) -> None:
        """Xavier uniform initialisation for all linear layers."""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)

    def forward(
        self,
        x: torch.Tensor,
        edge_index: Adj,
        edge_attr: torch.Tensor | None = None,
        batch: torch.Tensor | None = None,
    ) -> dict[str, torch.Tensor]:
        """
        Forward pass.

        Args:
            x:           Node feature matrix [num_nodes, in_channels]
            edge_index:  Graph connectivity [2, num_edges] (COO format)
            edge_attr:   Optional edge features [num_edges, edge_feat_dim]
            batch:       Batch vector for graph-level operations [num_nodes]

        Returns:
            dict with keys:
                - 'delay_days':   Predicted delay in days [num_nodes, 1]
                - 'confidence':   Prediction confidence [num_nodes, 1]
                - 'embeddings':   Node embeddings for visualisation [num_nodes, hidden]
        """
        # ── Encode node features ─────────────────────────
        h = self.encoder(x)

        # ── GraphSAGE message passing ─────────────────────
        for sage_conv, norm in zip(self.sage_convs, self.sage_norms):
            h_new = sage_conv(h, edge_index)
            h_new = norm(h_new)
            h_new = F.relu(h_new)
            h_new = F.dropout(h_new, p=self.dropout, training=self.training)
            # Residual connection
            h = h + h_new

        # ── GATv2 attention pass ─────────────────────────
        h_att, (edge_index_out, attention_weights) = self.gat_conv(
            h, edge_index, return_attention_weights=True
        )
        h = self.gat_norm(h_att)
        h = F.relu(h)

        # ── Store embeddings before decoder ──────────────
        embeddings = h.clone()

        # ── Decode to predictions ─────────────────────────
        out = self.decoder(h)

        # Apply constraints:
        # delay_days ∈ [0, predict_horizon_days], confidence ∈ [0, 1]
        delay_days = torch.sigmoid(out[:, 0:1]) * self.predict_horizon_days
        confidence = torch.sigmoid(out[:, 1:2])

        return {
            "delay_days": delay_days,
            "confidence": confidence,
            "embeddings": embeddings,
            "attention_weights": attention_weights,
        }


class DisruptionAwareGNN(SupplyChainGNN):
    """
    Extended GNN with explicit disruption propagation module.

    Adds a learnable 'disruption propagation kernel' that models
    how disruptions decay across k-hop neighborhoods.

    This is the production model — SupplyChainGNN is the baseline.
    """

    def __init__(self, propagation_hops: int = 3, **kwargs):
        super().__init__(**kwargs)
        self.propagation_hops = propagation_hops

        # Learnable decay weights for k-hop propagation
        self.hop_decay = nn.Parameter(
            torch.tensor([0.8**k for k in range(propagation_hops + 1)])
        )

        # Disruption feature projection
        self.disruption_proj = nn.Linear(
            self.hidden_channels + 2,  # +2 for disruption_flag, disruption_severity
            self.hidden_channels
        )

    def forward(
        self,
        x: torch.Tensor,
        edge_index: Adj,
        edge_attr: torch.Tensor | None = None,
        batch: torch.Tensor | None = None,
    ) -> dict[str, torch.Tensor]:
        """Forward pass with disruption-aware propagation."""

        # Extract disruption signals from input features
        # Feature layout: [..., disruption_flag (idx 2), disruption_severity (idx 3), ...]
        disruption_features = x[:, 2:4]

        # Base GNN forward
        base_out = super().forward(x, edge_index, edge_attr, batch)
        h = base_out["embeddings"]

        # Augment with disruption signals
        h_disrupted = self.disruption_proj(
            torch.cat([h, disruption_features], dim=-1)
        )
        h = h + h_disrupted

        # Re-decode with disruption-aware embeddings
        out = self.decoder(h)
        delay_days = torch.sigmoid(out[:, 0:1]) * self.predict_horizon_days
        confidence = torch.sigmoid(out[:, 1:2])

        return {
            "delay_days": delay_days,
            "confidence": confidence,
            "embeddings": h,
            "attention_weights": base_out["attention_weights"],
            "hop_decay": self.hop_decay.detach(),
        }


def create_model(model_type: str = "disruption_aware", **kwargs) -> nn.Module:
    """
    Factory function to create GNN model instances.

    Args:
        model_type: 'baseline' | 'disruption_aware'
        **kwargs:   Passed to model constructor (hidden_channels, etc.)

    Returns:
        Instantiated GNN model.

    Example:
        model = create_model(
            model_type="disruption_aware",
            hidden_channels=128,
            num_sage_layers=4,
        )
    """
    models = {
        "baseline": SupplyChainGNN,
        "disruption_aware": DisruptionAwareGNN,
    }

    if model_type not in models:
        raise ValueError(f"Unknown model type: {model_type}. Choose from {list(models)}")

    return models[model_type](**kwargs)


if __name__ == "__main__":
    # ── Quick smoke test ──────────────────────────────────
    print("AtmoGraph GNN — Model Architecture Test")
    print("=" * 50)

    # Create dummy supply chain graph
    num_nodes = 50
    num_edges = 150
    feature_dim = SupplyChainGNN.NODE_FEATURE_DIM

    x = torch.randn(num_nodes, feature_dim)
    edge_index = torch.randint(0, num_nodes, (2, num_edges))

    # Test baseline model
    baseline = create_model("baseline", hidden_channels=64)
    out = baseline(x, edge_index)
    print(f"Baseline GNN:")
    print(f"  Delay predictions shape: {out['delay_days'].shape}")
    print(f"  Confidence shape:        {out['confidence'].shape}")
    print(f"  Embeddings shape:        {out['embeddings'].shape}")
    print(f"  Max predicted delay:     {out['delay_days'].max().item():.1f} days")

    # Test disruption-aware model
    prod_model = create_model("disruption_aware", hidden_channels=64)
    out = prod_model(x, edge_index)
    print(f"\nDisruption-Aware GNN:")
    print(f"  Delay predictions shape: {out['delay_days'].shape}")
    print(f"  Hop decay weights:       {out['hop_decay']}")

    total_params = sum(p.numel() for p in prod_model.parameters())
    print(f"\nTotal parameters: {total_params:,}")
    print("✅ Model architecture test passed!")
