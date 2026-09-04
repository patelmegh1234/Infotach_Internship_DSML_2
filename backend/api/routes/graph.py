"""
AtmoGraph — API Routes: Graph
================================
Endpoints for querying, adding, deleting, importing, and managing supply chain graph nodes & edges.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, Field
from loguru import logger
from database.sample_templates import ALL_BUILTIN_TEMPLATES, FILE_TEMPLATES

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


class ImportGraphRequest(BaseModel):
    title: Optional[str] = Field(None, description="Graph title")
    nodes: list[dict] = Field(..., description="List of node objects")
    edges: list[dict] = Field(..., description="List of edge objects")


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

    # CRITICAL: ensure in-memory store is initialized BEFORE adding the node.
    # Without this, the next GET /api/graph/ triggers _init_in_memory_dataset()
    # which would NOT include this new node (it only reads from the JSON file).
    _init_in_memory_dataset()

    # Check for duplicate node ID
    if node_id in _DYNAMIC_NODES:
        return {
            "status": "exists",
            "node_id": node_id,
            "node": _DYNAMIC_NODES[node_id],
            "message": f"Node '{node_id}' already exists. Use a different ID.",
        }

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

    # Ensure initialization is complete before adding edges
    _init_in_memory_dataset()

    # Validate that source and target nodes exist
    if edge.source not in _DYNAMIC_NODES:
        raise HTTPException(status_code=404, detail=f"Source node '{edge.source}' not found")
    if edge.target not in _DYNAMIC_NODES:
        raise HTTPException(status_code=404, detail=f"Target node '{edge.target}' not found")

    # Prevent duplicate edges with same source→target
    existing = any(e.get("source") == edge.source and e.get("target") == edge.target for e in _DYNAMIC_EDGES)
    if not existing:
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


# =========================================================================
# Demo Templates & File Import Endpoints (10 Demo Graphs)
# =========================================================================

@router.get("/templates", summary="Get 5 built-in 1-click demo graph templates")
async def list_demo_templates():
    """Returns metadata for the 5 built-in demo graph options."""
    templates = []
    for tid, t in ALL_BUILTIN_TEMPLATES.items():
        templates.append({
            "id": tid,
            "name": t["name"],
            "industry": t["industry"],
            "description": t["description"],
            "node_count": len(t["nodes"]),
            "edge_count": len(t["edges"]),
        })
    return {"templates": templates}


@router.post("/load-template/{template_id}", summary="Load a built-in demo graph template")
async def load_demo_template(request: Request, template_id: str):
    """Replaces current graph with one of the 5 built-in demo templates."""
    global _GRAPH_INITIALIZED
    template = ALL_BUILTIN_TEMPLATES.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")

    driver = getattr(request.app.state, "neo4j", None)
    _DYNAMIC_NODES.clear()
    _DYNAMIC_EDGES.clear()
    _GRAPH_INITIALIZED = True

    for n in template["nodes"]:
        nid = n["node_id"]
        _DYNAMIC_NODES[nid] = {
            "id": nid,
            **n,
        }

    for e in template["edges"]:
        src = e["source"]
        tgt = e["target"]
        _DYNAMIC_EDGES.append({
            "id": f"edge-{src}-{tgt}",
            **e,
        })

    if driver:
        try:
            with driver.session() as session:
                session.run("MATCH (n) DETACH DELETE n")
                for n in template["nodes"]:
                    session.run(
                        f"""
                        MERGE (n:{n.get('node_type', 'Supplier')} {{node_id: $node_id}})
                        SET n += $props
                        """,
                        node_id=n["node_id"],
                        props=n,
                    )
                for e in template["edges"]:
                    session.run(
                        f"""
                        MATCH (a {{node_id: $source}}), (b {{node_id: $target}})
                        MERGE (a)-[r:{e.get('relationship', 'CONNECTED_TO')}]->(b)
                        SET r += $props
                        """,
                        source=e["source"],
                        target=e["target"],
                        props=e,
                    )
        except Exception as exc:
            logger.warning(f"Neo4j template load warning: {exc}")

    return {
        "status": "loaded",
        "template_id": template_id,
        "name": template["name"],
        "total_nodes": len(_DYNAMIC_NODES),
        "total_edges": len(_DYNAMIC_EDGES),
        "message": f"Successfully loaded '{template['name']}' ({len(_DYNAMIC_NODES)} nodes, {len(_DYNAMIC_EDGES)} routes).",
    }


@router.post("/import", summary="Import custom graph from JSON file payload")
async def import_graph_json(request: Request, payload: ImportGraphRequest):
    """Import a complete supply chain graph from uploaded JSON."""
    global _GRAPH_INITIALIZED
    driver = getattr(request.app.state, "neo4j", None)

    _DYNAMIC_NODES.clear()
    _DYNAMIC_EDGES.clear()
    _GRAPH_INITIALIZED = True

    for n in payload.nodes:
        nid = n.get("node_id") or n.get("id")
        if nid:
            _DYNAMIC_NODES[nid] = {
                "id": nid,
                "node_id": nid,
                "node_type": n.get("node_type") or n.get("type") or "Supplier",
                **n,
            }

    for idx, e in enumerate(payload.edges):
        src = e.get("source") or e.get("source_node_id")
        tgt = e.get("target") or e.get("target_node_id")
        if src and tgt:
            _DYNAMIC_EDGES.append({
                "id": e.get("id") or f"edge-{src}-{tgt}-{idx}",
                "source": src,
                "target": tgt,
                "relationship": e.get("relationship") or e.get("relationship_type") or "SUPPLIES",
                **e,
            })

    if driver:
        try:
            with driver.session() as session:
                session.run("MATCH (n) DETACH DELETE n")
                for n in _DYNAMIC_NODES.values():
                    session.run(
                        f"""
                        MERGE (n:{n.get('node_type', 'Supplier')} {{node_id: $node_id}})
                        SET n += $props
                        """,
                        node_id=n["node_id"],
                        props=n,
                    )
                for e in _DYNAMIC_EDGES:
                    session.run(
                        f"""
                        MATCH (a {{node_id: $source}}), (b {{node_id: $target}})
                        MERGE (a)-[r:{e.get('relationship', 'CONNECTED_TO')}]->(b)
                        SET r += $props
                        """,
                        source=e["source"],
                        target=e["target"],
                        props=e,
                    )
        except Exception as exc:
            logger.warning(f"Neo4j import write warning: {exc}")

    return {
        "status": "imported",
        "title": payload.title or "Imported Graph",
        "total_nodes": len(_DYNAMIC_NODES),
        "total_edges": len(_DYNAMIC_EDGES),
        "message": f"Successfully imported {len(_DYNAMIC_NODES)} nodes and {len(_DYNAMIC_EDGES)} routes.",
    }


@router.get("/sample-files", summary="Get list of downloadable sample graph JSON files")
async def list_sample_files():
    """Returns the 5 sample graph files with complete JSON payload for 1-click preview & download."""
    return {"files": FILE_TEMPLATES}


@router.get("/export", summary="Export active graph as downloadable JSON")
async def export_graph_json(request: Request):
    """Export the current active graph nodes and routes as structured JSON."""
    _init_in_memory_dataset()
    return {
        "title": "AtmoGraph Supply Chain Export",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "total_nodes": len(_DYNAMIC_NODES),
        "total_edges": len(_DYNAMIC_EDGES),
        "nodes": list(_DYNAMIC_NODES.values()),
        "edges": _DYNAMIC_EDGES,
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


@router.get("/{node_id}", summary="Get single node details by ID")
async def get_node_by_id(request: Request, node_id: str):
    """Direct alias for /node/{node_id}."""
    return await get_node(request, node_id)

