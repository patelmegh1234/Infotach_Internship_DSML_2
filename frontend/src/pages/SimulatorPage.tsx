import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Eye, EyeOff, Waves, Activity, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { SimulationControls, type SimulationForm } from '@/components/SimulationControls';
import { GraphView } from '@/components/graph/GraphView';
import { RiskLegend } from '@/components/graph/RiskLegend';
import { AIInsightPanel } from '@/components/AIInsightPanel';
import { EmptyState } from '@/components/LoadingState';
import { api, type SimulationResult } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, classNames } from '@/utils/helpers';
import type { SupplyChainNode, SupplyChainEdge } from '@/types';

export function SimulatorPage() {
  const [nodes, setNodes] = useState<SupplyChainNode[]>([]);
  const [edges, setEdges] = useState<SupplyChainEdge[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [propStep, setPropStep] = useState(0);
  const [hideUnaffected, setHideUnaffected] = useState(false);
  const playTimer = useRef<number | null>(null);

  const toast = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      const net = await api.getNetwork();
      if (!alive) return;
      setNodes(net.nodes);
      setEdges(net.edges);
    })();
    return () => { alive = false; };
  }, []);

  const run = async (form: SimulationForm) => {
    setRunning(true);
    setResult(null);
    setPropStep(0);
    setPlaying(false);
    try {
      const res = await api.simulate(form);
      setResult(res);
      setPropStep(Object.keys(res.propagationLevels).length);
      toast.push({ kind: 'success', title: 'Simulation complete', message: `${res.affectedNodes.length} nodes affected across ${Object.keys(res.propagationLevels).length - 1} layers.` });
    } catch {
      toast.push({ kind: 'error', title: 'Simulation failed', message: 'Could not run the simulation. Try again.' });
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setResult(null);
    setPropStep(0);
    setPlaying(false);
    if (playTimer.current) window.clearInterval(playTimer.current);
  };

  const play = () => {
    if (!result) return;
    setPlaying(true);
    const maxStep = Object.keys(result.propagationLevels).length;
    setPropStep(1);
    if (playTimer.current) window.clearInterval(playTimer.current);
    playTimer.current = window.setInterval(() => {
      setPropStep((s) => {
        if (s >= maxStep) {
          if (playTimer.current) window.clearInterval(playTimer.current);
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 900);
  };

  const pause = () => {
    setPlaying(false);
    if (playTimer.current) window.clearInterval(playTimer.current);
  };

  const visibleAffected = useMemo(() => {
    if (!result) return [];
    let acc: string[] = [];
    for (let i = 0; i <= propStep; i++) {
      const lvl = result.propagationLevels[String(i)];
      if (lvl) acc = [...acc, ...lvl];
    }
    return acc;
  }, [result, propStep]);

  const levelCounts = useMemo(() => {
    if (!result) return [] as { level: number; count: number; nodes: string[] }[];
    return Object.entries(result.propagationLevels).map(([k, v]) => ({ level: Number(k), count: v.length, nodes: v as string[] }));
  }, [result]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <header>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Disruption Simulator</h1>
        <p className="mt-1 text-sm text-slate-400">Simulate localized disruptions and observe how risk propagates across the supply-chain network.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <SimulationControls nodes={nodes} onRun={run} onReset={reset} running={running} />
        </div>

        <div className="lg:col-span-2 space-y-5">
          {!result && !running && (
            <div className="card p-0 h-[420px] flex items-center justify-center">
              <EmptyState
                icon={<Waves className="h-10 w-10" />}
                title="No simulation yet"
                message="Configure a disruption and run the simulation to visualize ripple effects across the network."
              />
            </div>
          )}

          {running && (
            <div className="card p-0 h-[420px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-14 w-14">
                  <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-400 animate-spinSlow" />
                  <Waves className="absolute inset-0 m-auto h-5 w-5 text-accent-400 animate-pulseGlow" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-white font-medium">Simulating disruption propagation…</p>
                  <p className="text-xs text-slate-500 mt-1">Running graph traversal and risk model</p>
                </div>
              </div>
            </div>
          )}

          {result && !running && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat icon={Activity} label="Affected Nodes" value={String(result.affectedNodes.length)} accent="rose" />
                <MiniStat icon={DollarSign} label="Estimated Loss" value={formatCurrency(result.event.estimatedLoss)} accent="amber" />
                <MiniStat icon={TrendingUp} label="Risk Score" value={`${result.event.riskScore}/100`} accent="violet" />
                <MiniStat icon={Clock} label="Recovery Time" value={`${result.event.recoveryTimeDays}d`} accent="cyan" />
              </div>

              <div className="card p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">Disruption Ripple Effect</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Origin: <span className="font-mono text-accent-400">{result.event.originNodeId}</span> · {result.event.type}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!playing ? (
                      <button onClick={play} className="btn-primary text-xs px-3 py-1.5"><Play className="h-3.5 w-3.5" /> Play</button>
                    ) : (
                      <button onClick={pause} className="btn-outline text-xs px-3 py-1.5"><Pause className="h-3.5 w-3.5" /> Pause</button>
                    )}
                    <button onClick={() => { pause(); setPropStep(Object.keys(result.propagationLevels).length); }} className="btn-ghost text-xs px-3 py-1.5"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
                    <button onClick={() => setHideUnaffected((h) => !h)} className="btn-ghost text-xs px-3 py-1.5">
                      {hideUnaffected ? <><EyeOff className="h-3.5 w-3.5" /> Show all</> : <><Eye className="h-3.5 w-3.5" /> Hide unaffected</>}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {levelCounts.map((l) => (
                    <button
                      key={l.level}
                      onClick={() => setPropStep(l.level)}
                      className={classNames(
                        'chip border transition',
                        propStep === l.level ? 'bg-accent-500/15 text-accent-300 border-accent-500/30' : 'bg-white/5 text-slate-400 border-white/5',
                      )}
                    >
                      Level {l.level} · {l.count}
                    </button>
                  ))}
                </div>

                <RiskLegend className="mb-3" />

                <GraphView
                  nodes={nodes}
                  edges={edges}
                  affectedIds={visibleAffected}
                  originId={result.event.originNodeId}
                  hideUnaffected={hideUnaffected}
                  height="h-[460px]"
                />
              </div>

              <AIInsightPanel insight={result.insights} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, accent }: { icon: typeof Activity; label: string; value: string; accent: 'cyan' | 'amber' | 'rose' | 'violet' }) {
  const map = { cyan: 'text-accent-400 bg-accent-500/10', amber: 'text-amber-400 bg-amber-500/10', rose: 'text-rose-400 bg-rose-500/10', violet: 'text-violet-400 bg-violet-500/10' };
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={classNames('h-9 w-9 rounded-lg flex items-center justify-center', map[accent])}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-white truncate">{value}</p>
      </div>
    </div>
  );
}
