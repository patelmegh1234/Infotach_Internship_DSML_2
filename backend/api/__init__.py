"""
AtmoGraph — API Package

FastAPI application factory and public exports.

Usage:
    from api.main import app          # ASGI app (for uvicorn)
    from api.websocket import WebSocketManager
"""

from .main import app
from .websocket import WebSocketManager

__all__ = [
    "app",
    "WebSocketManager",
]
