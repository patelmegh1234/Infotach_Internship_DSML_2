"""
AtmoGraph — WebSocket Manager
================================
Manages active WebSocket connections and broadcasts
real-time GNN predictions to connected dashboard clients.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from __future__ import annotations

import json
from typing import Any
from loguru import logger
from fastapi import WebSocket


class WebSocketManager:
    """
    Manages a pool of active WebSocket connections.

    Supports:
        - Client connection / disconnection
        - Personal messages (to one client)
        - Broadcast messages (to all clients)
        - Typed message payloads for the React dashboard
    """

    def __init__(self):
        # client_id → WebSocket mapping
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self._connections[client_id] = websocket
        logger.info(f"WS connected: {client_id} | Total: {len(self._connections)}")

        # Send welcome message
        await self.send_personal(
            {
                "type": "connected",
                "client_id": client_id,
                "message": "Connected to AtmoGraph real-time stream",
            },
            client_id,
        )

    def disconnect(self, client_id: str) -> None:
        """Remove a disconnected client."""
        self._connections.pop(client_id, None)
        logger.info(f"WS disconnected: {client_id} | Total: {len(self._connections)}")

    async def send_personal(self, message: dict[str, Any], client_id: str) -> None:
        """Send a message to a specific client."""
        if client_id in self._connections:
            ws = self._connections[client_id]
            try:
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to send to {client_id}: {e}")
                self.disconnect(client_id)

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast a message to ALL connected clients."""
        if not self._connections:
            return

        dead_clients = []
        payload = json.dumps(message)

        for client_id, ws in self._connections.items():
            try:
                await ws.send_text(payload)
            except Exception:
                dead_clients.append(client_id)

        for client_id in dead_clients:
            self.disconnect(client_id)

    async def broadcast_predictions(
        self, predictions: list[dict[str, Any]], disruption_id: str
    ) -> None:
        """
        Broadcast GNN prediction results to all dashboard clients.

        Args:
            predictions:    List of node prediction dicts from GNNInferenceEngine.
            disruption_id:  ID of the disruption event that triggered this prediction.
        """
        await self.broadcast({
            "type": "predictions_updated",
            "disruption_id": disruption_id,
            "predictions": predictions,
            "count": len(predictions),
        })

    async def broadcast_disruption(self, disruption: dict[str, Any]) -> None:
        """Broadcast a newly detected disruption event."""
        await self.broadcast({
            "type": "disruption_detected",
            "disruption": disruption,
        })

    @property
    def connection_count(self) -> int:
        return len(self._connections)
