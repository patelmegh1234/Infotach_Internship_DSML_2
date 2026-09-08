"""
AtmoGraph — Training Data Generation & PyG Export
===================================================
Exports Neo4j graph structure and mock supply chain data into
PyTorch Geometric (PyG) format with realistic disruption propagation
scenarios and ground-truth delay labels for GNN training.

Week 3 Deliverable (Issue #5: Megh Patel — Team Leader)

Usage:
    python scripts/generate_training_data.py --num-scenarios 600
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
import torch
from loguru import logger

# Add project root and backend to path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from gnn.features import FEATURE_DIM, build_pyg_graph, encode_node_features


NODE_TYPE_MAPPING = {
    "suppliers": "Supplier",
    "manufacturers": "Manufacturer",
    "ports": "Port",
    "distribution_centers": "DistributionCenter",
    "retailers": "Retailer",
    "products": "Product",
}


def load_from_neo4j(uri: str, user: str, password: str | None) -> tuple[list[dict], list[dict]] | None:
    """Attempt to load supply chain graph directly from Neo4j."""
    if not password:
        logger.warning("No NEO4J_PASSWORD provided; skipping live Neo4j connection.")
        return None

    try:
        from neo4j import GraphDatabase

        driver = GraphDatabase.driver(uri, auth=(user, password))
        driver.verify_connectivity()
        logger.info(f"Connected to Neo4j at {uri}")

        with driver.session() as session:
            node_records = session.run(
                """
                MATCH (n)
                RETURN labels(n)[0] AS node_type, properties(n) AS props
                ORDER BY n.node_id
                """
            )
            nodes = []
            for r in node_records:
                props = dict(r["props"])
                props["node_type"] = r["node_type"]
                props.setdefault("id", props.get("node_id", f"node_{len(nodes)}"))
                nodes.append(props)

            edge_records = session.run(
                """
                MATCH (s)-[r]->(t)
                RETURN s.node_id AS source, t.node_id AS target, type(r) AS rel_type, properties(r) AS props
                """
            )
            edges = []
            for r in edge_records:
                edges.append({
                    "source": r["source"],
                    "target": r["target"],
                    "relationship": r["rel_type"],
                    **r["props"],
                })

        driver.close()
        logger.info(f"Loaded {len(nodes)} nodes and {len(edges)} relationships from Neo4j.")
        return nodes, edges

    except Exception as exc:
        logger.warning(f"Could not load graph from Neo4j ({exc}). Falling back to exported dataset.")
        return None


def load_from_mock_json(mock_path: Path) -> tuple[list[dict], list[dict]]:
    """Load graph structure from exported mock supply chain JSON dataset."""
    if not mock_path.exists():
        raise FileNotFoundError(f"Mock dataset file not found at: {mock_path}")

    logger.info(f"Loading mock dataset from {mock_path}")
    data = json.loads(mock_path.read_text(encoding="utf-8"))

    nodes = []
    raw_nodes = data.get("nodes", {})
    for group_key, group_items in raw_nodes.items():
        node_type = NODE_TYPE_MAPPING.get(group_key, "Supplier")
        for item in group_items:
            props = dict(item)
            props["node_type"] = node_type
            props.setdefault("id", props.get("node_id", f"node_{len(nodes)}"))
            nodes.append(props)

    edges = []
    raw_rels = data.get("relationships", [])
    for rel in raw_rels:
        src = rel.get("source_node_id") or rel.get("source")
        tgt = rel.get("target_node_id") or rel.get("target")
        if src and tgt:
            edges.append({
                "source": src,
                "target": tgt,
                "relationship": rel.get("relationship_type", "SUPPLIES_TO"),
                **rel.get("properties", {}),
            })

    logger.info(f"Loaded {len(nodes)} nodes and {len(edges)} relationships from mock JSON.")
    return nodes, edges


def simulate_disruption_scenario(
    base_nodes: list[dict],
    base_edges: list[dict],
    scenario_type: str = "supplier_disruption",
    rng: random.Random | None = None,
) -> tuple[list[dict], list[dict]]:
    """
    Simulate a single supply chain disruption scenario with ripple delay propagation.

    Computes:
      - Direct disruption on 1 or 2 origin nodes
      - Multi-hop propagation downstream via BFS
      - Capacity utilization damping
      - Ground-truth delay days target for each node
    """
    if rng is None:
        rng = random.Random()

    # Build adjacency list for downstream ripple propagation (directed + reciprocal partial flow)
    adj: dict[str, list[str]] = {n["id"]: [] for n in base_nodes}
    for e in base_edges:
        src, tgt = e.get("source"), e.get("target")
        if src in adj and tgt in adj:
            adj[src].append(tgt)

    # Deep copy nodes to avoid mutating shared base
    scenario_nodes = [dict(n) for n in base_nodes]
    id_to_node = {n["id"]: n for n in scenario_nodes}

    # Reset disruption and baseline state
    for n in scenario_nodes:
        hist = float(n.get("historical_delay_avg", 2.0))
        n["disruption_flag"] = False
        n["disruption_severity"] = 0.0
        n["risk_score"] = float(np.clip(float(n.get("risk_score", 0.2)) + rng.uniform(-0.05, 0.05), 0.05, 0.4))
        # Normal baseline noise delay: 0 - 3.5 days
        n["ground_truth_delay"] = float(np.clip(hist * rng.uniform(0.6, 1.2) + rng.uniform(0.0, 1.5), 0.0, 5.0))

    if scenario_type == "normal_operations":
        # Pure operational baseline without major disruption
        return scenario_nodes, base_edges

    # Determine disruption origin candidates based on scenario type
    if scenario_type == "supplier_disruption":
        candidates = [n for n in scenario_nodes if n.get("node_type") == "Supplier"]
    elif scenario_type == "port_disruption":
        candidates = [n for n in scenario_nodes if n.get("node_type") == "Port"]
    elif scenario_type == "manufacturer_disruption":
        candidates = [n for n in scenario_nodes if n.get("node_type") == "Manufacturer"]
    elif scenario_type == "compound_disruption":
        candidates = [n for n in scenario_nodes if n.get("node_type") in ("Supplier", "Port")]
    else:
        candidates = scenario_nodes

    if not candidates:
        candidates = scenario_nodes

    # Pick 1 or 2 origin nodes
    num_origins = 2 if scenario_type == "compound_disruption" and len(candidates) > 1 else 1
    origins = rng.sample(candidates, num_origins)

    # Multi-hop propagation parameters
    hop_decay = [1.0, 0.72, 0.48, 0.26, 0.12]

    for origin in origins:
        origin_id = origin["id"]
        severity = rng.uniform(0.50, 0.98)
        base_direct_delay = rng.uniform(25.0, 65.0)

        # BFS tracking hop distance from origin
        hop_dist: dict[str, int] = {origin_id: 0}
        queue = [origin_id]

        while queue:
            curr = queue.pop(0)
            curr_dist = hop_dist[curr]
            if curr_dist >= 4:
                continue

            for nxt in adj.get(curr, []):
                if nxt not in hop_dist:
                    hop_dist[nxt] = curr_dist + 1
                    queue.append(nxt)

        # Apply delay and risk updates along propagation wavefront
        for nid, dist in hop_dist.items():
            node = id_to_node[nid]
            decay = hop_decay[min(dist, len(hop_decay) - 1)]
            cap_util = float(node.get("capacity_utilization", 0.75))
            hist_delay = float(node.get("historical_delay_avg", 2.0))

            # Capacity utilization amplifies bottlenecks: high utilization means no spare buffer
            amplification = 0.7 + 0.5 * cap_util
            cascade_delay = base_direct_delay * severity * decay * amplification + hist_delay * 1.5

            if dist == 0:
                node["disruption_flag"] = True
                node["disruption_severity"] = severity
                node["risk_score"] = float(np.clip(max(float(node["risk_score"]), severity * 1.05), 0.70, 1.0))
                node["ground_truth_delay"] = float(np.clip(max(float(node["ground_truth_delay"]), cascade_delay), 20.0, 90.0))
            else:
                # Downstream ripple effect
                node["risk_score"] = float(np.clip(max(float(node["risk_score"]), severity * decay * 1.1), 0.15, 0.95))
                existing_delay = float(node["ground_truth_delay"])
                node["ground_truth_delay"] = float(np.clip(max(existing_delay, cascade_delay), 0.0, 90.0))

    return scenario_nodes, base_edges


def generate_pyg_dataset(
    nodes: list[dict],
    edges: list[dict],
    num_scenarios: int = 600,
    seed: int = 42,
) -> list[Any]:
    """Generate a collection of PyG Data graphs covering diverse disruption scenarios."""
    rng = random.Random(seed)
    np.random.seed(seed)

    scenarios = []
    scenario_distribution = (
        ["supplier_disruption"] * int(num_scenarios * 0.35) +
        ["port_disruption"] * int(num_scenarios * 0.25) +
        ["manufacturer_disruption"] * int(num_scenarios * 0.20) +
        ["compound_disruption"] * int(num_scenarios * 0.12) +
        ["normal_operations"] * int(num_scenarios * 0.08)
    )

    # Pad or trim to exact num_scenarios
    while len(scenario_distribution) < num_scenarios:
        scenario_distribution.append("supplier_disruption")
    scenario_distribution = scenario_distribution[:num_scenarios]
    rng.shuffle(scenario_distribution)

    logger.info(f"Synthesizing {num_scenarios} supply chain disruption scenarios...")
    pyg_data_list = []

    for idx, sc_type in enumerate(scenario_distribution):
        s_nodes, s_edges = simulate_disruption_scenario(nodes, edges, scenario_type=sc_type, rng=rng)
        pyg_graph = build_pyg_graph(s_nodes, s_edges, node_id_field="id")
        pyg_data_list.append(pyg_graph)

        if (idx + 1) % 100 == 0 or (idx + 1) == num_scenarios:
            logger.info(f"Generated {idx + 1}/{num_scenarios} PyG graphs...")

    return pyg_data_list


def main() -> None:
    parser = argparse.ArgumentParser(description="AtmoGraph PyG Training Data Generator")
    parser.add_argument("--num-scenarios", type=int, default=600, help="Number of simulated disruption scenarios")
    parser.add_argument("--mock-file", type=str, default="data/mock/supply_chain_nodes.json", help="Path to mock dataset JSON")
    parser.add_argument("--output-dir", type=str, default="data/processed", help="Destination folder for PyG .pt datasets")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--neo4j-uri", type=str, default=os.getenv("NEO4J_URI", "bolt://localhost:7687"))
    parser.add_argument("--neo4j-user", type=str, default=os.getenv("NEO4J_USER", "neo4j"))
    parser.add_argument("--neo4j-password", type=str, default=os.getenv("NEO4J_PASSWORD", None))
    args = parser.parse_args()

    output_dir = PROJECT_ROOT / args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Attempt Neo4j first, then fallback to mock JSON
    graph = load_from_neo4j(args.neo4j_uri, args.neo4j_user, args.neo4j_password)
    if graph is None:
        mock_file_path = PROJECT_ROOT / args.mock_file
        nodes, edges = load_from_mock_json(mock_file_path)
    else:
        nodes, edges = graph

    total_nodes = len(nodes)
    total_edges = len(edges)
    logger.info(f"Base graph topology: {total_nodes} nodes, {total_edges} edges")

    # 2. Generate multi-scenario PyG Data graphs
    pyg_graphs = generate_pyg_dataset(
        nodes=nodes,
        edges=edges,
        num_scenarios=args.num_scenarios,
        seed=args.seed,
    )

    # 3. Train / Val / Test split (80% / 10% / 10%)
    n_total = len(pyg_graphs)
    n_train = int(n_total * 0.80)
    n_val = int(n_total * 0.10)
    n_test = n_total - n_train - n_val

    rng = random.Random(args.seed)
    indices = list(range(n_total))
    rng.shuffle(indices)

    train_data = [pyg_graphs[i] for i in indices[:n_train]]
    val_data = [pyg_graphs[i] for i in indices[n_train:n_train + n_val]]
    test_data = [pyg_graphs[i] for i in indices[n_train + n_val:]]

    logger.info(f"Splits: Train={len(train_data)}, Val={len(val_data)}, Test={len(test_data)}")

    # 4. Save PyTorch Geometric datasets
    train_path = output_dir / "train_data.pt"
    val_path = output_dir / "val_data.pt"
    test_path = output_dir / "test_data.pt"

    torch.save(train_data, train_path)
    torch.save(val_data, val_path)
    torch.save(test_data, test_path)

    # 5. Save summary JSON
    all_delays = [float(g.y.mean().item()) for g in pyg_graphs if g.y is not None]
    summary = {
        "num_scenarios": n_total,
        "splits": {
            "train": len(train_data),
            "val": len(val_data),
            "test": len(test_data),
        },
        "base_graph": {
            "num_nodes": total_nodes,
            "num_edges": total_edges,
            "feature_dim": FEATURE_DIM,
        },
        "ground_truth_delay_stats": {
            "mean_scenario_delay": round(float(np.mean(all_delays)), 2) if all_delays else 0.0,
            "min_scenario_delay": round(float(np.min(all_delays)), 2) if all_delays else 0.0,
            "max_scenario_delay": round(float(np.max(all_delays)), 2) if all_delays else 0.0,
        },
        "files": {
            "train": str(train_path.relative_to(PROJECT_ROOT)),
            "val": str(val_path.relative_to(PROJECT_ROOT)),
            "test": str(test_path.relative_to(PROJECT_ROOT)),
        }
    }

    summary_path = output_dir / "dataset_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    logger.info(f"✅ Successfully exported PyG datasets to {output_dir}")
    logger.info(f"  - Train: {train_path} ({len(train_data)} graphs)")
    logger.info(f"  - Val:   {val_path} ({len(val_data)} graphs)")
    logger.info(f"  - Test:  {test_path} ({len(test_data)} graphs)")
    logger.info(f"  - Summary: {summary_path}")


if __name__ == "__main__":
    main()
