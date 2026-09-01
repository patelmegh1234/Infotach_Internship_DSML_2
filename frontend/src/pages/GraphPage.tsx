import { useEffect, useMemo, useState, useCallback } from 'react';
import { Filter, Search, X, Workflow, RotateCw, ShieldAlert, Layers, Network, Activity } from 'lucide-react';
import { GraphView } from '@/components/graph/GraphView';
import { RiskLegend } from '@/components/graph/RiskLegend';
import { LoadingState } from '@/components/LoadingState';
import { api } from '@/services/api';
import { classNames } from '@/utils/helpers';
import type { SupplyChainNode, SupplyChainEdge, NodeType } from '@/types';
import { nodeTypes } from '@/data/mockData';

export function GraphPage({ search }: { search: string }) {
  const [nodes, setNodes] = useState<SupplyChainNode[]>([]);
  const [edges, setEdges] = useState<SupplyChainEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<NodeType[]>([]);
  const [localSearch, setLocalSearch] = useState('');
  const [showLabels, setShowLabels] = useState(true);

  const fetchGraph = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const net = await api.getNetwork();
      setNodes(net.nodes);
      setEdges(net.edges);
    } catch (err) {
      console.error('Failed to load graph', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const toggleType = (t: NodeType) => setActiveTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const q = (search || localSearch).trim().toLowerCase();

  const filteredNodes = useMemo(() => {
    let list = nodes;
    if (activeTypes.length > 0) list = list.filter((n) => activeTypes.includes(n.type));
    if (q) {
      list = list.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          n.location.toLowerCase().includes(q) ||
          (n.country && n.country.toLowerCase().includes(q)) ||
          (n.city && n.city.toLowerCase().includes(q))
      );
    }
    return list;
  }, [nodes, activeTypes, q]);

  const stats = useMemo(() => {
    const total = nodes.length;
    const critical = nodes.filter((n) => n.riskScore >= 70).length;
    const avgRisk = total > 0 ? Math.round(nodes.reduce((acc, n) => acc + n.riskScore, 0) / total) : 0;
    return { total, edgesCount: edges.length, critical, avgRisk };
  }, [nodes, edges]);

  if (loading) return <LoadingState label="Loading supply chain network from graph API…" />;

  return (
    <div className="space-y-5 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2.5">
            <Network className="h-6 w-6 text-accent-400" />
            Supply Chain Knowledge Graph
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time interactive network graph connecting suppliers, manufacturers, logistics ports, distribution centers, and retailers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchGraph(true)}
            disabled={refreshing}
            className="btn-outline text-xs flex items-center gap-1.5 px-3 py-1.5"
            title="Reload graph data from API"
          >
            <RotateCw className={classNames('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing…' : 'Refresh Graph'}
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-ink-900/60 border border-white/5 px-3 py-1.5 rounded-lg">
            <Workflow className="h-4 w-4 text-accent-400" />
            <span><strong className="text-white font-mono">{filteredNodes.length}</strong> nodes</span>
            <span>·</span>
            <span><strong className="text-white font-mono">{edges.length}</strong> routes</span>
          </div>
        </div>
      </header>

      {/* Mini Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-ink-900/60 border border-white/5 p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0">
            <Layers className="h-4.5 w-4.5 text-accent-400" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Total Nodes</p>
            <p className="text-base font-semibold font-mono text-white">{stats.total}</p>
          </div>
        </div>
        <div className="rounded-xl bg-ink-900/60 border border-white/5 p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Workflow className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Total Routes</p>
            <p className="text-base font-semibold font-mono text-white">{stats.edgesCount}</p>
          </div>
        </div>
        <div className="rounded-xl bg-ink-900/60 border border-white/5 p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-4.5 w-4.5 text-rose-400" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400">At Risk Nodes</p>
            <p className="text-base font-semibold font-mono text-rose-400">{stats.critical}</p>
          </div>
        </div>
        <div className="rounded-xl bg-ink-900/60 border border-white/5 p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Activity className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Avg Risk Score</p>
            <p className="text-base font-semibold font-mono text-amber-400">{stats.avgRisk}/100</p>
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        {/* Controls Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <button
              onClick={() => setActiveTypes([])}
              className={classNames(
                'chip border transition text-xs',
                activeTypes.length === 0 ? 'bg-accent-500/15 text-accent-300 border-accent-500/30 font-medium' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
              )}
            >
              All Types
            </button>
            {nodeTypes.map((t) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={classNames(
                  'chip border transition text-xs',
                  activeTypes.includes(t) ? 'bg-accent-500/15 text-accent-300 border-accent-500/30 font-medium' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                )}
              >
                {t}
              </button>
            ))}
            {activeTypes.length > 0 && (
              <button onClick={() => setActiveTypes([])} className="btn-ghost text-xs px-2 py-1 text-slate-400 hover:text-white flex items-center gap-1">
                <X className="h-3 w-3" /> Clear filters ({activeTypes.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search node ID, name, location…"
                className="input pl-9 pr-8 w-64 text-xs"
              />
              {localSearch && (
                <button onClick={() => setLocalSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowLabels((s) => !s)}
              className={classNames('btn-outline text-xs transition', showLabels ? 'border-accent-500/30 text-accent-300' : 'text-slate-400')}
            >
              {showLabels ? 'Hide Edge Labels' : 'Show Edge Labels'}
            </button>
          </div>
        </div>

        <RiskLegend />

        <GraphView
          nodes={filteredNodes}
          edges={edges}
          selectedId={selectedId}
          onSelectNode={setSelectedId}
          showLabels={showLabels}
          height="h-[700px]"
          searchQuery={q}
        />
      </div>
    </div>
  );
}
