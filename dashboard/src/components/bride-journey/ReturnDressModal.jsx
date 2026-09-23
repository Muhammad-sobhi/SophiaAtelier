import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, AlertTriangle, CheckCircle2, Shield, DollarSign, FileText, Upload } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { SalesCombobox } from '@/components/common/SalesCombobox';

export function ReturnDressModal({
  isOpen,
  onClose,
  bride,
  onSuccess,
}) {
  if (!isOpen || !bride) return null;

  const booking = bride.bookings?.[0];
  const dress = booking?.dress;
  const dress2 = booking?.dress2;
  const dress3 = booking?.dress3;

  // Insurance amount from booking
  const totalInsurance = parseFloat(booking?.insurance_amount ?? 5000);

  // Saved settlement (when editing an already returned dress)
  const existingRefund = (booking?.revenues || []).find(r => r.type === 'insurance_refund');
  const existingDamage = (booking?.revenues || []).find(r => r.type === 'damage_fee');
  const isAlreadyReturned = booking?.status === 'returned';

  // States
  const [returnDate, setReturnDate] = useState(
    String(existingRefund?.payment_date || (isAlreadyReturned && booking?.return_scheduled_on) || new Date().toISOString()).split('T')[0].split(' ')[0]
  );
  const [returnSalesName, setReturnSalesName] = useState(booking?.return_sales_name || booking?.sales_name || '');
  
  // Refund mode: 'full' (استرداد كامل) or 'deduction' (خصم تلفيات)
  const [refundMode, setRefundMode] = useState(existingDamage ? 'deduction' : 'full');
  const [damageDeduction, setDamageDeduction] = useState(existingDamage ? String(Math.abs(parseFloat(existingDamage.amount || 0))) : '0');
  const [damageNotes, setDamageNotes] = useState(existingDamage?.notes ? String(existingDamage.notes).replace(/^خصم تلفيات من التأمين( - )?/, '') : '');
  const [insuranceRefundMethod, setInsuranceRefundMethod] = useState(existingRefund?.payment_method || 'cash');
  const [receiptImage, setReceiptImage] = useState(null);
  const [returnNotes, setReturnNotes] = useState(
    existingRefund?.notes ? String(existingRefund.notes).replace(/^استرداد تأمين( - )?/, '') : 'تم استلام الفستان بحالة جيدة'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Accessories Checklist
  const [checkedAccessories, setCheckedAccessories] = useState({});
  const accessoriesList = [
    ...(dress?.accessories || []).map(a => ({ name: a.name || a, dressName: dress.name })),
    ...(dress2?.accessories || []).map(a => ({ name: a.name || a, dressName: dress2.name })),
    ...(dress3?.accessories || []).map(a => ({ name: a.name || a, dressName: dress3.name })),
  ];

  useEffect(() => {
    const initChecked = {};
    accessoriesList.forEach((acc, i) => {
      initChecked[`${acc.name}_${i}`] = true; // default all checked
    });
    setCheckedAccessories(initChecked);
  }, [bride]);

  // Calculate actual refund amount
  const deductionNum = refundMode === 'full' ? 0 : Math.min(totalInsurance, Math.max(0, parseFloat(damageDeduction) || 0));
  const netRefundAmount = Math.max(0, totalInsurance - deductionNum);

  const handleRefundModeChange = (mode) => {
    setRefundMode(mode);
    if (mode === 'full') {
      setDamageDeduction('0');
      setDamageNotes('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiClient.put(`/clients/${bride.id}/stage-action`, {
        action: 'mark_returned',
        return_date: returnDate,
        sales_name: returnSalesName.trim() || null,
        damage_deduction: deductionNum,
        insurance_refund: netRefundAmount,
        insurance_refund_method: insuranceRefundMethod,
        insurance_refund_receipt: receiptImage,
        damage_notes: damageNotes.trim() || null,
        notes: returnNotes.trim() || null,
        accessories: checkedAccessories,
      });

      toast.success('تم تسجيل استلام الفستان وإرجاع التأمين بنجاح ✨');
      onClose();
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error('Error submitting return dress:', err);
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء حفظ استلام الفستان');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[99995] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-150 shadow-[0_25px_60px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">استلام الفستان من العميلة (المرتجع)</h3>
              <p className="text-[10px] font-bold text-slate-400">جرد الملحقات وتسوية مبلغ التأمين المسترد</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/70 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 space-y-3.5 overflow-y-auto flex-1 min-h-0 scrollbar-thin">
            
            {/* Bride & Dress Summary Card */}
            <div className="bg-blue-50/40 border border-blue-100/80 rounded-2xl p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">العروس</span>
                  <span className="font-extrabold text-slate-800">{bride.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">الهاتف</span>
                  <span className="font-mono font-bold text-slate-700">{bride.phone || '—'}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-blue-100/60 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 block">الفستان المستلم</span>
                  <span className="font-extrabold text-blue-900">
                    {dress?.name || 'فستان'} {dress?.code ? `(${dress.code})` : ''}
                    {dress2 ? ` + ${dress2.name}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Date & Sales Person Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                  تاريخ الاستلام الفعلي
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <SalesCombobox
                  value={returnSalesName}
                  onChange={setReturnSalesName}
                  label="مسؤول الاستلام (السيلز)"
                  placeholder="اختر أو اكتب اسم السيلز..."
                />
              </div>
            </div>

            {/* Insurance & Damage Section (Requirement 2) */}
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                  <Shield size={16} className="text-amber-600" />
                  <span>مبلغ التأمين المحصل:</span>
                </div>
                <span className="font-mono text-sm font-black text-amber-950 bg-amber-100/80 px-2.5 py-0.5 rounded-xl border border-amber-200">
                  {totalInsurance.toLocaleString()} ج.م
                </span>
              </div>

              {/* Two Option Selection: Full Refund vs Manual Damage Deduction */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/60">
                <button
                  type="button"
                  onClick={() => handleRefundModeChange('full')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                    refundMode === 'full'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  <span>استرداد التأمين بالكامل</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRefundModeChange('deduction')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                    refundMode === 'deduction'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle size={14} />
                  <span>خصم تلفيات يدوياً</span>
                </button>
              </div>

              {/* Manual Damage Deduction Inputs if selected */}
              {refundMode === 'deduction' && (
                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2.5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10.5px] font-extrabold text-slate-700 block mb-1">
                        مبلغ الخصم للتلفيات (ج.م) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={totalInsurance}
                        value={damageDeduction}
                        onChange={(e) => setDamageDeduction(e.target.value)}
                        placeholder="0"
                        required
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-rose-600 text-right font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>

                    <div>
                      <label className="text-[10.5px] font-extrabold text-slate-700 block mb-1">
                        سبب الخصم / وصف التلفيات *
                      </label>
                      <input
                        type="text"
                        value={damageNotes}
                        onChange={(e) => setDamageNotes(e.target.value)}
                        placeholder="مثال: حرق مكواة / قطع في الذيل / بقعة تتطلب غسيل خاص..."
                        required={deductionNum > 0}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Net Refund Display */}
              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-amber-200/80">
                <span className="text-xs font-extrabold text-slate-700">صافي التأمين المسترد للعروس:</span>
                <span className="font-mono text-sm font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  {netRefundAmount.toLocaleString()} ج.م
                </span>
              </div>

              {/* Refund Method & Receipt */}
              {netRefundAmount > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/60">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-600 block mb-1">طريقة رد التأمين</label>
                    <select
                      value={insuranceRefundMethod}
                      onChange={(e) => setInsuranceRefundMethod(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="cash">نقداً (كاش من الخزينة)</option>
                      <option value="instapay">إنستاباي (InstaPay)</option>
                      <option value="vodafone_cash">فودافون كاش (Vodafone Cash)</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-600 block mb-1">صورة إيصال / تحويل الرد</label>
                    <label className="flex items-center justify-center gap-1.5 p-1.5 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl text-[11px] font-bold text-slate-600 cursor-pointer transition-colors">
                      <Upload size={13} className="text-indigo-500" />
                      <span>{receiptImage ? 'تم اختيار إيصال ✓' : 'إرفاق إيصال التحويل'}</span>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Accessories Checklist */}
            {accessoriesList.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">
                  جرد الملحقات والإكسسوارات المستلمة:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {accessoriesList.map((acc, idx) => {
                    const key = `${acc.name}_${idx}`;
                    return (
                      <label key={idx} className="flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-slate-200/70">
                        <input
                          type="checkbox"
                          checked={!!checkedAccessories[key]}
                          onChange={(e) => setCheckedAccessories({ ...checkedAccessories, [key]: e.target.checked })}
                          className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-[11px] font-bold text-slate-700 truncate">
                          {acc.name} <span className="text-[9.5px] text-slate-400 font-normal">({acc.dressName})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Condition Notes */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                ملاحظات حالة الفستان عند الاستلام
              </label>
              <textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="حالة الفستان وملاحظات الغسيل / الكي..."
                rows={2}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center gap-2.5 flex-shrink-0">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 text-center"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'تأكيد استلام الفستان وتسوية التأمين'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
            >
              إلغاء
            </button>
          </div>

        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

export default ReturnDressModal;
