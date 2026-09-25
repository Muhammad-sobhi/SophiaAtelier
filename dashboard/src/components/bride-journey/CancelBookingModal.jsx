import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Ban, Shield, Banknote, Upload } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { SalesCombobox } from '@/components/common/SalesCombobox';

// Keep in sync with Booking::CANCELLATION_REASONS in the backend
export const CANCELLATION_REASONS = {
  wedding_cancelled: 'إلغاء الفرح',
  wedding_postponed: 'تأجيل الفرح',
  other_shop: 'اختارت محل آخر',
  financial: 'ظروف مادية',
  unhappy_dress: 'غير راضية عن الفستان',
  other: 'سبب آخر',
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'نقداً (كاش من الخزينة)' },
  { value: 'instapay', label: 'إنستاباي (InstaPay)' },
  { value: 'vodafone_cash', label: 'فودافون كاش (Vodafone Cash)' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
];

const sumOf = (revenues, types) =>
  revenues.filter((r) => types.includes(r.type)).reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

const money = (n) => `${(Number(n) || 0).toLocaleString()} ج.م`;
const cleanDate = (d) => (d ? String(d).split('T')[0].split(' ')[0] : '—');

function RefundSection({ title, icon: Icon, paid, enabled, setEnabled, amount, setAmount, method, setMethod, receipt, setReceipt, tone }) {
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setReceipt(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className={`rounded-2xl p-3 space-y-2.5 border ${tone}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
          <Icon size={15} />
          <span>{title}</span>
        </div>
        <span className="font-mono text-xs font-black bg-white px-2 py-0.5 rounded-lg border border-slate-200">
          المدفوع: {money(paid)}
        </span>
      </div>

      {paid > 0 ? (
        <>
          <label className="flex items-center gap-2 text-[11px] font-extrabold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                if (e.target.checked && !amount) setAmount(String(paid));
              }}
              className="w-3.5 h-3.5 rounded"
            />
            <span>رد مبلغ للعروس</span>
          </label>

          {enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 block mb-1">المبلغ المرتجع *</label>
                <input
                  type="number"
                  min="0"
                  max={paid}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono text-right focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 block mb-1">طريقة الرد</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 block mb-1">إيصال الرد</label>
                <label className="flex items-center justify-center gap-1.5 p-1.5 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl text-[11px] font-bold text-slate-600 cursor-pointer">
                  <Upload size={13} className="text-indigo-500" />
                  <span>{receipt ? 'تم الإرفاق ✓' : 'إرفاق'}</span>
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-[10.5px] font-bold text-slate-400">لم يتم دفع أي مبلغ</p>
      )}
    </div>
  );
}

export function CancelBookingModal({ isOpen, onClose, bride, onSuccess }) {
  const booking = bride?.bookings?.[0];
  const revenues = booking?.revenues || [];

  const paidRent = sumOf(revenues, ['deposit', 'balance']);
  const paidInsurance = sumOf(revenues, ['insurance', 'security_deposit']);
  const paidFittingFees = sumOf(revenues, ['fitting_fee']);

  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [salesName, setSalesName] = useState(booking?.sales_name || '');
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split('T')[0]);

  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('cash');
  const [depositReceipt, setDepositReceipt] = useState(null);

  const [insuranceEnabled, setInsuranceEnabled] = useState(paidInsurance > 0);
  const [insuranceAmount, setInsuranceAmount] = useState(paidInsurance > 0 ? String(paidInsurance) : '');
  const [insuranceMethod, setInsuranceMethod] = useState('cash');
  const [insuranceReceipt, setInsuranceReceipt] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !bride || !booking) return null;

  const depositRefund = depositEnabled ? Math.max(0, parseFloat(depositAmount) || 0) : 0;
  const insuranceRefund = insuranceEnabled ? Math.max(0, parseFloat(insuranceAmount) || 0) : 0;
  const totalPaid = paidRent + paidInsurance;
  const totalRefund = depositRefund + insuranceRefund;
  const keptAmount = totalPaid - totalRefund;
  const overRefund = depositRefund > paidRent || insuranceRefund > paidInsurance;

  const dresses = [booking.dress, booking.dress2, booking.dress3].filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (overRefund) {
      toast.error('المبلغ المرتجع أكبر من المدفوع');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.put(`/clients/${bride.id}/stage-action`, {
        action: 'cancel_booking',
        cancellation_reason: reason,
        cancellation_note: note.trim() || null,
        sales_name: salesName.trim() || null,
        refund_date: refundDate,
        deposit_refund: depositRefund,
        deposit_refund_method: depositMethod,
        deposit_refund_receipt: depositRefund > 0 ? depositReceipt : null,
        insurance_refund: insuranceRefund,
        insurance_refund_method: insuranceMethod,
        insurance_refund_receipt: insuranceRefund > 0 ? insuranceReceipt : null,
      });
      toast.success('تم إلغاء الحجز وتسجيل المرتجعات في الماليات');
      onClose();
      await onSuccess?.();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء إلغاء الحجز');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[99995] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-150 shadow-[0_25px_60px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-rose-50/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
              <Ban size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">إلغاء حجز العروس</h3>
              <p className="text-[10px] font-bold text-slate-400">سيتم تحرير الفستان وتسجيل المبالغ المرتجعة في الماليات</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-slate-200/70 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 space-y-3.5 overflow-y-auto flex-1 min-h-0 scrollbar-thin">
            {/* Bride info */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">العروس</span>
                  <span className="font-extrabold text-slate-800">{bride.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">الهاتف</span>
                  <span className="font-mono font-bold text-slate-700">{bride.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">تاريخ الفرح</span>
                  <span className="font-mono font-bold text-slate-700">{cleanDate(booking.event_date || bride.wedding_date)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">تاريخ الحجز</span>
                  <span className="font-mono font-bold text-slate-700">{cleanDate(booking.booking_date)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">سيلز الحجز</span>
                  <span className="font-bold text-slate-700">{booking.sales_name || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">قيمة الإيجار</span>
                  <span className="font-mono font-bold text-slate-700">{money(booking.total_amount)}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 block">الفستان المحجوز</span>
                  <span className="font-extrabold text-slate-800">
                    {dresses.length ? dresses.map((d) => `${d.name}${d.code ? ` (${d.code})` : ''}`).join(' + ') : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">سبب الإلغاء *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="" disabled>اختر السبب...</option>
                  {Object.entries(CANCELLATION_REASONS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <SalesCombobox value={salesName} onChange={setSalesName} label="مسؤول الإلغاء (السيلز)" placeholder="اختر أو اكتب اسم السيلز..." />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                تفاصيل السبب {reason === 'other' && '*'}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required={reason === 'other'}
                rows={2}
                placeholder="اكتب تفاصيل سبب الإلغاء..."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* Refunds */}
            <RefundSection
              title="العربون / المدفوع من الإيجار"
              icon={Banknote}
              paid={paidRent}
              enabled={depositEnabled}
              setEnabled={setDepositEnabled}
              amount={depositAmount}
              setAmount={setDepositAmount}
              method={depositMethod}
              setMethod={setDepositMethod}
              receipt={depositReceipt}
              setReceipt={setDepositReceipt}
              tone="bg-emerald-50/50 border-emerald-200/80"
            />
            <RefundSection
              title="التأمين"
              icon={Shield}
              paid={paidInsurance}
              enabled={insuranceEnabled}
              setEnabled={setInsuranceEnabled}
              amount={insuranceAmount}
              setAmount={setInsuranceAmount}
              method={insuranceMethod}
              setMethod={setInsuranceMethod}
              receipt={insuranceReceipt}
              setReceipt={setInsuranceReceipt}
              tone="bg-amber-50/50 border-amber-200/80"
            />

            {(depositRefund > 0 || insuranceRefund > 0) && (
              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">تاريخ رد المبلغ</label>
                <input
                  type="date"
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
            )}

            {/* Summary */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-slate-300 font-bold">إجمالي المدفوع (إيجار + تأمين)</span><span className="font-mono font-black">{money(totalPaid)}</span></div>
              <div className="flex justify-between"><span className="text-slate-300 font-bold">المرتجع للعروس</span><span className="font-mono font-black text-rose-300">- {money(totalRefund)}</span></div>
              <div className="flex justify-between pt-1.5 border-t border-white/15"><span className="font-extrabold">المتبقي للمحل</span><span className="font-mono font-black text-emerald-300">{money(keptAmount)}</span></div>
              {paidFittingFees > 0 && (
                <p className="text-[10px] text-slate-400 font-bold">رسوم التجربة ({money(paidFittingFees)}) غير مستردة</p>
              )}
              {overRefund && <p className="text-[10.5px] text-rose-300 font-black">⚠️ المبلغ المرتجع أكبر من المدفوع</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center gap-2.5 flex-shrink-0">
            <button
              type="submit"
              disabled={isSubmitting || overRefund || !reason}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {isSubmitting ? 'جاري الإلغاء...' : 'تأكيد إلغاء الحجز'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer"
            >
              رجوع
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

export default CancelBookingModal;
