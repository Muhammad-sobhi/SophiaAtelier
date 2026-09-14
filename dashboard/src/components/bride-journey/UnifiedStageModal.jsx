import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { MultiPaymentMethodInput } from '@/components/MultiPaymentMethodInput';
import { cleanDate } from '@/lib/utils';
import {
  X, Heart, Calendar, Ruler, Package, RotateCcw,
  Search, CheckCircle2, AlertTriangle, User, CreditCard
} from 'lucide-react';

export const getDressConflict = (dress, targetDate, currentClientId = null, targetCity = 'القاهرة') => {
  if (!dress || !targetDate) return null;
  const bookings = [
    ...(Array.isArray(dress.bookings) ? dress.bookings : []),
    ...(Array.isArray(dress.secondBookings) ? dress.secondBookings : []),
  ];
  if (bookings.length === 0) return null;

  const cleanTargetDateStr = String(targetDate).split('T')[0].split(' ')[0];
  const targetTime = new Date(`${cleanTargetDateStr}T00:00:00`).getTime();
  if (isNaN(targetTime)) return null;

  const isTargetCairo = !targetCity ||
    targetCity.includes('القاهرة') ||
    targetCity.includes('الجيزة') ||
    targetCity.toLowerCase().includes('cairo') ||
    targetCity.toLowerCase().includes('giza');

  const targetDaysBefore = isTargetCairo ? 2 : 3;
  const targetDaysAfter = 1;

  const targetStart = targetTime - (targetDaysBefore * 24 * 60 * 60 * 1000);
  const targetEnd = targetTime + (targetDaysAfter * 24 * 60 * 60 * 1000);

  for (const b of bookings) {
    if (b.status === 'cancelled') continue;
    if (currentClientId && (String(b.client_id) === String(currentClientId) || String(b.client?.id) === String(currentClientId))) continue;
    if (!b.event_date) continue;

    const bCity = b.client?.city || 'القاهرة';
    const isBCairo = !bCity ||
      bCity.includes('القاهرة') ||
      bCity.includes('الجيزة') ||
      bCity.toLowerCase().includes('cairo') ||
      bCity.toLowerCase().includes('giza');

    let bStart, bEnd, bStartDateStr, bEndDateStr;

    if (b.pickup_scheduled_on && b.return_scheduled_on) {
      const pStr = String(b.pickup_scheduled_on).split('T')[0].split(' ')[0];
      const rStr = String(b.return_scheduled_on).split('T')[0].split(' ')[0];
      bStart = new Date(`${pStr}T00:00:00`).getTime();
      bEnd = new Date(`${rStr}T23:59:59`).getTime();
      bStartDateStr = pStr;
      bEndDateStr = rStr;
    } else {
      const bDateStr = String(b.event_date).split('T')[0].split(' ')[0];
      const bTime = new Date(`${bDateStr}T00:00:00`).getTime();
      const bDaysBefore = isBCairo ? 2 : 3;
      const bDaysAfter = 1;
      bStart = bTime - (bDaysBefore * 24 * 60 * 60 * 1000);
      bEnd = bTime + (bDaysAfter * 24 * 60 * 60 * 1000);

      const dStart = new Date(bStart);
      const dEnd = new Date(bEnd);
      bStartDateStr = dStart.toISOString().split('T')[0];
      bEndDateStr = dEnd.toISOString().split('T')[0];
    }

    if (targetStart <= bEnd && targetEnd >= bStart) {
      const conflictingEventDate = String(b.event_date).split('T')[0].split(' ')[0];
      return {
        bookingId: b.id,
        status: b.status,
        clientName: b.client?.name || 'عروس أخرى',
        clientPhone: b.client?.phone || '',
        clientCity: b.client?.city || 'القاهرة',
        salesName: b.sales_name || '',
        eventDate: conflictingEventDate,
        startDate: bStartDateStr,
        endDate: bEndDateStr,
        daysBefore: isBCairo ? 2 : 3,
        daysAfter: 1,
        dressName: dress.name,
        dressCode: dress.code,
      };
    }
  }

  return null;
};

const STAGES = [
  { id: 'visit', label: 'زيارة', icon: Calendar, color: 'text-indigo-600' },
  { id: 'booking', label: 'حجز', icon: Heart, color: 'text-rose-600' },
  { id: 'fitting', label: 'بروفة', icon: Ruler, color: 'text-indigo-600' },
  { id: 'picked_up', label: 'استلام', icon: Package, color: 'text-blue-600' },
  { id: 'returned', label: 'إرجاع', icon: RotateCcw, color: 'text-emerald-600' },
];

export function UnifiedStageModal({
  isOpen,
  onClose,
  bride,
  stage: propStage,
  onSuccess,
  dressesList: propDressesList,
  employeesList: propEmployeesList,
}) {
  if (!isOpen || !bride) return null;

  const currentStage = bride.current_stage || bride.stage || 'visit';
  const stage = propStage || currentStage;
  const booking = bride.bookings?.[0];

  // Lists
  const [dressesList, setDressesList] = useState(propDressesList || []);
  const [employeesList, setEmployeesList] = useState(propEmployeesList || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common Client Fields
  const [name, setName] = useState(bride.name || '');
  const [phone, setPhone] = useState(bride.phone || '');
  const [phone2, setPhone2] = useState(bride.phone2 || '');
  const [city, setCity] = useState(bride.city || 'القاهرة');
  const [source, setSource] = useState(bride.source || 'instagram');
  const [weddingDate, setWeddingDate] = useState(cleanDate(bride.wedding_date || booking?.event_date || ''));
  const [notes, setNotes] = useState(booking?.notes || bride.notes || '');

  // Booking Stage Fields
  const [salesName, setSalesName] = useState(booking?.sales_name || bride.sales_name || '');
  const [bookingDressId, setBookingDressId] = useState(booking?.dress_id ? String(booking.dress_id) : '');
  const [bookingDressSearch, setBookingDressSearch] = useState('');
  const [bookingHasSecondDress, setBookingHasSecondDress] = useState(Boolean(booking?.dress_2_id));
  const [bookingDress2Id, setBookingDress2Id] = useState(booking?.dress_2_id ? String(booking.dress_2_id) : '');
  const [bookingDress2Search, setBookingDress2Search] = useState('');
  const [bookingDress1Details, setBookingDress1Details] = useState(null);
  const [bookingDress2Details, setBookingDress2Details] = useState(null);
  const [bookingEventDate, setBookingEventDate] = useState(cleanDate(booking?.event_date || bride.wedding_date || new Date().toISOString()));
  const [bookingTotalAmount, setBookingTotalAmount] = useState(booking?.total_amount ? String(booking.total_amount) : '3500');
  const [bookingDepositAmount, setBookingDepositAmount] = useState(booking?.deposit_amount ? String(booking.deposit_amount) : '1000');
  const [bookingInsuranceAmount, setBookingInsuranceAmount] = useState(booking?.insurance_amount ? String(booking.insurance_amount) : '5000');
  const [bookingPayments, setBookingPayments] = useState(
    booking?.revenues?.filter(r => r.type === 'deposit')?.length
      ? booking.revenues.filter(r => r.type === 'deposit').map(r => ({ amount: String(r.amount), payment_method: r.payment_method || 'cash' }))
      : [{ amount: booking?.deposit_amount ? String(booking.deposit_amount) : '1000', payment_method: booking?.payment_method || 'cash' }]
  );

  // Visit Stage Fields
  const [visitDate, setVisitDate] = useState(cleanDate(bride.latest_visit_date || bride.visits?.[0]?.visit_date || new Date().toISOString()));
  const [visitTime, setVisitTime] = useState(bride.latest_visit_time || bride.visits?.[0]?.time_slot || '02:00 م');
  const [visitSalesName, setVisitSalesName] = useState(bride.visits?.[0]?.sales_name || bride.sales_name || salesName || '');
  const [tryingFee, setTryingFee] = useState(bride.latest_dress_trying_fee ? String(bride.latest_dress_trying_fee) : '0');
  const [visitPaymentMethod, setVisitPaymentMethod] = useState('cash');

  // Fitting Stage Fields
  const latestFitting = bride.fittings?.[0];
  const [fittingDate, setFittingDate] = useState(cleanDate(latestFitting?.fitting_date || new Date().toISOString()));
  const [fittingTime, setFittingTime] = useState(latestFitting?.fitting_time || '02:00 م');
  const [fittingSalesName, setFittingSalesName] = useState(latestFitting?.sales_name || latestFitting?.sales_associate || salesName || '');
  const [fittingDressId, setFittingDressId] = useState(booking?.dress_id ? String(booking.dress_id) : (bookingDressId || ''));
  const [fittingDressSearch, setFittingDressSearch] = useState('');
  const [alterationNotes, setAlterationNotes] = useState(latestFitting?.alteration_notes || latestFitting?.additional_notes || '');

  // Pickup Stage Fields
  const existingBalances = (booking?.revenues || []).filter(r => r.type === 'balance');
  const existingInsurances = (booking?.revenues || []).filter(r => r.type === 'insurance');
  const existingDeposits = (booking?.revenues || []).filter(r => r.type === 'deposit');
  const initialDepositPaid = existingDeposits.length > 0
    ? existingDeposits.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)
    : parseFloat(booking?.deposit_amount || 0);

  const [pickupTotalAmount, setPickupTotalAmount] = useState(booking?.total_amount ? String(booking.total_amount) : '0');
  const [pickupDepositAmount, setPickupDepositAmount] = useState(String(initialDepositPaid));
  const [pickupDepositPayments, setPickupDepositPayments] = useState(
    existingDeposits.length > 0
      ? existingDeposits.map(r => ({ amount: String(r.amount), payment_method: r.payment_method || 'cash' }))
      : [{ amount: String(initialDepositPaid), payment_method: booking?.payment_method || 'cash' }]
  );
  const [showEditDepositInPickup, setShowEditDepositInPickup] = useState(false);

  const currentDepositPaid = parseFloat(pickupDepositAmount || 0);
  const remainingForPickup = Math.max(0, parseFloat(pickupTotalAmount || 0) - currentDepositPaid);

  const [pickupDate, setPickupDate] = useState(cleanDate(booking?.pickup_date || new Date().toISOString()));
  const [pickupSalesName, setPickupSalesName] = useState(booking?.pickup_sales_name || salesName || '');
  const [balancePayments, setBalancePayments] = useState(
    existingBalances.length > 0
      ? existingBalances.map(r => ({ amount: String(r.amount), payment_method: r.payment_method || 'cash' }))
      : [{ amount: String(remainingForPickup), payment_method: 'cash' }]
  );
  const [insurancePayments, setInsurancePayments] = useState(
    existingInsurances.length > 0
      ? existingInsurances.map(r => ({ amount: String(r.amount), payment_method: r.payment_method || 'cash' }))
      : [{ amount: String(booking?.insurance_amount || 5000), payment_method: 'cash' }]
  );

  // Return Stage Fields
  const [returnInsuranceAmount, setReturnInsuranceAmount] = useState(booking?.insurance_amount ? String(booking.insurance_amount) : '5000');
  const totalHeldInsurance = parseFloat(returnInsuranceAmount || 5000);
  const [returnDate, setReturnDate] = useState(cleanDate(booking?.return_date || new Date().toISOString()));
  const [returnSalesName, setReturnSalesName] = useState(booking?.return_sales_name || salesName || '');
  const [returnRefundMode, setReturnRefundMode] = useState('full');
  const [damageDeduction, setDamageDeduction] = useState('0');
  const [damageNotes, setDamageNotes] = useState('');
  const [insuranceRefundMethod, setInsuranceRefundMethod] = useState('cash');

  // Load dresses with active bookings and employees
  useEffect(() => {
    apiClient.get('/dresses?per_page=1000&with_bookings=1')
      .then((res) => {
        const list = res.data || res || [];
        const arr = Array.isArray(list) ? list : [];
        if (arr.length > 0) {
          setDressesList(arr);
        }
        setFittingDressId((prev) => prev || (booking?.dress_id ? String(booking.dress_id) : (arr[0]?.id ? String(arr[0].id) : '')));
        setBookingDressId((prev) => prev || (booking?.dress_id ? String(booking.dress_id) : (arr[0]?.id ? String(arr[0].id) : '')));
      })
      .catch(() => { });

    if (!propEmployeesList || propEmployeesList.length === 0) {
      apiClient.get('/employees')
        .then((res) => {
          const list = res.data || res || [];
          setEmployeesList(Array.isArray(list) ? list : []);
        })
        .catch(() => { });
    }
  }, []);

  // Fetch Dress Details for Conflict Checking & complete info
  useEffect(() => {
    if (bookingDressId) {
      apiClient.get(`/dresses/${bookingDressId}`).then((res) => {
        setBookingDress1Details(res.data || res || null);
      }).catch(() => setBookingDress1Details(null));
    } else {
      setBookingDress1Details(null);
    }
  }, [bookingDressId]);

  useEffect(() => {
    if (bookingHasSecondDress && bookingDress2Id) {
      apiClient.get(`/dresses/${bookingDress2Id}`).then((res) => {
        setBookingDress2Details(res.data || res || null);
      }).catch(() => setBookingDress2Details(null));
    } else {
      setBookingDress2Details(null);
    }
  }, [bookingHasSecondDress, bookingDress2Id]);

  // Selected dress objects with active bookings
  const dress1SelectedObj = bookingDress1Details || dressesList.find(d => String(d.id) === String(bookingDressId));
  const dress2SelectedObj = bookingDress2Details || dressesList.find(d => String(d.id) === String(bookingDress2Id));

  // Compute full conflict details for Dress 1 and Dress 2
  const dress1Conflict = useMemo(() => {
    return getDressConflict(dress1SelectedObj, bookingEventDate, bride?.id, city);
  }, [dress1SelectedObj, bookingEventDate, bride?.id, city]);

  const dress2Conflict = useMemo(() => {
    if (!bookingHasSecondDress || !bookingDress2Id) return null;
    return getDressConflict(dress2SelectedObj, bookingEventDate, bride?.id, city);
  }, [bookingHasSecondDress, bookingDress2Id, dress2SelectedObj, bookingEventDate, bride?.id, city]);

  const isBookingDateBlocked = Boolean(dress1Conflict);
  const isBookingDate2Blocked = Boolean(dress2Conflict);

  // Selection helpers
  const handleSelectDress1 = (dress) => {
    setBookingDressId(String(dress.id));
    const p1 = parseFloat(dress.rental_price || 0);
    const d2 = bookingHasSecondDress ? dressesList.find(x => String(x.id) === bookingDress2Id) : null;
    const p2 = parseFloat(d2?.rental_price || 0);
    setBookingTotalAmount(String(p1 + p2));
  };

  const handleSelectDress2 = (dress) => {
    setBookingDress2Id(String(dress.id));
    const d1 = dressesList.find(x => String(x.id) === bookingDressId);
    const p1 = parseFloat(d1?.rental_price || 0);
    const p2 = parseFloat(dress.rental_price || 0);
    setBookingTotalAmount(String(p1 + p2));
  };

  // Revert stage handler
  const handleRevertStage = async () => {
    const stageFlow = ['visit', 'booking', 'fitting', 'picked_up', 'returned'];
    const idx = stageFlow.indexOf(currentStage);
    if (idx <= 0) {
      toast.warning('العروس في أول مرحلة بالفعل');
      return;
    }
    const prevStage = stageFlow[idx - 1];
    const prevLabel = STAGES.find(s => s.id === prevStage)?.label || prevStage;

    if (!window.confirm(`هل أنت متأكد من العودة بالعروس إلى مرحلة: (${prevLabel})؟`)) return;

    try {
      setIsSubmitting(true);
      await apiClient.put(`/clients/${bride.id}/stage-action`, {
        action: 'revert_stage',
        target_stage: prevStage,
      });
      toast.success(`تمت العودة إلى مرحلة: ${prevLabel}`);
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل التراجع عن المرحلة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Net refund amount
  const calculatedDeduction = returnRefundMode === 'deduction' ? Math.min(totalHeldInsurance, Math.max(0, parseFloat(damageDeduction || 0))) : 0;
  const netRefundAmount = Math.max(0, totalHeldInsurance - calculatedDeduction);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (stage === 'visit') {
        await apiClient.put(`/clients/${bride.id}`, {
          name: name.trim(),
          phone: phone.trim(),
          phone2: phone2.trim() || null,
          city: city.trim(),
          source: source,
          wedding_date: weddingDate || null,
          notes: notes.trim() || null,
        });

        if (visitDate) {
          await apiClient.put(`/clients/${bride.id}/stage-action`, {
            action: 'confirm_visit',
            visit_date: visitDate,
            visit_time: visitTime,
            sales_name: visitSalesName.trim() || null,
            trying_fee: parseFloat(tryingFee || 0),
            payment_method: visitPaymentMethod,
          });
        }
      } else if (stage === 'booking') {
        const validPayments = bookingPayments.filter(p => parseFloat(p.amount) > 0);
        const totalDepositCalculated = validPayments.length > 0
          ? validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
          : parseFloat(bookingDepositAmount || '0');

        await apiClient.put(`/clients/${bride.id}/stage-action`, {
          action: 'confirm_booking',
          phone: phone.trim(),
          phone2: phone2.trim() || null,
          dress_id: parseInt(bookingDressId),
          dress_2_id: bookingHasSecondDress && bookingDress2Id ? parseInt(bookingDress2Id) : null,
          sales_name: salesName.trim() || null,
          force_override: true,
          event_date: bookingEventDate || weddingDate,
          total_amount: parseFloat(bookingTotalAmount || 0),
          deposit_amount: totalDepositCalculated,
          insurance_amount: parseFloat(bookingInsuranceAmount || '5000'),
          payment_method: validPayments.length === 1 ? validPayments[0].payment_method : (validPayments.length > 1 ? 'multiple' : 'cash'),
          payments: validPayments,
          notes: notes.trim() || null,
        });
      } else if (stage === 'fitting') {
        const resolvedFittingDressId = fittingDressId
          ? parseInt(fittingDressId)
          : (booking?.dress_id ? parseInt(booking.dress_id) : (dressesList[0]?.id ? parseInt(dressesList[0].id) : null));

        await apiClient.put(`/clients/${bride.id}/stage-action`, {
          action: 'schedule_fitting',
          fitting_date: fittingDate,
          fitting_time: fittingTime,
          dress_id: resolvedFittingDressId,
          notes: alterationNotes || notes,
          sales_name: fittingSalesName.trim() || null,
        });

        // Also sync booking financial updates if booking exists
        if (booking) {
          const validPayments = bookingPayments.filter(p => parseFloat(p.amount) > 0);
          const calculatedDeposit = validPayments.length > 0
            ? validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
            : parseFloat(bookingDepositAmount || 0);

          await apiClient.put(`/bookings/${booking.id}`, {
            total_amount: parseFloat(bookingTotalAmount || 0),
            deposit_amount: calculatedDeposit,
            insurance_amount: parseFloat(bookingInsuranceAmount || 5000),
            deposit_payments: validPayments.length > 0 ? validPayments : [
              { amount: calculatedDeposit.toString(), payment_method: 'cash' }
            ],
            force_override: true,
            event_date: bookingEventDate || weddingDate || booking.event_date,
          });
        }
      } else if (stage === 'picked_up') {
        const totalInsuranceEntered = insurancePayments
          .filter(p => parseFloat(p.amount) > 0)
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        await apiClient.put(`/clients/${bride.id}/stage-action`, {
          action: 'mark_picked_up',
          pickup_date: pickupDate,
          sales_name: pickupSalesName.trim() || null,
          total_amount: parseFloat(pickupTotalAmount || booking?.total_amount || 0),
          deposit_amount: parseFloat(pickupDepositAmount || 0),
          deposit_payments: pickupDepositPayments.filter(p => parseFloat(p.amount) > 0),
          balance_payments: balancePayments.filter(p => parseFloat(p.amount) > 0),
          insurance_payments: insurancePayments.filter(p => parseFloat(p.amount) > 0),
          insurance_amount: totalInsuranceEntered > 0 ? totalInsuranceEntered : parseFloat(booking?.insurance_amount || 5000),
        });
      } else if (stage === 'returned') {
        await apiClient.put(`/clients/${bride.id}/stage-action`, {
          action: 'mark_returned',
          return_date: returnDate,
          sales_name: returnSalesName.trim() || null,
          insurance_amount: totalHeldInsurance,
          damage_deduction: calculatedDeduction,
          insurance_refund: netRefundAmount,
          insurance_refund_method: insuranceRefundMethod,
          damage_notes: damageNotes.trim() || null,
          notes: notes.trim() || null,
        });
      }

      onClose();
      toast.success('تم حفظ بيانات المرحلة بنجاح ✨');
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStageHeader = () => {
    switch (stage) {
      case 'visit':
        return {
          title: `تعديل بيانات زيارة العروس (${bride.name})`,
          icon: <Calendar size={14} className="text-indigo-600 animate-pulse" />,
        };
      case 'booking':
        return {
          title: `تأكيد حجز فستان للعروس (${bride.name})`,
          icon: <Heart size={14} className="text-rose-600 animate-pulse" />,
        };
      case 'fitting':
        return {
          title: `تعديل موعد وتفاصيل بروفة العروس (${bride.name})`,
          icon: <Ruler size={14} className="text-indigo-600 animate-pulse" />,
        };
      case 'picked_up':
        return {
          title: `تعديل بيانات استلام الفستان للعروس (${bride.name})`,
          icon: <Package size={14} className="text-blue-600 animate-pulse" />,
        };
      case 'returned':
        return {
          title: `تعديل بيانات إرجاع الفستان والتأمين (${bride.name})`,
          icon: <RotateCcw size={14} className="text-emerald-600 animate-pulse" />,
        };
      default:
        return {
          title: `تعديل بيانات العروس (${bride.name})`,
          icon: <User size={14} className="text-slate-600" />,
        };
    }
  };

  const headerInfo = getStageHeader();
  const currentIndex = STAGES.findIndex(s => s.id === currentStage);
  const canRevert = currentIndex > 0;

  // Active sales state & setter helper
  const currentSalesValue = stage === 'visit' ? visitSalesName : (stage === 'fitting' ? fittingSalesName : (stage === 'picked_up' ? pickupSalesName : (stage === 'returned' ? returnSalesName : salesName)));
  const setCurrentSalesValue = (val) => {
    if (stage === 'visit') setVisitSalesName(val);
    else if (stage === 'fitting') setFittingSalesName(val);
    else if (stage === 'picked_up') setPickupSalesName(val);
    else if (stage === 'returned') setReturnSalesName(val);
    else setSalesName(val);
  };

  const modalContent = (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[99995] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg border border-slate-100 shadow-[0_25px_60px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col max-h-[min(92vh,720px)] my-auto animate-in fade-in duration-150">

        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-3.5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
            {headerInfo.icon}
            <span>{headerInfo.title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1 min-h-0 text-right scrollbar-thin">

            {/* Sales Person Selection (Screenshot 1 Style) */}
            <div className="space-y-1 bg-amber-50/40 p-2.5 rounded-2xl border border-amber-150/70">
              <label className="text-[10px] font-extrabold text-amber-900 block text-right flex items-center justify-between">
                <span>مسؤول المبيعات / السيلز (Sales Person)</span>
                <span className="text-[8.5px] font-normal text-amber-700">(اختياري)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <select
                  value={employeesList.some(e => e.name === currentSalesValue) ? currentSalesValue : (currentSalesValue ? '__custom__' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '__custom__') {
                      setCurrentSalesValue(val);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right"
                >
                  <option value="">-- اختر موظف المبيعات --</option>
                  {employeesList.map((emp) => (
                    <option key={emp.id} value={emp.name}>{emp.name} {emp.role ? `(${emp.role})` : ''}</option>
                  ))}
                  <option value="__custom__">✍️ كتابة اسم آخر...</option>
                </select>
                {(!employeesList.some(e => e.name === currentSalesValue) || currentSalesValue === '') && (
                  <input
                    type="text"
                    placeholder="أو اكتب اسم السيلز..."
                    value={currentSalesValue}
                    onChange={(e) => setCurrentSalesValue(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right"
                  />
                )}
              </div>
            </div>

            {/* STAGE: BOOKING (Screenshot 1 Style) */}
            {stage === 'booking' && (
              <>
                {/* Wedding / Event Date & Live Availability Legend */}
                <div className="bg-rose-50/40 p-2.5 sm:p-3 rounded-2xl border border-rose-200/70 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div>
                      <label className="text-xs font-black text-rose-950 block text-right">
                        📅 تاريخ الفرح / المناسبة (محدد التوفر):
                      </label>
                      <span className="text-[10px] font-semibold text-slate-500 block text-right">
                        يتم فحص حالة توفر الفساتين وتعارض الحجوزات تلقائياً بناءً على هذا التاريخ
                      </span>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-3 bg-white px-2.5 py-1 rounded-xl border border-rose-150 text-[10px] font-black text-slate-700 self-start sm:self-auto shadow-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 inline-block" />
                        <span className="text-emerald-800">متاح</span>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200 animate-pulse inline-block" />
                        <span className="text-rose-800">محجوز / تعارض</span>
                      </span>
                    </div>
                  </div>

                  <input
                    type="date"
                    required
                    value={cleanDate(bookingEventDate)}
                    onChange={(e) => setBookingEventDate(cleanDate(e.target.value))}
                    className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none text-right transition-colors ${(isBookingDateBlocked || isBookingDate2Blocked)
                        ? 'border-rose-300 bg-rose-50/60 text-rose-900 ring-2 ring-rose-200/50'
                        : 'bg-white border-slate-200 focus:border-rose-500'
                      }`}
                  />
                </div>

                {/* Dress 1 Selection with Fast Search & Pills */}
                <div className="space-y-1.5 bg-rose-50/20 p-2.5 rounded-2xl border border-rose-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-rose-900 block text-right">👗 الفستان الأساسي (الفستان 1)</label>
                    <span className="text-[9.5px] font-bold text-slate-500">
                      🟢 متاح | 🔴 محجوز
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 بحث سريع عن الفستان بالاسم أو الكود..."
                      value={bookingDressSearch}
                      onChange={(e) => setBookingDressSearch(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-right"
                    />
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    {bookingDressSearch && (
                      <button
                        type="button"
                        onClick={() => setBookingDressSearch('')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  {/* Filtered dress buttons / selection pills with status circles */}
                  <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-100 max-h-24 sm:max-h-28 overflow-y-auto scrollbar-thin">
                    {dressesList
                      .filter((d) => {
                        if (!bookingDressSearch.trim()) return true;
                        const q = bookingDressSearch.toLowerCase().trim();
                        return (
                          d.name?.toLowerCase().includes(q) ||
                          d.code?.toLowerCase().includes(q)
                        );
                      })
                      .map((d) => {
                        const isSelected = bookingDressId === String(d.id);
                        const conflict = bookingEventDate ? getDressConflict(d, bookingEventDate, bride?.id, city) : null;
                        const isBlocked = Boolean(conflict);

                        return (
                          <button
                            type="button"
                            key={d.id}
                            onClick={() => handleSelectDress1(d)}
                            title={isBlocked ? `⚠️ محجوز للعروس: ${conflict.clientName} (المناسبة: ${conflict.eventDate})` : '🟢 متاح في تاريخ المناسبة'}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer border ${isSelected
                                ? 'bg-rose-600 border-rose-600 text-white shadow-xs font-black'
                                : isBlocked
                                  ? 'bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100/80'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-rose-50'
                              }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${isBlocked
                                  ? isSelected ? 'bg-white ring-2 ring-rose-300 animate-pulse' : 'bg-rose-500 ring-2 ring-rose-200 animate-pulse'
                                  : isSelected ? 'bg-white' : 'bg-emerald-500'
                                }`}
                            />
                            <span>{d.name} {d.code ? `(${d.code})` : ''}</span>
                          </button>
                        );
                      })}
                  </div>

                  {/* Currently selected dress indicator */}
                  {(() => {
                    const activeDress = dressesList.find((d) => String(d.id) === bookingDressId);
                    if (!activeDress) return null;
                    return (
                      <div className="text-[10px] font-extrabold text-rose-700 bg-rose-50/70 border border-rose-100 px-2.5 py-1 rounded-lg flex items-center justify-between">
                        <span>الفستان 1 المختار: <strong className="font-black">{activeDress.name}</strong></span>
                        <span className="font-mono text-[9.5px] text-rose-800">السعر: {parseFloat(activeDress.rental_price || 0).toLocaleString()} ج.م</span>
                      </div>
                    );
                  })()}

                  {/* Rich Conflict Detail Card for Dress 1 */}
                  {dress1Conflict && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-right">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-rose-800 font-black text-xs">
                          <AlertTriangle size={15} className="text-rose-600 animate-bounce" />
                          <span>⚠️ تفاصيل تعارض حجز الفستان الأول مع عروس أخرى</span>
                        </div>
                        <span className="text-[10px] bg-rose-200/80 text-rose-900 font-extrabold px-2 py-0.5 rounded-md">
                          حجز #{dress1Conflict.bookingId} ({dress1Conflict.status === 'confirmed' ? 'حجز مؤكد' : dress1Conflict.status})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white/90 p-2.5 rounded-xl border border-rose-100">
                        <div className="space-y-1">
                          <div className="text-slate-600">
                            👰 <span className="font-bold text-slate-800">العروس الحاجزة:</span>{' '}
                            <span className="font-black text-rose-700">{dress1Conflict.clientName}</span>
                          </div>
                          {dress1Conflict.clientPhone && (
                            <div className="text-slate-600">
                              📞 <span className="font-bold text-slate-800">الهاتف:</span>{' '}
                              <a href={`tel:${dress1Conflict.clientPhone}`} className="font-mono font-bold text-indigo-600 hover:underline">
                                {dress1Conflict.clientPhone}
                              </a>
                            </div>
                          )}
                          <div className="text-slate-600">
                            📍 <span className="font-bold text-slate-800">المدينة:</span> {dress1Conflict.clientCity}
                          </div>
                          {dress1Conflict.salesName && (
                            <div className="text-slate-600">
                              ✍️ <span className="font-bold text-slate-800">مسؤول المبيعات:</span> {dress1Conflict.salesName}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="text-slate-600">
                            📅 <span className="font-bold text-slate-800">تاريخ مناسبة العروس:</span>{' '}
                            <span className="font-black text-slate-900 font-mono bg-amber-100 px-1.5 py-0.5 rounded text-[10.5px]">
                              {dress1Conflict.eventDate}
                            </span>
                          </div>
                          <div className="text-slate-600">
                            ⏳ <span className="font-bold text-slate-800">فترة حظر الفستان:</span>{' '}
                            <span className="font-bold text-rose-800 font-mono text-[10px]">
                              من {dress1Conflict.startDate} إلى {dress1Conflict.endDate}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            ℹ️ تشمل {dress1Conflict.daysBefore} أيام تجهيز قبل المناسبة + {dress1Conflict.daysAfter} يوم بعد المناسبة
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] font-bold text-rose-700 bg-rose-100/60 px-2.5 py-1 rounded-lg">
                        💡 الفستان محجوز في هذه الفترة. يمكنك المتابعة وتأكيد الحجز بتجاوز التعارض (استثناء إداري) إذا تم التنسيق مع الإدارة.
                      </div>
                    </div>
                  )}
                </div>

                {/* Second Dress Toggle & Selection */}
                <div className="bg-purple-50/30 p-2.5 rounded-2xl border border-purple-100 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                      <span>✨ حجز فستان ثانٍ إضافي لنفس العروس (2 Dresses)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={bookingHasSecondDress}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setBookingHasSecondDress(checked);
                        const d1 = dressesList.find(d => String(d.id) === bookingDressId);
                        const d2 = dressesList.find(d => String(d.id) === bookingDress2Id);
                        const p1 = parseFloat(d1?.rental_price || 0);
                        const p2 = checked && d2 ? parseFloat(d2?.rental_price || 0) : 0;
                        setBookingTotalAmount(String(p1 + p2));
                        setBookingInsuranceAmount(checked ? '10000' : '5000');
                      }}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                    />
                  </label>

                  {bookingHasSecondDress && (
                    <div className="space-y-1.5 pt-1 border-t border-purple-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-purple-900 block text-right">فستان ثانٍ</span>
                        <span className="text-[9.5px] font-bold text-slate-500">
                          🟢 متاح | 🔴 محجوز
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          placeholder="🔍 بحث سريع عن الفستان الثاني..."
                          value={bookingDress2Search}
                          onChange={(e) => setBookingDress2Search(e.target.value)}
                          className="w-full pl-8 pr-7 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-right"
                        />
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      </div>

                      <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-purple-100 max-h-24 overflow-y-auto scrollbar-thin">
                        {dressesList
                          .filter((d) => String(d.id) !== bookingDressId)
                          .filter((d) => {
                            if (!bookingDress2Search.trim()) return true;
                            const q = bookingDress2Search.toLowerCase().trim();
                            return d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q);
                          })
                          .map((d) => {
                            const isSelected = bookingDress2Id === String(d.id);
                            const conflict = bookingEventDate ? getDressConflict(d, bookingEventDate, bride?.id, city) : null;
                            const isBlocked = Boolean(conflict);

                            return (
                              <button
                                type="button"
                                key={d.id}
                                onClick={() => handleSelectDress2(d)}
                                title={isBlocked ? `⚠️ محجوز للعروس: ${conflict.clientName} (المناسبة: ${conflict.eventDate})` : '🟢 متاح في تاريخ المناسبة'}
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer border ${isSelected
                                    ? 'bg-purple-600 border-purple-600 text-white font-black'
                                    : isBlocked
                                      ? 'bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100/80'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-purple-50'
                                  }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${isBlocked
                                      ? isSelected ? 'bg-white ring-2 ring-rose-300 animate-pulse' : 'bg-rose-500 ring-2 ring-rose-200 animate-pulse'
                                      : isSelected ? 'bg-white' : 'bg-emerald-500'
                                    }`}
                                />
                                <span>{d.name} {d.code ? `(${d.code})` : ''} - {d.rental_price} ج.م</span>
                              </button>
                            );
                          })}
                      </div>

                      {bookingDress2Id && (() => {
                        const activeDress2 = dressesList.find((d) => String(d.id) === bookingDress2Id);
                        if (!activeDress2) return null;
                        return (
                          <div className="text-[10px] font-extrabold text-purple-800 bg-purple-100/60 border border-purple-200 px-2.5 py-1 rounded-lg flex items-center justify-between">
                            <span>الفستان 2 المختار: <strong className="font-black">{activeDress2.name}</strong></span>
                            <span className="font-mono text-[9.5px]">السعر: {parseFloat(activeDress2.rental_price || 0).toLocaleString()} ج.م</span>
                          </div>
                        );
                      })()}

                      {/* Rich Conflict Detail Card for Dress 2 */}
                      {dress2Conflict && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-right">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-rose-800 font-black text-xs">
                              <AlertTriangle size={15} className="text-rose-600 animate-bounce" />
                              <span>⚠️ تفاصيل تعارض حجز الفستان الثاني مع عروس أخرى</span>
                            </div>
                            <span className="text-[10px] bg-rose-200/80 text-rose-900 font-extrabold px-2 py-0.5 rounded-md">
                              حجز #{dress2Conflict.bookingId} ({dress2Conflict.status === 'confirmed' ? 'حجز مؤكد' : dress2Conflict.status})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white/90 p-2.5 rounded-xl border border-rose-100">
                            <div className="space-y-1">
                              <div className="text-slate-600">
                                👰 <span className="font-bold text-slate-800">العروس الحاجزة:</span>{' '}
                                <span className="font-black text-rose-700">{dress2Conflict.clientName}</span>
                              </div>
                              {dress2Conflict.clientPhone && (
                                <div className="text-slate-600">
                                  📞 <span className="font-bold text-slate-800">الهاتف:</span>{' '}
                                  <a href={`tel:${dress2Conflict.clientPhone}`} className="font-mono font-bold text-indigo-600 hover:underline">
                                    {dress2Conflict.clientPhone}
                                  </a>
                                </div>
                              )}
                              <div className="text-slate-600">
                                📍 <span className="font-bold text-slate-800">المدينة:</span> {dress2Conflict.clientCity}
                              </div>
                              {dress2Conflict.salesName && (
                                <div className="text-slate-600">
                                  ✍️ <span className="font-bold text-slate-800">مسؤول المبيعات:</span> {dress2Conflict.salesName}
                                </div>
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="text-slate-600">
                                📅 <span className="font-bold text-slate-800">تاريخ مناسبة العروس:</span>{' '}
                                <span className="font-black text-slate-900 font-mono bg-amber-100 px-1.5 py-0.5 rounded text-[10.5px]">
                                  {dress2Conflict.eventDate}
                                </span>
                              </div>
                              <div className="text-slate-600">
                                ⏳ <span className="font-bold text-slate-800">فترة حظر الفستان:</span>{' '}
                                <span className="font-bold text-rose-800 font-mono text-[10px]">
                                  من {dress2Conflict.startDate} إلى {dress2Conflict.endDate}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                ℹ️ تشمل {dress2Conflict.daysBefore} أيام تجهيز قبل المناسبة + {dress2Conflict.daysAfter} يوم بعد المناسبة
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] font-bold text-rose-700 bg-rose-100/60 px-2.5 py-1 rounded-lg">
                            💡 الفستان الثاني محجوز في هذه الفترة. يمكنك المتابعة وتأكيد الحجز بتجاوز التعارض (استثناء إداري) إذا تم التنسيق مع الإدارة.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bride Phone Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block text-right">رقم هاتف العروس (واتساب)</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="مثال: 01012345678"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block text-right">رقم هاتف إضافي (اختياري)</label>
                    <input
                      type="tel"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      placeholder="رقم آخر / مرافق..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right font-mono"
                    />
                  </div>
                </div>

                {/* Financial Fields */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-extrabold text-slate-500 block text-right">إجمالي الإيجار</label>
                    <input
                      type="number"
                      required
                      value={bookingTotalAmount}
                      onChange={(e) => setBookingTotalAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-extrabold text-slate-500 block text-right">العربون المدفوع</label>
                    <input
                      type="number"
                      required
                      value={bookingDepositAmount}
                      onChange={(e) => setBookingDepositAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-extrabold text-slate-500 block text-right">مبلغ التأمين</label>
                    <input
                      type="number"
                      required
                      value={bookingInsuranceAmount}
                      onChange={(e) => setBookingInsuranceAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right font-mono"
                    />
                  </div>
                </div>

                <MultiPaymentMethodInput
                  payments={bookingPayments}
                  onChange={(updated) => {
                    setBookingPayments(updated);
                    const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                    setBookingDepositAmount(String(total));
                  }}
                  label="سداد وطرق دفع العربون"
                  required
                />
              </>
            )}

            {/* STAGE: VISIT */}
            {stage === 'visit' && (
              <>
                <div className="bg-indigo-50/30 p-3 rounded-2xl border border-indigo-100 space-y-2.5">
                  <span className="text-xs font-black text-indigo-900 block">👰🏻 بيانات العروس</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 block mb-1">اسم العروس</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 block mb-1">رقم الهاتف (واتساب)</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none font-mono text-right"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 block mb-1">رقم هاتف إضافي</label>
                      <input
                        type="tel"
                        value={phone2}
                        onChange={(e) => setPhone2(e.target.value)}
                        placeholder="رقم إضافي..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 block mb-1">المدينة / المحافظة</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">تاريخ الزيارة</label>
                    <input
                      type="date"
                      value={cleanDate(visitDate)}
                      onChange={(e) => setVisitDate(cleanDate(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">الوقت</label>
                    <select
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right"
                    >
                      {["01:00 م", "01:30 م", "02:00 م", "02:30 م", "03:00 م", "03:30 م", "04:00 م", "04:30 م", "05:00 م", "05:30 م", "06:00 م", "06:30 م", "07:00 م", "07:30 م", "08:00 م", "08:30 م"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">رسوم قياس الفساتين (إن وجدت)</label>
                    <input
                      type="number"
                      value={tryingFee}
                      onChange={(e) => setTryingFee(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">تاريخ الفرح التقريبي</label>
                    <input
                      type="date"
                      value={cleanDate(weddingDate)}
                      onChange={(e) => setWeddingDate(cleanDate(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* STAGE: FITTING */}
            {stage === 'fitting' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">رقم هاتف العروس</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">تاريخ الفرح</label>
                    <input
                      type="date"
                      value={cleanDate(weddingDate)}
                      onChange={(e) => setWeddingDate(cleanDate(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">تاريخ البروفة</label>
                    <input
                      type="date"
                      required
                      value={cleanDate(fittingDate)}
                      onChange={(e) => setFittingDate(cleanDate(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">الوقت</label>
                    <select
                      value={fittingTime}
                      onChange={(e) => setFittingTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right"
                    >
                      {["01:00 م", "01:30 م", "02:00 م", "02:30 م", "03:00 م", "03:30 م", "04:00 م", "04:30 م", "05:00 م", "05:30 م", "06:00 م", "06:30 م", "07:00 م", "07:30 م", "08:00 م", "08:30 م"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dress Selection for Fitting - Clean & Uncrowded */}
                <div className="space-y-1.5 bg-indigo-50/30 p-2.5 rounded-2xl border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-indigo-900 block text-right">👗 فستان البروفة المحدد</label>
                    {(() => {
                      const selDress = dressesList.find(d => String(d.id) === String(fittingDressId)) || booking?.dress;
                      if (!selDress) return null;
                      return (
                        <span className="text-[10px] font-black text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded-lg shadow-2xs">
                          {selDress.name} {selDress.code ? `(${selDress.code})` : ''}
                        </span>
                      );
                    })()}
                  </div>
                  <select
                    value={fittingDressId}
                    onChange={(e) => setFittingDressId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-right cursor-pointer"
                  >
                    <option value="">-- اختر فستان البروفة --</option>
                    {dressesList.map((d) => {
                      const targetDate = bride.wedding_date || booking?.event_date;
                      const conflict = targetDate ? getDressConflict(d, targetDate, bride?.id, city) : null;
                      return (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.code ? `(${d.code})` : ''} {conflict ? '🔴 (محجوز)' : '🟢 (متاح)'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Booking Financial Details & Edit (if booking exists) */}
                {booking && (
                  <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200 space-y-2.5 text-right">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <CreditCard size={14} className="text-indigo-600" />
                        <span className="text-xs font-black text-slate-800">بيانات وتعديل الحجز المالي (الإيجار والتأمين)</span>
                      </div>
                      <span className="text-[9.5px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        حجز مؤكد
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-600 block mb-1">إجمالي سعر الإيجار (ج.م)</label>
                        <input
                          type="number"
                          min="0"
                          value={bookingTotalAmount}
                          onChange={(e) => setBookingTotalAmount(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-indigo-700 focus:outline-none font-mono text-right"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-600 block mb-1">العربون المدفوع (ج.م)</label>
                        <input
                          type="number"
                          min="0"
                          value={bookingDepositAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBookingDepositAmount(val);
                            if (bookingPayments.length <= 1) {
                              setBookingPayments([{ amount: val, payment_method: bookingPayments[0]?.payment_method || 'cash' }]);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-emerald-600 focus:outline-none font-mono text-right"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-600 block mb-1">مبلغ التأمين المطلوب (ج.م)</label>
                        <input
                          type="number"
                          min="0"
                          value={bookingInsuranceAmount}
                          onChange={(e) => setBookingInsuranceAmount(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-amber-700 focus:outline-none font-mono text-right"
                        />
                      </div>
                    </div>

                    {/* Remaining calculated summary */}
                    {(() => {
                      const tot = parseFloat(bookingTotalAmount || 0);
                      const dep = parseFloat(bookingDepositAmount || 0);
                      const rem = Math.max(0, tot - dep);
                      return (
                        <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/80 text-[10.5px] font-bold text-slate-600">
                          <span>المتبقي المطلوب سداده عند الاستلام:</span>
                          <span className="font-mono text-xs font-black text-rose-600">{rem.toLocaleString()} ج.م</span>
                        </div>
                      );
                    })()}

                    {/* Deposit payments breakdown */}
                    <div className="pt-1">
                      <MultiPaymentMethodInput
                        payments={bookingPayments}
                        onChange={(updated) => {
                          setBookingPayments(updated);
                          const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                          setBookingDepositAmount(total.toString());
                        }}
                        totalExpected={parseFloat(bookingDepositAmount || 0)}
                        label="طرق ومبالغ سداد العربون"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 block mb-1">ملاحظات الترزي وتعديلات المقاسات</label>
                  <textarea
                    value={alterationNotes}
                    onChange={(e) => setAlterationNotes(e.target.value)}
                    placeholder="ملاحظات التضييق، التقصير، الطرحة، الكب..."
                    rows={2}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none text-right"
                  />
                </div>
              </>
            )}

            {/* STAGE: PICKUP */}
            {stage === 'picked_up' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">إجمالي سعر الإيجار (ج.م)</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={pickupTotalAmount}
                      onChange={(e) => setPickupTotalAmount(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-hidden text-right"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">رقم هاتف العروس</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">تاريخ الاستلام الفعلي</label>
                    <input
                      type="date"
                      required
                      value={cleanDate(pickupDate)}
                      onChange={(e) => setPickupDate(cleanDate(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                    <span>إجمالي سعر الإيجار:</span>
                    <span className="font-mono text-slate-800 font-black">{parseFloat(pickupTotalAmount || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                    <div className="flex items-center gap-2">
                      <span>العربون المدفوع سابقاً:</span>
                      <button
                        type="button"
                        onClick={() => setShowEditDepositInPickup(!showEditDepositInPickup)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-black underline cursor-pointer"
                      >
                        {showEditDepositInPickup ? 'إخفاء تعديل العربون ✕' : '✏️ تعديل العربون والمدفوعات'}
                      </button>
                    </div>
                    <span className="font-mono text-emerald-600 font-black">{currentDepositPaid.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                    <span>المتبقي من إيجار الفستان:</span>
                    <span className="font-mono text-rose-600 font-black">{remainingForPickup.toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* Collapsible Edit Deposit Section */}
                {showEditDepositInPickup && (
                  <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 space-y-2 text-right animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-950">
                        ✏️ تصحيح العربون المدفوع سابقاً وطرق دفعه:
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                        لتصحيح أي خطأ في تسجيل العربون
                      </span>
                    </div>


                    <MultiPaymentMethodInput
                      payments={pickupDepositPayments}
                      onChange={(updated) => {
                        setPickupDepositPayments(updated);
                        const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                        setPickupDepositAmount(String(total));
                        const rem = Math.max(0, parseFloat(pickupTotalAmount || 0) - total);
                        setBalancePayments([{ amount: String(rem), payment_method: balancePayments[0]?.payment_method || 'cash' }]);
                      }}
                      label="طرق ومبالغ سداد العربون"
                    />
                  </div>
                )}

                <MultiPaymentMethodInput
                  payments={balancePayments}
                  onChange={setBalancePayments}
                  label="سداد المبلغ المتبقي للإيجار"
                />

                <MultiPaymentMethodInput
                  payments={insurancePayments}
                  onChange={setInsurancePayments}
                  label="تحصيل مبلغ التأمين"
                />
              </>
            )}

            {/* STAGE: RETURN */}
            {stage === 'returned' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">رقم هاتف العروس</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1">تاريخ الإرجاع الفعلي</label>
                    <input
                      type="date"
                      required
                      value={cleanDate(returnDate)}
                      onChange={(e) => setReturnDate(cleanDate(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Insurance Option Selection */}
                <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-amber-900">
                    <label className="flex items-center gap-1.5">
                      <span>مبلغ التأمين المحصل:</span>
                      <span className="text-[9.5px] font-normal text-slate-500">(قابل للتعديل لتصحيح أي خطأ)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={returnInsuranceAmount}
                      onChange={(e) => setReturnInsuranceAmount(e.target.value)}
                      className="w-24 px-2 py-0.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-800 focus:outline-none text-right font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/60">
                    <button
                      type="button"
                      onClick={() => setReturnRefundMode('full')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1 cursor-pointer ${returnRefundMode === 'full'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200'
                        }`}
                    >
                      <CheckCircle2 size={13} />
                      <span>رد التأمين كاملاً</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReturnRefundMode('deduction')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1 cursor-pointer ${returnRefundMode === 'deduction'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200'
                        }`}
                    >
                      <AlertTriangle size={13} />
                      <span>خصم تلفيات يدوياً</span>
                    </button>
                  </div>

                  {returnRefundMode === 'deduction' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-white rounded-xl border border-amber-200">
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-600 block mb-0.5">مبلغ الخصم للتلفيات</label>
                        <input
                          type="number"
                          min="0"
                          max={totalHeldInsurance}
                          value={damageDeduction}
                          onChange={(e) => setDamageDeduction(e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-600 text-right font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-600 block mb-0.5">سبب الخصم</label>
                        <input
                          type="text"
                          value={damageNotes}
                          onChange={(e) => setDamageNotes(e.target.value)}
                          placeholder="حرق، قطع، بقع..."
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 text-right"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-amber-200">
                    <span className="text-xs font-extrabold text-slate-700">صافي التأمين المسترد:</span>
                    <span className="font-mono text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {netRefundAmount.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* General Notes */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-550 block text-right">ملاحظات إضافية</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات وتفاصيل إضافية..."
                className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none h-12 min-h-[44px] text-right"
              />
            </div>
          </div>

          {/* Fixed Footer Buttons (Screenshot 1 Style) */}
          <div className="flex items-center gap-2.5 p-3 sm:p-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-2 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md text-center active:scale-95 disabled:opacity-50 ${stage === 'booking'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : stage === 'returned'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
              {isSubmitting
                ? 'جاري الحفظ...'
                : stage === 'booking'
                  ? ((isBookingDateBlocked || isBookingDate2Blocked) ? 'تأكيد الحجز (يوجد تعارض)' : 'تأكيد الحجز وتثبيت التاريخ')
                  : 'حفظ التعديلات'}
            </button>

            {canRevert && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRevertStage}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-2xl text-[11px] font-black transition-all cursor-pointer text-center flex items-center gap-1 active:scale-95 flex-shrink-0"
              >
                <RotateCcw size={12} />
                <span>العودة لمرحلة سابقة</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
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

export default UnifiedStageModal;
