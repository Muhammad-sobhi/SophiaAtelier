import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { todayStr } from '@/lib/utils';
import { Modal, Field, SubmitRow, inputClass, errorMessage } from '@/components/manufacturing/shared';
import { formatMoney as money, periodLabel } from '@/lib/payroll';

/**
 * Records pieces made by a per-piece employee inside one pay period: a day's pieces,
 * or the whole period's count at once before paying. Returns the updated payroll row.
 */
export default function PieceEntryModal({ pay, onClose, onSaved }) {
  const today = todayStr();
  // Default to today while the period runs, else its last day
  const maxDate = pay.period_end < today ? pay.period_end : today;
  const [form, setForm] = useState({
    date: maxDate,
    pieces: '',
    piece_rate: pay.piece_rate ? String(pay.piece_rate) : '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pieces = parseInt(form.pieces) || 0;
  const rate = parseFloat(form.piece_rate) || 0;

  const submit = async (e) => {
    e.preventDefault();
    if (pieces <= 0 || rate <= 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const row = await apiClient.post('/payroll/pieces', {
        employee_id: pay.employee_id,
        date: form.date,
        pieces,
        piece_rate: rate,
        notes: form.notes || null,
      });
      toast.success(`تم تسجيل ${pieces} قطعة`);
      onSaved(row);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'تعذر تسجيل القطع'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={`تسجيل قطع: ${pay.employee_name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-[10px] font-bold text-slate-500">
          {periodLabel(pay)} — مسجَّل حتى الآن {pay.total_pieces} قطعة ({money(pay.pieces_pay)}).
          سجّل قطع كل يوم بتاريخه، أو العدد كله مرة واحدة قبل الصرف.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Field label="عدد القطع *">
            <input type="number" min="1" step="1" required autoFocus className={inputClass} value={form.pieces} onChange={set('pieces')} />
          </Field>
          <Field label="سعر القطعة (ج.م) *">
            <input type="number" min="0.01" step="0.01" required className={inputClass} value={form.piece_rate} onChange={set('piece_rate')} />
          </Field>
          <Field label="التاريخ *" className="col-span-2">
            <input
              type="date"
              required
              min={pay.period_start}
              max={maxDate}
              className={inputClass}
              value={form.date}
              onChange={set('date')}
            />
          </Field>
        </div>

        {pieces > 0 && rate > 0 && (
          <p className="text-[11px] font-extrabold text-emerald-700" aria-live="polite">
            {pieces} × {money(rate)} = {money(pieces * rate)}
          </p>
        )}

        <Field label="ملاحظات">
          <input className={inputClass} value={form.notes} onChange={set('notes')} placeholder="اختياري" />
        </Field>
        <SubmitRow onCancel={onClose} isSubmitting={isSubmitting} label="تسجيل القطع" />
      </form>
    </Modal>
  );
}
