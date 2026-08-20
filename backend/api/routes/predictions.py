"""
AtmoGraph — API Routes: Predictions
======================================
Endpoints for triggering and fetching GNN ripple-effect predictions.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()


class DisruptionInput(BaseModel):
    node_id: str = Field(..., description="ID of the disrupted node (e.g. port, supplier)")
    risk_score: float = Field(0.9, ge=0.0, le=1.0, description="Risk score [0-1]")
    disruption_flag: bool = Field(True)
    severity: float = Field(0.8, ge=0.0, le=1.0, description="Disruption severity [0-1]")
    description: Optional[str] = Field(None, description="Human-readable description")


class TimelinePredictionInput(BaseModel):
    disruption: DisruptionInput
    horizons: list[int] = Field(
        default=[30, 60, 90],
        description="Day horizons to predict (e.g. [30, 60, 90])"
    )


@router.post("/", summary="Run GNN ripple-effect prediction")
async def run_prediction(request: Request, disruption: DisruptionInput):
    """
    Apply a disruption to the graph and run GNN inference to predict
    delay ripple effects across the entire supply chain network.

    Returns per-node delay predictions and risk levels.
    """
    driver = request.app.state.neo4j
    gnn_engine = request.app.state.gnn_engine
    ws_manager = request.app.state.ws_manager

    try:
        # Fetch current graph from Neo4j
        with driver.session() as session:
            nodes_result = session.run("""
                MATCH (n) RETURN
                    elementId(n) AS id,
                    labels(n)[0] AS node_type,
                    properties(n) AS props
                LIMIT 2000
            """)
            nodes = [{"id": r["id"], "node_type": r["node_type"], **r["props"]} for r in nodes_result]

            edges_result = session.run("""
                MATCH (a)-[r]->(b) RETURN
                    elementId(a) AS source,
                    elementId(b) AS target,
                    type(r) AS relationship
                LIMIT 10000
            """)
            edges = [{"source": r["source"], "target": r["target"]} for r in edges_result]

        # Run GNN inference
        predictions = gnn_engine.predict(
            nodes=nodes,
            edges=edges,
            disruption_event=disruption.model_dump(),
        )

        # Broadcast to WebSocket clients (React dashboard)
        await ws_manager.broadcast_predictions(
            predictions=predictions,
            disruption_id=disruption.node_id,
        )

        # Summary statistics
        high_risk = [p for p in predictions if p["risk_level"] in ("high", "critical")]

        return {
            "status": "success",
            "disruption_node": disruption.node_id,
            "total_nodes_affected": len(predictions),
            "high_risk_count": len(high_risk),
            "predictions": predictions,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/timeline", summary="Predict supply chain state at 30/60/90 days")
async def predict_timeline(request: Request, payload: TimelinePredictionInput):
    """
    Generate supply chain predictions at multiple time horizons.
    Powers the 30/60/90-day timeline slider on the dashboard.
    """
    driver = request.app.state.neo4j
    gnn_engine = request.app.state.gnn_engine

    try:
        with driver.session() as session:
            nodes_result = session.run("""
                MATCH (n) RETURN elementId(n) AS id, labels(n)[0] AS node_type, properties(n) AS props
                LIMIT 2000
            """)
            nodes = [{"id": r["id"], "node_type": r["node_type"], **r["props"]} for r in nodes_result]
            edges_result = session.run("""
                MATCH (a)-[r]->(b) RETURN elementId(a) AS source, elementId(b) AS target
                LIMIT 10000
            """)
            edges = [{"source": r["source"], "target": r["target"]} for r in edges_result]

        timeline = gnn_engine.predict_timeline(
            nodes=nodes,
            edges=edges,
            disruption_event=payload.disruption.model_dump(),
            horizons=payload.horizons,
        )

        return {
            "status": "success",
            "disruption_node": payload.disruption.node_id,
            "horizons": payload.horizons,
            "timeline": timeline,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
