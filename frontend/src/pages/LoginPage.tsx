import { useState, useMemo } from 'react';
import { Network, Mail, Lock, ArrowRight, ShieldCheck, Activity, Cpu } from 'lucide-react';

interface NetPoint { x: number; y: number; vx: number; vy: number; }

function NetworkBackground() {
  const points = useMemo<NetPoint[]>(() => {
    const arr: NetPoint[] = [];
    for (let i = 0; i < 46; i++) {
      arr.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
      });
    }
    return arr;
  }, []);

  const [tick, setTick] = useState(0);
  useMemo(() => {
    let raf = 0;
    const loop = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // advance
  const moved = points.map((p) => {
    let nx = p.x + p.vx;
    let ny = p.y + p.vy;
    if (nx < 0 || nx > 100) p.vx *= -1;
    if (ny < 0 || ny > 100) p.vy *= -1;
    return { ...p, x: nx, y: ny };
  });

  const lines: { x1: number; y1: number; x2: number; y2: number; o: number }[] = [];
  for (let i = 0; i < moved.length; i++) {
    for (let j = i + 1; j < moved.length; j++) {
      const dx = moved[i].x - moved[j].x;
      const dy = moved[i].y - moved[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 18) lines.push({ x1: moved[i].x, y1: moved[i].y, x2: moved[j].x, y2: moved[j].y, o: 1 - d / 18 });
    }
  }

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" data-tick={tick}>
      <g stroke="rgba(34,211,238,0.25)" strokeWidth="0.08">
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} opacity={l.o * 0.5} />
        ))}
      </g>
      {moved.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="0.35" fill="rgba(34,211,238,0.7)">
          <animate attributeName="opacity" values="0.4;1;0.4" dur={`${2 + (i % 5)}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

export function LoginPage({ onSignIn }: { onSignIn: (mode: 'demo' | 'user') => void }) {
  const [email, setEmail] = useState('alex.morgan@atmograph.io');
  const [password, setPassword] = useState('••••••••••');
  const [loading, setLoading] = useState<'demo' | 'user' | null>(null);

  const submit = (mode: 'demo' | 'user') => {
    setLoading(mode);
    setTimeout(() => onSignIn(mode), 650);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-ink-950">
      <div className="absolute inset-0 opacity-60">
        <NetworkBackground />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/40 via-ink-950/60 to-ink-950" />

      <div className="relative w-full max-w-md animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-700/10 border border-accent-500/30 items-center justify-center shadow-glow mb-4 animate-floatY">
            <Network className="h-7 w-7 text-accent-400" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            ATMO<span className="text-accent-400">GRAPH</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">Predict the ripple. Protect the supply chain.</p>
        </div>

        <div className="card-strong glass-strong rounded-2xl p-6 shadow-panel">
          <div className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-9" type="email" />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-9" type="password" />
              </div>
            </div>

            <button onClick={() => submit('user')} disabled={loading !== null} className="btn-primary w-full">
              {loading === 'user' ? (
                <><span className="h-4 w-4 rounded-full border-2 border-ink-950/40 border-t-ink-950 animate-spinSlow" /> Signing in…</>
              ) : (
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
              <div className="relative flex justify-center"><span className="px-3 text-xs text-slate-500 bg-ink-850/80">or</span></div>
            </div>

            <button onClick={() => submit('demo')} disabled={loading !== null} className="btn-outline w-full">
              {loading === 'demo' ? (
                <><span className="h-4 w-4 rounded-full border-2 border-accent-400/40 border-t-accent-400 animate-spinSlow" /> Entering demo…</>
              ) : (
                'Enter Demo Mode'
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> SOC2 Ready</span>
          <span className="flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-accent-400" /> AI Engine Online</span>
          <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-emerald-400" /> Realtime Graph</span>
        </div>
        <p className="mt-4 text-center text-[11px] text-slate-600">AI-powered graph intelligence for resilient global supply chains.</p>
      </div>
    </div>
  );
}
