import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiClient, getStorageUrl } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { calculateScheduledDates, isCairoCity } from '@/lib/utils';
import { StageBadge } from './StageBadge';
import { UnifiedStageModal } from './UnifiedStageModal';
import { ReturnDressModal } from './ReturnDressModal';
import { BookingPaymentsModal } from './BookingPaymentsModal';
import { VisitFeePaymentModal } from './VisitFeePaymentModal';
import { PAYMENT_METHODS } from '@/components/MultiPaymentMethodInput';
import { CancelBookingModal, CANCELLATION_REASONS } from './CancelBookingModal';
import { OPEN_VISIT_STATUSES, VISIT_STATUS, getLatestVisit, getVisitDresses, getVisitStatus, isPendingRepeatRequest, needsWhatsApp } from './visitStatus';
import { DressAvailability } from './DressAvailability';
import { buildVisitConfirmationUrl, formatVisitTime } from '@/lib/whatsapp';
import {
  X, Phone, MapPin, Calendar, Heart, Ruler, Package, RotateCcw,
  Clock, Sparkles, Banknote, Edit3, MessageCircle, CheckCircle2, Loader2, Trash2, AlertTriangle, Ban,
  UserX, XCircle, CalendarPlus, FileText
} from 'lucide-react';
import { confirmDialog } from '@/components/ui/ConfirmDialog';

const STAGES = [
  { id: 'visit', label: 'زيارة', icon: Calendar },
  { id: 'booking', label: 'حجز', icon: Heart },
  { id: 'fitting', label: 'بروفة', icon: Ruler },
  { id: 'picked_up', label: 'استلام', icon: Package },
  { id: 'returned', label: 'إرجاع', icon: RotateCcw },
];

function formatMoney(n) {
  if (n === undefined || n === null) return '0';
  return parseFloat(n).toLocaleString();
}

function formatDate(d) {
  if (!d) return '—';
  return String(d).split('T')[0].split(' ')[0];
}

const VISIT_SOURCE_LABELS = {
  website: 'الموقع',
  walkin: 'في المحل',
  phone: 'تليفون',
  whatsapp: 'واتساب',
  instagram: 'انستجرام',
  referral: 'ترشيح',
};

function getDressImage(dress) {
  const path = dress?.image_path || dress?.images?.find((i) => i.is_primary)?.image_path || dress?.images?.[0]?.image_path;
  return path ? getStorageUrl(path) : null;
}

function getAvatar(bride) {
  if (bride.image_path) return getStorageUrl(bride.image_path);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(bride.name || '?')}&background=e2e8f0&color=475569`;
}

export function BrideJourneyPopup({
  bride: initialBride,
  onClose,
  onUpdate,
}) {
  const [loading, setLoading] = useState(false);
  const [localBride, setLocalBride] = useState(initialBride);
  const [stageModal, setStageModal] = useState({ isOpen: false, stage: null });
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);
  const [isVisitFeeModalOpen, setIsVisitFeeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [availability, setAvailability] = useState({ loading: false, error: false, byDress: {} });
  const [triedDressIds, setTriedDressIds] = useState([]);
  const [uploadingBill, setUploadingBill] = useState(false);

  // Keep local state synced if parent passes a newer bride object
  useEffect(() => {
    if (initialBride) {
      setLocalBride({
        ...initialBride,
        current_stage: initialBride.current_stage || initialBride.stage || 'visit',
      });
    }
  }, [initialBride]);

  // Visit stage: check each requested dress on the try-on date and on the wedding date
  const availabilityBride = localBride || initialBride;
  const availabilityVisit = getLatestVisit(availabilityBride);
  const isVisitStage = (availabilityBride?.current_stage || availabilityBride?.stage || 'visit') === 'visit';
  const requestedKey = (availabilityVisit?.requested_dresses || []).map((d) => d.id).join(',');
  const triedKey = (availabilityVisit?.tried_dresses || []).map((d) => d.id).join(',');
  useEffect(() => {
    setTriedDressIds(triedKey ? triedKey.split(',').map(Number) : []);
  }, [triedKey]);
  useEffect(() => {
    if (!isVisitStage || !availabilityVisit?.id || !requestedKey) {
      setAvailability({ loading: false, error: false, byDress: {} });
      return;
    }
    let cancelled = false;
    setAvailability((prev) => ({ ...prev, loading: true, error: false }));
    apiClient.get(`/visits/${availabilityVisit.id}/availability`)
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res) ? res : res?.data || [];
        setAvailability({ loading: false, error: false, byDress: Object.fromEntries(rows.map((r) => [r.dress_id, r])) });
      })
      .catch(() => !cancelled && setAvailability({ loading: false, error: true, byDress: {} }));
    return () => { cancelled = true; };
  }, [isVisitStage, availabilityVisit?.id, availabilityVisit?.visit_date, availabilityBride?.wedding_date, requestedKey]);

  const bride = localBride || initialBride;
  if (!bride) return null;

  const reloadBride = async () => {
    try {
      const res = await apiClient.get(`/clients/${bride.id}`);
      const freshData = res.data || res;
      if (freshData && freshData.id) {
        const enriched = {
          ...freshData,
          current_stage: freshData.current_stage || freshData.stage || 'visit',
        };
        setLocalBride(enriched);
        return enriched;
      }
    } catch (err) {
      console.warn('Failed to reload client data:', err);
    }
    return null;
  };

  const rawStage = bride.current_stage || bride.stage || 'visit';
  const booking = bride.bookings?.[0];
  const isDelivered = booking?.status === 'picked_up' || booking?.status === 'out';
  // Dress delivered to the bride => journey moves to the RETURN stage (receive from bride)
  const stage = rawStage === 'picked_up' && isDelivered ? 'returned' : rawStage;
  const dress = booking?.dress;
  const dress2 = booking?.dress2;
  const latestVisit = getLatestVisit(bride);
  const visitStatusKey = latestVisit?.status || 'pending';
  const visitStatusCfg = getVisitStatus(bride);
  const whatsAppPending = needsWhatsApp(latestVisit);
  const visitFeePayments = (latestVisit?.revenues || []).filter((r) => r.type === 'fitting_fee');
  const visitFeeDue = parseFloat(latestVisit?.trying_fee || 0);
  const visitFeePaid = visitFeePayments.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  const visitFeeRemaining = Math.max(0, visitFeeDue - visitFeePaid);
  const isRepeatRequest = isPendingRepeatRequest(latestVisit);
  const previousVisit = latestVisit?.previous_visit;
  const isVisitOpen = Boolean(latestVisit) && OPEN_VISIT_STATUSES.includes(visitStatusKey);
  const dresses = stage === 'visit' ? getVisitDresses(bride) : [dress, dress2, booking?.dress3].filter(Boolean);

  const weddingDate = booking?.event_date || bride.wedding_date || bride.relevant_date;
  const scheduled = calculateScheduledDates(weddingDate, bride.city);
  const pickupDate = booking?.pickup_scheduled_on || bride.pickup_scheduled_on || scheduled.pickupDate;
  const returnDate = booking?.return_scheduled_on || bride.return_scheduled_on || scheduled.returnDate;

  const rentRevenues = (booking?.revenues || []).filter((r) => r.type === 'deposit' || r.type === 'balance');
  const paidRent = rentRevenues.length > 0
    ? rentRevenues.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)
    : parseFloat(booking?.deposit_amount || 0);
  const remaining = Math.max(0, parseFloat(booking?.total_amount || 0) - paidRent);

  const insuranceRevenues = (booking?.revenues || []).filter((r) => r.type === 'insurance');
  const paidInsurance = insuranceRevenues.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

  const currentStageIndex = STAGES.findIndex((s) => s.id === stage);
  // The shop bill (one image for all of the booking's payments) is attached in the booking and pickup stages
  const canEditBill = stage === 'booking' || stage === 'picked_up';

  const handleBillUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!booking || !file) return;
    const formData = new FormData();
    formData.append('image', file);
    setUploadingBill(true);
    try {
      await apiClient.postFormData(`/bookings/${booking.id}/bill-image`, formData);
      const fresh = await reloadBride();
      await onUpdate?.(fresh);
      toast.success('تم إرفاق الفاتورة ✨');
    } catch (err) {
      console.error(err);
      toast.error('تعذر رفع صورة الفاتورة');
    } finally {
      setUploadingBill(false);
    }
  };

  const handleBillDelete = async () => {
    if (!booking?.bill_image_path) return;
    if (!await confirmDialog('هل تريد حذف صورة الفاتورة المرفقة؟', { title: 'حذف الفاتورة', confirmLabel: 'حذف', danger: true })) return;
    setUploadingBill(true);
    try {
      await apiClient.delete(`/bookings/${booking.id}/bill-image`);
      const fresh = await reloadBride();
      await onUpdate?.(fresh);
    } catch (err) {
      console.error(err);
      toast.error('تعذر حذف صورة الفاتورة');
    } finally {
      setUploadingBill(false);
    }
  };

  const refreshAfterPayment = async () => {
    setLoading(true);
    try {
      const fresh = await reloadBride();
      await onUpdate?.(fresh);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVisitFee = async (revenue) => {
    if (!await confirmDialog(`هل تريد حذف دفعة رسوم التجربة (${formatMoney(revenue.amount)} ج.م)؟`, { title: 'حذف الدفعة', confirmLabel: 'حذف', danger: true })) return;
    try {
      await apiClient.delete(`/revenues/${revenue.id}`);
      await refreshAfterPayment();
    } catch (err) {
      toast.error(err?.message || 'حدث خطأ أثناء حذف الدفعة');
    }
  };

  const handleQuickAction = async (action, payload = {}) => {
    setLoading(true);
    try {
      await apiClient.put(`/clients/${bride.id}/stage-action`, { action, ...payload });
      const fresh = await reloadBride();
      await onUpdate?.(fresh);
      toast.success('تم تنفيذ الإجراء بنجاح ✨');
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء تنفيذ الإجراء');
    } finally {
      setLoading(false);
    }
  };

  // Opens WhatsApp with the visit confirmation template (date, time, trying fee)
  const sendVisitWhatsApp = async (targetBride = bride) => {
    const url = await buildVisitConfirmationUrl(targetBride, getLatestVisit(targetBride));
    if (!url) {
      toast.error('لا يوجد رقم هاتف صالح للعروس');
      return;
    }
    if (!window.open(url, '_blank')) {
      toast.warning('المتصفح منع فتح واتساب، اضغط زر "إرسال تفاصيل الزيارة واتساب"');
      return;
    }
    // Remember that the bride got her confirmation (clears the "send WhatsApp" badge)
    try {
      await apiClient.post(`/visits/${getLatestVisit(targetBride).id}/confirmation-sent`, {});
      const fresh = await reloadBride();
      await onUpdate?.(fresh);
    } catch (e) {
      console.error('Failed to record WhatsApp confirmation:', e);
    }
  };

  const closeVisit = async (visitStatus) => {
    const confirmText = {
      no_show: 'تسجيل أن العروس لم تحضر الزيارة؟',
      declined: 'رفض طلب الزيارة؟ لن تظهر الزيارة ضمن المواعيد وسيتم تحرير الوقت.',
    }[visitStatus] || 'تسجيل أن العروس جربت الفساتين ولم تختر فستاناً؟';
    if (!await confirmDialog(confirmText)) return;
    handleQuickAction('close_visit', {
      visit_status: visitStatus,
      ...(visitStatus === 'no_show' || visitStatus === 'declined' ? { tried_dresses: [] } : {}),
    });
  };

  // Marks which requested dresses the bride actually tried (saved right away on the visit)
  const toggleTriedDress = async (dressId) => {
    if (!latestVisit?.id) return;
    const previous = triedDressIds;
    const next = previous.includes(dressId) ? previous.filter((id) => id !== dressId) : [...previous, dressId];
    setTriedDressIds(next);
    try {
      await apiClient.put(`/visits/${latestVisit.id}`, { tried_dresses: next });
      const fresh = await reloadBride();
      await onUpdate?.(fresh);
    } catch (e) {
      console.error(e);
      setTriedDressIds(previous);
      toast.error('تعذر حفظ الفساتين التي تمت تجربتها');
    }
  };

  const handleRevertTo = async (targetStageId, targetStageLabel) => {
    if (!booking?.id) return;
    const confirmMessage = `هل أنت متأكد من العودة إلى مرحلة (${targetStageLabel})؟\nسيتم حذف البيانات المالية والمواعيد المسجلة بعد هذه المرحلة وإعادة الفستان للحالة المتاحة.`;
    if (!await confirmDialog(confirmMessage)) return;

    setLoading(true);
    try {
      await apiClient.put(`/bookings/${booking.id}/revert-stage`, { target_stage: targetStageId });
      toast.success(`تمت العودة بنجاح إلى مرحلة: ${targetStageLabel}`);
      const fresh = await reloadBride();
      await onUpdate?.(fresh);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'حدث خطأ أثناء الرجوع للمرحلة السابقة');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBride = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/clients/${bride.id}`);
      toast.success(`تم مسح بيانات العروس (${bride.name}) بالكامل نهائياً وكأنها لم تُسجل ✨`);
      setIsDeleteConfirmOpen(false);
      if (onUpdate) await onUpdate(null);
      if (onClose) onClose();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || 'حدث خطأ أثناء مسح بيانات العروس');
    } finally {
      setIsDeleting(false);
    }
  };

  // isEdit: opened from the "edit current stage" button -> update saved data instead of adding new records
  const openFormForStage = (targetStage, isEdit = false) => {
    if (targetStage === 'returned') {
      setIsReturnModalOpen(true);
    } else {
      setStageModal({ isOpen: true, stage: targetStage || stage, isEdit });
    }
  };

  const renderActions = () => {
    const common = 'flex-1 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1';

    switch (stage) {
      case 'visit':
        // 1. Request not reviewed yet -> review date/time/dresses, confirm, then send WhatsApp
        if (!latestVisit || visitStatusKey === 'pending') {
          return (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => openFormForStage('visit')} disabled={loading} className={`${common} bg-emerald-600 hover:bg-emerald-700 text-white`}>
                  <CheckCircle2 size={13} /> مراجعة وتأكيد الزيارة
                </button>
                <button onClick={() => openFormForStage('booking')} className={`${common} bg-amber-600 hover:bg-amber-700 text-white`}>
                  <Heart size={13} /> حجز فستان
                </button>
              </div>
              {isRepeatRequest && (
                <button onClick={() => closeVisit('declined')} disabled={loading} className={`${common} w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200`}>
                  <Ban size={13} /> رفض الطلب
                </button>
              )}
            </div>
          );
        }
        // 2. Confirmed / arrived -> remind on WhatsApp, then record the outcome of the try-on
        if (isVisitOpen) {
          return (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => sendVisitWhatsApp()}
                  disabled={loading}
                  className={`${common} text-white ${whatsAppPending ? 'bg-lime-600 hover:bg-lime-700 ring-2 ring-lime-200' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  <MessageCircle size={13} /> {whatsAppPending ? 'أرسل تأكيد الزيارة واتساب' : 'إعادة إرسال تفاصيل الزيارة'}
                </button>
                <button onClick={() => openFormForStage('booking')} className={`${common} bg-amber-600 hover:bg-amber-700 text-white`}>
                  <Heart size={13} /> اختارت فستاناً — حجز
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openFormForStage('visit', true)} disabled={loading} className={`${common} bg-white hover:bg-slate-50 text-slate-700 border border-slate-200`}>
                  <Calendar size={13} /> تغيير الموعد
                </button>
                <button onClick={() => closeVisit('done')} disabled={loading} className={`${common} bg-white hover:bg-slate-50 text-slate-700 border border-slate-200`}>
                  <XCircle size={13} /> لم تختر فستاناً
                </button>
                <button onClick={() => closeVisit('no_show')} disabled={loading} className={`${common} bg-white hover:bg-rose-50 text-rose-600 border border-rose-200`}>
                  <UserX size={13} /> لم تحضر
                </button>
              </div>
            </div>
          );
        }
        // 3. Visit closed without a booking -> she can come again or book directly
        return (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => openFormForStage('visit')} disabled={loading} className={`${common} bg-indigo-600 hover:bg-indigo-700 text-white`}>
              <CalendarPlus size={13} /> زيارة جديدة
            </button>
            <button onClick={() => openFormForStage('booking')} className={`${common} bg-amber-600 hover:bg-amber-700 text-white`}>
              <Heart size={13} /> حجز فستان
            </button>
          </div>
        );
      case 'booking':
        return (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => openFormForStage('fitting')} className={`${common} bg-indigo-600 hover:bg-indigo-700 text-white`}>
              <Ruler size={13} /> تحديد موعد بروفة
            </button>
            <button onClick={() => openFormForStage('booking')} className={`${common} bg-amber-600 hover:bg-amber-700 text-white`}>
              <Heart size={13} /> تعديل الحجز
            </button>
            {booking?.status === 'confirmed' && (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                disabled={loading}
                className={`${common} col-span-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200`}
              >
                <Ban size={13} /> إلغاء الحجز
              </button>
            )}
          </div>
        );
      case 'fitting':
        return (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => openFormForStage('fitting')} className={`${common} bg-indigo-600 hover:bg-indigo-700 text-white`}>
              <Ruler size={13} /> بروفة إضافية
            </button>
            <button
              onClick={() => handleQuickAction('end_fitting')}
              disabled={loading}
              className={`${common} bg-emerald-600 hover:bg-emerald-700 text-white`}
              title="إنهاء مرحلة القياس والبروفة والانتقال للاستلام"
            >
              <CheckCircle2 size={13} /> إنهاء البروفة ✂️
            </button>
          </div>
        );
      case 'picked_up': {
        // Dress not yet delivered to the bride -> single step: hand over the dress
        const weddingDate = bride.wedding_date || booking?.event_date;
        let isPickupOverdue = false;
        if (weddingDate) {
          const isCairo = isCairoCity(bride.city);
          const pickupDate = new Date(new Date(weddingDate).getTime() - (isCairo ? 1 : 2) * 24 * 60 * 60 * 1000);
          if (new Date() > pickupDate) {
            isPickupOverdue = true;
          }
        }

        return (
          <div className="space-y-1.5">
            {isPickupOverdue && (
              <div className="text-[10.5px] font-black text-rose-800 bg-rose-50/90 border border-rose-200 rounded-xl px-2.5 py-1.5 text-center leading-tight flex items-center justify-center gap-1">
                <AlertTriangle size={12} className="text-rose-600" />
                <span>تنبيه: حان موعد تسليم الفستان للعروس</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => openFormForStage('fitting')}
                className={`${common} bg-indigo-600 hover:bg-indigo-700 text-white`}
              >
                <Ruler size={13} /> تحديد موعد بروفة
              </button>
              <button
                onClick={() => openFormForStage('booking')}
                className={`${common} bg-amber-600 hover:bg-amber-700 text-white`}
              >
                <Calendar size={13} /> تعديل موعد الاستلام / الحجز
              </button>
            </div>
            <button
              onClick={() => openFormForStage('picked_up')}
              disabled={loading}
              className={`${common} w-full py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-xs`}
            >
              <Package size={14} /> تسليم الفستان للعروس (فحص الإكسسوارات + التأمين والمتبقي) 📦
            </button>
            {booking?.status === 'confirmed' && (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                disabled={loading}
                className={`${common} w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200`}
              >
                <Ban size={13} /> إلغاء الحجز
              </button>
            )}
          </div>
        );
      }
      case 'returned': {
        // Dress is out with the bride -> RETURN stage: receive dress + inspect + settle insurance
        if (isDelivered) {
          return (
            <div className="space-y-1.5">
              <div className="text-[10.5px] font-black text-blue-800 bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                <span>الفستان مع العروس — بانتظار الاستلام والفحص</span>
                <span className="text-[9px] bg-blue-200/70 text-blue-900 px-1.5 py-0.5 rounded-md font-bold">قيد الإرجاع</span>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(true)}
                disabled={loading}
                className={`${common} w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs`}
              >
                <RotateCcw size={14} /> استلام الفستان من العروس (جرد الملحقات + تسوية التأمين) 🔄
              </button>
            </div>
          );
        }

        return (
          <div className="text-[10.5px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 text-center">
            ✓ تم استلام الفستان من العروس واكتملت الرحلة بنجاح
          </div>
        );
      }
      case 'cancelled': {
        const refunded = (type) => Math.abs((booking?.revenues || []).filter((r) => r.type === type).reduce((sum, r) => sum + parseFloat(r.amount || 0), 0));
        return (
          <div className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-2.5 space-y-1">
            <div className="flex items-center justify-between font-black">
              <span className="flex items-center gap-1"><Ban size={13} /> تم إلغاء الحجز</span>
              <span className="font-mono text-[10px]">{formatDate(booking?.cancelled_at)}</span>
            </div>
            <div>السبب: {CANCELLATION_REASONS[booking?.cancellation_reason] || '—'}{booking?.cancellation_note ? ` — ${booking.cancellation_note}` : ''}</div>
            <div className="flex flex-wrap gap-x-3 text-rose-700">
              <span>رد عربون: {formatMoney(refunded('deposit_refund'))} ج.م</span>
              <span>رد تأمين: {formatMoney(refunded('insurance_refund'))} ج.م</span>
              {booking?.cancelled_by_name && <span>بواسطة: {booking.cancelled_by_name}</span>}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const isAnySubModalOpen = stageModal.isOpen || isReturnModalOpen || isCancelModalOpen;

  const modalContent = (
    <>
      {!isAnySubModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[99990] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto"
          dir="rtl"
          onClick={onClose}
        >
          <div
            className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg border border-slate-100 shadow-[0_25px_60px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col max-h-[min(92vh,720px)] my-auto animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <span className="text-xs font-black text-slate-700 bg-white/90 px-3 py-1 rounded-full shadow-xs border border-slate-100">
                  جاري تحديث البيانات والمسار...
                </span>
              </div>
            )}
          {/* Header */}
          <div className="relative bg-gradient-to-br from-slate-50 to-white p-4 border-b border-slate-100 flex-shrink-0">
            <div className="absolute top-3 left-3 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="مسح العروس وكافة بياناتها نهائياً"
              >
                <Trash2 size={16} />
              </button>
              {stage !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => openFormForStage(stage, true)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="تعديل بيانات المرحلة الحالية"
                >
                  <Edit3 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-slate-100 flex-shrink-0">
                <img src={getAvatar(bride)} alt={bride.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-slate-800 truncate">{bride.name}</h3>
                  {bride.journey_mode === 'legacy' && (
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-black border border-amber-200">Legacy</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1"><Phone size={10} /> {bride.phone || '—'}</span>
                  {bride.city && <span className="flex items-center gap-1"><MapPin size={10} /> {bride.city}</span>}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <StageBadge stage={stage} journeyMode={bride.journey_mode} />
                  {stage === 'visit' && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${visitStatusCfg.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${visitStatusCfg.dotColor}`} />
                      {visitStatusCfg.label}
                    </span>
                  )}
                  {remaining > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                      متبقي {formatMoney(remaining)} ج.م
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 p-4 space-y-4 scrollbar-thin">
            {/* Timeline */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                  <Clock size={13} className="text-indigo-500" /> مسار رحلة العروس
                </h4>
                {currentStageIndex > 0 && booking?.id && (
                  <button
                    type="button"
                    onClick={() => handleRevertTo(STAGES[currentStageIndex - 1].id, STAGES[currentStageIndex - 1].label)}
                    className="text-[9.5px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5 hover:underline cursor-pointer"
                  >
                    <RotateCcw size={10} />
                    <span>العودة لمرحلة سابقة</span>
                  </button>
                )}
              </div>
              <div className="relative flex items-center justify-between px-1">
                <div className="absolute top-[14px] left-4 right-4 h-0.5 bg-slate-200 -z-0" />
                {STAGES.map((s, idx) => {
                  const Icon = s.icon;
                  const isCurrent = idx === currentStageIndex;
                  const isPast = idx < currentStageIndex;
                  const isFuture = idx > currentStageIndex;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={stage === 'cancelled'}
                      onClick={() => {
                        if (isCurrent || isFuture) {
                          openFormForStage(s.id);
                        } else if (isPast && booking?.id) {
                          // Reverting from return stage to pickup stage => dress goes back to "awaiting delivery"
                          const targetStageId = s.id === 'picked_up' ? 'pickup_pending' : s.id;
                          const targetLabel = s.id === 'picked_up' ? 'مرحلة التسليم (بانتظار التسليم للعروس)' : s.label;
                          handleRevertTo(targetStageId, targetLabel);
                        }
                      }}
                      className="relative z-10 flex flex-col items-center gap-1.5 flex-1 cursor-pointer group transition-transform active:scale-95"
                      title={isCurrent ? 'انقر لتعديل بيانات هذه المرحلة' : isPast ? `انقر للعودة إلى مرحلة: ${s.label}` : `انقر لتسجيل: ${s.label}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCurrent ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-2 ring-indigo-200' :
                        isPast ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600' :
                        'bg-white border-slate-300 text-slate-400'
                      }`}>
                        <Icon size={13} />
                      </div>
                      <span className={`text-[9px] font-black ${isCurrent ? 'text-indigo-700' : isPast ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dresses */}
            {dresses.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" /> {stage === 'visit' ? 'فساتين مطلوب تجربتها بالزيارة' : 'الفساتين المحجوزة'}
                  </h4>
                  {stage === 'visit' && availability.loading && (
                    <span className="text-[9.5px] font-bold text-slate-400 flex items-center gap-1">
                      <Loader2 size={11} className="animate-spin" /> جاري فحص الإتاحة...
                    </span>
                  )}
                </div>
                {stage === 'visit' && availability.error && (
                  <div className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                    تعذر فحص إتاحة الفساتين، حاول فتح البطاقة مرة أخرى.
                  </div>
                )}
                <div className="space-y-1.5">
                  {dresses.map((d, idx) => {
                    const image = getDressImage(d);
                    const avail = stage === 'visit' ? availability.byDress[d.id] : null;
                    const isTried = triedDressIds.includes(d.id);
                    return (
                      <div key={d.id || idx} className="p-2 bg-white border border-slate-100 rounded-xl shadow-2xs space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                            {image ? (
                              <img src={image} alt={d.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300"><Sparkles size={16} /></div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black text-slate-800 truncate">{d.name}</div>
                            <div className="text-[10px] text-slate-500 font-bold">{d.code ? `كود: ${d.code}` : ''} {d.size ? `مقاس: ${d.size}` : ''}</div>
                          </div>
                          {stage === 'visit' && isVisitOpen && visitStatusKey !== 'pending' && (
                            <label className="flex items-center gap-1 text-[10px] font-black text-slate-600 cursor-pointer select-none flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={isTried}
                                onChange={() => toggleTriedDress(d.id)}
                                className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                              />
                              جرّبته
                            </label>
                          )}
                          {stage === 'visit' && !isVisitOpen && isTried && (
                            <span className="text-[9.5px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex-shrink-0">تمت التجربة</span>
                          )}
                        </div>

                        <DressAvailability row={avail} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isRepeatRequest && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 space-y-1">
                <div className="text-[11px] font-black text-rose-700 flex items-center gap-1">
                  <AlertTriangle size={13} /> طلب زيارة متكرر — العروس زارت من قبل
                </div>
                {previousVisit ? (
                  <div className="text-[10px] font-bold text-slate-600 space-y-0.5 leading-snug">
                    <div>
                      الزيارة السابقة: {formatDate(previousVisit.visit_date)}
                      {previousVisit.time_slot && ` — ${formatVisitTime(previousVisit.time_slot)}`}
                      {' · '}{VISIT_STATUS[previousVisit.status]?.label || previousVisit.status}
                    </div>
                    {previousVisit.tried_dresses?.length > 0 && (
                      <div>جربت: {previousVisit.tried_dresses.map((d) => d.code || d.name).join('، ')}</div>
                    )}
                    {previousVisit.client && previousVisit.client.id !== bride.id && (
                      <div>مسجلة سابقاً كعروس أخرى: {previousVisit.client.name} — {previousVisit.client.phone}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] font-bold text-slate-500">تم حذف بيانات الزيارة السابقة.</div>
                )}
                <div className="text-[10px] font-bold text-rose-600">راجع بياناتها ثم أكد الزيارة أو ارفض الطلب.</div>
              </div>
            )}

            {/* Event & Scheduled Dates */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-indigo-700 flex items-center gap-1"><Calendar size={11} /> تاريخ المناسبة</div>
                <div className="text-xs font-black text-slate-800 mt-0.5">{formatDate(weddingDate)}</div>
              </div>
              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-amber-700 flex items-center gap-1"><Clock size={11} /> موعد الزيارة</div>
                <div className="text-xs font-black text-slate-800 mt-0.5">
                  {formatDate(latestVisit?.visit_date || bride.latest_visit_date || booking?.booking_date)}
                  {latestVisit?.time_slot && <span className="text-slate-500 font-bold"> — {formatVisitTime(latestVisit.time_slot)}</span>}
                </div>
                {stage === 'visit' && latestVisit && (
                  <div className="mt-1 space-y-0.5 text-[9.5px] font-bold text-slate-500 leading-snug">
                    <div>المصدر: {VISIT_SOURCE_LABELS[latestVisit.source] || latestVisit.source || '—'}</div>
                    {latestVisit.confirmed_at && (
                      <div>{latestVisit.auto_confirmed ? '⚡ تأكيد تلقائي (أول زيارة)' : '👤 تأكيد بواسطة الموظف'}</div>
                    )}
                    {latestVisit.status === 'confirmed' && (
                      <div className={whatsAppPending ? 'text-lime-700' : 'text-emerald-700'}>
                        {whatsAppPending ? '✗ لم تُرسل رسالة التأكيد بعد' : `✓ أُرسلت رسالة التأكيد ${formatDate(latestVisit.confirmation_sent_at)}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {stage !== 'visit' && (
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5">
                  <div className="text-[10px] font-bold text-blue-700 flex items-center gap-1"><Package size={11} /> تاريخ الاستلام</div>
                  <div className="text-xs font-black text-slate-800 mt-0.5">{formatDate(pickupDate)}</div>
                </div>
              )}
              {stage !== 'visit' && (
                <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-2.5">
                  <div className="text-[10px] font-bold text-purple-700 flex items-center gap-1"><RotateCcw size={11} /> تاريخ الإرجاع</div>
                  <div className="text-xs font-black text-slate-800 mt-0.5">{formatDate(returnDate)}</div>
                </div>
              )}
            </div>

            {/* Finances - Only for booking, fitting, pickup stages or confirmed bookings */}
            {booking && stage !== 'visit' && booking.status !== 'pending' && (
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-emerald-800 flex items-center gap-1.5">
                    <Banknote size={13} /> الملخص المالي
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsPaymentsModalOpen(true)}
                    className="text-[10px] font-black text-emerald-800 hover:text-emerald-950 bg-emerald-100/90 hover:bg-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    title="تعديل المدفوعات والأسعار"
                  >
                    <Edit3 size={11} /> تعديل المدفوعات
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-white rounded-xl p-2 border border-emerald-100/60">
                    <div className="text-slate-500 font-bold">الإجمالي</div>
                    <div className="font-black text-slate-800">{formatMoney(booking.total_amount)} ج.م</div>
                  </div>
                  <div className="bg-white rounded-xl p-2 border border-emerald-100/60">
                    <div className="text-slate-500 font-bold">مدفوع</div>
                    <div className="font-black text-emerald-600">{formatMoney(paidRent)} ج.م</div>
                  </div>
                  <div className="bg-white rounded-xl p-2 border border-emerald-100/60">
                    <div className="text-slate-500 font-bold">متبقي</div>
                    <div className={`font-black ${remaining > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{formatMoney(remaining)} ج.م</div>
                  </div>
                  <div className="bg-white rounded-xl p-2 border border-emerald-100/60">
                    <div className="text-slate-500 font-bold">تأمين</div>
                    <div className="font-black text-amber-600">{formatMoney(booking.insurance_amount)} ج.م</div>
                    {paidInsurance > 0 && (
                      <div className="text-[8.5px] text-emerald-600 font-bold mt-0.5">
                        المدفوع: {formatMoney(paidInsurance)} ج.م
                      </div>
                    )}
                  </div>
                </div>

                {/* Shop bill: one image covering all of the bride's payments */}
                {(canEditBill || booking.bill_image_path) && (
                  <div className="bg-white rounded-xl p-2 border border-emerald-100/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black text-slate-700 flex items-center gap-1">
                        <FileText size={12} className="text-emerald-600" /> فاتورة المحل
                      </span>
                      {booking.bill_image_path && canEditBill && (
                        <div className="flex items-center gap-1">
                          <label className={`text-[9.5px] font-black text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 px-2 py-0.5 rounded-lg transition-all ${uploadingBill ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
                            {uploadingBill ? 'جاري الرفع...' : 'تغيير'}
                            <input type="file" accept="image/*" className="hidden" onChange={handleBillUpload} disabled={uploadingBill} />
                          </label>
                          <button
                            type="button"
                            onClick={handleBillDelete}
                            disabled={uploadingBill}
                            className="p-1 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="حذف الفاتورة"
                            aria-label="حذف الفاتورة"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                    {booking.bill_image_path ? (
                      <a href={getStorageUrl(booking.bill_image_path)} target="_blank" rel="noreferrer" title="فتح الفاتورة بالحجم الكامل">
                        <img
                          src={getStorageUrl(booking.bill_image_path)}
                          alt="فاتورة المحل"
                          className="w-full max-h-40 object-contain rounded-lg border border-slate-100 bg-slate-50"
                        />
                      </a>
                    ) : (
                      <label className={`flex items-center justify-center gap-1.5 p-2.5 border-2 border-dashed border-emerald-200 hover:border-emerald-400 rounded-lg text-[10px] font-bold text-slate-500 hover:text-emerald-700 transition-colors ${uploadingBill ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
                        <FileText size={13} />
                        <span>{uploadingBill ? 'جاري الرفع...' : 'إرفاق صورة الفاتورة 📎'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleBillUpload} disabled={uploadingBill} />
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Trying fee card if in visit stage: due, paid and the payments recorded at the visit */}
            {stage === 'visit' && latestVisit && (
              <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-2.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Banknote size={14} className="text-purple-600" /> رسوم تجربة الفساتين:
                  </span>
                  <span className="font-black text-purple-700 font-mono">
                    {formatMoney(visitFeeDue)} ج.م
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10.5px] font-bold text-slate-600">
                    المدفوع: <span className="font-mono text-emerald-700">{formatMoney(visitFeePaid)} ج.م</span>
                    {visitFeeDue > 0 && (
                      visitFeeRemaining > 0
                        ? <> · المتبقي: <span className="font-mono text-amber-700">{formatMoney(visitFeeRemaining)} ج.م</span></>
                        : <span className="text-emerald-700"> · تم السداد ✓</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsVisitFeeModalOpen(true)}
                    className="text-[10px] font-black text-purple-800 bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded-lg transition-all cursor-pointer active:scale-95"
                  >
                    + تسجيل دفع الرسوم
                  </button>
                </div>
                {visitFeePayments.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-purple-100">
                    {visitFeePayments.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 bg-white/70 rounded-lg px-2 py-1 text-[10.5px] font-bold text-slate-600">
                        <span className="truncate">
                          {formatDate(r.payment_date)} · {PAYMENT_METHODS.find((m) => m.id === r.payment_method)?.label || r.payment_method || 'نقدي'}
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          {r.receipt_url && (
                            <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">الإيصال</a>
                          )}
                          <span className="font-mono font-black text-slate-800">{formatMoney(r.amount)} ج.م</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteVisitFee(r)}
                            className="p-0.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                            title="حذف الدفعة"
                          >
                            <Trash2 size={11} />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div>
              <h4 className="text-[11px] font-black text-slate-700 mb-2">إجراءات المرحلة</h4>
              {renderActions()}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 text-right"
          dir="rtl"
          onClick={() => !isDeleting && setIsDeleteConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-sm p-5 border border-rose-100 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-slate-900">مسح بيانات العروس نهائياً؟</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                سيتم مسح العروس <strong className="text-rose-600">({bride.name})</strong> وكافة الحجوزات، المواعيد، القياسات، والمدفوعات المرتبطة بها تماماً وكأنها لم تكن مسجلة مسبقاً.
              </p>
              <p className="text-[10px] text-rose-500 font-extrabold bg-rose-50 py-1 px-2.5 rounded-lg mt-2 inline-block">
                ⚠️ هذا الإجراء نهائي ولا يمكن التراجع عنه
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteBride}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-rose-200"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{isDeleting ? 'جاري المسح...' : 'تأكيد المسح'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Stage Form Modal */}
      {stageModal.isOpen && (
        <UnifiedStageModal
          isOpen={stageModal.isOpen}
          onClose={() => setStageModal({ isOpen: false, stage: null })}
          bride={bride}
          stage={stageModal.stage}
          isEdit={stageModal.isEdit}
          onSuccess={async () => {
            const savedStage = stageModal.stage;
            setStageModal({ isOpen: false, stage: null });
            setLoading(true);
            try {
              const fresh = await reloadBride();
              // Confirming or rescheduling a visit sends the details to the bride
              if (savedStage === 'visit' && fresh && getLatestVisit(fresh)?.status === 'confirmed') {
                await sendVisitWhatsApp(fresh);
              }
              await onUpdate?.(fresh);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

      {/* Dedicated Return Dress Modal */}
      {isReturnModalOpen && (
        <ReturnDressModal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          bride={bride}
          onSuccess={async () => {
            setIsReturnModalOpen(false);
            setLoading(true);
            try {
              const fresh = await reloadBride();
              await onUpdate?.(fresh);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

      {/* Cancel Booking Modal */}
      {isCancelModalOpen && (
        <CancelBookingModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          bride={bride}
          onSuccess={async () => {
            setLoading(true);
            try {
              const fresh = await reloadBride();
              await onUpdate?.(fresh);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

      {/* Visit trying fee payment */}
      {isVisitFeeModalOpen && (
        <VisitFeePaymentModal
          isOpen={isVisitFeeModalOpen}
          onClose={() => setIsVisitFeeModalOpen(false)}
          bride={bride}
          visit={latestVisit}
          remaining={visitFeeRemaining}
          onSuccess={refreshAfterPayment}
        />
      )}

      {/* Booking Payments & Pricing Modal */}
      {isPaymentsModalOpen && (
        <BookingPaymentsModal
          isOpen={isPaymentsModalOpen}
          onClose={() => setIsPaymentsModalOpen(false)}
          bride={bride}
          booking={booking}
          onSuccess={async () => {
            setLoading(true);
            try {
              const fresh = await reloadBride();
              await onUpdate?.(fresh);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

export default BrideJourneyPopup;
