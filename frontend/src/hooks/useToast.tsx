import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const iconFor = (k: ToastKind) => {
  switch (k) {
    case 'success':
      return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-400" />;
    case 'info':
      return <Info className="h-5 w-5 text-accent-400" />;
  }
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 w-[min(92vw,360px)]">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);
  return (
    <div
      className={`glass-strong rounded-xl p-3.5 pr-3 shadow-panel border-l-2 transition-all duration-300 ${
        mounted ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
      } ${
        toast.kind === 'success'
          ? 'border-l-emerald-400'
          : toast.kind === 'error'
            ? 'border-l-red-400'
            : toast.kind === 'warning'
              ? 'border-l-amber-400'
              : 'border-l-accent-400'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{iconFor(toast.kind)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{toast.title}</p>
          {toast.message && <p className="text-xs text-slate-400 mt-0.5">{toast.message}</p>}
        </div>
        <button onClick={onDismiss} className="text-slate-500 hover:text-white transition shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
