# AtmoGraph — System Architecture

## Overview

AtmoGraph is a graph-intelligence platform that predicts how a localized supply chain disruption
ripples across a global interconnected network using a Graph Neural Network (GNN).

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          LIVE NEWS / TEXT INPUT                          │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   NLP DISRUPTION INGESTION ENGINE                        │
│  spaCy / HuggingFace BERT-NER                                            │
│  - Named Entity Recognition (location, org, event type)                  │
│  - Severity scoring                                                      │
│  - Entity → supply chain node linking                                    │
│  Owner: Fathima                                                          │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │  POST /api/disrupt
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     NEO4J GRAPH DATABASE                                 │
│  Nodes: Supplier, Manufacturer, Port, DistributionCenter, Retailer       │
│  Edges: SUPPLIES, MANUFACTURES, SHIPS_THROUGH, ROUTES_TO, DISTRIBUTES   │
│  - Risk scores updated on each disruption event                          │
│  - APOC + GDS plugins for graph algorithms                               │
│  Owner: Shubhangi                                                        │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │  Neo4j Bolt → GNN Feature Extraction
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│               GNN RIPPLE-EFFECT PREDICTION ENGINE                        │
│  Architecture: GraphSAGE (3 layers) + GATv2 attention                    │
│  Task: Node regression → predict delay_days per node                     │
│  Input features (12-dim per node):                                       │
│    - node_type_onehot (6-dim), risk_score, disruption_flag,              │
│      disruption_severity, historical_delay_avg,                          │
│      capacity_utilization, geo_importance_score                          │
│  Output: delay_days [0–90], confidence [0–1] per node                   │
│  Owner: Megh                                                             │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │  FastAPI + WebSocket broadcast
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   FASTAPI + WEBSOCKET LAYER                              │
│  REST Endpoints:                                                         │
│    GET  /api/graph/          → fetch graph for dashboard render          │
│    POST /api/predict/        → trigger GNN inference                     │
│    POST /api/predict/timeline → 30/60/90-day predictions                │
│    POST /api/disrupt/        → ingest NLP disruption event               │
│    GET  /api/disrupt/active  → list active disruptions                   │
│    GET  /health/             → service health check                      │
│  WebSocket: ws://host/ws/{client_id}                                     │
│    ← predictions_updated: real-time GNN results                          │
│    ← disruption_detected: new NLP event alert                            │
│  Owner: Megh                                                             │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │  WebSocket / REST
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│               REACT DASHBOARD (Interactive Visualization)                │
│  - React Flow / D3.js supply chain network graph                        │
│  - At-risk node highlighting (red/amber/green by risk level)             │
│  - 30/60/90-day timeline slider                                          │
│  - Node detail panel (click any node)                                    │
│  - Live disruption alerts                                                │
│  Owner: Dimple                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

| Component | Technology | Owner | Port |
|-----------|-----------|-------|------|
| Graph Database | Neo4j 5.x + APOC + GDS | Shubhangi | 7474 (UI), 7687 (Bolt) |
| NLP Engine | spaCy + HuggingFace BERT-NER | Fathima | Background worker |
| GNN Model | PyTorch Geometric (GraphSAGE + GATv2) | Megh | In-process |
| API Layer | FastAPI + WebSocket | Megh | 8000 |
| Frontend | React + React Flow/D3.js | Dimple | 3000 |
| Cache/Queue | Redis | Megh (infra) | 6379 |

---

## GNN Node Feature Vector (12-dim)

```
Index  Feature                   Range
-----  -------                   -----
0-5    node_type_onehot          {0,1}  (6 classes)
6      risk_score                [0,1]
7      disruption_flag           {0,1}
8      disruption_severity       [0,1]
9      historical_delay_avg_norm [0,1]  (normalised to 180d max)
10     capacity_utilization      [0,1]
11     geo_importance_score      [0,1]
```

---

## Branch Strategy

```
main                  ← protected, PR required
├── megh/             ← GNN + FastAPI + architecture
├── shubhangi/        ← Neo4j schema + Cypher scripts + mock data
├── fathima/          ← NLP pipeline + NER + entity linking
└── dimple/           ← React dashboard + visualizations
```

## API Contract (for team coordination)

### POST /api/disrupt/ — called by Fathima's NLP engine
```json
{
  "disruption_id": "evt_20260820_001",
  "node_id": "port_rotterdam_001",
  "node_type": "Port",
  "disruption_type": "strike",
  "location": "Rotterdam, Netherlands",
  "severity": 0.85,
  "estimated_duration_days": 14,
  "source_headline": "Port workers in Rotterdam begin indefinite strike"
}
```

### WebSocket → React Dashboard message
```json
{
  "type": "predictions_updated",
  "disruption_id": "port_rotterdam_001",
  "predictions": [
    { "node_id": "mfg_taiwan_005", "delay_days": 23.5, "confidence": 0.87, "risk_level": "medium" },
    { "node_id": "dc_eastcoast_002", "delay_days": 67.2, "confidence": 0.91, "risk_level": "high" }
  ]
}
```

### GET /api/graph/ — called by Dimple's React app
```json
{
  "nodes": [{ "id": "...", "node_type": "Port", "name": "Rotterdam", "risk_score": 0.85 }],
  "edges": [{ "source": "...", "target": "...", "relationship": "ROUTES_TO" }],
  "total_nodes": 250,
  "total_edges": 1200
}
```
