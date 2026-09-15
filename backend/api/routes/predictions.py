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
from database.queries import GET_GNN_FEATURES, GET_ALL_EDGES

router = APIRouter()


def _pull_live_graph(driver) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Pull live supply chain graph directly from Neo4j using GET_GNN_FEATURES and GET_ALL_EDGES.
    Falls back gracefully to mock graph when Neo4j is offline or empty.
    """
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    if driver:
        try:
            with driver.session() as session:
                nodes_result = session.run(GET_GNN_FEATURES, limit=5000)
                nodes = [dict(r) for r in nodes_result]

                edges_result = session.run(GET_ALL_EDGES, limit=20000)
                edges = [dict(r) for r in edges_result]
                if nodes:
                    logger.info(f"Pulled live Neo4j graph: {len(nodes)} nodes, {len(edges)} edges")
        except Exception as exc:
            logger.warning(f"Neo4j live query failed: {exc}. Using fallback dataset.")

    if not nodes:
        fallback = _load_fallback_graph(limit=2000)
        nodes = fallback.nodes
        edges = fallback.edges

    return nodes, edges


class DisruptionInput(BaseModel):
    node_id: str = Field(..., description="ID of the disrupted node (e.g. SUP-001, PORT-001)")
    risk_score: float = Field(0.85, ge=0.0, le=1.0, description="Risk score [0-1]")
    disruption_flag: bool = Field(True, description="Whether disruption is active")
    severity: float = Field(0.8, ge=0.0, le=1.0, description="Disruption severity [0-1]")
    disruption_type: Optional[str] = Field("strike", description="Type: strike, flood, fire, etc.")
    description: Optional[str] = Field(None, description="Human-readable description")


from pydantic import BaseModel, Field, model_validator


class TimelinePredictionInput(BaseModel):
    disruption: Optional[DisruptionInput] = None
    node_id: Optional[str] = Field(None, description="Optional ID of disrupted node (alternative to full disruption object)")
    severity: Optional[float] = Field(0.8, ge=0.0, le=1.0, description="Optional severity score")
    horizons: list[int] = Field(
        default=[30, 60, 90],
        description="Day horizons to predict (e.g. [30, 60, 90])"
    )

    @model_validator(mode="after")
    def check_disruption_or_node_id(self) -> "TimelinePredictionInput":
        if self.disruption is None and not self.node_id:
            raise ValueError("Either 'disruption' or 'node_id' must be provided.")
        return self


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
        src = str(e.get("source") or e.get("source_node_id") or "")
        tgt = str(e.get("target") or e.get("target_node_id") or "")
        if src:
            adj.setdefault(src, []).append(tgt)
            adj.setdefault(src.lower(), []).append(tgt)

    # BFS k-hop distance
    hop_dist: dict[str, int] = {origin_id: 0, origin_id.lower(): 0}
    queue = [origin_id]
    while queue:
        curr = queue.pop(0)
        curr_dist = hop_dist[curr]
        if curr_dist >= 4:
            continue
        for nxt in adj.get(curr, []) + adj.get(curr.lower(), []):
            if nxt not in hop_dist:
                hop_dist[nxt] = curr_dist + 1
                hop_dist[nxt.lower()] = curr_dist + 1
                queue.append(nxt)

    results: list[dict[str, Any]] = []
    hop_decay = [1.0, 0.78, 0.58, 0.38, 0.22]

    for node in nodes:
        nid = str(node.get("node_id") or node.get("id") or "")
        dist = hop_dist.get(nid) or hop_dist.get(nid.lower())
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
            "delay_days": delay_days,
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

    nodes, edges = _pull_live_graph(driver)

    if not nodes:
        return {
            "status": "success",
            "disruption_node": disruption.node_id,
            "total_nodes_affected": 0,
            "high_risk_count": 0,
            "predictions": [],
        }

    # Run GNN inference or analytical propagation fallback
    predictions = None
    if gnn_engine:
        try:
            predictions = gnn_engine.predict(
                nodes=nodes,
                edges=edges,
                disruption_event=disruption.model_dump(),
            )
        except Exception as exc:
            logger.warning(f"GNN engine predict failed: {exc}. Using analytical propagation.")

    if not predictions:
        predictions = _analytical_propagation(nodes, edges, disruption.model_dump())

    # Broadcast to WebSocket clients if manager exists
    if ws_manager:
        try:
            await ws_manager.broadcast_predictions(
                predictions=predictions,
                disruption_id=disruption.node_id,
            )
        except Exception as exc:
            logger.warning(f"WebSocket broadcast failed: {exc}")

    high_risk = [p for p in predictions if p.get("risk_level") in ("high", "critical")]

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

    nodes, edges = _pull_live_graph(driver)

    # Determine disruption event to evaluate
    disruption_dict: dict[str, Any] = {}
    if payload.disruption:
        disruption_dict = payload.disruption.model_dump()
    elif payload.node_id:
        disruption_dict = {
            "node_id": payload.node_id,
            "risk_score": payload.severity or 0.85,
            "disruption_flag": True,
            "severity": payload.severity or 0.8,
            "disruption_type": "strike",
            "description": "Timeline simulation",
        }
    else:
        # Pick top risk node or first supplier/port in network
        top_node = "PORT-001"
        if nodes:
            sorted_nodes = sorted(nodes, key=lambda n: float(n.get("risk_score", 0.0)), reverse=True)
            top_node = str(sorted_nodes[0].get("id") or sorted_nodes[0].get("node_id") or "PORT-001")
        disruption_dict = {
            "node_id": top_node,
            "risk_score": 0.85,
            "disruption_flag": True,
            "severity": 0.8,
            "disruption_type": "strike",
            "description": "Default timeline simulation",
        }

    origin_id = disruption_dict.get("node_id", "PORT-001")
    timeline_data: dict[str, list[dict[str, Any]]] = {}

    if gnn_engine:
        try:
            timeline_res = gnn_engine.predict_timeline(
                nodes=nodes,
                edges=edges,
                disruption_event=disruption_dict,
                horizons=payload.horizons,
            )
            for h, preds in timeline_res.items():
                key = f"{h}_days" if isinstance(h, int) else str(h)
                # Ensure risk_level is present
                for p in preds:
                    r = float(p.get("risk_score", 0.0))
                    p["risk_level"] = "critical" if r >= 0.75 else "high" if r >= 0.55 else "medium" if r >= 0.35 else "low"
                    p.setdefault("delay_days", p.get("predicted_delay_days", 0.0))
                timeline_data[key] = preds
        except Exception as exc:
            logger.warning(f"GNN engine predict_timeline failed: {exc}. Using analytical propagation.")

    if not timeline_data:
        base_preds = _analytical_propagation(nodes, edges, disruption_dict)
        for horizon in payload.horizons:
            factor = 1.0 + (horizon - 30) * 0.015
            h_preds = []
            for p in base_preds:
                adj_delay = round(p["predicted_delay_days"] * factor, 1)
                adj_risk = min(1.0, round(p["risk_score"] * factor, 2))
                level = "critical" if adj_risk >= 0.75 else "high" if adj_risk >= 0.55 else "medium" if adj_risk >= 0.35 else "low"
                h_preds.append({
                    "node_id": p["node_id"],
                    "node_type": p["node_type"],
                    "name": p["name"],
                    "predicted_delay_days": adj_delay,
                    "delay_days": adj_delay,
                    "risk_score": adj_risk,
                    "risk_level": level,
                    "confidence": p["confidence"],
                    "hop_distance": p.get("hop_distance", -1),
                })
            timeline_data[f"{horizon}_days"] = h_preds

    return {
        "status": "success",
        "disruption_node": origin_id,
        "horizons": payload.horizons,
        "timeline": timeline_data,
    }
