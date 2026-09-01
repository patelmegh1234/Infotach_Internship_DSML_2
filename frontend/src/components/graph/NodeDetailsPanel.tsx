import { X, MapPin, Activity, DollarSign, ArrowDownRight, ArrowUpRight, Boxes, Users, Gauge, Clock, ShieldAlert, Trash2 } from 'lucide-react';
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
  onDeleteNode,
  onDeleteEdge,
  allNodes,
}: {
  node: SupplyChainNode;
  onClose: () => void;
  onSelectNode?: (id: string) => void;
  onDeleteNode?: (id: string) => void;
  onDeleteEdge?: (source: string, target: string) => void;
  allNodes: SupplyChainNode[];
}) {
  const level = riskLevelFromScore(node.riskScore);
  const byId = (id: string) => allNodes.find((n) => n.id === id || n.node_id === id);

  return (
    <div className="h-full flex flex-col bg-ink-900/95 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3 p-5 border-b border-white/5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-accent-400">{node.id}</span>
            <RiskBadge level={level} />
          </div>
          <h2 className="mt-1.5 text-base font-semibold text-white leading-tight">{node.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-slate-500" /> {node.location || 'Global'}
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost -mt-1 -mr-1 px-2 text-slate-400 hover:text-white transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat icon={Activity} label="Status" value={
            <span className={classNames('chip border text-[11px]', statusColor[node.status] || statusColor.Operational)}>{node.status}</span>
          } />
          <Stat icon={Boxes} label="Type" value={<span className="text-sm font-medium text-white">{node.type}</span>} />
          <Stat icon={DollarSign} label="Est. Impact" value={<span className="text-sm font-semibold text-white">{formatCurrency(node.estimatedImpact)}</span>} />
          <Stat icon={ShieldAlert} label="Risk Score" value={
            <span className="text-sm font-bold font-mono" style={{ color: level === 'Critical' ? '#ef4444' : level === 'High' ? '#fb7185' : level === 'Moderate' ? '#f59e0b' : '#10b981' }}>
              {node.riskScore}/100
            </span>
          } />
        </div>

        {/* Operational Metrics */}
        {(node.capacity_utilization !== undefined || node.historical_delay_avg !== undefined || node.geo_importance_score !== undefined || node.throughput_teu !== undefined) && (
          <div>
            <SectionLabel>Operational Metrics</SectionLabel>
            <div className="space-y-3 rounded-lg bg-ink-950/60 border border-white/5 p-3.5">
              {node.capacity_utilization !== undefined && (
                <Bar label="Capacity Utilization" value={node.capacity_utilization * 100} max={100} suffix="%" />
              )}
              {node.geo_importance_score !== undefined && (
                <Bar label="Geo Importance Score" value={node.geo_importance_score * 100} max={100} suffix="/100" />
              )}
              {node.historical_delay_avg !== undefined && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5"><Clock className="h-3 w-3 text-slate-500" /> Avg Historical Delay</span>
                  <span className="font-mono text-slate-200">{node.historical_delay_avg} days</span>
                </div>
              )}
              {node.throughput_teu !== undefined && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5"><Gauge className="h-3 w-3 text-slate-500" /> Annual Throughput</span>
                  <span className="font-mono text-slate-200">{node.throughput_teu.toLocaleString()} TEU</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <SectionLabel>Probability & Impact</SectionLabel>
          <div className="space-y-3 rounded-lg bg-ink-950/60 border border-white/5 p-3.5">
            <Bar label="Disruption Probability" value={node.probability * 100} max={100} suffix="%" />
            <Bar label="Blast Radius Impact" value={node.impact} max={100} suffix="/100" />
          </div>
        </div>

        <RelationList
          title="Dependencies (incoming)"
          icon={ArrowUpRight}
          ids={node.dependencies}
          currentNodeId={node.id}
          isIncoming={true}
          byId={byId}
          onSelectNode={onSelectNode}
          onDeleteEdge={onDeleteEdge}
          emptyText="No incoming routes."
        />
        <RelationList
          title="Dependents (outgoing)"
          icon={ArrowDownRight}
          ids={node.dependents}
          currentNodeId={node.id}
          isIncoming={false}
          byId={byId}
          onSelectNode={onSelectNode}
          onDeleteEdge={onDeleteEdge}
          emptyText="No outgoing routes."
        />
        {node.connectedSuppliers && node.connectedSuppliers.length > 0 && (
          <RelationList
            title="Connected Suppliers"
            icon={Users}
            ids={node.connectedSuppliers}
            currentNodeId={node.id}
            isIncoming={true}
            byId={byId}
            onSelectNode={onSelectNode}
            onDeleteEdge={onDeleteEdge}
            emptyText="None"
          />
        )}

        {/* Delete Node Action */}
        {onDeleteNode && (
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete node "${node.name}" (${node.id}) and all its routes?`)) {
                  onDeleteNode(node.id);
                }
              }}
              className="w-full btn-outline border-rose-500/30 text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/50 flex items-center justify-center gap-2 py-2 text-xs"
            >
              <Trash2 className="h-4 w-4" /> Delete This Node
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-ink-950/60 border border-white/5 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <Icon className="h-3 w-3 text-slate-400" /> {label}
      </div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{children}</p>;
}

function Bar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
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
  currentNodeId,
  isIncoming,
  byId,
  onSelectNode,
  onDeleteEdge,
  emptyText,
}: {
  title: string;
  icon: typeof Users;
  ids: string[];
  currentNodeId: string;
  isIncoming: boolean;
  byId: (id: string) => SupplyChainNode | undefined;
  onSelectNode?: (id: string) => void;
  onDeleteEdge?: (source: string, target: string) => void;
  emptyText: string;
}) {
  return (
    <div>
      <SectionLabel>
        <span className="inline-flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-accent-400" /> {title} <span className="text-slate-500 font-mono">({ids.length})</span>
        </span>
      </SectionLabel>
      {ids.length === 0 ? (
        <p className="text-xs text-slate-500 italic px-2">{emptyText}</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
          {ids.map((id) => {
            const n = byId(id);
            const source = isIncoming ? id : currentNodeId;
            const target = isIncoming ? currentNodeId : id;

            return (
              <div
                key={id}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-ink-950/60 border border-white/5 hover:bg-white/10 hover:border-accent-500/30 transition text-left"
              >
                <button
                  onClick={() => onSelectNode?.(id)}
                  disabled={!onSelectNode}
                  className="flex-1 flex items-center gap-2 min-w-0"
                >
                  <span className="font-mono text-xs text-accent-400">{id}</span>
                  <span className="text-xs text-slate-300 truncate">{n?.name ?? id}</span>
                  {n && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: n.riskScore >= 80 ? '#ef4444' : n.riskScore >= 60 ? '#fb7185' : n.riskScore >= 40 ? '#f59e0b' : '#10b981' }} />}
                </button>
                {onDeleteEdge && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete route from ${source} to ${target}?`)) {
                        onDeleteEdge(source, target);
                      }
                    }}
                    title="Delete this route"
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
