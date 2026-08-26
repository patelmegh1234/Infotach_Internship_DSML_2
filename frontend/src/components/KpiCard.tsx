import type { ReactNode } from 'react';
import { classNames } from '@/utils/helpers';

export function KpiCard({
  label,
  value,
  sub,
  icon,
  accent = 'cyan',
  trend,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  accent?: 'cyan' | 'amber' | 'rose' | 'emerald' | 'violet';
  trend?: { value: string; up: boolean };
}) {
  const accentMap: Record<string, string> = {
    cyan: 'text-accent-400 bg-accent-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    violet: 'text-violet-400 bg-violet-500/10',
  };
  return (
    <div className="card p-5 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {icon && (
          <div className={classNames('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', accentMap[accent])}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span className={trend.up ? 'text-emerald-400' : 'text-rose-400'}>
            {trend.up ? '▲' : '▼'} {trend.value}
          </span>
          <span className="text-slate-500">vs last week</span>
        </div>
      )}
    </div>
  );
}
