import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, Trash2, Banknote, FileText, Phone } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  Modal, Field, SubmitRow, EmptyState, LoadError, PrimaryButton, inputClass, money, todayStr, errorMessage, PAYMENT_METHODS,
} from './shared';
import { IconBtn } from './MaterialsTab';

export const PAY_TYPES = { monthly: 'راتب شهري', per_piece: 'بالقطعة', both: 'راتب + بالقطعة' };
const PAYMENT_TYPES = { salary: 'راتب شهري', piece: 'أجر قطعة', advance: 'سلفة', bonus: 'مكافأة' };

export default function WorkersTab({ reloadShared }) {
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [workers, setWorkers] = useState(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [statementId, setStatementId] = useState(null);

  const load = useCallback(() => {
    setError(false);
    apiClient.get('/workers', { params: { month } })
      .then((res) => setWorkers(res.data || []))
      .catch(() => setError(true));
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const afterChange = () => { load(); reloadShared(); };

  const handleDelete = async (w) => {
    if (!window.confirm(`حذف العامل "${w.name}"؟`)) return;
    try {
      await apiClient.delete(`/workers/${w.id}`);
      toast.success('تم حذف العامل');
      afterChange();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <Field label="شهر الرواتب" className="w-44">
          <input type="month" className={inputClass} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </Field>
        <PrimaryButton onClick={() => setEditing({})}>عامل جديد</PrimaryButton>
      </div>

      {error ? <LoadError onRetry={load} /> : !workers ? (
        <p className="text-xs text-slate-400 font-bold text-center py-6">جاري التحميل...</p>
      ) : workers.length === 0 ? (
        <EmptyState>لا يوجد عمال تصنيع بعد</EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {workers.map((w) => {
            const monthly = w.pay_type !== 'per_piece';
            const perPiece = w.pay_type !== 'monthly';
            return (
              <div key={w.id} className={`bg-white border rounded-2xl p-3.5 space-y-2.5 ${w.is_active ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-800 truncate">
                      {w.name} {!w.is_active && <span className="text-[10px] text-slate-400">(موقوف)</span>}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">
                      {[w.specialty, PAY_TYPES[w.pay_type]].filter(Boolean).join(' · ')}
                    </div>
                    {w.phone && (
                      <a href={`tel:${w.phone}`} className="text-[11px] font-bold text-slate-500 flex items-center gap-1" dir="ltr"><Phone size={11} /> {w.phone}</a>
                    )}
                  </div>
                  {w.active_orders > 0 && (
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg whitespace-nowrap">{w.active_orders} قيد التنفيذ</span>
                  )}
                </div>

                <div className="space-y-1.5 text-[11px] font-bold">
                  {monthly && (
                    <div className="flex justify-between bg-slate-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-slate-500">راتب {month}: {money(w.monthly_salary)}</span>
                      <span className={parseFloat(w.salary_due) > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        {parseFloat(w.salary_due) > 0 ? `متبقي ${money(w.salary_due)}` : 'تم الصرف'}
                      </span>
                    </div>
                  )}
                  {perPiece && (
                    <div className="flex justify-between bg-slate-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-slate-500">أجر القطع المنتهية: {money(w.piece_earned)}</span>
                      <span className={parseFloat(w.piece_due) > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        {parseFloat(w.piece_due) > 0 ? `مستحق ${money(w.piece_due)}` : 'لا يوجد مستحق'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                  <button type="button" onClick={() => setPaying(w)} className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer">
                    <Banknote size={12} /> صرف
                  </button>
                  <button type="button" onClick={() => setStatementId(w.id)} className="flex-1 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer">
                    <FileText size={12} /> السجل
                  </button>
                  <IconBtn title="تعديل" onClick={() => setEditing(w)}><Edit3 size={13} /></IconBtn>
                  <IconBtn title="حذف" danger onClick={() => handleDelete(w)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <WorkerForm worker={editing} onClose={() => setEditing(null)} onSaved={afterChange} />}
      {paying && <WorkerPaymentForm worker={paying} month={month} onClose={() => setPaying(null)} onSaved={afterChange} />}
      {statementId && <WorkerStatement workerId={statementId} onClose={() => setStatementId(null)} onChanged={afterChange} />}
    </div>
  );
}

function WorkerForm({ worker, onClose, onSaved }) {
  const isNew = !worker.id;
  const [form, setForm] = useState({
    name: worker.name || '',
    phone: worker.phone || '',
    specialty: worker.specialty || '',
    pay_type: worker.pay_type || 'monthly',
    monthly_salary: worker.monthly_salary ?? '',
    piece_rate: worker.piece_rate ?? '',
    is_active: worker.is_active ?? true,
    notes: worker.notes || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...form,
      monthly_salary: form.pay_type === 'per_piece' ? 0 : form.monthly_salary || 0,
      piece_rate: form.pay_type === 'monthly' ? 0 : form.piece_rate || 0,
    };
    try {
      if (isNew) await apiClient.post('/workers', payload);
      else await apiClient.put(`/workers/${worker.id}`, payload);
      toast.success('تم حفظ بيانات العامل');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={isNew ? 'إضافة عامل تصنيع' : `تعديل ${worker.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="الاسم *"><input className={inputClass} required value={form.name} onChange={set('name')} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="رقم الهاتف"><input className={inputClass} dir="ltr" value={form.phone} onChange={set('phone')} /></Field>
          <Field label="التخصص (خياطة، تطريز...)"><input className={inputClass} value={form.specialty} onChange={set('specialty')} /></Field>
        </div>
        <Field label="طريقة المحاسبة">
          <select className={inputClass} value={form.pay_type} onChange={set('pay_type')}>
            {Object.entries(PAY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {form.pay_type !== 'per_piece' && (
            <Field label="الراتب الشهري"><input type="number" min="0" step="0.01" className={inputClass} value={form.monthly_salary} onChange={set('monthly_salary')} /></Field>
          )}
          {form.pay_type !== 'monthly' && (
            <Field label="الأجر المعتاد للقطعة"><input type="number" min="0" step="0.01" className={inputClass} value={form.piece_rate} onChange={set('piece_rate')} /></Field>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          يعمل حالياً
        </label>
        <Field label="ملاحظات"><textarea className={`${inputClass} h-16`} value={form.notes} onChange={set('notes')} /></Field>
        <SubmitRow onCancel={onClose} isSubmitting={isSubmitting} />
      </form>
    </Modal>
  );
}

function WorkerPaymentForm({ worker, month, onClose, onSaved }) {
  const defaultType = worker.pay_type === 'per_piece' ? 'piece' : 'salary';
  const suggested = (type) =>
    type === 'salary' ? Math.max(0, parseFloat(worker.salary_due || 0)) : type === 'piece' ? Math.max(0, parseFloat(worker.piece_due || 0)) : '';
  const [form, setForm] = useState({
    type: defaultType,
    amount: suggested(defaultType) || '',
    payment_method: 'cash',
    payment_date: todayStr(),
    period: month,
    manufacturing_order_id: '',
    notes: '',
  });
  const [orders, setOrders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    apiClient.get(`/workers/${worker.id}`).then((res) => setOrders(res.orders || [])).catch(() => {});
  }, [worker.id]);

  const submit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post(`/workers/${worker.id}/payments`, {
        ...form,
        period: ['salary', 'advance'].includes(form.type) ? form.period : null,
        manufacturing_order_id: form.type === 'piece' && form.manufacturing_order_id ? form.manufacturing_order_id : null,
        notes: form.notes || null,
      });
      toast.success('تم تسجيل الصرف وإضافته للمالية');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={`صرف للعامل: ${worker.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="نوع الصرف">
            <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, amount: suggested(e.target.value) || form.amount })}>
              {Object.entries(PAYMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="المبلغ *"><input type="number" min="0.01" step="0.01" required className={inputClass} value={form.amount} onChange={set('amount')} /></Field>
          <Field label="تاريخ الصرف *"><input type="date" required className={inputClass} value={form.payment_date} onChange={set('payment_date')} /></Field>
          <Field label="طريقة الدفع">
            <select className={inputClass} value={form.payment_method} onChange={set('payment_method')}>
              {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
          {['salary', 'advance'].includes(form.type) && (
            <Field label="عن شهر"><input type="month" required className={inputClass} value={form.period} onChange={set('period')} /></Field>
          )}
          {form.type === 'piece' && orders.length > 0 && (
            <Field label="عن أمر تصنيع" className="col-span-2">
              <select className={inputClass} value={form.manufacturing_order_id} onChange={set('manufacturing_order_id')}>
                <option value="">—</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.title} ({money(o.worker_fee)})</option>)}
              </select>
            </Field>
          )}
        </div>
        {form.type === 'advance' && <p className="text-[10px] font-bold text-slate-500">السلفة تُخصم من متبقي راتب نفس الشهر.</p>}
        <Field label="ملاحظات"><input className={inputClass} value={form.notes} onChange={set('notes')} /></Field>
        <SubmitRow onCancel={onClose} isSubmitting={isSubmitting} label="تسجيل الصرف" />
      </form>
    </Modal>
  );
}

function WorkerStatement({ workerId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    apiClient.get(`/workers/${workerId}`).then(setData).catch(() => setError(true));
  }, [workerId]);

  useEffect(() => { load(); }, [load]);

  const deletePayment = async (p) => {
    if (!window.confirm('حذف هذا الصرف؟ سيُحذف أيضاً من صفحة المالية.')) return;
    try {
      await apiClient.delete(`/workers/${workerId}/payments/${p.id}`);
      toast.success('تم الحذف');
      load();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Modal title={data ? `سجل مدفوعات: ${data.worker.name}` : 'سجل المدفوعات'} onClose={onClose} wide>
      {error ? (
        <p className="text-xs text-rose-600 font-bold text-center py-4">تعذر تحميل السجل</p>
      ) : !data ? (
        <p className="text-xs text-slate-400 font-bold text-center py-4">جاري التحميل...</p>
      ) : data.payments.length === 0 ? (
        <p className="text-xs text-slate-400 font-bold text-center py-4">لا توجد مدفوعات بعد</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-xs">
          {data.payments.map((p) => (
            <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-black text-slate-700">
                  {PAYMENT_TYPES[p.type] || p.type}
                  {p.period && <span className="text-slate-500 font-bold"> · {p.period}</span>}
                  {p.manufacturing_order && <span className="text-slate-500 font-bold"> · {p.manufacturing_order.title}</span>}
                </div>
                <div className="text-[10px] text-slate-400 font-bold truncate">{formatDate(p.payment_date)}{p.notes ? ` · ${p.notes}` : ''}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-black text-slate-800">{money(p.amount)}</span>
                <button type="button" onClick={() => deletePayment(p)} className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline cursor-pointer">حذف</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
