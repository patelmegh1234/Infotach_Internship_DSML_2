"""
AtmoGraph — Application Configuration
======================================
Centralised settings loaded from environment variables or .env file.
All modules should import from here instead of using os.environ directly.
"""

import os
from functools import lru_cache
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application-wide settings loaded from environment variables."""

    # ── Application ──────────────────────────────────────
    app_name: str = "AtmoGraph"
    app_version: str = "1.0.0"
    environment: str = Field(default="development", env="ENVIRONMENT")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    debug: bool = Field(default=False, env="DEBUG")

    # ── Neo4j ────────────────────────────────────────────
    neo4j_uri: str = Field(default="bolt://localhost:7687", env="NEO4J_URI")
    neo4j_user: str = Field(default="neo4j", env="NEO4J_USER")
    neo4j_password: str = Field(default="atmograph2026", env="NEO4J_PASSWORD")
    neo4j_database: str = Field(default="neo4j", env="NEO4J_DATABASE")

    # ── Redis ────────────────────────────────────────────
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")

    # ── FastAPI ──────────────────────────────────────────
    api_host: str = Field(default="0.0.0.0", env="API_HOST")
    api_port: int = Field(default=8000, env="API_PORT")
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ],
        validation_alias="CORS_ORIGINS",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            v_clean = v.strip()
            if v_clean.startswith("[") and v_clean.endswith("]"):
                import json
                try:
                    return json.loads(v_clean)
                except Exception:
                    pass
            return [origin.strip() for origin in v_clean.split(",") if origin.strip()]
        return v


    # ── GNN Model ────────────────────────────────────────
    model_path: str = Field(default="./models/gnn_model.pt", env="MODEL_PATH")
    model_hidden_dim: int = Field(default=64, env="MODEL_HIDDEN_DIM")
    model_num_layers: int = Field(default=3, env="MODEL_NUM_LAYERS")
    model_dropout: float = Field(default=0.3, env="MODEL_DROPOUT")

    # ── NLP ──────────────────────────────────────────────
    huggingface_token: str = Field(default="", env="HUGGINGFACE_TOKEN")
    nlp_model: str = Field(default="dslim/bert-base-NER", env="NLP_MODEL")

    # ── News Ingestion ────────────────────────────────────
    news_api_key: str = Field(default="", env="NEWS_API_KEY")
    news_poll_interval: int = Field(default=300, env="NEWS_POLL_INTERVAL_SECONDS")

    model_config = {"env_file": ".env", "case_sensitive": False, "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings instance — call this everywhere instead of
    instantiating Settings() directly.

    Usage:
        from config.settings import get_settings
        settings = get_settings()
        print(settings.neo4j_uri)
    """
    return Settings()
