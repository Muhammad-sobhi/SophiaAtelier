import React from 'react';
import { Plus, Trash2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'نقدي (Cash)' },
  { id: 'instapay', label: 'إنستاباي (Instapay)' },
  { id: 'vodafone_cash', label: 'فودافون كاش (Vodafone Cash)' },
  { id: 'credit_card', label: 'فيزا / كارت (Visa / Card)' },
  { id: 'bank_transfer', label: 'تحويل بنكي (Bank Transfer)' },
];

export function MultiPaymentMethodInput({
  payments = [{ amount: '', payment_method: 'cash' }],
  onChange,
  totalExpected = null,
  label = 'طرق وتفاصيل السداد',
  required = false
}) {
  const currentPayments = Array.isArray(payments) && payments.length > 0
    ? payments
    : [{ amount: '', payment_method: 'cash' }];

  const totalPaid = currentPayments.reduce((sum, p) => {
    const val = parseFloat(p.amount) || 0;
    return sum + val;
  }, 0);

  const handleRowChange = (index, field, value) => {
    const updated = [...currentPayments];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    onChange?.(updated);
  };

  const handleAddRow = () => {
    let defaultAmount = '';
    if (totalExpected && totalExpected > totalPaid) {
      defaultAmount = (totalExpected - totalPaid).toString();
    }
    const updated = [
      ...currentPayments,
      { amount: defaultAmount, payment_method: 'instapay' }
    ];
    onChange?.(updated);
  };

  const handleRemoveRow = (index) => {
    if (currentPayments.length <= 1) return;
    const updated = currentPayments.filter((_, i) => i !== index);
    onChange?.(updated);
  };

  const handleFillRemaining = () => {
    if (!totalExpected) return;
    const diff = totalExpected - totalPaid;
    if (diff > 0) {
      const updated = [
        ...currentPayments,
        { amount: diff.toString(), payment_method: 'cash' }
      ];
      onChange?.(updated);
    }
  };

  return (
    <div className="space-y-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 text-right">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-150">
          إجمالي المدفوع: {totalPaid.toLocaleString()} ج.م
        </span>
        <label className="text-[11px] font-extrabold text-slate-700 block">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      </div>

      <div className="space-y-2">
        {currentPayments.map((p, index) => (
          <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            {currentPayments.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveRow(index)}
                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                title="حذف هذه الطريقة"
              >
                <Trash2 size={14} />
              </button>
            )}

            <div className="flex-1">
              <select
                value={p.payment_method || 'cash'}
                onChange={(e) => handleRowChange(index, 'payment_method', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-36">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="المبلغ"
                value={p.amount}
                onChange={(e) => handleRowChange(index, 'amount', e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-left font-mono"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-slate-400 pointer-events-none">
                ج.م
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-1 text-[10.5px] font-extrabold text-indigo-650 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-100/60 px-2.5 py-1 rounded-lg border border-indigo-200/60 transition-all cursor-pointer"
        >
          <Plus size={13} />
          <span>+ إضافة طريقة دفع أخرى (تقسيم المبلغ)</span>
        </button>

        {totalExpected !== null && totalExpected > 0 && (
          <div className="flex items-center gap-1.5">
            {totalPaid === totalExpected ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                <CheckCircle2 size={12} /> متطابق تماماً مع المطلوب
              </span>
            ) : totalPaid < totalExpected ? (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  <AlertCircle size={12} /> متبقي: {(totalExpected - totalPaid).toLocaleString()} ج.م
                </span>
                <button
                  type="button"
                  onClick={handleFillRemaining}
                  className="text-[9.5px] font-bold text-indigo-600 underline hover:text-indigo-800 cursor-pointer"
                >
                  (إضافة الفارق)
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                <Sparkles size={12} /> زيادة: {(totalPaid - totalExpected).toLocaleString()} ج.م
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
