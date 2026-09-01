import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { ChartCard } from '@/components/ChartCard';
import { LoadingState, EmptyState } from '@/components/LoadingState';
import { RiskBadge } from '@/components/RiskBadge';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { classNames, formatCurrency, riskLevelFromScore } from '@/utils/helpers';
import type { Scenario } from '@/types';
import { FlaskConical, Plus, GitCompare, X, Zap } from 'lucide-react';

const tooltipStyle = {
  backgroundColor: 'rgba(12,19,34,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#e2e8f0',
};

export function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await api.getScenarios();
      if (!alive) return;
      setScenarios(s);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        toast.push({ kind: 'warning', title: 'Max 3 scenarios', message: 'You can compare up to 3 scenarios at once.' });
        return prev;
      }
      return [...prev, id];
    });
  };

  const compareScenarios = useMemo(() => scenarios.filter((s) => compareIds.includes(s.id)), [scenarios, compareIds]);

  const compareData = ['severity', 'nodesAffected', 'riskScore', 'estimatedLoss', 'recoveryTimeDays'].map((metric) => {
    const row: Record<string, string | number> = { metric };
    compareScenarios.forEach((s) => {
      const v = s[metric as keyof Scenario] as number;
      row[s.name] = metric === 'estimatedLoss' ? v / 1_000_000 : v;
    });
    return row;
  });

  const radarData = useMemo(() => {
    const axes = ['Severity', 'Nodes', 'Risk', 'Loss', 'Recovery'];
    return axes.map((axis, i) => {
      const row: Record<string, string | number> = { axis };
      compareScenarios.forEach((s) => {
        const vals = [s.severity, s.nodesAffected, s.riskScore, s.estimatedLoss / 200_000, s.recoveryTimeDays];
        row[s.name] = vals[i] ?? 0;
      });
      return row;
    });
  }, [compareScenarios]);

  if (loading) return <LoadingState label="Loading scenarios…" />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Scenario Lab</h1>
          <p className="mt-1 text-sm text-slate-400">Create and compare hypothetical disruption scenarios.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (compareIds.length < 2) { toast.push({ kind: 'warning', title: 'Select 2+ scenarios', message: 'Select at least 2 scenarios to compare.' }); return; } setShowCompare(true); }}
            disabled={compareIds.length < 2}
            className="btn-outline text-sm"
          >
            <GitCompare className="h-4 w-4" /> Compare ({compareIds.length})
          </button>
          <button onClick={() => toast.push({ kind: 'info', title: 'New scenario', message: 'Scenario builder will open in the next release.' })} className="btn-primary text-sm">
            <Plus className="h-4 w-4" /> New Scenario
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {scenarios.map((s) => {
          const level = riskLevelFromScore(s.riskScore);
          const selected = compareIds.includes(s.id);
          return (
            <div key={s.id} className={classNames('card p-5 transition-all duration-300', selected ? 'border-accent-500/40 shadow-glow-sm' : 'hover:border-white/10')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <FlaskConical className="h-4.5 w-4.5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{s.name}</h3>
                    <p className="text-[11px] text-slate-500">{s.type}</p>
                  </div>
                </div>
                <RiskBadge level={level} />
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">{s.description}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Field label="Severity" value={`${s.severity}/100`} />
                <Field label="Duration" value={`${s.durationDays} days`} />
                <Field label="Origin" value={s.originNode} mono />
                <Field label="Region" value={s.region} />
                <Field label="Nodes Affected" value={String(s.nodesAffected)} />
                <Field label="Recovery" value={`${s.recoveryTimeDays}d`} />
                <Field label="Est. Loss" value={formatCurrency(s.estimatedLoss)} />
                <Field label="Risk Score" value={`${s.riskScore}/100`} />
              </div>

              <button
                onClick={() => toggleCompare(s.id)}
                className={classNames('mt-4 w-full btn text-xs', selected ? 'bg-accent-500/15 text-accent-300 border border-accent-500/30' : 'border border-white/10 text-slate-300 hover:bg-white/5')}
              >
                {selected ? <><X className="h-3.5 w-3.5" /> Remove from compare</> : <><Plus className="h-3.5 w-3.5" /> Add to compare</>}
              </button>
            </div>
          );
        })}
      </div>

      {showCompare && compareScenarios.length >= 2 && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2"><GitCompare className="h-4 w-4 text-accent-400" /> Side-by-side Comparison</h2>
            <button onClick={() => setShowCompare(false)} className="btn-ghost text-xs px-2 py-1"><X className="h-3.5 w-3.5" /> Close</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Metric Comparison" subtitle="Normalized across selected scenarios">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={compareData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  {compareScenarios.map((s, i) => (
                    <Bar key={s.id} dataKey={s.name} fill={['#22d3ee', '#fb7185', '#a78bfa'][i % 3]} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Risk Profile Radar" subtitle="Multi-dimensional comparison">
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData} outerRadius={100}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
                  {compareScenarios.map((s, i) => (
                    <Radar key={s.id} name={s.name} dataKey={s.name} stroke={['#22d3ee', '#fb7185', '#a78bfa'][i % 3]} fill={['#22d3ee', '#fb7185', '#a78bfa'][i % 3]} fillOpacity={0.15} strokeWidth={2} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {scenarios.length === 0 && (
        <div className="card p-0">
          <EmptyState icon={<Zap className="h-10 w-10" />} title="No scenarios yet" message="Create your first disruption scenario to start comparing." />
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-ink-900/40 border border-white/5 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={classNames('text-xs text-white mt-0.5', mono && 'font-mono')}>{value}</p>
    </div>
  );
}
