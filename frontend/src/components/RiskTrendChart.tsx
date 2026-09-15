import { useState, useMemo } from 'react';
import { TrendingUp, Clock, Info } from 'lucide-react';
import { classNames } from '@/utils/helpers';

export interface NodeTrendPoint {
  horizon: string;
  days: number;
  delay: number;
  risk: number;
}

export interface RiskTrendChartProps {
  selectedNodeId?: string | null;
  selectedNodeName?: string | null;
  timelineData?: Record<string, any[]> | null;
  activeHorizon?: number;
}

export function RiskTrendChart({
  selectedNodeId,
  selectedNodeName,
  timelineData,
  activeHorizon = 30,
}: RiskTrendChartProps) {
  // Extract trend data points for the selected node or aggregate
  const trendPoints: NodeTrendPoint[] = useMemo(() => {
    const horizons = [
      { key: '0', days: 0, label: '0d (Now)' },
      { key: '30_days', days: 30, label: '30d' },
      { key: '60_days', days: 60, label: '60d' },
      { key: '90_days', days: 90, label: '90d' },
    ];

    if (!timelineData) {
      // Default hypothetical trend if timelineData not yet loaded
      return [
        { horizon: '0d (Now)', days: 0, delay: 2.0, risk: 25 },
        { horizon: '30d', days: 30, delay: 8.5, risk: 48 },
        { horizon: '60d', days: 60, delay: 17.2, risk: 68 },
        { horizon: '90d', days: 90, delay: 26.8, risk: 82 },
      ];
    }

    return horizons.map((h) => {
      if (h.days === 0) {
        return { horizon: h.label, days: 0, delay: 1.5, risk: 20 };
      }

      const preds = timelineData[h.key] || [];
      const match = selectedNodeId ? preds.find((p: any) => p.node_id === selectedNodeId) : preds[0];

      if (match) {
        const d = Number(match.predicted_delay_days ?? match.delay_days ?? 0);
        const r = Number(match.risk_score ? (match.risk_score > 1 ? match.risk_score : match.risk_score * 100) : 30);
        return { horizon: h.label, days: h.days, delay: Math.round(d * 10) / 10, risk: Math.round(r) };
      }

      // Aggregate network average
      const avgDelay = preds.length > 0
        ? preds.reduce((acc: number, p: any) => acc + Number(p.predicted_delay_days ?? p.delay_days ?? 0), 0) / preds.length
        : 10 + h.days * 0.2;
      return {
        horizon: h.label,
        days: h.days,
        delay: Math.round(avgDelay * 10) / 10,
        risk: Math.min(100, Math.round(30 + h.days * 0.5)),
      };
    });
  }, [timelineData, selectedNodeId]);

  // Compute SVG coordinates for the line chart
  const maxDelay = Math.max(...trendPoints.map((p) => p.delay), 15);
  const chartHeight = 110;
  const chartWidth = 320;
  const paddingX = 35;
  const paddingY = 15;

  const points = trendPoints.map((p, idx) => {
    const x = paddingX + (idx / (trendPoints.length - 1)) * (chartWidth - 2 * paddingX);
    const y = chartHeight - paddingY - (p.delay / maxDelay) * (chartHeight - 2 * paddingY);
    return { ...p, x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${points[0].x},${chartHeight - paddingY} ${polylinePoints} ${points[points.length - 1].x},${chartHeight - paddingY}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-4 backdrop-blur-md shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Cascade Delay Trajectory
            </h4>
            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
              {selectedNodeName || (selectedNodeId ? `Node ${selectedNodeId}` : 'Network Mean Projection')}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-400">Max Delay</span>
          <div className="text-xs font-bold font-mono text-amber-400">+{maxDelay.toFixed(1)}d</div>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div className="relative w-full flex justify-center py-1">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-28 overflow-visible">
          <defs>
            <linearGradient id="delayAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="rgba(255,255,255,0.12)" />

          {/* Area fill */}
          <polygon points={areaPoints} fill="url(#delayAreaGrad)" />

          {/* Line */}
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylinePoints}
          />

          {/* Data Points */}
          {points.map((p) => {
            const isCurrentHorizon = activeHorizon === p.days;
            return (
              <g key={p.days} className="cursor-pointer group">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isCurrentHorizon ? 5.5 : 4}
                  fill={isCurrentHorizon ? '#ef4444' : '#f59e0b'}
                  stroke="#090d16"
                  strokeWidth="2"
                  className={classNames(isCurrentHorizon && 'animate-pulse')}
                />
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-300 font-mono font-bold"
                >
                  +{p.delay}d
                </text>
                <text
                  x={p.x}
                  y={chartHeight - 2}
                  textAnchor="middle"
                  className={classNames(
                    'text-[9px] font-mono',
                    isCurrentHorizon ? 'fill-cyan-300 font-bold' : 'fill-slate-500',
                  )}
                >
                  {p.horizon}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-cyan-400" />
          Selected Horizon: <strong className="text-cyan-300 font-mono">{activeHorizon}d</strong>
        </span>
        <span className="text-slate-500 font-mono">GNN Sage Conv</span>
      </div>
    </div>
  );
}
