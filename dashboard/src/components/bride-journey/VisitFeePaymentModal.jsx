import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { todayStr } from '@/lib/utils';
import { MultiPaymentMethodInput } from '@/components/MultiPaymentMethodInput';
import { X, Banknote, Loader2 } from 'lucide-react';

/** Records the trying fee paid at a visit (before any booking), split by payment method with a receipt per row */
export function VisitFeePaymentModal({ isOpen, onClose, bride, visit, remaining, onSuccess }) {
  const [payments, setPayments] = useState([{ amount: remaining > 0 ? String(remaining) : '', payment_method: 'cash', receipt_image: null }]);
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !visit) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validPayments = payments
      .filter((p) => parseFloat(p.amount) > 0)
      .map((p) => ({ amount: parseFloat(p.amount), payment_method: p.payment_method || 'cash', receipt_image: p.receipt_image || null }));
    if (validPayments.length === 0) {
      toast.error('يرجى إدخال مبلغ مدفوع');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/revenues', {
        visit_id: visit.id,
        type: 'fitting_fee',
        payments: validPayments,
        payment_date: paymentDate || todayStr(),
        notes: notes.trim() || `رسوم تجربة الفساتين للعروس: ${bride?.name || ''}`,
      });
      toast.success('تم تسجيل رسوم التجربة');
      await onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to record trying fee:', err);
      toast.error(err?.message || 'حدث خطأ أثناء تسجيل رسوم التجربة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden" dir="rtl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-linear-to-r from-purple-50 via-fuchsia-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
              <Banknote size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">تسجيل دفع رسوم التجربة</h3>
              <p className="text-xs text-slate-500 font-bold">
                العروس: <span className="text-slate-800">{bride?.name || '—'}</span>
                {' | '}المستحق: <span className="font-mono text-purple-700">{parseFloat(visit.trying_fee || 0).toLocaleString()} ج.م</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">
          <MultiPaymentMethodInput
            payments={payments}
            onChange={setPayments}
            totalExpected={remaining > 0 ? remaining : null}
            label="المبلغ المدفوع وطريقة الدفع"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 block">تاريخ الدفع</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 block">ملاحظات</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اختياري"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <p className="text-[10.5px] font-bold text-slate-400">رسوم التجربة غير مستردة، وتُضاف تلقائياً إلى مدفوعات الحجز إذا حجزت العروس.</p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الدفعة'}
          </button>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

export default VisitFeePaymentModal;
