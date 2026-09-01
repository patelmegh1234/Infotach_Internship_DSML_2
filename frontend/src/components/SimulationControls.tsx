import type { DisruptionType, Region, SupplyChainNode } from '@/types';
import { Zap, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { classNames } from '@/utils/helpers';

const disruptionTypes: DisruptionType[] = [
  'Natural Disaster',
  'Factory Shutdown',
  'Port Closure',
  'Supplier Failure',
  'Transportation Delay',
  'Cyber Attack',
  'Geopolitical Event',
  'Raw Material Shortage',
];

const regions: Region[] = ['Asia', 'Europe', 'North America', 'South America', 'Africa', 'Middle East', 'Global'];

export interface SimulationForm {
  type: DisruptionType;
  severity: number;
  durationDays: number;
  originNodeId: string;
  region: Region;
}

export function SimulationControls({
  nodes,
  onRun,
  onReset,
  running,
  initial,
}: {
  nodes: SupplyChainNode[];
  onRun: (form: SimulationForm) => void;
  onReset: () => void;
  running: boolean;
  initial?: Partial<SimulationForm>;
}) {
  const [type, setType] = useState<DisruptionType>(initial?.type ?? 'Supplier Failure');
  const [severity, setSeverity] = useState(initial?.severity ?? 75);
  const [duration, setDuration] = useState(initial?.durationDays ?? 14);
  const [origin, setOrigin] = useState(initial?.originNodeId ?? 'SUP-204');
  const [region, setRegion] = useState<Region>(initial?.region ?? 'Asia');
  const [originQuery, setOriginQuery] = useState('');

  const filteredNodes = originQuery
    ? nodes.filter((n) => n.name.toLowerCase().includes(originQuery.toLowerCase()) || n.id.toLowerCase().includes(originQuery.toLowerCase())).slice(0, 20)
    : nodes.slice(0, 20);

  const submit = () => {
    onRun({ type, severity, durationDays: duration, originNodeId: origin, region });
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-accent-500/15 border border-accent-500/30 flex items-center justify-center">
          <Zap className="h-4 w-4 text-accent-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Simulation Controls</h3>
          <p className="text-xs text-slate-500">Configure disruption parameters</p>
        </div>
      </div>

      <div>
        <label className="label">Disruption Type</label>
        <select value={type} onChange={(e) => setType(e.target.value as DisruptionType)} className="input">
          {disruptionTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="label !mb-0">Severity</label>
          <span className={classNames('text-xs font-mono', severity >= 80 ? 'text-red-400' : severity >= 60 ? 'text-rose-400' : severity >= 40 ? 'text-amber-400' : 'text-emerald-400')}>{severity}/100</span>
        </div>
        <input type="range" min={0} max={100} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="w-full accent-accent-500" />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>Minor</span><span>Moderate</span><span>Severe</span><span>Catastrophic</span>
        </div>
      </div>

      <div>
        <label className="label">Duration (days)</label>
        <input type="number" min={1} max={90} value={duration} onChange={(e) => setDuration(Math.max(1, Math.min(90, Number(e.target.value))))} className="input" />
      </div>

      <div>
        <label className="label">Origin Node</label>
        <div className="relative">
          <input
            value={originQuery}
            onChange={(e) => setOriginQuery(e.target.value)}
            placeholder="Search supplier, factory, port…"
            className="input mb-2"
          />
          <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="input">
            {filteredNodes.map((n) => (
              <option key={n.id} value={n.id}>{n.id} — {n.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Geographic Region</label>
        <select value={region} onChange={(e) => setRegion(e.target.value as Region)} className="input">
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={submit} disabled={running} className="btn-primary flex-1">
          {running ? (
            <><span className="h-4 w-4 rounded-full border-2 border-ink-950/40 border-t-ink-950 animate-spinSlow" /> Simulating…</>
          ) : (
            <><Play className="h-4 w-4" /> Run Simulation</>
          )}
        </button>
        <button onClick={onReset} disabled={running} className="btn-outline">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>
    </div>
  );
}
