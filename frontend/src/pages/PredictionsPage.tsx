import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PredictionCard } from '@/components/PredictionCard';
import { ChartCard } from '@/components/ChartCard';
import { LoadingState } from '@/components/LoadingState';
import { api } from '@/services/api';
import { classNames } from '@/utils/helpers';
import type { RiskPrediction } from '@/types';
import { Brain, X, Zap, Activity } from 'lucide-react';

const tooltipStyle = {
  backgroundColor: 'rgba(12,19,34,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#e2e8f0',
};

export function PredictionsPage() {
  const [predictions, setPredictions] = useState<RiskPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RiskPrediction | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await api.getPredictions();
      if (!alive) return;
      setPredictions(p);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <LoadingState label="Loading AI predictions…" />;

  const timeline = selected?.timeline ?? predictions[0]?.timeline ?? [];
  const active = selected ?? predictions[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">AI Prediction Center</h1>
          <p className="mt-1 text-sm text-slate-400">Graph-based predictions of cascading disruptions and recovery trajectories.</p>
        </div>
        <span className="chip bg-accent-500/10 text-accent-300 border border-accent-500/20">
          <Brain className="h-3.5 w-3.5" /> PyTorch Geometric model
        </span>
      </header>

      {predictions.length === 0 ? (
        <div className="card p-12 text-center space-y-4 border-dashed border-white/10">
          <div className="h-12 w-12 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 flex items-center justify-center mx-auto">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">No Predictions Generated Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Add supply chain nodes or run a disruption simulation in the Simulator to calculate GNN cascading delay predictions.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {predictions.map((p) => (
              <PredictionCard key={p.id} prediction={p} onView={(pp) => setSelected(pp)} />
            ))}
          </div>

          <ChartCard
            title="Prediction Timeline"
            subtitle={active ? `${active.title} — predicted affected nodes over time` : 'Predicted affected nodes over time'}
            action={selected ? (
              <button onClick={() => setSelected(null)} className="btn-ghost text-xs px-2 py-1"><X className="h-3.5 w-3.5" /> Clear selection</button>
            ) : undefined}
          >
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={timeline} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="affectedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="t" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(34,211,238,0.3)' }} />
                <Area type="monotone" dataKey="affected" name="Affected Nodes" stroke="#22d3ee" strokeWidth={2} fill="url(#affectedGrad)" />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.05)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span>Horizon: <span className="text-slate-300">0h → 24h → 48h → 72h → 7 days</span></span>
              <span className="ml-auto">Peak affected: <span className="text-accent-400 font-mono">{Math.max(...timeline.map((t) => t.affected), 0)}</span></span>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
}
