import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Factory, Warehouse, Anchor, Store, Building2, Truck, Package } from 'lucide-react';
import type { NodeType } from '@/types';
import { classNames, scoreHex } from '@/utils/helpers';

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

function GraphNodeInner({ data, selected }: NodeProps<GraphNodeData>) {
  const Icon = typeIcon[data.type] || Building2;
  const color = typeColor[data.type] || '#38bdf8';
  const risk = Math.round(data.riskScore);
  const ring = data.origin ? '#ef4444' : data.affected ? scoreHex(risk) : color;

  return (
    <div
      className={classNames(
        'relative transition-all duration-300',
        data.dimmed && 'opacity-25',
      )}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        className={classNames(
          'flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl border bg-ink-850/95 backdrop-blur-md transition-all duration-200 min-w-[96px] max-w-[140px]',
          selected ? 'border-accent-400 shadow-glow scale-105 ring-2 ring-accent-400/40' : 'border-white/10 hover:border-white/30',
          data.origin && 'border-red-500/60 shadow-[0_0_0_1px_rgba(239,68,68,0.4),0_0_24px_rgba(239,68,68,0.25)]',
          data.affected && !data.origin && 'border-white/20',
        )}
        style={{ boxShadow: data.affected ? `0 0 18px ${scoreHex(risk)}33` : undefined }}
      >
        <div
          className={classNames(
            'h-9 w-9 rounded-lg flex items-center justify-center transition-all',
            data.origin && 'animate-pulseGlow',
          )}
          style={{ backgroundColor: `${ring}1f`, color: ring, border: `1px solid ${ring}55` }}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <span className="text-[10px] font-mono font-medium text-slate-300 truncate max-w-[120px]" title={data.name || data.label}>
          {data.label}
        </span>
        {data.name && data.name !== data.label && (
          <span className="text-[9px] text-slate-400 truncate max-w-[120px]" title={data.name}>
            {data.name}
          </span>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: scoreHex(risk) }} />
          <span className="text-[9px] font-mono text-slate-400">{risk}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

export const GraphNode = memo(GraphNodeInner);
