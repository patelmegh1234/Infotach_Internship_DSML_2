import type { DisruptionType, Region, SupplyChainNode } from '@/types';
import { Zap, Play, RotateCcw, AlertCircle, Newspaper, Sparkles, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { classNames } from '@/utils/helpers';
import { api } from '@/services/api';

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

const SAMPLE_HEADLINES = [
  'Port workers in Rotterdam begin indefinite strike over wage disputes',
  'Super Typhoon forces emergency shutdown of Port of Shanghai container terminals',
  'Magnitude 7.2 earthquake halts production at TSMC semiconductor fabrication facilities in Taiwan',
  'Massive fire breaks out at BASF chemical synthesis facility in Ludwigshafen',
  'Tata Steel halts rail freight dispatches amid widespread railway union strikes in eastern India',
];

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
  const [activeTab, setActiveTab] = useState<'manual' | 'nlp'>('nlp');
  const [type, setType] = useState<DisruptionType>(initial?.type ?? 'Supplier Failure');
  const [severity, setSeverity] = useState(initial?.severity ?? 75);
  const [duration, setDuration] = useState(initial?.durationDays ?? 14);
  const [origin, setOrigin] = useState(initial?.originNodeId ?? (nodes[0]?.id || ''));
  const [region, setRegion] = useState<Region>(initial?.region ?? 'Global');
  const [originQuery, setOriginQuery] = useState('');

  // NLP extraction state
  const [headline, setHeadline] = useState(SAMPLE_HEADLINES[0]);
  const [extracting, setExtracting] = useState(false);
  const [extractedEvent, setExtractedEvent] = useState<any | null>(null);

  useEffect(() => {
    if (!origin && nodes.length > 0) {
      setOrigin(nodes[0].id);
    }
  }, [nodes, origin]);

  const filteredNodes = originQuery
    ? nodes.filter((n) => n.name.toLowerCase().includes(originQuery.toLowerCase()) || n.id.toLowerCase().includes(originQuery.toLowerCase())).slice(0, 30)
    : nodes.slice(0, 30);

  const handleExtractNlp = async () => {
    if (!headline.trim()) return;
    setExtracting(true);
    setExtractedEvent(null);
    try {
      const res = await api.extractNlpDisruption(headline.trim());
      if (res && res.event) {
        const ev = res.event;
        setExtractedEvent(ev);

        // Map disruption category to frontend types
        const typeMap: Record<string, DisruptionType> = {
          strike: 'Factory Shutdown',
          natural_disaster: 'Natural Disaster',
          flood: 'Natural Disaster',
          earthquake: 'Natural Disaster',
          fire: 'Factory Shutdown',
          geopolitical: 'Geopolitical Event',
          delay: 'Transportation Delay',
        };
        if (ev.disruption_type && typeMap[ev.disruption_type]) {
          setType(typeMap[ev.disruption_type]);
        }

        if (ev.severity) {
          setSeverity(Math.round(ev.severity * 100));
        }

        if (ev.estimated_duration_days) {
          setDuration(ev.estimated_duration_days);
        }

        // Match origin node in current node list
        if (ev.node_id) {
          const match = nodes.find(
            (n) => n.id.toLowerCase() === ev.node_id.toLowerCase() ||
                   n.name.toLowerCase().includes(ev.location?.toLowerCase() || '')
          );
          if (match) {
            setOrigin(match.id);
            if (match.region) setRegion(match.region);
          } else if (nodes.length > 0) {
            setOrigin(nodes[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('[NLP] extraction error:', err);
    } finally {
      setExtracting(false);
    }
  };

  const handleApplyAndRunNlp = async () => {
    if (extractedEvent) {
      try {
        // Also persist to live API for complete end-to-end integration
        await api.ingestDisruption(extractedEvent);
      } catch (err) {
        console.warn('[NLP] Live ingest error (non-fatal):', err);
      }
    }
    submit();
  };

  const submit = () => {
    if (!origin) return;
    onRun({ type, severity, durationDays: duration, originNodeId: origin, region });
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-accent-500/15 border border-accent-500/30 flex items-center justify-center">
            <Zap className="h-4 w-4 text-accent-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Simulation Controls</h3>
            <p className="text-xs text-slate-500">Configure disruption parameters</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-lg bg-white/5 p-0.5 border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('nlp')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'nlp'
                ? 'bg-accent-500 text-ink-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Newspaper className="h-3 w-3" /> NLP News
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'manual'
                ? 'bg-accent-500 text-ink-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Manual
          </button>
        </div>
      </div>

      {nodes.length === 0 && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <span>No supply chain nodes in the network yet. Create nodes in the Graph view to simulate disruptions.</span>
        </div>
      )}

      {/* NLP TAB */}
      {activeTab === 'nlp' && (
        <div className="space-y-3 p-3.5 rounded-lg bg-accent-500/5 border border-accent-500/20">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-accent-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Paste News Headline (BERT-NER)
            </label>
            <span className="text-[10px] text-slate-400">Auto-detects node & severity</span>
          </div>

          <textarea
            rows={2}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Dockworkers strike halts Port of Rotterdam operations..."
            className="input text-xs w-full resize-none font-sans"
          />

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1">
            {SAMPLE_HEADLINES.slice(0, 3).map((sh, idx) => (
              <button
                key={idx}
                onClick={() => setHeadline(sh)}
                className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 truncate max-w-full text-left"
                title={sh}
              >
                Preset {idx + 1}: {sh.split(' ').slice(0, 5).join(' ')}…
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExtractNlp}
              disabled={extracting || !headline.trim()}
              className="btn-outline text-xs flex-1 py-1.5"
            >
              {extracting ? (
                <><span className="h-3 w-3 rounded-full border-2 border-accent-400 border-t-transparent animate-spin" /> Analyzing…</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5 text-accent-400" /> Extract with NLP</>
              )}
            </button>
            {extractedEvent && (
              <button
                onClick={handleApplyAndRunNlp}
                disabled={running}
                className="btn-primary text-xs flex-1 py-1.5"
              >
                <Play className="h-3.5 w-3.5" /> Run GNN Cascade
              </button>
            )}
          </div>

          {/* Extracted Details Badge */}
          {extractedEvent && (
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> NLP Extraction Linked:
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                <div>Node: <span className="text-white font-mono">{extractedEvent.node_id}</span> ({extractedEvent.location || 'Global'})</div>
                <div>Type: <span className="text-white capitalize">{extractedEvent.disruption_type}</span></div>
                <div>Severity: <span className="text-rose-400 font-bold">{Math.round((extractedEvent.severity || 0.8) * 100)}%</span></div>
                <div>Duration: <span className="text-white">{extractedEvent.estimated_duration_days || 14} days</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PARAMETERS CONFIG */}
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
            disabled={nodes.length === 0}
          />
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="input font-mono text-xs"
            disabled={nodes.length === 0}
          >
            {nodes.length === 0 && <option value="">No nodes available</option>}
            {filteredNodes.map((n) => (
              <option key={n.id} value={n.id}>{n.id} — {n.name} ({n.type})</option>
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
        <button
          onClick={submit}
          disabled={running || nodes.length === 0 || !origin}
          className="btn-primary flex-1"
        >
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
