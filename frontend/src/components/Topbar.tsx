import { Search, Bell, Menu, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Topbar({
  onMenu,
  onSearch,
  search,
}: {
  onMenu: () => void;
  onSearch: (v: string) => void;
  search: string;
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-20 glass-strong border-b border-white/5">
      <div className="flex items-center gap-3 px-4 lg:px-6 h-16">
        <button onClick={onMenu} className="lg:hidden btn-ghost -ml-2 px-2">
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search suppliers, factories, ports…"
            className="input pl-9"
          />
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 ml-2">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Last updated {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <button className="relative btn-ghost px-2.5">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-400 animate-pulseGlow" />
        </button>

        <div className="flex items-center gap-2.5 pl-2 lg:pl-3 lg:border-l lg:border-white/5">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent-500/30 to-accent-700/20 border border-accent-500/30 flex items-center justify-center text-sm font-semibold text-accent-300">
            AM
          </div>
          <div className="hidden lg:block leading-tight">
            <p className="text-sm font-medium text-white">Alex Morgan</p>
            <p className="text-xs text-slate-500">Supply Chain Analyst</p>
          </div>
        </div>
      </div>
    </header>
  );
}
