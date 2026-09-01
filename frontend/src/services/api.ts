import type {
  SupplyChainNode,
  SupplyChainEdge,
  DisruptionEvent,
  RiskPrediction,
  Scenario,
  Alert,
  AIInsight,
  KpiSnapshot,
  RiskDistribution,
  RegionRisk,
  NodeTypeRisk,
  DisruptionType,
  Region,
  NodeType,
} from '@/types';
import {
  nodes as mockNodes,
  edges as mockEdges,
  disruptions as mockDisruptions,
  predictions as mockPredictions,
  scenarios as mockScenarios,
  alerts as mockAlerts,
  aiInsight as mockInsight,
  kpi as mockKpi,
  riskDistribution as mockRiskDist,
  regionRisk as mockRegionRisk,
  nodeTypeRisk as mockNodeTypeRisk,
} from '@/data/mockData';
import { sleep } from '@/utils/helpers';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const USE_BACKEND = Boolean(API_BASE);

async function tryFetch<T>(path: string, fallback: T, delay = 250): Promise<T> {
  if (!USE_BACKEND) {
    await sleep(delay);
    return fallback;
  }
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[api] ${path} failed, using mock fallback`, err);
    await sleep(delay);
    return fallback;
  }
}

export interface SimulationRequest {
  type: DisruptionType;
  severity: number;
  durationDays: number;
  originNodeId: string;
  region: Region;
}

export interface SimulationResult {
  event: DisruptionEvent;
  affectedNodes: string[];
  propagationLevels: Record<string, string[]>;
  insights: AIInsight;
}

/**
 * Layout helper: arranges nodes into multi-tiered columns by node type.
 */
function layoutGraphNodes(rawNodes: any[], rawEdges: any[]): { nodes: SupplyChainNode[]; edges: SupplyChainEdge[] } {
  const tierMap: Record<string, { tier: number; baseX: number }> = {
    Supplier: { tier: 0, baseX: 80 },
    Manufacturer: { tier: 1, baseX: 380 },
    Factory: { tier: 1, baseX: 380 },
    Product: { tier: 2, baseX: 680 },
    Port: { tier: 3, baseX: 980 },
    DistributionCenter: { tier: 4, baseX: 1280 },
    Warehouse: { tier: 4, baseX: 1280 },
    Retailer: { tier: 5, baseX: 1580 },
    Distributor: { tier: 5, baseX: 1580 },
    Market: { tier: 5, baseX: 1580 },
  };

  // Group nodes by tier
  const tierBuckets: Record<number, any[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };

  rawNodes.forEach((n) => {
    const type = n.node_type || n.type || 'Supplier';
    const tier = tierMap[type]?.tier ?? 0;
    tierBuckets[tier].push(n);
  });

  const parsedNodes: SupplyChainNode[] = [];
  const idToNode = new Map<string, SupplyChainNode>();

  Object.entries(tierBuckets).forEach(([tierStr, bucket]) => {
    const tier = Number(tierStr);
    const baseX = [80, 380, 680, 980, 1280, 1580][tier] ?? 100;
    const maxRows = Math.max(8, Math.ceil(bucket.length / 2));

    bucket.forEach((n, idx) => {
      const col = Math.floor(idx / maxRows);
      const row = idx % maxRows;
      const x = baseX + col * 140;
      const y = 80 + row * 95;

      const rawRisk = typeof n.risk_score === 'number' ? n.risk_score : typeof n.riskScore === 'number' ? n.riskScore : 0.25;
      const riskScore = rawRisk <= 1.0 ? Math.round(rawRisk * 100) : Math.round(rawRisk);
      const type: NodeType = (n.node_type || n.type || 'Supplier') as NodeType;
      const nodeId = String(n.node_id || n.id);

      const locationStr = n.location || [n.city, n.country].filter(Boolean).join(', ') || 'Global';
      const regionStr: Region = (n.region || (n.country === 'China' || n.country === 'Japan' || n.country === 'Taiwan' || n.country === 'Singapore' || n.country === 'South Korea' ? 'Asia' : n.country === 'Germany' || n.country === 'Netherlands' ? 'Europe' : n.country === 'United States' ? 'North America' : 'Global')) as Region;

      const nodeObj: SupplyChainNode = {
        id: nodeId,
        name: n.name || nodeId,
        type,
        region: regionStr,
        location: locationStr,
        riskScore,
        probability: n.probability ?? Number((riskScore / 100 * 0.85).toFixed(2)),
        impact: n.impact ?? Math.round((n.geo_importance_score ?? 0.5) * 100),
        status: n.disruption_flag ? 'Disrupted' : riskScore >= 70 ? 'At Risk' : 'Operational',
        estimatedImpact: n.estimatedImpact ?? Math.round(riskScore * 18000),
        tier,
        dependencies: [],
        dependents: [],
        connectedSuppliers: [],
        connectedCustomers: [],
        x,
        y,
        node_id: nodeId,
        node_type: type,
        city: n.city,
        country: n.country,
        capacity_utilization: n.capacity_utilization,
        historical_delay_avg: n.historical_delay_avg,
        geo_importance_score: n.geo_importance_score,
        throughput_teu: n.throughput_teu,
        disruption_flag: n.disruption_flag,
        disruption_severity: n.disruption_severity,
        disruption_type: n.disruption_type,
        predicted_delay_days: n.predicted_delay_days,
        lead_time_days: n.lead_time_days,
        storage_capacity: n.storage_capacity,
        annual_revenue: n.annual_revenue,
      };

      parsedNodes.push(nodeObj);
      idToNode.set(nodeId, nodeObj);
      if (n.id) idToNode.set(String(n.id), nodeObj);
    });
  });

  // Map and link edges
  const parsedEdges: SupplyChainEdge[] = rawEdges
    .map((e, idx) => {
      const sourceNode = idToNode.get(String(e.source));
      const targetNode = idToNode.get(String(e.target));
      const srcId = sourceNode ? sourceNode.id : String(e.source);
      const tgtId = targetNode ? targetNode.id : String(e.target);

      if (sourceNode && targetNode) {
        if (!sourceNode.dependents.includes(tgtId)) sourceNode.dependents.push(tgtId);
        if (!targetNode.dependencies.includes(srcId)) targetNode.dependencies.push(srcId);
        if (sourceNode.type === 'Supplier' && !targetNode.connectedSuppliers.includes(srcId)) {
          targetNode.connectedSuppliers.push(srcId);
        }
        if (targetNode.type === 'Retailer' || targetNode.type === 'Market') {
          if (!sourceNode.connectedCustomers.includes(tgtId)) sourceNode.connectedCustomers.push(tgtId);
        }
      }

      return {
        id: String(e.id || `edge-${srcId}-${tgtId}-${idx}`),
        source: srcId,
        target: tgtId,
        kind: (e.kind || 'material') as 'material' | 'logistics' | 'dependency',
        volume: e.volume ?? e.quantity ?? 100,
        leadTime: e.leadTime ?? e.transit_days ?? e.lead_time_days ?? 3,
        relationship: e.relationship,
        distance_km: e.distance_km,
        transit_days: e.transit_days,
        transport_mode: e.transport_mode,
        quantity: e.quantity,
      };
    })
    .filter((e) => idToNode.has(e.source) && idToNode.has(e.target));

  return { nodes: parsedNodes, edges: parsedEdges };
}

// Compute propagation from a node using BFS over edges, with risk decay per layer.
function computePropagation(originId: string, severity: number, durationDays: number): {
  affected: string[];
  levels: Record<string, string[]>;
} {
  const byId = new Map(mockNodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, string[]>();
  for (const e of mockEdges) {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    adjacency.get(e.source)!.push(e.target);
  }
  const visited = new Set<string>([originId]);
  const levels: Record<string, string[]> = { '0': [originId] };
  let frontier = [originId];
  for (let lvl = 1; lvl <= 4; lvl++) {
    const next: string[] = [];
    for (const id of frontier) {
      const neighbors = adjacency.get(id) ?? [];
      for (const nb of neighbors) {
        if (visited.has(nb)) continue;
        const node = byId.get(nb);
        // probability gate influenced by severity
        if (node && Math.random() < 0.55 + (severity / 100) * 0.4) {
          visited.add(nb);
          next.push(nb);
        }
      }
    }
    levels[String(lvl)] = next;
    frontier = next;
    if (next.length === 0) break;
  }
  return { affected: Array.from(visited), levels };
}

function lossFor(severity: number, durationDays: number, affectedCount: number): number {
  const base = 1_200_000;
  return Math.round(base * (severity / 50) * (durationDays / 14) * Math.max(1, affectedCount / 6));
}

export const api = {
  async getNetwork(): Promise<{ nodes: SupplyChainNode[]; edges: SupplyChainEdge[] }> {
    if (!USE_BACKEND) {
      await sleep(200);
      return { nodes: mockNodes, edges: mockEdges };
    }
    try {
      const res = await fetch(`${API_BASE}/api/graph/?limit=1000`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.nodes) && data.nodes.length > 0) {
        return layoutGraphNodes(data.nodes, data.edges || []);
      }
      return { nodes: mockNodes, edges: mockEdges };
    } catch (err) {
      console.warn('[api] /api/graph/ failed, using mock fallback', err);
      return { nodes: mockNodes, edges: mockEdges };
    }
  },
  async getNodes(): Promise<SupplyChainNode[]> {
    const net = await this.getNetwork();
    return net.nodes;
  },
  async getNode(id: string): Promise<SupplyChainNode | undefined> {
    const all = await this.getNodes();
    return all.find((n) => n.id === id);
  },
  async getGraphStats(): Promise<{ node_counts: { type: string; count: number }[]; total_edges: number }> {
    return tryFetch('/api/graph/stats', {
      node_counts: [
        { type: 'Supplier', count: 10 },
        { type: 'Manufacturer', count: 8 },
        { type: 'Port', count: 6 },
        { type: 'DistributionCenter', count: 7 },
        { type: 'Retailer', count: 9 },
        { type: 'Product', count: 5 },
      ],
      total_edges: 45,
    });
  },
  async getKpi(): Promise<KpiSnapshot> {
    return tryFetch('/api/kpi', mockKpi);
  },
  async getRiskDistribution(): Promise<RiskDistribution> {
    return tryFetch('/api/risks/distribution', mockRiskDist);
  },
  async getRegionRisk(): Promise<RegionRisk[]> {
    return tryFetch('/api/risks/regions', mockRegionRisk);
  },
  async getNodeTypeRisk(): Promise<NodeTypeRisk[]> {
    return tryFetch('/api/risks/node-types', mockNodeTypeRisk);
  },
  async getPredictions(): Promise<RiskPrediction[]> {
    return tryFetch('/api/predictions', mockPredictions);
  },
  async getScenarios(): Promise<Scenario[]> {
    return tryFetch('/api/scenarios', mockScenarios);
  },
  async createScenario(s: Omit<Scenario, 'id' | 'createdAt'>): Promise<Scenario> {
    if (!USE_BACKEND) {
      await sleep(400);
      return {
        ...s,
        id: `SCN-${Math.floor(Math.random() * 9000 + 1000)}`,
        createdAt: new Date().toISOString(),
      };
    }

    const res = await fetch(`${API_BASE}/api/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Scenario;
  },
  async getAlerts(): Promise<Alert[]> {
    return tryFetch('/api/alerts', mockAlerts);
  },
  async getDisruptions(): Promise<DisruptionEvent[]> {
    return tryFetch('/api/disruptions', mockDisruptions);
  },
  async getInsight(): Promise<AIInsight> {
    return tryFetch('/api/insight', mockInsight);
  },
  async simulate(req: SimulationRequest): Promise<SimulationResult> {
    if (!USE_BACKEND) {
      await sleep(900);
      const { affected, levels } = computePropagation(req.originNodeId, req.severity, req.durationDays);
      const event: DisruptionEvent = {
        id: `DIS-${Math.floor(Math.random() * 9000 + 1000)}`,
        type: req.type,
        severity: req.severity,
        durationDays: req.durationDays,
        originNodeId: req.originNodeId,
        region: req.region,
        createdAt: new Date().toISOString(),
        affectedNodes: affected,
        propagationLevels: Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, v.length])),
        estimatedLoss: lossFor(req.severity, req.durationDays, affected.length),
        riskScore: Math.min(100, Math.round(req.severity * 0.7 + affected.length * 1.4)),
        recoveryTimeDays: Math.round(req.durationDays * 1.4),
      };
      const insight: AIInsight = {
        ...mockInsight,
        originNode: req.originNodeId,
        affectedNodes: affected.length,
        propagationLayers: Object.keys(levels).length - 1,
        body: `Based on the current network structure, the ${req.type} originating at ${req.originNodeId} is expected to propagate through ${Object.keys(levels).length - 1} dependency layers and potentially affect ${affected.length} downstream nodes. Severity ${req.severity}/100 over ${req.durationDays} days.`,
      };
      return { event, affectedNodes: affected, propagationLevels: levels, insights: insight };
    }
    const res = await fetch(`${API_BASE}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SimulationResult;
  },
  async generateReport(): Promise<{ ok: boolean; message: string }> {
    await sleep(700);
    return { ok: true, message: 'Report generated successfully.' };
  },
};
