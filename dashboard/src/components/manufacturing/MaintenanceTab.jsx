import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  Field, EmptyState, LoadError, MaterialItemsInput, emptyItem, inputClass, money, qty, todayStr, errorMessage,
} from './shared';
import { confirmDialog } from '@/components/ui/ConfirmDialog';

/** Use shop materials to maintain dresses: stock only (the material was already paid when bought) */
export default function MaintenanceTab({ materials, dresses, reloadShared }) {
  const [dressId, setDressId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    apiClient.get('/materials/movements', { params: { type: 'maintenance', per_page: 50 } })
      .then((res) => setRows(res.data || []))
      .catch(() => setError(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/materials/maintenance-use', { dress_id: dressId, movement_date: date, notes: notes || null, items });
      toast.success('تم صرف الخامات لصيانة الفستان');
      setItems([emptyItem()]);
      setNotes('');
      load();
      reloadShared();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const undo = async (mv) => {
    if (!await confirmDialog('التراجع وإرجاع الخامة للمخزن؟')) return;
    try {
      await apiClient.delete(`/materials/movements/${mv.id}`);
      toast.success('تم إرجاع الخامة للمخزن');
      load();
      reloadShared();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const available = materials.filter((m) => parseFloat(m.quantity) > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
      <form onSubmit={submit} className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-4 space-y-3 self-start">
        <h3 className="text-sm font-black text-slate-800">صرف خامات لصيانة فستان</h3>
        <p className="text-[10px] font-bold text-slate-400">تُخصم الكمية من المخزن فقط — تكلفة الخامة سُجلت في المالية وقت شرائها.</p>
        <Field label="الفستان *">
          <select className={inputClass} required value={dressId} onChange={(e) => setDressId(e.target.value)}>
            <option value="">اختر الفستان...</option>
            {dresses.map((d) => <option key={d.id} value={d.id}>{d.code ? `${d.code} — ` : ''}{d.name}</option>)}
          </select>
        </Field>
        <Field label="التاريخ *"><input type="date" required className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        {available.length === 0 ? (
          <p className="text-xs font-bold text-amber-700">لا توجد خامات متاحة في المخزن.</p>
        ) : (
          <MaterialItemsInput items={items} setItems={setItems} materials={available} />
        )}
        <Field label="نوع الصيانة / ملاحظات"><input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: تغيير سوستة، تركيب خرز" /></Field>
        <button type="submit" disabled={isSubmitting || available.length === 0} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black cursor-pointer disabled:opacity-50">
          صرف الخامات
        </button>
      </form>

      <div className="lg:col-span-3 space-y-2">
        <h3 className="text-sm font-black text-slate-800">آخر عمليات الصيانة</h3>
        {error ? <LoadError onRetry={load} /> : !rows ? (
          <p className="text-xs text-slate-400 font-bold text-center py-6">جاري التحميل...</p>
        ) : rows.length === 0 ? (
          <EmptyState>لم تُستخدم خامات في الصيانة بعد</EmptyState>
        ) : (
          <ul className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 text-xs">
            {rows.map((mv) => (
              <li key={mv.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black text-slate-700">
                    فستان {mv.dress?.code || mv.dress?.name || '—'} · {mv.material?.name} {qty(-mv.quantity)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold truncate">
                    {formatDate(mv.movement_date)}{mv.user ? ` · ${mv.user.name}` : ''}{mv.notes ? ` · ${mv.notes}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-bold text-slate-500">{money(-mv.quantity * mv.unit_cost)}</span>
                  <button type="button" onClick={() => undo(mv)} className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline cursor-pointer">تراجع</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
