# 🌐 AtmoGraph — Supply Chain Ripple Effect Predictor

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch%20Geometric-2.x-red?logo=pytorch)](https://pytorch-geometric.readthedocs.io/)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.x-green?logo=neo4j)](https://neo4j.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-teal?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)](https://docker.com)

**An AI-powered, graph-based platform that predicts how localized global disruptions ripple across interconnected supply chains.**

</div>

---

## 🚀 Problem Statement

Traditional supply chain predictive models rely on **linear, isolated time-series data**. They fail to understand complex global networks and cannot predict how a localized crisis in one industry will affect entirely unrelated industries across the globe.

## 💡 Use Case

> A logistics director monitors the AtmoGraph dashboard. Live news breaks about a **port strike in Rotterdam**. The backend NLP engine ingests the news, maps it to the global supply chain graph, and the Graph Neural Network instantly updates the dashboard — predicting a **3-month delay in North American consumer electronics**, allowing the director to proactively reroute shipments.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ATMOGRAPH SYSTEM                            │
├─────────────┬───────────────┬──────────────────┬────────────────────┤
│  NLP Engine │  Neo4j Graph  │   GNN Predictor  │  React Dashboard   │
│  (spaCy /   │  Database     │  (PyTorch        │  (D3.js /          │
│  HuggingFace│  (Nodes &     │   Geometric)     │   React Flow)      │
│  NER)       │  Edges)       │                  │                    │
├─────────────┴───────────────┴──────────────────┴────────────────────┤
│                     FastAPI + WebSocket Layer                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
```
Live News Feed → NLP NER Engine → Neo4j Risk Update → GNN Prediction
     → FastAPI WebSocket → React Dashboard (Real-Time Visualization)
```

---

## 📁 Project Structure

```
atmograph/
├── backend/
│   ├── gnn/                    # PyTorch Geometric GNN models
│   │   ├── model.py            # GNN architecture (GraphSAGE/GAT)
│   │   ├── trainer.py          # Training loop & evaluation
│   │   ├── inference.py        # Real-time inference engine
│   │   └── features.py         # Node/edge feature engineering
│   ├── api/                    # FastAPI application
│   │   ├── main.py             # App entry point
│   │   ├── routes/             # API route handlers
│   │   └── websocket.py        # WebSocket manager
│   ├── nlp/                    # NLP disruption pipeline
│   │   ├── pipeline.py         # Main NLP pipeline
│   │   ├── ner_extractor.py    # Named Entity Recognition
│   │   └── entity_linker.py    # Entity → supply chain mapping
│   ├── database/               # Neo4j integration
│   │   ├── connector.py        # Neo4j driver & connection pool
│   │   ├── queries.py          # Cypher query library
│   │   └── schema.py           # Graph schema definitions
│   ├── config/
│   │   └── settings.py         # Environment & app config
│   └── tests/                  # Unit & integration tests
├── frontend/                   # React dashboard (Dimple)
├── data/
│   └── mock/                   # Mock supply chain datasets
├── scripts/                    # Utility scripts
├── docs/
│   └── architecture/           # Architecture diagrams & docs
├── docker-compose.yml          # Full stack orchestration
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variable template
└── README.md
```

---

## 👥 Team

| Member | Role | GitHub |
|--------|------|--------|
| **Megh Patel** | Team Leader — GNN, NLP Pipeline, API Integration | [@patelmegh1234](https://github.com/patelmegh1234) |
| **Shubhangi** | Neo4j Database, Graph Data & Entity Linking | [@Shubhangimane2005](https://github.com/Shubhangimane2005) |
| **Dimple** | React Dashboard & Interactive Visualization | [@Dimple-S1163](https://github.com/Dimple-S1163) |

---

## ⚙️ Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 18+

### 1. Clone & Setup
```bash
git clone https://github.com/patelmegh1234/Infotach_Internship_DSML_2.git
cd Infotach_Internship_DSML_2/atmograph
cp .env.example .env
```

### 2. Start Services
```bash
docker-compose up -d
```

### 3. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Access
- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Neo4j Browser**: http://localhost:7474

---

## 🔧 Key Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Graph DB | Neo4j 5.x | Store global supply chain network |
| NLP | spaCy + HuggingFace | Extract disruption entities from news |
| GNN | PyTorch Geometric | Predict ripple-effect delays |
| API | FastAPI + WebSocket | Real-time data streaming |
| Frontend | React + D3.js/React Flow | Interactive network visualization |
| DevOps | Docker Compose | Service orchestration |

---

## 📊 Graph Schema

### Nodes
- **`Supplier`** — Raw material/component suppliers
- **`Manufacturer`** — Production facilities
- **`Port`** — Shipping ports (entry/exit points)
- **`DistributionCenter`** — Regional warehouses
- **`Retailer`** — End-point sellers
- **`Product`** — Product categories

### Edges
- **`SUPPLIES`** — Supplier → Manufacturer
- **`MANUFACTURES`** — Manufacturer → Product
- **`SHIPS_THROUGH`** — Manufacturer/Supplier → Port
- **`ROUTES_TO`** — Port → Port (shipping lanes)
- **`DISTRIBUTES`** — Port → Distribution Center
- **`SELLS`** — Retailer → Product

---

## 🤝 Contributing (Branch Strategy)

```
main              ← Production-ready code
├── Megh          ← Megh: GNN + NLP pipeline + architecture + integration
├── shubhangi/    ← Shubhangi: Neo4j + graph data + entity linking
└── dimple/       ← Dimple: React frontend
```

Each member creates PRs from their branch to `main`. All PRs require review before merging.

---

## 📄 License

This project is developed as part of the **InfoTach DSML Internship Program (2026)**.
