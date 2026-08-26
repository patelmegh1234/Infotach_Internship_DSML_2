import type { RiskLevel } from '@/types';
import { riskBg, classNames } from '@/utils/helpers';

export function RiskBadge({
  level,
  score,
  className,
}: {
  level?: RiskLevel;
  score?: number;
  className?: string;
}) {
  const lvl = level ?? (score !== undefined ? (score >= 80 ? 'Critical' : score >= 60 ? 'High' : score >= 40 ? 'Moderate' : 'Low') : 'Low');
  return (
    <span
      className={classNames(
        'chip border',
        riskBg(lvl),
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {lvl}
    </span>
  );
}
