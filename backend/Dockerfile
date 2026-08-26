# ──────────────────────────────────────────────────────────────
# AtmoGraph — Backend Dockerfile
# FastAPI + GNN Inference + NLP Worker
#
# Build context must be the REPO ROOT so requirements.txt is
# accessible. Set in docker-compose.yml:
#   build:
#     context: .          ← repo root
#     dockerfile: backend/Dockerfile
# ──────────────────────────────────────────────────────────────

FROM python:3.11-slim AS base

# ── System dependencies ──────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies (cached layer) ──────────────────────
# Copy requirements first so Docker cache is invalidated only
# when requirements.txt actually changes.
COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        torch==2.3.0 \
        --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir \
        torch-geometric==2.5.3 && \
    pip install --no-cache-dir -r requirements.txt

# ── spaCy model (NLP fallback) ───────────────────────────────
RUN python -m spacy download en_core_web_sm

# ── Application code ─────────────────────────────────────────
# Copy backend source into /app so that:
#   api.main:app  →  /app/api/main.py
#   nlp.worker    →  /app/nlp/worker.py
COPY backend/ .

# ── Model directory ──────────────────────────────────────────
RUN mkdir -p /app/models

# ── Health-check ─────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# ── Default command (overridden by docker-compose per service)
EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
