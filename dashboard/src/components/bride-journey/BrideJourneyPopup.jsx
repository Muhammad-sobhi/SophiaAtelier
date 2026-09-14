import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiClient, getStorageUrl } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { calculateScheduledDates } from '@/lib/utils';
import { StageBadge } from './StageBadge';
import { UnifiedStageModal } from './UnifiedStageModal';
import { ReturnDressModal } from './ReturnDressModal';
import { BookingPaymentsModal } from './BookingPaymentsModal';
import {
  X, Phone, MapPin, Calendar, Heart, Ruler, Package, RotateCcw,
  Clock, CreditCard, Sparkles, Banknote, Edit3, MessageCircle, CheckCircle2, Loader2, Trash2, AlertTriangle
} from 'lucide-react';

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
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Keep local state synced if parent passes a newer bride object
  useEffect(() => {
    if (initialBride) {
      setLocalBride({
        ...initialBride,
        current_stage: initialBride.current_stage || initialBride.stage || 'visit',
      });
    }
  }, [initialBride]);

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

  const stage = bride.current_stage || bride.stage || 'visit';
  const booking = bride.bookings?.[0];
  const dress = booking?.dress;
  const dress2 = booking?.dress2;
  const dresses = [dress, dress2, booking?.dress3].filter(Boolean);

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

  const handleQuickAction = async (action) => {
    setLoading(true);
    try {
      await apiClient.put(`/clients/${bride.id}/stage-action`, { action });
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

  const handleRevertTo = async (targetStageId, targetStageLabel) => {
    if (!booking?.id) return;
    const confirmMessage = `هل أنت متأكد من العودة إلى مرحلة (${targetStageLabel})؟\nسيتم حذف البيانات المالية والمواعيد المسجلة بعد هذه المرحلة وإعادة الفستان للحالة المتاحة.`;
    if (!window.confirm(confirmMessage)) return;

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

  const openFormForStage = (targetStage) => {
    if (targetStage === 'returned') {
      setIsReturnModalOpen(true);
    } else {
      setStageModal({ isOpen: true, stage: targetStage || stage });
    }
  };

  const renderActions = () => {
    const common = 'flex-1 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1';

    switch (stage) {
      case 'visit':
        return (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleQuickAction('confirm_visit')} disabled={loading} className={`${common} bg-emerald-600 hover:bg-emerald-700 text-white`}>
              <MessageCircle size={13} /> تأكيد الزيارة
            </button>
            <button onClick={() => openFormForStage('booking')} className={`${common} bg-amber-600 hover:bg-amber-700 text-white`}>
              <Heart size={13} /> حجز فستان
            </button>
            <button onClick={() => openFormForStage('fitting')} className={`${common} bg-indigo-600 hover:bg-indigo-700 text-white col-span-2`}>
              <Ruler size={13} /> تحديد موعد بروفة
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
        const isDelivered = booking?.status === 'picked_up' || booking?.status === 'out';
        return (
          <div className="space-y-2">
            {!isDelivered ? (
              <div className="space-y-1.5">
                <div className="text-[10.5px] font-black text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                  <span>الخطوة 1: تسليم الفستان والملحقات للعروس</span>
                  <span className="text-[9px] bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded-md font-bold">بانتظار التسليم</span>
                </div>
                <button
                  onClick={() => openFormForStage('picked_up')}
                  disabled={loading}
                  className={`${common} w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs`}
                >
                  <Package size={14} /> تسليم الفستان للعروس (فحص الإكسسوارات + التأمين والمتبقي) 📦
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-[10.5px] font-black text-blue-800 bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                  <span>الخطوة 2: الفستان خارج الأتيليه مع العروس</span>
                  <span className="text-[9px] bg-blue-200/70 text-blue-900 px-1.5 py-0.5 rounded-md font-bold">تم التسليم للعروس</span>
                </div>
                <button
                  onClick={() => setIsReturnModalOpen(true)}
                  className={`${common} w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs`}
                >
                  <RotateCcw size={14} /> تسجيل إرجاع الفستان وتسوية التأمين 🔄
                </button>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => openFormForStage('picked_up')}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                  >
                    مراجعة / تعديل الاستلام ✏️
                  </button>
                  <button
                    onClick={() => handleRevertTo('pickup_pending', 'ما قبل التسليم (إلغاء تسليم الفستان)')}
                    disabled={loading}
                    className="text-[10px] font-extrabold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer flex items-center gap-1"
                    title="الرجوع للخطوة 1: إلغاء خروج الفستان وإعادته للأتيليه لتسليمه مجدداً"
                  >
                    <RotateCcw size={11} /> التراجع للخطوة 1 (إلغاء التسليم)
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'returned':
        return (
          <div className="text-center text-xs text-slate-500 font-bold py-2 bg-slate-50 rounded-xl border border-slate-150">
            اكتملت رحلة العروس بنجاح ✨
          </div>
        );
      default:
        return null;
    }
  };

  const isAnySubModalOpen = stageModal.isOpen || isReturnModalOpen;

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
              <button
                type="button"
                onClick={() => openFormForStage(stage)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                title="تعديل بيانات المرحلة الحالية"
              >
                <Edit3 size={16} />
              </button>
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
                      onClick={() => {
                        if (isCurrent || isFuture) {
                          openFormForStage(s.id);
                        } else if (isPast && booking?.id) {
                          handleRevertTo(s.id, s.label);
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
                <h4 className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-500" /> {stage === 'visit' ? 'فساتين مطلوب تجربتها بالزيارة' : 'الفساتين المحجوزة'}
                </h4>
                <div className="space-y-1.5">
                  {dresses.map((d, idx) => (
                    <div key={d.id || idx} className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl shadow-2xs">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                        {d.image_path ? (
                          <img src={getStorageUrl(d.image_path)} alt={d.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300"><Sparkles size={16} /></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-slate-800 truncate">{d.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold">{d.code ? `كود: ${d.code}` : ''} {d.size ? `مقاس: ${d.size}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event & Scheduled Dates */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-indigo-700 flex items-center gap-1"><Calendar size={11} /> تاريخ المناسبة</div>
                <div className="text-xs font-black text-slate-800 mt-0.5">{formatDate(weddingDate)}</div>
              </div>
              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-amber-700 flex items-center gap-1"><Clock size={11} /> {stage === 'visit' ? 'موعد الزيارة' : 'تاريخ الحجز'}</div>
                <div className="text-xs font-black text-slate-800 mt-0.5">
                  {stage === 'visit' ? (bride.latest_visit_date || formatDate(booking?.booking_date)) : formatDate(booking?.booking_date)}
                </div>
              </div>
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-blue-700 flex items-center gap-1"><Package size={11} /> تاريخ الاستلام</div>
                <div className="text-xs font-black text-slate-800 mt-0.5">{formatDate(pickupDate)}</div>
              </div>
              <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-purple-700 flex items-center gap-1"><RotateCcw size={11} /> تاريخ الإرجاع</div>
                <div className="text-xs font-black text-slate-800 mt-0.5">{formatDate(returnDate)}</div>
              </div>
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
                {remaining > 0 && (
                  <button
                    onClick={() => openFormForStage('picked_up')}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                  >
                    <CreditCard size={12} /> سداد المتبقي
                  </button>
                )}
              </div>
            )}

            {/* Trying fee card if in visit stage */}
            {stage === 'visit' && parseFloat(bride.latest_dress_trying_fee || 0) > 0 && (
              <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                <span className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Banknote size={14} className="text-purple-600" /> رسوم تجربة الفساتين المقترحة:
                </span>
                <span className="font-black text-purple-700 font-mono">
                  {parseFloat(bride.latest_dress_trying_fee).toLocaleString()} ج.م
                </span>
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
          onSuccess={async () => {
            setStageModal({ isOpen: false, stage: null });
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
