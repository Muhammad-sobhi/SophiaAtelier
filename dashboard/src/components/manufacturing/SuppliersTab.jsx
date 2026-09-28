import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, Trash2, FileText, Phone, Banknote } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { formatBalance, balanceClass } from '@/components/finance/SupplierBalancesCard';
import {
  Modal, Field, SubmitRow, EmptyState, PrimaryButton, inputClass, money, qty, todayStr, errorMessage, PAYMENT_METHODS,
} from './shared';
import { IconBtn } from './MaterialsTab';

export default function SuppliersTab({ suppliers, totalBalance, reload, initialSupplierId }) {
  const [editing, setEditing] = useState(null);
  const [statementId, setStatementId] = useState(initialSupplierId || null);
  const [paying, setPaying] = useState(null);

  const handleDelete = async (s) => {
    if (!window.confirm(`حذف المورد "${s.name}"؟`)) return;
    try {
      await apiClient.delete(`/suppliers/${s.id}`);
      toast.success('تم حذف المورد');
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3">
          <span className="text-[10px] font-extrabold text-slate-400 block">إجمالي رصيد الموردين (السالب = مديونية عليك)</span>
          <span className={`text-lg font-black ${balanceClass(totalBalance)}`} dir="ltr">{formatBalance(totalBalance)}</span>
        </div>
        <PrimaryButton onClick={() => setEditing({})}>مورد جديد</PrimaryButton>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState>لا يوجد موردين بعد</EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-white border border-slate-100 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-800 truncate">{s.name}</div>
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="text-[11px] font-bold text-slate-500 flex items-center gap-1" dir="ltr">
                      <Phone size={11} /> {s.phone}
                    </a>
                  )}
                </div>
                <span className={`text-sm font-black ${balanceClass(s.balance)}`} dir="ltr">{formatBalance(s.balance)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                <span>المشتريات: {money(s.purchases_total)}</span>
                <span>المدفوع: {money(s.payments_total)}</span>
              </div>
              <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                <button type="button" onClick={() => setPaying(s)} className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer">
                  <Banknote size={12} /> دفعة
                </button>
                <button type="button" onClick={() => setStatementId(s.id)} className="flex-1 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer">
                  <FileText size={12} /> كشف حساب
                </button>
                <IconBtn title="تعديل" onClick={() => setEditing(s)}><Edit3 size={13} /></IconBtn>
                <IconBtn title="حذف" danger onClick={() => handleDelete(s)}><Trash2 size={13} /></IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <SupplierForm supplier={editing} onClose={() => setEditing(null)} onSaved={reload} />}
      {paying && <SupplierPaymentForm supplier={paying} onClose={() => setPaying(null)} onSaved={reload} />}
      {statementId && <SupplierStatement supplierId={statementId} onClose={() => setStatementId(null)} onChanged={reload} />}
    </div>
  );
}

export function SupplierForm({ supplier, onClose, onSaved }) {
  const isNew = !supplier.id;
  const [form, setForm] = useState({
    name: supplier.name || '', phone: supplier.phone || '', address: supplier.address || '', notes: supplier.notes || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const saved = isNew
        ? await apiClient.post('/suppliers', form)
        : await apiClient.put(`/suppliers/${supplier.id}`, form);
      toast.success('تم حفظ المورد');
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={isNew ? 'إضافة مورد' : `تعديل ${supplier.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="اسم المورد *"><input className={inputClass} required value={form.name} onChange={set('name')} /></Field>
        <Field label="رقم الهاتف"><input className={inputClass} dir="ltr" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="العنوان"><input className={inputClass} value={form.address} onChange={set('address')} /></Field>
        <Field label="ملاحظات"><textarea className={`${inputClass} h-16`} value={form.notes} onChange={set('notes')} /></Field>
        <SubmitRow onCancel={onClose} isSubmitting={isSubmitting} />
      </form>
    </Modal>
  );
}

function SupplierPaymentForm({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState({ amount: '', payment_method: 'cash', payment_date: todayStr(), notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post(`/suppliers/${supplier.id}/payments`, { ...form, notes: form.notes || null });
      toast.success('تم تسجيل الدفعة وإضافتها للمالية');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={`دفعة للمورد: ${supplier.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className={`text-xs font-black ${balanceClass(supplier.balance)}`}>الرصيد الحالي: <span dir="ltr">{formatBalance(supplier.balance)}</span></p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="المبلغ *"><input type="number" min="0.01" step="0.01" required className={inputClass} value={form.amount} onChange={set('amount')} /></Field>
          <Field label="تاريخ الدفع *"><input type="date" required className={inputClass} value={form.payment_date} onChange={set('payment_date')} /></Field>
        </div>
        <Field label="طريقة الدفع">
          <select className={inputClass} value={form.payment_method} onChange={set('payment_method')}>
            {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="ملاحظات"><input className={inputClass} value={form.notes} onChange={set('notes')} /></Field>
        <SubmitRow onCancel={onClose} isSubmitting={isSubmitting} />
      </form>
    </Modal>
  );
}

/** Purchases (+debt) and payments (−debt) merged by date, newest first */
function SupplierStatement({ supplierId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    apiClient.get(`/suppliers/${supplierId}`).then(setData).catch(() => setError(true));
  }, [supplierId]);

  useEffect(() => { load(); }, [load]);

  const deletePayment = async (p) => {
    if (!window.confirm('حذف هذه الدفعة؟ ستُحذف أيضاً من صفحة المالية.')) return;
    try {
      await apiClient.delete(`/suppliers/${supplierId}/payments/${p.id}`);
      toast.success('تم حذف الدفعة');
      load();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const entries = data
    ? [
        ...data.purchases.map((p) => ({ key: `p${p.id}`, date: p.purchase_date, kind: 'purchase', item: p })),
        ...data.payments.map((p) => ({ key: `y${p.id}`, date: p.payment_date, kind: 'payment', item: p })),
      ].sort((a, b) => String(b.date).localeCompare(String(a.date)))
    : [];

  return (
    <Modal title={data ? `كشف حساب: ${data.supplier.name}` : 'كشف حساب'} onClose={onClose} wide>
      {error ? (
        <p className="text-xs text-rose-600 font-bold text-center py-4">تعذر تحميل كشف الحساب</p>
      ) : !data ? (
        <p className="text-xs text-slate-400 font-bold text-center py-4">جاري التحميل...</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 rounded-xl p-2.5">
              <span className="block text-[10px] font-bold text-slate-400">المشتريات</span>
              <span className="text-xs font-black text-slate-800">{money(data.supplier.purchases_total)}</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5">
              <span className="block text-[10px] font-bold text-slate-400">المدفوع</span>
              <span className="text-xs font-black text-slate-800">{money(data.supplier.payments_total)}</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5">
              <span className="block text-[10px] font-bold text-slate-400">الرصيد</span>
              <span className={`text-xs font-black ${balanceClass(data.supplier.balance)}`} dir="ltr">{formatBalance(data.supplier.balance)}</span>
            </div>
          </div>
          {entries.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold text-center py-4">لا توجد حركات بعد</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {entries.map(({ key, kind, item }) => (
                <li key={key} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black text-slate-700">
                      {kind === 'purchase' ? 'فاتورة شراء' : `دفعة (${PAYMENT_METHODS.find((m) => m.id === item.payment_method)?.label || item.payment_method})`}
                      <span className="text-slate-400 font-bold"> · {formatDate(kind === 'purchase' ? item.purchase_date : item.payment_date)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold truncate">
                      {kind === 'purchase'
                        ? item.items.map((it) => `${it.material?.name} ${qty(it.quantity)}`).join(' · ')
                        : item.notes || ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`font-black ${kind === 'purchase' ? 'text-rose-600' : 'text-emerald-600'}`} dir="ltr">
                      {kind === 'purchase' ? '-' : '+'}{money(kind === 'purchase' ? item.total_amount : item.amount)}
                    </span>
                    {kind === 'payment' && (
                      <button type="button" onClick={() => deletePayment(item)} className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline cursor-pointer">حذف</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
