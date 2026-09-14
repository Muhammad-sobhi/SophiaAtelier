import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import {
  X, Banknote, Edit3, Trash2, Plus, Check, AlertCircle, Sparkles, Shield, DollarSign, RefreshCw
} from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'كاش (نقدي)' },
  { id: 'instapay', label: 'انستاباي (InstaPay)' },
  { id: 'vodafone_cash', label: 'فودافون كاش' },
  { id: 'visa', label: 'فيزا / بطاقة' },
  { id: 'bank_transfer', label: 'تحويل بنكي' },
  { id: 'other', label: 'أخرى' },
];

const REVENUE_TYPES = [
  { id: 'deposit', label: 'عربون حجز', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'balance', label: 'دفعة استلام / متبقي', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'insurance', label: 'تأمين مسترد', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'fitting_fee', label: 'رسوم بروفة وقياس', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'insurance_refund', label: 'استرداد تأمين', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'other', label: 'أخرى', color: 'bg-slate-100 text-slate-800 border-slate-200' },
];

function formatMoney(n) {
  if (n === undefined || n === null) return '0';
  return parseFloat(n).toLocaleString();
}

function getMethodLabel(method) {
  const found = PAYMENT_METHODS.find(m => m.id === method);
  return found ? found.label : (method || 'كاش');
}

function getTypeMeta(type) {
  return REVENUE_TYPES.find(t => t.id === type) || { id: type, label: type, color: 'bg-slate-100 text-slate-800 border-slate-200' };
}

export function BookingPaymentsModal({
  isOpen,
  onClose,
  bride,
  booking,
  onSuccess,
}) {
  const [totalAmount, setTotalAmount] = useState(booking?.total_amount ? String(booking.total_amount) : '0');
  const [insuranceAmount, setInsuranceAmount] = useState(booking?.insurance_amount ? String(booking.insurance_amount) : '0');
  const [isUpdatingBooking, setIsUpdatingBooking] = useState(false);
  const [bookingSavedSuccess, setBookingSavedSuccess] = useState(false);

  // Payments / revenues state
  const [revenues, setRevenues] = useState(booking?.revenues || []);
  const [editingRevId, setEditingRevId] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', payment_method: 'cash', notes: '', type: 'deposit' });
  const [isSavingRev, setIsSavingRev] = useState(false);

  // New payment form
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    type: 'balance',
    amount: '',
    payment_method: 'cash',
    notes: '',
  });
  const [isAddingPayment, setIsAddingPayment] = useState(false);

  // Sync state if booking prop changes
  useEffect(() => {
    if (booking) {
      setTotalAmount(String(booking.total_amount || 0));
      setInsuranceAmount(String(booking.insurance_amount || 0));
      setRevenues(booking.revenues || []);
    }
  }, [booking]);

  if (!isOpen) return null;

  // Refresh latest booking data
  const reloadData = async () => {
    if (!booking?.id) return;
    try {
      const res = await apiClient.get(`/bookings/${booking.id}`);
      const updatedBooking = res.data || res;
      if (updatedBooking) {
        setTotalAmount(String(updatedBooking.total_amount || 0));
        setInsuranceAmount(String(updatedBooking.insurance_amount || 0));
        setRevenues(updatedBooking.revenues || []);
      }
      onSuccess?.();
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Save Booking Pricing (Total & Insurance)
  const handleSaveBookingPricing = async (e) => {
    e.preventDefault();
    if (!booking?.id) return;
    setIsUpdatingBooking(true);
    setBookingSavedSuccess(false);
    try {
      await apiClient.put(`/bookings/${booking.id}`, {
        total_amount: parseFloat(totalAmount || 0),
        insurance_amount: parseFloat(insuranceAmount || 0),
      });
      setBookingSavedSuccess(true);
      toast.success('تم تحديث بيانات الحجز بنجاح ✨');
      setTimeout(() => setBookingSavedSuccess(false), 2500);
      await reloadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء تحديث بيانات الحجز');
    } finally {
      setIsUpdatingBooking(false);
    }
  };

  // 2. Start Editing a Revenue
  const handleStartEdit = (rev) => {
    setEditingRevId(rev.id);
    setEditForm({
      amount: String(rev.amount || 0),
      payment_method: rev.payment_method || 'cash',
      notes: rev.notes || '',
      type: rev.type || 'deposit',
    });
  };

  // Save Edited Revenue
  const handleSaveEditRevenue = async (revId) => {
    if (!editForm.amount || parseFloat(editForm.amount) < 0) {
      toast.error('يرجى كتابة مبلغ صحيح');
      return;
    }
    setIsSavingRev(true);
    try {
      await apiClient.put(`/revenues/${revId}`, {
        amount: parseFloat(editForm.amount),
        payment_method: editForm.payment_method,
        notes: editForm.notes,
        type: editForm.type,
      });
      toast.success('تم تعديل الدفعة بنجاح ✨');
      setEditingRevId(null);
      await reloadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء تعديل الدفعة');
    } finally {
      setIsSavingRev(false);
    }
  };

  // Delete a Revenue
  const handleDeleteRevenue = async (revId, revType, revAmount) => {
    const meta = getTypeMeta(revType);
    if (!window.confirm(`هل أنت متأكد من حذف هذه الدفعة (${meta.label} بمبلغ ${formatMoney(revAmount)} ج.م) نهائياً؟`)) {
      return;
    }
    try {
      await apiClient.delete(`/revenues/${revId}`);
      toast.success('تم حذف الدفعة بنجاح');
      await reloadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء حذف الدفعة');
    }
  };

  // 3. Add New Revenue
  const handleAddNewPayment = async (e) => {
    e.preventDefault();
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح للدفعة');
      return;
    }
    setIsAddingPayment(true);
    try {
      await apiClient.post('/revenues', {
        booking_id: booking.id,
        type: newPayment.type,
        amount: parseFloat(newPayment.amount),
        payment_method: newPayment.payment_method,
        payment_date: new Date().toISOString().split('T')[0],
        notes: newPayment.notes || (newPayment.type === 'balance' ? 'سداد دفعة' : 'دفعة جديدة'),
      });
      toast.success('تمت إضافة الدفعة بنجاح ✨');
      setNewPayment({ type: 'balance', amount: '', payment_method: 'cash', notes: '' });
      setShowAddPayment(false);
      await reloadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء إضافة الدفعة');
    } finally {
      setIsAddingPayment(false);
    }
  };

  // Calculations
  const rentRevenues = revenues.filter(r => r.type === 'deposit' || r.type === 'balance');
  const paidRent = rentRevenues.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  const remainingRent = Math.max(0, parseFloat(totalAmount || 0) - paidRent);

  const insuranceRevenues = revenues.filter(r => r.type === 'insurance');
  const paidInsurance = insuranceRevenues.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-linear-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
              <Banknote size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                إدارة وتعديل المدفوعات والأسعار
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                العروس: <span className="text-slate-800">{bride?.name || '—'}</span>
                {booking?.dress?.name ? ` | الفستان: ${booking.dress.name}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5 scrollbar-thin">
          {/* 1. Core Pricing Section */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-600" />
                تعديل إجمالي العقد ومبلغ التأمين
              </h4>
              {bookingSavedSuccess && (
                <span className="text-[11px] font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Check size={12} /> تم الحفظ بنجاح
                </span>
              )}
            </div>

            <form onSubmit={handleSaveBookingPricing} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    إجمالي سعر الإيجار (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    مبلغ التأمين المطلوب (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={insuranceAmount}
                    onChange={(e) => setInsuranceAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingBooking}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdatingBooking ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  حفظ تعديل الأسعار
                </button>
              </div>
            </form>
          </div>

          {/* 2. Recorded Payments List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Banknote size={14} className="text-blue-600" />
                سجل المدفوعات المسجلة ({revenues.length})
              </h4>
              <button
                type="button"
                onClick={() => setShowAddPayment(!showAddPayment)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus size={13} />
                {showAddPayment ? 'إلغاء الإضافة' : 'إضافة دفعة جديدة'}
              </button>
            </div>

            {/* Add Payment Collapse Form */}
            {showAddPayment && (
              <form onSubmit={handleAddNewPayment} className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3 animate-in fade-in">
                <div className="text-xs font-black text-indigo-900">تسجيل دفعة جديدة</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">نوع الدفعة</label>
                    <select
                      value={newPayment.type}
                      onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value })}
                      className="w-full bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden"
                    >
                      <option value="deposit">عربون حجز</option>
                      <option value="balance">دفعة متبقي / استلام</option>
                      <option value="insurance">تأمين مسترد</option>
                      <option value="fitting_fee">رسوم قياس</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">المبلغ (ج.م)</label>
                    <input
                      type="number"
                      min="1"
                      step="50"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      placeholder="0"
                      className="w-full bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">طريقة الدفع</label>
                    <select
                      value={newPayment.payment_method}
                      onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                      className="w-full bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden"
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">ملاحظات (اختياري)</label>
                  <input
                    type="text"
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                    placeholder="ملاحظات توضيحية عن هذه الدفعة..."
                    className="w-full bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPayment(false)}
                    className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingPayment}
                    className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    {isAddingPayment ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                    إضافة الدفعة
                  </button>
                </div>
              </form>
            )}

            {/* Payments List */}
            {revenues.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                لا توجد دفعات مالية مسجلة بعد لهذا الحجز.
              </div>
            ) : (
              <div className="space-y-2">
                {revenues.map((rev) => {
                  const isEditing = editingRevId === rev.id;
                  const typeMeta = getTypeMeta(rev.type);

                  if (isEditing) {
                    return (
                      <div key={rev.id} className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-black text-amber-900">
                          <span>تعديل الدفعة #{rev.id}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border ${typeMeta.color}`}>
                            {typeMeta.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">نوع الدفعة</label>
                            <select
                              value={editForm.type}
                              onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                              className="w-full bg-white border border-amber-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800"
                            >
                              <option value="deposit">عربون حجز</option>
                              <option value="balance">دفعة متبقي / استلام</option>
                              <option value="insurance">تأمين مسترد</option>
                              <option value="fitting_fee">رسوم قياس</option>
                              <option value="insurance_refund">استرداد تأمين</option>
                              <option value="other">أخرى</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">المبلغ (ج.م)</label>
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={editForm.amount}
                              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                              className="w-full bg-white border border-amber-200 rounded-xl px-2 py-1.5 text-xs font-black text-slate-800"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">طريقة الدفع</label>
                            <select
                              value={editForm.payment_method}
                              onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                              className="w-full bg-white border border-amber-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800"
                            >
                              {PAYMENT_METHODS.map(m => (
                                <option key={m.id} value={m.id}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">ملاحظات</label>
                          <input
                            type="text"
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            className="w-full bg-white border border-amber-200 rounded-xl px-2 py-1.5 text-xs text-slate-800"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingRevId(null)}
                            className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditRevenue(rev.id)}
                            disabled={isSavingRev}
                            className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          >
                            {isSavingRev ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                            حفظ التعديل
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={rev.id}
                      className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-2xl hover:border-slate-300 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black border flex-shrink-0 ${typeMeta.color}`}>
                          {typeMeta.label}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                            <span>{formatMoney(rev.amount)} ج.م</span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {getMethodLabel(rev.payment_method)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold truncate mt-0.5">
                            {rev.payment_date ? rev.payment_date.split('T')[0] : ''}
                            {rev.notes ? ` • ${rev.notes}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(rev)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                          title="تعديل هذه الدفعة"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRevenue(rev.id, rev.type, rev.amount)}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                          title="حذف هذه الدفعة"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Live Financial Summary Cards */}
          <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white space-y-3">
            <div className="text-xs font-black text-slate-300 flex items-center justify-between">
              <span>ملخص الحساب بعد التعديلات</span>
              <span className="text-[10px] text-emerald-400 font-bold">تحديث فوري</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                <div className="text-[10px] text-slate-400 font-bold">سعر الإيجار</div>
                <div className="font-black text-white text-sm mt-0.5">{formatMoney(totalAmount)} ج.م</div>
              </div>

              <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                <div className="text-[10px] text-slate-400 font-bold">المدفوع من الإيجار</div>
                <div className="font-black text-emerald-400 text-sm mt-0.5">{formatMoney(paidRent)} ج.م</div>
              </div>

              <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                <div className="text-[10px] text-slate-400 font-bold">المتبقي من الإيجار</div>
                <div className={`font-black text-sm mt-0.5 ${remainingRent > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {formatMoney(remainingRent)} ج.م
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                <div className="text-[10px] text-slate-400 font-bold">التأمين المطلوب</div>
                <div className="font-black text-amber-300 text-sm mt-0.5">
                  {formatMoney(insuranceAmount)} ج.م
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  المدفوع: {formatMoney(paidInsurance)} ج.م
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

export default BookingPaymentsModal;
