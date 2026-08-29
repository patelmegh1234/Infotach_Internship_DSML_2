"""
AtmoGraph — API Routes Package

Exports all FastAPI route modules for registration in main.py.
"""

from . import graph, predictions, disruptions, health

__all__ = [
    "graph",
    "predictions",
    "disruptions",
    "health",
]
