import { useEffect, useMemo, useState } from 'react';
import { AlertCard } from '@/components/AlertCard';
import { LoadingState, EmptyState } from '@/components/LoadingState';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { classNames, formatTimestamp, timeAgo } from '@/utils/helpers';
import type { Alert, RiskLevel } from '@/types';
import { Bell, X, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

const severities: (RiskLevel | 'All')[] = ['All', 'Critical', 'High', 'Moderate', 'Low'];
type StatusFilter = 'All' | 'active' | 'acknowledged' | 'resolved';
const statuses: StatusFilter[] = ['All', 'active', 'acknowledged', 'resolved'];

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [sev, setSev] = useState<(typeof severities)[number]>('All');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [selected, setSelected] = useState<Alert | null>(null);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      const a = await api.getAlerts();
      if (!alive) return;
      setAlerts(a);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (sev !== 'All' && a.severity !== sev) return false;
      if (status !== 'All' && a.status !== status) return false;
      return true;
    });
  }, [alerts, sev, status]);

  const counts = useMemo(() => ({
    Critical: alerts.filter((a) => a.severity === 'Critical').length,
    High: alerts.filter((a) => a.severity === 'High').length,
    Moderate: alerts.filter((a) => a.severity === 'Moderate').length,
    Low: alerts.filter((a) => a.severity === 'Low').length,
  }), [alerts]);

  if (loading) return <LoadingState label="Loading alerts…" />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Supply Chain Alerts</h1>
          <p className="mt-1 text-sm text-slate-400">Realtime alerts on disruption probability, congestion and dependency concentration.</p>
        </div>
        <div className="flex items-center gap-2">
          {(['Critical', 'High', 'Moderate', 'Low'] as RiskLevel[]).map((s) => (
            <div key={s} className="card px-3 py-2 flex items-center gap-2">
              <span className={classNames('h-2 w-2 rounded-full',
                s === 'Critical' ? 'bg-red-500' : s === 'High' ? 'bg-rose-400' : s === 'Moderate' ? 'bg-amber-400' : 'bg-emerald-400')} />
              <span className="text-xs text-slate-400">{s}</span>
              <span className="text-xs font-semibold text-white">{counts[s]}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {severities.map((s) => (
            <button
              key={s}
              onClick={() => setSev(s)}
              className={classNames('chip border transition', sev === s ? 'bg-accent-500/15 text-accent-300 border-accent-500/30' : 'bg-white/5 text-slate-400 border-white/5')}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={classNames('chip border transition capitalize', status === s ? 'bg-accent-500/15 text-accent-300 border-accent-500/30' : 'bg-white/5 text-slate-400 border-white/5')}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-0">
          <EmptyState icon={<Bell className="h-10 w-10" />} title="No alerts match your filters" message="Try adjusting severity or status filters." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((a) => (
            <AlertCard key={a.id} alert={a} onView={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setSelected(null)}>
          <div className="glass-strong rounded-2xl p-6 w-full max-w-lg shadow-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <ShieldAlert className="h-5 w-5 text-rose-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">{selected.title}</h2>
                  <p className="text-xs text-slate-500">{formatTimestamp(selected.timestamp)} · {timeAgo(selected.timestamp)}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost px-2 text-slate-500"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">{selected.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Info label="Node" value={selected.nodeId} mono />
              <Info label="Severity" value={selected.severity} />
              <Info label="Category" value={selected.category} />
              <Info label="Status" value={selected.status} />
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => { toast.push({ kind: 'success', title: 'Alert acknowledged', message: `${selected.nodeId} alert marked as acknowledged.` }); setSelected(null); }} className="btn-primary flex-1">
                <CheckCircle2 className="h-4 w-4" /> Acknowledge
              </button>
              <button onClick={() => { toast.push({ kind: 'info', title: 'Monitoring', message: `Now monitoring ${selected.nodeId} with 4h cadence.` }); setSelected(null); }} className="btn-outline flex-1">
                <Clock className="h-4 w-4" /> Monitor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-ink-900/50 border border-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={classNames('text-sm text-white mt-0.5', mono && 'font-mono')}>{value}</p>
    </div>
  );
}
