import type { RiskLevel } from '@/types';

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Moderate';
  return 'Low';
}

export function riskColor(level: RiskLevel): string {
  switch (level) {
    case 'Low':
      return 'text-emerald-400';
    case 'Moderate':
      return 'text-amber-400';
    case 'High':
      return 'text-rose-400';
    case 'Critical':
      return 'text-red-500';
  }
}

export function riskBg(level: RiskLevel): string {
  switch (level) {
    case 'Low':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'Moderate':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'High':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    case 'Critical':
      return 'bg-red-500/15 text-red-300 border-red-500/30';
  }
}

export function riskHex(level: RiskLevel): string {
  switch (level) {
    case 'Low':
      return '#10b981';
    case 'Moderate':
      return '#f59e0b';
    case 'High':
      return '#fb7185';
    case 'Critical':
      return '#ef4444';
  }
}

export function scoreHex(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#fb7185';
  if (score >= 40) return '#f59e0b';
  return '#10b981';
}

export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function classNames(...c: (string | false | undefined | null)[]): string {
  return c.filter(Boolean).join(' ');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
