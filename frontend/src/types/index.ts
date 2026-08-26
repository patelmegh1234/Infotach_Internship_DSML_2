export type NodeType =
  | 'Supplier'
  | 'Factory'
  | 'Warehouse'
  | 'Port'
  | 'Distributor'
  | 'Market';

export type Region =
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'South America'
  | 'Africa'
  | 'Middle East'
  | 'Global';

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export type NodeStatus = 'Operational' | 'At Risk' | 'Disrupted' | 'Offline';

export interface SupplyChainNode {
  id: string;
  name: string;
  type: NodeType;
  region: Region;
  location: string;
  riskScore: number;
  probability: number;
  impact: number;
  status: NodeStatus;
  estimatedImpact: number;
  tier: number;
  dependencies: string[];
  dependents: string[];
  connectedSuppliers: string[];
  connectedCustomers: string[];
  x: number;
  y: number;
}

export interface SupplyChainEdge {
  id: string;
  source: string;
  target: string;
  kind: 'material' | 'logistics' | 'dependency';
  volume: number;
  leadTime: number;
}

export type DisruptionType =
  | 'Natural Disaster'
  | 'Factory Shutdown'
  | 'Port Closure'
  | 'Supplier Failure'
  | 'Transportation Delay'
  | 'Cyber Attack'
  | 'Geopolitical Event'
  | 'Raw Material Shortage';

export interface DisruptionEvent {
  id: string;
  type: DisruptionType;
  severity: number;
  durationDays: number;
  originNodeId: string;
  region: Region;
  createdAt: string;
  affectedNodes: string[];
  propagationLevels: Record<string, number>;
  estimatedLoss: number;
  riskScore: number;
  recoveryTimeDays: number;
}

export interface RiskPrediction {
  id: string;
  title: string;
  description: string;
  probability: number;
  confidence: number;
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  nodeId?: string;
  horizon: string;
  category: 'disruption' | 'cascading' | 'recovery' | 'opportunity';
  timeline: { t: string; affected: number }[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: DisruptionType;
  severity: number;
  durationDays: number;
  originNode: string;
  region: Region;
  nodesAffected: number;
  estimatedLoss: number;
  riskScore: number;
  recoveryTimeDays: number;
  createdAt: string;
}

export interface Alert {
  id: string;
  severity: RiskLevel;
  title: string;
  description: string;
  nodeId: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  category: string;
}

export interface AIInsight {
  id: string;
  title: string;
  body: string;
  recommendations: string[];
  confidence: number;
  originNode?: string;
  affectedNodes: number;
  highestRiskRegion: Region;
  propagationLayers: number;
}

export interface KpiSnapshot {
  networkNodes: number;
  activeDisruptions: number;
  atRiskNodes: number;
  networkRiskScore: number;
  estimatedExposure: number;
}

export interface RiskDistribution {
  Low: number;
  Moderate: number;
  High: number;
  Critical: number;
}

export interface RegionRisk {
  region: Region;
  risk: number;
  nodes: number;
}

export interface NodeTypeRisk {
  type: NodeType;
  risk: number;
  nodes: number;
}
