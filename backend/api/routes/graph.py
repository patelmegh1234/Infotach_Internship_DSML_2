"""
AtmoGraph — API Routes: Graph
================================
Endpoints for querying, adding, deleting, and managing supply chain graph nodes & edges.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional, Any
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, Field
from loguru import logger

router = APIRouter()


class GraphResponse(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    total_nodes: int
    total_edges: int


class CreateNodeRequest(BaseModel):
    node_id: str = Field(..., description="Unique ID (e.g. SUP-100, PORT-99, FACT-50)")
    node_type: str = Field("Supplier", description="Supplier | Manufacturer | Port | DistributionCenter | Retailer | Product")
    name: str = Field(..., description="Node display name (e.g. 'Tokyo Battery Co')")
    country: Optional[str] = Field("Global", description="Country name")
    city: Optional[str] = Field("", description="City name")
    capacity_utilization: Optional[float] = Field(0.75, ge=0.0, le=1.0, description="Capacity utilization [0-1]")
    historical_delay_avg: Optional[float] = Field(2.0, ge=0.0, description="Average delay in days")
    risk_score: Optional[float] = Field(0.20, ge=0.0, le=1.0, description="Initial risk score [0-1]")
    geo_importance_score: Optional[float] = Field(0.50, ge=0.0, le=1.0, description="Geo importance [0-1]")
    throughput_teu: Optional[int] = Field(None, description="Port throughput (TEU)")


class CreateEdgeRequest(BaseModel):
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    relationship: str = Field("SUPPLIES", description="SUPPLIES | SHIPS_THROUGH | STORES_AT | DELIVERS_TO | PRODUCES")
    quantity: Optional[int] = Field(500, description="Quantity / volume")
    transit_days: Optional[int] = Field(5, description="Transit duration (days)")
    transport_mode: Optional[str] = Field("sea", description="sea | air | road | rail")


# In-memory graph storage for dynamic local CRUD
_DYNAMIC_NODES: dict[str, dict] = {}
_DYNAMIC_EDGES: list[dict] = []
_GRAPH_INITIALIZED = False


def _get_dataset_file_path() -> Path:
    return Path(__file__).resolve().parents[3] / "data" / "mock" / "supply_chain_nodes.json"


def _init_in_memory_dataset() -> None:
    """Initialize in-memory dynamic graph from dataset if not already populated."""
    global _GRAPH_INITIALIZED
    if _GRAPH_INITIALIZED:
        return

    json_path = _get_dataset_file_path()
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

            raw_nodes = data.get("nodes", {})
            if isinstance(raw_nodes, dict):
                for group_key, group_items in raw_nodes.items():
                    canonical_type = type_mapping.get(group_key, group_key.capitalize())
                    for item in group_items:
                        nid = item.get("node_id", "")
                        _DYNAMIC_NODES[nid] = {
                            "id": nid,
                            "node_id": nid,
                            "node_type": canonical_type,
                            **item,
                        }

            raw_rels = data.get("relationships", [])
            for rel in raw_rels:
                src = rel.get("source_node_id") or rel.get("source")
                tgt = rel.get("target_node_id") or rel.get("target")
                if src in _DYNAMIC_NODES and tgt in _DYNAMIC_NODES:
                    _DYNAMIC_EDGES.append({
                        "id": f"edge-{src}-{tgt}",
                        "source": src,
                        "target": tgt,
                        "relationship": rel.get("relationship_type") or "CONNECTED_TO",
                        **(rel.get("properties") or {}),
                    })
            _GRAPH_INITIALIZED = True
        except Exception as exc:
            logger.warning(f"Failed to load initial dataset: {exc}")


def _load_fallback_graph(limit: int = 2000, node_type: Optional[str] = None) -> GraphResponse:
    """Return in-memory dynamic nodes and edges."""
    _init_in_memory_dataset()

    nodes_list = list(_DYNAMIC_NODES.values())
    if node_type:
        nodes_list = [n for n in nodes_list if n.get("node_type") == node_type]

    subset_nodes = nodes_list[:limit]
    node_ids = {n["id"] for n in subset_nodes}

    filtered_edges = [
        e for e in _DYNAMIC_EDGES
        if e["source"] in node_ids and e["target"] in node_ids
    ][:limit * 3]

    return GraphResponse(
        nodes=subset_nodes,
        edges=filtered_edges,
        total_nodes=len(subset_nodes),
        total_edges=len(filtered_edges),
    )


@router.get("/", response_model=GraphResponse, summary="Get full supply chain graph")
async def get_full_graph(
    request: Request,
    limit: int = Query(default=2000, le=5000, description="Max nodes to return"),
    node_type: Optional[str] = Query(default=None, description="Filter by node type"),
):
    """Returns the supply chain graph (nodes + edges) for visualization."""
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
        logger.warning(f"Neo4j query error: {e}. Using in-memory graph.")
        return _load_fallback_graph(limit=limit, node_type=node_type)


@router.post("/node", summary="Add a new supply chain node")
async def create_node(request: Request, node: CreateNodeRequest):
    """Create and insert a new supply chain node into the graph."""
    driver = getattr(request.app.state, "neo4j", None)
    node_data = node.model_dump()
    node_id = node.node_id

    # Add to in-memory store
    _DYNAMIC_NODES[node_id] = {
        "id": node_id,
        "node_id": node_id,
        **node_data,
    }

    if driver:
        try:
            with driver.session() as session:
                query = f"""
                    MERGE (n:{node.node_type} {{node_id: $node_id}})
                    SET n.name = $name,
                        n.country = $country,
                        n.city = $city,
                        n.capacity_utilization = $capacity_utilization,
                        n.historical_delay_avg = $historical_delay_avg,
                        n.risk_score = $risk_score,
                        n.geo_importance_score = $geo_importance_score,
                        n.throughput_teu = $throughput_teu
                    RETURN n
                """
                session.run(query, **node_data)
        except Exception as exc:
            logger.warning(f"Neo4j node insert error: {exc}")

    return {
        "status": "created",
        "node_id": node_id,
        "node": _DYNAMIC_NODES[node_id],
        "message": f"Node '{node.name}' ({node.node_type}) successfully added",
    }


@router.delete("/node/{node_id}", summary="Delete a node and its connected routes")
async def delete_node(request: Request, node_id: str):
    """Delete a node from the graph along with any connected relationships."""
    global _DYNAMIC_EDGES
    driver = getattr(request.app.state, "neo4j", None)

    # Remove from in-memory store
    deleted_node = _DYNAMIC_NODES.pop(node_id, None)
    _DYNAMIC_EDGES = [e for e in _DYNAMIC_EDGES if e.get("source") != node_id and e.get("target") != node_id]

    if driver:
        try:
            with driver.session() as session:
                session.run(
                    "MATCH (n) WHERE elementId(n) = $id OR n.node_id = $id DETACH DELETE n",
                    id=node_id,
                )
        except Exception as exc:
            logger.warning(f"Neo4j node delete error: {exc}")

    return {
        "status": "deleted",
        "node_id": node_id,
        "message": f"Node '{node_id}' and all connected routes deleted.",
    }


@router.post("/edge", summary="Add a new supply chain route/relationship")
async def create_edge(request: Request, edge: CreateEdgeRequest):
    """Create a relationship connecting two supply chain nodes."""
    driver = getattr(request.app.state, "neo4j", None)
    edge_data = edge.model_dump()

    _DYNAMIC_EDGES.append({
        "id": f"edge-{edge.source}-{edge.target}",
        **edge_data,
    })

    if driver:
        try:
            with driver.session() as session:
                query = f"""
                    MATCH (a {{node_id: $source}}), (b {{node_id: $target}})
                    MERGE (a)-[r:{edge.relationship}]->(b)
                    SET r.quantity = $quantity,
                        r.transit_days = $transit_days,
                        r.transport_mode = $transport_mode
                    RETURN r
                """
                session.run(query, **edge_data)
        except Exception as exc:
            logger.warning(f"Neo4j edge insert error: {exc}")

    return {
        "status": "created",
        "source": edge.source,
        "target": edge.target,
        "relationship": edge.relationship,
        "message": f"Route from {edge.source} to {edge.target} ({edge.relationship}) added",
    }


@router.delete("/edge/{source}/{target}", summary="Delete a specific route/relationship")
async def delete_edge(request: Request, source: str, target: str):
    """Delete a relationship between two nodes."""
    global _DYNAMIC_EDGES
    driver = getattr(request.app.state, "neo4j", None)

    _DYNAMIC_EDGES = [e for e in _DYNAMIC_EDGES if not (e.get("source") == source and e.get("target") == target)]

    if driver:
        try:
            with driver.session() as session:
                session.run(
                    "MATCH (a {node_id: $source})-[r]->(b {node_id: $target}) DELETE r",
                    source=source,
                    target=target,
                )
        except Exception as exc:
            logger.warning(f"Neo4j edge delete error: {exc}")

    return {
        "status": "deleted",
        "source": source,
        "target": target,
        "message": f"Route between {source} and {target} deleted.",
    }


@router.delete("/clear", summary="Clear all nodes and edges (clean canvas)")
async def clear_graph(request: Request):
    """Clears all nodes and relationships from the active graph."""
    global _GRAPH_INITIALIZED
    driver = getattr(request.app.state, "neo4j", None)

    _DYNAMIC_NODES.clear()
    _DYNAMIC_EDGES.clear()
    _GRAPH_INITIALIZED = True

    if driver:
        try:
            with driver.session() as session:
                session.run("MATCH (n) DETACH DELETE n")
        except Exception as exc:
            logger.warning(f"Neo4j clear error: {exc}")

    return {
        "status": "cleared",
        "total_nodes": 0,
        "total_edges": 0,
        "message": "Supply chain graph completely cleared. Ready for custom data entry.",
    }


@router.post("/reset-dataset", summary="Reset graph to benchmark dataset")
async def reset_graph_dataset(request: Request):
    """Resets the graph back to the full 215-node benchmark dataset."""
    global _GRAPH_INITIALIZED
    _DYNAMIC_NODES.clear()
    _DYNAMIC_EDGES.clear()
    _GRAPH_INITIALIZED = False
    _init_in_memory_dataset()

    return {
        "status": "reset",
        "total_nodes": len(_DYNAMIC_NODES),
        "total_edges": len(_DYNAMIC_EDGES),
        "message": f"Loaded benchmark dataset with {len(_DYNAMIC_NODES)} nodes and {len(_DYNAMIC_EDGES)} relationships.",
    }


@router.get("/node/{node_id}", summary="Get single node details")
async def get_node(request: Request, node_id: str):
    """Get detailed properties of a specific node."""
    driver = getattr(request.app.state, "neo4j", None)
    if not driver:
        if node_id in _DYNAMIC_NODES:
            return _DYNAMIC_NODES[node_id]
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

    try:
        with driver.session() as session:
            result = session.run(
                "MATCH (n) WHERE elementId(n) = $id OR n.node_id = $id RETURN n", id=node_id
            )
            record = result.single()
            if not record:
                raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
            return {"id": node_id, **dict(record["n"])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", summary="Graph statistics")
async def get_graph_stats(request: Request):
    """Return high-level statistics about the supply chain graph."""
    driver = getattr(request.app.state, "neo4j", None)
    if not driver:
        _init_in_memory_dataset()
        counts_dict: dict[str, int] = {}
        for n in _DYNAMIC_NODES.values():
            t = n.get("node_type", "Unknown")
            counts_dict[t] = counts_dict.get(t, 0) + 1
        return {
            "node_counts": [{"type": k, "count": v} for k, v in counts_dict.items()],
            "total_edges": len(_DYNAMIC_EDGES),
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
        return {
            "node_counts": [],
            "total_edges": len(_DYNAMIC_EDGES),
        }
