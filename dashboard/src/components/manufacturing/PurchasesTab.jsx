import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  Modal, Field, SubmitRow, EmptyState, LoadError, PrimaryButton, MaterialItemsInput, emptyItem,
  inputClass, money, qty, todayStr, errorMessage, PAYMENT_METHODS,
} from './shared';
import { IconBtn } from './MaterialsTab';
import { PurchaseWizard } from './Wizards';
import { confirmDialog } from '@/components/ui/ConfirmDialog';

export default function PurchasesTab({ materials, meta, suppliers, stepMode, reloadShared }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [editing, setEditing] = useState(null); // {} = new invoice

  const load = useCallback(() => {
    setError(false);
    apiClient.get('/material-purchases', { params: { page } })
      .then((res) => {
        setRows(res.data || []);
        setLastPage(res.last_page || 1);
      })
      .catch(() => setError(true));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (p) => {
    if (!await confirmDialog('حذف فاتورة الشراء نهائياً؟ ستُخصم كمياتها من المخزن ويُعاد حساب متوسط التكلفة، وتُحذف دفعاتها من المالية ومن رصيد المورد.')) return;
    try {
      await apiClient.delete(`/material-purchases/${p.id}`);
      toast.success('تم حذف الفاتورة');
      load();
      reloadShared();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-500">فواتير شراء الخامات تزيد المخزن تلقائياً، والمدفوع منها يظهر في صفحة المالية.</p>
        <PrimaryButton onClick={() => setEditing({})}>فاتورة شراء</PrimaryButton>
      </div>

      {error ? <LoadError onRetry={load} /> : !rows ? (
        <p className="text-xs text-slate-400 font-bold text-center py-6">جاري التحميل...</p>
      ) : rows.length === 0 ? (
        <EmptyState>لا توجد فواتير شراء بعد</EmptyState>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => {
            const paid = p.supplier_id ? parseFloat(p.paid_amount || 0) : parseFloat(p.total_amount);
            const remaining = parseFloat(p.total_amount) - paid;
            return (
              <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-800">
                    {p.supplier?.name || 'شراء نقدي (بدون مورد)'}
                    <span className="text-slate-400 font-bold"> · {formatDate(p.purchase_date)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                    {p.items.map((it) => `${it.material?.name} ${qty(it.quantity)} × ${money(it.unit_price)}`).join(' · ')}
                  </div>
                  {p.notes && <div className="text-[10px] text-slate-400 font-bold mt-0.5">{p.notes}</div>}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 border-t sm:border-0 border-slate-100 pt-2 sm:pt-0">
                  <div className="text-left">
                    <div className="text-sm font-black text-slate-800">{money(p.total_amount)}</div>
                    <div className={`text-[10px] font-black ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {remaining > 0 ? `آجل ${money(remaining)}` : 'مدفوعة'}
                    </div>
                  </div>
                  <IconBtn title="تعديل الفاتورة" onClick={() => setEditing(p)}><Edit3 size={13} /></IconBtn>
                  <IconBtn title="حذف الفاتورة" danger onClick={() => handleDelete(p)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
            );
          })}
          {lastPage > 1 && (
            <div className="flex justify-center gap-2 pt-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer">السابق</button>
              <span className="text-xs font-bold text-slate-500 py-1.5">{page} / {lastPage}</span>
              <button type="button" disabled={page >= lastPage} onClick={() => setPage(page + 1)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer">التالي</button>
            </div>
          )}
        </div>
      )}

      {editing && (stepMode ? (
        <PurchaseWizard
          purchase={editing.id ? editing : null}
          materials={materials}
          meta={meta}
          suppliers={suppliers}
          reloadShared={reloadShared}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      ) : (
        <PurchaseForm
          purchase={editing.id ? editing : null}
          materials={materials}
          suppliers={suppliers}
          onClose={() => setEditing(null)}
          onSaved={() => { load(); reloadShared(); }}
        />
      ))}
    </div>
  );
}

function PurchaseForm({ purchase, materials, suppliers, onClose, onSaved }) {
  const [supplierId, setSupplierId] = useState(purchase?.supplier_id ? String(purchase.supplier_id) : '');
  const [date, setDate] = useState(purchase?.purchase_date?.substring(0, 10) || todayStr());
  const [items, setItems] = useState(
    purchase?.items?.length
      ? purchase.items.map((it) => ({ material_id: String(it.material_id), quantity: String(parseFloat(it.quantity)), unit_price: String(parseFloat(it.unit_price)) }))
      : [emptyItem()]
  );
  const [paid, setPaid] = useState(purchase?.supplier_id && parseFloat(purchase.paid_amount) > 0 ? String(parseFloat(purchase.paid_amount)) : '');
  const [method, setMethod] = useState(purchase?.payments?.[0]?.payment_method || purchase?.expense?.payment_method || 'cash');
  const [notes, setNotes] = useState(purchase?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    if (supplierId && parseFloat(paid || 0) > total) {
      toast.error('المدفوع الآن أكبر من إجمالي الفاتورة — سجّل الزيادة كدفعة للمورد');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        supplier_id: supplierId || null,
        purchase_date: date,
        paid_amount: supplierId ? parseFloat(paid || 0) : null,
        payment_method: method,
        notes: notes || null,
        items,
      };
      if (purchase) await apiClient.put(`/material-purchases/${purchase.id}`, payload);
      else await apiClient.post('/material-purchases', payload);
      toast.success(purchase ? 'تم تعديل الفاتورة وتحديث المخزن والمالية' : 'تم تسجيل الفاتورة وإضافة الكميات للمخزن');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={purchase ? 'تعديل فاتورة شراء' : 'فاتورة شراء خامات'} onClose={onClose} wide>
      {materials.length === 0 ? (
        <p className="text-xs font-bold text-slate-500 text-center py-4">أضف الخامات أولاً من تبويب "الخامات والمخزن".</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Field label="المورد">
              <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">بدون مورد (شراء نقدي)</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="تاريخ الشراء *"><input type="date" required className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>

          <MaterialItemsInput items={items} setItems={setItems} materials={materials} withPrice />

          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-xs font-black text-indigo-900">
            <span>إجمالي الفاتورة</span>
            <span>{money(total)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {supplierId ? (
              <Field label="المدفوع الآن (والباقي آجل على المورد)">
                <input type="number" min="0" step="0.01" className={inputClass} value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" />
              </Field>
            ) : (
              <p className="text-[10px] font-bold text-slate-500 self-end pb-2">الشراء بدون مورد يُسجل مدفوعاً بالكامل في المالية.</p>
            )}
            <Field label="طريقة الدفع">
              <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="ملاحظات / رقم الفاتورة"><input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <SubmitRow onCancel={onClose} isSubmitting={isSubmitting} />
        </form>
      )}
    </Modal>
  );
}
