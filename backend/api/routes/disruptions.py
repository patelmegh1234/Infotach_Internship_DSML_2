"""
AtmoGraph — API Routes: Disruptions
======================================
Endpoints for ingesting disruption events (from NLP engine or manual input)
and querying active/historical disruptions.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from __future__ import annotations

import re
import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from loguru import logger

router = APIRouter()


class DisruptionEvent(BaseModel):
    """Schema for a disruption event detected by the NLP engine or entered manually."""
    disruption_id: Optional[str] = Field(default_factory=lambda: f"DIS-{uuid.uuid4().hex[:8].upper()}")
    node_id: str = Field(..., description="Affected supply chain node ID (e.g. PORT-001, SUP-001)")
    node_type: Optional[str] = Field("Port", description="Type: Port, Supplier, Manufacturer, etc.")
    disruption_type: str = Field("strike", description="strike | flood | earthquake | fire | geopolitical | pandemic")
    location: str = Field("Global", description="Geographic location (e.g. 'Shanghai, China' or 'Rotterdam')")
    severity: float = Field(0.8, ge=0.0, le=1.0, description="Severity score [0-1]")
    estimated_duration_days: Optional[int] = Field(14, description="Estimated duration in days")
    source_headline: Optional[str] = Field(None, description="News headline that triggered this event")
    detected_at: Optional[str] = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class NLPExtractRequest(BaseModel):
    headline: str = Field(..., description="Raw news headline or text to parse")


# In-memory disruption store for standalone/local mode
_ACTIVE_DISRUPTIONS: dict[str, dict] = {}


@router.post("/nlp-extract", summary="Extract disruption event from raw news text")
async def extract_nlp_disruption(request: Request, payload: NLPExtractRequest):
    """
    NLP extraction endpoint: takes a raw news headline, extracts entity,
    identifies disruption category and severity, and links it to a node ID.
    """
    text = payload.headline.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Headline text cannot be empty")

    lower = text.lower()

    # Rule-based / NLP classifier heuristic
    disruption_type = "general"
    severity = 0.65
    duration_days = 10

    if any(w in lower for w in ["strike", "protest", "walkout", "union", "labor"]):
        disruption_type = "strike"
        severity = 0.75
        duration_days = 14
    elif any(w in lower for w in ["typhoon", "cyclone", "hurricane", "flood", "storm", "earthquake", "tsunami"]):
        disruption_type = "natural_disaster"
        severity = 0.90
        duration_days = 21
    elif any(w in lower for w in ["fire", "explosion", "hazard", "blast"]):
        disruption_type = "fire"
        severity = 0.85
        duration_days = 28
    elif any(w in lower for w in ["tariff", "sanction", "war", "blockade", "geopolitical", "conflict"]):
        disruption_type = "geopolitical"
        severity = 0.80
        duration_days = 45
    elif any(w in lower for w in ["shortage", "scarcity", "bottleneck", "delay", "congestion"]):
        disruption_type = "delay"
        severity = 0.60
        duration_days = 7

    # Entity detection
    matched_node_id = "PORT-001"
    location = "Global"
    node_type = "Port"

    if "shanghai" in lower:
        matched_node_id = "PORT-001"
        location = "Shanghai, China"
        node_type = "Port"
    elif "singapore" in lower:
        matched_node_id = "PORT-002"
        location = "Singapore"
        node_type = "Port"
    elif "rotterdam" in lower:
        matched_node_id = "PORT-004"
        location = "Rotterdam, Netherlands"
        node_type = "Port"
    elif "tata" in lower or "steel" in lower:
        matched_node_id = "SUP-001"
        location = "India"
        node_type = "Supplier"
    elif "apple" in lower or "consumer electronics" in lower:
        matched_node_id = "MAN-001"
        location = "United States"
        node_type = "Manufacturer"

    event = DisruptionEvent(
        disruption_id=f"DIS-{uuid.uuid4().hex[:8].upper()}",
        node_id=matched_node_id,
        node_type=node_type,
        disruption_type=disruption_type,
        location=location,
        severity=severity,
        estimated_duration_days=duration_days,
        source_headline=text,
    )

    return {
        "status": "extracted",
        "headline": text,
        "event": event.model_dump(),
    }


@router.post("/", summary="Ingest a new disruption event")
async def ingest_disruption(request: Request, event: DisruptionEvent):
    """
    Ingests a disruption event, updates risk scores, and broadcasts to dashboard.
    """
    driver = getattr(request.app.state, "neo4j", None)
    ws_manager = getattr(request.app.state, "ws_manager", None)

    dis_id = event.disruption_id or f"DIS-{uuid.uuid4().hex[:8].upper()}"
    event_dict = event.model_dump()
    event_dict["disruption_id"] = dis_id

    # Store in memory for active listing
    _ACTIVE_DISRUPTIONS[dis_id] = event_dict

    if driver:
        try:
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
                    disruption_id=dis_id,
                )
        except Exception as exc:
            logger.warning(f"Neo4j write failed: {exc}")

    # Broadcast disruption alert to all WebSocket clients
    if ws_manager:
        try:
            await ws_manager.broadcast_disruption(event_dict)
        except Exception:
            pass

    return {
        "status": "ingested",
        "disruption_id": dis_id,
        "node_id": event.node_id,
        "message": f"Disruption at {event.location} ({event.disruption_type}) successfully recorded and broadcasted",
        "event": event_dict,
    }


@router.get("/active", summary="Get all active disruptions")
async def get_active_disruptions(request: Request):
    """Returns all nodes currently flagged as disrupted."""
    driver = getattr(request.app.state, "neo4j", None)
    disruptions = list(_ACTIVE_DISRUPTIONS.values())

    if driver:
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
                db_disruptions = [dict(record) for record in result]
                if db_disruptions:
                    disruptions = db_disruptions
        except Exception:
            pass

    return {"active_disruptions": disruptions, "count": len(disruptions)}


@router.delete("/{disruption_id}", summary="Clear a resolved disruption")
async def resolve_disruption(request: Request, disruption_id: str):
    """Mark a disruption as resolved — resets node risk scores."""
    driver = getattr(request.app.state, "neo4j", None)
    _ACTIVE_DISRUPTIONS.pop(disruption_id, None)

    if driver:
        try:
            with driver.session() as session:
                session.run("""
                    MATCH (n) WHERE n.disruption_id = $disruption_id
                    SET n.disruption_flag = false,
                        n.risk_score = 0.0,
                        n.disruption_id = null
                """, disruption_id=disruption_id)
        except Exception:
            pass

    return {"status": "resolved", "disruption_id": disruption_id}
