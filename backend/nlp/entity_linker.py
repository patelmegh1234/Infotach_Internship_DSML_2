"""
AtmoGraph — NLP Entity Linker

Maps extracted NLP entities to matching Neo4j supply-chain nodes.
Supports exact and fuzzy matching for locations and organizations.
"""

from __future__ import annotations

from difflib import SequenceMatcher
from typing import Any

from loguru import logger

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


def fetch_entity_link_candidates() -> list[dict[str, Any]]:
    """
    Fetch all entity-linking candidates once from Neo4j.

    This prevents a new Neo4j session from being opened for every entity.
    """
    driver = get_neo4j_driver()

    with driver.session() as session:
        return [
            record.data()
            for record in session.run(
                GET_ENTITY_LINK_CANDIDATES,
                node_types=ALL_NODE_TYPES,
            )
        ]


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