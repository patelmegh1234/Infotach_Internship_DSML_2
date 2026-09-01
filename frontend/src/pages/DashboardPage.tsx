import { useEffect, useMemo, useState } from 'react';
import { Network, AlertTriangle, ShieldAlert, Gauge, DollarSign, Filter, Search, X } from 'lucide-react';
import { KpiCard } from '@/components/KpiCard';
import { GraphView } from '@/components/graph/GraphView';
import { RiskLegend } from '@/components/graph/RiskLegend';
import { AIInsightPanel } from '@/components/AIInsightPanel';
import { LoadingState } from '@/components/LoadingState';
import { api } from '@/services/api';
import { formatCurrency, formatNumber, classNames, riskLevelFromScore } from '@/utils/helpers';
import type { SupplyChainNode, SupplyChainEdge, KpiSnapshot, AIInsight, NodeType } from '@/types';
import { nodeTypes } from '@/data/mockData';

export function DashboardPage({ search }: { search: string }) {
  const [nodes, setNodes] = useState<SupplyChainNode[]>([]);
  const [edges, setEdges] = useState<SupplyChainEdge[]>([]);
  const [kpi, setKpi] = useState<KpiSnapshot | null>(null);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<NodeType[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [net, k, ins] = await Promise.all([api.getNetwork(), api.getKpi(), api.getInsight()]);
      if (!alive) return;
      setNodes(net.nodes);
      setEdges(net.edges);
      setKpi(k);
      setInsight(ins);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const toggleType = (t: NodeType) => {
    setActiveTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const riskLevel = kpi ? riskLevelFromScore(kpi.networkRiskScore) : 'Low';

  const filteredNodes = useMemo(() => {
    let list = nodes;
    if (activeTypes.length > 0) list = list.filter((n) => activeTypes.includes(n.type));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((n) => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q) || n.location.toLowerCase().includes(q));
    return list;
  }, [nodes, activeTypes, search]);

  if (loading) return <LoadingState label="Loading network intelligence…" />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <header>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Supply Chain Intelligence Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Monitor, simulate, and predict global supply-chain disruptions.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Network Nodes" value={formatNumber(kpi?.networkNodes ?? 0)} sub="Suppliers, facilities, warehouses and markets" icon={<Network className="h-5 w-5" />} accent="cyan" />
        <KpiCard label="Active Disruptions" value={kpi?.activeDisruptions ?? 0} sub="Currently simulated or detected events" icon={<AlertTriangle className="h-5 w-5" />} accent="rose" trend={{ value: '12%', up: true }} />
        <KpiCard label="At-Risk Nodes" value={formatNumber(kpi?.atRiskNodes ?? 0)} sub="Nodes with elevated disruption probability" icon={<ShieldAlert className="h-5 w-5" />} accent="amber" trend={{ value: '8%', up: true }} />
        <KpiCard label="Network Risk Score" value={<span className={classNames(riskLevel === 'Critical' ? 'text-red-400' : riskLevel === 'High' ? 'text-rose-400' : 'text-amber-400')}>{kpi?.networkRiskScore.toFixed(1)}<span className="text-base text-slate-500"> / 100</span></span>} sub={`Risk level: ${riskLevel}`} icon={<Gauge className="h-5 w-5" />} accent="amber" />
        <KpiCard label="Estimated Exposure" value={formatCurrency(kpi?.estimatedExposure ?? 0)} sub="Estimated potential economic impact" icon={<DollarSign className="h-5 w-5" />} accent="rose" trend={{ value: '5%', up: true }} />
      </div>

      <div className="card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Global Supply Chain Network</h2>
            <p className="text-xs text-slate-500 mt-0.5">Interactive graph of suppliers, factories, warehouses, ports, distributors and markets</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            {nodeTypes.map((t) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={classNames(
                  'chip border transition',
                  activeTypes.length === 0 || activeTypes.includes(t)
                    ? 'bg-accent-500/10 text-accent-300 border-accent-500/20'
                    : 'bg-white/5 text-slate-500 border-white/5',
                )}
              >
                {t}
              </button>
            ))}
            {activeTypes.length > 0 && (
              <button onClick={() => setActiveTypes([])} className="btn-ghost text-xs px-2 py-1">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>

        <RiskLegend className="mb-3" />

        <GraphView
          nodes={filteredNodes}
          edges={edges}
          selectedId={selectedId}
          onSelectNode={setSelectedId}
          height="h-[560px]"
          searchQuery={search}
        />
      </div>

      {insight && (
        <AIInsightPanel insight={insight} />
      )}
    </div>
  );
}
