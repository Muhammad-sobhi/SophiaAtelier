import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Paperclip, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { Modal, Field, SubmitRow, inputClass, errorMessage, todayStr } from '@/components/manufacturing/shared';

// Same keys as the finance page payment method cards
export const PAYMENT_METHODS = [
  { id: 'cash', label: 'نقدي (كاش)' },
  { id: 'instapay', label: 'إنستاباي' },
  { id: 'vodafone_cash', label: 'فودافون كاش' },
  { id: 'credit_card', label: 'فيزا / كارت' },
  { id: 'bank_transfer', label: 'تحويل بنكي' },
];

export const formatMoney = (v) => `${(Number(v) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ج.م`;

/** Reads an image as a data URL (the backend stores base64 receipts) */
export function readImage(file, onDone) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast.error('الفاتورة لازم تكون صورة');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('حجم الصورة أكبر من 5 ميجا');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onDone(reader.result);
  reader.readAsDataURL(file);
}

/** Receipt picker: shows the stored or newly picked image, with remove */
export function ReceiptInput({ id, value, existingUrl, onPick, onRemove }) {
  const shown = value || existingUrl;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 cursor-pointer">
        <Paperclip size={13} />
        {shown ? 'تغيير الفاتورة' : 'رفع صورة الفاتورة'}
      </label>
      <input id={id} type="file" accept="image/*" className="hidden" onChange={(e) => { readImage(e.target.files?.[0], onPick); e.target.value = ''; }} />
      {shown && (
        <>
          <a href={shown} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-indigo-600 underline">عرض</a>
          <button type="button" onClick={onRemove} aria-label="حذف الفاتورة" className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"><X size={13} /></button>
        </>
      )}
    </div>
  );
}

const emptyPayment = () => ({ amount: '', due_date: todayStr(), paid: false, paid_date: todayStr(), payment_method: 'cash', receipt: null, receipt_url: null, remove_receipt: false, notes: '' });

/**
 * Create / edit a dress purchase (a normal purchase, or our share of a dress shared with a bride).
 * mode "legacy": completing an old dress that already has a cost — paid in full before, or still owed.
 * The backend checks every amount and writes the finance entries; this form only collects the data.
 */
export default function DressPurchaseForm({ purchase = null, legacyDress = null, onClose, onSaved }) {
  const isLegacy = Boolean(legacyDress) || Number(purchase?.prior_paid) > 0;
  const [type, setType] = useState(purchase?.type || 'purchase');
  const [dress, setDress] = useState(purchase?.dress || legacyDress || null);
  const [dressSearch, setDressSearch] = useState('');
  const [dressResults, setDressResults] = useState([]);
  const [suppliers, setSuppliers] = useState(null);
  const [supplierId, setSupplierId] = useState(purchase?.supplier_id ? String(purchase.supplier_id) : '');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [partnerName, setPartnerName] = useState(purchase?.partner_name || '');
  const [dressTotalPrice, setDressTotalPrice] = useState(purchase?.dress_total_price || '');
  const [amount, setAmount] = useState(purchase?.amount || legacyDress?.purchase_price || '');
  const [purchaseDate, setPurchaseDate] = useState(purchase?.purchase_date || legacyDress?.purchase_date?.slice?.(0, 10) || todayStr());
  // legacy: 'paid' = paid in full before recording, 'owed' = part was paid before, the rest is scheduled
  const [legacyState, setLegacyState] = useState(purchase && Number(purchase.prior_paid) < Number(purchase.amount) ? 'owed' : 'paid');
  const [priorPaid, setPriorPaid] = useState(purchase?.prior_paid && Number(purchase.prior_paid) > 0 ? purchase.prior_paid : '');
  const [receipt, setReceipt] = useState(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [notes, setNotes] = useState(purchase?.notes || '');
  const [payments, setPayments] = useState(() => {
    if (purchase?.payments?.length) {
      return purchase.payments.map((p) => ({
        id: p.id, amount: p.amount, due_date: p.due_date, paid: Boolean(p.paid_date),
        paid_date: p.paid_date || todayStr(), payment_method: p.payment_method || 'cash',
        receipt: null, receipt_url: p.receipt_url, remove_receipt: false, notes: p.notes || '',
      }));
    }
    return isLegacy ? [] : [emptyPayment()];
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/suppliers').then((res) => setSuppliers(res?.data || [])).catch(() => setSuppliers([]));
  }, []);

  // Dress search (only when picking a dress)
  useEffect(() => {
    if (dress || dressSearch.trim().length < 1) { setDressResults([]); return; }
    let active = true;
    const timer = setTimeout(() => {
      apiClient.get(`/dresses?search=${encodeURIComponent(dressSearch.trim())}&per_page=10`)
        .then((res) => active && setDressResults(Array.isArray(res) ? res : res?.data || []))
        .catch(() => active && setDressResults([]));
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [dressSearch, dress]);

  const legacyFullyPaid = isLegacy && legacyState === 'paid';
  const setPayment = (i, patch) => setPayments((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addSupplier = async () => {
    const name = newSupplierName.trim();
    if (!name) return;
    try {
      const created = await apiClient.post('/suppliers', { name });
      setSuppliers((list) => [...(list || []), created]);
      setSupplierId(String(created.id));
      setNewSupplierName('');
    } catch (err) {
      toast.error(errorMessage(err, 'تعذر إضافة المورد'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!dress) { toast.error('اختر الفستان'); return; }

    const payload = {
      dress_id: dress.id,
      supplier_id: supplierId ? Number(supplierId) : null,
      type,
      partner_name: type === 'shared' ? partnerName.trim() : null,
      dress_total_price: type === 'shared' ? dressTotalPrice : null,
      amount,
      prior_paid: isLegacy ? (legacyFullyPaid ? amount : priorPaid || 0) : 0,
      purchase_date: purchaseDate,
      notes: notes.trim() || null,
      receipt: receipt || null,
      remove_receipt: removeReceipt,
      payments: legacyFullyPaid ? [] : payments.map((p) => ({
        id: p.id || null,
        amount: p.amount,
        due_date: p.due_date,
        paid: p.paid,
        paid_date: p.paid ? p.paid_date : null,
        payment_method: p.paid ? p.payment_method : null,
        receipt: p.receipt || null,
        remove_receipt: p.remove_receipt,
        notes: p.notes || null,
      })),
    };

    setIsSaving(true);
    try {
      if (purchase) await apiClient.put(`/dress-purchases/${purchase.id}`, payload);
      else await apiClient.post('/dress-purchases', payload);
      toast.success('تم حفظ بيانات الشراء');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, 'تعذر حفظ بيانات الشراء'));
    } finally {
      setIsSaving(false);
    }
  };

  const title = purchase ? 'تعديل بيانات شراء فستان' : isLegacy ? 'استكمال بيانات شراء فستان قديم' : 'تسجيل شراء فستان';

  return (
    <Modal title={title} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="نوع الشراء">
          {[['purchase', 'شراء فستان'], ['shared', 'مشاركة مع عروسة']].map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={type === id} onClick={() => setType(id)}
              className={`py-2.5 rounded-xl text-xs font-black border cursor-pointer ${type === id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Dress */}
        <Field label="الفستان">
          {dress ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-black text-slate-800 truncate">{dress.code ? `${dress.code} — ` : ''}{dress.name}</span>
              {!legacyDress && (
                <button type="button" onClick={() => setDress(null)} className="text-[11px] font-bold text-indigo-600 cursor-pointer">تغيير</button>
              )}
            </div>
          ) : (
            <div className="relative">
              <input value={dressSearch} onChange={(e) => setDressSearch(e.target.value)} placeholder="ابحث باسم أو كود الفستان..." className={`${inputClass} pr-8`} />
              <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              {dressResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {dressResults.map((d) => (
                    <li key={d.id}>
                      <button type="button" onClick={() => { setDress(d); setDressSearch(''); }} className="w-full text-right px-3 py-2 text-xs font-bold hover:bg-indigo-50 cursor-pointer">
                        {d.code ? `${d.code} — ` : ''}{d.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] font-bold text-slate-400 mt-1">لو الفستان مش موجود، أضفه الأول من صفحة الفساتين.</p>
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="المورد (اختياري)">
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass} disabled={!suppliers}>
              <option value="">{suppliers ? 'بدون مورد' : 'جاري التحميل...'}</option>
              {(suppliers || []).map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="أو أضف مورد جديد">
            <div className="flex gap-1.5">
              <input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} placeholder="اسم المورد" className={inputClass} />
              <button type="button" onClick={addSupplier} disabled={!newSupplierName.trim()} className="px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black text-slate-700 cursor-pointer disabled:opacity-40">إضافة</button>
            </div>
          </Field>
        </div>

        {type === 'shared' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-violet-50/60 border border-violet-100 rounded-2xl">
            <Field label="اسم العروسة المشاركة (للعلم)">
              <input required value={partnerName} onChange={(e) => setPartnerName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="إجمالي سعر الفستان كله (للعلم)">
              <input required type="number" min="0.01" step="0.01" value={dressTotalPrice} onChange={(e) => setDressTotalPrice(e.target.value)} className={inputClass} />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={type === 'shared' ? 'نصيبنا (المبلغ المطلوب منا)' : 'سعر الفستان (المبلغ المطلوب منا)'}>
            <input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
          </Field>
          <Field label="تاريخ الشراء">
            <input required type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label="فاتورة الشراء">
          <ReceiptInput id="dress-purchase-receipt" value={receipt} existingUrl={removeReceipt ? null : purchase?.receipt_url}
            onPick={(v) => { setReceipt(v); setRemoveReceipt(false); }} onRemove={() => { setReceipt(null); setRemoveReceipt(true); }} />
        </Field>

        {/* Old dress: paid before recording, or still owed */}
        {isLegacy && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
            <p className="text-[11px] font-bold text-amber-800">الفلوس اللي اتدفعت قبل التسجيل هنا مش هتتسجل مصروف جديد، عشان ما تتحسبش مرتين.</p>
            <div className="grid grid-cols-2 gap-2">
              {[['paid', 'مدفوع بالكامل قبل كده'], ['owed', 'لسه عليه فلوس']].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setLegacyState(id)}
                  className={`py-2 rounded-xl text-xs font-black border cursor-pointer ${legacyState === id ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                  {label}
                </button>
              ))}
            </div>
            {legacyState === 'owed' && (
              <Field label="اتدفع منه قبل كده">
                <input type="number" min="0" step="0.01" value={priorPaid} onChange={(e) => setPriorPaid(e.target.value)} className={inputClass} />
              </Field>
            )}
          </div>
        )}

        {/* Payment schedule */}
        {!legacyFullyPaid && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700">{isLegacy ? 'الدفعات الباقية' : 'الدفعات'}</span>
              <button type="button" onClick={() => setPayments((rows) => [...rows, emptyPayment()])} className="flex items-center gap-1 text-[11px] font-black text-indigo-600 cursor-pointer">
                <Plus size={13} /> إضافة دفعة
              </button>
            </div>
            <p className="text-[10px] font-bold text-slate-400">مجموع الدفعات{isLegacy ? ' + المدفوع قبل كده' : ''} لازم يساوي المبلغ المطلوب. الدفعة اللي لسه ما اتدفعتش هيجيلك تنبيه قبل ميعادها بيوم ويوم الميعاد.</p>
            {payments.map((p, i) => (
              <div key={p.id || `new-${i}`} className="p-3 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <Field label="المبلغ">
                    <input required type="number" min="0.01" step="0.01" value={p.amount} onChange={(e) => setPayment(i, { amount: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="تاريخ الاستحقاق">
                    <input required type="date" value={p.due_date} onChange={(e) => setPayment(i, { due_date: e.target.value })} className={inputClass} />
                  </Field>
                  <button type="button" onClick={() => setPayments((rows) => rows.filter((_, idx) => idx !== i))} aria-label="حذف الدفعة" className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer w-fit">
                  <input type="checkbox" checked={p.paid} onChange={(e) => setPayment(i, { paid: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
                  اتدفعت
                </label>
                {p.paid && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Field label="تاريخ الدفع">
                      <input required type="date" value={p.paid_date} onChange={(e) => setPayment(i, { paid_date: e.target.value })} className={inputClass} />
                    </Field>
                    <Field label="طريقة الدفع">
                      <select value={p.payment_method} onChange={(e) => setPayment(i, { payment_method: e.target.value })} className={inputClass}>
                        {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                    </Field>
                    <div className="sm:col-span-2">
                      <ReceiptInput id={`dress-payment-receipt-${i}`} value={p.receipt} existingUrl={p.remove_receipt ? null : p.receipt_url}
                        onPick={(v) => setPayment(i, { receipt: v, remove_receipt: false })} onRemove={() => setPayment(i, { receipt: null, remove_receipt: true })} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Field label="ملاحظات">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>

        <SubmitRow onCancel={onClose} isSubmitting={isSaving} />
      </form>
    </Modal>
  );
}
