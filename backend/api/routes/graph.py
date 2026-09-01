"""
AtmoGraph — API Routes: Graph
================================
Endpoints for querying supply chain graph data from Neo4j.
Used by the React dashboard to load and render the network.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from loguru import logger

router = APIRouter()


class GraphResponse(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    total_nodes: int
    total_edges: int


def _load_fallback_graph(limit: int = 500, node_type: Optional[str] = None) -> GraphResponse:
    """Load mock nodes and edges from json file when Neo4j is offline."""
    json_path = Path(__file__).resolve().parents[3] / "data" / "mock" / "supply_chain_nodes.json"
    if json_path.exists():
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            type_mapping = {
                "suppliers": "Supplier",
                "manufacturers": "Manufacturer",
                "ports": "Port",
                "distribution_centers": "DistributionCenter",
                "retailers": "Retailer",
                "products": "Product",
            }

            all_nodes: list[dict] = []
            raw_nodes = data.get("nodes", {})
            if isinstance(raw_nodes, dict):
                for group_key, group_items in raw_nodes.items():
                    canonical_type = type_mapping.get(group_key, group_key.capitalize())
                    if node_type and canonical_type != node_type:
                        continue
                    for item in group_items:
                        node_id = item.get("node_id", "")
                        all_nodes.append({
                            "id": node_id,
                            "node_id": node_id,
                            "node_type": canonical_type,
                            **item,
                        })
            elif isinstance(raw_nodes, list):
                all_nodes = raw_nodes

            if node_type:
                all_nodes = [n for n in all_nodes if n.get("node_type") == node_type]

            nodes_subset = all_nodes[:limit]
            node_ids = {n["id"] for n in nodes_subset}

            all_edges: list[dict] = []
            raw_rels = data.get("relationships", [])
            for rel in raw_rels:
                src = rel.get("source_node_id") or rel.get("source")
                tgt = rel.get("target_node_id") or rel.get("target")
                if src in node_ids and tgt in node_ids:
                    all_edges.append({
                        "source": src,
                        "target": tgt,
                        "relationship": rel.get("relationship_type") or rel.get("relationship", "CONNECTED_TO"),
                        **(rel.get("properties") or {}),
                    })

            return GraphResponse(
                nodes=nodes_subset,
                edges=all_edges[:limit * 3],
                total_nodes=len(nodes_subset),
                total_edges=len(all_edges),
            )
        except Exception as exc:
            logger.warning(f"Failed to read fallback mock data: {exc}")

    return GraphResponse(nodes=[], edges=[], total_nodes=0, total_edges=0)


@router.get("/", response_model=GraphResponse, summary="Get full supply chain graph")
async def get_full_graph(
    request: Request,
    limit: int = Query(default=500, le=5000, description="Max nodes to return"),
    node_type: Optional[str] = Query(default=None, description="Filter by node type"),
):
    """
    Returns the full supply chain graph (nodes + edges) for dashboard rendering.
    Supports pagination and node-type filtering.
    """
    driver = getattr(request.app.state, "neo4j", None)
    if not driver:
        return _load_fallback_graph(limit=limit, node_type=node_type)

    try:
        with driver.session() as session:
            node_filter = f"WHERE n:{node_type}" if node_type else ""
            node_query = f"""
                MATCH (n) {node_filter}
                RETURN
                    elementId(n) AS id,
                    labels(n)[0] AS node_type,
                    properties(n) AS props
                LIMIT $limit
            """
            nodes_result = session.run(node_query, limit=limit)
            nodes = [
                {
                    "id": record["id"],
                    "node_type": record["node_type"],
                    **record["props"],
                }
                for record in nodes_result
            ]

            edge_query = """
                MATCH (a)-[r]->(b)
                RETURN
                    elementId(a) AS source,
                    elementId(b) AS target,
                    type(r) AS relationship,
                    properties(r) AS props
                LIMIT $limit
            """
            edges_result = session.run(edge_query, limit=limit * 3)
            edges = [
                {
                    "source": record["source"],
                    "target": record["target"],
                    "relationship": record["relationship"],
                    **record["props"],
                }
                for record in edges_result
            ]

        return GraphResponse(
            nodes=nodes,
            edges=edges,
            total_nodes=len(nodes),
            total_edges=len(edges),
        )

    except Exception as e:
        logger.warning(f"Neo4j query error: {e}. Using fallback mock data.")
        return _load_fallback_graph(limit=limit, node_type=node_type)


@router.get("/node/{node_id}", summary="Get single node details")
async def get_node(request: Request, node_id: str):
    """Get detailed properties of a specific supply chain node."""
    driver = getattr(request.app.state, "neo4j", None)
    if not driver:
        fallback = _load_fallback_graph()
        for n in fallback.nodes:
            if n.get("id") == node_id or n.get("node_id") == node_id:
                return n
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

    try:
        with driver.session() as session:
            result = session.run(
                "MATCH (n) WHERE elementId(n) = $id OR n.node_id = $id RETURN n", id=node_id
            )
            record = result.single()
            if not record:
                raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
            node = record["n"]
            return {"id": node_id, **dict(node)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", summary="Graph statistics")
async def get_graph_stats(request: Request):
    """Return high-level statistics about the supply chain graph."""
    driver = getattr(request.app.state, "neo4j", None)
    if not driver:
        fallback = _load_fallback_graph(limit=2000)
        counts_dict: dict[str, int] = {}
        for n in fallback.nodes:
            t = n.get("node_type", "Unknown")
            counts_dict[t] = counts_dict.get(t, 0) + 1
        return {
            "node_counts": [{"type": k, "count": v} for k, v in counts_dict.items()],
            "total_edges": fallback.total_edges,
        }

    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (n)
                WITH labels(n)[0] AS type, count(n) AS count
                RETURN collect({type: type, count: count}) AS node_counts
            """)
            record = result.single()
            edge_result = session.run("MATCH ()-[r]->() RETURN count(r) AS total_edges")
            edge_record = edge_result.single()

            return {
                "node_counts": record["node_counts"] if record else [],
                "total_edges": edge_record["total_edges"] if edge_record else 0,
            }
    except Exception as e:
        logger.warning(f"Neo4j stats query error: {e}")
        fallback = _load_fallback_graph()
        return {
            "node_counts": [],
            "total_edges": fallback.total_edges,
        }
