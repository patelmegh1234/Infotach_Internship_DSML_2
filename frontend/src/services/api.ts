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
    return tryFetch('/api/network', { nodes: mockNodes, edges: mockEdges });
  },
  async getNodes(): Promise<SupplyChainNode[]> {
    return tryFetch('/api/nodes', mockNodes);
  },
  async getNode(id: string): Promise<SupplyChainNode | undefined> {
    const all = await this.getNodes();
    return all.find((n) => n.id === id);
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
    const created: Scenario = {
      ...s,
      id: `SCN-${Math.floor(Math.random() * 9000 + 1000)}`,
      createdAt: new Date().toISOString(),
    };
    return tryFetch('/api/scenarios', created, 400);
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
    return tryFetch('/api/simulate', {} as SimulationResult, 900);
  },
  async generateReport(): Promise<{ ok: boolean; message: string }> {
    await sleep(700);
    return { ok: true, message: 'Report generated successfully.' };
  },
};
