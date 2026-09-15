import { classNames } from '@/utils/helpers';

export interface RiskLegendItem {
  level: string;
  label: string;
  color: string;
  badgeClass?: string;
  description: string;
}

const items: RiskLegendItem[] = [
  {
    level: 'Critical',
    label: 'Critical Risk',
    color: '#ef4444',
    badgeClass: 'animate-ping',
    description: 'Severe bottleneck (>20d delay, pulsing)',
  },
  {
    level: 'High',
    label: 'High Risk',
    color: '#f97316',
    description: 'Impaired throughput (10-20d delay)',
  },
  {
    level: 'Medium',
    label: 'Medium Risk',
    color: '#eab308',
    description: 'Minor downstream ripple (3-10d delay)',
  },
  {
    level: 'Low',
    label: 'Low / Normal',
    color: '#22c55e',
    description: 'Stable nominal operations (<3d delay)',
  },
];

export function RiskLegend({ className }: { className?: string }) {
  return (
    <div className={classNames('flex flex-wrap items-center gap-x-6 gap-y-2 p-2.5 rounded-xl bg-ink-900/60 border border-white/5 backdrop-blur-sm', className)}>
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        GNN Risk Overlay:
      </span>
      {items.map((i) => (
        <div key={i.level} className="flex items-center gap-2 group relative cursor-help">
          <span className="relative flex h-2.5 w-2.5">
            {i.badgeClass && (
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: i.color }}
              />
            )}
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ backgroundColor: i.color, boxShadow: `0 0 8px ${i.color}99` }}
            />
          </span>
          <span className="text-xs font-medium text-slate-300">{i.label}</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">({i.description})</span>
        </div>
      ))}
    </div>
  );
}
