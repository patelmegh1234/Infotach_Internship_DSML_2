import { Sparkles, ArrowRight, Lightbulb } from 'lucide-react';
import type { AIInsight } from '@/types';

export function AIInsightPanel({
  insight,
  compact,
}: {
  insight: AIInsight;
  compact?: boolean;
}) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-accent-500/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-8 w-8 rounded-lg bg-accent-500/15 border border-accent-500/30 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-accent-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
            <p className="text-[11px] text-slate-500">Confidence {insight.confidence}% · {insight.affectedNodes} nodes affected</p>
          </div>
          <span className="ml-auto chip bg-accent-500/10 text-accent-300 border border-accent-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400 animate-pulseGlow" />
            AI Live
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">{insight.body}</p>

        {!compact && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2.5">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recommended Actions</p>
            </div>
            <ol className="space-y-2">
              {insight.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-500/10 text-accent-400 text-[11px] font-semibold">
                    {i + 1}
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {insight.originNode && (
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <ArrowRight className="h-3.5 w-3.5" />
            <span>Origin: <span className="text-slate-300 font-mono">{insight.originNode}</span> · Highest-risk region: <span className="text-slate-300">{insight.highestRiskRegion}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
