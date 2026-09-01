import type {
  AIInsight,
  Alert,
  DisruptionEvent,
  KpiSnapshot,
  NodeTypeRisk,
  RegionRisk,
  RiskDistribution,
  RiskPrediction,
  Scenario,
  SupplyChainEdge,
  SupplyChainNode,
} from '@/types';

export const nodeTypes: SupplyChainNode['type'][] = [
  'Supplier',
  'Manufacturer',
  'Port',
  'DistributionCenter',
  'Retailer',
  'Product',
];

const makeNode = (
  node: Omit<SupplyChainNode, 'dependencies' | 'dependents' | 'connectedSuppliers' | 'connectedCustomers'>,
): SupplyChainNode => ({
  ...node,
  dependencies: [],
  dependents: [],
  connectedSuppliers: [],
  connectedCustomers: [],
});

export const nodes: SupplyChainNode[] = [
  makeNode({ id: 'SUP-201', name: 'Shenzhen Components', type: 'Supplier', region: 'Asia', location: 'Shenzhen, China', riskScore: 72, probability: 0.72, impact: 82, status: 'At Risk', estimatedImpact: 980000, tier: 1, x: 60, y: 120 }),
  makeNode({ id: 'SUP-202', name: 'Tokyo Battery Materials', type: 'Supplier', region: 'Asia', location: 'Tokyo, Japan', riskScore: 58, probability: 0.55, impact: 70, status: 'Operational', estimatedImpact: 720000, tier: 1, x: 60, y: 280 }),
  makeNode({ id: 'SUP-204', name: 'Taipei Semiconductor Supply', type: 'Supplier', region: 'Asia', location: 'Taipei, Taiwan', riskScore: 85, probability: 0.84, impact: 94, status: 'At Risk', estimatedImpact: 1850000, tier: 1, x: 60, y: 440 }),
  makeNode({ id: 'SUP-205', name: 'Busan Metals', type: 'Supplier', region: 'Asia', location: 'Busan, South Korea', riskScore: 49, probability: 0.42, impact: 61, status: 'Operational', estimatedImpact: 510000, tier: 1, x: 60, y: 600 }),
  makeNode({ id: 'FACT-201', name: 'Shenzhen Electronics Plant', type: 'Factory', region: 'Asia', location: 'Shenzhen, China', riskScore: 68, probability: 0.64, impact: 79, status: 'At Risk', estimatedImpact: 1250000, tier: 2, x: 280, y: 160 }),
  makeNode({ id: 'FACT-202', name: 'Taiwan Advanced Assembly', type: 'Factory', region: 'Asia', location: 'Hsinchu, Taiwan', riskScore: 77, probability: 0.76, impact: 88, status: 'At Risk', estimatedImpact: 1480000, tier: 2, x: 280, y: 420 }),
  makeNode({ id: 'FACT-203', name: 'Detroit Battery Factory', type: 'Factory', region: 'North America', location: 'Detroit, USA', riskScore: 62, probability: 0.59, impact: 72, status: 'Operational', estimatedImpact: 920000, tier: 2, x: 280, y: 650 }),
  makeNode({ id: 'WH-301', name: 'Singapore Regional Hub', type: 'Warehouse', region: 'Asia', location: 'Singapore', riskScore: 74, probability: 0.7, impact: 76, status: 'At Risk', estimatedImpact: 880000, tier: 3, x: 500, y: 180 }),
  makeNode({ id: 'WH-302', name: 'Rotterdam Distribution Hub', type: 'Warehouse', region: 'Europe', location: 'Rotterdam, Netherlands', riskScore: 41, probability: 0.35, impact: 60, status: 'Operational', estimatedImpact: 540000, tier: 3, x: 500, y: 430 }),
  makeNode({ id: 'WH-303', name: 'Dallas Fulfillment Hub', type: 'Warehouse', region: 'North America', location: 'Dallas, USA', riskScore: 46, probability: 0.38, impact: 55, status: 'Operational', estimatedImpact: 490000, tier: 3, x: 500, y: 650 }),
  makeNode({ id: 'PORT-401', name: 'Singapore Port', type: 'Port', region: 'Asia', location: 'Singapore', riskScore: 78, probability: 0.74, impact: 90, status: 'At Risk', estimatedImpact: 1320000, tier: 4, x: 720, y: 160 }),
  makeNode({ id: 'PORT-402', name: 'Rotterdam Port', type: 'Port', region: 'Europe', location: 'Rotterdam, Netherlands', riskScore: 45, probability: 0.31, impact: 58, status: 'Operational', estimatedImpact: 610000, tier: 4, x: 720, y: 390 }),
  makeNode({ id: 'PORT-102', name: 'Kaohsiung Port', type: 'Port', region: 'Asia', location: 'Kaohsiung, Taiwan', riskScore: 81, probability: 0.8, impact: 91, status: 'Disrupted', estimatedImpact: 1540000, tier: 4, x: 720, y: 580 }),
  makeNode({ id: 'DIST-501', name: 'APAC Distribution Network', type: 'Distributor', region: 'Asia', location: 'Hong Kong', riskScore: 67, probability: 0.61, impact: 73, status: 'At Risk', estimatedImpact: 970000, tier: 5, x: 940, y: 180 }),
  makeNode({ id: 'DIST-502', name: 'North America Distribution', type: 'Distributor', region: 'North America', location: 'Chicago, USA', riskScore: 52, probability: 0.44, impact: 63, status: 'Operational', estimatedImpact: 670000, tier: 5, x: 940, y: 430 }),
  makeNode({ id: 'MKT-601', name: 'East Asia Consumer Market', type: 'Market', region: 'Asia', location: 'Seoul, South Korea', riskScore: 61, probability: 0.52, impact: 68, status: 'Operational', estimatedImpact: 760000, tier: 6, x: 1160, y: 170 }),
  makeNode({ id: 'MKT-602', name: 'North America Consumer Market', type: 'Market', region: 'North America', location: 'New York, USA', riskScore: 57, probability: 0.48, impact: 66, status: 'Operational', estimatedImpact: 810000, tier: 6, x: 1160, y: 420 }),
  makeNode({ id: 'MKT-603', name: 'European Consumer Market', type: 'Market', region: 'Europe', location: 'Berlin, Germany', riskScore: 38, probability: 0.29, impact: 51, status: 'Operational', estimatedImpact: 430000, tier: 6, x: 1160, y: 620 }),
];

export const edges: SupplyChainEdge[] = [
  { id: 'E-001', source: 'SUP-201', target: 'FACT-201', kind: 'material', volume: 82, leadTime: 4 },
  { id: 'E-002', source: 'SUP-202', target: 'FACT-203', kind: 'material', volume: 66, leadTime: 7 },
  { id: 'E-003', source: 'SUP-204', target: 'FACT-201', kind: 'material', volume: 78, leadTime: 5 },
  { id: 'E-004', source: 'SUP-204', target: 'FACT-202', kind: 'material', volume: 91, leadTime: 3 },
  { id: 'E-005', source: 'SUP-205', target: 'FACT-202', kind: 'material', volume: 54, leadTime: 5 },
  { id: 'E-006', source: 'FACT-201', target: 'WH-301', kind: 'logistics', volume: 76, leadTime: 3 },
  { id: 'E-007', source: 'FACT-202', target: 'WH-301', kind: 'logistics', volume: 84, leadTime: 3 },
  { id: 'E-008', source: 'FACT-203', target: 'WH-303', kind: 'logistics', volume: 71, leadTime: 2 },
  { id: 'E-009', source: 'WH-301', target: 'PORT-401', kind: 'logistics', volume: 88, leadTime: 2 },
  { id: 'E-010', source: 'WH-301', target: 'PORT-102', kind: 'logistics', volume: 73, leadTime: 2 },
  { id: 'E-011', source: 'WH-302', target: 'PORT-402', kind: 'logistics', volume: 81, leadTime: 2 },
  { id: 'E-012', source: 'WH-303', target: 'DIST-502', kind: 'dependency', volume: 69, leadTime: 3 },
  { id: 'E-013', source: 'PORT-401', target: 'DIST-501', kind: 'logistics', volume: 85, leadTime: 4 },
  { id: 'E-014', source: 'PORT-102', target: 'DIST-501', kind: 'logistics', volume: 72, leadTime: 4 },
  { id: 'E-015', source: 'PORT-402', target: 'DIST-502', kind: 'logistics', volume: 64, leadTime: 5 },
  { id: 'E-016', source: 'DIST-501', target: 'MKT-601', kind: 'dependency', volume: 80, leadTime: 2 },
  { id: 'E-017', source: 'DIST-501', target: 'MKT-602', kind: 'dependency', volume: 61, leadTime: 5 },
  { id: 'E-018', source: 'DIST-502', target: 'MKT-602', kind: 'dependency', volume: 73, leadTime: 2 },
  { id: 'E-019', source: 'DIST-502', target: 'MKT-603', kind: 'dependency', volume: 58, leadTime: 4 },
];

const byId = new Map(nodes.map((n) => [n.id, n]));
for (const edge of edges) {
  const source = byId.get(edge.source);
  const target = byId.get(edge.target);
  if (!source || !target) continue;
  source.dependents.push(target.id);
  target.dependencies.push(source.id);
  if (source.type === 'Supplier') target.connectedSuppliers.push(source.id);
  if (target.type === 'Market') source.connectedCustomers.push(target.id);
}

export const kpi: KpiSnapshot = {
  networkNodes: nodes.length,
  activeDisruptions: 3,
  atRiskNodes: nodes.filter((n) => n.riskScore >= 60).length,
  networkRiskScore: 68.4,
  estimatedExposure: 12400000,
};

export const riskDistribution: RiskDistribution = { Low: 842, Moderate: 256, High: 143, Critical: 43 };
export const regionRisk: RegionRisk[] = [
  { region: 'Asia', risk: 74, nodes: 8 },
  { region: 'North America', risk: 62, nodes: 4 },
  { region: 'Europe', risk: 41, nodes: 3 },
  { region: 'South America', risk: 29, nodes: 0 },
  { region: 'Africa', risk: 26, nodes: 0 },
  { region: 'Middle East', risk: 35, nodes: 0 },
];
export const nodeTypeRisk: NodeTypeRisk[] = [
  { type: 'Supplier', risk: 58, nodes: 4 },
  { type: 'Factory', risk: 69, nodes: 3 },
  { type: 'Warehouse', risk: 54, nodes: 3 },
  { type: 'Port', risk: 64, nodes: 3 },
  { type: 'Distributor', risk: 59, nodes: 2 },
  { type: 'Market', risk: 52, nodes: 3 },
];

export const disruptions: DisruptionEvent[] = [
  {
    id: 'DIS-8401', type: 'Supplier Failure', severity: 85, durationDays: 21, originNodeId: 'SUP-204', region: 'Asia', createdAt: '2026-08-29T08:30:00.000Z',
    affectedNodes: ['SUP-204', 'FACT-201', 'FACT-202', 'WH-301', 'PORT-401', 'PORT-102', 'DIST-501', 'MKT-601', 'MKT-602'],
    propagationLevels: { '0': 1, '1': 2, '2': 1, '3': 2 }, estimatedLoss: 2850000, riskScore: 88, recoveryTimeDays: 29,
  },
  {
    id: 'DIS-8402', type: 'Port Closure', severity: 72, durationDays: 10, originNodeId: 'PORT-102', region: 'Asia', createdAt: '2026-08-28T14:10:00.000Z',
    affectedNodes: ['PORT-102', 'DIST-501', 'MKT-601', 'MKT-602'], propagationLevels: { '0': 1, '1': 1, '2': 2 }, estimatedLoss: 1260000, riskScore: 76, recoveryTimeDays: 14,
  },
  {
    id: 'DIS-8403', type: 'Transportation Delay', severity: 61, durationDays: 7, originNodeId: 'PORT-401', region: 'Asia', createdAt: '2026-08-27T11:45:00.000Z',
    affectedNodes: ['PORT-401', 'DIST-501', 'MKT-601'], propagationLevels: { '0': 1, '1': 1, '2': 1 }, estimatedLoss: 740000, riskScore: 65, recoveryTimeDays: 10,
  },
];

export const predictions: RiskPrediction[] = [
  {
    id: 'PRED-001', title: 'Taiwan Semiconductor Cascade Risk', description: 'High probability of downstream production disruption if semiconductor supply remains constrained.', probability: 84, confidence: 91, impact: 'Critical', nodeId: 'SUP-204', horizon: '7 days', category: 'cascading',
    timeline: [{ t: '0h', affected: 1 }, { t: '24h', affected: 3 }, { t: '48h', affected: 5 }, { t: '72h', affected: 7 }, { t: '7d', affected: 11 }],
  },
  {
    id: 'PRED-002', title: 'APAC Port Congestion', description: 'Port congestion is likely to increase lead times and create inventory pressure across the APAC corridor.', probability: 72, confidence: 86, impact: 'High', nodeId: 'PORT-401', horizon: '72 hours', category: 'disruption',
    timeline: [{ t: '0h', affected: 1 }, { t: '24h', affected: 2 }, { t: '48h', affected: 4 }, { t: '72h', affected: 6 }, { t: '7d', affected: 8 }],
  },
  {
    id: 'PRED-003', title: 'North America Recovery Window', description: 'Alternative routing through Detroit and Dallas provides a moderate recovery opportunity.', probability: 63, confidence: 82, impact: 'Medium', nodeId: 'FACT-203', horizon: '14 days', category: 'recovery',
    timeline: [{ t: '0h', affected: 8 }, { t: '24h', affected: 7 }, { t: '48h', affected: 6 }, { t: '72h', affected: 4 }, { t: '7d', affected: 2 }],
  },
];

export const scenarios: Scenario[] = [
  { id: 'SCN-1001', name: 'Critical Supplier Failure', description: 'Simulate a prolonged semiconductor supplier outage and measure downstream exposure.', type: 'Supplier Failure', severity: 85, durationDays: 21, originNode: 'SUP-204', region: 'Asia', nodesAffected: 11, estimatedLoss: 2850000, riskScore: 88, recoveryTimeDays: 29, createdAt: '2026-08-28T10:00:00.000Z' },
  { id: 'SCN-1002', name: 'Port Closure APAC', description: 'Evaluate the effect of a major port closure on APAC distribution and consumer markets.', type: 'Port Closure', severity: 72, durationDays: 10, originNode: 'PORT-102', region: 'Asia', nodesAffected: 7, estimatedLoss: 1260000, riskScore: 76, recoveryTimeDays: 14, createdAt: '2026-08-27T09:30:00.000Z' },
  { id: 'SCN-1003', name: 'Factory Shutdown', description: 'Assess production and logistics impacts caused by an unexpected factory shutdown.', type: 'Factory Shutdown', severity: 65, durationDays: 14, originNode: 'FACT-202', region: 'Asia', nodesAffected: 8, estimatedLoss: 1780000, riskScore: 71, recoveryTimeDays: 20, createdAt: '2026-08-26T15:20:00.000Z' },
];

export const alerts: Alert[] = [
  { id: 'ALT-001', severity: 'Critical', title: 'SUP-204 failure risk elevated', description: 'Semiconductor supply disruption probability has crossed the critical threshold.', nodeId: 'SUP-204', timestamp: '2026-08-29T09:15:00.000Z', status: 'active', category: 'Supplier' },
  { id: 'ALT-002', severity: 'High', title: 'Kaohsiung port disruption', description: 'Port throughput is below expected levels and may affect APAC distribution.', nodeId: 'PORT-102', timestamp: '2026-08-29T08:10:00.000Z', status: 'active', category: 'Logistics' },
  { id: 'ALT-003', severity: 'High', title: 'Singapore hub exposure', description: 'Warehouse dependency concentration has increased network risk.', nodeId: 'WH-301', timestamp: '2026-08-28T17:40:00.000Z', status: 'acknowledged', category: 'Warehouse' },
  { id: 'ALT-004', severity: 'Moderate', title: 'Detroit route capacity warning', description: 'Alternative routing remains available but has limited spare capacity.', nodeId: 'FACT-203', timestamp: '2026-08-28T12:25:00.000Z', status: 'active', category: 'Recovery' },
];

export const aiInsight: AIInsight = {
  id: 'INS-001', title: 'AI Network Insight',
  body: 'The network shows elevated concentration risk in the Asia-Pacific semiconductor corridor. A disruption at SUP-204 can cascade through factories, the Singapore and Kaohsiung logistics gateways, and downstream markets. Rerouting through Rotterdam and North American capacity can reduce secondary exposure.',
  recommendations: ['Diversify semiconductor sourcing across at least two regions.', 'Reserve contingency capacity at Rotterdam and North American distribution hubs.', 'Increase safety stock for high-impact components with long replenishment lead times.'],
  confidence: 91, affectedNodes: 9, highestRiskRegion: 'Asia', propagationLayers: 3,
};
