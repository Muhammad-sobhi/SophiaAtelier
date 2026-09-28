import React from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, RefreshCw } from 'lucide-react';
import { todayStr } from '@/lib/utils';

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'كاش' },
  { id: 'instapay', label: 'انستاباي' },
  { id: 'vodafone_cash', label: 'فودافون كاش' },
  { id: 'visa', label: 'فيزا' },
  { id: 'bank_transfer', label: 'تحويل بنكي' },
  { id: 'other', label: 'أخرى' },
];

export const money = (n) => `${Math.round(parseFloat(n || 0)).toLocaleString()} ج.م`;
export const qty = (n) => parseFloat(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export const inputClass =
  'w-full min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10';

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="block text-[10px] font-extrabold text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ zIndex: 99990 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-white rounded-3xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[92vh] flex flex-col shadow-2xl my-auto`} dir="rtl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function SubmitRow({ onCancel, isSubmitting, label = 'حفظ' }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer">
        إلغاء
      </button>
      <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
        {isSubmitting && <RefreshCw size={12} className="animate-spin" />}
        {label}
      </button>
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
      {children}
    </div>
  );
}

export function LoadError({ onRetry }) {
  return (
    <div className="text-center py-8 bg-rose-50 rounded-3xl border border-rose-100 text-rose-700 text-xs font-bold space-y-2">
      <p>تعذر تحميل البيانات</p>
      <button type="button" onClick={onRetry} className="underline cursor-pointer">إعادة المحاولة</button>
    </div>
  );
}

export function PrimaryButton({ onClick, children, icon: Icon = Plus }) {
  return (
    <button type="button" onClick={onClick} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-1.5">
      <Icon size={14} />
      {children}
    </button>
  );
}

/**
 * Rows of {material_id, quantity[, unit_price]} picked from the materials list.
 * preferredSupplierId lists that supplier's materials first; onCreateMaterial adds a "new material" button.
 */
export function MaterialItemsInput({ items, setItems, materials, withPrice = false, preferredSupplierId = null, onCreateMaterial = null }) {
  const update = (i, patch) => setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const unitOf = (id) => materials.find((m) => String(m.id) === String(id));
  const pick = (i, id) => {
    const m = unitOf(id);
    // Suggest the last known cost when buying
    const price = withPrice && items[i].unit_price === '' && m && parseFloat(m.avg_cost) > 0 ? String(parseFloat(m.avg_cost)) : items[i].unit_price;
    update(i, { material_id: id, unit_price: price });
  };
  const option = (mat) => (
    <option key={mat.id} value={mat.id}>
      {mat.name}{mat.color ? ` (${mat.color})` : ''} — متاح {qty(mat.quantity)}
    </option>
  );
  const own = preferredSupplierId ? materials.filter((m) => String(m.supplier_id) === String(preferredSupplierId)) : [];
  const others = preferredSupplierId ? materials.filter((m) => String(m.supplier_id) !== String(preferredSupplierId)) : materials;

  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const m = unitOf(it.material_id);
        return (
          <div key={i} className="flex flex-wrap sm:flex-nowrap items-end gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <Field label="الخامة" className="flex-1 min-w-[160px]">
              <select className={inputClass} value={it.material_id} required onChange={(e) => pick(i, e.target.value)}>
                <option value="">اختر خامة...</option>
                {own.length > 0 ? (
                  <>
                    <optgroup label="خامات هذا المورد">{own.map(option)}</optgroup>
                    {others.length > 0 && <optgroup label="خامات أخرى">{others.map(option)}</optgroup>}
                  </>
                ) : others.map(option)}
              </select>
            </Field>
            <Field label={`الكمية${m ? ` (${m.unit_label})` : ''}`} className="w-24">
              <input type="number" min="0.01" step="0.01" required className={inputClass} value={it.quantity} onChange={(e) => update(i, { quantity: e.target.value })} />
            </Field>
            {withPrice && (
              <Field label="سعر الوحدة" className="w-28">
                <input type="number" min="0" step="0.01" required className={inputClass} value={it.unit_price} onChange={(e) => update(i, { unit_price: e.target.value })} />
              </Field>
            )}
            <button
              type="button"
              onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              disabled={items.length === 1}
              aria-label="حذف السطر"
              className="w-8 h-8 mb-0.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center cursor-pointer disabled:opacity-30"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setItems([...items, { material_id: '', quantity: '', unit_price: '' }])}
          className="text-[11px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
        >
          <Plus size={12} /> إضافة خامة أخرى
        </button>
        {onCreateMaterial && (
          <button type="button" onClick={onCreateMaterial} className="text-[11px] font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer">
            <Plus size={12} /> خامة جديدة غير موجودة في القائمة
          </button>
        )}
      </div>
    </div>
  );
}

export const emptyItem = () => ({ material_id: '', quantity: '', unit_price: '' });
export { todayStr };

export const errorMessage = (err, fallback = 'حدث خطأ') => err?.message || fallback;
