#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# AtmoGraph — Neo4j Database Initialisation Script
#
# Runs automatically inside the neo4j container on first startup.
# Executes all Cypher scripts in order to create constraints and
# seed the supply chain graph.
#
# Mounted by docker-compose.yml:
#   ./scripts/docker:/docker-entrypoint-initdb.d (read-only)
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASSWORD="${NEO4J_PASSWORD:-atmograph2026}"
CYPHER_DIR="/var/lib/neo4j/import/cypher"
SENTINEL="/data/atmograph_initialized"

# ── Skip if already initialised ──────────────────────────────────────────────
if [ -f "$SENTINEL" ]; then
    echo "[init-neo4j] Database already initialised — skipping."
    exit 0
fi

echo "[init-neo4j] Waiting for Neo4j to be ready …"

# Wait until Neo4j Bolt is accepting connections (max 120 s)
RETRIES=24
until cypher-shell \
        -u "$NEO4J_USER" \
        -p "$NEO4J_PASSWORD" \
        "RETURN 1" > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ "$RETRIES" -le 0 ]; then
        echo "[init-neo4j] ERROR: Neo4j did not become ready in time."
        exit 1
    fi
    echo "[init-neo4j] Neo4j not ready yet — waiting 5 s … ($RETRIES retries left)"
    sleep 5
done

echo "[init-neo4j] Neo4j is ready. Running Cypher scripts …"

# ── Execute each script in alphabetical (numbered) order ─────────────────────
for script in "$CYPHER_DIR"/0*.cypher; do
    echo "[init-neo4j] Running: $(basename "$script")"
    cypher-shell \
        -u "$NEO4J_USER" \
        -p "$NEO4J_PASSWORD" \
        --file "$script" \
        --format plain
    echo "[init-neo4j] ✅ Done: $(basename "$script")"
done

# ── Mark as initialised so this script won't re-run ─────────────────────────
touch "$SENTINEL"
echo "[init-neo4j] ✅ All Cypher scripts executed. Database ready."
