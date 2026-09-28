import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, Trash2, Eye, CheckCircle2, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  Modal, Field, SubmitRow, EmptyState, LoadError, PrimaryButton, MaterialItemsInput, emptyItem,
  inputClass, money, qty, todayStr, errorMessage,
} from './shared';
import { IconBtn } from './MaterialsTab';

export const ORDER_STATUSES = {
  planned: { label: 'مخطط', cls: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'قيد التصنيع', cls: 'bg-indigo-50 text-indigo-700' },
  completed: { label: 'بانتظار الموافقة', cls: 'bg-amber-50 text-amber-700' },
  approved: { label: 'تمت الموافقة', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'ملغي', cls: 'bg-rose-50 text-rose-600' },
};

export default function OrdersTab({ materials, workers, dresses, isAdmin, reloadShared }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const load = useCallback(() => {
    setError(false);
    apiClient.get('/manufacturing-orders', { params: { status, page } })
      .then((res) => {
        setOrders(res.data || []);
        setLastPage(res.last_page || 1);
      })
      .catch(() => setError(true));
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const afterChange = () => { load(); reloadShared(); };

  const handleDelete = async (o) => {
    if (!window.confirm(`حذف أمر التصنيع "${o.title}"؟ الخامات المصروفة له سترجع للمخزن.`)) return;
    try {
      await apiClient.delete(`/manufacturing-orders/${o.id}`);
      toast.success('تم حذف أمر التصنيع');
      afterChange();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {[['', 'الكل'], ...Object.entries(ORDER_STATUSES).map(([k, v]) => [k, v.label])].map(([k, label]) => (
            <button
              key={k || 'all'}
              type="button"
              onClick={() => { setStatus(k); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer border ${status === k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <PrimaryButton onClick={() => setEditing({})}>أمر تصنيع جديد</PrimaryButton>
      </div>

      {error ? <LoadError onRetry={load} /> : !orders ? (
        <p className="text-xs text-slate-400 font-bold text-center py-6">جاري التحميل...</p>
      ) : orders.length === 0 ? (
        <EmptyState>لا توجد أوامر تصنيع</EmptyState>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-x-auto">
          <table className="w-full text-right text-xs min-w-[720px]">
            <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3">القطعة</th>
                <th className="p-3">العامل</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">التسليم المتوقع</th>
                <th className="p-3">تكلفة الخامات</th>
                <th className="p-3">الأجر</th>
                <th className="p-3">إجمالي التكلفة</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => {
                const st = ORDER_STATUSES[o.status] || ORDER_STATUSES.planned;
                return (
                  <tr key={o.id} className="hover:bg-slate-50/60">
                    <td className="p-3">
                      <div className="font-black text-slate-800">{o.title}</div>
                      {o.dress && <div className="text-[10px] font-bold text-emerald-700">فستان كود {o.dress.code}</div>}
                    </td>
                    <td className="p-3 font-bold text-slate-600">{o.worker?.name || '—'}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${st.cls}`}>{st.label}</span></td>
                    <td className="p-3 font-bold text-slate-600">{o.due_date ? formatDate(o.due_date) : '—'}</td>
                    <td className="p-3 font-bold text-slate-600">{money(o.materials_cost)}</td>
                    <td className="p-3 font-bold text-slate-600">{money(o.worker_fee)}</td>
                    <td className="p-3 font-black text-slate-800">{money(o.total_cost)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <IconBtn title="التفاصيل والخامات" onClick={() => setViewingId(o.id)}><Eye size={13} /></IconBtn>
                        {o.status !== 'approved' && <IconBtn title="تعديل" onClick={() => setEditing(o)}><Edit3 size={13} /></IconBtn>}
                        {['planned', 'cancelled'].includes(o.status) && <IconBtn title="حذف" danger onClick={() => handleDelete(o)}><Trash2 size={13} /></IconBtn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {lastPage > 1 && (
        <div className="flex justify-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer">السابق</button>
          <span className="text-xs font-bold text-slate-500 py-1.5">{page} / {lastPage}</span>
          <button type="button" disabled={page >= lastPage} onClick={() => setPage(page + 1)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer">التالي</button>
        </div>
      )}

      {editing && <OrderForm order={editing} workers={workers} onClose={() => setEditing(null)} onSaved={afterChange} />}
      {viewingId && (
        <OrderDetails
          orderId={viewingId}
          materials={materials}
          dresses={dresses}
          isAdmin={isAdmin}
          onClose={() => setViewingId(null)}
          onChanged={afterChange}
        />
      )}
    </div>
  );
}

function OrderForm({ order, workers, onClose, onSaved }) {
  const isNew = !order.id;
  const [form, setForm] = useState({
    title: order.title || '',
    worker_id: order.worker_id || '',
    status: order.status || 'planned',
    start_date: order.start_date || todayStr(),
    due_date: order.due_date || '',
    completed_date: order.completed_date || '',
    worker_fee: order.worker_fee ?? '',
    notes: order.notes || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pickWorker = (e) => {
    const w = workers.find((x) => String(x.id) === e.target.value);
    // Suggest the worker's usual piece rate when the fee is still empty
    setForm({
      ...form,
      worker_id: e.target.value,
      worker_fee: form.worker_fee === '' && w && w.pay_type !== 'monthly' ? w.piece_rate : form.worker_fee,
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...form,
      worker_id: form.worker_id || null,
      due_date: form.due_date || null,
      completed_date: form.completed_date || null,
      worker_fee: form.worker_fee || 0,
      notes: form.notes || null,
    };
    try {
      if (isNew) await apiClient.post('/manufacturing-orders', payload);
      else await apiClient.put(`/manufacturing-orders/${order.id}`, payload);
      toast.success('تم حفظ أمر التصنيع');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={isNew ? 'أمر تصنيع جديد' : `تعديل: ${order.title}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="القطعة المطلوب تصنيعها *"><input className={inputClass} required value={form.title} onChange={set('title')} placeholder="مثال: فستان زفاف دانتيل مقاس 38" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="العامل المسؤول">
            <select className={inputClass} value={form.worker_id} onChange={pickWorker}>
              <option value="">—</option>
              {workers.filter((w) => w.is_active || String(w.id) === String(form.worker_id)).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field label="أجر العامل على القطعة"><input type="number" min="0" step="0.01" className={inputClass} value={form.worker_fee} onChange={set('worker_fee')} /></Field>
          <Field label="تاريخ البدء"><input type="date" className={inputClass} value={form.start_date} onChange={set('start_date')} /></Field>
          <Field label="التسليم المتوقع"><input type="date" className={inputClass} value={form.due_date} onChange={set('due_date')} /></Field>
          <Field label="الحالة">
            <select className={inputClass} value={form.status} onChange={set('status')}>
              {Object.entries(ORDER_STATUSES).filter(([k]) => k !== 'approved').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          {form.status === 'completed' && (
            <Field label="تاريخ الانتهاء"><input type="date" className={inputClass} value={form.completed_date} onChange={set('completed_date')} /></Field>
          )}
        </div>
        <p className="text-[10px] font-bold text-slate-400">أجر العامل يُحسب مستحقاً له عند انتهاء التصنيع، ويُصرف من تبويب العمال.</p>
        <Field label="ملاحظات"><textarea className={`${inputClass} h-16`} value={form.notes} onChange={set('notes')} /></Field>
        <SubmitRow onCancel={onClose} isSubmitting={isSubmitting} />
      </form>
    </Modal>
  );
}

function OrderDetails({ orderId, materials, dresses, isAdmin, onClose, onChanged }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(false);
  const [items, setItems] = useState([emptyItem()]);
  const [useDate, setUseDate] = useState(todayStr());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dressId, setDressId] = useState('');

  const load = useCallback(() => {
    setError(false);
    apiClient.get(`/manufacturing-orders/${orderId}`).then(setOrder).catch(() => setError(true));
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { load(); onChanged(); };

  const addMaterials = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post(`/manufacturing-orders/${orderId}/materials`, { movement_date: useDate, items });
      toast.success('تم صرف الخامات من المخزن');
      setItems([emptyItem()]);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnMaterial = async (mv) => {
    if (!window.confirm('إرجاع هذه الخامة للمخزن؟')) return;
    try {
      await apiClient.delete(`/manufacturing-orders/${orderId}/materials/${mv.id}`);
      toast.success('تم إرجاع الخامة للمخزن');
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const approve = async () => {
    if (!window.confirm('الموافقة على القطعة بعد مراجعتها؟ لن يمكن تعديل الأمر بعد الموافقة.')) return;
    try {
      await apiClient.post(`/manufacturing-orders/${orderId}/approve`, {});
      toast.success('تمت الموافقة على القطعة');
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const linkDress = async () => {
    if (!dressId) return;
    try {
      await apiClient.put(`/manufacturing-orders/${orderId}/dress`, { dress_id: dressId });
      toast.success('تم ربط القطعة بالفستان');
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (error) return <Modal title="أمر تصنيع" onClose={onClose}><p className="text-xs text-rose-600 font-bold text-center py-4">تعذر تحميل البيانات</p></Modal>;
  if (!order) return <Modal title="أمر تصنيع" onClose={onClose}><p className="text-xs text-slate-400 font-bold text-center py-4">جاري التحميل...</p></Modal>;

  const st = ORDER_STATUSES[order.status] || ORDER_STATUSES.planned;
  const canEditMaterials = !['approved', 'cancelled'].includes(order.status);

  return (
    <Modal title={order.title} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${st.cls}`}>{st.label}</span>
          {order.worker && <span>العامل: {order.worker.name}</span>}
          {order.start_date && <span>· البدء {formatDate(order.start_date)}</span>}
          {order.completed_date && <span>· الانتهاء {formatDate(order.completed_date)}</span>}
          {order.approver && <span>· وافق: {order.approver.name}</span>}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 rounded-xl p-2.5">
            <span className="block text-[10px] font-bold text-slate-400">الخامات</span>
            <span className="text-xs font-black text-slate-800">{money(order.materials_cost)}</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5">
            <span className="block text-[10px] font-bold text-slate-400">أجر العامل</span>
            <span className="text-xs font-black text-slate-800">{money(order.worker_fee)}</span>
          </div>
          <div className="bg-indigo-50 rounded-xl p-2.5">
            <span className="block text-[10px] font-bold text-indigo-400">إجمالي التكلفة</span>
            <span className="text-xs font-black text-indigo-800">{money(order.total_cost)}</span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black text-slate-800 mb-2">الخامات المستخدمة</h4>
          {order.material_movements.length === 0 ? (
            <p className="text-[11px] font-bold text-slate-400">لم تُصرف خامات بعد</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-xs border border-slate-100 rounded-xl">
              {order.material_movements.map((mv) => (
                <li key={mv.id} className="px-3 py-2 flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-700">
                    {mv.material?.name} — {qty(-mv.quantity)}
                    <span className="text-slate-400"> · {formatDate(mv.movement_date)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-black text-slate-800">{money(-mv.quantity * mv.unit_cost)}</span>
                    {canEditMaterials && (
                      <button type="button" onClick={() => returnMaterial(mv)} className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline cursor-pointer">إرجاع</button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canEditMaterials && (
          <form onSubmit={addMaterials} className="space-y-2 bg-indigo-50/40 border border-indigo-100 rounded-2xl p-3">
            <div className="flex items-end justify-between gap-2">
              <h4 className="text-xs font-black text-indigo-900">صرف خامات من المخزن</h4>
              <Field label="التاريخ" className="w-36"><input type="date" required className={inputClass} value={useDate} onChange={(e) => setUseDate(e.target.value)} /></Field>
            </div>
            <MaterialItemsInput items={items} setItems={setItems} materials={materials.filter((m) => parseFloat(m.quantity) > 0)} />
            <div className="flex justify-end">
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer disabled:opacity-50">صرف الخامات</button>
            </div>
          </form>
        )}

        {order.status === 'completed' && (
          isAdmin ? (
            <button type="button" onClick={approve} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer">
              <CheckCircle2 size={15} /> الموافقة على القطعة
            </button>
          ) : (
            <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-2.5">القطعة بانتظار موافقة الإدارة قبل إضافتها للفساتين.</p>
          )
        )}

        {order.status === 'approved' && (
          order.dress ? (
            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
              مرتبطة بالفستان كود {order.dress.code} — {order.dress.name}
            </p>
          ) : (
            <div className="space-y-2 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3">
              <p className="text-[11px] font-bold text-emerald-800">
                تمت الموافقة. أضيفي الفستان من <Link to="/dashboard/dresses" className="underline">صفحة الفساتين</Link> ثم اربطيه هنا
                (تكلفة التصنيع {money(order.total_cost)} يمكن استخدامها كسعر شراء الفستان).
              </p>
              <div className="flex gap-2">
                <select className={inputClass} value={dressId} onChange={(e) => setDressId(e.target.value)} aria-label="اختيار الفستان">
                  <option value="">اختاري الفستان...</option>
                  {dresses.map((d) => <option key={d.id} value={d.id}>{d.code ? `${d.code} — ` : ''}{d.name}</option>)}
                </select>
                <button type="button" onClick={linkDress} disabled={!dressId} className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap">
                  <Link2 size={13} /> ربط
                </button>
              </div>
            </div>
          )
        )}

        {order.notes && <p className="text-[11px] font-bold text-slate-500">ملاحظات: {order.notes}</p>}
      </div>
    </Modal>
  );
}
