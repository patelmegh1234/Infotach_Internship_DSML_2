import { classNames } from '@/utils/helpers';

const items = [
  { label: 'Low Risk', color: '#10b981' },
  { label: 'Moderate Risk', color: '#f59e0b' },
  { label: 'High Risk', color: '#fb7185' },
  { label: 'Critical Risk', color: '#ef4444' },
];

export function RiskLegend({ className }: { className?: string }) {
  return (
    <div className={classNames('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: i.color, boxShadow: `0 0 8px ${i.color}66` }} />
          <span className="text-xs text-slate-400">{i.label}</span>
        </div>
      ))}
    </div>
  );
}
