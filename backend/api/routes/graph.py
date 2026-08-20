"""
AtmoGraph — API Routes: Graph
================================
Endpoints for querying supply chain graph data from Neo4j.
Used by the React dashboard to load and render the network.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class GraphResponse(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    total_nodes: int
    total_edges: int


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
    driver = request.app.state.neo4j

    try:
        with driver.session() as session:
            # Build node query with optional type filter
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

            # Get edges between those nodes
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
        raise HTTPException(status_code=500, detail=f"Neo4j query failed: {str(e)}")


@router.get("/node/{node_id}", summary="Get single node details")
async def get_node(request: Request, node_id: str):
    """Get detailed properties of a specific supply chain node."""
    driver = request.app.state.neo4j
    try:
        with driver.session() as session:
            result = session.run(
                "MATCH (n) WHERE elementId(n) = $id RETURN n", id=node_id
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
    driver = request.app.state.neo4j
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
        raise HTTPException(status_code=500, detail=str(e))
