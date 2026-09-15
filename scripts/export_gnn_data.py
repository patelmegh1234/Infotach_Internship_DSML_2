"""
AtmoGraph — Training Data Exporter
===================================
Exports Neo4j graph topology and node features into:
  - data/processed/gnn_nodes.json
  - data/processed/gnn_edges.json

Week 3 Deliverable (Issue #11: Shubhangi Mane)

Deliverables:
  - Assign realistic ground_truth_delay values based on simulated disruptions
  - 80% train / 20% validation split
  - Validate all 12 GNN feature fields for 100% of nodes
  - Compatible with PyG GNN feature encoder
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from pathlib import Path
from typing import Any

import numpy as np
from loguru import logger

# Add project root and backend to path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from gnn.features import FEATURE_DIM, NODE_TYPES, encode_node_features


REQUIRED_12_FEATURE_FIELDS = [
    "node_type",             # Encodes to indices 0-5 one-hot (6 dims)
    "risk_score",            # Index 6
    "disruption_flag",       # Index 7
    "disruption_severity",   # Index 8
    "historical_delay_avg",  # Index 9
    "capacity_utilization",  # Index 10
    "geo_importance_score",  # Index 11
]

NODE_TYPE_MAPPING = {
    "suppliers": "Supplier",
    "manufacturers": "Manufacturer",
    "factories": "Manufacturer",
    "ports": "Port",
    "distribution_centers": "DistributionCenter",
    "warehouses": "DistributionCenter",
    "retailers": "Retailer",
    "markets": "Retailer",
    "products": "Product",
}


def load_raw_graph(
    neo4j_uri: str,
    neo4j_user: str,
    neo4j_password: str | None,
    mock_file: Path,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Load graph either from live Neo4j or fallback to mock dataset."""
    if neo4j_password:
        try:
            from neo4j import GraphDatabase

            driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
            driver.verify_connectivity()
            logger.info(f"Connected to live Neo4j at {neo4j_uri}")

            with driver.session() as session:
                node_res = session.run("MATCH (n) RETURN labels(n)[0] AS type, properties(n) AS props ORDER BY n.node_id")
                nodes = []
                for r in node_res:
                    p = dict(r["props"])
                    p["node_type"] = r["type"]
                    p.setdefault("id", p.get("node_id", f"node_{len(nodes)}"))
                    nodes.append(p)

                edge_res = session.run("MATCH (s)-[r]->(t) RETURN s.node_id AS s, t.node_id AS t, type(r) AS rel, properties(r) AS p")
                edges = []
                for r in edge_res:
                    edges.append({
                        "source": r["s"],
                        "target": r["t"],
                        "relationship": r["rel"],
                        **r["p"],
                    })

            driver.close()
            if nodes and edges:
                logger.info(f"Loaded {len(nodes)} nodes and {len(edges)} edges from Neo4j.")
                return nodes, edges
        except Exception as exc:
            logger.warning(f"Neo4j connection failed ({exc}). Falling back to mock dataset.")

    # Fallback to mock dataset
    if not mock_file.exists():
        raise FileNotFoundError(f"Mock supply chain file not found: {mock_file}")

    logger.info(f"Loading supply chain graph from {mock_file}...")
    data = json.loads(mock_file.read_text(encoding="utf-8"))

    nodes: list[dict[str, Any]] = []
    raw_nodes = data.get("nodes", {})
    for group_key, items in raw_nodes.items():
        node_type = NODE_TYPE_MAPPING.get(group_key.lower(), "Supplier")
        for item in items:
            node = dict(item)
            node["node_type"] = node_type
            node.setdefault("id", node.get("node_id", f"node_{len(nodes)}"))
            nodes.append(node)

    edges: list[dict[str, Any]] = []
    for r in data.get("relationships", []):
        src = r.get("source_node_id") or r.get("source")
        tgt = r.get("target_node_id") or r.get("target")
        if src and tgt:
            edges.append({
                "source": src,
                "target": tgt,
                "relationship": r.get("relationship_type", "SUPPLIES_TO"),
                **r.get("properties", {}),
            })

    logger.info(f"Loaded {len(nodes)} nodes and {len(edges)} edges from mock dataset.")
    return nodes, edges


def compute_realistic_ground_truth_delays(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    seed: int = 42,
) -> list[dict[str, Any]]:
    """
    Simulate realistic ground truth delays using multi-hop downstream BFS propagation,
    bottleneck amplification from capacity utilization, and historical delay averages.
    """
    rng = random.Random(seed)
    np.random.seed(seed)

    # Build downstream adjacency
    adj: dict[str, list[str]] = {n["id"]: [] for n in nodes}
    for e in edges:
        s, t = e.get("source"), e.get("target")
        if s in adj and t in adj:
            adj[s].append(t)

    node_map = {n["id"]: n for n in nodes}

    # Pick 3-5 historical disruption epicenter seed nodes (mix of ports, tier-1 suppliers, and manufacturers)
    epicenter_candidates = [
        n["id"] for n in nodes
        if n.get("node_type") in ("Port", "Supplier", "Manufacturer")
        or float(n.get("risk_score", 0.0)) > 0.4
    ]
    if not epicenter_candidates:
        epicenter_candidates = [n["id"] for n in nodes]

    num_epicenters = min(4, len(epicenter_candidates))
    epicenters = rng.sample(epicenter_candidates, num_epicenters)

    hop_decay = [1.0, 0.75, 0.45, 0.25, 0.10]

    # Initialize delays
    cumulative_cascade_delays: dict[str, float] = {n["id"]: 0.0 for n in nodes}

    for ep_id in epicenters:
        ep_severity = rng.uniform(0.65, 0.95)
        base_delay = rng.uniform(30.0, 60.0)

        # BFS hop propagation
        hop_dist: dict[str, int] = {ep_id: 0}
        queue = [ep_id]

        while queue:
            curr = queue.pop(0)
            d = hop_dist[curr]
            if d >= 4:
                continue
            for nxt in adj.get(curr, []):
                if nxt not in hop_dist:
                    hop_dist[nxt] = d + 1
                    queue.append(nxt)

        for nid, dist in hop_dist.items():
            decay = hop_decay[min(dist, len(hop_decay) - 1)]
            node = node_map[nid]
            cap_util = float(node.get("capacity_utilization", 0.70))
            amplification = 0.8 + 0.4 * cap_util
            added_delay = base_delay * ep_severity * decay * amplification
            cumulative_cascade_delays[nid] = max(cumulative_cascade_delays[nid], added_delay)

    # Assign delay and validate all properties
    processed_nodes: list[dict[str, Any]] = []

    for n in nodes:
        node = dict(n)
        nid = node["id"]
        hist_delay = float(node.get("historical_delay_avg", 2.0))
        cap_util = float(node.get("capacity_utilization", 0.65))
        risk_sc = float(node.get("risk_score", 0.20))
        cascade = cumulative_cascade_delays.get(nid, 0.0)

        # Baseline noise delay
        baseline_noise = rng.uniform(0.5, 2.5) * (0.8 + 0.4 * risk_sc)
        total_delay = round(cascade + hist_delay * 0.8 + baseline_noise, 2)
        total_delay = float(np.clip(total_delay, 0.5, 95.0))

        # Assign ground truth delay
        node["ground_truth_delay"] = total_delay

        # Fill any missing required feature values with reasonable defaults
        node["risk_score"] = float(np.clip(risk_sc, 0.0, 1.0))
        node["disruption_flag"] = bool(node.get("disruption_flag", cascade > 15.0 or nid in epicenters))
        node["disruption_severity"] = float(round(node.get("disruption_severity", 0.8 if nid in epicenters else min(1.0, cascade / 45.0)), 2))
        node["historical_delay_avg"] = float(round(hist_delay, 2))
        node["capacity_utilization"] = float(round(cap_util, 2))
        node["geo_importance_score"] = float(round(float(node.get("geo_importance_score", rng.uniform(0.4, 0.9))), 2))

        # Compute encoded feature vector (dim=12) for validation
        feat_tensor = encode_node_features(node)
        node["feature_vector"] = [round(float(x), 4) for x in feat_tensor.tolist()]

        processed_nodes.append(node)

    return processed_nodes


def create_train_val_split(nodes: list[dict[str, Any]], train_ratio: float = 0.8, seed: int = 42) -> None:
    """
    Split nodes into 80% train and 20% validation, stratified by node type.
    Mutates node dicts in place with a 'split' attribute.
    """
    rng = random.Random(seed)

    by_type: dict[str, list[dict[str, Any]]] = {}
    for n in nodes:
        by_type.setdefault(n["node_type"], []).append(n)

    for ntype, group in by_type.items():
        rng.shuffle(group)
        n_train = max(1, int(len(group) * train_ratio))
        for i, n in enumerate(group):
            n["split"] = "train" if i < n_train else "val"


def validate_gnn_nodes(nodes: list[dict[str, Any]], edges: list[dict[str, Any]]) -> None:
    """Validate that 100% of nodes conform to GNN requirements."""
    logger.info(f"Validating {len(nodes)} nodes against 12 GNN feature dimensions...")
    node_ids = set()

    for idx, node in enumerate(nodes):
        nid = node.get("id") or node.get("node_id")
        if not nid:
            raise ValueError(f"Node at index {idx} lacks unique identifier.")
        node_ids.add(nid)

        # Check required fields
        for field in REQUIRED_12_FEATURE_FIELDS:
            if field not in node:
                raise ValueError(f"Node {nid} is missing required feature field: '{field}'")

        if node["node_type"] not in NODE_TYPES:
            raise ValueError(f"Node {nid} has unrecognized node_type: {node['node_type']}")

        if not (0.0 <= node["risk_score"] <= 1.0):
            raise ValueError(f"Node {nid} risk_score {node['risk_score']} out of [0, 1] range.")

        if not (0.0 <= node["capacity_utilization"] <= 1.0):
            raise ValueError(f"Node {nid} capacity_utilization {node['capacity_utilization']} out of [0, 1] range.")

        if not (0.0 <= node["geo_importance_score"] <= 1.0):
            raise ValueError(f"Node {nid} geo_importance_score {node['geo_importance_score']} out of [0, 1] range.")

        if node.get("ground_truth_delay", -1) < 0:
            raise ValueError(f"Node {nid} ground_truth_delay must be non-negative.")

        if node.get("split") not in ("train", "val"):
            raise ValueError(f"Node {nid} split must be 'train' or 'val'.")

        fv = node.get("feature_vector")
        if not fv or len(fv) != FEATURE_DIM:
            raise ValueError(f"Node {nid} feature_vector length is {len(fv) if fv else 0}, expected {FEATURE_DIM}.")

    # Validate edges
    logger.info(f"Validating {len(edges)} edges...")
    for idx, edge in enumerate(edges):
        src = edge.get("source")
        tgt = edge.get("target")
        if src not in node_ids:
            logger.warning(f"Edge {idx} source '{src}' not found in exported node set.")
        if tgt not in node_ids:
            logger.warning(f"Edge {idx} target '{tgt}' not found in exported node set.")

    train_count = sum(1 for n in nodes if n["split"] == "train")
    val_count = sum(1 for n in nodes if n["split"] == "val")
    train_pct = round((train_count / len(nodes)) * 100, 1)
    val_pct = round((val_count / len(nodes)) * 100, 1)

    logger.info(f"Validation successful!")
    logger.info(f"  - Total nodes: {len(nodes)}")
    logger.info(f"  - Total edges: {len(edges)}")
    logger.info(f"  - Train nodes: {train_count} ({train_pct}%)")
    logger.info(f"  - Val nodes:   {val_count} ({val_pct}%)")
    logger.info(f"  - All 12 feature dimensions verified on 100% of nodes.")


def export_data(
    output_dir: Path,
    mock_file: Path,
    neo4j_uri: str,
    neo4j_user: str,
    neo4j_password: str | None,
    seed: int = 42,
) -> tuple[Path, Path]:
    """Execute complete data export pipeline."""
    output_dir.mkdir(parents=True, exist_ok=True)

    raw_nodes, raw_edges = load_raw_graph(neo4j_uri, neo4j_user, neo4j_password, mock_file)
    nodes = compute_realistic_ground_truth_delays(raw_nodes, raw_edges, seed=seed)
    create_train_val_split(nodes, train_ratio=0.80, seed=seed)
    validate_gnn_nodes(nodes, raw_edges)

    nodes_file = output_dir / "gnn_nodes.json"
    edges_file = output_dir / "gnn_edges.json"

    nodes_file.write_text(json.dumps(nodes, indent=2), encoding="utf-8")
    edges_file.write_text(json.dumps(raw_edges, indent=2), encoding="utf-8")

    logger.info(f"Exported {len(nodes)} nodes to {nodes_file}")
    logger.info(f"Exported {len(raw_edges)} edges to {edges_file}")

    return nodes_file, edges_file


def main() -> None:
    parser = argparse.ArgumentParser(description="Export graph data for GNN training (Issue #11)")
    parser.add_argument("--output-dir", type=str, default="data/processed", help="Destination folder for exported JSONs")
    parser.add_argument("--mock-file", type=str, default="data/mock/supply_chain_nodes.json", help="Path to mock dataset JSON")
    parser.add_argument("--neo4j-uri", type=str, default=os.getenv("NEO4J_URI", "bolt://localhost:7687"))
    parser.add_argument("--neo4j-user", type=str, default=os.getenv("NEO4J_USER", "neo4j"))
    parser.add_argument("--neo4j-password", type=str, default=os.getenv("NEO4J_PASSWORD", None))
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    export_data(
        output_dir=PROJECT_ROOT / args.output_dir,
        mock_file=PROJECT_ROOT / args.mock_file,
        neo4j_uri=args.neo4j_uri,
        neo4j_user=args.neo4j_user,
        neo4j_password=args.neo4j_password,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
