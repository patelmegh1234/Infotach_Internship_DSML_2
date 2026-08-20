"""
AtmoGraph — API Routes: Health Check
"""
from fastapi import APIRouter, Request
from datetime import datetime, timezone

router = APIRouter()

@router.get("/", summary="Health check")
async def health_check(request: Request):
    """Returns API health status and component connectivity."""
    # Check Neo4j
    neo4j_ok = False
    try:
        driver = request.app.state.neo4j
        with driver.session() as session:
            session.run("RETURN 1")
        neo4j_ok = True
    except Exception:
        pass

    # Check GNN engine
    gnn_ok = hasattr(request.app.state, "gnn_engine")

    # WebSocket connections
    ws_count = 0
    if hasattr(request.app.state, "ws_manager"):
        ws_count = request.app.state.ws_manager.connection_count

    overall = "healthy" if (neo4j_ok and gnn_ok) else "degraded"

    return {
        "status": overall,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "neo4j": "connected" if neo4j_ok else "disconnected",
            "gnn_engine": "loaded" if gnn_ok else "not_loaded",
            "websocket_clients": ws_count,
        },
    }
