"""
AtmoGraph GNN — Real-Time Inference Engine
===========================================
Loads trained GNN weights and runs predictions on live graph data
received from Neo4j via the FastAPI layer.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from __future__ import annotations

import torch
from pathlib import Path
from typing import Any
from loguru import logger

from gnn.model import create_model, DisruptionAwareGNN
from gnn.features import build_pyg_graph, update_node_risk, FEATURE_DIM


class GNNInferenceEngine:
    """
    Singleton inference engine for real-time supply chain delay prediction.

    Usage:
        engine = GNNInferenceEngine(model_path="./models/best_model.pt")
        results = engine.predict(nodes, edges)
        # results = [{"node_id": "port_001", "delay_days": 23.5, "confidence": 0.87}, ...]
    """

    _instance: "GNNInferenceEngine | None" = None

    def __init__(
        self,
        model_path: str = "./models/best_model.pt",
        model_type: str = "disruption_aware",
        hidden_channels: int = 64,
        num_sage_layers: int = 3,
        device: str | None = None,
        **kwargs: Any,
    ):
        self.device = torch.device(
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )

        # Load model architecture
        self.model = create_model(
            model_type=model_type,
            hidden_channels=hidden_channels,
            num_sage_layers=num_sage_layers,
            **kwargs,
        ).to(self.device)

        # Load weights if checkpoint exists
        path_obj = Path(model_path)
        candidates = [
            path_obj,
            Path.cwd() / model_path,
            Path(__file__).resolve().parent.parent / "models" / "best_model.pt",
            Path(__file__).resolve().parent.parent.parent / "models" / "best_model.pt",
            Path(__file__).resolve().parent.parent / "models" / "gnn_model.pt",
            Path(__file__).resolve().parent.parent.parent / "models" / "gnn_model.pt",
        ]
        resolved_path = None
        for c in candidates:
            if c.exists() and c.is_file():
                resolved_path = c
                break

        if resolved_path:
            self._load_weights(resolved_path)
            logger.info(f"✅ GNN model loaded from {resolved_path}")
        else:
            logger.warning(
                f"⚠️  No model checkpoint at {model_path}. "
                f"Running with random weights. Train the model first."
            )

        self.model.eval()

    def _load_weights(self, path: Path) -> None:
        """Load weights from checkpoint file."""
        checkpoint = torch.load(path, map_location=self.device)
        if "model_state_dict" in checkpoint:
            self.model.load_state_dict(checkpoint["model_state_dict"])
        else:
            self.model.load_state_dict(checkpoint)

    @torch.no_grad()
    def predict(
        self,
        nodes: list[dict[str, Any]],
        edges: list[dict[str, Any]],
        disruption_event: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Run GNN inference on the current supply chain graph.

        Args:
            nodes:             List of node property dicts from Neo4j.
            edges:             List of edge dicts.
            disruption_event:  Optional disruption to apply before inference.
                               Format: {"node_id": "port_001", "risk_score": 0.9,
                                        "severity": 0.8, "disruption_flag": True}

        Returns:
            List of prediction dicts, one per node:
            [{"node_id": str, "delay_days": float, "confidence": float,
              "risk_level": str}, ...]
        """
        # Build graph
        graph = build_pyg_graph(nodes, edges)

        # Apply disruption update if provided
        if disruption_event:
            graph = update_node_risk(
                graph,
                node_id=disruption_event["node_id"],
                risk_score=disruption_event.get("risk_score", 1.0),
                disruption_flag=disruption_event.get("disruption_flag", True),
                disruption_severity=disruption_event.get("severity", 0.8),
            )

        # Run inference
        graph = graph.to(self.device)
        out = self.model(graph.x, graph.edge_index)

        delay_days = out["delay_days"].cpu().numpy().flatten()
        confidence = out["confidence"].cpu().numpy().flatten()
        node_ids = graph.node_ids

        # Node metadata lookup
        node_info = {}
        for n in nodes:
            nid = str(n.get("node_id") or n.get("id") or "")
            if nid:
                node_info[nid] = n
                node_info[nid.lower()] = n
            if "id" in n and n["id"] is not None:
                node_info[str(n["id"])] = n
                node_info[str(n["id"]).lower()] = n

        # Downstream BFS hop distance from disruption origin
        hop_dist: dict[str, int] = {}
        if disruption_event and "node_id" in disruption_event:
            origin_raw = str(disruption_event["node_id"]).strip()
            origin_id = origin_raw
            if hasattr(graph, "node_id_to_idx"):
                idx = graph.node_id_to_idx.get(origin_raw) or graph.node_id_to_idx.get(origin_raw.lower())
                if idx is not None and idx < len(graph.node_ids):
                    origin_id = graph.node_ids[idx]

            adj: dict[str, list[str]] = {}
            for edge in edges:
                src = str(edge.get("source") if edge.get("source") is not None else (edge.get("source_node_id") or edge.get("src") or ""))
                tgt = str(edge.get("target") if edge.get("target") is not None else (edge.get("target_node_id") or edge.get("dst") or ""))
                if src:
                    adj.setdefault(src, []).append(tgt)
                    adj.setdefault(src.lower(), []).append(tgt)

            hop_dist[origin_id] = 0
            hop_dist[origin_id.lower()] = 0
            queue = [origin_id]
            while queue:
                curr = queue.pop(0)
                curr_d = hop_dist[curr]
                if curr_d >= 5:
                    continue
                for nxt in adj.get(curr, []) + adj.get(curr.lower(), []):
                    if nxt not in hop_dist:
                        hop_dist[nxt] = curr_d + 1
                        hop_dist[nxt.lower()] = curr_d + 1
                        queue.append(nxt)

        # Build result list
        results = []
        for i, node_id in enumerate(node_ids):
            delay = float(delay_days[i])
            conf = float(confidence[i])
            orig_node = node_info.get(node_id) or node_info.get(node_id.lower()) or {}
            dist = hop_dist.get(node_id) or hop_dist.get(node_id.lower())
            hop_distance = dist if dist is not None else -1

            # Categorise risk level
            if delay < 7:
                risk_level = "low"
            elif delay < 30:
                risk_level = "medium"
            elif delay < 60:
                risk_level = "high"
            else:
                risk_level = "critical"

            risk_score = round(min(1.0, delay / 60.0), 2)
            if hop_distance == 0 and disruption_event:
                risk_score = max(risk_score, float(disruption_event.get("severity", 0.8)))

            results.append({
                "node_id": node_id,
                "node_type": orig_node.get("node_type", "Unknown"),
                "name": orig_node.get("name", node_id),
                "delay_days": round(delay, 1),
                "predicted_delay_days": round(delay, 1),
                "confidence": round(conf, 3),
                "risk_score": risk_score,
                "risk_level": risk_level,
                "hop_distance": hop_distance,
            })

        results.sort(key=lambda x: x["predicted_delay_days"], reverse=True)
        return results

    @torch.no_grad()
    def predict_timeline(
        self,
        nodes: list[dict[str, Any]],
        edges: list[dict[str, Any]],
        disruption_event: dict[str, Any],
        horizons: list[int] = [30, 60, 90],
    ) -> dict[int, list[dict[str, Any]]]:
        """
        Predict supply chain state at multiple future time horizons.

        Args:
            nodes:             Node list.
            edges:             Edge list.
            disruption_event:  Disruption to apply.
            horizons:          List of day horizons to predict (default: 30, 60, 90).

        Returns:
            Dict mapping horizon_days → list of node predictions.
        """
        timeline_results = {}

        for horizon in horizons:
            # Scale disruption severity by time decay
            time_decay = max(0.1, 1.0 - (horizon / 180))  # Decay over 180 days
            scaled_event = {
                **disruption_event,
                "severity": disruption_event.get("severity", 0.8) * time_decay,
                "risk_score": disruption_event.get("risk_score", 0.9) * time_decay,
            }

            predictions = self.predict(nodes, edges, disruption_event=scaled_event)
            timeline_results[horizon] = predictions

        return timeline_results
