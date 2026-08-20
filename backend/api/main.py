"""
AtmoGraph — FastAPI Main Application
======================================
Central API entry point. Mounts all routers and WebSocket endpoints.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from loguru import logger

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config.settings import get_settings
from api.routes import graph, predictions, disruptions, health
from api.websocket import WebSocketManager

settings = get_settings()

# ── WebSocket manager (shared across routes) ──────────────
ws_manager = WebSocketManager()


# ── Lifespan: startup / shutdown hooks ───────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info(f"🚀 Starting AtmoGraph API v{settings.app_version}")
    logger.info(f"   Environment : {settings.environment}")
    logger.info(f"   Neo4j URI   : {settings.neo4j_uri}")

    # Startup: initialise DB connection, load GNN model
    from database.connector import get_neo4j_driver
    from gnn.inference import GNNInferenceEngine

    app.state.neo4j = get_neo4j_driver()
    app.state.gnn_engine = GNNInferenceEngine(model_path=settings.model_path)
    app.state.ws_manager = ws_manager

    logger.info("✅ AtmoGraph API ready")
    yield

    # Shutdown: close DB connections
    logger.info("🛑 Shutting down AtmoGraph API...")
    app.state.neo4j.close()


# ── App instance ──────────────────────────────────────────
app = FastAPI(
    title="AtmoGraph API",
    description=(
        "Supply Chain Ripple Effect Predictor — "
        "Graph Neural Network powered real-time disruption analysis"
    ),
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────
app.include_router(health.router,       prefix="/health",       tags=["Health"])
app.include_router(graph.router,        prefix="/api/graph",    tags=["Graph"])
app.include_router(predictions.router,  prefix="/api/predict",  tags=["Predictions"])
app.include_router(disruptions.router,  prefix="/api/disrupt",  tags=["Disruptions"])

# ── WebSocket endpoint ────────────────────────────────────
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time prediction streaming.

    Connect at: ws://localhost:8000/ws/{client_id}

    Messages pushed to client:
        - disruption_detected: NLP found a new supply chain event
        - predictions_updated: GNN finished re-scoring all nodes
        - node_risk_changed:   A specific node's risk level changed
    """
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back for heartbeat / ping-pong
            await ws_manager.send_personal(
                {"type": "pong", "client_id": client_id}, client_id
            )
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")


# ── Root ──────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse({
        "service": "AtmoGraph API",
        "version": settings.app_version,
        "docs": "/docs",
        "websocket": "/ws/{client_id}",
        "status": "running",
    })
