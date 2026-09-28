import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle } from 'lucide-react';

let listeners = [];
let dialogIdCounter = 0;

/**
 * In-app replacement for window.confirm. Resolves true when confirmed, false when cancelled.
 * Destructive wording (حذف / إلغاء / إرجاع) gets a red confirm button unless `danger` is given.
 */
export function confirmDialog(message, { title, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء', danger } = {}) {
  return new Promise((resolve) => {
    const isDanger = danger ?? /حذف|إلغاء|ألغ|إرجاع|التراجع/.test(String(message));
    const item = { id: ++dialogIdCounter, message: String(message), title, confirmLabel, cancelLabel, danger: isDanger, resolve };
    if (listeners.length === 0) {
      // Host not mounted (should not happen inside the dashboard): fall back to the browser dialog
      resolve(window.confirm(item.message));
      return;
    }
    listeners.forEach((l) => l(item));
  });
}

export function ConfirmDialogHost() {
  const [queue, setQueue] = useState([]);
  const confirmRef = useRef(null);
  const current = queue[0];

  useEffect(() => {
    const onDialog = (item) => setQueue((prev) => [...prev, item]);
    listeners.push(onDialog);
    return () => {
      listeners = listeners.filter((l) => l !== onDialog);
    };
  }, []);

  const close = (result) => {
    current?.resolve(result);
    setQueue((prev) => prev.slice(1));
  };

  useEffect(() => {
    if (!current) return undefined;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;
  const Icon = current.danger ? AlertTriangle : HelpCircle;

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4"
      style={{ zIndex: 100001 }}
      onClick={(e) => e.target === e.currentTarget && close(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`confirm-title-${current.id}`}
        aria-describedby={`confirm-message-${current.id}`}
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        <div className="flex items-start gap-3">
          <span className={`w-10 h-10 flex-shrink-0 rounded-2xl flex items-center justify-center ${current.danger ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
            <Icon size={18} />
          </span>
          <div className="min-w-0 pt-0.5">
            <h3 id={`confirm-title-${current.id}`} className="text-sm font-black text-slate-800">
              {current.title || (current.danger ? 'تأكيد الإجراء' : 'تأكيد')}
            </h3>
            <p id={`confirm-message-${current.id}`} className="text-xs font-bold text-slate-600 leading-relaxed mt-1 whitespace-pre-line">
              {current.message}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            ref={confirmRef}
            type="button"
            onClick={() => close(true)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${current.danger ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-300' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-300'}`}
          >
            {current.confirmLabel}
          </button>
          <button
            type="button"
            onClick={() => close(false)}
            className="flex-1 py-2.5 rounded-xl text-xs font-black text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {current.cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
