"""
AtmoGraph — API Routes: Predictions
======================================
Endpoints for triggering and fetching GNN ripple-effect predictions.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from __future__ import annotations

from typing import Optional, Any
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from loguru import logger
from .graph import _load_fallback_graph

router = APIRouter()


class DisruptionInput(BaseModel):
    node_id: str = Field(..., description="ID of the disrupted node (e.g. SUP-001, PORT-001)")
    risk_score: float = Field(0.85, ge=0.0, le=1.0, description="Risk score [0-1]")
    disruption_flag: bool = Field(True, description="Whether disruption is active")
    severity: float = Field(0.8, ge=0.0, le=1.0, description="Disruption severity [0-1]")
    disruption_type: Optional[str] = Field("strike", description="Type: strike, flood, fire, etc.")
    description: Optional[str] = Field(None, description="Human-readable description")


class TimelinePredictionInput(BaseModel):
    disruption: DisruptionInput
    horizons: list[int] = Field(
        default=[30, 60, 90],
        description="Day horizons to predict (e.g. [30, 60, 90])"
    )


def _analytical_propagation(nodes: list[dict], edges: list[dict], disruption: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Fallback graph propagation engine when GNN PyG weights or GPU are offline.
    Computes k-hop ripple effect decay across downstream connected nodes.
    """
    origin_id = disruption.get("node_id", "")
    severity = float(disruption.get("severity", 0.75))

    # Build adjacency
    adj: dict[str, list[str]] = {}
    for e in edges:
        src, tgt = e.get("source", ""), e.get("target", "")
        if src:
            adj.setdefault(src, []).append(tgt)

    # BFS k-hop distance
    hop_dist: dict[str, int] = {origin_id: 0}
    queue = [origin_id]
    while queue:
        curr = queue.pop(0)
        curr_dist = hop_dist[curr]
        if curr_dist >= 4:
            continue
        for nxt in adj.get(curr, []):
            if nxt not in hop_dist:
                hop_dist[nxt] = curr_dist + 1
                queue.append(nxt)

    results: list[dict[str, Any]] = []
    hop_decay = [1.0, 0.78, 0.58, 0.38, 0.22]

    for node in nodes:
        nid = node.get("id") or node.get("node_id", "")
        dist = hop_dist.get(nid)
        if dist is not None:
            decay = hop_decay[min(dist, len(hop_decay) - 1)]
            delay_days = round(severity * decay * 32.0 + float(node.get("historical_delay_avg", 1.5)) * 2.0, 1)
            risk = round(min(1.0, severity * decay * 1.1), 2)
            conf = round(max(0.65, 0.95 - dist * 0.08), 2)
        else:
            delay_days = round(float(node.get("historical_delay_avg", 0.5)), 1)
            risk = round(float(node.get("risk_score", 0.1)), 2)
            conf = 0.90

        level = "critical" if risk >= 0.75 else "high" if risk >= 0.55 else "moderate" if risk >= 0.35 else "low"

        results.append({
            "node_id": nid,
            "node_type": node.get("node_type", "Unknown"),
            "name": node.get("name", nid),
            "predicted_delay_days": delay_days,
            "confidence": conf,
            "risk_score": risk,
            "risk_level": level,
            "hop_distance": dist if dist is not None else -1,
        })

    results.sort(key=lambda x: x["predicted_delay_days"], reverse=True)
    return results


@router.post("/", summary="Run GNN ripple-effect prediction")
async def run_prediction(request: Request, disruption: DisruptionInput):
    """
    Apply a disruption to the graph and run GNN inference to predict
    delay ripple effects across the entire supply chain network.
    """
    driver = getattr(request.app.state, "neo4j", None)
    gnn_engine = getattr(request.app.state, "gnn_engine", None)
    ws_manager = getattr(request.app.state, "ws_manager", None)

    nodes: list[dict] = []
    edges: list[dict] = []

    if driver:
        try:
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
        except Exception as exc:
            logger.warning(f"Neo4j query failed in predict route: {exc}. Using fallback.")

    if not nodes:
        fallback = _load_fallback_graph(limit=1000)
        nodes = fallback.nodes
        edges = fallback.edges

    if not nodes:
        return {
            "status": "success",
            "disruption_node": disruption.node_id,
            "total_nodes_affected": 0,
            "high_risk_count": 0,
            "predictions": [],
        }

    # Run GNN inference or analytical propagation fallback
    if gnn_engine:
        try:
            predictions = gnn_engine.predict(
                nodes=nodes,
                edges=edges,
                disruption_event=disruption.model_dump(),
            )
        except Exception as exc:
            logger.warning(f"GNN engine predict failed: {exc}. Using analytical propagation.")
            predictions = _analytical_propagation(nodes, edges, disruption.model_dump())
    else:
        predictions = _analytical_propagation(nodes, edges, disruption.model_dump())

    # Broadcast to WebSocket clients if manager exists
    if ws_manager:
        try:
            await ws_manager.broadcast_predictions(
                predictions=predictions,
                disruption_id=disruption.node_id,
            )
        except Exception:
            pass

    high_risk = [p for p in predictions if p["risk_level"] in ("high", "critical")]

    return {
        "status": "success",
        "disruption_node": disruption.node_id,
        "disruption_type": disruption.disruption_type,
        "severity": disruption.severity,
        "total_nodes_affected": len([p for p in predictions if p.get("hop_distance", -1) >= 0]),
        "high_risk_count": len(high_risk),
        "predictions": predictions,
    }


@router.post("/timeline", summary="Predict supply chain state at 30/60/90 days")
async def predict_timeline(request: Request, payload: TimelinePredictionInput):
    """
    Generate supply chain predictions across multiple time horizons (30/60/90 days).
    """
    driver = getattr(request.app.state, "neo4j", None)
    gnn_engine = getattr(request.app.state, "gnn_engine", None)

    nodes: list[dict] = []
    edges: list[dict] = []

    if driver:
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
        except Exception:
            pass

    if not nodes:
        fallback = _load_fallback_graph(limit=1000)
        nodes = fallback.nodes
        edges = fallback.edges

    timeline_data: dict[str, list[dict[str, Any]]] = {}

    if gnn_engine:
        try:
            timeline_data = gnn_engine.predict_timeline(
                nodes=nodes,
                edges=edges,
                disruption_event=payload.disruption.model_dump(),
                horizons=payload.horizons,
            )
        except Exception:
            pass

    if not timeline_data:
        base_preds = _analytical_propagation(nodes, edges, payload.disruption.model_dump())
        for horizon in payload.horizons:
            factor = 1.0 + (horizon - 30) * 0.015
            timeline_data[f"{horizon}_days"] = [
                {
                    "node_id": p["node_id"],
                    "node_type": p["node_type"],
                    "name": p["name"],
                    "predicted_delay_days": round(p["predicted_delay_days"] * factor, 1),
                    "risk_score": min(1.0, round(p["risk_score"] * factor, 2)),
                    "confidence": p["confidence"],
                }
                for p in base_preds[:50]
            ]

    return {
        "status": "success",
        "disruption_node": payload.disruption.node_id,
        "horizons": payload.horizons,
        "timeline": timeline_data,
    }
