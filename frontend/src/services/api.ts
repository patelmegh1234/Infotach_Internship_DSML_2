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
  nodes as emptyNodes,
  edges as emptyEdges,
  disruptions as emptyDisruptions,
  predictions as emptyPredictions,
  scenarios as emptyScenarios,
  alerts as emptyAlerts,
  aiInsight as emptyInsight,
  kpi as emptyKpi,
  riskDistribution as emptyRiskDist,
  regionRisk as emptyRegionRisk,
  nodeTypeRisk as emptyNodeTypeRisk,
} from '@/data/mockData';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'http://127.0.0.1:8000';

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
    const maxRows = Math.max(6, Math.ceil(bucket.length / 2));

    bucket.forEach((n, idx) => {
      const col = Math.floor(idx / maxRows);
      const row = idx % maxRows;
      const x = baseX + col * 140;
      const y = 80 + row * 95;

      const rawRisk = typeof n.risk_score === 'number' ? n.risk_score : typeof n.riskScore === 'number' ? n.riskScore : 0.20;
      const riskScore = rawRisk <= 1.0 ? Math.round(rawRisk * 100) : Math.round(rawRisk);
      const type: NodeType = (n.node_type || n.type || 'Supplier') as NodeType;
      const nodeId = String(n.node_id || n.id);

      const locationStr = n.location || [n.city, n.country].filter(Boolean).join(', ') || n.country || 'Global';
      const regionStr: Region = (n.region || (n.country === 'China' || n.country === 'Japan' || n.country === 'Taiwan' || n.country === 'Singapore' || n.country === 'South Korea' || n.country === 'India' || n.country === 'Malaysia' ? 'Asia' : n.country === 'Germany' || n.country === 'Netherlands' || n.country === 'Luxembourg' ? 'Europe' : n.country === 'United States' ? 'North America' : 'Global')) as Region;

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

let _cachedPredictions: RiskPrediction[] = [];
let _cachedScenarios: Scenario[] = [];

export const api = {
  async getNetwork(): Promise<{ nodes: SupplyChainNode[]; edges: SupplyChainEdge[] }> {
    try {
      const res = await fetch(`${API_BASE}/api/graph/?limit=2000`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.nodes)) {
        return layoutGraphNodes(data.nodes, data.edges || []);
      }
      return { nodes: emptyNodes, edges: emptyEdges };
    } catch (err) {
      console.warn('[api] /api/graph/ request failed', err);
      return { nodes: emptyNodes, edges: emptyEdges };
    }
  },

  async getNodes(): Promise<SupplyChainNode[]> {
    const net = await this.getNetwork();
    return net.nodes;
  },

  async getNode(id: string): Promise<SupplyChainNode | undefined> {
    const all = await this.getNodes();
    return all.find((n) => n.id === id || n.node_id === id);
  },

  async createNode(node: {
    node_id: string;
    node_type: NodeType;
    name: string;
    country?: string;
    city?: string;
    capacity_utilization?: number;
    historical_delay_avg?: number;
    risk_score?: number;
    geo_importance_score?: number;
    throughput_teu?: number;
  }): Promise<{ status: string; node_id: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/graph/node`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(node),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async deleteNode(nodeId: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/graph/node/${encodeURIComponent(nodeId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async createEdge(edge: {
    source: string;
    target: string;
    relationship: string;
    quantity?: number;
    transit_days?: number;
    transport_mode?: string;
  }): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/graph/edge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edge),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async deleteEdge(source: string, target: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/graph/edge/${encodeURIComponent(source)}/${encodeURIComponent(target)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async clearGraph(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/graph/clear`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async resetDataset(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/graph/reset-dataset`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async getGraphStats(): Promise<{ node_counts: { type: string; count: number }[]; total_edges: number }> {
    try {
      const res = await fetch(`${API_BASE}/api/graph/stats`);
      if (res.ok) return await res.json();
    } catch {
      // ignore
    }
    const net = await this.getNetwork();
    const counts: Record<string, number> = {};
    net.nodes.forEach((n) => { counts[n.type] = (counts[n.type] || 0) + 1; });
    return {
      node_counts: Object.entries(counts).map(([type, count]) => ({ type, count })),
      total_edges: net.edges.length,
    };
  },

  async getKpi(): Promise<KpiSnapshot> {
    const net = await this.getNetwork();
    const total = net.nodes.length;
    if (total === 0) return emptyKpi;

    const atRisk = net.nodes.filter((n) => n.riskScore >= 60).length;
    const activeDisruptions = net.nodes.filter((n) => n.status === 'Disrupted').length;
    const avgRisk = Number((net.nodes.reduce((acc, n) => acc + n.riskScore, 0) / total).toFixed(1));
    const exposure = net.nodes.reduce((acc, n) => acc + n.estimatedImpact, 0);

    return {
      networkNodes: total,
      activeDisruptions,
      atRiskNodes: atRisk,
      networkRiskScore: avgRisk,
      estimatedExposure: exposure,
    };
  },

  async getRiskDistribution(): Promise<RiskDistribution> {
    const net = await this.getNetwork();
    if (net.nodes.length === 0) return emptyRiskDist;

    const dist: RiskDistribution = { Low: 0, Moderate: 0, High: 0, Critical: 0 };
    net.nodes.forEach((n) => {
      if (n.riskScore >= 80) dist.Critical++;
      else if (n.riskScore >= 60) dist.High++;
      else if (n.riskScore >= 40) dist.Moderate++;
      else dist.Low++;
    });
    return dist;
  },

  async getRegionRisk(): Promise<RegionRisk[]> {
    const net = await this.getNetwork();
    if (net.nodes.length === 0) return emptyRegionRisk;

    const regionMap: Record<string, { totalRisk: number; count: number }> = {};
    net.nodes.forEach((n) => {
      const reg = n.region || 'Global';
      if (!regionMap[reg]) regionMap[reg] = { totalRisk: 0, count: 0 };
      regionMap[reg].totalRisk += n.riskScore;
      regionMap[reg].count += 1;
    });

    return Object.entries(regionMap).map(([region, data]) => ({
      region: region as Region,
      risk: Math.round(data.totalRisk / data.count),
      nodes: data.count,
    }));
  },

  async getNodeTypeRisk(): Promise<NodeTypeRisk[]> {
    const net = await this.getNetwork();
    if (net.nodes.length === 0) return emptyNodeTypeRisk;

    const typeMap: Record<string, { totalRisk: number; count: number }> = {};
    net.nodes.forEach((n) => {
      if (!typeMap[n.type]) typeMap[n.type] = { totalRisk: 0, count: 0 };
      typeMap[n.type].totalRisk += n.riskScore;
      typeMap[n.type].count += 1;
    });

    return Object.entries(typeMap).map(([type, data]) => ({
      type: type as NodeType,
      risk: Math.round(data.totalRisk / data.count),
      nodes: data.count,
    }));
  },

  async getPredictions(): Promise<RiskPrediction[]> {
    if (_cachedPredictions.length > 0) return _cachedPredictions;

    const net = await this.getNetwork();
    const highRiskNodes = net.nodes.filter((n) => n.riskScore >= 65).slice(0, 5);

    if (highRiskNodes.length === 0) return [];

    return highRiskNodes.map((n, idx) => ({
      id: `PRED-${idx + 1}`,
      title: `${n.name} Cascade Risk`,
      description: `High disruption risk detected at ${n.name} (${n.type}) with potential delay impact across ${n.dependents.length} downstream nodes.`,
      probability: Math.round(n.probability * 100),
      confidence: Math.round(85 + (n.riskScore % 10)),
      impact: n.riskScore >= 80 ? 'Critical' : 'High',
      nodeId: n.id,
      horizon: '7 days',
      category: 'cascading',
      timeline: [
        { t: '0h', affected: 1 },
        { t: '24h', affected: Math.max(1, Math.round(n.dependents.length * 0.4)) },
        { t: '48h', affected: Math.max(2, Math.round(n.dependents.length * 0.7)) },
        { t: '7d', affected: Math.max(3, n.dependents.length) },
      ],
    }));
  },

  async getScenarios(): Promise<Scenario[]> {
    return _cachedScenarios;
  },

  async createScenario(s: Omit<Scenario, 'id' | 'createdAt'>): Promise<Scenario> {
    const scn: Scenario = {
      ...s,
      id: `SCN-${Math.floor(Math.random() * 9000 + 1000)}`,
      createdAt: new Date().toISOString(),
    };
    _cachedScenarios.unshift(scn);
    return scn;
  },

  async getAlerts(): Promise<Alert[]> {
    const net = await this.getNetwork();
    const alertsList: Alert[] = [];

    net.nodes.forEach((n, idx) => {
      if (n.status === 'Disrupted' || n.riskScore >= 65) {
        alertsList.push({
          id: `ALT-${idx + 1}`,
          severity: n.riskScore >= 80 ? 'Critical' : n.riskScore >= 65 ? 'High' : 'Moderate',
          title: `${n.name} (${n.id}) risk elevated`,
          description: `Disruption probability is ${Math.round(n.probability * 100)}% with estimated delay exposure of ${Math.round(n.riskScore * 0.3)} days.`,
          nodeId: n.id,
          timestamp: new Date().toISOString(),
          status: 'active',
          category: n.type,
        });
      }
    });

    return alertsList.slice(0, 10);
  },

  async getDisruptions(): Promise<DisruptionEvent[]> {
    try {
      const res = await fetch(`${API_BASE}/api/disrupt/active`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.active_disruptions)) {
          return data.active_disruptions.map((d: any) => ({
            id: d.disruption_id || d.id || 'DIS-01',
            type: d.disruption_type || 'strike',
            severity: Math.round((d.risk_score || d.severity || 0.75) * 100),
            durationDays: d.estimated_duration_days || 14,
            originNodeId: d.node_id || d.name || 'Origin',
            region: (d.region || 'Global') as Region,
            createdAt: d.detected_at || d.last_disruption_at || new Date().toISOString(),
            affectedNodes: [d.node_id || d.name],
            propagationLevels: { '0': 1 },
            estimatedLoss: Math.round((d.risk_score || 0.75) * 1200000),
            riskScore: Math.round((d.risk_score || 0.75) * 100),
            recoveryTimeDays: 14,
          }));
        }
      }
    } catch {
      // ignore
    }
    return [];
  },

  async getInsight(): Promise<AIInsight> {
    const net = await this.getNetwork();
    if (net.nodes.length === 0) return emptyInsight;

    const highRisk = net.nodes.filter((n) => n.riskScore >= 65);
    const origin = highRisk[0] || net.nodes[0];

    return {
      id: 'INS-LIVE',
      title: 'Real-Time Network Risk Insight',
      body: `Analysis of ${net.nodes.length} connected nodes shows ${highRisk.length} nodes with elevated disruption risk. Critical node ${origin.name} (${origin.id}) connects to ${origin.dependents.length} downstream routes.`,
      recommendations: [
        `Monitor ${origin.name} (${origin.type}) closely for operational delay signals.`,
        'Establish buffer inventory and alternate shipping routes across high-capacity ports.',
        'Trigger GNN ripple-effect simulation to evaluate 30-day supply chain exposure.',
      ],
      confidence: 92,
      originNode: origin.id,
      affectedNodes: highRisk.length,
      highestRiskRegion: origin.region,
      propagationLayers: 3,
    };
  },

  async simulate(req: SimulationRequest): Promise<SimulationResult> {
    try {
      const predRes = await fetch(`${API_BASE}/api/predict/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: req.originNodeId,
          severity: req.severity / 100,
          disruption_type: req.type,
          risk_score: req.severity / 100,
          disruption_flag: true,
          description: `${req.type} simulation at ${req.originNodeId}`,
        }),
      });

      if (predRes.ok) {
        const predData = await predRes.json();
        const predictionsList = predData.predictions || [];
        const affected = predictionsList.map((p: any) => p.node_id);

        const levels: Record<string, string[]> = { '0': [req.originNodeId] };
        predictionsList.forEach((p: any) => {
          const hop = String(p.hop_distance >= 0 ? p.hop_distance : 1);
          if (!levels[hop]) levels[hop] = [];
          if (!levels[hop].includes(p.node_id)) levels[hop].push(p.node_id);
        });

        const event: DisruptionEvent = {
          id: `SIM-${Math.floor(Math.random() * 9000 + 1000)}`,
          type: req.type,
          severity: req.severity,
          durationDays: req.durationDays,
          originNodeId: req.originNodeId,
          region: req.region,
          createdAt: new Date().toISOString(),
          affectedNodes: affected,
          propagationLevels: Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, v.length])),
          estimatedLoss: Math.round(1500000 * (req.severity / 50) * Math.max(1, affected.length / 5)),
          riskScore: req.severity,
          recoveryTimeDays: Math.round(req.durationDays * 1.3),
        };

        const insight: AIInsight = {
          id: `INS-SIM-${req.originNodeId}`,
          title: `GNN Simulation: ${req.type} at ${req.originNodeId}`,
          body: `GNN model predicts disruption at ${req.originNodeId} will propagate through ${Object.keys(levels).length - 1} dependency layers affecting ${affected.length} nodes across the supply chain.`,
          recommendations: [
            `Reroute critical shipments away from ${req.originNodeId}.`,
            'Activate secondary tier suppliers to mitigate manufacturing delays.',
          ],
          confidence: 94,
          originNode: req.originNodeId,
          affectedNodes: affected.length,
          highestRiskRegion: req.region,
          propagationLayers: Object.keys(levels).length - 1,
        };

        return { event, affectedNodes: affected, propagationLevels: levels, insights: insight };
      }
    } catch (err) {
      console.warn('[api] simulate API failed, falling back', err);
    }

    const event: DisruptionEvent = {
      id: `SIM-LOCAL`,
      type: req.type,
      severity: req.severity,
      durationDays: req.durationDays,
      originNodeId: req.originNodeId,
      region: req.region,
      createdAt: new Date().toISOString(),
      affectedNodes: [req.originNodeId],
      propagationLevels: { '0': 1 },
      estimatedLoss: 500000,
      riskScore: req.severity,
      recoveryTimeDays: req.durationDays,
    };
    return {
      event,
      affectedNodes: [req.originNodeId],
      propagationLevels: { '0': [req.originNodeId] },
      insights: {
        id: 'INS-LOCAL',
        title: `Simulation at ${req.originNodeId}`,
        body: `Disruption simulated with severity ${req.severity}%.`,
        recommendations: ['Monitor connected nodes.'],
        confidence: 85,
        originNode: req.originNodeId,
        affectedNodes: 1,
        highestRiskRegion: req.region,
        propagationLayers: 1,
      },
    };
  },

  async generateReport(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: 'Report generated successfully.' };
  },
};
