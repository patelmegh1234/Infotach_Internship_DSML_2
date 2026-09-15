# GNN Training Data Export Specification (Issue #11)

**Author:** Shubhangi Mane (Data Pipeline Lead)  
**Recipient:** Megh Patel (Team Leader / GNN Lead)  
**Date:** Sep 3, 2026 (Updated: Sep 15, 2026)  
**Files Exported:**
- `data/processed/gnn_nodes.json` (215 nodes)
- `data/processed/gnn_edges.json` (550 edges)

---

## 1. Overview
This dataset exports the complete supply chain graph topology with simulated multi-hop historical disruptions, ground truth delay labels, and normalized node feature vectors aligned with the 12-dimensional GNN feature schema in `backend/gnn/features.py`.

---

## 2. Train / Validation Split
The dataset is stratified by `node_type` into an **80% / 20%** train/validation partition:
- **Total Nodes:** 215
- **Train Nodes:** 172 (80.0%) labeled `"split": "train"`
- **Validation Nodes:** 43 (20.0%) labeled `"split": "val"`

---

## 3. Node Schema (`gnn_nodes.json`)

Each node object in `gnn_nodes.json` adheres to the following specification:

```json
{
  "id": "SUP-001",
  "name": "Taiwan Advanced Lithography",
  "node_type": "Supplier",
  "tier": 1,
  "country": "Taiwan",
  "city": "Hsinchu",
  "risk_score": 0.42,
  "disruption_flag": false,
  "disruption_severity": 0.0,
  "historical_delay_avg": 2.4,
  "capacity_utilization": 0.88,
  "geo_importance_score": 0.95,
  "ground_truth_delay": 14.28,
  "split": "train",
  "feature_vector": [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.42, 0.0, 0.0, 0.0133, 0.88, 0.95]
}
```

### 12-Dimensional GNN Feature Vector Layout
The `feature_vector` is computed via `gnn.features.encode_node_features()`:

| Index | Feature | Dimension / Range | Description |
|---|---|---|---|
| `0-5` | `node_type` One-Hot | 6 dims (`{0, 1}`) | One-hot for `Supplier` (0), `Manufacturer` (1), `Port` (2), `DistributionCenter` (3), `Retailer` (4), `Product` (5) |
| `6` | `risk_score` | `[0.0, 1.0]` | Operational vulnerability score |
| `7` | `disruption_flag` | `{0.0, 1.0}` | Active disruption indicator (1.0 = disrupted) |
| `8` | `disruption_severity` | `[0.0, 1.0]` | Magnitude of disruption event |
| `9` | `historical_delay_avg` | `[0.0, 1.0]` | Normalized by `MAX_DELAY_DAYS = 180.0` |
| `10` | `capacity_utilization` | `[0.0, 1.0]` | Operating capacity ratio (high = bottleneck) |
| `11` | `geo_importance_score` | `[0.0, 1.0]` | Geographic and transit centrality |

---

## 4. Ground Truth Delay Formulation
`ground_truth_delay` represents the simulated empirical delay in days resulting from multi-hop downstream disruption propagation:
$$\text{Delay}_i = \max_{e \in \text{epicenters}} \left( \text{BaseDelay}_e \times \text{Severity}_e \times \text{Decay}(\text{hops}_{e \to i}) \times (0.8 + 0.4 \times \text{CapUtil}_i) \right) + 0.8 \times \text{HistDelay}_i + \epsilon_i$$
- **Decay schedule:** $[1.0, 0.75, 0.45, 0.25, 0.10]$ over $0$ to $4+$ BFS hops.
- **Range:** $0.5 \text{ days} \le \text{ground\_truth\_delay} \le 95.0 \text{ days}$.

---

## 5. Edge Schema (`gnn_edges.json`)

```json
{
  "source": "SUP-001",
  "target": "MFG-001",
  "relationship": "SUPPLIES_TO",
  "transport_mode": "air",
  "transit_days": 3,
  "capacity": 2500
}
```

---

## 6. How to Ingest for GNN Training
Megh can ingest this directly into PyTorch Geometric tensors using:
```python
import json
import torch
from gnn.features import build_pyg_graph

nodes = json.loads(Path("data/processed/gnn_nodes.json").read_text())
edges = json.loads(Path("data/processed/gnn_edges.json").read_text())

# Split into train and val graphs
train_nodes = [n for n in nodes if n["split"] == "train"]
val_nodes = [n for n in nodes if n["split"] == "val"]

train_graph = build_pyg_graph(train_nodes, edges)
val_graph = build_pyg_graph(val_nodes, edges)
```
