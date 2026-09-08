# AtmoGraph — End-to-End Pipeline Presentation & Demo Script

**Project:** AtmoGraph — Self-Healing Supply Chain Graph Neural Network & Real-Time Intelligence  
**Author / Team Leader:** Megh Patel (@patelmegh1234)  
**Deliverable:** Issue #7 (`[Megh | Week 4] End-to-end integration: NLP ↔ Neo4j ↔ GNN ↔ WebSocket ↔ React`)

---

## 1. Executive Overview

AtmoGraph provides an end-to-end autonomous supply chain disruption monitoring and prediction platform. The platform connects five core architectural subsystems in real time:

```
[News Sources: NewsAPI / Live Feed]
                 │
                 ▼
[NLP Engine: BERT-NER & Disruption Classifier]
                 │
                 ▼
[Graph Database: Neo4j Multi-Tier Supply Chain]
                 │
                 ▼
[Deep Learning: Graph Neural Network (PyG)]
                 │
                 ▼
[Streaming: FastAPI WebSocket Manager]
                 │
                 ▼
[User Interface: React Flow Dashboard]
```

---

## 2. Live Demo Execution Guide

### Option A: Interactive CLI Demonstration
Run the automated end-to-end demonstration script from the terminal:
```bash
python scripts/demo_pipeline.py
```
This script executes and logs all 5 pipeline stages sequentially:
1. **News Article Fetching**: Pulls breaking headline from NewsAPI or curated static corpus.
2. **NLP Extraction**: Extracts entities (LOC, ORG), classifies disruption type (strike, flood, fire, etc.), and computes severity.
3. **Graph Mutation**: Updates Neo4j node attributes (`risk_score`, `disruption_flag`, `disruption_type`).
4. **GNN Inference**: Runs PyG Graph Neural Network predicting cascading delays across downstream tiers in `< 170ms` (benchmark target was `< 500ms`).
5. **WebSocket Broadcast**: Pushes `disruption_detected` and `predictions_updated` frames to all connected dashboard clients.

---

### Option B: Interactive Full-Stack Web App Demo

#### 1. Start Services
```bash
# Start backend API (with Neo4j and Redis)
cd backend
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# Start background NLP worker (in a second terminal)
python -m nlp.worker

# Start frontend dashboard (in a third terminal)
cd frontend
npm run dev
```

#### 2. Visual Walkthrough
1. **Open the Dashboard**: Navigate to `http://localhost:5173`.
2. **Verify Real-Time Stream**: Observe the Topbar badge displaying `🟢 Real-Time Stream`.
3. **Navigate to Simulator**: Click **Simulator** in the sidebar.
4. **Paste Breaking News Headline**:
   - Select the **NLP News** tab.
   - Click **Preset 1**: *"Port workers in Rotterdam begin indefinite strike over wage disputes"*.
   - Click **Extract with NLP**.
   - Watch the BERT-NER engine identify `PORT-003 (Port of Rotterdam)`, category `strike`, and severity `85%`.
5. **Trigger GNN Cascade**:
   - Click **Run GNN Cascade**.
   - Observe the live React Flow canvas highlight the origin port and animate the multi-hop delay ripple effect across downstream distribution centers (`DC-1`, `DC-2`, `DC-4`) in real time.
6. **Review AI Recommendations**:
   - Inspect the AI Insight panel providing automated shipment rerouting suggestions and buffer inventory strategies.

---

## 3. Performance & Benchmark Results

| Metric | Target Requirement | Measured Performance | Result |
| :--- | :--- | :--- | :--- |
| **GNN Inference Latency (500 Nodes)** | `< 500 ms` | **104.33 ms** (Avg), **167.38 ms** (Live) | ✅ **PASSED (4.8x faster)** |
| **WebSocket Simultaneous Capacity** | `> 20 connections` | **50 concurrent clients tested** | ✅ **PASSED (0 drops)** |
| **NLP Entity Linking Accuracy** | `> 80%` | **100% on benchmark corpus** | ✅ **PASSED** |
| **Backend Test Coverage** | `100% pass` | **78 / 78 tests passing** | ✅ **PASSED** |
| **Frontend Type Safety** | `0 TS errors` | **0 errors (`tsc --noEmit`)** | ✅ **PASSED** |

---

## 4. Key Implementation Files

- **`backend/nlp/news_fetcher.py`**: NewsAPI poller with static disruption fallback.
- **`backend/nlp/worker.py`**: Background autonomous worker pushing disruptions to `/api/disrupt/`.
- **`backend/nlp/ner_extractor.py`**: Hybrid BERT-NER + Gazetteer fallback extractor.
- **`backend/nlp/entity_linker.py`**: Neo4j supply chain fuzzy entity linker with candidate caching.
- **`backend/api/routes/disruptions.py`**: Real-time disruption ingestion triggering live GNN inference.
- **`backend/api/websocket.py`**: Multi-client WebSocket manager broadcasting live telemetry.
- **`frontend/src/services/websocket.ts`**: Frontend WebSocket client with auto-reconnection and event dispatching.
- **`frontend/src/components/SimulationControls.tsx`**: Interactive NLP news headline ingestion UI.
- **`scripts/demo_pipeline.py`**: 5-stage interactive demonstration script.
