"""
AtmoGraph — API Routes: Disruptions
======================================
Endpoints for ingesting disruption events (from NLP engine)
and querying historical disruptions stored in Neo4j.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

router = APIRouter()


class DisruptionEvent(BaseModel):
    """Schema for a disruption event detected by the NLP engine."""
    disruption_id: str = Field(..., description="Unique ID for this disruption")
    node_id: str = Field(..., description="Affected supply chain node ID")
    node_type: str = Field(..., description="Type: Port, Supplier, Manufacturer, etc.")
    disruption_type: str = Field(..., description="strike | flood | geopolitical | fire | pandemic")
    location: str = Field(..., description="Geographic location (e.g. 'Rotterdam, Netherlands')")
    severity: float = Field(..., ge=0.0, le=1.0, description="Severity score [0-1]")
    estimated_duration_days: Optional[int] = Field(None, description="Estimated duration in days")
    source_headline: Optional[str] = Field(None, description="News headline that triggered this event")
    detected_at: Optional[str] = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


@router.post("/", summary="Ingest a new disruption event from NLP engine")
async def ingest_disruption(request: Request, event: DisruptionEvent):
    """
    Called by the NLP worker when it detects a supply chain disruption in the news.
    Updates Neo4j risk scores and broadcasts via WebSocket.
    """
    driver = request.app.state.neo4j
    ws_manager = request.app.state.ws_manager

    try:
        # Update Neo4j node with new risk state
        with driver.session() as session:
            session.run(
                """
                MATCH (n) WHERE elementId(n) = $node_id OR n.node_id = $node_id
                SET n.risk_score = $severity,
                    n.disruption_flag = true,
                    n.disruption_type = $disruption_type,
                    n.last_disruption_at = $detected_at,
                    n.disruption_id = $disruption_id
                """,
                node_id=event.node_id,
                severity=event.severity,
                disruption_type=event.disruption_type,
                detected_at=event.detected_at,
                disruption_id=event.disruption_id,
            )

        # Broadcast disruption alert to all WebSocket clients
        await ws_manager.broadcast_disruption(event.model_dump())

        return {
            "status": "ingested",
            "disruption_id": event.disruption_id,
            "message": f"Disruption at {event.location} recorded and broadcast to dashboard",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/active", summary="Get all active disruptions")
async def get_active_disruptions(request: Request):
    """Returns all nodes currently flagged as disrupted in Neo4j."""
    driver = request.app.state.neo4j
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (n) WHERE n.disruption_flag = true
                RETURN
                    elementId(n) AS id,
                    labels(n)[0] AS node_type,
                    n.name AS name,
                    n.risk_score AS risk_score,
                    n.disruption_type AS disruption_type,
                    n.last_disruption_at AS detected_at
                ORDER BY n.risk_score DESC
            """)
            disruptions = [dict(record) for record in result]
        return {"active_disruptions": disruptions, "count": len(disruptions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{disruption_id}", summary="Clear a resolved disruption")
async def resolve_disruption(request: Request, disruption_id: str):
    """Mark a disruption as resolved — resets node risk scores in Neo4j."""
    driver = request.app.state.neo4j
    try:
        with driver.session() as session:
            session.run("""
                MATCH (n) WHERE n.disruption_id = $disruption_id
                SET n.disruption_flag = false,
                    n.risk_score = 0.0,
                    n.disruption_id = null
            """, disruption_id=disruption_id)
        return {"status": "resolved", "disruption_id": disruption_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
