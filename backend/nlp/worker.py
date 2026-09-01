"""
AtmoGraph — NLP Background Worker

Reads raw news headlines from a Redis queue, runs them through
the NLP pipeline, and writes structured DisruptionEvents back
to Redis so the FastAPI WebSocket layer can broadcast them.

Queue protocol
--------------
  INPUT  → Redis list  key: "nlp:queue:incoming"  (LPUSH from API)
  OUTPUT → Redis list  key: "nlp:queue:events"     (RPUSH, read by WS)

Run via:
    python -m nlp.worker
Or via docker-compose:
    command: python -m nlp.worker
"""

from __future__ import annotations

import json
import os
import signal
import sys
import time
from typing import Any

from loguru import logger

# ── Logging ──────────────────────────────────────────────────────────────────
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:HH:mm:ss}</green> | <level>{level:<8}</level> | {message}",
    level=os.getenv("LOG_LEVEL", "INFO"),
)

# ── Config ───────────────────────────────────────────────────────────────────
REDIS_URL        = os.getenv("REDIS_URL", "redis://:atmograph2026@localhost:6379")
INCOMING_QUEUE   = "nlp:queue:incoming"   # raw headlines land here
EVENTS_QUEUE     = "nlp:queue:events"     # structured events written here
BLOCK_TIMEOUT_S  = 5     # BLPOP block time — allows clean shutdown checks
WORKER_SLEEP_S   = 0.1   # tight-loop sleep when not blocking


# ── Graceful-shutdown flag ────────────────────────────────────────────────────
_RUNNING = True

def _handle_signal(signum: int, _frame: Any) -> None:
    global _RUNNING
    logger.info("Signal {} received — shutting down NLP worker …", signum)
    _RUNNING = False

signal.signal(signal.SIGTERM, _handle_signal)
signal.signal(signal.SIGINT,  _handle_signal)


# ── Redis connection ──────────────────────────────────────────────────────────
def _connect_redis():
    """Return a Redis client, retrying until Neo4j / Redis is ready."""
    import redis as redis_lib

    for attempt in range(1, 11):
        try:
            client = redis_lib.from_url(REDIS_URL, decode_responses=True)
            client.ping()
            logger.info("✅ Redis connected: {}", REDIS_URL.split("@")[-1])
            return client
        except Exception as exc:
            logger.warning(
                "Redis not ready (attempt {}/10): {} — retrying in 5 s …",
                attempt, exc,
            )
            time.sleep(5)

    logger.error("❌ Could not connect to Redis after 10 attempts. Exiting.")
    sys.exit(1)


# ── Pipeline (lazy import so worker starts fast) ──────────────────────────────
_pipeline = None

def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        from nlp.pipeline import NLPPipeline
        _pipeline = NLPPipeline(min_link_score=0.72)
        logger.info("NLPPipeline initialised inside worker.")
    return _pipeline


# ── Core processing ───────────────────────────────────────────────────────────
def _process_message(raw: str, redis_client) -> None:
    """
    Parse one raw Redis message, run it through the NLP pipeline,
    and push results to the events queue.

    Message format (JSON):
        {"text": "Port workers in Rotterdam begin strike", "source": "NewsAPI"}
    """
    try:
        payload: dict[str, Any] = json.loads(raw)
    except json.JSONDecodeError:
        # Treat plain strings as the text field directly
        payload = {"text": raw, "source": "unknown"}

    text: str = payload.get("text", "").strip()
    if not text:
        logger.warning("Empty text in message — skipping.")
        return

    logger.info("Processing: {!r}", text[:80])

    try:
        events = _get_pipeline().process_to_dict(text)
    except Exception as exc:
        logger.error("Pipeline error for {!r}: {}", text[:60], exc)
        return

    if not events:
        logger.info("No disruption events extracted from: {!r}", text[:60])
        return

    for event in events:
        event["source"] = payload.get("source", "unknown")
        redis_client.rpush(EVENTS_QUEUE, json.dumps(event))
        logger.info(
            "→ Event queued: {} ({}) sev={:.2f}",
            event["node_id"],
            event["disruption_type"],
            event["severity"],
        )

    logger.info(
        "Queued {} event(s) for: {!r}", len(events), text[:60]
    )


# ── Worker loop ───────────────────────────────────────────────────────────────
def run_worker() -> None:
    """Main worker loop — blocks on Redis BLPOP and processes each message."""
    logger.info("🚀 AtmoGraph NLP Worker starting …")
    redis_client = _connect_redis()

    # Pre-load pipeline so first request isn't slow
    try:
        _get_pipeline()
    except Exception as exc:
        logger.warning("Pipeline pre-load failed (will retry on first message): {}", exc)

    logger.info(
        "Listening on Redis queue: '{}' → '{}'",
        INCOMING_QUEUE,
        EVENTS_QUEUE,
    )

    while _RUNNING:
        try:
            # BLPOP blocks for BLOCK_TIMEOUT_S seconds then returns None
            result = redis_client.blpop(INCOMING_QUEUE, timeout=BLOCK_TIMEOUT_S)

            if result is None:
                # Timeout — loop back and check _RUNNING
                continue

            _queue_key, raw_message = result
            _process_message(raw_message, redis_client)

        except KeyboardInterrupt:
            break
        except Exception as exc:
            logger.error("Unexpected error in worker loop: {}", exc)
            time.sleep(1)   # Back-off before retrying

    logger.info("NLP Worker stopped cleanly.")


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    run_worker()
