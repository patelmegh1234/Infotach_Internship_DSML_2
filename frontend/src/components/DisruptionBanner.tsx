import { AlertTriangle, Flame, ShieldAlert, X, ArrowRight, Radio } from 'lucide-react';
import type { HistoricalDisruption } from '@/types';

export interface DisruptionBannerProps {
  disruption: HistoricalDisruption | null;
  onDismiss: () => void;
  onFocusNode?: (nodeId: string) => void;
}

export function DisruptionBanner({ disruption, onDismiss, onFocusNode }: DisruptionBannerProps) {
  if (!disruption) return null;

  const severityPct = Math.round((disruption.severity > 1 ? disruption.severity : disruption.severity * 100));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-950/90 via-red-900/60 to-ink-950/95 p-4 shadow-[0_0_30px_rgba(239,68,68,0.25)] backdrop-blur-md animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left icon & summary */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 border border-red-500/40 text-red-400">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-xl bg-red-400 opacity-30" />
            <Flame className="h-5 w-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                <Radio className="h-3 w-3 animate-pulse text-red-400" />
                Live Disruption Detected
              </span>
              <span className="text-xs font-mono text-slate-300">
                Origin: <strong className="text-white font-bold">{disruption.node_id}</strong>
              </span>
              {disruption.location && (
                <span className="text-xs text-slate-400">
                  • {disruption.location}
                </span>
              )}
            </div>

            <p className="mt-1 text-sm font-medium text-slate-100 line-clamp-1">
              {disruption.source_headline || `${disruption.disruption_type.toUpperCase()} alert triggered at ${disruption.node_id}`}
            </p>
          </div>
        </div>

        {/* Right metrics & actions */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="text-right hidden md:block">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Severity</div>
            <div className="text-sm font-bold font-mono text-red-400">{severityPct}%</div>
          </div>

          {onFocusNode && disruption.node_id && (
            <button
              onClick={() => onFocusNode(disruption.node_id)}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 border-red-500/30 hover:border-red-500/60 text-red-200"
            >
              Focus Node <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={onDismiss}
            aria-label="Dismiss banner"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
