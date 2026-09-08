"""
AtmoGraph — NLP Entity Linker

Maps extracted NLP entities to matching Neo4j supply-chain nodes.
Supports exact and fuzzy matching for locations and organizations.
"""

from __future__ import annotations

from difflib import SequenceMatcher
from typing import Any

from loguru import logger

try:
    from database.connector import get_neo4j_driver
    from database.queries import GET_ENTITY_LINK_CANDIDATES
except ImportError:
    from ..database.connector import get_neo4j_driver
    from ..database.queries import GET_ENTITY_LINK_CANDIDATES


ALL_NODE_TYPES = [
    "Supplier",
    "Manufacturer",
    "Port",
    "DistributionCenter",
    "Retailer",
    "Product",
]

LOCATION_ENTITY_TYPES = {
    "LOCATION",
    "LOC",
    "GPE",
    "PLACE",
    "FACILITY",
}

ORG_ENTITY_TYPES = {
    "ORG",
    "ORGANIZATION",
    "COMPANY",
}


def _normalise_text(value: str) -> str:
    """Normalise text before exact or fuzzy comparison."""
    return " ".join(value.lower().strip().split())


def _get_allowed_node_types(entity_type: str) -> list[str]:
    """Choose relevant Neo4j node labels for an NLP entity type."""
    normalised_type = _normalise_text(entity_type).upper()

    if normalised_type in LOCATION_ENTITY_TYPES:
        return ["Port", "DistributionCenter"]

    if normalised_type in ORG_ENTITY_TYPES:
        return ["Supplier", "Manufacturer", "Retailer"]

    return ALL_NODE_TYPES


def _match_score(entity_text: str, candidate: dict[str, Any]) -> float:
    """Return the best exact/fuzzy match score for a node candidate."""
    entity_value = _normalise_text(entity_text)

    candidate_values = [
        candidate.get("name", ""),
        candidate.get("city", ""),
        candidate.get("country", ""),
        candidate.get("node_id", ""),
    ]

    scores = []

    for value in candidate_values:
        candidate_value = _normalise_text(str(value))

        if not candidate_value:
            continue

        if entity_value == candidate_value:
            scores.append(1.0)
        elif entity_value in candidate_value or candidate_value in entity_value:
            scores.append(0.90)
        else:
            scores.append(
                SequenceMatcher(
                    None,
                    entity_value,
                    candidate_value,
                ).ratio()
            )

    return max(scores, default=0.0)


def _load_fallback_candidates() -> list[dict[str, Any]]:
    """Load candidates from mock supply chain data or built-in registry when Neo4j is offline."""
    import json
    from pathlib import Path

    candidates: list[dict[str, Any]] = []
    possible_paths = [
        Path(__file__).resolve().parent.parent.parent / "data" / "mock" / "supply_chain_nodes.json",
        Path("data/mock/supply_chain_nodes.json"),
        Path("../data/mock/supply_chain_nodes.json"),
    ]

    for p in possible_paths:
        if p.exists():
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
                nodes = data.get("nodes", {})

                type_map = {
                    "suppliers": "Supplier",
                    "manufacturers": "Manufacturer",
                    "ports": "Port",
                    "distribution_centers": "DistributionCenter",
                    "retailers": "Retailer",
                }

                for key, node_type in type_map.items():
                    for item in nodes.get(key, []):
                        candidates.append({
                            "node_id": item.get("node_id", ""),
                            "node_type": node_type,
                            "name": item.get("name", ""),
                            "city": item.get("city", ""),
                            "country": item.get("country", ""),
                            "risk_score": float(item.get("risk_score", 0.0)),
                            "severity": float(item.get("severity", 0.0)),
                            "disruption_type": item.get("disruption_type", "None"),
                        })
                if candidates:
                    logger.info("Loaded {} fallback entity candidates from mock JSON.", len(candidates))
                    return candidates
            except Exception as exc:
                logger.warning("Error reading fallback JSON: {}", exc)

    return [
        {"node_id": "PORT-001", "node_type": "Port", "name": "Port of Shanghai", "city": "Shanghai", "country": "China", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "PORT-002", "node_type": "Port", "name": "Port of Singapore", "city": "Singapore", "country": "Singapore", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "PORT-003", "node_type": "Port", "name": "Port of Rotterdam", "city": "Rotterdam", "country": "Netherlands", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "PORT-004", "node_type": "Port", "name": "Port of Ningbo", "city": "Ningbo", "country": "China", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "PORT-005", "node_type": "Port", "name": "Port of Los Angeles", "city": "Los Angeles", "country": "United States", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "PORT-006", "node_type": "Port", "name": "Port of Hamburg", "city": "Hamburg", "country": "Germany", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "PORT-007", "node_type": "Port", "name": "Port of Antwerp", "city": "Antwerp", "country": "Belgium", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "PORT-008", "node_type": "Port", "name": "Port of Busan", "city": "Busan", "country": "South Korea", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "SUP-001", "node_type": "Supplier", "name": "Tata Steel", "city": "Jamshedpur", "country": "India", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "SUP-002", "node_type": "Supplier", "name": "Nippon Steel", "city": "Tokyo", "country": "Japan", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "SUP-003", "node_type": "Supplier", "name": "POSCO", "city": "Pohang", "country": "South Korea", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "SUP-004", "node_type": "Supplier", "name": "BASF", "city": "Ludwigshafen", "country": "Germany", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "SUP-005", "node_type": "Supplier", "name": "Reliance Industries", "city": "Mumbai", "country": "India", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "SUP-006", "node_type": "Supplier", "name": "ArcelorMittal", "city": "Luxembourg", "country": "Luxembourg", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "MAN-001", "node_type": "Manufacturer", "name": "Apple", "city": "Cupertino", "country": "United States", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "MAN-002", "node_type": "Manufacturer", "name": "Samsung Electronics", "city": "Suwon", "country": "South Korea", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "MAN-003", "node_type": "Manufacturer", "name": "Toyota Motor Corporation", "city": "Toyota", "country": "Japan", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "MAN-004", "node_type": "Manufacturer", "name": "TSMC", "city": "Hsinchu", "country": "Taiwan", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
        {"node_id": "MAN-005", "node_type": "Manufacturer", "name": "Foxconn", "city": "Taipei", "country": "Taiwan", "risk_score": 0.0, "severity": 0.0, "disruption_type": "None"},
    ]


_CANDIDATE_CACHE: list[dict[str, Any]] | None = None
_CANDIDATE_CACHE_TIME: float = 0.0
_CACHE_TTL_SECONDS: float = 300.0


def fetch_entity_link_candidates(force_refresh: bool = False) -> list[dict[str, Any]]:
    """
    Fetch all entity-linking candidates once from Neo4j with 5-min in-memory cache.
    Falls back to mock supply chain data if Neo4j is offline or empty.
    """
    global _CANDIDATE_CACHE, _CANDIDATE_CACHE_TIME
    import time
    now = time.time()

    if not force_refresh and _CANDIDATE_CACHE is not None and (now - _CANDIDATE_CACHE_TIME) < _CACHE_TTL_SECONDS:
        return _CANDIDATE_CACHE

    candidates = None
    try:
        driver = get_neo4j_driver()
        with driver.session() as session:
            db_candidates = [
                record.data()
                for record in session.run(
                    GET_ENTITY_LINK_CANDIDATES,
                    node_types=ALL_NODE_TYPES,
                )
            ]
            if db_candidates:
                candidates = db_candidates
    except Exception as exc:
        logger.warning(
            "Could not fetch entity link candidates from Neo4j ({}). Using fallback mock candidates.",
            exc,
        )

    if not candidates:
        candidates = _load_fallback_candidates()

    _CANDIDATE_CACHE = candidates
    _CANDIDATE_CACHE_TIME = now
    return candidates


def link_entity(
    entity_text: str,
    entity_type: str,
    candidates: list[dict[str, Any]],
    min_score: float = 0.72,
) -> dict[str, Any] | None:
    """
    Link one extracted entity using candidates already fetched from Neo4j.
    """
    allowed_node_types = _get_allowed_node_types(entity_type)

    relevant_candidates = [
        candidate
        for candidate in candidates
        if candidate["node_type"] in allowed_node_types
    ]

    best_candidate = None
    best_score = 0.0

    for candidate in relevant_candidates:
        score = _match_score(entity_text, candidate)

        if score > best_score:
            best_candidate = candidate
            best_score = score

    if best_candidate is None or best_score < min_score:
        logger.info(
            "No Neo4j node linked for entity '{}' with score {:.2f}",
            entity_text,
            best_score,
        )
        return None

    result = {
        "node_id": best_candidate["node_id"],
        "node_type": best_candidate["node_type"],
        "risk_score": float(best_candidate["risk_score"]),
        "severity": float(best_candidate["severity"]),
        "disruption_type": best_candidate["disruption_type"],
    }

    logger.info(
        "Linked entity '{}' ({}) to {} with score {:.2f}",
        entity_text,
        entity_type,
        result["node_id"],
        best_score,
    )

    return result


def link_entities(
    entities: list[dict[str, str]],
    min_score: float = 0.72,
) -> list[dict[str, Any]]:
    """
    Link multiple NLP entities using one Neo4j candidate lookup.

    Each input entity needs:
        {"text": "...", "label": "..."}
    """
    candidates = fetch_entity_link_candidates()
    linked_nodes = []

    for entity in entities:
        entity_text = entity.get("text", "")
        entity_type = entity.get("label", "")

        if not entity_text:
            continue

        linked_node = link_entity(
            entity_text,
            entity_type,
            candidates,
            min_score=min_score,
        )

        if linked_node:
            linked_nodes.append(linked_node)

    return linked_nodes


if __name__ == "__main__":
    candidates = fetch_entity_link_candidates()

    print("Rotterdam:", link_entity("Rotterdam", "LOCATION", candidates))
    print("TSMC:", link_entity("TSMC", "ORG", candidates))
    print("Roterdam:", link_entity("Roterdam", "LOCATION", candidates))