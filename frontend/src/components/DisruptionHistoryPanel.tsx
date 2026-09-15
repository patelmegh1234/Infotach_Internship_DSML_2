import { useState, useEffect } from 'react';
import { History, Play, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import type { HistoricalDisruption } from '@/types';
import { classNames } from '@/utils/helpers';

export interface DisruptionHistoryPanelProps {
  onSimulateDisruption?: (event: HistoricalDisruption) => void;
}

export function DisruptionHistoryPanel({ onSimulateDisruption }: DisruptionHistoryPanelProps) {
  const [history, setHistory] = useState<HistoricalDisruption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getDisruptionHistory();
      setHistory(res.history || []);
    } catch {
      // fallback handled in api.ts
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-4 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Disruption Event History</h3>
            <p className="text-[11px] text-slate-400">Audit log of historical and simulated supply chain shocks</p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          aria-label="Refresh history"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          title="Refresh history"
        >
          <RefreshCw className={classNames('h-3.5 w-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {history.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No disruption events recorded.
          </div>
        ) : (
          history.map((item) => {
            const sevPct = Math.round(item.severity > 1 ? item.severity : item.severity * 100);
            const isActive = item.status === 'active';

            return (
              <div
                key={item.disruption_id}
                className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all group"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={classNames(
                      'mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center shrink-0 border',
                      isActive
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                    )}
                  >
                    {isActive ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-white">
                        {item.node_id}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-white/5 text-slate-300 border border-white/10">
                        {item.disruption_type}
                      </span>
                      <span
                        className={classNames(
                          'text-[10px] font-mono font-bold px-1.5 py-0.2 rounded',
                          sevPct >= 75
                            ? 'text-red-400 bg-red-500/10'
                            : sevPct >= 50
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-emerald-400 bg-emerald-500/10',
                        )}
                      >
                        {sevPct}% Sev
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 mt-0.5 truncate" title={item.source_headline}>
                      {item.source_headline || `${item.location || 'Global'} - ${item.estimated_duration_days || 14} days duration`}
                    </p>

                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {item.detected_at ? new Date(item.detected_at).toLocaleString() : 'Recent'}
                    </div>
                  </div>
                </div>

                {onSimulateDisruption && (
                  <button
                    onClick={() => onSimulateDisruption(item)}
                    className="btn-secondary text-[11px] px-2.5 py-1 flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 hover:border-cyan-500/50 hover:text-cyan-300 transition ml-2"
                  >
                    <Play className="h-3 w-3" />
                    Replay
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
