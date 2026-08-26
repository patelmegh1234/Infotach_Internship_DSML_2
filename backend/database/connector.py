"""
AtmoGraph — Neo4j Database Connector
======================================
Connection pool management and session factory for Neo4j.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from __future__ import annotations
from functools import lru_cache
from neo4j import GraphDatabase, Driver
from loguru import logger
from ..config.settings import get_settings


@lru_cache()
def get_neo4j_driver() -> Driver:
    """
    Returns a cached Neo4j driver instance (connection pool).
    Call once at startup — reuse across the application lifetime.
    """
    settings = get_settings()
    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
        max_connection_lifetime=3600,
        max_connection_pool_size=50,
        connection_acquisition_timeout=30,
    )
    # Verify connectivity
    driver.verify_connectivity()
    logger.info(f"✅ Neo4j connected: {settings.neo4j_uri}")
    return driver


def close_driver() -> None:
    """Close the Neo4j driver. Call at application shutdown."""
    driver = get_neo4j_driver()
    driver.close()
    get_neo4j_driver.cache_clear()
    logger.info("Neo4j driver closed.")
