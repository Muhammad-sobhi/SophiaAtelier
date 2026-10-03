import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { todayStr } from '@/lib/utils';
import { Modal, Field, SubmitRow, inputClass, PAYMENT_METHODS, errorMessage } from '@/components/manufacturing/shared';
import { formatMoney as money, periodLabel } from '@/lib/payroll';

/**
 * Pays an employee's salary (full or partial) for one pay period (month, week or custom block).
 * The backend records it as a "salary" expense, so it appears in the finance page.
 */
export default function PaySalaryModal({ pay, onClose, onPaid }) {
  const [form, setForm] = useState({
    amount: String(pay.remaining_amount),
    payment_method: 'cash',
    payment_date: todayStr(),
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const amount = parseFloat(form.amount) || 0;
  const tooMuch = amount > pay.remaining_amount;

  const submit = async (e) => {
    e.preventDefault();
    if (amount <= 0 || tooMuch) return;
    setIsSubmitting(true);
    try {
      const row = await apiClient.post('/payroll/payments', {
        employee_id: pay.employee_id,
        period_start: pay.period_start,
        amount,
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        notes: form.notes || null,
      });
      toast.success('تم صرف الراتب وتسجيله في المالية');
      onPaid(row);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'تعذر صرف الراتب'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={`صرف راتب: ${pay.employee_name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5">
            <span className="block text-[9px] font-extrabold text-slate-400">الصافي المستحق</span>
            <span className="block text-xs font-black text-slate-800 mt-0.5">{money(pay.net_salary)}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-2.5">
            <span className="block text-[9px] font-extrabold text-emerald-600">تم صرفه</span>
            <span className="block text-xs font-black text-emerald-700 mt-0.5">{money(pay.paid_amount)}</span>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-2.5">
            <span className="block text-[9px] font-extrabold text-amber-600">المتبقي</span>
            <span className="block text-xs font-black text-amber-700 mt-0.5">{money(pay.remaining_amount)}</span>
          </div>
        </div>

        <p className="text-[10px] font-bold text-slate-500">
          عن {periodLabel(pay)}
          {pay.loan_deduction > 0 && ` — يشمل خصم سلف بقيمة ${money(pay.loan_deduction)}`}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Field label="المبلغ المصروف *">
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={pay.remaining_amount}
              required
              className={inputClass}
              value={form.amount}
              onChange={set('amount')}
            />
          </Field>
          <Field label="تاريخ الصرف *">
            <input type="date" required className={inputClass} value={form.payment_date} onChange={set('payment_date')} />
          </Field>
          <Field label="طريقة الدفع" className="col-span-2">
            <select className={inputClass} value={form.payment_method} onChange={set('payment_method')}>
              {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
        </div>

        {tooMuch && (
          <p className="text-[10px] font-bold text-rose-600">المبلغ أكبر من المتبقي المستحق ({money(pay.remaining_amount)})</p>
        )}
        {!tooMuch && amount > 0 && amount < pay.remaining_amount && (
          <p className="text-[10px] font-bold text-amber-600">دفعة جزئية — سيبقى {money(pay.remaining_amount - amount)} مستحقاً للموظف.</p>
        )}

        <Field label="ملاحظات">
          <input className={inputClass} value={form.notes} onChange={set('notes')} placeholder="اختياري" />
        </Field>
        <SubmitRow onCancel={onClose} isSubmitting={isSubmitting} label="تأكيد الصرف" />
      </form>
    </Modal>
  );
}
