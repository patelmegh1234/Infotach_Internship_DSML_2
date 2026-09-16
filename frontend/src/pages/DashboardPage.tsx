import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Network,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  DollarSign,
  Filter,
  X,
  Sparkles,
  Upload,
  Plus,
  Download,
  Zap,
  FileCode,
  FolderOpen,
  ArrowUpRight,
  RotateCw,
} from 'lucide-react';
import { KpiCard } from '@/components/KpiCard';
import { GraphView } from '@/components/graph/GraphView';
import { RiskLegend } from '@/components/graph/RiskLegend';
import { AIInsightPanel } from '@/components/AIInsightPanel';
import { LoadingState } from '@/components/LoadingState';
import { DisruptionBanner } from '@/components/DisruptionBanner';
import { TimelineSlider } from '@/components/TimelineSlider';
import { RiskTrendChart } from '@/components/RiskTrendChart';
import { DisruptionHistoryPanel } from '@/components/DisruptionHistoryPanel';
import { api, type DemoTemplate, type SampleFileItem } from '@/services/api';
import { websocketService } from '@/services/websocket';
import { formatCurrency, formatNumber, classNames, riskLevelFromScore } from '@/utils/helpers';
import { useToast } from '@/hooks/useToast';
import type { SupplyChainNode, SupplyChainEdge, KpiSnapshot, AIInsight, NodeType, HistoricalDisruption } from '@/types';
import { nodeTypes } from '@/data/mockData';

export function DashboardPage({
  search,
  onNavigate,
}: {
  search: string;
  onNavigate?: (page: any) => void;
}) {
  const [nodes, setNodes] = useState<SupplyChainNode[]>([]);
  const [edges, setEdges] = useState<SupplyChainEdge[]>([]);
  const [kpi, setKpi] = useState<KpiSnapshot | null>(null);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<NodeType[]>([]);

  // Real-time & Predictive State (Issues #14 & #15)
  const [predictionsMap, setPredictionsMap] = useState<Record<string, any>>({});
  const [realtimePredictions, setRealtimePredictions] = useState<Record<string, any>>({});
  const [activeDisruption, setActiveDisruption] = useState<HistoricalDisruption | null>(null);
  const [selectedHorizon, setSelectedHorizon] = useState<number>(0); // 0 = real-time, 30, 60, 90
  const [timelineData, setTimelineData] = useState<Record<string, any[]> | null>(null);
  const [isTimelineLoading, setIsTimelineLoading] = useState<boolean>(false);

  // Demo, Import & Node Creation Modals State
  const [templates, setTemplates] = useState<DemoTemplate[]>([]);
  const [sampleFiles, setSampleFiles] = useState<SampleFileItem[]>([]);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toast = useToast();

  // Node form state with smart auto-generated ID
  const [nodeForm, setNodeForm] = useState({
    node_id: `SUP-${Math.floor(100 + Math.random() * 900)}`,
    node_type: 'Supplier' as NodeType,
    name: '',
    country: 'Global',
    city: '',
    capacity_utilization: 0.85,
    historical_delay_avg: 2.0,
    risk_score: 20,
    throughput_teu: 1000000,
  });

  const fetchGraph = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [net, k, ins, tpls, sFiles] = await Promise.all([
        api.getNetwork(),
        api.getKpi(),
        api.getInsight(),
        api.getTemplates(),
        api.getSampleFiles(),
      ]);
      setNodes(net.nodes);
      setEdges(net.edges);
      setKpi(k);
      setInsight(ins);
      setTemplates(tpls);
      setSampleFiles(sFiles);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      toast.push({ kind: 'error', title: 'Connection error', message: 'Could not fetch network data.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // WebSocket real-time subscription for Disruption & GNN Prediction frames (Issue #14)
  useEffect(() => {
    const unsubscribe = websocketService.subscribe((msg) => {
      // 1. Live Disruption Alert
      if (msg.type === 'disruption_detected' && msg.disruption) {
        setActiveDisruption(msg.disruption);
      }

      // 2. GNN Predictions Updated -> Re-color nodes dynamically
      if (msg.type === 'predictions_updated' && Array.isArray(msg.predictions)) {
        const pMap: Record<string, any> = {};
        msg.predictions.forEach((p: any) => {
          pMap[p.node_id] = p;
        });
        setRealtimePredictions(pMap);
        if (selectedHorizon === 0) {
          setPredictionsMap(pMap);
        }
      }
    });

    return () => unsubscribe();
  }, [selectedHorizon]);

  // Handle Timeline Horizon change (Issue #15)
  const handleHorizonChange = useCallback(async (horizon: number) => {
    setSelectedHorizon(horizon);

    if (horizon === 0) {
      setPredictionsMap(realtimePredictions);
      return;
    }

    setIsTimelineLoading(true);
    try {
      const originNode = selectedId || activeDisruption?.node_id || 'PORT-001';
      const res = await api.predictTimeline(horizon, originNode);
      if (res && res.timeline) {
        setTimelineData(res.timeline);
        const key = `${horizon}_days`;
        const horizonPreds = res.timeline[key] || [];
        const pMap: Record<string, any> = {};
        horizonPreds.forEach((p: any) => {
          pMap[p.node_id] = p;
        });
        setPredictionsMap(pMap);
      }
    } catch (err) {
      console.warn('Timeline prediction failed:', err);
    } finally {
      setIsTimelineLoading(false);
    }
  }, [selectedId, activeDisruption, realtimePredictions]);

  // Replay historical disruption simulation from panel (Issue #15)
  const handleSimulateHistorical = useCallback(async (event: HistoricalDisruption) => {
    setActiveDisruption(event);
    setSelectedId(event.node_id);

    try {
      const res = await api.predictDisruption({
        node_id: event.node_id,
        severity: event.severity,
        disruption_type: event.disruption_type,
      });

      if (res && Array.isArray(res.predictions)) {
        const pMap: Record<string, any> = {};
        res.predictions.forEach((p: any) => {
          pMap[p.node_id] = p;
        });
        setRealtimePredictions(pMap);
        setPredictionsMap(pMap);
        setSelectedHorizon(0);
      }
    } catch (err) {
      console.warn('Simulate historical disruption failed:', err);
    }
  }, []);

  // 1-Click Load Demo Template handler
  const handleLoadTemplate = async (templateId: string) => {
    setSubmitting(true);
    try {
      const res = await api.loadTemplate(templateId);
      toast.push({ kind: 'success', title: 'Graph Loaded', message: res.message });
      setShowDemoModal(false);
      await fetchGraph(true);
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'Load Failed', message: err.message || 'Could not load demo graph.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Reset to full Benchmark Graph
  const handleResetBenchmark = async () => {
    setSubmitting(true);
    try {
      const res = await api.resetDataset();
      toast.push({ kind: 'success', title: 'Benchmark Loaded', message: res.message });
      setShowDemoModal(false);
      await fetchGraph(true);
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'Reset Failed', message: err.message || 'Could not reset graph.' });
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

  // Upload Custom File handler (flexible multi-format parser)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const rawText = evt.target?.result as string;
        const parsed = JSON.parse(rawText);

        let nodesPayload: any = [];
        let edgesPayload: any = [];

        if (Array.isArray(parsed)) {
          // Format 1: Top-level array of nodes [ {...}, {...} ]
          nodesPayload = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (parsed.nodes) {
            // Format 2: Object with 'nodes' (array or categories dict)
            nodesPayload = parsed.nodes;
            edgesPayload = parsed.edges || parsed.relationships || [];
          } else if (parsed.data && (parsed.data.nodes || Array.isArray(parsed.data))) {
            // Format 3: Nested inside data
            nodesPayload = parsed.data.nodes || parsed.data;
            edgesPayload = parsed.data.edges || parsed.data.relationships || [];
          } else {
            // Format 4: Direct dictionary of categories (e.g. { suppliers: [...], ports: [...] })
            nodesPayload = parsed;
            edgesPayload = parsed.edges || parsed.relationships || [];
          }
        } else {
          throw new Error('Unrecognized JSON structure. Expected a graph object or list of nodes.');
        }

        const res = await api.importGraph({
          title: parsed.title || parsed.description || file.name,
          nodes: nodesPayload,
          edges: edgesPayload,
        });

        toast.push({
          kind: 'success',
          title: 'Graph Imported',
          message: res.message || `Successfully loaded "${file.name}" onto canvas.`,
        });
        setShowImportModal(false);
        await fetchGraph(true);
      } catch (err: any) {
        console.error('Import error:', err);
        toast.push({
          kind: 'error',
          title: 'Import Failed',
          message: err.message || 'Could not parse JSON file into supply chain graph.',
        });
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

  // Open Add Node Modal with refreshed ID
  const handleOpenAddNodeModal = () => {
    const prefix = nodeForm.node_type === 'Supplier' ? 'SUP' : nodeForm.node_type === 'Port' ? 'PORT' : nodeForm.node_type === 'Manufacturer' ? 'MFG' : 'NODE';
    setNodeForm((prev) => ({
      ...prev,
      node_id: `${prefix}-${Math.floor(100 + Math.random() * 900)}`,
    }));
    setShowAddNodeModal(true);
  };

  // Create Node handler
  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeForm.node_id.trim() || !nodeForm.name.trim()) {
      toast.push({ kind: 'error', title: 'Missing fields', message: 'Node ID and Name are required.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createNode({
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

      toast.push({
        kind: 'success',
        title: 'Node Created',
        message: res.message || `Added "${nodeForm.name}" (${nodeForm.node_id}) to the graph.`,
      });
      setShowAddNodeModal(false);
      setSelectedId(nodeForm.node_id.trim());
      setNodeForm({
        node_id: `SUP-${Math.floor(100 + Math.random() * 900)}`,
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

  const toggleType = (t: NodeType) => {
    setActiveTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const riskLevel = kpi ? riskLevelFromScore(kpi.networkRiskScore) : 'Low';

  const filteredNodes = useMemo(() => {
    let list = nodes;
    if (activeTypes.length > 0) list = list.filter((n) => activeTypes.includes(n.type));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          n.location.toLowerCase().includes(q),
      );
    }
    return list;
  }, [nodes, activeTypes, search]);

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedId);
  }, [nodes, selectedId]);

  if (loading) return <LoadingState label="Loading network intelligence…" />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Supply Chain Intelligence Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time disruption monitoring, multi-hop GNN ripple propagation, and 30/60/90-day predictive forecasts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchGraph(true)}
            disabled={refreshing}
            className="btn-outline text-xs flex items-center gap-1.5 px-3 py-2 text-slate-300 hover:text-white"
            title="Refresh active network from API"
          >
            <RotateCw className={classNames('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('graph')}
              className="btn-primary text-xs flex items-center gap-1.5 px-3.5 py-2 shadow-glow"
            >
              <ArrowUpRight className="h-4 w-4" /> Full Graph Studio
            </button>
          )}
        </div>
      </header>

      {/* ── Disruption Alert Banner (Issue #14) ── */}
      {activeDisruption && (
        <DisruptionBanner
          disruption={activeDisruption}
          onDismiss={() => setActiveDisruption(null)}
          onFocusNode={(nodeId) => setSelectedId(nodeId)}
        />
      )}

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Network Nodes"
          value={formatNumber(kpi?.networkNodes ?? nodes.length)}
          sub="Suppliers, facilities, warehouses and markets"
          icon={<Network className="h-5 w-5" />}
          accent="cyan"
        />
        <KpiCard
          label="Active Disruptions"
          value={activeDisruption ? (kpi?.activeDisruptions ?? 0) + 1 : kpi?.activeDisruptions ?? 0}
          sub="Currently simulated or detected events"
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="rose"
          trend={{ value: '12%', up: true }}
        />
        <KpiCard
          label="At-Risk Nodes"
          value={formatNumber(kpi?.atRiskNodes ?? 0)}
          sub="Nodes with elevated disruption probability"
          icon={<ShieldAlert className="h-5 w-5" />}
          accent="amber"
          trend={{ value: '8%', up: true }}
        />
        <KpiCard
          label="Network Risk Score"
          value={
            <span
              className={classNames(
                riskLevel === 'Critical'
                  ? 'text-red-400'
                  : riskLevel === 'High'
                  ? 'text-rose-400'
                  : 'text-amber-400',
              )}
            >
              {kpi?.networkRiskScore.toFixed(1) ?? '28.0'}
              <span className="text-base text-slate-500"> / 100</span>
            </span>
          }
          sub={`Risk level: ${riskLevel}`}
          icon={<Gauge className="h-5 w-5" />}
          accent="amber"
        />
        <KpiCard
          label="Estimated Exposure"
          value={formatCurrency(kpi?.estimatedExposure ?? 0)}
          sub="Estimated potential economic impact"
          icon={<DollarSign className="h-5 w-5" />}
          accent="rose"
          trend={{ value: '5%', up: true }}
        />
      </div>

      {/* ── Main Graph Canvas with GNN Risk Overlay, Graph Selector & Toolbar ── */}
      <div className="card p-5 space-y-4">
        {/* Graph Header with Action Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Network className="h-5 w-5 text-accent-400" />
              Global Supply Chain Network
              <span className="chip bg-accent-500/10 text-accent-300 border border-accent-500/20 text-xs ml-1 font-mono">
                {nodes.length} Nodes · {edges.length} Routes
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Interactive GNN risk graph — choose demo networks, import .json files, or create custom nodes.
            </p>
          </div>

          {/* Graph Options & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Graph Switcher Dropdown */}
            <select
              onChange={(e) => {
                if (e.target.value === 'benchmark') {
                  handleResetBenchmark();
                } else if (e.target.value) {
                  handleLoadTemplate(e.target.value);
                }
              }}
              className="bg-ink-900 border border-cyan-500/30 text-xs text-cyan-300 rounded-lg px-2.5 py-1.5 focus:border-cyan-400 shadow-sm cursor-pointer"
              title="Quick switch between benchmark & industry demo graphs"
            >
              <option value="">⚡ Switch Graph Network…</option>
              <option value="benchmark">Benchmark Supply Chain (215 Nodes)</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.node_count}n)
                </option>
              ))}
            </select>

            {/* 1-Click Demo Graphs Button */}
            <button
              onClick={() => setShowDemoModal(true)}
              className="btn-outline border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 text-xs flex items-center gap-1.5 px-3 py-1.5 shadow-sm"
              title="Choose from 5 built-in 1-click industry demo graphs"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> 1-Click Demo Graphs (5)
            </button>

            {/* Import JSON Button */}
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-outline border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 text-xs flex items-center gap-1.5 px-3 py-1.5 shadow-sm"
              title="Import from 5 sample files or upload custom .json graph"
            >
              <Upload className="h-3.5 w-3.5 text-indigo-400" /> Import JSON (5 Datasets)
            </button>

            {/* Add Node Button */}
            <button
              onClick={handleOpenAddNodeModal}
              className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 shadow-glow"
              title="Create a new supply chain node"
            >
              <Plus className="h-3.5 w-3.5" /> Add Node
            </button>

            {/* Export JSON Button */}
            <button
              onClick={handleExportActiveGraph}
              disabled={nodes.length === 0}
              className="btn-outline text-xs flex items-center gap-1.5 px-2.5 py-1.5 text-slate-300 hover:text-white"
              title="Export active graph to JSON file"
            >
              <Download className="h-3 w-3" /> Export
            </button>
          </div>
        </div>

        {/* Filter Chips Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs text-slate-500 mr-1">Filter Type:</span>
          {nodeTypes.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={classNames(
                'chip border transition text-xs',
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

        {/* Risk Color Legend (Issue #14) */}
        <RiskLegend className="mb-2" />

        <GraphView
          nodes={filteredNodes}
          edges={edges}
          selectedId={selectedId}
          onSelectNode={setSelectedId}
          height="h-[580px]"
          searchQuery={search}
          predictionsMap={predictionsMap}
          originId={activeDisruption?.node_id}
        />
      </div>

      {/* ── 30/60/90-Day Timeline Slider & Risk Trend Charts (Issue #15) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimelineSlider
          selectedHorizon={selectedHorizon}
          onHorizonChange={handleHorizonChange}
          isLoading={isTimelineLoading}
        />
        <RiskTrendChart
          selectedNodeId={selectedNode?.id}
          selectedNodeName={selectedNode?.name}
          timelineData={timelineData}
          activeHorizon={selectedHorizon}
        />
      </div>

      {/* ── Disruption History Panel & AI Insights (Issue #15) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DisruptionHistoryPanel
          onSimulateDisruption={handleSimulateHistorical}
        />
        {insight && (
          <AIInsightPanel insight={insight} />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* 1-Click Demo Graphs Modal (5 Options)                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
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

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-500">Need the full 215-node dataset?</span>
              <button
                onClick={handleResetBenchmark}
                disabled={submitting}
                className="btn-outline text-xs px-3 py-1.5 text-cyan-300"
              >
                Reset to Benchmark (215 Nodes)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* Import Graph Files Modal (5 File Templates + Upload Custom)               */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="card p-6 w-full max-w-3xl border border-indigo-500/30 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Upload className="h-5 w-5 text-indigo-400" /> Import Graph Files (Custom .json or 5 Datasets)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload any .json file (e.g. supply_chain_nodes.json, gnn_nodes.json) or 1-click load pre-built datasets.
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
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click to browse or drop any .json file (handles raw nodes array, category dict, or nodes+edges)
                </p>
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
                {sampleFiles.map((sf) => (
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

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* Add Supply Chain Node Modal                                               */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
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
                    placeholder="e.g. SUP-901"
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
                    onChange={(e) => {
                      const t = e.target.value as NodeType;
                      const prefix = t === 'Supplier' ? 'SUP' : t === 'Port' ? 'PORT' : t === 'Manufacturer' ? 'MFG' : 'NODE';
                      setNodeForm({
                        ...nodeForm,
                        node_type: t,
                        node_id: `${prefix}-${Math.floor(100 + Math.random() * 900)}`,
                      });
                    }}
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
                  placeholder="e.g. Pacific Semiconductor Fab, Hamburg Logistics Hub"
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
                    placeholder="e.g. Japan, Germany, India, USA"
                    value={nodeForm.country}
                    onChange={(e) => setNodeForm({ ...nodeForm, country: e.target.value })}
                    className="input-field w-full py-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Tokyo, Munich, Mumbai"
                    value={nodeForm.city}
                    onChange={(e) => setNodeForm({ ...nodeForm, city: e.target.value })}
                    className="input-field w-full py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Capacity: {Math.round(nodeForm.capacity_utilization * 100)}%</label>
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
                  <label className="text-slate-400 block mb-1">Risk Score: {nodeForm.risk_score}/100</label>
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
    </div>
  );
}
