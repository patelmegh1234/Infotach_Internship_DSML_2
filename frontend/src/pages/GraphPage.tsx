import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Filter,
  Search,
  X,
  Workflow,
  RotateCw,
  ShieldAlert,
  Layers,
  Network,
  Activity,
  Plus,
  Trash2,
  GitBranch,
  Check,
  AlertCircle,
  Database,
  Upload,
  Download,
  FileCode,
  Sparkles,
  Zap,
  FolderOpen,
  HelpCircle,
} from 'lucide-react';
import { GraphView } from '@/components/graph/GraphView';
import { RiskLegend } from '@/components/graph/RiskLegend';
import { LoadingState } from '@/components/LoadingState';
import { api, type DemoTemplate, type SampleFileItem } from '@/services/api';
import { classNames } from '@/utils/helpers';
import { useToast } from '@/hooks/useToast';
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

  // Modals
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [showAddEdgeModal, setShowAddEdgeModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Demo & Sample State
  const [templates, setTemplates] = useState<DemoTemplate[]>([]);
  const [sampleFiles, setSampleFiles] = useState<SampleFileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Node form state
  const [nodeForm, setNodeForm] = useState({
    node_id: '',
    node_type: 'Supplier' as NodeType,
    name: '',
    country: 'Global',
    city: '',
    capacity_utilization: 0.85,
    historical_delay_avg: 2.0,
    risk_score: 20,
    throughput_teu: 1000000,
  });

  // Edge form state
  const [edgeForm, setEdgeForm] = useState({
    source: '',
    target: '',
    relationship: 'SUPPLIES',
    transport_mode: 'sea',
    quantity: 1000,
    transit_days: 4,
  });

  const toast = useToast();

  const fetchGraph = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [net, tpls, sFiles] = await Promise.all([
        api.getNetwork(),
        api.getTemplates(),
        api.getSampleFiles(),
      ]);
      setNodes(net.nodes);
      setEdges(net.edges);
      setTemplates(tpls);
      setSampleFiles(sFiles);
    } catch (err) {
      console.error('Failed to load graph', err);
      toast.push({ kind: 'error', title: 'Connection error', message: 'Could not fetch graph data.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

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
          (n.city && n.city.toLowerCase().includes(q)),
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

  // Create Node handler
  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeForm.node_id.trim() || !nodeForm.name.trim()) {
      toast.push({ kind: 'error', title: 'Missing fields', message: 'Node ID and Name are required.' });
      return;
    }

    setSubmitting(true);
    try {
      await api.createNode({
        node_id: nodeForm.node_id.trim(),
        node_type: nodeForm.node_type,
        name: nodeForm.name.trim(),
        country: nodeForm.country.trim() || 'Global',
        city: nodeForm.city.trim(),
        capacity_utilization: Number(nodeForm.capacity_utilization),
        historical_delay_avg: Number(nodeForm.historical_delay_avg),
        risk_score: Number(nodeForm.risk_score) / 100,
        throughput_teu: nodeForm.node_type === 'Port' ? Number(nodeForm.throughput_teu) : undefined,
      });

      toast.push({ kind: 'success', title: 'Node Created', message: `Added "${nodeForm.name}" (${nodeForm.node_id}) to the graph.` });
      setShowAddNodeModal(false);
      setNodeForm({
        node_id: '',
        node_type: 'Supplier',
        name: '',
        country: 'Global',
        city: '',
        capacity_utilization: 0.85,
        historical_delay_avg: 2.0,
        risk_score: 20,
        throughput_teu: 1000000,
      });
      await fetchGraph(true);
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'Create Failed', message: err.message || 'Failed to create node.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Create Edge handler
  const handleCreateEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edgeForm.source || !edgeForm.target) {
      toast.push({ kind: 'error', title: 'Missing endpoints', message: 'Please select both Source and Target nodes.' });
      return;
    }
    if (edgeForm.source === edgeForm.target) {
      toast.push({ kind: 'error', title: 'Invalid Route', message: 'Source and Target nodes cannot be identical.' });
      return;
    }

    setSubmitting(true);
    try {
      await api.createEdge({
        source: edgeForm.source,
        target: edgeForm.target,
        relationship: edgeForm.relationship,
        transport_mode: edgeForm.transport_mode,
        quantity: Number(edgeForm.quantity),
        transit_days: Number(edgeForm.transit_days),
      });

      toast.push({ kind: 'success', title: 'Route Created', message: `Connected ${edgeForm.source} → ${edgeForm.target} (${edgeForm.relationship}).` });
      setShowAddEdgeModal(false);
      setEdgeForm({
        source: '',
        target: '',
        relationship: 'SUPPLIES',
        transport_mode: 'sea',
        quantity: 1000,
        transit_days: 4,
      });
      await fetchGraph(true);
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'Create Failed', message: err.message || 'Failed to create route.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Connect edge by dragging handles
  const handleAddEdgeDirect = async (source: string, target: string) => {
    try {
      await api.createEdge({
        source,
        target,
        relationship: 'SUPPLIES',
        transport_mode: 'sea',
        quantity: 1000,
        transit_days: 3,
      });
      toast.push({ kind: 'success', title: 'Route Connected', message: `Connected ${source} → ${target}` });
      await fetchGraph(true);
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'Route Failed', message: err.message || 'Could not connect route.' });
    }
  };

  // Delete Node handler
  const handleDeleteNode = async (nodeId: string) => {
    try {
      await api.deleteNode(nodeId);
      toast.push({ kind: 'success', title: 'Node Deleted', message: `Deleted node ${nodeId} from graph.` });
      setSelectedId(null);
      await fetchGraph(true);
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'Delete Failed', message: err.message || 'Failed to delete node.' });
    }
  };

  // Delete Edge handler
  const handleDeleteEdge = async (source: string, target: string) => {
    try {
      await api.deleteEdge(source, target);
      toast.push({ kind: 'success', title: 'Route Deleted', message: `Deleted route ${source} → ${target}.` });
      await fetchGraph(true);
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'Delete Failed', message: err.message || 'Failed to delete route.' });
    }
  };

  // Clear Graph handler
  const handleClearGraph = async () => {
    if (!window.confirm('Are you sure you want to clear all nodes and edges from the graph?')) return;
    try {
      await api.clearGraph();
      toast.push({ kind: 'success', title: 'Graph Cleared', message: 'All nodes and routes removed. Canvas is empty.' });
      setSelectedId(null);
      await fetchGraph(true);
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'Clear Failed', message: err.message || 'Failed to clear graph.' });
    }
  };

  // Load Built-in 1-Click Template handler
  const handleLoadTemplate = async (templateId: string) => {
    setSubmitting(true);
    try {
      const res = await api.loadTemplate(templateId);
      toast.push({ kind: 'success', title: 'Template Loaded', message: res.message });
      setShowDemoModal(false);
      await fetchGraph(true);
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'Load Failed', message: err.message || 'Could not load template.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Load from File Payload handler
  const handleLoadSampleFile = async (item: SampleFileItem) => {
    setSubmitting(true);
    try {
      const res = await api.importGraph({
        title: item.title,
        nodes: item.nodes,
        edges: item.edges,
      });
      toast.push({ kind: 'success', title: 'Graph Imported', message: res.message });
      setShowImportModal(false);
      await fetchGraph(true);
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'Import Failed', message: err.message || 'Could not import graph file.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Download Sample File handler
  const handleDownloadSampleFile = (item: SampleFileItem) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(item, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = item.filename;
    a.click();
    toast.push({ kind: 'success', title: 'File Downloaded', message: `Downloaded ${item.filename}` });
  };

  // Upload Custom File handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
          throw new Error('Invalid graph format: missing "nodes" array.');
        }
        const res = await api.importGraph({
          title: parsed.title || file.name,
          nodes: parsed.nodes,
          edges: parsed.edges || [],
        });
        toast.push({ kind: 'success', title: 'File Imported', message: res.message });
        setShowImportModal(false);
        await fetchGraph(true);
      } catch (err: any) {
        toast.push({ kind: 'error', title: 'Invalid File', message: err.message || 'Could not parse JSON file.' });
      }
    };
    reader.readAsText(file);
  };

  // Export Active Graph handler
  const handleExportActiveGraph = async () => {
    try {
      const data = await api.exportGraph();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = 'atmograph_supply_chain.json';
      a.click();
      toast.push({ kind: 'success', title: 'Graph Exported', message: 'Downloaded atmograph_supply_chain.json' });
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'Export Failed', message: err.message || 'Could not export graph.' });
    }
  };

  if (loading) return <LoadingState label="Loading supply chain network from graph API…" />;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header & Main Toolbar */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2.5">
            <Network className="h-6 w-6 text-accent-400" />
            Supply Chain Knowledge Graph
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Interactive canvas — create nodes, drag handles to connect routes, or load from 10 sample demo networks.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 5 Built-in Demo Templates Dropdown Button */}
          <button
            onClick={() => setShowDemoModal(true)}
            className="btn-outline border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 text-xs flex items-center gap-1.5 px-3 py-2 shadow-sm"
            title="Choose from 5 built-in 1-click industry demo graphs"
          >
            <Sparkles className="h-4 w-4 text-cyan-400" /> 1-Click Demo Graphs
          </button>

          {/* 5 Sample Files & Custom Upload Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-outline border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 text-xs flex items-center gap-1.5 px-3 py-2 shadow-sm"
            title="Import from 5 sample files or upload your own JSON"
          >
            <Upload className="h-4 w-4 text-indigo-400" /> Import Graph Files (5)
          </button>

          {/* Export JSON Button */}
          <button
            onClick={handleExportActiveGraph}
            disabled={nodes.length === 0}
            className="btn-outline text-xs flex items-center gap-1.5 px-3 py-2 text-slate-300 hover:text-white"
            title="Export active graph to JSON file"
          >
            <Download className="h-3.5 w-3.5" /> Export JSON
          </button>

          <div className="h-5 w-[1px] bg-white/10 mx-1 hidden sm:block" />

          {/* Add Node Button */}
          <button
            onClick={() => setShowAddNodeModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5 px-3 py-2 shadow-glow"
          >
            <Plus className="h-4 w-4" /> Add Node
          </button>

          {/* Add Route Button */}
          <button
            onClick={() => setShowAddEdgeModal(true)}
            disabled={nodes.length < 2}
            className="btn-outline text-xs flex items-center gap-1.5 px-3 py-2"
          >
            <GitBranch className="h-4 w-4 text-accent-400" /> Add Route
          </button>

          {/* Clear All Button */}
          <button
            onClick={handleClearGraph}
            disabled={nodes.length === 0}
            className="btn-outline border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs flex items-center gap-1.5 px-2.5 py-2"
            title="Clear all nodes and routes"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchGraph(true)}
            disabled={refreshing}
            className="btn-ghost text-xs flex items-center gap-1.5 px-2.5 py-2 text-slate-400 hover:text-white"
            title="Reload from API"
          >
            <RotateCw className={classNames('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </button>
        </div>
      </header>

      {/* Live Graph Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="card p-2.5 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Network className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Total Nodes</div>
            <div className="text-sm font-bold font-mono text-white">{stats.total}</div>
          </div>
        </div>

        <div className="card p-2.5 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Workflow className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Connected Routes</div>
            <div className="text-sm font-bold font-mono text-white">{stats.edgesCount}</div>
          </div>
        </div>

        <div className="card p-2.5 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">At-Risk Nodes</div>
            <div className="text-sm font-bold font-mono text-rose-400">{stats.critical}</div>
          </div>
        </div>

        <div className="card p-2.5 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Avg Risk Score</div>
            <div className="text-sm font-bold font-mono text-amber-400">{stats.avgRisk}<span className="text-xs text-slate-500 font-normal">/100</span></div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="card p-3 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Node Type Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="h-3 w-3" /> Type:
            </span>
            {nodeTypes.map((t) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={classNames(
                  'chip border text-xs transition',
                  activeTypes.length === 0 || activeTypes.includes(t)
                    ? 'bg-accent-500/10 text-accent-300 border-accent-500/20 shadow-sm'
                    : 'bg-white/5 text-slate-500 border-white/5 hover:text-slate-300',
                )}
              >
                {t}
              </button>
            ))}
            {activeTypes.length > 0 && (
              <button onClick={() => setActiveTypes([])} className="btn-ghost text-xs px-2 py-1 text-slate-400 hover:text-white">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          {/* Quick Node Search */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search node ID, name, city…"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="input-field pl-8 pr-7 py-1 text-xs w-full"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowLabels((v) => !v)}
              className={classNames(
                'chip border text-xs transition',
                showLabels ? 'bg-ink-900 text-slate-300 border-white/10' : 'bg-white/5 text-slate-500 border-transparent',
              )}
              title="Toggle edge relationship labels"
            >
              <Layers className="h-3 w-3 inline mr-1" />
              Labels
            </button>
          </div>
        </div>

        <RiskLegend />
      </div>

      {/* Main Graph Canvas */}
      {nodes.length === 0 ? (
        <div className="card p-10 text-center space-y-4 border-dashed border-white/10">
          <div className="h-12 w-12 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 flex items-center justify-center mx-auto">
            <Network className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Supply Chain Graph is Empty</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Start building by clicking <strong>Add Node</strong>, or instantly load one of the <strong>10 Demo Graphs</strong> below.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
            <button onClick={() => setShowDemoModal(true)} className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2">
              <Sparkles className="h-4 w-4" /> 1-Click Demo Graphs (5 Options)
            </button>
            <button onClick={() => setShowImportModal(true)} className="btn-outline text-xs flex items-center gap-1.5 px-4 py-2">
              <Upload className="h-4 w-4 text-indigo-400" /> Import Graph Files (5 Files)
            </button>
            <button onClick={() => setShowAddNodeModal(true)} className="btn-ghost text-xs flex items-center gap-1.5 px-3 py-2 text-slate-300">
              <Plus className="h-4 w-4" /> Manual Node Entry
            </button>
          </div>
        </div>
      ) : (
        <GraphView
          nodes={filteredNodes}
          edges={edges}
          selectedId={selectedId}
          onSelectNode={setSelectedId}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
          onAddEdge={handleAddEdgeDirect}
          showLabels={showLabels}
          height="h-[720px]"
          searchQuery={q}
        />
      )}

      {/* 1-Click Demo Graphs Modal (5 Options) */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="card p-6 w-full max-w-2xl border border-cyan-500/30 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-cyan-400" /> 1-Click Demo Graphs (5 Options)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select any industry demo to replace your active graph with a realistic supply chain network.
                </p>
              </div>
              <button onClick={() => setShowDemoModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="rounded-xl bg-ink-900/80 border border-white/10 p-4 hover:border-cyan-500/50 hover:bg-ink-850 transition flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="chip bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px]">
                        {tpl.industry}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {tpl.node_count} nodes · {tpl.edge_count} routes
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white mt-2">{tpl.name}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{tpl.description}</p>
                  </div>

                  <button
                    onClick={() => handleLoadTemplate(tpl.id)}
                    disabled={submitting}
                    className="w-full btn-primary text-xs flex items-center justify-center gap-1.5 py-2 mt-2"
                  >
                    <Zap className="h-3.5 w-3.5" /> Load This Demo Graph
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Import Graph Files Modal (5 File Templates + Upload Custom) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="card p-6 w-full max-w-3xl border border-indigo-500/30 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Upload className="h-5 w-5 text-indigo-400" /> Import Graph Files (5 Ready-to-Use Datasets)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  1-click load pre-built JSON file templates, download them to edit, or upload your own custom JSON.
                </p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Custom File Upload Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-500/5 p-5 text-center cursor-pointer transition space-y-2"
            >
              <FileCode className="h-7 w-7 text-indigo-400 mx-auto" />
              <div>
                <span className="text-xs font-semibold text-white">Upload Custom JSON Graph File</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Click to browse or drop any .json file containing nodes and edges</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* 5 Downloadable / Loadable Sample File Cards */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-accent-400" /> 5 Pre-Built Sample Graph Files (data/sample_graphs/)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sampleFiles.map((sf, idx) => (
                  <div
                    key={sf.filename}
                    className="rounded-xl bg-ink-900/80 border border-white/10 p-3.5 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-[10px] text-accent-400 truncate max-w-[170px]">{sf.filename}</span>
                        <span className="font-mono text-[10px] text-slate-500">{sf.nodes.length}n · {sf.edges.length}e</span>
                      </div>
                      <h5 className="text-xs font-semibold text-white mt-1.5">{sf.title}</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{sf.description}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                      <button
                        onClick={() => handleLoadSampleFile(sf)}
                        disabled={submitting}
                        className="btn-primary text-xs flex-1 py-1.5 flex items-center justify-center gap-1"
                      >
                        <Zap className="h-3 w-3" /> 1-Click Load
                      </button>
                      <button
                        onClick={() => handleDownloadSampleFile(sf)}
                        className="btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1 text-slate-300 hover:text-white"
                        title="Download JSON file to inspect or edit"
                      >
                        <Download className="h-3 w-3" /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Node Modal */}
      {showAddNodeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="card p-6 w-full max-w-lg border border-accent-500/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-accent-400" /> Add Supply Chain Node
              </h3>
              <button onClick={() => setShowAddNodeModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNode} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Node ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. SUP-01, PORT-01"
                    value={nodeForm.node_id}
                    onChange={(e) => setNodeForm({ ...nodeForm, node_id: e.target.value.toUpperCase() })}
                    className="input-field w-full py-1.5 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Node Type *</label>
                  <select
                    value={nodeForm.node_type}
                    onChange={(e) => setNodeForm({ ...nodeForm, node_type: e.target.value as NodeType })}
                    className="input-field w-full py-1.5 bg-ink-900"
                  >
                    {nodeTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Node Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Tokyo Battery Corp, Port of Rotterdam"
                  value={nodeForm.name}
                  onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                  className="input-field w-full py-1.5"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Country</label>
                  <input
                    type="text"
                    placeholder="e.g. Japan, Germany, USA"
                    value={nodeForm.country}
                    onChange={(e) => setNodeForm({ ...nodeForm, country: e.target.value })}
                    className="input-field w-full py-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Tokyo, Hamburg"
                    value={nodeForm.city}
                    onChange={(e) => setNodeForm({ ...nodeForm, city: e.target.value })}
                    className="input-field w-full py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Capacity Utilization: {Math.round(nodeForm.capacity_utilization * 100)}%</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={nodeForm.capacity_utilization}
                    onChange={(e) => setNodeForm({ ...nodeForm, capacity_utilization: parseFloat(e.target.value) })}
                    className="w-full accent-accent-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Initial Risk Score: {nodeForm.risk_score}/100</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={nodeForm.risk_score}
                    onChange={(e) => setNodeForm({ ...nodeForm, risk_score: parseInt(e.target.value) })}
                    className="w-full accent-accent-400"
                  />
                </div>
              </div>

              {nodeForm.node_type === 'Port' && (
                <div>
                  <label className="text-slate-400 block mb-1">Throughput (TEU)</label>
                  <input
                    type="number"
                    value={nodeForm.throughput_teu}
                    onChange={(e) => setNodeForm({ ...nodeForm, throughput_teu: parseInt(e.target.value) || 0 })}
                    className="input-field w-full py-1.5 font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddNodeModal(false)}
                  className="btn-ghost text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
                >
                  {submitting ? 'Creating…' : 'Create Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Route (Edge) Modal */}
      {showAddEdgeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="card p-6 w-full max-w-lg border border-accent-500/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-accent-400" /> Connect Supply Chain Route
              </h3>
              <button onClick={() => setShowAddEdgeModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEdge} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Source Node *</label>
                  <select
                    value={edgeForm.source}
                    onChange={(e) => setEdgeForm({ ...edgeForm, source: e.target.value })}
                    className="input-field w-full py-1.5 bg-ink-900 font-mono"
                    required
                  >
                    <option value="">-- Select Source --</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>{n.id} - {n.name} ({n.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Target Node *</label>
                  <select
                    value={edgeForm.target}
                    onChange={(e) => setEdgeForm({ ...edgeForm, target: e.target.value })}
                    className="input-field w-full py-1.5 bg-ink-900 font-mono"
                    required
                  >
                    <option value="">-- Select Target --</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>{n.id} - {n.name} ({n.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Relationship</label>
                  <select
                    value={edgeForm.relationship}
                    onChange={(e) => setEdgeForm({ ...edgeForm, relationship: e.target.value })}
                    className="input-field w-full py-1.5 bg-ink-900"
                  >
                    <option value="SUPPLIES">SUPPLIES</option>
                    <option value="SHIPS_THROUGH">SHIPS_THROUGH</option>
                    <option value="STORES_AT">STORES_AT</option>
                    <option value="DELIVERS_TO">DELIVERS_TO</option>
                    <option value="PRODUCES">PRODUCES</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Transport Mode</label>
                  <select
                    value={edgeForm.transport_mode}
                    onChange={(e) => setEdgeForm({ ...edgeForm, transport_mode: e.target.value })}
                    className="input-field w-full py-1.5 bg-ink-900"
                  >
                    <option value="sea">Maritime (Sea)</option>
                    <option value="air">Air Cargo</option>
                    <option value="road">Road / Trucking</option>
                    <option value="rail">Freight Rail</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Transit Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={edgeForm.transit_days}
                    onChange={(e) => setEdgeForm({ ...edgeForm, transit_days: parseInt(e.target.value) || 1 })}
                    className="input-field w-full py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Quantity / Volume</label>
                  <input
                    type="number"
                    min="1"
                    value={edgeForm.quantity}
                    onChange={(e) => setEdgeForm({ ...edgeForm, quantity: parseInt(e.target.value) || 1 })}
                    className="input-field w-full py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddEdgeModal(false)}
                  className="btn-ghost text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
                >
                  {submitting ? 'Connecting…' : 'Connect Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
