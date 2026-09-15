import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Factory, Warehouse, Anchor, Store, Building2, Truck, Package, AlertOctagon, Clock, ShieldCheck } from 'lucide-react';
import type { NodeType } from '@/types';
import { classNames } from '@/utils/helpers';

export interface GraphNodePredictionData {
  delay_days: number;
  predicted_delay_days?: number;
  confidence: number;
  risk_level: string;
  risk_score?: number;
  hop_distance?: number;
}

export interface GraphNodeData {
  label: string;
  name?: string;
  type: NodeType;
  riskScore: number;
  status: string;
  affected?: boolean;
  origin?: boolean;
  dimmed?: boolean;
  country?: string;
  capacity?: number;
  prediction?: GraphNodePredictionData;
  delay_days?: number;
  confidence?: number;
  risk_level?: string;
  hop_distance?: number;
  [key: string]: unknown;
}

const typeIcon: Record<NodeType, typeof Factory> = {
  Supplier: Building2,
  Manufacturer: Factory,
  Factory: Factory,
  Port: Anchor,
  DistributionCenter: Warehouse,
  Warehouse: Warehouse,
  Retailer: Store,
  Market: Store,
  Product: Package,
  Distributor: Truck,
};

const typeColor: Record<NodeType, string> = {
  Supplier: '#38bdf8',
  Manufacturer: '#a78bfa',
  Factory: '#a78bfa',
  Port: '#f59e0b',
  DistributionCenter: '#34d399',
  Warehouse: '#34d399',
  Retailer: '#fb7185',
  Market: '#fb7185',
  Product: '#06b6d4',
  Distributor: '#22d3ee',
};

// GNN Risk Color Codes (Issue #14)
export const RISK_LEVEL_COLORS = {
  critical: '#ef4444',  // bright red
  high: '#f97316',      // orange
  medium: '#eab308',    // yellow
  moderate: '#eab308',  // yellow
  low: '#22c55e',       // green
};

function getRiskLevelAndColor(data: GraphNodeData): { level: 'critical' | 'high' | 'medium' | 'low'; color: string; isCritical: boolean } {
  const rawLevel = (data.prediction?.risk_level || data.risk_level || '').toLowerCase();

  if (rawLevel === 'critical') return { level: 'critical', color: RISK_LEVEL_COLORS.critical, isCritical: true };
  if (rawLevel === 'high') return { level: 'high', color: RISK_LEVEL_COLORS.high, isCritical: false };
  if (rawLevel === 'medium' || rawLevel === 'moderate') return { level: 'medium', color: RISK_LEVEL_COLORS.medium, isCritical: false };
  if (rawLevel === 'low') return { level: 'low', color: RISK_LEVEL_COLORS.low, isCritical: false };

  // Fallback to numerical riskScore (0-100 or 0-1)
  const score = data.riskScore > 1 ? data.riskScore : data.riskScore * 100;
  if (score >= 75) return { level: 'critical', color: RISK_LEVEL_COLORS.critical, isCritical: true };
  if (score >= 55) return { level: 'high', color: RISK_LEVEL_COLORS.high, isCritical: false };
  if (score >= 35) return { level: 'medium', color: RISK_LEVEL_COLORS.medium, isCritical: false };
  return { level: 'low', color: RISK_LEVEL_COLORS.low, isCritical: false };
}

function GraphNodeInner({ data, selected }: NodeProps<GraphNodeData>) {
  const Icon = typeIcon[data.type] || Building2;
  const baseColor = typeColor[data.type] || '#38bdf8';
  const { level: riskLevel, color: riskColor, isCritical } = getRiskLevelAndColor(data);

  // Determine delay & confidence for tooltip and badge
  const pred = data.prediction;
  const delayDays = pred?.delay_days ?? pred?.predicted_delay_days ?? data.delay_days ?? (data.riskScore > 40 ? Math.round(data.riskScore * 0.25 * 10) / 10 : 0);
  const confidence = pred?.confidence ?? data.confidence ?? 0.88;
  const confPct = confidence > 1 ? Math.round(confidence) : Math.round(confidence * 100);
  const hopDistance = pred?.hop_distance ?? data.hop_distance;

  // Active ring highlight
  const ring = data.origin ? '#ef4444' : data.affected || pred ? riskColor : baseColor;

  return (
    <div
      className={classNames(
        'relative group cursor-grab active:cursor-grabbing select-none transition-all duration-200',
        data.dimmed && 'opacity-25',
      )}
    >
      {/* ── Hover Prediction Tooltip (Issue #14) ── */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-xl bg-ink-950/95 border border-white/20 shadow-2xl backdrop-blur-md opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 z-50 flex flex-col gap-1.5 text-left scale-95 group-hover:scale-100">
        <div className="flex items-center justify-between border-b border-white/10 pb-1">
          <span className="text-[11px] font-semibold text-white truncate max-w-[120px]">{data.name || data.label}</span>
          <span
            className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider"
            style={{ backgroundColor: `${riskColor}22`, color: riskColor, border: `1px solid ${riskColor}44` }}
          >
            {riskLevel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-400" />
            <span>Delay: <strong className="text-white font-mono">{delayDays > 0 ? `+${delayDays}d` : '0d'}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>Conf: <strong className="text-white font-mono">{confPct}%</strong></span>
          </div>
          {hopDistance !== undefined && hopDistance >= 0 && (
            <div className="col-span-2 text-[9px] text-slate-400">
              Wavefront: <strong className="text-slate-200">{hopDistance === 0 ? 'Origin Epicenter' : `${hopDistance} hop(s) downstream`}</strong>
            </div>
          )}
        </div>

        {data.country && (
          <div className="text-[9px] text-slate-400 truncate">
            Location: {data.country}
          </div>
        )}
      </div>

      {/* Target Handles (Incoming connections) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!w-2.5 !h-2.5 !bg-accent-400 !border-2 !border-ink-950 !rounded-full opacity-60 group-hover:opacity-100 transition-opacity hover:!scale-125 cursor-crosshair"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!w-2.5 !h-2.5 !bg-accent-400 !border-2 !border-ink-950 !rounded-full opacity-40 group-hover:opacity-100 transition-opacity hover:!scale-125 cursor-crosshair"
      />

      {/* Node Card */}
      <div
        className={classNames(
          'flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border bg-ink-850/95 backdrop-blur-md transition-all duration-200 min-w-[110px] max-w-[150px] shadow-lg',
          selected ? 'border-accent-400 shadow-glow scale-105 ring-2 ring-accent-400/50' : 'border-white/10 hover:border-white/40 hover:shadow-xl',
          data.origin && 'border-red-500/80 shadow-[0_0_0_1px_rgba(239,68,68,0.5),0_0_24px_rgba(239,68,68,0.35)]',
          isCritical && !data.origin && 'border-red-500/70 animate-pulse',
          data.affected && !data.origin && !isCritical && 'border-white/20',
        )}
        style={{
          boxShadow: isCritical
            ? '0 0 20px rgba(239, 68, 68, 0.45)'
            : data.affected || pred
            ? `0 0 16px ${riskColor}44`
            : undefined,
          borderColor: isCritical ? '#ef4444' : pred ? riskColor : undefined,
        }}
      >
        <div
          className={classNames(
            'h-9 w-9 rounded-lg flex items-center justify-center transition-all',
            (data.origin || isCritical) && 'animate-pulseGlow',
          )}
          style={{ backgroundColor: `${ring}1f`, color: ring, border: `1px solid ${ring}55` }}
        >
          {isCritical ? <AlertOctagon className="h-5 w-5 text-red-400" /> : <Icon className="h-5 w-5" />}
        </div>

        <span className="text-[11px] font-mono font-semibold text-slate-200 truncate max-w-[130px]" title={data.name || data.label}>
          {data.label}
        </span>
        {data.name && data.name !== data.label && (
          <span className="text-[10px] text-slate-400 truncate max-w-[130px]" title={data.name}>
            {data.name}
          </span>
        )}

        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={classNames('h-2 w-2 rounded-full', isCritical && 'animate-ping')}
            style={{ backgroundColor: riskColor }}
          />
          <span className="text-[10px] font-mono font-medium text-slate-300">
            {delayDays > 0 ? `+${delayDays}d` : `${Math.round(data.riskScore)}/100`}
          </span>
        </div>
      </div>

      {/* Source Handles (Outgoing connections) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-ink-950 !rounded-full opacity-60 group-hover:opacity-100 transition-opacity hover:!scale-125 cursor-crosshair"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-ink-950 !rounded-full opacity-40 group-hover:opacity-100 transition-opacity hover:!scale-125 cursor-crosshair"
      />
    </div>
  );
}

export const GraphNode = memo(GraphNodeInner);
