import { X, MapPin, Activity, DollarSign, ArrowDownRight, ArrowUpRight, Boxes, Users } from 'lucide-react';
import type { SupplyChainNode } from '@/types';
import { RiskBadge } from '@/components/RiskBadge';
import { formatCurrency, riskLevelFromScore, classNames } from '@/utils/helpers';

const statusColor: Record<string, string> = {
  Operational: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'At Risk': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Disrupted: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  Offline: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

export function NodeDetailsPanel({
  node,
  onClose,
  onSelectNode,
  allNodes,
}: {
  node: SupplyChainNode;
  onClose: () => void;
  onSelectNode?: (id: string) => void;
  allNodes: SupplyChainNode[];
}) {
  const level = riskLevelFromScore(node.riskScore);
  const byId = (id: string) => allNodes.find((n) => n.id === id);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 p-5 border-b border-white/5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-accent-400">{node.id}</span>
            <RiskBadge level={level} />
          </div>
          <h2 className="mt-1.5 text-base font-semibold text-white leading-tight">{node.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5" /> {node.location}
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost -mt-1 -mr-1 px-2 text-slate-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Activity} label="Status" value={
            <span className={classNames('chip border', statusColor[node.status])}>{node.status}</span>
          } />
          <Stat icon={Boxes} label="Type" value={<span className="text-sm text-white">{node.type}</span>} />
          <Stat icon={DollarSign} label="Est. Impact" value={<span className="text-sm font-semibold text-white">{formatCurrency(node.estimatedImpact)}</span>} />
          <Stat icon={Activity} label="Risk Score" value={<span className="text-sm font-semibold" style={{ color: level === 'Critical' ? '#ef4444' : level === 'High' ? '#fb7185' : level === 'Moderate' ? '#f59e0b' : '#10b981' }}>{node.riskScore}/100</span>} />
        </div>

        <div>
          <SectionLabel>Probability & Impact</SectionLabel>
          <div className="space-y-3">
            <Bar label="Disruption Probability" value={node.probability * 100} max={100} suffix="%" />
            <Bar label="Blast Radius Impact" value={node.impact} max={100} suffix="/100" />
          </div>
        </div>

        <RelationList
          title="Dependencies (upstream)"
          icon={ArrowUpRight}
          ids={node.dependencies}
          byId={byId}
          onSelectNode={onSelectNode}
          emptyText="No upstream dependencies — origin source."
        />
        <RelationList
          title="Dependents (downstream)"
          icon={ArrowDownRight}
          ids={node.dependents}
          byId={byId}
          onSelectNode={onSelectNode}
          emptyText="No downstream dependents — terminal market node."
        />
        <RelationList
          title="Connected Suppliers"
          icon={Users}
          ids={node.connectedSuppliers}
          byId={byId}
          onSelectNode={onSelectNode}
          emptyText="None"
        />
        <RelationList
          title="Connected Customers"
          icon={Users}
          ids={node.connectedCustomers}
          byId={byId}
          onSelectNode={onSelectNode}
          emptyText="None"
        />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-ink-900/50 border border-white/5 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1.5">{value}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">{children}</p>;
}

function Bar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 80 ? '#ef4444' : pct >= 60 ? '#fb7185' : pct >= 40 ? '#f59e0b' : '#10b981';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{Math.round(value)}{suffix}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function RelationList({
  title,
  icon: Icon,
  ids,
  byId,
  onSelectNode,
  emptyText,
}: {
  title: string;
  icon: typeof Users;
  ids: string[];
  byId: (id: string) => SupplyChainNode | undefined;
  onSelectNode?: (id: string) => void;
  emptyText: string;
}) {
  return (
    <div>
      <SectionLabel>
        <span className="inline-flex items-center gap-1.5">
          <Icon className="h-3 w-3" /> {title} <span className="text-slate-600">({ids.length})</span>
        </span>
      </SectionLabel>
      {ids.length === 0 ? (
        <p className="text-xs text-slate-500 italic">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {ids.map((id) => {
            const n = byId(id);
            return (
              <button
                key={id}
                onClick={() => onSelectNode?.(id)}
                disabled={!onSelectNode}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-ink-900/40 border border-white/5 hover:bg-white/5 hover:border-white/10 transition text-left disabled:cursor-default"
              >
                <span className="font-mono text-xs text-accent-400">{id}</span>
                <span className="text-xs text-slate-400 truncate">{n?.name ?? '—'}</span>
                {n && <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ backgroundColor: n.riskScore >= 80 ? '#ef4444' : n.riskScore >= 60 ? '#fb7185' : n.riskScore >= 40 ? '#f59e0b' : '#10b981' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
