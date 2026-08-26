import { useEffect, useMemo, useState } from 'react';
import { Filter, Search, X, Workflow } from 'lucide-react';
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<NodeType[]>([]);
  const [localSearch, setLocalSearch] = useState('');
  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const net = await api.getNetwork();
      if (!alive) return;
      setNodes(net.nodes);
      setEdges(net.edges);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const toggleType = (t: NodeType) => setActiveTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const q = (search || localSearch).trim().toLowerCase();

  const filteredNodes = useMemo(() => {
    let list = nodes;
    if (activeTypes.length > 0) list = list.filter((n) => activeTypes.includes(n.type));
    if (q) list = list.filter((n) => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q) || n.location.toLowerCase().includes(q));
    return list;
  }, [nodes, activeTypes, q]);

  if (loading) return <LoadingState label="Loading supply chain graph…" />;

  return (
    <div className="space-y-5 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Supply Chain Graph</h1>
          <p className="mt-1 text-sm text-slate-400">Explore interconnected suppliers, manufacturers, warehouses, ports and markets.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Workflow className="h-4 w-4" />
          {filteredNodes.length} nodes · {edges.length} relationships
        </div>
      </header>

      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            {nodeTypes.map((t) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={classNames(
                  'chip border transition',
                  activeTypes.length === 0 || activeTypes.includes(t) ? 'bg-accent-500/10 text-accent-300 border-accent-500/20' : 'bg-white/5 text-slate-500 border-white/5',
                )}
              >
                {t}
              </button>
            ))}
            {activeTypes.length > 0 && (
              <button onClick={() => setActiveTypes([])} className="btn-ghost text-xs px-2 py-1"><X className="h-3 w-3" /> Clear</button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} placeholder="Search supplier, factory, port…" className="input pl-9 w-64" />
            </div>
            <button onClick={() => setShowLabels((s) => !s)} className={classNames('btn-outline text-xs', showLabels && 'border-accent-500/30 text-accent-300')}>
              {showLabels ? 'Hide labels' : 'Show labels'}
            </button>
          </div>
        </div>

        <RiskLegend className="mb-3" />

        <GraphView
          nodes={filteredNodes}
          edges={edges}
          selectedId={selectedId}
          onSelectNode={setSelectedId}
          showLabels={showLabels}
          height="h-[680px]"
          searchQuery={q}
        />
      </div>
    </div>
  );
}
