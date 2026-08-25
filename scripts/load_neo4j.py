"""
AtmoGraph — Neo4j Mock Data Loader and JSON Exporter
"""

import json
import os
from pathlib import Path

from neo4j import GraphDatabase


NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CYPHER_DIR = PROJECT_ROOT / "scripts" / "cypher"
EXPORT_PATH = PROJECT_ROOT / "data" / "mock" / "supply_chain_nodes.json"

# Products must exist before route relationships are created.
CYPHER_FILES = [
    "01_create_constraints.cypher",
    "02_create_suppliers.cypher",
    "03_create_ports.cypher",
    "04_create_manufacturers.cypher",
    "06_create_products.cypher",
    "05_create_routes.cypher",
]

NODE_GROUPS = {
    "Supplier": "suppliers",
    "Manufacturer": "manufacturers",
    "Port": "ports",
    "DistributionCenter": "distribution_centers",
    "Retailer": "retailers",
    "Product": "products",
}


def run_cypher_file(driver, file_name: str) -> None:
    """Read and execute one Cypher file."""
    file_path = CYPHER_DIR / file_name
    cypher_script = file_path.read_text(encoding="utf-8")

    statements = [
        statement.strip()
        for statement in cypher_script.split(";")
        if statement.strip()
    ]

    with driver.session() as session:
        for statement in statements:
            session.run(statement).consume()

    print(f"Loaded: {file_name}")


def export_mock_dataset(driver) -> None:
    """Export all graph nodes and relationships to JSON."""
    dataset = {
        "description": "AtmoGraph mock supply-chain dataset",
        "nodes": {group: [] for group in NODE_GROUPS.values()},
        "relationships": [],
    }

    with driver.session() as session:
        node_records = session.run(
            """
            MATCH (n)
            RETURN labels(n)[0] AS node_type, properties(n) AS properties
            ORDER BY node_type, n.node_id
            """
        )

        for record in node_records:
            node_type = record["node_type"]
            group = NODE_GROUPS.get(node_type)

            if group:
                dataset["nodes"][group].append(record["properties"])

        relationship_records = session.run(
            """
            MATCH (source)-[r]->(target)
            RETURN
                source.node_id AS source_node_id,
                type(r) AS relationship_type,
                target.node_id AS target_node_id,
                properties(r) AS properties
            """
        )

        for record in relationship_records:
            dataset["relationships"].append({
                "source_node_id": record["source_node_id"],
                "relationship_type": record["relationship_type"],
                "target_node_id": record["target_node_id"],
                "properties": record["properties"],
            })

    EXPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    EXPORT_PATH.write_text(
        json.dumps(dataset, indent=2),
        encoding="utf-8",
    )

    total_nodes = sum(len(group) for group in dataset["nodes"].values())
    total_edges = len(dataset["relationships"])

    print(f"Exported JSON: {EXPORT_PATH}")
    print(f"Nodes: {total_nodes}")
    print(f"Relationships: {total_edges}")


def main() -> None:
    """Load all scripts, then export the graph as JSON."""
    if not NEO4J_PASSWORD:
        raise ValueError(
            "NEO4J_PASSWORD is missing. "
            "Set it in PowerShell before running this script."
        )

    with GraphDatabase.driver(
        NEO4J_URI,
        auth=(NEO4J_USER, NEO4J_PASSWORD),
    ) as driver:
        driver.verify_connectivity()

        for file_name in CYPHER_FILES:
            run_cypher_file(driver, file_name)

        export_mock_dataset(driver)

    print("AtmoGraph mock data loaded and exported successfully.")


if __name__ == "__main__":
    main()