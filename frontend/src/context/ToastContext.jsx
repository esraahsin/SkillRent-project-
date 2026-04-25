import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info', duration = 4000) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove]
  );

  const toast = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error', 6000),
    info: (m) => push(m, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-80 max-w-[90vw] flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }) {
  const { type, message } = toast;
  const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? AlertCircle : Info;
  const color =
    type === 'success'
      ? 'text-emerald-400 border-emerald-400/30'
      : type === 'error'
      ? 'text-red-400 border-red-400/30'
      : 'text-indigo-300 border-indigo-400/30';

  return (
    <div className={`sr-toast pointer-events-auto sr-card flex items-start gap-3 p-3 pr-2 border ${color}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{String(message)}</p>
      <button onClick={onClose} className="sr-btn-ghost rounded p-1">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
