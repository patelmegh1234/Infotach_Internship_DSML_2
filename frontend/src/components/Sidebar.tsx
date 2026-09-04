import { Network, LayoutDashboard, Workflow, Zap, ShieldAlert, Brain, FlaskConical, Bell, FileText, Activity, Cpu, Database, Server } from 'lucide-react';
import { classNames } from '@/utils/helpers';
import { useEffect, useState } from 'react';

export type PageKey =
  | 'dashboard'
  | 'graph'
  | 'simulator'
  | 'risk'
  | 'predictions'
  | 'scenarios'
  | 'alerts'
  | 'reports';

const nav: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'graph', label: 'Supply Chain Graph', icon: Workflow },
  { key: 'simulator', label: 'Disruption Simulator', icon: Zap },
  { key: 'risk', label: 'Risk Analysis', icon: ShieldAlert },
  { key: 'predictions', label: 'Predictions', icon: Brain },
  { key: 'scenarios', label: 'Scenarios', icon: FlaskConical },
  { key: 'alerts', label: 'Alerts', icon: Bell },
  { key: 'reports', label: 'Reports', icon: FileText },
];

type StatusColor = 'emerald' | 'amber' | 'rose';

interface HealthStatus {
  api: StatusColor;
  apiLabel: string;
  neo4j: StatusColor;
  neo4jLabel: string;
  gnn: StatusColor;
  gnnLabel: string;
}

export function Sidebar({
  active,
  onNavigate,
  open,
  onClose,
}: {
  active: PageKey;
  onNavigate: (p: PageKey) => void;
  open: boolean;
  onClose: () => void;
}) {
  const [health, setHealth] = useState<HealthStatus>({
    api: 'amber', apiLabel: 'Checking…',
    neo4j: 'amber', neo4jLabel: 'Checking…',
    gnn: 'amber', gnnLabel: 'Checking…',
  });

  useEffect(() => {
    let alive = true;

    const checkHealth = async () => {
      try {
        let r: Response | null = await fetch('/health/').catch(() => null);
        if (!r || !r.ok) {
          r = await fetch('http://127.0.0.1:8000/health/').catch(() => null);
        }
        if (!r || !r.ok) {
          r = await fetch('http://localhost:8000/health/').catch(() => null);
        }
        if (!r || !r.ok) {
          throw new Error('Health check offline');
        }
        const data = await r.json();
        if (!alive) return;
        if (!data || !data.components) {
          setHealth({
            api: 'rose', apiLabel: 'Offline',
            neo4j: 'rose', neo4jLabel: 'Offline',
            gnn: 'rose', gnnLabel: 'Offline',
          });
          return;
        }
        const neo4jOk = data.components.neo4j === 'connected';
        const gnnOk = data.components.gnn_engine === 'loaded';
        setHealth({
          api: 'emerald', apiLabel: 'Connected',
          neo4j: neo4jOk ? 'emerald' : 'amber',
          neo4jLabel: neo4jOk ? 'Connected' : 'In-Memory',
          gnn: gnnOk ? 'emerald' : 'amber',
          gnnLabel: gnnOk ? 'Online' : 'Fallback',
        });
      } catch {
        if (!alive) return;
        setHealth({
          api: 'rose', apiLabel: 'Offline',
          neo4j: 'rose', neo4jLabel: 'Offline',
          gnn: 'rose', gnnLabel: 'Offline',
        });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 3000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={classNames(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 glass-strong border-r border-white/5 flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent-500/20 to-accent-700/10 border border-accent-500/30 flex items-center justify-center shadow-glow-sm">
            <Network className="h-5 w-5 text-accent-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-white tracking-tight leading-none">
              Atmo<span className="text-accent-400">Graph</span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mt-1">Supply Chain Intelligence</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onNavigate(item.key);
                  onClose();
                }}
                className={classNames(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group',
                  isActive
                    ? 'bg-accent-500/10 text-white border border-accent-500/20 shadow-glow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent',
                )}
              >
                <Icon className={classNames('h-4.5 w-4.5 shrink-0', isActive ? 'text-accent-400' : 'text-slate-500 group-hover:text-slate-300')} />
                <span className="font-medium">{item.label}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-400 animate-pulseGlow" />}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/5 space-y-2">
          <p className="px-2 text-[10px] uppercase tracking-[0.18em] text-slate-600 mb-1">System Status</p>
          <StatusRow icon={Activity} label="System Status" value="Operational" color="emerald" />
          <StatusRow icon={Cpu} label="AI Engine" value={health.gnnLabel} color={health.gnn} />
          <StatusRow icon={Database} label="Neo4j" value={health.neo4jLabel} color={health.neo4j} />
          <StatusRow icon={Server} label="API" value={health.apiLabel} color={health.api} />
        </div>
      </aside>
    </>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  color: StatusColor;
}) {
  const dot = color === 'emerald' ? 'bg-emerald-400' : color === 'amber' ? 'bg-amber-400' : 'bg-rose-400';
  const txt = color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-rose-400';
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white/5 transition">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      <span className="text-xs text-slate-400">{label}</span>
      <span className="ml-auto flex items-center gap-1.5">
        <span className={classNames('h-1.5 w-1.5 rounded-full', dot, color === 'emerald' ? 'animate-pulseGlow' : '')} />
        <span className={classNames('text-xs font-medium', txt)}>{value}</span>
      </span>
    </div>
  );
}
