"""
AtmoGraph — NLP Background Worker
=================================
Background worker that auto-polls news headlines, runs the NER pipeline,
links extracted entities to Neo4j supply chain nodes, and POSTs structured
disruptions to the REST API (/api/disrupt/).

Also supports optional Redis message queue integration for hybrid operation:
- INPUT  -> Redis list  key: "nlp:queue:incoming"
- OUTPUT -> Redis list  key: "nlp:queue:events"

Part of Issue #19 (Megh Patel — Team Leader)
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import sys
import time
from typing import Any, Optional

import httpx
from loguru import logger

try:
    from config.settings import get_settings
except ImportError:
    from ..config.settings import get_settings

try:
    from nlp.pipeline import NLPPipeline
    from nlp.news_fetcher import NewsFetcher
except ImportError:
    from .pipeline import NLPPipeline
    from .news_fetcher import NewsFetcher


# ── Logging Setup ─────────────────────────────────────────────────────────────
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:HH:mm:ss}</green> | <level>{level:<8}</level> | {message}",
    level=os.getenv("LOG_LEVEL", "INFO"),
)


# ── Configuration Defaults ────────────────────────────────────────────────────
INCOMING_QUEUE = "nlp:queue:incoming"
EVENTS_QUEUE = "nlp:queue:events"


# ── Graceful Shutdown ─────────────────────────────────────────────────────────
_RUNNING = True


def _handle_signal(signum: int, _frame: Any) -> None:
    global _RUNNING
    logger.info("Signal {} received - shutting down NLP worker cleanly ...", signum)
    _RUNNING = False


signal.signal(signal.SIGTERM, _handle_signal)
signal.signal(signal.SIGINT, _handle_signal)


# ── Optional Redis Connection ─────────────────────────────────────────────────
def _connect_redis(redis_url: str, max_retries: int = 2) -> Any:
    """
    Attempt to connect to Redis.
    Returns redis client or None if Redis is not running (allowing worker to run standalone).
    """
    try:
        import redis as redis_lib
        client = redis_lib.from_url(redis_url, decode_responses=True)
        client.ping()
        logger.info("Connected to Redis at: {}", redis_url.split("@")[-1])
        return client
    except Exception as exc:
        logger.info("Redis not available ({}) - operating in direct polling mode.", exc)
        return None


# ── Pipeline Instance ─────────────────────────────────────────────────────────
_pipeline: Optional[NLPPipeline] = None


def get_worker_pipeline() -> NLPPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = NLPPipeline(min_link_score=0.72)
        logger.info("NLPPipeline initialized inside worker.")
    return _pipeline


# ── API Dispatch ──────────────────────────────────────────────────────────────
def post_disruption_to_api(event: dict[str, Any], api_base_url: str) -> bool:
    """
    POST a structured DisruptionEvent to the AtmoGraph REST API.
    Tries /api/disrupt/ first, then /api/disruptions/ as fallback.
    """
    base = api_base_url.rstrip("/")
    endpoints = [f"{base}/api/disrupt/", f"{base}/api/disruptions/"]

    for url in endpoints:
        try:
            with httpx.Client(timeout=httpx.Timeout(3.0, connect=1.0)) as client:
                resp = client.post(url, json=event)
                if resp.status_code in (200, 201):
                    logger.info(
                        "-> Successfully ingested to API [{}]: node={} type={} sev={:.2f}",
                        resp.status_code,
                        event.get("node_id"),
                        event.get("disruption_type"),
                        event.get("severity", 0.0),
                    )
                    return True
                elif resp.status_code == 404:
                    continue  # Try next endpoint variant
                else:
                    logger.warning(
                        "API returned HTTP {}: {}", resp.status_code, resp.text[:120]
                    )
                    return False
        except httpx.ConnectError:
            logger.warning("Could not connect to API at {} (server may be offline).", url)
            break  # Server host is down, no need to retry second endpoint
        except Exception as exc:
            logger.warning("Error posting disruption to API ({}): {}", url, exc)
            return False

    return False


# ── Article Processing ────────────────────────────────────────────────────────
def process_article(
    article: dict[str, Any],
    api_base_url: str,
    redis_client: Any = None,
    pipeline: Optional[NLPPipeline] = None,
    post_to_api: bool = True,
) -> list[dict[str, Any]]:
    """
    Run one article through the NLP pipeline, link nodes, and POST to API.
    """
    pipe = pipeline or get_worker_pipeline()
    text = article.get("text") or article.get("title") or ""
    if not text.strip():
        return []

    headline = article.get("title") or text[:120]
    logger.info("Processing headline: {!r}", headline[:75])

    try:
        events = pipe.process_to_dict(text)
    except Exception as exc:
        logger.error("NLP extraction error for {!r}: {}", headline[:60], exc)
        return []

    if not events:
        logger.info("No disruption events extracted for: {!r}", headline[:60])
        return []

    ingested_events: list[dict[str, Any]] = []
    for evt in events:
        evt["source"] = article.get("source", "NLP Worker")
        evt["source_headline"] = headline

        # Ensure detected_at is populated
        if "detected_at" not in evt:
            evt["detected_at"] = evt.get("timestamp")

        # Ingest to REST API
        if post_to_api:
            post_disruption_to_api(evt, api_base_url)

        # Ingest to Redis queue if connected
        if redis_client:
            try:
                redis_client.rpush(EVENTS_QUEUE, json.dumps(evt))
                logger.debug("Event pushed to Redis: {}", evt["disruption_id"])
            except Exception as exc:
                logger.warning("Failed to push event to Redis: {}", exc)

        ingested_events.append(evt)

    logger.info("Extracted {} disruption event(s) from article.", len(ingested_events))
    return ingested_events


# ── Worker Main Loop ──────────────────────────────────────────────────────────
def run_worker(
    poll_interval: Optional[int] = None,
    api_base_url: Optional[str] = None,
    once: bool = False,
    use_static: bool = False,
    use_redis: bool = True,
    post_to_api: bool = True,
) -> None:
    """
    Continuous background loop:
    1. Polls news articles using NewsFetcher (NewsAPI or static corpus).
    2. Processes each new article through NER and entity linking.
    3. Pushes valid disruptions to the FastAPI endpoint /api/disrupt/.
    4. Also polls Redis queue for any on-demand incoming headlines if Redis is active.
    5. Sleeps for poll_interval seconds between cycles.
    """
    settings = get_settings()
    interval = poll_interval or settings.news_poll_interval or 30
    api_url = api_base_url or getattr(settings, "api_base_url", "http://localhost:8000")
    redis_url = os.getenv("REDIS_URL", settings.redis_url)

    logger.info("Starting AtmoGraph NLP Worker ...")
    logger.info("Configuration: poll_interval={}s, api_url={}, once={}", interval, api_url, once)

    # Initialise fetcher and pipeline
    fetcher = NewsFetcher(
        api_key=settings.news_api_key,
        use_static_corpus=use_static,
    )
    pipeline = get_worker_pipeline()

    # Connect to Redis (optional)
    redis_client = _connect_redis(redis_url) if use_redis else None

    iteration = 0
    while _RUNNING:
        iteration += 1
        logger.info("--- Polling Cycle #{} ---", iteration)

        # 1. Fetch fresh unseen news articles
        try:
            articles = fetcher.fetch_articles(limit=3)
            logger.info("Fetched {} article(s) to inspect.", len(articles))

            for article in articles:
                if not _RUNNING:
                    break
                process_article(
                    article=article,
                    api_base_url=api_url,
                    redis_client=redis_client,
                    pipeline=pipeline,
                    post_to_api=post_to_api,
                )
        except Exception as exc:
            logger.error("Error during news polling cycle: {}", exc)

        # 2. Check on-demand Redis incoming queue if connected
        if redis_client and _RUNNING:
            try:
                # Non-blocking pop to drain any immediate manual inputs
                raw = redis_client.lpop(INCOMING_QUEUE)
                if raw:
                    logger.info("Received manual headline from Redis queue.")
                    try:
                        payload = json.loads(raw)
                    except Exception:
                        payload = {"text": raw, "source": "RedisManual"}
                    process_article(
                        article=payload,
                        api_base_url=api_url,
                        redis_client=redis_client,
                        pipeline=pipeline,
                        post_to_api=post_to_api,
                    )
            except Exception as exc:
                logger.warning("Redis queue read error: {}", exc)

        if once:
            logger.info("Worker executed in --once mode. Exiting.")
            break

        # Responsive sleep that checks _RUNNING every 0.5s
        sleep_until = time.time() + interval
        while _RUNNING and time.time() < sleep_until:
            time.sleep(0.5)

    logger.info("NLP Worker stopped cleanly.")


# ── CLI Interface ─────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="AtmoGraph NLP Background Worker")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run exactly one polling cycle and exit (useful for testing).",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=None,
        help="Polling interval in seconds (overrides NEWS_POLL_INTERVAL_SECONDS).",
    )
    parser.add_argument(
        "--api-url",
        type=str,
        default=None,
        help="AtmoGraph API base URL (e.g. http://localhost:8000).",
    )
    parser.add_argument(
        "--static",
        action="store_true",
        help="Force use of static disruption corpus instead of live NewsAPI.",
    )
    parser.add_argument(
        "--no-redis",
        action="store_true",
        help="Disable Redis queue checking.",
    )

    args = parser.parse_args()

    run_worker(
        poll_interval=args.interval,
        api_base_url=args.api_url,
        once=args.once,
        use_static=args.static,
        use_redis=not args.no_redis,
    )


if __name__ == "__main__":
    main()
