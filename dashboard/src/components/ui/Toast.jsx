import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

let listeners = [];
let toastIdCounter = 0;

export const toast = {
  success: (message, duration = 4000) => emitToast({ type: 'success', message, duration }),
  error: (message, duration = 5000) => emitToast({ type: 'error', message, duration }),
  info: (message, duration = 4000) => emitToast({ type: 'info', message, duration }),
  warning: (message, duration = 4500) => emitToast({ type: 'warning', message, duration }),
};

function emitToast(toastItem) {
  const item = {
    id: ++toastIdCounter,
    timestamp: Date.now(),
    ...toastItem,
  };
  listeners.forEach((l) => l(item));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleNewToast = (item) => {
      setToasts((prev) => [...prev, item]);

      if (item.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== item.id));
        }, item.duration);
      }
    };

    listeners.push(handleNewToast);
    return () => {
      listeners = listeners.filter((l) => l !== handleNewToast);
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-5 left-5 sm:left-6 z-[100000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      dir="rtl"
    >
      {toasts.map((t) => {
        let bgStyle = 'bg-white border-slate-200 text-slate-800 shadow-xl';
        let icon = <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;

        if (t.type === 'success') {
          bgStyle = 'bg-white border-emerald-200 text-slate-800 shadow-[0_15px_30px_rgba(16,185,129,0.15)]';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
        } else if (t.type === 'error') {
          bgStyle = 'bg-white border-rose-200 text-slate-800 shadow-[0_15px_30px_rgba(244,63,94,0.15)]';
          icon = <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />;
        } else if (t.type === 'warning') {
          bgStyle = 'bg-white border-amber-200 text-slate-800 shadow-[0_15px_30px_rgba(245,158,11,0.15)]';
          icon = <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />;
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border ${bgStyle} animate-in slide-in-from-top-3 fade-in duration-200 transition-all`}
          >
            <div className="pt-0.5">{icon}</div>
            <div className="flex-1 text-xs font-black leading-relaxed">
              {t.message}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default toast;
