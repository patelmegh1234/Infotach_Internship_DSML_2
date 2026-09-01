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
        'relative group cursor-grab active:cursor-grabbing select-none transition-all duration-200',
        data.dimmed && 'opacity-25',
      )}
    >
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

      <div
        className={classNames(
          'flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border bg-ink-850/95 backdrop-blur-md transition-all duration-200 min-w-[110px] max-w-[150px] shadow-lg',
          selected ? 'border-accent-400 shadow-glow scale-105 ring-2 ring-accent-400/50' : 'border-white/10 hover:border-white/40 hover:shadow-xl',
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
          <Icon className="h-5 w-5" />
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
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: scoreHex(risk) }} />
          <span className="text-[10px] font-mono font-medium text-slate-300">{risk}/100</span>
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
