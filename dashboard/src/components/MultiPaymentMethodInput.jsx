import React, { useState, useRef } from 'react';
import { Plus, Trash2, CheckCircle2, AlertCircle, Sparkles, Paperclip, X, Eye } from 'lucide-react';

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'نقدي (Cash)' },
  { id: 'instapay', label: 'إنستاباي (Instapay)' },
  { id: 'vodafone_cash', label: 'فودافون كاش (Vodafone Cash)' },
  { id: 'credit_card', label: 'فيزا / كارت (Visa / Card)' },
  { id: 'bank_transfer', label: 'تحويل بنكي (Bank Transfer)' },
];

export function MultiPaymentMethodInput({
  payments = [{ amount: '', payment_method: 'cash', receipt_image: null }],
  onChange,
  totalExpected = null,
  label = 'طرق وتفاصيل السداد',
  required = false,
  allowReceipts = true
}) {
  const currentPayments = Array.isArray(payments) && payments.length > 0
    ? payments
    : [{ amount: '', payment_method: 'cash', receipt_image: null }];

  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRefs = useRef({});

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

  const handleReceiptChange = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const updated = [...currentPayments];
      updated[index] = {
        ...updated[index],
        receipt_image: dataUrl,
        receipt_name: file.name
      };
      onChange?.(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = (index) => {
    const updated = [...currentPayments];
    updated[index] = {
      ...updated[index],
      receipt_image: null,
      receipt_name: null
    };
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = '';
    }
    onChange?.(updated);
  };

  const handleAddRow = () => {
    let defaultAmount = '';
    if (totalExpected && totalExpected > totalPaid) {
      defaultAmount = (totalExpected - totalPaid).toString();
    }
    const updated = [
      ...currentPayments,
      { amount: defaultAmount, payment_method: 'instapay', receipt_image: null }
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
        { amount: diff.toString(), payment_method: 'cash', receipt_image: null }
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
          <div key={`payment-row-${index}-${p.payment_method || 'pm'}`} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            {currentPayments.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveRow(index)}
                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer flex-shrink-0"
                title="حذف هذه الطريقة"
              >
                <Trash2 size={14} />
              </button>
            )}

            <div className="flex-1 min-w-[120px]">
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

            <div className="relative w-28 sm:w-32 flex-shrink-0">
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

            {/* Receipt Upload per row */}
            {allowReceipts && (
              <div className="flex-shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  ref={(el) => (fileInputRefs.current[index] = el)}
                  onChange={(e) => handleReceiptChange(index, e.target.files?.[0])}
                  className="hidden"
                />

                {p.receipt_image ? (
                  <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-1.5 py-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPreviewImage(p.receipt_image)}
                      className="relative w-7 h-7 rounded-md overflow-hidden border border-emerald-300 hover:opacity-80 transition-opacity cursor-pointer group"
                      title="عرض الإيصال"
                    >
                      <img
                        src={p.receipt_image}
                        alt="إيصال"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye size={10} className="text-white" />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveReceipt(index)}
                      className="p-1 text-rose-500 hover:bg-rose-100/60 rounded-md transition-colors cursor-pointer"
                      title="حذف الإيصال"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[index]?.click()}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer"
                    title="إرفاق صورة إيصال خاص بهذه الدفعة"
                  >
                    <Paperclip size={12} />
                    <span className="hidden sm:inline text-[9.5px]">إيصال</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
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

      {/* Lightbox / Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl p-3 max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl relative text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800">معاينة صورة الإيصال</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[70vh]">
              <img
                src={previewImage}
                alt="إيصال الدفع"
                className="max-w-full max-h-[65vh] object-contain rounded-lg border border-slate-100 shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
