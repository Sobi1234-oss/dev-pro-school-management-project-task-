import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l.slice(-2), { id, message, type }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);
  const api = useMemo(() => ({ success: (m) => push(m, 'success'), error: (m) => push(m, 'error') }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div key={t.id} className="anim-sheet pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-lg">
            {t.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-bus" /> : <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-300" />}
            <p className="min-w-0 flex-1 break-words">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="shrink-0 text-white/60 hover:text-white"><X size={16} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
