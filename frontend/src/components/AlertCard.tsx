import { ChevronRight, Clock } from 'lucide-react';
import type { Alert } from '@/types';
import { classNames, riskBg, timeAgo } from '@/utils/helpers';

const severityDot = {
  Critical: 'bg-red-500',
  High: 'bg-rose-400',
  Moderate: 'bg-amber-400',
  Low: 'bg-emerald-400',
};

export function AlertCard({ alert, onView }: { alert: Alert; onView?: (a: Alert) => void }) {
  return (
    <div className="card p-4 hover:border-white/10 transition-all duration-300 flex items-start gap-3">
      <div className="mt-1 flex flex-col items-center gap-1">
        <span className={classNames('h-2.5 w-2.5 rounded-full animate-pulseGlow', severityDot[alert.severity])} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={classNames('chip border', riskBg(alert.severity))}>{alert.severity}</span>
          <span className="chip bg-white/5 text-slate-400 border border-white/5">{alert.category}</span>
          {alert.status !== 'active' && (
            <span className={classNames(
              'chip border',
              alert.status === 'acknowledged' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
            )}>
              {alert.status}
            </span>
          )}
        </div>
        <h3 className="text-sm font-medium text-white mt-2">{alert.title}</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{alert.description}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span className="font-mono">{alert.nodeId}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(alert.timestamp)}</span>
        </div>
      </div>
      {onView && (
        <button onClick={() => onView(alert)} className="btn-ghost px-2 py-1 -mr-2 -mt-1 text-slate-500 hover:text-accent-400">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
