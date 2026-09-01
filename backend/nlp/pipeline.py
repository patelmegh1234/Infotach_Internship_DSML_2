"""
AtmoGraph — NLP Pipeline Orchestrator

Main entry point for the NLP disruption ingestion engine.
Takes raw news text, runs NER extraction, links entities to Neo4j
supply chain nodes, and returns a structured DisruptionEvent ready
to be sent to POST /api/disrupt/.

Usage:
    from backend.nlp.pipeline import NLPPipeline

    pipeline = NLPPipeline()
    events = pipeline.process("Port workers in Rotterdam begin strike")
"""

from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from loguru import logger

from .ner_extractor import NERResult, extract_entities
from .entity_linker import link_entities


# ---------------------------------------------------------------------------
# Data Classes
# ---------------------------------------------------------------------------

@dataclass
class DisruptionEvent:
    """
    A fully resolved supply chain disruption event.
    This is the schema expected by POST /api/disrupt/.
    """

    disruption_id: str
    node_id: str
    node_type: str
    disruption_type: str
    location: str
    severity: float
    estimated_duration_days: int
    source_headline: str
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Duration estimation
# ---------------------------------------------------------------------------

# Estimated disruption durations in days by type
DURATION_ESTIMATES: dict[str, int] = {
    "strike":       14,
    "flood":        7,
    "earthquake":   21,
    "geopolitical": 60,
    "fire":         10,
    "pandemic":     90,
    "accident":     5,
    "unknown":      7,
}


def _estimate_duration(disruption_type: str, severity: float) -> int:
    """
    Estimate disruption duration in days.
    Higher severity increases the base estimate by up to 50%.
    """
    base = DURATION_ESTIMATES.get(disruption_type, 7)
    multiplier = 1.0 + (severity - 0.5) * 1.0   # severity 1.0 → +50%
    return max(1, round(base * multiplier))


# ---------------------------------------------------------------------------
# NLP Pipeline
# ---------------------------------------------------------------------------

class NLPPipeline:
    """
    Orchestrates the full NLP disruption ingestion pipeline:

    1. Extract entities from raw text using BERT-NER / spaCy.
    2. Classify disruption type and score severity.
    3. Link extracted entities to Neo4j supply chain nodes.
    4. Build DisruptionEvent objects for each matched node.
    """

    def __init__(self, min_link_score: float = 0.72) -> None:
        """
        Args:
            min_link_score: Minimum fuzzy-match score for entity linking.
                            Entities below this threshold are discarded.
        """
        self.min_link_score = min_link_score
        logger.info(
            "NLPPipeline initialised (min_link_score={:.2f})", min_link_score
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process(self, text: str) -> list[DisruptionEvent]:
        """
        Process one news headline or article snippet.

        Args:
            text: Raw news text.

        Returns:
            A list of DisruptionEvent objects — one per matched Neo4j node.
            Returns an empty list if no supply chain nodes could be linked.
        """
        if not text or not text.strip():
            logger.warning("NLPPipeline.process() called with empty text.")
            return []

        # Step 1: NER extraction
        ner_result: NERResult = extract_entities(text)

        if not ner_result.entities:
            logger.info("No entities found in text: {!r}", text[:80])
            return []

        logger.debug(
            "Extracted {} entities: {}",
            len(ner_result.entities),
            [(e.text, e.label) for e in ner_result.entities],
        )

        # Step 2: Entity linking → Neo4j nodes
        entity_dicts = [
            {"text": e.text, "label": e.label}
            for e in ner_result.entities
        ]
        linked_nodes = link_entities(entity_dicts, min_score=self.min_link_score)

        if not linked_nodes:
            logger.info(
                "No Neo4j nodes linked for text: {!r}", text[:80]
            )
            return []

        logger.info(
            "{} supply chain node(s) linked for text: {!r}",
            len(linked_nodes),
            text[:60],
        )

        # Step 3: Build DisruptionEvent for each linked node
        events: list[DisruptionEvent] = []

        # Use the primary linked entity text as location label
        location_entities = [
            e for e in ner_result.entities
            if e.label in {"LOC", "GPE", "LOCATION"}
        ]
        location_label = (
            location_entities[0].text
            if location_entities
            else ner_result.entities[0].text
        )

        for node in linked_nodes:
            duration = _estimate_duration(
                ner_result.disruption_type, ner_result.severity
            )
            event = DisruptionEvent(
                disruption_id=f"evt_{uuid.uuid4().hex[:12]}",
                node_id=node["node_id"],
                node_type=node["node_type"],
                disruption_type=ner_result.disruption_type,
                location=location_label,
                severity=ner_result.severity,
                estimated_duration_days=duration,
                source_headline=text[:500],
            )
            events.append(event)

        return events

    def process_batch(self, texts: list[str]) -> list[DisruptionEvent]:
        """
        Process multiple news texts and return all resulting disruption events.

        Args:
            texts: List of raw news strings.

        Returns:
            Flat list of DisruptionEvent across all texts.
        """
        all_events: list[DisruptionEvent] = []
        for text in texts:
            events = self.process(text)
            all_events.extend(events)
        return all_events

    def process_to_dict(self, text: str) -> list[dict[str, Any]]:
        """
        Same as process() but returns serialisable dicts instead of dataclasses.
        Convenient for sending directly to the FastAPI /api/disrupt/ endpoint.
        """
        return [event.to_dict() for event in self.process(text)]


# ---------------------------------------------------------------------------
# Module-level convenience functions
# ---------------------------------------------------------------------------

# Default shared pipeline instance (lazy, created on first use)
_default_pipeline: NLPPipeline | None = None


def get_default_pipeline() -> NLPPipeline:
    """Return a module-level shared NLPPipeline instance."""
    global _default_pipeline
    if _default_pipeline is None:
        _default_pipeline = NLPPipeline()
    return _default_pipeline


def process_text(text: str) -> list[dict[str, Any]]:
    """
    Convenience wrapper — process one text using the default pipeline.

    Returns a list of serialisable disruption event dicts.
    """
    return get_default_pipeline().process_to_dict(text)


# ---------------------------------------------------------------------------
# CLI / quick test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    HEADLINES = [
        "Port workers in Rotterdam begin indefinite strike over wage disputes",
        "Typhoon Doksuri forces closure of Shanghai container terminal",
        "Taiwan semiconductor factory hit by magnitude 7.4 earthquake",
        "Suez Canal blocked by grounded container vessel",
        "US imposes 25% tariffs on Chinese electronics components",
    ]

    pipeline = NLPPipeline()

    for headline in HEADLINES:
        print(f"\n{'=' * 70}")
        print(f"HEADLINE: {headline}")
        events = pipeline.process(headline)
        if events:
            for event in events:
                print(f"  → Node: {event.node_id} ({event.node_type})")
                print(f"    Type: {event.disruption_type} | Severity: {event.severity:.2f}")
                print(f"    Est. duration: {event.estimated_duration_days} days")
        else:
            print("  → No supply chain nodes matched.")
