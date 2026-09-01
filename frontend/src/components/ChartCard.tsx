import type { ReactNode } from 'react';
import { classNames } from '@/utils/helpers';

export function ChartCard({
  title,
  subtitle,
  children,
  action,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={classNames('card p-5', className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
