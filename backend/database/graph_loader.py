"""
AtmoGraph — GNN Graph Loader

Fetches Neo4j nodes and edges and returns lists of dictionaries
for Megh's build_pyg_graph() function.
"""

from __future__ import annotations

from typing import Any

from loguru import logger

from .connector import get_neo4j_driver
from .queries import GET_ALL_EDGES, GET_GNN_FEATURES


# These fields must exist for Megh's encode_node_features() function.
# The six one-hot values are derived automatically from node_type.
REQUIRED_NODE_FIELDS = (
    "id",
    "node_type",
    "risk_score",
    "disruption_flag",
    "disruption_severity",
    "historical_delay_avg",
    "capacity_utilization",
    "geo_importance_score",
)


def validate_node_feature_completeness(nodes: list[dict]) -> None:
    """
    Raise an error if a node is missing a required GNN feature field.
    """
    for node in nodes:
        missing_fields = [
            field
            for field in REQUIRED_NODE_FIELDS
            if field not in node or node[field] is None
        ]

        if missing_fields:
            raise ValueError(
                f"Node {node.get('id', 'unknown')} is missing GNN fields: "
                f"{', '.join(missing_fields)}"
            )


def get_graph_for_gnn() -> tuple[list[dict], list[dict]]:
    """
    Fetch graph data from Neo4j for PyTorch Geometric.

    Returns:
        A tuple containing:
        - nodes: dictionaries with all raw fields needed for 12 GNN features
        - edges: dictionaries with source and target Neo4j element IDs
    """
    driver = get_neo4j_driver()

    with driver.session() as session:
        node_records = session.run(GET_GNN_FEATURES, limit=10000)
        nodes: list[dict[str, Any]] = [
            record.data()
            for record in node_records
        ]

        edge_records = session.run(GET_ALL_EDGES, limit=50000)
        edges: list[dict[str, Any]] = [
            record.data()
            for record in edge_records
        ]

    validate_node_feature_completeness(nodes)

    node_ids = {node["id"] for node in nodes}
    invalid_edges = [
        edge
        for edge in edges
        if edge["source"] not in node_ids or edge["target"] not in node_ids
    ]

    if invalid_edges:
        raise ValueError(
            f"Found {len(invalid_edges)} edges with missing source or target nodes."
        )

    logger.info(
        "Loaded graph for GNN: {} nodes, {} edges",
        len(nodes),
        len(edges),
    )

    return nodes, edges


if __name__ == "__main__":
    nodes, edges = get_graph_for_gnn()

    print(f"Nodes loaded: {len(nodes)}")
    print(f"Edges loaded: {len(edges)}")
    print(f"Example node: {nodes[0]}")
    print(f"Example edge: {edges[0]}")