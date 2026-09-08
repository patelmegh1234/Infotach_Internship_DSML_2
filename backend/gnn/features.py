"""
AtmoGraph GNN — Node Feature Engineering
==========================================
Converts raw Neo4j graph node properties into PyTorch Geometric tensors.

Responsibilities:
  - Define the feature schema for each node type
  - Normalize and encode raw node attributes
  - Build PyTorch Geometric Data objects from Neo4j query results

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from __future__ import annotations

import numpy as np
import torch
from torch_geometric.data import Data
from typing import Any


# ── Node Type Encoding ────────────────────────────────────
NODE_TYPES = {
    "Supplier": 0,
    "Manufacturer": 1,
    "Port": 2,
    "DistributionCenter": 3,
    "Retailer": 4,
    "Product": 5,
}

# ── Feature schema ────────────────────────────────────────
# Feature vector layout for each node (dimension = 12):
#
#  Index | Feature                  | Type    | Range
#  ------|--------------------------|---------|----------
#    0-5 | node_type_onehot         | float   | {0, 1}
#    6   | risk_score               | float   | [0, 1]
#    7   | disruption_flag          | float   | {0, 1}
#    8   | disruption_severity      | float   | [0, 1]
#    9   | historical_delay_avg     | float   | [0, 1] (normalised)
#    10  | capacity_utilization     | float   | [0, 1]
#    11  | geo_importance_score     | float   | [0, 1]

FEATURE_DIM = 12
MAX_DELAY_DAYS = 180   # Normalisation ceiling for historical delays


def encode_node_features(node: dict[str, Any]) -> np.ndarray:
    """
    Encode a single Neo4j node property dict into a feature vector.

    Args:
        node: Dict of node properties from Neo4j. Expected keys:
              - node_type (str)
              - risk_score (float, 0-1)
              - disruption_flag (bool)
              - disruption_severity (float, 0-1)
              - historical_delay_avg (float, days)
              - capacity_utilization (float, 0-1)
              - geo_importance_score (float, 0-1)

    Returns:
        numpy array of shape (FEATURE_DIM,)
    """
    feat = np.zeros(FEATURE_DIM, dtype=np.float32)

    # One-hot encode node type (indices 0-5)
    node_type = node.get("node_type", "Supplier")
    type_idx = NODE_TYPES.get(node_type, 0)
    feat[type_idx] = 1.0

    # Risk and disruption features (indices 6-8)
    feat[6] = float(node.get("risk_score", 0.0))
    feat[7] = 1.0 if node.get("disruption_flag", False) else 0.0
    feat[8] = float(node.get("disruption_severity", 0.0))

    # Operational features (indices 9-11)
    raw_delay = float(node.get("historical_delay_avg", 0.0))
    feat[9] = min(raw_delay / MAX_DELAY_DAYS, 1.0)  # Normalise
    feat[10] = float(node.get("capacity_utilization", 0.5))
    feat[11] = float(node.get("geo_importance_score", 0.5))

    return torch.from_numpy(feat)


def build_pyg_graph(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    node_id_field: str = "id",
) -> Data:
    """
    Build a PyTorch Geometric Data object from Neo4j node/edge lists.

    Args:
        nodes:         List of node property dicts from Neo4j.
        edges:         List of edge dicts with 'source' and 'target' fields.
        node_id_field: Name of the unique ID field in node dicts.

    Returns:
        torch_geometric.data.Data object ready for GNN inference.
    """
    # Build node index mapping
    id_to_idx = {
        node.get(node_id_field, node.get("node_id", i)): i
        for i, node in enumerate(nodes)
    }

    # Build feature matrix
    x_tensors = [encode_node_features(n) for n in nodes]
    if x_tensors:
        if isinstance(x_tensors[0], torch.Tensor):
            x_tensor = torch.stack(x_tensors)
        else:
            x_tensor = torch.tensor(np.stack(x_tensors), dtype=torch.float32)
    else:
        x_tensor = torch.zeros((0, FEATURE_DIM), dtype=torch.float32)

    # Build edge index
    src_list, dst_list = [], []
    for edge in edges:
        src_id = edge.get("source") if edge.get("source") is not None else (edge.get("src") or edge.get("from"))
        dst_id = edge.get("target") if edge.get("target") is not None else (edge.get("dst") or edge.get("to"))
        if src_id in id_to_idx and dst_id in id_to_idx:
            src_list.append(id_to_idx[src_id])
            dst_list.append(id_to_idx[dst_id])

    if src_list:
        edge_index = torch.tensor([src_list, dst_list], dtype=torch.long)
    else:
        edge_index = torch.zeros((2, 0), dtype=torch.long)

    # Node labels (delay ground truth, if available for training)
    y = None
    if any("ground_truth_delay" in n for n in nodes):
        y = torch.tensor(
            [float(n.get("ground_truth_delay", 0.0)) for n in nodes],
            dtype=torch.float32,
        ).unsqueeze(1)

    node_ids = [
        node.get(node_id_field, node.get("node_id", i))
        for i, node in enumerate(nodes)
    ]

    return Data(
        x=x_tensor,
        edge_index=edge_index,
        y=y,
        num_nodes=len(nodes),
        node_ids=node_ids,  # Keep original IDs
    )


def update_node_risk(
    graph: Data,
    node_id: str,
    risk_score: float,
    disruption_flag: bool = False,
    disruption_severity: float = 0.0,
) -> Data:
    """
    Update risk features for a specific node in the graph.
    Called when the NLP engine detects a new disruption.

    Args:
        graph:                PyG Data object to update.
        node_id:              ID of the node to update.
        risk_score:           New risk score [0, 1].
        disruption_flag:      Whether this node is directly disrupted.
        disruption_severity:  Severity of the disruption [0, 1].

    Returns:
        Updated Data object (in-place modification).
    """
    if not hasattr(graph, "node_ids"):
        raise AttributeError("Graph has no 'node_ids' attribute. Build with build_pyg_graph().")

    try:
        node_idx = graph.node_ids.index(node_id)
    except ValueError:
        raise ValueError(f"Node ID '{node_id}' not found in graph.")

    # Update risk features in-place
    graph.x[node_idx, 6] = risk_score
    graph.x[node_idx, 7] = 1.0 if disruption_flag else 0.0
    graph.x[node_idx, 8] = disruption_severity

    return graph
