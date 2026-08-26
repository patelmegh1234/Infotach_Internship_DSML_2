import { classNames } from '@/utils/helpers';
import type { ReactNode } from 'react';

export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={classNames('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-400 animate-spinSlow" />
      </div>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse mb-2" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && <div className="mb-4 text-slate-500">{icon}</div>}
      <h3 className="text-base font-medium text-slate-200">{title}</h3>
      {message && <p className="text-sm text-slate-500 mt-1.5 max-w-sm">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
