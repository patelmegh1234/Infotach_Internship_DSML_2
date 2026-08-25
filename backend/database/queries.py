"""
AtmoGraph — Neo4j Cypher Query Library
==========================================
Central library of all Cypher queries used by the application.
Shubhangi will extend this with supply-chain-specific queries.

Week 1+2 Deliverable (Megh — architecture skeleton)
Extended in Week 1+2 by: Shubhangi (Neo4j/Data Engineering)
"""

# ── Graph Schema Queries ──────────────────────────────────

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

# ── Node Queries ──────────────────────────────────────────

GET_ALL_NODES = """
MATCH (n)
RETURN
    elementId(n)        AS id,
    labels(n)[0]        AS node_type,
    n.node_id           AS node_id,
    n.name              AS name,
    n.risk_score        AS risk_score,
    n.disruption_flag   AS disruption_flag,
    n.country           AS country,
    n.capacity_utilization AS capacity_utilization
ORDER BY n.risk_score DESC
LIMIT $limit
"""

GET_HIGH_RISK_NODES = """
MATCH (n)
WHERE n.risk_score >= $threshold
RETURN
    elementId(n)        AS id,
    labels(n)[0]        AS node_type,
    n.name              AS name,
    n.risk_score        AS risk_score,
    n.disruption_type   AS disruption_type
ORDER BY n.risk_score DESC
"""

GET_NODE_BY_ID = """
MATCH (n)
WHERE n.node_id = $node_id OR elementId(n) = $node_id
RETURN n
"""

# ── Edge Queries ──────────────────────────────────────────

GET_ALL_EDGES = """
MATCH (a)-[r]->(b)
RETURN
    elementId(a)    AS source,
    elementId(b)    AS target,
    type(r)         AS relationship,
    r.weight        AS weight,
    r.lead_time_days AS lead_time_days
LIMIT $limit
"""

GET_DOWNSTREAM_NODES = """
MATCH (start)-[*1..$hops]->(downstream)
WHERE start.node_id = $node_id OR elementId(start) = $node_id
RETURN DISTINCT
    elementId(downstream) AS id,
    labels(downstream)[0] AS node_type,
    downstream.name       AS name,
    downstream.risk_score AS risk_score
"""

# ── Risk Update Queries ───────────────────────────────────

UPDATE_NODE_RISK = """
MATCH (n)
WHERE n.node_id = $node_id OR elementId(n) = $node_id
SET
    n.risk_score          = $risk_score,
    n.disruption_flag     = $disruption_flag,
    n.disruption_severity = $severity,
    n.last_updated        = datetime()
RETURN n
"""

RESET_ALL_RISKS = """
MATCH (n)
WHERE n.disruption_flag = true
SET
    n.risk_score      = 0.0,
    n.disruption_flag = false,
    n.last_updated    = datetime()
RETURN count(n) AS nodes_reset
"""

# ── GNN Feature Extraction Query ─────────────────────────

GET_GNN_FEATURES = """
MATCH (n)
OPTIONAL MATCH (n)-[r]->()
RETURN
    elementId(n)                    AS id,
    n.node_id                       AS node_id,
    labels(n)[0]                    AS node_type,
    coalesce(n.risk_score, 0.0)     AS risk_score,
    coalesce(n.disruption_flag, false)   AS disruption_flag,
    coalesce(n.disruption_severity, 0.0) AS disruption_severity,
    coalesce(n.historical_delay_avg, 0.0) AS historical_delay_avg,
    coalesce(n.capacity_utilization, 0.5) AS capacity_utilization,
    coalesce(n.geo_importance_score, 0.5) AS geo_importance_score,
    count(r)                        AS out_degree
LIMIT $limit
"""
# ── Supply-Chain Analysis Queries ──────────────────────────

GET_SUPPLIER_NETWORK = """
MATCH p = (supplier:Supplier {node_id: $supplier_id})-[*1..5]-(neighbor)
WHERE length(p) <= $max_hops
RETURN p, length(p) AS hops
ORDER BY hops
"""

GET_PORT_TRAFFIC = """
MATCH (port:Port {node_id: $port_id})
OPTIONAL MATCH (port)-[connection]-()
RETURN
    port.node_id AS port_id,
    port.name AS port_name,
    port.city AS city,
    port.country AS country,
    port.throughput_teu AS throughput_teu,
    port.geo_importance_score AS geo_importance_score,
    count(DISTINCT connection) AS connection_count
"""

GET_CRITICAL_PATH = """
MATCH p = (supplier:Supplier)
    -[:SUPPLIES|MANUFACTURES|SHIPS_THROUGH|ROUTES_TO|DISTRIBUTES|SELLS*1..8]->
    (destination)
WHERE all(node IN nodes(p) WHERE single(visited IN nodes(p) WHERE visited = node))
RETURN
    p,
    length(p) AS hop_count,
    supplier.node_id AS source_node_id,
    destination.node_id AS destination_node_id
ORDER BY hop_count DESC
LIMIT 1
"""