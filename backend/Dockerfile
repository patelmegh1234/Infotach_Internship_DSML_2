# AtmoGraph Backend — Docker Image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY ../requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir torch==2.3.0 --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir torch-geometric==2.5.3 \
    && pip install --no-cache-dir -r requirements.txt

# Install spaCy model
RUN python -m spacy download en_core_web_sm

# Copy application code
COPY . .

# Create model directory
RUN mkdir -p /app/models

# Expose API port
EXPOSE 8000

# Default command (overridden by docker-compose)
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
