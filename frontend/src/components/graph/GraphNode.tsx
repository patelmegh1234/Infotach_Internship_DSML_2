import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Factory, Warehouse, Anchor, Store, Building2, Truck } from 'lucide-react';
import type { NodeType } from '@/types';
import { classNames, scoreHex } from '@/utils/helpers';

export interface GraphNodeData {
  label: string;
  type: NodeType;
  riskScore: number;
  status: string;
  affected?: boolean;
  origin?: boolean;
  dimmed?: boolean;
  [key: string]: unknown;
}

const typeIcon: Record<NodeType, typeof Factory> = {
  Supplier: Building2,
  Factory: Factory,
  Warehouse: Warehouse,
  Port: Anchor,
  Distributor: Truck,
  Market: Store,
};

const typeColor: Record<NodeType, string> = {
  Supplier: '#38bdf8',
  Factory: '#a78bfa',
  Warehouse: '#34d399',
  Port: '#f59e0b',
  Distributor: '#22d3ee',
  Market: '#fb7185',
};

function GraphNodeInner({ data, selected }: NodeProps<GraphNodeData>) {
  const Icon = typeIcon[data.type];
  const color = typeColor[data.type];
  const risk = data.riskScore;
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
          'flex flex-col items-center gap-1 px-2 py-2 rounded-xl border bg-ink-850/90 backdrop-blur-sm transition-all duration-300 min-w-[88px]',
          selected ? 'border-accent-400 shadow-glow scale-105' : 'border-white/10',
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
        <span className="text-[10px] font-mono text-slate-300">{data.label}</span>
        <div className="flex items-center gap-1">
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: scoreHex(risk) }} />
          <span className="text-[9px] text-slate-500">{risk}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

export const GraphNode = memo(GraphNodeInner);
