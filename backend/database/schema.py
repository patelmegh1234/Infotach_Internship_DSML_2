"""
AtmoGraph — Neo4j Graph Schema
===============================

Documents the node labels, properties, relationships, and uniqueness
constraints used by the AtmoGraph supply-chain graph.

This schema must stay consistent with backend/database/queries.py.
"""

NODE_SCHEMAS = {
    "Supplier": {
        "description": "Supplies materials or products to manufacturers.",
        "properties": {
            "node_id": "string, unique identifier",
            "name": "string",
            "country": "string",
            "capacity_utilization": "float (0.0 to 1.0)",
            "risk_score": "float (0.0 to 1.0)",
            "historical_delay_avg": "float, average delay in days",
        },
    },
    "Manufacturer": {
        "description": "Produces products using supplied materials.",
        "properties": {
            "node_id": "string, unique identifier",
            "name": "string",
            "country": "string",
            "production_capacity": "float",
            "industry": "string",
        },
    },
    "Port": {
        "description": "Shipping and logistics port.",
        "properties": {
            "node_id": "string, unique identifier",
            "name": "string",
            "city": "string",
            "country": "string",
            "throughput_teu": "integer",
            "geo_importance_score": "float (0.0 to 1.0)",
        },
    },
    "DistributionCenter": {
        "description": "Stores and distributes products regionally.",
        "properties": {
            "node_id": "string, unique identifier",
            "name": "string",
            "region": "string",
            "storage_capacity": "float",
        },
    },
    "Retailer": {
        "description": "Sells products to the market.",
        "properties": {
            "node_id": "string, unique identifier",
            "name": "string",
            "market": "string",
            "annual_revenue": "float",
        },
    },
    "Product": {
        "description": "A product manufactured and sold through the supply chain.",
        "properties": {
            "node_id": "string, unique identifier",
            "name": "string",
            "category": "string",
            "lead_time_days": "integer",
        },
    },
}

RELATIONSHIP_SCHEMAS = {
    "SUPPLIES": "(:Supplier)-[:SUPPLIES]->(:Manufacturer)",
    "MANUFACTURES": "(:Manufacturer)-[:MANUFACTURES]->(:Product)",
    "SHIPS_THROUGH": "(:Product)-[:SHIPS_THROUGH]->(:Port)",
    "ROUTES_TO": "(:Port)-[:ROUTES_TO]->(:DistributionCenter)",
    "DISTRIBUTES": "(:DistributionCenter)-[:DISTRIBUTES]->(:Retailer)",
    "SELLS": "(:Retailer)-[:SELLS]->(:Product)",
}

CREATE_CONSTRAINTS = """
CREATE CONSTRAINT supplier_id IF NOT EXISTS
FOR (s:Supplier) REQUIRE s.node_id IS UNIQUE;

CREATE CONSTRAINT manufacturer_id IF NOT EXISTS
FOR (m:Manufacturer) REQUIRE m.node_id IS UNIQUE;

CREATE CONSTRAINT port_id IF NOT EXISTS
FOR (p:Port) REQUIRE p.node_id IS UNIQUE;

CREATE CONSTRAINT dc_id IF NOT EXISTS
FOR (d:DistributionCenter) REQUIRE d.node_id IS UNIQUE;

CREATE CONSTRAINT retailer_id IF NOT EXISTS
FOR (r:Retailer) REQUIRE r.node_id IS UNIQUE;

CREATE CONSTRAINT product_id IF NOT EXISTS
FOR (p:Product) REQUIRE p.node_id IS UNIQUE;
"""