import { useState, useEffect } from 'react';
import { Calendar, Play, Pause, FastForward, Clock, Loader2 } from 'lucide-react';
import { classNames } from '@/utils/helpers';

export interface TimelineSliderProps {
  selectedHorizon: number; // 0, 30, 60, 90
  onHorizonChange: (horizon: number) => void;
  isLoading?: boolean;
}

const HORIZONS = [
  { days: 0, label: 'Real-Time', shortLabel: 'Now', desc: 'Current active state' },
  { days: 30, label: '30 Days', shortLabel: '30d', desc: 'Initial buffer depletion' },
  { days: 60, label: '60 Days', shortLabel: '60d', desc: 'Multi-tier propagation' },
  { days: 90, label: '90 Days', shortLabel: '90d', desc: 'Full network saturation' },
];

export function TimelineSlider({ selectedHorizon, onHorizonChange, isLoading = false }: TimelineSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-advance loop when play is active
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      const currentIndex = HORIZONS.findIndex((h) => h.days === selectedHorizon);
      const nextIndex = (currentIndex + 1) % HORIZONS.length;
      onHorizonChange(HORIZONS[nextIndex].days);
    }, 3000);

    return () => clearInterval(timer);
  }, [isPlaying, selectedHorizon, onHorizonChange]);

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-4 backdrop-blur-md shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Time-Horizon Forecast Slider
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />}
            </h3>
            <p className="text-[11px] text-slate-400">
              Predict ripple effect delays across 30, 60, and 90-day simulation horizons
            </p>
          </div>
        </div>

        {/* Play/Pause Auto Simulation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={classNames(
              'btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 transition',
              isPlaying ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200' : 'text-slate-300',
            )}
            title={isPlaying ? 'Pause timeline progression' : 'Auto-advance through horizons'}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5 text-cyan-400" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Auto-Play'}</span>
          </button>
        </div>
      </div>

      {/* Horizon Step Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {HORIZONS.map((h) => {
          const active = selectedHorizon === h.days;
          return (
            <button
              key={h.days}
              onClick={() => {
                setIsPlaying(false);
                onHorizonChange(h.days);
              }}
              className={classNames(
                'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200',
                active
                  ? 'bg-cyan-500/15 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/30'
                  : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10',
              )}
            >
              <div className="flex items-center gap-1">
                <Clock className={classNames('h-3 w-3', active ? 'text-cyan-400' : 'text-slate-500')} />
                <span className={classNames('text-xs font-bold font-mono', active ? 'text-cyan-200' : 'text-slate-300')}>
                  {h.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 hidden md:block">
                {h.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Range Track Indicator */}
      <div className="mt-3 px-1">
        <input
          type="range"
          min="0"
          max="90"
          step="30"
          value={selectedHorizon}
          onChange={(e) => {
            setIsPlaying(false);
            onHorizonChange(Number(e.target.value));
          }}
          className="w-full h-1.5 bg-ink-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
          <span>T+0d</span>
          <span>T+30d</span>
          <span>T+60d</span>
          <span>T+90d</span>
        </div>
      </div>
    </div>
  );
}
