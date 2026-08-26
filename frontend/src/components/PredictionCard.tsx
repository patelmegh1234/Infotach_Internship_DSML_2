import { AlertTriangle, Waves, TrendingDown, Route, ChevronRight } from 'lucide-react';
import type { RiskPrediction } from '@/types';
import { classNames, riskBg, riskLevelFromScore } from '@/utils/helpers';

const categoryIcon = {
  disruption: AlertTriangle,
  cascading: Waves,
  recovery: TrendingDown,
  opportunity: Route,
};

const categoryColor = {
  disruption: 'text-rose-400 bg-rose-500/10',
  cascading: 'text-amber-400 bg-amber-500/10',
  recovery: 'text-violet-400 bg-violet-500/10',
  opportunity: 'text-emerald-400 bg-emerald-500/10',
};

export function PredictionCard({
  prediction,
  onView,
}: {
  prediction: RiskPrediction;
  onView?: (p: RiskPrediction) => void;
}) {
  const Icon = categoryIcon[prediction.category];
  const level = riskLevelFromScore(prediction.probability);
  return (
    <div className="card p-5 hover:border-white/10 transition-all duration-300 group">
      <div className="flex items-start gap-3">
        <div className={classNames('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', categoryColor[prediction.category])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{prediction.title}</h3>
            <span className={classNames('chip border', riskBg(level))}>{level}</span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{prediction.description}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Metric label="Probability" value={`${prediction.probability}%`} />
        <Metric label="Confidence" value={`${prediction.confidence}%`} />
        <Metric label="Impact" value={prediction.impact} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>Probability</span>
          <span>{prediction.probability}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className={classNames(
              'h-full rounded-full transition-all duration-700',
              prediction.probability >= 80 ? 'bg-red-500' : prediction.probability >= 60 ? 'bg-rose-400' : prediction.probability >= 40 ? 'bg-amber-400' : 'bg-emerald-400',
            )}
            style={{ width: `${prediction.probability}%` }}
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-slate-500">Horizon: <span className="text-slate-300">{prediction.horizon}</span>{prediction.nodeId && <> · Node <span className="font-mono text-slate-300">{prediction.nodeId}</span></>}</span>
        {onView && (
          <button onClick={() => onView(prediction)} className="btn-ghost text-xs px-2 py-1 -mr-2 group-hover:text-accent-400">
            Details <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-900/50 border border-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}
