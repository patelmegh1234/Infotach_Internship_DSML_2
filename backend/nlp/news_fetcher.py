"""
AtmoGraph — News Fetcher
========================
Fetches news articles related to supply chain disruptions from NewsAPI,
or falls back to a realistic static test corpus.

Part of Issue #19 (Megh Patel — Team Leader)
"""

from __future__ import annotations

import hashlib
import time
from datetime import datetime, timezone
from typing import Any, Optional
import httpx
from loguru import logger

try:
    from config.settings import get_settings
except ImportError:
    from ..config.settings import get_settings


# ---------------------------------------------------------------------------
# Static Disruption News Corpus
# ---------------------------------------------------------------------------
# Curated realistic headlines mapping to nodes across all 6 tiers:
# Ports, Suppliers, Manufacturers, Distribution Centers, Retailers.
STATIC_DISRUPTION_CORPUS: list[dict[str, str]] = [
    {
        "title": "Port workers in Rotterdam begin indefinite strike over wage disputes",
        "description": "Dockworkers at Europe's largest seaport halted container unloading operations this morning, threatening substantial European supply chain bottlenecks.",
        "source": "Maritime Global News",
        "url": "https://news.example.com/rotterdam-strike-2026",
    },
    {
        "title": "Super Typhoon forces emergency shutdown of Port of Shanghai container terminals",
        "description": "Heavy gale-force winds and storm surges have suspended all vessel berthing and gantry crane operations at Shanghai's primary deep-water port.",
        "source": "Asia Logistics Weekly",
        "url": "https://news.example.com/shanghai-typhoon-closure",
    },
    {
        "title": "Magnitude 7.2 earthquake halts production at TSMC semiconductor fabrication facilities in Taiwan",
        "description": "Taiwan Semiconductor Manufacturing Co evacuated cleanrooms and reported structural inspection delays across advanced wafer fabs.",
        "source": "Tech Supply Chain Digest",
        "url": "https://news.example.com/tsmc-earthquake-fab-halt",
    },
    {
        "title": "Massive fire breaks out at BASF chemical synthesis facility in Ludwigshafen",
        "description": "German chemical giant BASF has declared force majeure on specialty polymers and precursors following a high-temperature industrial fire.",
        "source": "Chemical Industry Review",
        "url": "https://news.example.com/basf-plant-fire-ludwigshafen",
    },
    {
        "title": "Port of Singapore reports unprecedented container congestion with berthing delays exceeding 7 days",
        "description": "Vessel bunching from Red Sea reroutings has overwhelmed Singapore's container yards, creating cascading maritime delays worldwide.",
        "source": "Singapore Shipping Gazette",
        "url": "https://news.example.com/singapore-port-congestion-spike",
    },
    {
        "title": "Tata Steel halts rail freight dispatches amid widespread railway union strikes in eastern India",
        "description": "Logistics lines between raw material mines and manufacturing centers are paralyzed, delaying critical metallurgical shipments.",
        "source": "India Industrial Monitor",
        "url": "https://news.example.com/tata-steel-rail-disruption",
    },
    {
        "title": "Foxconn Zhengzhou assembly campus faces supply bottlenecks due to regional transport lockdown",
        "description": "Component shortages have forced the primary iPhone manufacturing campus to operate at 60% standard throughput.",
        "source": "Global Electronics Daily",
        "url": "https://news.example.com/foxconn-zhengzhou-bottleneck",
    },
    {
        "title": "New tariffs and export restrictions imposed on advanced electronics components from China",
        "description": "Trade authorities announced immediate 25% tariffs and compliance inspections, slowing customs clearance for tech suppliers.",
        "source": "International Trade Post",
        "url": "https://news.example.com/china-electronics-tariffs",
    },
    {
        "title": "Nippon Steel raw material terminal damaged by severe coastal storm in Tokyo Bay",
        "description": "Unloading cranes and conveyor belts sustained mechanical damage, delaying ore transfers to core blast furnaces.",
        "source": "Tokyo Business Press",
        "url": "https://news.example.com/nippon-steel-terminal-damage",
    },
    {
        "title": "Port of Los Angeles faces crane operator shortage triggering backlog of 40 container vessels",
        "description": "US West Coast maritime freight encounters sudden terminal delays with dwell times rising past 12 days.",
        "source": "Pacific Freight Journal",
        "url": "https://news.example.com/port-of-la-crane-shortage",
    },
    {
        "title": "ArcelorMittal idles European blast furnaces following sudden industrial energy blackouts",
        "description": "Grid stability issues in Western Europe caused an unplanned shutdown of heavy steelmaking equipment.",
        "source": "European Metal Markets",
        "url": "https://news.example.com/arcelormittal-furnace-idle",
    },
    {
        "title": "Severe flooding submerges roads and rail links near Port of Hamburg freight corridors",
        "description": "Elbe river overflow has submerged intermodal rail tracks, stranding thousands of import containers destined for Central Europe.",
        "source": "German Transport News",
        "url": "https://news.example.com/hamburg-port-flooding",
    },
    {
        "title": "Samsung Electronics semiconductor plant reports supply chain bottleneck for industrial gases",
        "description": "Disruptions in overseas neon and argon deliveries threaten continuous memory chip fabrication schedules in South Korea.",
        "source": "Korea Technology Times",
        "url": "https://news.example.com/samsung-chip-gas-shortage",
    },
    {
        "title": "Suez Canal navigation blocked after large container vessel grounds in southern channel",
        "description": "Tugboats are working to refloat the 20,000 TEU vessel as over 150 cargo ships drop anchor waiting for passage.",
        "source": "Global Marine Tracking",
        "url": "https://news.example.com/suez-canal-containership-grounded",
    },
    {
        "title": "Toyota Motor halts three automotive assembly lines in Japan due to supplier parts shortage",
        "description": "Tier-1 component delivery failure caused by sub-tier semiconductor shortages triggers assembly pause.",
        "source": "Automotive Logistics News",
        "url": "https://news.example.com/toyota-assembly-parts-shortage",
    },
    {
        "title": "Port of Ningbo suspends terminal operations as severe cyclone approaches eastern seaboard",
        "description": "Port authorities ordered all container ships to sea anchors as gale warnings reach red level across Zhejiang province.",
        "source": "China Maritime News",
        "url": "https://news.example.com/ningbo-port-cyclone-suspension",
    },
]


def _hash_text(text: str) -> str:
    """Generate deterministic MD5 hash of text for deduplication."""
    return hashlib.md5(text.strip().lower().encode("utf-8")).hexdigest()[:16]


class NewsFetcher:
    """
    Fetches news articles related to supply chain disruptions.

    - Connects to NewsAPI when an API key is available.
    - Gracefully falls back to a realistic static test corpus if NewsAPI
      is unconfigured, rate-limited, or offline.
    - Automatically deduplicates articles to prevent processing identical items.
    """

    NEWSAPI_ENDPOINT = "https://newsapi.org/v2/everything"
    DEFAULT_QUERY = (
        "supply chain OR port strike OR container shipping OR semiconductor shortage OR factory fire"
    )

    def __init__(
        self,
        api_key: Optional[str] = None,
        use_static_corpus: bool = False,
        query: str = DEFAULT_QUERY,
    ) -> None:
        settings = get_settings()
        self.api_key = api_key or settings.news_api_key or ""
        self.use_static_corpus = use_static_corpus or not bool(self.api_key)
        self.query = query
        self.seen_hashes: set[str] = set()
        self._static_pointer: int = 0

        logger.info(
            "NewsFetcher initialised (mode={}, has_api_key={})",
            "static_corpus" if self.use_static_corpus else "live_newsapi",
            bool(self.api_key),
        )

    def fetch_from_newsapi(self, limit: int = 10) -> list[dict[str, Any]]:
        """
        Fetch fresh articles from live NewsAPI.
        Returns empty list on failure, allowing graceful fallback.
        """
        if not self.api_key:
            logger.debug("No NewsAPI key configured; skipping live fetch.")
            return []

        params = {
            "q": self.query,
            "sortBy": "publishedAt",
            "language": "en",
            "pageSize": min(max(limit, 1), 50),
            "apiKey": self.api_key,
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(self.NEWSAPI_ENDPOINT, params=params)

                if resp.status_code == 200:
                    data = resp.json()
                    raw_articles = data.get("articles", [])
                    logger.info("NewsAPI returned {} articles.", len(raw_articles))

                    standardized = []
                    for art in raw_articles:
                        title = art.get("title") or ""
                        desc = art.get("description") or ""
                        text = f"{title}. {desc}".strip()
                        art_id = _hash_text(art.get("url") or title)

                        standardized.append({
                            "id": art_id,
                            "title": title,
                            "description": desc,
                            "content": art.get("content") or "",
                            "text": text,
                            "url": art.get("url") or "",
                            "source": (art.get("source") or {}).get("name", "NewsAPI"),
                            "published_at": art.get("publishedAt") or datetime.now(timezone.utc).isoformat(),
                            "is_live": True,
                        })
                    return standardized

                elif resp.status_code == 429:
                    logger.warning("NewsAPI rate limit exceeded (HTTP 429). Falling back to static corpus.")
                elif resp.status_code == 401:
                    logger.warning("NewsAPI unauthorized/invalid key (HTTP 401). Falling back to static corpus.")
                else:
                    logger.warning(
                        "NewsAPI request failed with HTTP {}: {}",
                        resp.status_code,
                        resp.text[:120],
                    )
        except Exception as exc:
            logger.warning("NewsAPI request encountered exception: {}", exc)

        return []

    def fetch_from_static_corpus(self, limit: int = 5) -> list[dict[str, Any]]:
        """
        Retrieve a batch of articles from the curated static corpus.
        Cycles through corpus in round-robin fashion.
        """
        total = len(STATIC_DISRUPTION_CORPUS)
        if total == 0:
            return []

        articles = []
        now_iso = datetime.now(timezone.utc).isoformat()

        for _ in range(limit):
            item = STATIC_DISRUPTION_CORPUS[self._static_pointer % total]
            self._static_pointer += 1

            title = item["title"]
            desc = item["description"]
            text = f"{title}. {desc}".strip()
            art_id = _hash_text(title)

            articles.append({
                "id": art_id,
                "title": title,
                "description": desc,
                "content": desc,
                "text": text,
                "url": item["url"],
                "source": item["source"],
                "published_at": now_iso,
                "is_live": False,
            })

        logger.info("Fetched {} article(s) from static disruption corpus.", len(articles))
        return articles

    def fetch_articles(
        self,
        limit: int = 5,
        deduplicate: bool = True,
    ) -> list[dict[str, Any]]:
        """
        Main entry point for polling news.

        1. If live NewsAPI key is set and not forced static, queries NewsAPI.
        2. If NewsAPI fails or returns 0 items, uses static corpus.
        3. Filters out already-seen articles if deduplicate=True.
        4. Updates seen_hashes and returns new items.
        """
        raw_items: list[dict[str, Any]] = []

        if not self.use_static_corpus and self.api_key:
            raw_items = self.fetch_from_newsapi(limit=limit)

        if not raw_items:
            # Fallback to static test corpus
            raw_items = self.fetch_from_static_corpus(limit=limit)

        if not deduplicate:
            return raw_items

        unseen_items: list[dict[str, Any]] = []
        for item in raw_items:
            art_hash = item["id"]
            if art_hash not in self.seen_hashes:
                self.seen_hashes.add(art_hash)
                unseen_items.append(item)

        # If all static articles have been seen, reset to allow cyclical background demoing
        if not unseen_items and raw_items and len(self.seen_hashes) >= len(STATIC_DISRUPTION_CORPUS):
            logger.info("All static corpus articles have been processed; resetting deduplication cache.")
            self.seen_hashes.clear()
            for item in raw_items:
                self.seen_hashes.add(item["id"])
                unseen_items.append(item)

        logger.info(
            "Returning {} new unseen article(s) (total processed hashes={}).",
            len(unseen_items),
            len(self.seen_hashes),
        )
        return unseen_items

    def reset_seen(self) -> None:
        """Clear the deduplication cache."""
        self.seen_hashes.clear()
        self._static_pointer = 0
        logger.info("NewsFetcher deduplication cache reset.")

    @staticmethod
    def get_static_corpus() -> list[dict[str, str]]:
        """Return the full static test corpus."""
        return list(STATIC_DISRUPTION_CORPUS)


if __name__ == "__main__":
    fetcher = NewsFetcher(use_static_corpus=True)
    articles = fetcher.fetch_articles(limit=3)
    for a in articles:
        print(f"[{a['source']}] {a['title']}")
        print(f"  -> Text: {a['text']}")
