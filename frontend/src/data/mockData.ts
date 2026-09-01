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

export const nodes: SupplyChainNode[] = [];
export const edges: SupplyChainEdge[] = [];

export const kpi: KpiSnapshot = {
  networkNodes: 0,
  activeDisruptions: 0,
  atRiskNodes: 0,
  networkRiskScore: 0,
  estimatedExposure: 0,
};

export const riskDistribution: RiskDistribution = {
  Low: 0,
  Moderate: 0,
  High: 0,
  Critical: 0,
};

export const regionRisk: RegionRisk[] = [
  { region: 'Asia', risk: 0, nodes: 0 },
  { region: 'North America', risk: 0, nodes: 0 },
  { region: 'Europe', risk: 0, nodes: 0 },
  { region: 'South America', risk: 0, nodes: 0 },
  { region: 'Africa', risk: 0, nodes: 0 },
  { region: 'Middle East', risk: 0, nodes: 0 },
];

export const nodeTypeRisk: NodeTypeRisk[] = [
  { type: 'Supplier', risk: 0, nodes: 0 },
  { type: 'Manufacturer', risk: 0, nodes: 0 },
  { type: 'Port', risk: 0, nodes: 0 },
  { type: 'DistributionCenter', risk: 0, nodes: 0 },
  { type: 'Retailer', risk: 0, nodes: 0 },
  { type: 'Product', risk: 0, nodes: 0 },
];

export const disruptions: DisruptionEvent[] = [];
export const predictions: RiskPrediction[] = [];
export const scenarios: Scenario[] = [];
export const alerts: Alert[] = [];

export const aiInsight: AIInsight = {
  id: 'INS-EMPTY',
  title: 'AI Network Insight',
  body: 'No supply chain disruption data loaded. Add nodes or run a simulation to see AI predictions and risk propagation analysis.',
  recommendations: [
    'Add supply chain suppliers, ports, and manufacturers via API or Swagger UI.',
    'Run a disruption simulation to view ripple-effect predictions.',
  ],
  confidence: 0,
  affectedNodes: 0,
  highestRiskRegion: 'Global',
  propagationLayers: 0,
};
