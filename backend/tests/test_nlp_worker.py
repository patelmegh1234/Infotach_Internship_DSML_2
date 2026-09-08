"""
AtmoGraph — NLP Worker & NewsFetcher Test Suite
================================================
Validates NewsFetcher, NER extraction, entity linking, and background worker logic.
Part of Issue #19 (Megh Patel — Team Leader)
"""

import json
from unittest.mock import MagicMock, patch
import pytest
from nlp.news_fetcher import NewsFetcher, STATIC_DISRUPTION_CORPUS
from nlp.pipeline import NLPPipeline
from nlp.worker import post_disruption_to_api, process_article, run_worker


# ---------------------------------------------------------------------------
# Test NewsFetcher
# ---------------------------------------------------------------------------

class TestNewsFetcher:
    def test_static_corpus_structure(self):
        assert len(STATIC_DISRUPTION_CORPUS) >= 10
        for item in STATIC_DISRUPTION_CORPUS:
            assert "title" in item and len(item["title"]) > 10
            assert "description" in item
            assert "source" in item
            assert "url" in item

    def test_fetch_from_static_corpus(self):
        fetcher = NewsFetcher(use_static_corpus=True)
        articles = fetcher.fetch_articles(limit=3)
        assert len(articles) == 3

        for art in articles:
            assert "id" in art
            assert "title" in art
            assert "text" in art
            assert "source" in art
            assert "published_at" in art

    def test_deduplication(self):
        fetcher = NewsFetcher(use_static_corpus=True)
        fetcher.reset_seen()

        batch_1 = fetcher.fetch_articles(limit=2)
        assert len(batch_1) == 2

        batch_2 = fetcher.fetch_articles(limit=2)
        assert len(batch_2) == 2

        # Titles in batch 1 and 2 should be distinct due to deduplication
        ids_1 = {a["id"] for a in batch_1}
        ids_2 = {a["id"] for a in batch_2}
        assert ids_1.isdisjoint(ids_2)

    def test_reset_seen(self):
        fetcher = NewsFetcher(use_static_corpus=True)
        articles = fetcher.fetch_articles(limit=2)
        assert len(fetcher.seen_hashes) == 2
        fetcher.reset_seen()
        assert len(fetcher.seen_hashes) == 0

    @patch("nlp.news_fetcher.httpx.Client")
    def test_newsapi_fallback_on_http_error(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_client.get.return_value.status_code = 429

        fetcher = NewsFetcher(api_key="mock_key", use_static_corpus=False)
        articles = fetcher.fetch_articles(limit=2)
        # Should gracefully fall back to static corpus
        assert len(articles) == 2
        assert any(not a.get("is_live", True) for a in articles)


# ---------------------------------------------------------------------------
# Test Article Processing & Pipeline Integration
# ---------------------------------------------------------------------------

class TestArticleProcessing:
    def test_process_article_port_strike(self):
        article = {
            "title": "Port workers in Rotterdam begin indefinite strike over wage disputes",
            "description": "Dockworkers at Rotterdam seaport halted operations.",
            "text": "Port workers in Rotterdam begin indefinite strike over wage disputes",
            "source": "Maritime News",
        }

        pipeline = NLPPipeline(min_link_score=0.70)
        events = process_article(
            article=article,
            api_base_url="http://localhost:8000",
            post_to_api=False,
            pipeline=pipeline,
        )

        assert len(events) >= 1
        event = events[0]
        assert event["disruption_type"] == "strike"
        assert event["severity"] > 0.5
        assert "node_id" in event
        assert event["source"] == "Maritime News"

    def test_process_article_semiconductor_earthquake(self):
        article = {
            "title": "Magnitude 7.2 earthquake halts production at TSMC semiconductor fabrication facilities in Taiwan",
            "description": "Cleanrooms evacuated at TSMC.",
            "text": "Magnitude 7.2 earthquake halts production at TSMC semiconductor fabrication facilities in Taiwan",
            "source": "Tech Daily",
        }

        pipeline = NLPPipeline(min_link_score=0.70)
        events = process_article(
            article=article,
            api_base_url="http://localhost:8000",
            post_to_api=False,
            pipeline=pipeline,
        )

        assert len(events) >= 1
        event = events[0]
        assert event["disruption_type"] == "earthquake"
        assert event["severity"] >= 0.8

    def test_empty_article_returns_empty_list(self):
        article = {"title": "", "description": "", "text": ""}
        events = process_article(
            article=article,
            api_base_url="http://localhost:8000",
            post_to_api=False,
        )
        assert events == []


# ---------------------------------------------------------------------------
# Test API Dispatch & Worker Loop
# ---------------------------------------------------------------------------

class TestWorkerDispatch:
    @patch("nlp.worker.httpx.Client")
    def test_post_disruption_to_api_success(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_client.post.return_value.status_code = 200

        event = {
            "node_id": "PORT-001",
            "disruption_type": "strike",
            "severity": 0.85,
            "location": "Shanghai",
        }
        success = post_disruption_to_api(event, "http://localhost:8000")
        assert success is True

    @patch("nlp.worker.httpx.Client")
    def test_post_disruption_to_api_failure(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_client.post.return_value.status_code = 500

        event = {"node_id": "PORT-001", "disruption_type": "strike", "severity": 0.85}
        success = post_disruption_to_api(event, "http://localhost:8000")
        assert success is False

    def test_run_worker_once_mode(self):
        # Verify run_worker executes 1 cycle and terminates cleanly without hanging
        run_worker(
            poll_interval=1,
            api_base_url="http://localhost:8000",
            once=True,
            use_static=True,
            use_redis=False,
            post_to_api=False,
        )
