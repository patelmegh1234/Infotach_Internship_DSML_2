"""
AtmoGraph — NLP Named Entity Recognition Extractor

Uses HuggingFace dslim/bert-base-NER (primary) with spaCy en_core_web_sm
as a lightweight fallback to extract supply-chain-relevant entities from
raw news text.

Outputs:
- Extracted entities (text, label, confidence)
- Disruption type classification
- Severity score [0.0 – 1.0]
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from loguru import logger

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# HuggingFace model for NER (downloads on first use, ~400 MB)
BERT_NER_MODEL = "dslim/bert-base-NER"

# Keywords that determine disruption type (checked against lowercased headline)
DISRUPTION_KEYWORDS: dict[str, list[str]] = {
    "strike": [
        "strike", "walkout", "labour dispute", "labor dispute",
        "workers refuse", "industrial action", "protest",
    ],
    "flood": [
        "flood", "typhoon", "hurricane", "cyclone", "tsunami",
        "storm surge", "monsoon", "heavy rain", "deluge",
    ],
    "earthquake": [
        "earthquake", "quake", "seismic", "tremor", "magnitude",
    ],
    "geopolitical": [
        "tariff", "sanction", "embargo", "trade war", "ban", "restriction",
        "geopolitical", "conflict", "war", "blockade", "export control",
    ],
    "fire": [
        "fire", "explosion", "blast", "burn", "arson", "inferno",
    ],
    "pandemic": [
        "pandemic", "outbreak", "lockdown", "quarantine", "covid",
        "virus", "epidemic", "shutdown", "closure",
    ],
    "accident": [
        "accident", "collision", "grounding", "vessel stuck", "canal blocked",
        "derailment", "crash",
    ],
}

# Severity multipliers per disruption type (baseline before keyword tuning)
DISRUPTION_BASE_SEVERITY: dict[str, float] = {
    "strike":       0.65,
    "flood":        0.75,
    "earthquake":   0.85,
    "geopolitical": 0.60,
    "fire":         0.70,
    "pandemic":     0.90,
    "accident":     0.55,
    "unknown":      0.40,
}

# Words that amplify severity (multiplier applied on top of base)
SEVERITY_AMPLIFIERS: dict[str, float] = {
    "indefinite":   0.20,
    "major":        0.15,
    "severe":       0.15,
    "critical":     0.20,
    "total":        0.20,
    "widespread":   0.15,
    "catastrophic": 0.25,
    "emergency":    0.15,
    "shutdown":     0.20,
    "blocked":      0.15,
    "closed":       0.10,
}


# ---------------------------------------------------------------------------
# Data Classes
# ---------------------------------------------------------------------------

@dataclass
class ExtractedEntity:
    """A single entity extracted by the NER model."""

    text: str
    label: str          # e.g. "LOC", "ORG", "PER", "MISC"
    confidence: float   # 0.0 – 1.0
    start: int = 0
    end: int = 0


@dataclass
class NERResult:
    """Full NER extraction result for one news article / headline."""

    raw_text: str
    entities: list[ExtractedEntity] = field(default_factory=list)
    disruption_type: str = "unknown"
    severity: float = 0.0


# ---------------------------------------------------------------------------
# HuggingFace NER pipeline (lazy-loaded)
# ---------------------------------------------------------------------------

_bert_pipeline: Any | None = None


def _get_bert_pipeline() -> Any:
    """Lazy-load the HuggingFace NER pipeline (avoids startup cost)."""
    global _bert_pipeline
    if _bert_pipeline is None:
        try:
            from transformers import pipeline as hf_pipeline
            logger.info("Loading HuggingFace NER model: {}", BERT_NER_MODEL)
            _bert_pipeline = hf_pipeline(
                "ner",
                model=BERT_NER_MODEL,
                aggregation_strategy="simple",
            )
            logger.info("HuggingFace NER model loaded successfully.")
        except Exception as exc:
            logger.warning("HuggingFace NER unavailable ({}). Falling back to spaCy.", exc)
            _bert_pipeline = None
    return _bert_pipeline


# ---------------------------------------------------------------------------
# spaCy fallback (lightweight, no GPU needed)
# ---------------------------------------------------------------------------

_spacy_nlp: Any | None = None


def _get_spacy_nlp() -> Any | None:
    """Lazy-load spaCy en_core_web_sm."""
    global _spacy_nlp
    if _spacy_nlp is None:
        try:
            import spacy
            _spacy_nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy en_core_web_sm loaded as NER fallback.")
        except Exception as exc:
            logger.error("spaCy model unavailable: {}", exc)
    return _spacy_nlp


# ---------------------------------------------------------------------------
# Disruption classification
# ---------------------------------------------------------------------------

def classify_disruption_type(text: str) -> str:
    """
    Classify the type of supply chain disruption from raw text.

    Returns one of: strike | flood | earthquake | geopolitical |
                    fire | pandemic | accident | unknown
    """
    lower = text.lower()
    best_type = "unknown"
    best_count = 0

    for dtype, keywords in DISRUPTION_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in lower)
        if count > best_count:
            best_count = count
            best_type = dtype

    return best_type


# ---------------------------------------------------------------------------
# Severity scoring
# ---------------------------------------------------------------------------

def score_severity(text: str, disruption_type: str) -> float:
    """
    Score disruption severity [0.0 – 1.0].

    Base score is set by disruption type, then amplified by
    the presence of severity-indicative words in the text.
    """
    base = DISRUPTION_BASE_SEVERITY.get(disruption_type, 0.40)
    lower = text.lower()

    amplification = sum(
        boost
        for word, boost in SEVERITY_AMPLIFIERS.items()
        if word in lower
    )

    return min(1.0, round(base + amplification, 3))


# ---------------------------------------------------------------------------
# Core extraction
# ---------------------------------------------------------------------------

def _extract_with_bert(text: str) -> list[ExtractedEntity]:
    """Run HuggingFace BERT-NER on the input text."""
    pipeline = _get_bert_pipeline()
    if pipeline is None:
        return []

    try:
        raw_entities = pipeline(text)
    except Exception as exc:
        logger.warning("BERT-NER inference failed: {}", exc)
        return []

    entities = []
    for ent in raw_entities:
        # HuggingFace returns entity_group for aggregated strategy
        label = ent.get("entity_group") or ent.get("entity", "MISC")
        entities.append(
            ExtractedEntity(
                text=ent["word"],
                label=label,
                confidence=round(float(ent["score"]), 4),
                start=ent.get("start", 0),
                end=ent.get("end", 0),
            )
        )
    return entities


def _extract_with_spacy(text: str) -> list[ExtractedEntity]:
    """Run spaCy NER on the input text (fallback)."""
    nlp = _get_spacy_nlp()
    if nlp is None:
        return []

    # Map spaCy label → canonical label used by entity_linker
    label_map = {
        "GPE": "LOC",
        "LOC": "LOC",
        "ORG": "ORG",
        "FAC": "LOC",
        "EVENT": "MISC",
        "DATE": "DATE",
        "PERSON": "PER",
    }

    doc = nlp(text)
    entities = []
    for ent in doc.ents:
        mapped = label_map.get(ent.label_, "MISC")
        entities.append(
            ExtractedEntity(
                text=ent.text,
                label=mapped,
                confidence=0.80,   # spaCy doesn't give per-entity scores
                start=ent.start_char,
                end=ent.end_char,
            )
        )
    return entities


def _deduplicate(entities: list[ExtractedEntity]) -> list[ExtractedEntity]:
    """Remove duplicate entities (same lowercased text)."""
    seen: set[str] = set()
    unique = []
    for ent in entities:
        key = ent.text.lower().strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(ent)
    return unique


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_entities(text: str) -> NERResult:
    """
    Extract NER entities, disruption type, and severity from raw text.

    Tries HuggingFace BERT-NER first; falls back to spaCy if unavailable.

    Args:
        text: A news headline or short article paragraph.

    Returns:
        NERResult with entities, disruption_type, and severity.
    """
    if not text or not text.strip():
        return NERResult(raw_text=text)

    # Try BERT first
    entities = _extract_with_bert(text)

    # Fallback to spaCy if BERT returned nothing
    if not entities:
        logger.debug("Falling back to spaCy NER for: {!r}", text[:80])
        entities = _extract_with_spacy(text)

    entities = _deduplicate(entities)
    disruption_type = classify_disruption_type(text)
    severity = score_severity(text, disruption_type)

    result = NERResult(
        raw_text=text,
        entities=entities,
        disruption_type=disruption_type,
        severity=severity,
    )

    logger.info(
        "NER extracted {} entities | type={} | severity={:.2f} | text={!r}",
        len(entities),
        disruption_type,
        severity,
        text[:60],
    )

    return result


def extract_entities_batch(texts: list[str]) -> list[NERResult]:
    """Extract NER results for a list of headlines."""
    return [extract_entities(t) for t in texts]


# ---------------------------------------------------------------------------
# CLI / quick test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    SAMPLE_HEADLINES = [
        "Port workers in Rotterdam begin indefinite strike over wage disputes",
        "Typhoon Doksuri forces closure of Shanghai container terminal",
        "Taiwan semiconductor factory hit by magnitude 7.4 earthquake",
        "Suez Canal blocked by grounded container vessel",
        "US imposes 25% tariffs on Chinese electronics components",
    ]

    for headline in SAMPLE_HEADLINES:
        result = extract_entities(headline)
        print(f"\nText    : {result.raw_text}")
        print(f"Type    : {result.disruption_type}")
        print(f"Severity: {result.severity}")
        print(f"Entities: {[(e.text, e.label) for e in result.entities]}")
