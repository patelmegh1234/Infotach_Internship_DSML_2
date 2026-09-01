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
        driver = getattr(request.app.state, "neo4j", None)
        if driver:
            with driver.session() as session:
                session.run("RETURN 1")
            neo4j_ok = True
    except Exception:
        pass

    # Check GNN engine
    gnn_ok = getattr(request.app.state, "gnn_engine", None) is not None

    # WebSocket connections
    ws_mgr = getattr(request.app.state, "ws_manager", None)
    if ws_mgr:
        ws_count = ws_mgr.connection_count() if callable(getattr(ws_mgr, "connection_count", None)) else getattr(ws_mgr, "connection_count", 0)
    else:
        ws_count = 0

    overall = "healthy" if (neo4j_ok and gnn_ok) else "degraded"

    return {
        "status": overall,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "neo4j": "connected" if neo4j_ok else "disconnected",
            "gnn_engine": "loaded" if gnn_ok else "fallback",
            "websocket_clients": ws_count,
        },
    }
