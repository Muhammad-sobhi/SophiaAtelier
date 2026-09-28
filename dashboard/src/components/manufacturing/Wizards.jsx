import React, { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Plus, RefreshCw, ShoppingCart, Store, Wallet } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { Modal, Field, MaterialItemsInput, emptyItem, inputClass, money, qty, todayStr, errorMessage, PAYMENT_METHODS } from './shared';
import { MaterialForm } from './MaterialsTab';
import { SupplierForm } from './SuppliersTab';
import { WorkerForm } from './WorkersTab';

/**
 * Guided entry: each step picks an existing record or creates it inline, so nothing is
 * saved while something it depends on is still missing. `blocker` explains why "next" is disabled.
 */
function StepWizard({ title, steps, step, setStep, blocker, onSubmit, isSubmitting, submitLabel, onClose, children }) {
  const isLast = step === steps.length - 1;
  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="space-y-4">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
          {steps.map((label, i) => (
            <li key={label} className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                disabled={i >= step}
                onClick={() => setStep(i)}
                aria-label={`الخطوة ${i + 1}: ${label}`}
                className="flex items-center gap-1.5 disabled:cursor-default cursor-pointer"
              >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                  i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </span>
              <span className={`text-[11px] font-black ${i === step ? 'text-slate-800' : i < step ? 'text-slate-600 underline decoration-dotted' : 'text-slate-400'}`}>{label}</span>
              </button>
              {i < steps.length - 1 && <span className="w-4 h-px bg-slate-200" />}
            </li>
          ))}
        </ol>

        <div className="min-h-[180px]">{children}</div>

        {blocker && <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{blocker}</p>}

        <div className="flex justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer flex items-center gap-1"
          >
            <ChevronRight size={13} /> {step === 0 ? 'إلغاء' : 'السابق'}
          </button>
          <button
            type="button"
            disabled={Boolean(blocker) || isSubmitting}
            onClick={() => (isLast ? onSubmit() : setStep(step + 1))}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSubmitting && <RefreshCw size={12} className="animate-spin" />}
            {isLast ? submitLabel : <>التالي <ChevronLeft size={13} /></>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ChoiceCard({ active, onClick, icon: Icon, title, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-right p-3 rounded-2xl border-2 cursor-pointer transition-all ${active ? 'border-indigo-500 bg-indigo-50/60' : 'border-slate-100 bg-white hover:border-slate-200'}`}
    >
      <Icon size={16} className={active ? 'text-indigo-600' : 'text-slate-400'} />
      <span className="block text-xs font-black text-slate-800 mt-1.5">{title}</span>
      <span className="block text-[10px] font-bold text-slate-400 mt-0.5">{hint}</span>
    </button>
  );
}

function AddNewButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap">
      <Plus size={12} /> {children}
    </button>
  );
}

function ReviewRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-xs">
      <span className="font-bold text-slate-400">{label}</span>
      <span className="font-black text-slate-800 text-left">{children}</span>
    </div>
  );
}

const itemsBlocker = (items, withPrice) => {
  const incomplete = items.some((it) => !it.material_id || !(parseFloat(it.quantity) > 0) || (withPrice && (it.unit_price === '' || parseFloat(it.unit_price) < 0)));
  return incomplete ? `أكمل بيانات كل سطر (الخامة، الكمية${withPrice ? '، سعر الوحدة' : ''}) أو احذف السطر الفارغ` : null;
};

/** Supplier (or cash) → materials → payment → review */
export function PurchaseWizard({ purchase = null, materials, meta, suppliers, reloadShared, onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(purchase ? (purchase.supplier_id ? 'supplier' : 'cash') : ''); // 'supplier' | 'cash'
  const [supplierId, setSupplierId] = useState(purchase?.supplier_id ? String(purchase.supplier_id) : '');
  const [items, setItems] = useState(
    purchase?.items?.length
      ? purchase.items.map((it) => ({ material_id: String(it.material_id), quantity: String(parseFloat(it.quantity)), unit_price: String(parseFloat(it.unit_price)) }))
      : [emptyItem()]
  );
  const [date, setDate] = useState(purchase?.purchase_date?.substring(0, 10) || todayStr());
  const [paid, setPaid] = useState(purchase?.supplier_id && parseFloat(purchase.paid_amount) > 0 ? String(parseFloat(purchase.paid_amount)) : '');
  const [method, setMethod] = useState(purchase?.payments?.[0]?.payment_method || purchase?.expense?.payment_method || 'cash');
  const [notes, setNotes] = useState(purchase?.notes || '');
  const [creating, setCreating] = useState(null); // 'supplier' | 'material'
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supplier = suppliers.find((s) => String(s.id) === String(supplierId));
  const total = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0), 0);
  const materialOf = (id) => materials.find((m) => String(m.id) === String(id));

  const blocker = [
    () => (!mode ? 'اختر طريقة الشراء' : mode === 'supplier' && !supplierId ? 'اختر المورد أو أضف مورداً جديداً' : null),
    () => (materials.length === 0 ? 'لا توجد خامات بعد — أضف خامة جديدة' : itemsBlocker(items, true)),
    () => (!date ? 'حدد تاريخ الشراء' : mode === 'supplier' && parseFloat(paid || 0) > total ? 'المدفوع الآن أكبر من إجمالي الفاتورة' : null),
    () => null,
  ][step]();

  const supplierCreated = async (saved) => {
    await reloadShared();
    if (saved?.id) setSupplierId(String(saved.id));
  };

  const materialCreated = async (saved) => {
    await reloadShared();
    if (!saved?.id) return;
    const empty = items.findIndex((it) => !it.material_id);
    const row = { material_id: String(saved.id), quantity: '', unit_price: '' };
    setItems(empty >= 0 ? items.map((it, i) => (i === empty ? { ...it, material_id: row.material_id } : it)) : [...items, row]);
  };

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        supplier_id: mode === 'supplier' ? supplierId : null,
        purchase_date: date,
        paid_amount: mode === 'supplier' ? parseFloat(paid || 0) : null,
        payment_method: method,
        notes: notes || null,
        items,
      };
      if (purchase) {
        await apiClient.put(`/material-purchases/${purchase.id}`, payload);
        toast.success('تم تعديل الفاتورة وتحديث المخزن والمالية');
      } else {
        await apiClient.post('/material-purchases', payload);
        toast.success('تم تسجيل الفاتورة وإضافة الكميات للمخزن');
      }
      await reloadShared();
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <StepWizard
        title={purchase ? 'تعديل فاتورة شراء' : 'شراء خامات'}
        steps={['المورد', 'الخامات', 'الدفع', 'المراجعة']}
        step={step}
        setStep={setStep}
        blocker={blocker}
        onSubmit={submit}
        isSubmitting={isSubmitting}
        submitLabel={purchase ? 'حفظ التعديل' : 'تسجيل الفاتورة'}
        onClose={onClose}
      >
        {step === 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <ChoiceCard active={mode === 'supplier'} onClick={() => setMode('supplier')} icon={Store} title="من مورد" hint="يمكن الدفع جزئياً والباقي آجل" />
              <ChoiceCard active={mode === 'cash'} onClick={() => { setMode('cash'); setSupplierId(''); }} icon={Wallet} title="شراء نقدي بدون مورد" hint="يُسجل مدفوعاً بالكامل" />
            </div>
            {mode === 'supplier' && (
              <div className="flex items-end gap-2">
                <Field label="المورد *" className="flex-1">
                  <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value="">اختر المورد...</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <AddNewButton onClick={() => setCreating('supplier')}>مورد جديد</AddNewButton>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          materials.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs font-bold text-slate-500">لا توجد خامات مسجلة بعد.</p>
              <div className="flex justify-center"><AddNewButton onClick={() => setCreating('material')}>إضافة أول خامة</AddNewButton></div>
            </div>
          ) : (
            <div className="space-y-3">
              <MaterialItemsInput
                items={items}
                setItems={setItems}
                materials={materials}
                withPrice
                preferredSupplierId={supplierId || null}
                onCreateMaterial={() => setCreating('material')}
              />
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-xs font-black text-indigo-900">
                <span>إجمالي الفاتورة</span>
                <span>{money(total)}</span>
              </div>
            </div>
          )
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label="تاريخ الشراء *"><input type="date" required className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label="طريقة الدفع">
                <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </Field>
              {mode === 'supplier' ? (
                <Field label={`المدفوع الآن من ${money(total)} (والباقي آجل على المورد)`}>
                  <input type="number" min="0" step="0.01" className={inputClass} value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" />
                </Field>
              ) : (
                <p className="text-[11px] font-bold text-slate-500 self-end pb-2">سيُسجل المبلغ {money(total)} مدفوعاً بالكامل في المالية.</p>
              )}
            </div>
            <Field label="ملاحظات / رقم الفاتورة"><input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
        )}

        {step === 3 && purchase && (
          <p className="text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 mb-2">
            عند الحفظ تُلغى الفاتورة القديمة بالكامل (المخزن، متوسط التكلفة، المالية، رصيد المورد) وتُسجل هذه البيانات مكانها.
          </p>
        )}
        {step === 3 && (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl px-3">
            <ReviewRow label="المورد">{mode === 'supplier' ? supplier?.name : 'شراء نقدي (بدون مورد)'}</ReviewRow>
            <ReviewRow label="التاريخ">{formatDate(date)}</ReviewRow>
            <ReviewRow label="الخامات">
              {items.map((it, i) => {
                const m = materialOf(it.material_id);
                return <div key={i}>{m?.name} — {qty(it.quantity)} {m?.unit_label} × {money(it.unit_price)}</div>;
              })}
            </ReviewRow>
            <ReviewRow label="الإجمالي">{money(total)}</ReviewRow>
            {mode === 'supplier' && (
              <>
                <ReviewRow label="المدفوع الآن">{money(paid)}</ReviewRow>
                <ReviewRow label="آجل على المورد"><span className="text-rose-600">{money(total - parseFloat(paid || 0))}</span></ReviewRow>
              </>
            )}
            <ReviewRow label="طريقة الدفع">{PAYMENT_METHODS.find((m) => m.id === method)?.label}</ReviewRow>
            {notes && <ReviewRow label="ملاحظات">{notes}</ReviewRow>}
          </div>
        )}
      </StepWizard>

      {creating === 'supplier' && <SupplierForm supplier={{}} onClose={() => setCreating(null)} onSaved={supplierCreated} />}
      {creating === 'material' && (
        <MaterialForm material={{ supplier_id: supplierId }} meta={meta} suppliers={suppliers} onClose={() => setCreating(null)} onSaved={materialCreated} />
      )}
    </>
  );
}

const EDITABLE_STATUSES = { planned: 'مخطط', in_progress: 'قيد التصنيع', completed: 'انتهى التصنيع (بانتظار الموافقة)', cancelled: 'ملغي' };

/** Piece → worker → materials from stock → review */
export function OrderWizard({ order = null, materials, meta, suppliers, workers, reloadShared, onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: order?.title || '',
    status: order?.status || 'planned',
    start_date: order ? order.start_date || '' : todayStr(),
    due_date: order?.due_date || '',
    completed_date: order?.completed_date || '',
    notes: order?.notes || '',
  });
  const [workerId, setWorkerId] = useState(order?.worker_id ? String(order.worker_id) : '');
  const [workerLater, setWorkerLater] = useState(Boolean(order && !order.worker_id));
  const [fee, setFee] = useState(order && parseFloat(order.worker_fee) > 0 ? String(parseFloat(order.worker_fee)) : '');
  const [items, setItems] = useState([]);
  const [used, setUsed] = useState([]); // materials already taken from stock for this order

  const loadUsed = useCallback(() => {
    if (!order) return;
    apiClient.get(`/manufacturing-orders/${order.id}`)
      .then((res) => setUsed(res.material_movements || []))
      .catch(() => toast.error('تعذر تحميل خامات الأمر'));
  }, [order]);

  useEffect(() => { loadUsed(); }, [loadUsed]);

  const returnUsed = async (mv) => {
    if (!window.confirm(`إرجاع ${mv.material?.name} للمخزن وحذفها من الأمر؟`)) return;
    try {
      await apiClient.delete(`/manufacturing-orders/${order.id}/materials/${mv.id}`);
      toast.success('تم إرجاع الخامة للمخزن');
      loadUsed();
      reloadShared();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const [creating, setCreating] = useState(null); // 'worker' | 'purchase'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const worker = workers.find((w) => String(w.id) === String(workerId));
  const inStock = materials.filter((m) => parseFloat(m.quantity) > 0);
  const materialOf = (id) => materials.find((m) => String(m.id) === String(id));
  const materialsCost = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0) * (parseFloat(materialOf(it.material_id)?.avg_cost) || 0), 0)
    + used.reduce((sum, mv) => sum + -parseFloat(mv.quantity) * parseFloat(mv.unit_cost), 0);

  const pickWorker = (id) => {
    const w = workers.find((x) => String(x.id) === id);
    setWorkerId(id);
    setWorkerLater(false);
    // Suggest the worker's usual piece rate
    if (w && w.pay_type !== 'monthly' && fee === '') setFee(String(parseFloat(w.piece_rate) || ''));
  };

  const stockBlocker = () => {
    const incomplete = itemsBlocker(items, false);
    if (incomplete) return incomplete;
    const needed = {};
    items.forEach((it) => { needed[it.material_id] = (needed[it.material_id] || 0) + parseFloat(it.quantity); });
    for (const [id, amount] of Object.entries(needed)) {
      const m = materialOf(id);
      if (m && amount > parseFloat(m.quantity)) return `الكمية المطلوبة من "${m.name}" أكبر من المتاح (${qty(m.quantity)} ${m.unit_label}) — اشترِ الكمية الناقصة أولاً`;
    }
    return null;
  };

  const blocker = [
    () => (!form.title.trim() ? 'اكتب اسم القطعة المطلوب تصنيعها'
      : form.due_date && form.start_date && form.due_date < form.start_date ? 'تاريخ التسليم قبل تاريخ البدء' : null),
    () => (!workerId && !workerLater ? 'اختر العامل أو أضف عاملاً جديداً (أو حدد "لاحقاً")' : parseFloat(fee || 0) < 0 ? 'الأجر غير صحيح' : null),
    stockBlocker,
    () => null,
  ][step]();

  const workerCreated = async (saved) => {
    await reloadShared();
    if (saved?.id) {
      setWorkerId(String(saved.id));
      setWorkerLater(false);
      if (saved.pay_type !== 'monthly' && fee === '') setFee(String(parseFloat(saved.piece_rate) || ''));
    }
  };

  const submit = async () => {
    setIsSubmitting(true);
    let saved;
    const payload = {
      ...form,
      title: form.title.trim(),
      worker_id: workerId || null,
      due_date: form.due_date || null,
      start_date: form.start_date || null,
      completed_date: form.status === 'completed' ? form.completed_date || null : null,
      worker_fee: fee || 0,
      notes: form.notes || null,
    };
    try {
      saved = order
        ? await apiClient.put(`/manufacturing-orders/${order.id}`, payload)
        : await apiClient.post('/manufacturing-orders', payload);
    } catch (err) {
      toast.error(errorMessage(err));
      setIsSubmitting(false);
      return;
    }
    try {
      if (items.length > 0) {
        await apiClient.post(`/manufacturing-orders/${saved.id}/materials`, { movement_date: todayStr(), items });
      }
      toast.success(order ? 'تم حفظ تعديلات أمر التصنيع' : items.length ? 'تم إنشاء أمر التصنيع وصرف الخامات من المخزن' : 'تم إنشاء أمر التصنيع');
    } catch (err) {
      toast.error(`تم حفظ أمر التصنيع لكن تعذر صرف الخامات: ${errorMessage(err)} — اصرفها من تفاصيل الأمر`);
    }
    await reloadShared();
    onSaved?.();
    setIsSubmitting(false);
    onClose();
  };

  return (
    <>
      <StepWizard
        title={order ? `تعديل: ${order.title}` : 'أمر تصنيع جديد'}
        steps={['القطعة', 'العامل', 'الخامات', 'المراجعة']}
        step={step}
        setStep={setStep}
        blocker={blocker}
        onSubmit={submit}
        isSubmitting={isSubmitting}
        submitLabel={order ? 'حفظ التعديل' : 'إنشاء أمر التصنيع'}
        onClose={onClose}
      >
        {step === 0 && (
          <div className="space-y-3">
            <Field label="القطعة المطلوب تصنيعها *"><input className={inputClass} value={form.title} onChange={set('title')} placeholder="مثال: فستان زفاف دانتيل مقاس 38" autoFocus /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Field label="تاريخ البدء"><input type="date" className={inputClass} value={form.start_date} onChange={set('start_date')} /></Field>
              <Field label="التسليم المتوقع"><input type="date" className={inputClass} value={form.due_date} onChange={set('due_date')} /></Field>
              <Field label="الحالة">
                <select className={inputClass} value={form.status} onChange={set('status')}>
                  {Object.entries(EDITABLE_STATUSES).filter(([k]) => order || ['planned', 'in_progress'].includes(k)).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              {form.status === 'completed' && (
                <Field label="تاريخ الانتهاء"><input type="date" className={inputClass} value={form.completed_date} onChange={set('completed_date')} /></Field>
              )}
            </div>
            <Field label="ملاحظات"><textarea className={`${inputClass} h-16`} value={form.notes} onChange={set('notes')} /></Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <Field label="العامل المسؤول" className="flex-1">
                <select className={inputClass} value={workerId} onChange={(e) => pickWorker(e.target.value)}>
                  <option value="">اختر العامل...</option>
                  {workers.filter((w) => w.is_active || String(w.id) === String(workerId)).map((w) => (
                    <option key={w.id} value={w.id}>{w.name}{w.specialty ? ` — ${w.specialty}` : ''}</option>
                  ))}
                </select>
              </Field>
              <AddNewButton onClick={() => setCreating('worker')}>عامل جديد</AddNewButton>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={workerLater} onChange={(e) => { setWorkerLater(e.target.checked); if (e.target.checked) setWorkerId(''); }} />
              تحديد العامل لاحقاً
            </label>
            <Field label="أجر العامل على القطعة">
              <input type="number" min="0" step="0.01" className={inputClass} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0" />
            </Field>
            <p className="text-[10px] font-bold text-slate-400">أجر العامل يُحسب مستحقاً له عند انتهاء التصنيع، ويُصرف من تبويب العمال.</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {used.length > 0 && (
              <div>
                <h5 className="text-[11px] font-black text-slate-700 mb-1.5">مصروفة بالفعل لهذا الأمر</h5>
                <ul className="divide-y divide-slate-100 text-xs border border-slate-100 rounded-xl">
                  {used.map((mv) => (
                    <li key={mv.id} className="px-3 py-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <span className="font-bold text-slate-700">{mv.material?.name} — {qty(-mv.quantity)}</span>
                      <button type="button" onClick={() => returnUsed(mv)} className="text-[10px] font-bold text-rose-600 underline cursor-pointer">إرجاع للمخزن</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[11px] font-bold text-slate-500">{order ? 'خامات إضافية تُصرف من المخزن عند الحفظ (اختياري).' : 'الخامات تُصرف من المخزن الآن (اختياري — يمكن صرفها لاحقاً من تفاصيل الأمر).'}</p>
            {items.length > 0 ? (
              <MaterialItemsInput items={items} setItems={setItems} materials={inStock} />
            ) : (
              <p className="text-xs font-bold text-slate-400 text-center py-3 bg-slate-50 rounded-xl">لن تُصرف خامات الآن</p>
            )}
            <div className="flex flex-wrap gap-2">
              {items.length === 0 ? (
                <button type="button" disabled={inStock.length === 0} onClick={() => setItems([emptyItem()])} className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-40">
                  <Plus size={12} /> صرف خامة من المخزن
                </button>
              ) : (
                <button type="button" onClick={() => setItems([])} className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-[11px] font-black cursor-pointer">
                  بدون خامات الآن
                </button>
              )}
              <button type="button" onClick={() => setCreating('purchase')} className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer">
                <ShoppingCart size={12} /> شراء خامات ناقصة
              </button>
            </div>
            {inStock.length === 0 && <p className="text-[11px] font-bold text-amber-700">المخزن فارغ — اشترِ الخامات أولاً.</p>}
          </div>
        )}

        {step === 3 && (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl px-3">
            <ReviewRow label="القطعة">{form.title}</ReviewRow>
            <ReviewRow label="الحالة">{EDITABLE_STATUSES[form.status]}</ReviewRow>
            <ReviewRow label="التواريخ">
              {form.start_date ? `البدء ${formatDate(form.start_date)}` : '—'}{form.due_date ? ` · التسليم ${formatDate(form.due_date)}` : ''}
            </ReviewRow>
            <ReviewRow label="العامل">{worker?.name || 'لاحقاً'}</ReviewRow>
            <ReviewRow label="الأجر">{money(fee)}</ReviewRow>
            {used.length > 0 && (
              <ReviewRow label="خامات مصروفة">
                {used.map((mv) => <div key={mv.id}>{mv.material?.name} — {qty(-mv.quantity)}</div>)}
              </ReviewRow>
            )}
            <ReviewRow label={order ? 'خامات إضافية' : 'الخامات'}>
              {items.length === 0 ? 'لا شيء الآن' : items.map((it, i) => {
                const m = materialOf(it.material_id);
                return <div key={i}>{m?.name} — {qty(it.quantity)} {m?.unit_label}</div>;
              })}
            </ReviewRow>
            <ReviewRow label="التكلفة التقديرية">{money(materialsCost + parseFloat(fee || 0))}</ReviewRow>
          </div>
        )}
      </StepWizard>

      {creating === 'worker' && <WorkerForm worker={{ pay_type: 'per_piece' }} onClose={() => setCreating(null)} onSaved={workerCreated} />}
      {creating === 'purchase' && (
        <PurchaseWizard materials={materials} meta={meta} suppliers={suppliers} reloadShared={reloadShared} onClose={() => setCreating(null)} />
      )}
    </>
  );
}
