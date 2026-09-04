import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, getStorageUrl } from '@/lib/api-client';
import {
  Phone,
  MapPin,
  Calendar as CalIcon,
  Ruler,
  Heart,
  Package,
  Check,
  User,
  X,
  Search,
  CreditCard,
  Scissors,
  Edit3,
  ExternalLink,
  Sparkles,
  MessageCircle,
  Bell,
  Calendar
} from 'lucide-react';
import { MultiPaymentMethodInput } from './MultiPaymentMethodInput';
import { BookingFinancesModal } from './BookingFinancesModal';

























const STAGES = [
  { id: 'visit', label: 'الزيارة (Visit)', icon: User, color: 'text-indigo-650 bg-indigo-50 border-indigo-100' },
  { id: 'booking', label: 'الحجز (Booking)', icon: Heart, color: 'text-rose-650 bg-rose-50 border-rose-100' },
  { id: 'fitting', label: 'البروفة (Fitting)', icon: Ruler, color: 'text-amber-650 bg-amber-50 border-amber-100' },
  { id: 'picked_up', label: 'الاستلام (Picked Up)', icon: Package, color: 'text-blue-650 bg-blue-50 border-blue-100' },
  { id: 'returned', label: 'الإرجاع (Returned)', icon: Check, color: 'text-emerald-655 bg-emerald-50 border-emerald-100' }
];

const ACTIONS_CONFIG = {
  visit: { label: 'تأكيد حجز الفستان', action: 'confirm_booking', color: 'bg-amber-600 hover:bg-amber-700' },
  booking: { label: 'حجز موعد قياس', action: 'schedule_fitting', color: 'bg-indigo-600 hover:bg-indigo-700' },
  fitting: { label: 'تسليم الفستان للعروس', action: 'mark_picked_up', color: 'bg-rose-600 hover:bg-rose-700' },
  picked_up: { label: 'تسجيل إرجاع الفستان', action: 'mark_returned', color: 'bg-blue-600 hover:bg-blue-700' }
};

const PAYMENT_METHODS = [
{ id: 'cash', label: 'نقدي (Cash)' },
{ id: 'credit_card', label: 'فيزا / كارت (Visa / Card)' },
{ id: 'instapay', label: 'إنستاباي (Instapay)' },
{ id: 'vodafone_cash', label: 'فودافون كاش (Vodafone Cash)' },
{ id: 'bank_transfer', label: 'تحويل بنكي (Bank Transfer)' }];


export function BrideJourneyCard({ bride, onStageUpdate, avatar, onPickupClick, onReturnClick }) {
  const navigate = useNavigate();
  const [selectedMobileStage, setSelectedMobileStage] = useState(bride?.current_stage || 'visit');
  const [showFinancesModal, setShowFinancesModal] = useState(false);

  React.useEffect(() => {
    setSelectedMobileStage(bride?.current_stage || 'visit');
  }, [bride?.id, bride?.current_stage]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customPayments, setCustomPayments] = useState([{ amount: '', payment_method: 'cash' }]);
  const [paymentType, setPaymentType] = useState('fitting_fee');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [checkedAccessories, setCheckedAccessories] = useState({});
  const [pickupPaymentAmount, setPickupPaymentAmount] = useState('0');
  const [pickupInsuranceAmount, setPickupInsuranceAmount] = useState('0');
  const [pickupPaymentMethod, setPickupPaymentMethod] = useState('cash');
  const [recordPickupPayment, setRecordPickupPayment] = useState(true);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnCheckedAccessories, setReturnCheckedAccessories] = useState({});
  const [returnNotes, setReturnNotes] = useState('تم الإرجاع بحالة جيدة');

  // Fitting modal states
  const [showFittingModal, setShowFittingModal] = useState(false);
  const [fittingDate, setFittingDate] = useState(new Date().toISOString().split('T')[0]);
  const [fittingTime, setFittingTime] = useState('01:00 م');
  const [fittingDressId, setFittingDressId] = useState('');
  const [tryingFee, setTryingFee] = useState('150');
  const [expectedFittingFee, setExpectedFittingFee] = useState(150);
  const [fittingPaymentMethod, setFittingPaymentMethod] = useState('cash');
  const [fittingPayments, setFittingPayments] = useState([{ amount: '150', payment_method: 'cash' }]);
  const [fittingNotes, setFittingNotes] = useState('');
  const [dressesList, setDressesList] = useState([]);
  const [dressDetails, setDressDetails] = useState(null);
  const [fittingReceipt, setFittingReceipt] = useState(null);

  // Booking modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDressId, setBookingDressId] = useState('');
  const [bookingDressSearch, setBookingDressSearch] = useState('');
  const [bookingHasSecondDress, setBookingHasSecondDress] = useState(false);
  const [bookingDress2Id, setBookingDress2Id] = useState('');
  const [bookingDress2Search, setBookingDress2Search] = useState('');
  const [dress2Details, setDress2Details] = useState(null);
  const [salesName, setSalesName] = useState('');
  const [employeesList, setEmployeesList] = useState([]);
  const [bookingPhone, setBookingPhone] = useState(bride.phone || '');
  const [bookingPhone2, setBookingPhone2] = useState(bride.phone2 || '');
  const [bookingEventDate, setBookingEventDate] = useState(bride.wedding_date || new Date().toISOString().split('T')[0]);
  const [bookingTotalAmount, setBookingTotalAmount] = useState('0');
  const [bookingDepositAmount, setBookingDepositAmount] = useState('0');
  const [bookingInsuranceAmount, setBookingInsuranceAmount] = useState('5000');
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState('instapay');
  const [bookingPayments, setBookingPayments] = useState([{ amount: '0', payment_method: 'instapay' }]);
  const [bookingReceipt, setBookingReceipt] = useState(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConflictConfirmDialog, setShowConflictConfirmDialog] = useState(false);
  const [conflictWarningMessage, setConflictWarningMessage] = useState('');

  React.useEffect(() => {
    setBookingPhone(bride.phone || '');
    setBookingPhone2(bride.phone2 || '');
  }, [bride.id, bride.phone, bride.phone2]);

  React.useEffect(() => {
    apiClient.get('/employees').then((res) => {
      const list = Array.isArray(res) ? res : (res.data?.data || res.data || []);
      setEmployeesList(list);
    }).catch(() => {});

    apiClient.get('/dresses?per_page=all').then((res) => {
      const list = Array.isArray(res) ? res : (res.data?.data || res.data || []);
      setDressesList(list);
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (showFittingModal) {
      const bookedDressId = bride.bookings?.[0]?.dress_id;
      if (bookedDressId) {
        setFittingDressId(bookedDressId.toString());
        const bookedDress = bride.bookings?.[0]?.dress;
        if (bookedDress) {
          const fee = parseFloat(bookedDress.trying_fee || 0);
          const feeStr = fee > 0 ? fee.toString() : '150';
          setExpectedFittingFee(fee > 0 ? fee : 150);
          setTryingFee(feeStr);
          setFittingPayments([{ amount: feeStr, payment_method: 'cash' }]);
        }
      }
    }
    if ((showFittingModal || showBookingModal) && dressesList.length === 0) {
      apiClient.get('/dresses?per_page=all').then((res) => {
        const list = Array.isArray(res) ? res : (res.data?.data || res.data || []);
        setDressesList(list);
        if (list.length > 0) {
          if (!bride.bookings?.[0]?.dress_id) {
            setFittingDressId(list[0].id.toString());
            const fee = parseFloat(list[0].trying_fee || 0);
            const feeStr = fee > 0 ? fee.toString() : '0';
            setTryingFee(feeStr);
            setFittingPayments([{ amount: feeStr, payment_method: 'cash' }]);
          }
          setBookingDressId(list[0].id.toString());
          setBookingTotalAmount(parseFloat(list[0].rental_price || 0).toString());
        }
      }).catch(console.error);
    }
  }, [showFittingModal, showBookingModal, bride]);

  React.useEffect(() => {
    const activeDressId = showFittingModal ? fittingDressId : showBookingModal ? bookingDressId : null;
    if (activeDressId) {
      apiClient.get(`/dresses/${activeDressId}`).then((res) => {
        setDressDetails(res.data || res || null);
      }).catch(console.error);
    } else {
      setDressDetails(null);
    }
  }, [showFittingModal, showBookingModal, fittingDressId, bookingDressId]);

  React.useEffect(() => {
    if (showBookingModal) {
      setBookingNotes('');
      setBookingReceipt(null);
      setBookingDressSearch('');
      setBookingDress2Search('');
      setBookingHasSecondDress(false);
      setBookingDress2Id('');
      setSalesName('');
      setBookingInsuranceAmount('5000');
      setBookingDepositAmount('0');
      setBookingPaymentMethod('instapay');
      setBookingPhone(bride.phone || '');
      setBookingPhone2(bride.phone2 || '');
      setBookingEventDate(bride.wedding_date || new Date().toISOString().split('T')[0]);
    }
  }, [showBookingModal, bride.id]);

  React.useEffect(() => {
    if (showFittingModal) {
      setFittingNotes('');
      setFittingReceipt(null);
      setFittingPaymentMethod('cash');
    }
  }, [showFittingModal, bride.id]);

  React.useEffect(() => {
    if (showBookingModal && bookingHasSecondDress && bookingDress2Id) {
      apiClient.get(`/dresses/${bookingDress2Id}`).then((res) => {
        setDress2Details(res.data || res || null);
      }).catch(console.error);
    } else {
      setDress2Details(null);
    }
  }, [showBookingModal, bookingHasSecondDress, bookingDress2Id]);

  // Calculate if selected wedding/booking date is blocked for Dress 1
  const isBookingDateBlocked = (() => {
    if (!bookingEventDate || !dressDetails || !dressDetails.bookings) return false;
    const fD = new Date(bookingEventDate);
    fD.setHours(0, 0, 0, 0);

    return dressDetails.bookings.some((b) => {
      if (b.client_id === bride.id) return false;

      const city = b.client?.city ?? 'القاهرة';
      const isCairo = city.includes('القاهرة') || city.toLowerCase().includes('cairo');
      const daysBefore = isCairo ? 2 : 3;
      const daysAfter = 1;

      const weddingDate = new Date(b.event_date.split(' ')[0]);
      weddingDate.setHours(0, 0, 0, 0);

      const start = new Date(weddingDate);
      start.setDate(start.getDate() - daysBefore);

      const end = new Date(weddingDate);
      end.setDate(end.getDate() + daysAfter);

      return fD >= start && fD <= end;
    });
  })();

  // Calculate if selected wedding/booking date is blocked for Dress 2
  const isBookingDate2Blocked = (() => {
    if (!bookingHasSecondDress || !bookingDress2Id || !bookingEventDate || !dress2Details || !dress2Details.bookings) return false;
    const fD = new Date(bookingEventDate);
    fD.setHours(0, 0, 0, 0);

    return dress2Details.bookings.some((b) => {
      if (b.client_id === bride.id) return false;

      const city = b.client?.city ?? 'القاهرة';
      const isCairo = city.includes('القاهرة') || city.toLowerCase().includes('cairo');
      const daysBefore = isCairo ? 2 : 3;
      const daysAfter = 1;

      const weddingDate = new Date(b.event_date.split(' ')[0]);
      weddingDate.setHours(0, 0, 0, 0);

      const start = new Date(weddingDate);
      start.setDate(start.getDate() - daysBefore);

      const end = new Date(weddingDate);
      end.setDate(end.getDate() + daysAfter);

      return fD >= start && fD <= end;
    });
  })();

  // Calculate if selected fitting date is blocked
  const isFittingDateBlocked = (() => {
    if (!fittingDate || !dressDetails || !dressDetails.bookings) return false;
    const fD = new Date(fittingDate);
    // Normalize date to midnight for comparison
    fD.setHours(0, 0, 0, 0);

    return dressDetails.bookings.some((b) => {
      // Exclude client's own booking from conflict check
      if (b.client_id === bride.id) return false;

      const city = b.client?.city ?? 'القاهرة';
      const isCairo = city.includes('القاهرة') || city.toLowerCase().includes('cairo');
      const daysBefore = isCairo ? 2 : 3;
      const daysAfter = 1;

      const weddingDate = new Date(b.event_date.split(' ')[0]);
      weddingDate.setHours(0, 0, 0, 0);

      const start = new Date(weddingDate);
      start.setDate(start.getDate() - daysBefore);

      const end = new Date(weddingDate);
      end.setDate(end.getDate() + daysAfter);

      return fD >= start && fD <= end;
    });
  })();

  const handleDressChange = (dressIdStr) => {
    setFittingDressId(dressIdStr);
    const dress = dressesList.find((d) => d.id.toString() === dressIdStr);
    if (dress) {
      const fee = parseFloat(dress.trying_fee || 0);
      setTryingFee(fee > 0 ? fee.toString() : '0');
    }
  };

  const handleFittingSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const validPayments = fittingPayments.filter(p => parseFloat(p.amount) > 0);
      const totalFee = validPayments.length > 0
        ? validPayments.reduce((s, p) => s + parseFloat(p.amount), 0)
        : parseFloat(tryingFee || '0');

      await apiClient.put(`/clients/${bride.id}/stage-action`, {
        action: 'schedule_fitting',
        fitting_date: fittingDate,
        fitting_time: fittingTime,
        dress_id: parseInt(fittingDressId),
        trying_fee: totalFee,
        payment_method: validPayments.length === 1 ? validPayments[0].payment_method : (validPayments.length > 1 ? 'multiple' : fittingPaymentMethod),
        payments: validPayments,
        notes: fittingNotes,
        receipt_image: fittingReceipt
      });
      setShowFittingModal(false);
      setFittingReceipt(null);
      setFittingNotes('');
      onStageUpdate?.();
      setFittingNotes('');
      onStageUpdate?.();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookingSubmit = async (e, forceOverride = false) => {
    if (e) e.preventDefault();

    // If a conflict exists and forceOverride is false, prompt the confirmation dialog
    if ((isBookingDateBlocked || isBookingDate2Blocked) && !forceOverride) {
      const d1 = dressesList.find((d) => d.id.toString() === bookingDressId)?.name || 'الفستان الأول';
      const d2 = dressesList.find((d) => d.id.toString() === bookingDress2Id)?.name || 'الفستان الثاني';
      let msg = '';
      if (isBookingDateBlocked && isBookingDate2Blocked) {
        msg = `يوجد تعارض في تاريخ المناسبة لكلا الفستانين (${d1} و ${d2}) مع حجوزات لعميلات أخريات.`;
      } else if (isBookingDateBlocked) {
        msg = `يوجد تعارض في تاريخ المناسبة للفستان (${d1}) مع حجز لعميلة أخرى.`;
      } else {
        msg = `يوجد تعارض في تاريخ المناسبة للفستان الثاني (${d2}) مع حجز لعميلة أخرى.`;
      }
      setConflictWarningMessage(msg);
      setShowConflictConfirmDialog(true);
      return;
    }

    try {
      setIsSubmitting(true);
      const activePhone = bookingPhone.trim() || bride.phone || '';
      const validPayments = bookingPayments.filter(p => parseFloat(p.amount) > 0);
      const totalDepositCalculated = validPayments.length > 0
        ? validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
        : parseFloat(bookingDepositAmount || '0');

      await apiClient.put(`/clients/${bride.id}/stage-action`, {
        action: 'confirm_booking',
        phone: activePhone,
        phone2: bookingPhone2.trim() || null,
        dress_id: parseInt(bookingDressId),
        dress_2_id: bookingHasSecondDress && bookingDress2Id ? parseInt(bookingDress2Id) : null,
        sales_name: salesName.trim() || null,
        force_override: forceOverride,
        event_date: bookingEventDate,
        total_amount: parseFloat(bookingTotalAmount),
        deposit_amount: totalDepositCalculated,
        insurance_amount: parseFloat(bookingInsuranceAmount || '5000'),
        payment_method: validPayments.length === 1 ? validPayments[0].payment_method : (validPayments.length > 1 ? 'multiple' : bookingPaymentMethod),
        payments: validPayments,
        receipt_image: bookingReceipt,
        notes: bookingNotes
      });
      setShowBookingModal(false);
      setShowConflictConfirmDialog(false);
      setBookingReceipt(null);
      setBookingNotes('');
      onStageUpdate?.();

      // WhatsApp redirection
      const visitDate = bookingEventDate || bride.wedding_date || bride.latest_visit_date || '';
      let visitTime = bride.latest_visit_time || bride.visits?.[0]?.time_slot;
      if (!visitTime || visitTime === 'غير محدد') {
        const match = bride.notes?.match(/(?:وقت المقابلة:?\s*)?([0-1]?\d:[0-5]\d(?:\s*(?:م|ص|AM|PM|am|pm))?)/i);
        visitTime = match ? match[1].trim() : 'خلال أوقات العمل الرسمية (من ١:٠٠ م حتى ٨:٣٠ م)';
      }
      const dress = dressesList.find((d) => d.id.toString() === bookingDressId);
      const dress2 = bookingHasSecondDress && bookingDress2Id ? dressesList.find((d) => d.id.toString() === bookingDress2Id) : null;

      let dressText = '';
      if (dress && dress2) {
        dressText = `\n• *فستان الزفاف 1:* ${dress.name}\n• *فستان 2:* ${dress2.name}`;
      } else if (dress) {
        dressText = `\n• *فستان الزفاف:* ${dress.name}`;
      }

      let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${bride.name}* 🤍،\nيسعدنا جداً تأكيد حجز موعدكِ وتجهيز فستان أحلامكِ!\n\n📅 *تفاصيل الموعد:*\n• *التاريخ:* ${visitDate}\n• *الوقت:* ${visitTime}\n${dressText}\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nنحن بانتظار تشريفكِ لتنيري المكان ✨🎀`;

      try {
        const templates = await apiClient.get('/whatsapp-templates');
        const t = templates.find((x) => x.key === 'booking_confirmation');
        if (t) {
          message = t.body
            .replace(/\{\{client_name\}\}/g, bride.name)
            .replace(/\{\{wedding_date\}\}/g, bride.wedding_date || visitDate)
            .replace(/\{\{visit_date\}\}/g, visitDate)
            .replace(/\{\{visit_time\}\}/g, visitTime)
            .replace(/\{\{dress_line\}\}/g, dress2 ? `${dress?.name || ''} و ${dress2.name}` : (dress ? `${dress.name}` : ''));
        }
      } catch (err) {
        console.error('Failed to fetch whatsapp template, using fallback:', err);
      }

      const cleanPhone = activePhone.replace(/[^\d]/g, '');
      if (cleanPhone) {
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }

    } catch (err) {
      console.error(err);
      if (err?.response?.data?.available_date || err?.available_date || err?.message?.includes('غير متوفر')) {
        setConflictWarningMessage(err?.response?.data?.message || err?.message || 'هذا الفستان غير متوفر في الفترة المحددة.');
        setShowConflictConfirmDialog(true);
      } else {
        alert(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء حفظ حجز الفستان');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (isPickupModalOpen && bride) {
      const booking = bride.bookings?.[0];
      const accs = [
      ...(booking?.dress?.accessories || []),
      ...(booking?.dress2?.accessories || []),
      ...(booking?.dress3?.accessories || [])];

      const initialChecked = {};
      accs.forEach((a, i) => {
        initialChecked[`${a.name || a}_${i}`] = false;
      });
      setCheckedAccessories(initialChecked);

      const totalPaid = booking?.revenues?.reduce((sum, rev) => sum + parseFloat(rev.amount), 0) || parseFloat(booking?.deposit_amount || 0);
      const remaining = parseFloat(booking?.total_amount || 0) - totalPaid;
      setPickupPaymentAmount(remaining > 0 ? remaining.toString() : '0');
      setPickupInsuranceAmount(booking?.insurance_amount?.toString() || '0');
    }
  }, [isPickupModalOpen, bride]);

  React.useEffect(() => {
    if (isReturnModalOpen && bride) {
      const booking = bride.bookings?.[0];
      const accs = [
      ...(booking?.dress?.accessories || []),
      ...(booking?.dress2?.accessories || []),
      ...(booking?.dress3?.accessories || [])];

      const initialChecked = {};
      accs.forEach((a, i) => {
        initialChecked[`${a.name || a}_${i}`] = false;
      });
      setReturnCheckedAccessories(initialChecked);
      setReturnNotes('تم الإرجاع بحالة جيدة وبدون تلفيات');
    }
  }, [isReturnModalOpen, bride]);

  const handleStageAction = async (action) => {
    try {
      setIsSubmitting(true);
      await apiClient.put(`/clients/${bride.id}/stage-action`, { action });
      onStageUpdate?.();

      // ── Always fetch FRESH client data from API before building WhatsApp message ──
      let freshBride = bride;
      try {
        const fetched = await apiClient.get(`/clients/${bride.id}`);
        freshBride = fetched;
      } catch (e) {
        console.warn('Could not fetch fresh client data, using cached:', e);
      }

      // Helper: format 24h time like "17:00" → "05:00 م (05:00 PM)"
      const formatTimeSlot = (raw) => {
        if (!raw) return '';
        if (raw.includes('م') || raw.includes('ص') || raw.includes('PM') || raw.includes('AM')) return raw;
        try {
          const parts = raw.split(':');
          const h = parseInt(parts[0], 10);
          if (!isNaN(h)) {
            const m = parts[1] ? parts[1].replace(/[^\d]/g, '') : '00';
            const isPm = h >= 12;
            const h12 = h % 12 === 0 ? 12 : h % 12;
            return `${String(h12).padStart(2, '0')}:${m.padStart(2, '0')} ${isPm ? 'م' : 'ص'} (${String(h12).padStart(2, '0')}:${m.padStart(2, '0')} ${isPm ? 'PM' : 'AM'})`;
          }
        } catch {}
        return raw;
      };

      // Helper: resolve the visit time from all available sources
      const resolveVisitTime = () => {
        // 1. From fresh API data (backend accessor already formats it)
        if (freshBride.latest_visit_time && freshBride.latest_visit_time !== 'غير محدد') {
          return formatTimeSlot(freshBride.latest_visit_time);
        }
        // 2. From visits[0].time_slot in the fresh data
        const slot = freshBride.visits?.[0]?.time_slot;
        if (slot) {
          return formatTimeSlot(slot);
        }
        // 3. Parse from notes
        const notesText = (freshBride.notes || '') + ' ' + (freshBride.visits?.[0]?.notes || '');
        const match = notesText.match(/(?:وقت المقابلة:?\s*)?([0-1]?\d:[0-5]\d(?:\s*(?:م|ص|AM|PM|am|pm))?)/i);
        if (match && match[1]) {
          return formatTimeSlot(match[1].trim());
        }
        // 4. Fallback
        return 'خلال أوقات العمل الرسمية (من ١:٠٠ م حتى ٨:٣٠ م)';
      };

      // Helper: clean date string to YYYY-MM-DD format (removing any 00:00:00 time suffix)
      const formatDateOnly = (rawDate) => {
        if (!rawDate) return '';
        return rawDate.split(' ')[0].split('T')[0];
      };

      if (action === 'confirm_visit') {
        const rawVisitDate = freshBride.latest_visit_date || freshBride.visits?.[0]?.visit_date || freshBride.wedding_date || new Date().toISOString().split('T')[0];
        const visitDate = formatDateOnly(rawVisitDate);
        const visitTime = resolveVisitTime();

        // Dynamic trying fee calculation based on dress
        const bookedDress = freshBride.bookings?.[0]?.dress || freshBride.visits?.[0]?.dress;
        const feeAmount = freshBride.latest_dress_trying_fee !== undefined && freshBride.latest_dress_trying_fee > 0 ?
        freshBride.latest_dress_trying_fee :
        bookedDress ? parseFloat(bookedDress.trying_fee || 0) : 0;
        const tryingFeeText = feeAmount > 0 ? `${feeAmount} ج.م` : 'مجانية (بدون رسوم)';

        let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${freshBride.name}* 🤍،\nيسعدنا جداً تأكيد موعدكِ معنا لتجربة فستان أحلامكِ!\n\n📅 *تفاصيل الموعد:*\n• *التاريخ:* ${visitDate}\n• *الوقت:* ${visitTime}\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n• *رسوم التجربة والقياس:* ${tryingFeeText}\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nنحن بانتظار تشريفكِ لتنيري المكان ✨🎀`;

        try {
          const templates = await apiClient.get('/whatsapp-templates');
          const t = templates.find((x) => x.key === 'visit_confirmation');
          if (t) {
            message = t.body.
            replace(/\{\{client_name\}\}/g, freshBride.name).
            replace(/\{\{visit_date\}\}/g, visitDate).
            replace(/\{\{visit_time\}\}/g, visitTime).
            replace(/\{\{trying_fee\}\}/g, tryingFeeText);
          }
        } catch (err) {
          console.error('Failed to fetch whatsapp template:', err);
        }

        const cleanPhone = freshBride.phone.replace(/[^\d]/g, '');
        if (cleanPhone) {
          const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
        }
      }

      if (action === 'confirm_booking') {
        const rawVisitDate = bookingEventDate || freshBride.wedding_date || freshBride.latest_visit_date || '';
        const visitDate = formatDateOnly(rawVisitDate);
        const visitTime = resolveVisitTime();
        const dressText = freshBride.latest_dress_name ? `\n• *فستان الزفاف:* ${freshBride.latest_dress_name}` : '';

        let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${freshBride.name}* 🤍،\nيسعدنا جداً تأكيد حجز موعدكِ وتجهيز فستان أحلامكِ!\n\n📅 *تفاصيل الموعد:*\n• *التاريخ:* ${visitDate}\n• *الوقت:* ${visitTime}\n${dressText}\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nنحن بانتظار تشريفكِ لتنيري المكان ✨🎀`;

        try {
          const templates = await apiClient.get('/whatsapp-templates');
          const t = templates.find((x) => x.key === 'booking_confirmation');
          if (t) {
            message = t.body.
            replace(/\{\{client_name\}\}/g, freshBride.name).
            replace(/\{\{wedding_date\}\}/g, freshBride.wedding_date || visitDate).
            replace(/\{\{visit_date\}\}/g, visitDate).
            replace(/\{\{visit_time\}\}/g, visitTime).
            replace(/\{\{dress_line\}\}/g, freshBride.latest_dress_name ? `${freshBride.latest_dress_name}` : '');
          }
        } catch (err) {
          console.error('Failed to fetch whatsapp template, using fallback:', err);
        }

        const cleanPhone = freshBride.phone.replace(/[^\d]/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
      }

      if (action === 'mark_returned') {
        const dressName = freshBride.latest_dress_name || freshBride.bookings?.[0]?.dress?.name || '';
        const message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${freshBride.name}* 🤍،\nنشكركِ جداً على اختياركِ لفساتين صوفيا لمشاركتكِ فرحتكِ! 🥰🌸\n\nنود تأكيد استلام فستان زفافكِ *${dressName}* بحالة سليمة وجيدة اليوم، وتم إرجاع مبلغ التأمين بالكامل. 💰✔️\n\nسعدنا جداً بخدمتكِ وكونكِ إحدى جميلات فساتين صوفيا، ويسعدنا جداً مشاركتنا صور زفافكِ الجميلة بالفستان إذا رغبتِ! 📸👰🏻‍♀️🤍\n\nنتمنى لكِ حياة زوجية سعيدة ومليئة بالحب والفرح! ✨🎀`;
        const cleanPhone = freshBride.phone.replace(/[^\d]/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (e) {
      console.error('Failed to perform bride stage action:', e);
      alert(e?.message || 'فشل تنفيذ الإجراء.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendCongratsWhatsApp = async (e) => {
    e?.stopPropagation?.();
    const phone = (bride.phone || '').replace(/[^\d]/g, '');
    if (!phone) {
      alert('لا يوجد رقم هاتف مسجل للعروس');
      return;
    }

    let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nألف مبروك لجميلتنا الرائعة *${bride.name}* 🤍👰🏻‍♀️،\nنتمنى لكِ حياة زوجية سعيدة ومليئة بالحب والفرح! سعدنا جداً بكوننا جزءاً من يومكِ المميز وتألقكِ بفستان أحلامكِ المختار من فساتين صوفيا 👗💖✨`;
    try {
      const templates = await apiClient.get('/whatsapp-templates');
      const t = templates.find((x) => x.key === 'wedding_congratulations');
      if (t) {
        message = t.body.replace(/\{\{client_name\}\}/g, bride.name);
      }
    } catch (err) {}

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCreatePayment = async (e) => {
    e?.preventDefault?.();
    try {
      setIsSubmittingPayment(true);
      const validPayments = customPayments.filter(p => parseFloat(p.amount) > 0);
      const totalAmt = validPayments.length > 0
        ? validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
        : parseFloat(paymentAmount);

      if (!isNaN(totalAmt) && totalAmt > 0) {
        await apiClient.post('/revenues', {
          booking_id: bride.bookings?.[0]?.id || null,
          type: paymentType,
          amount: totalAmt,
          payment_method: validPayments.length === 1 ? validPayments[0].payment_method : 'multiple',
          payments: validPayments.length > 0 ? validPayments : [{ amount: totalAmt, payment_method: paymentMethod }],
          payment_date: new Date().toISOString().split('T')[0],
          notes: paymentNotes || (paymentType === 'fitting_fee' ? `رسوم قياس وتجربة للعروس: ${bride.name}` : `دفعة حجز للعروس: ${bride.name}`),
          receipt_image: paymentReceipt
        });
        setShowPaymentModal(false);
        setPaymentAmount('');
        setCustomPayments([{ amount: '', payment_method: 'cash' }]);
        setPaymentMethod('cash');
        setPaymentNotes('');
        setPaymentReceipt(null);
        onStageUpdate?.();
      }
    } catch (e) {
      console.error('Failed to record payment:', e);
      alert('حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const openPaymentModalFor = (type) => {
    setPaymentType(type);
    const bookedDress = bride.bookings?.[0]?.dress || bride.visits?.[0]?.dress;
    const fee = (bride.latest_dress_trying_fee && bride.latest_dress_trying_fee > 0)
      ? bride.latest_dress_trying_fee
      : (bookedDress ? parseFloat(bookedDress.trying_fee || 150) : 150);
    const initialAmt = type === 'fitting_fee' ? fee.toString() : '';
    setPaymentAmount(initialAmt);
    setCustomPayments([{ amount: initialAmt, payment_method: 'cash' }]);
    setPaymentNotes(type === 'fitting_fee' ? `رسوم قياس وتجربة للعروس: ${bride.name}` : `دفعة حجز للعروس: ${bride.name}`);
    setPaymentMethod('cash');
    setPaymentReceipt(null);
    setShowPaymentModal(true);
  };

  const handleSendPickupReminderWhatsApp = async (e) => {
    e?.stopPropagation?.();
    const phone = (bride.phone || '').replace(/[^\d]/g, '');
    if (!phone) {
      alert('لا يوجد رقم هاتف مسجل للعروس');
      return;
    }

    const booking = bride.bookings?.[0];
    const dress1Name = booking?.dress?.name || bride.latest_dress_name || 'فستان الزفاف';
    const dress2Name = booking?.dress2?.name;
    const dressesStr = dress2Name ? `${dress1Name} و ${dress2Name}` : dress1Name;
    const weddingDate = bride.wedding_date || booking?.event_date || 'قريباً';

    let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${bride.name}* 🤍،\nنود تذكيركِ بأن فستان زفافكِ الرائع (*${dressesStr}*) أصبح جاهزاً بالكامل للاستلام من الأتيليه 👗✨.\n\n📍 *العنوان:* التجمع الأول - الياسمين ٢ - فيلا 161 (الباب الجانبي شمال الفيلا)\n🗺️ *الموقع:* https://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nبانتظار تشريفكِ لتسليمكِ الفستان والإكسسوارات مع أطيب تمنياتنا لكِ بأجمل ليلة زفاف! 💍👰🏻‍♀️`;

    try {
      const templates = await apiClient.get('/whatsapp-templates');
      const t = templates.find((x) => x.key === 'pickup_ready' || x.key === 'pickup_reminder');
      if (t) {
        message = t.body
          .replace(/\{\{client_name\}\}/g, bride.name)
          .replace(/\{\{wedding_date\}\}/g, weddingDate)
          .replace(/\{\{dress_name\}\}/g, dressesStr);
      }
    } catch (err) {}

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const renderColumn = (stageId, label, icon, colorClasses) => {
    const isActive = bride.current_stage === stageId;
    const IconComponent = icon;

    return (
      <div key={stageId} className="flex flex-col space-y-3">
        {/* Stage Header */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-extrabold text-[10px] text-center ${colorClasses}`}>
          <IconComponent size={12} />
          <span>{label}</span>
        </div>

        {/* Stage Content */}
        <div className="flex-1 min-h-[200px]">
          {isActive ? (
            <div
              onClick={() => setShowDetailsModal(true)}
              className="bg-white rounded-3xl border border-slate-150/90 p-2.5 sm:p-3 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full cursor-pointer hover:border-indigo-300 group"
            >
              <div>
                {/* 1. Bride Header: Compact Centered Avatar + Source Badge + Name & VIP */}
                <div className="flex flex-col items-center text-center mb-2 relative">
                  <div className="relative mb-1">
                    <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-sm ring-2 ring-indigo-50 bg-slate-100 flex items-center justify-center">
                      <img
                        src={avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'}
                        alt={bride.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {bride.source && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center shadow-xs border-2 border-white text-white"
                        style={{
                          background: bride.source === 'instagram'
                            ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
                            : bride.source === 'whatsapp'
                            ? '#25D366'
                            : bride.source === 'facebook'
                            ? '#1877F2'
                            : '#4f46e5'
                        }}
                        title={bride.source}
                      >
                        {bride.source === 'instagram' ? (
                          <svg className="w-2 h-2 fill-white" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                        ) : bride.source === 'whatsapp' ? (
                          <MessageCircle size={9} className="text-white" />
                        ) : (
                          <Sparkles size={9} className="text-white" />
                        )}
                      </span>
                    )}
                  </div>

                  {/* Bride Name & VIP Badge */}
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    <h4 className="text-xs font-black text-slate-800 tracking-tight">{bride.name}</h4>
                    <span className="text-[7.5px] font-black text-amber-800 bg-amber-100/90 border border-amber-300/80 px-1 py-0.2 rounded shadow-2xs">
                      VIP
                    </span>
                  </div>

                  {/* Phone & Location */}
                  <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 mt-0.5 flex-wrap justify-center">
                    <a
                      href={`tel:${bride.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-0.5 hover:text-indigo-650 transition-colors font-mono text-slate-600"
                    >
                      <span>{bride.phone || '—'}{bride.phone2 ? ` / ${bride.phone2}` : ''}</span>
                      <Phone size={9} className="text-slate-400" />
                    </a>
                    <span className="flex items-center gap-0.5">
                      <span>{bride.city || 'القاهرة'}</span>
                      <MapPin size={9} className="text-slate-400" />
                    </span>
                  </div>
                </div>

                {/* 2. Dress Cards: Compact Design */}
                {(bride.latest_dress_name || bride.bookings?.[0]?.dress || bride.bookings?.[0]?.dress2) && (() => {
                  const booking = bride.bookings?.[0];
                  const dress1 = booking?.dress;
                  const dress2 = booking?.dress2;
                  const dress1Name = dress1?.name || bride.latest_dress_name || 'فستان زفاف';
                  const dress2Name = dress2?.name;

                  const getDressImg = (d, dressNameFallback) => {
                    let targetDress = d;
                    if ((!targetDress?.images || targetDress.images.length === 0) && dressesList.length > 0) {
                      if (targetDress?.id) {
                        const match = dressesList.find((x) => x.id === targetDress.id);
                        if (match) targetDress = match;
                      }
                      if ((!targetDress?.images || targetDress.images.length === 0) && (targetDress?.name || dressNameFallback)) {
                        const nameToMatch = (targetDress?.name || dressNameFallback || '').trim();
                        const match = dressesList.find((x) => (x.name && x.name.trim() === nameToMatch) || (x.name_ar && x.name_ar.trim() === nameToMatch));
                        if (match) targetDress = match;
                      }
                    }

                    if (!targetDress) return null;

                    let img = null;
                    if (Array.isArray(targetDress.images) && targetDress.images.length > 0) {
                      const primary = targetDress.images.find((x) => x.is_primary) || targetDress.images[0];
                      img = typeof primary === 'string' ? primary : (primary?.image_path || primary?.image_url || primary?.image);
                    }
                    if (!img) {
                      img = targetDress.primary_image || targetDress.image_path || targetDress.image_url || targetDress.image;
                    }
                    if (!img) return null;

                    return getStorageUrl(img);
                  };

                  const img1 = getDressImg(dress1, dress1Name);
                  const img2 = getDressImg(dress2, dress2Name);

                  const cleanDate = (raw) => {
                    if (!raw) return '';
                    return String(raw).trim().split('T')[0].split(' ')[0];
                  };

                  return (
                    <div className="space-y-1.5 mb-2">
                      {/* Dress cards: Side-by-side if 2, or Compact Single Card if 1 */}
                      {dress2Name ? (
                        <div className="grid grid-cols-2 gap-1.5 text-right">
                          {/* Dress 1 */}
                          <div className="bg-slate-50/90 rounded-xl p-1.5 border border-slate-150 flex flex-col items-center text-center relative overflow-hidden group/d hover:border-indigo-300 transition-all shadow-2xs">
                            <div className="w-full h-14 rounded-lg overflow-hidden bg-white border border-slate-100 mb-1 flex items-center justify-center relative">
                              {img1 ? (
                                <>
                                  <img
                                    src={img1}
                                    alt=""
                                    className="w-full h-full object-cover group-hover/d:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex';
                                    }}
                                  />
                                  <span className="hidden w-full h-full items-center justify-center text-lg bg-slate-50">👗</span>
                                </>
                              ) : (
                                <span className="text-lg">👗</span>
                              )}
                              <span className="absolute bottom-0.5 right-0.5 bg-indigo-600/90 backdrop-blur-xs text-white text-[6.5px] font-black px-1 py-0.2 rounded">
                                فستان 1
                              </span>
                            </div>
                            <span className="text-[9px] font-black text-slate-800 truncate max-w-full block leading-tight">{dress1Name}</span>
                            {dress1?.code && (
                              <span className="text-[7px] font-bold text-slate-400 font-mono mt-0.5">كود: {dress1.code}</span>
                            )}
                          </div>

                          {/* Dress 2 */}
                          <div className="bg-purple-50/40 rounded-xl p-1.5 border border-purple-150 flex flex-col items-center text-center relative overflow-hidden group/d hover:border-purple-300 transition-all shadow-2xs">
                            <div className="w-full h-14 rounded-lg overflow-hidden bg-white border border-purple-100 mb-1 flex items-center justify-center relative">
                              {img2 ? (
                                <>
                                  <img
                                    src={img2}
                                    alt=""
                                    className="w-full h-full object-cover group-hover/d:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex';
                                    }}
                                  />
                                  <span className="hidden w-full h-full items-center justify-center text-lg bg-slate-50">✨</span>
                                </>
                              ) : (
                                <span className="text-lg">✨</span>
                              )}
                              <span className="absolute bottom-0.5 right-0.5 bg-purple-600/90 backdrop-blur-xs text-white text-[6.5px] font-black px-1 py-0.2 rounded">
                                فستان 2
                              </span>
                            </div>
                            <span className="text-[9px] font-black text-purple-900 truncate max-w-full block leading-tight">{dress2Name}</span>
                            {dress2?.code && (
                              <span className="text-[7px] font-bold text-purple-400 font-mono mt-0.5">كود: {dress2.code}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/90 rounded-2xl p-2 border border-slate-150 flex items-center gap-2.5 text-right hover:border-indigo-300 transition-all shadow-2xs">
                          <div className="w-11 h-14 rounded-xl overflow-hidden bg-white border border-slate-100 flex-shrink-0 flex items-center justify-center relative">
                            {img1 ? (
                              <>
                                <img
                                  src={img1}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                                <span className="hidden w-full h-full items-center justify-center text-xl bg-slate-50">👗</span>
                              </>
                            ) : (
                              <span className="text-xl">👗</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[7px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 inline-block mb-0.5">
                              فستان رئيسي
                            </span>
                            <span className="text-[10px] font-black text-slate-800 truncate block leading-tight">{dress1Name}</span>
                            {dress1?.code && (
                              <span className="text-[7.5px] font-bold text-slate-400 font-mono block mt-0.5">كود: {dress1.code}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sales Specialist Pill */}
                      {booking?.sales_name && (
                        <div className="bg-slate-50/80 px-2 py-1 rounded-xl border border-slate-150 flex items-center justify-between text-right">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[9px]">
                              👩🏻‍💼
                            </div>
                            <div className="text-right">
                              <span className="text-[8.5px] font-black text-slate-800 block leading-tight">{booking.sales_name}</span>
                              <span className="text-[6.5px] font-bold text-slate-400 block leading-none">مستشارة مبيعات</span>
                            </div>
                          </div>
                          <span className="text-[7.5px] font-extrabold text-indigo-650 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-150">
                            السيلز
                          </span>
                        </div>
                      )}

                      {/* Date Chip: Clean Format */}
                      {(bride.wedding_date || booking?.event_date || bride.latest_visit_date) && (
                        <div className="bg-white px-2 py-1 rounded-xl border border-slate-150 flex items-center justify-between text-[8.5px] font-bold text-slate-700">
                          <div className="flex items-center gap-1 font-mono font-black text-slate-800">
                            <Calendar size={10} className="text-indigo-600" />
                            <span>{cleanDate(bride.wedding_date || booking?.event_date || bride.latest_visit_date)}</span>
                          </div>
                          <span className="text-slate-400 text-[7.5px]">تاريخ الحفل:</span>
                        </div>
                      )}

                      {/* Conflict Override warning if present */}
                      {booking?.is_override && (
                        <div className="text-[7.5px] font-black text-rose-700 bg-rose-50/80 border border-rose-200 px-1.5 py-0.5 rounded-lg text-center">
                          ⚠️ تم تأكيد الحجز بتجاوز التعارض
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 3. Status Pill */}
                {stageId === 'picked_up' && (
                  <div className="flex justify-center mb-2">
                    <span className="text-[8.5px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs text-center bg-amber-50 text-amber-800 border-amber-200">
                      {bride.bookings?.[0]?.status === 'picked_up' || bride.bookings?.[0]?.status === 'out'
                        ? '✓ تم تسليم الفستان'
                        : 'بانتظار الاستلام ✨'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* 4. Action Button Area */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                {(() => {
                if (stageId === 'visit') {
                  return (
                    <div className="space-y-1">
                      <button
                        disabled={isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStageAction('confirm_visit');
                        }}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-[9.5px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                      >
                        {isSubmitting ? 'جاري الحفظ...' : 'تأكيد موعد الزيارة 💬'}
                      </button>
                      <button
                        disabled={isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowBookingModal(true);
                        }}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white rounded-xl text-[9.5px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                      >
                        <span>حجز فستان الزفاف 👗</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPaymentModalFor('fitting_fee');
                        }}
                        className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[8.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-200"
                      >
                        <CreditCard size={10} className="text-slate-500" />
                        <span>تسجيل رسوم القياس 💰</span>
                      </button>
                    </div>
                  );
                }

                if (stageId === 'booking') {
                  const weddingDate = bride.wedding_date || bride.bookings?.[0]?.event_date;
                  let isWeddingNear = false;
                  if (weddingDate) {
                    const daysLeft = Math.ceil((new Date(weddingDate) - new Date()) / (1000 * 60 * 60 * 24));
                    if (daysLeft >= 0 && daysLeft <= 14 && (!bride.fittings || bride.fittings.length === 0)) {
                      isWeddingNear = true;
                    }
                  }

                  return (
                    <div className="space-y-1">
                      {isWeddingNear && (
                        <div className="text-[7.5px] font-black text-rose-700 bg-rose-50 border border-rose-200 p-1 rounded-lg text-center leading-tight">
                          ⚠️ موعد الزفاف قريب (أقل من أسبوعين) ولم يتم تحديد بروفة بعد!
                        </div>
                      )}
                      <button
                        disabled={isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFittingModal(true);
                        }}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl text-[9.5px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                      >
                        <span>حجز موعد قياس 📐</span>
                      </button>
                      <button
                        disabled={isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowBookingModal(true);
                        }}
                        className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[8.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-200"
                      >
                        <Edit3 size={10} className="text-slate-500" />
                        <span>تعديل الحجز / استبدال الفستان ✏️</span>
                      </button>
                    </div>
                  );
                }

                if (stageId === 'fitting') {
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <button
                          disabled={isSubmitting}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowFittingModal(true);
                          }}
                          className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl text-[9px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                        >
                          <span>بروفة إضافية 📐</span>
                        </button>
                        <button
                          disabled={isSubmitting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStageAction('end_fitting');
                          }}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-[9px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                        >
                          <span>إنهاء البروفة ✂️</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/dashboard/fittings');
                        }}
                        className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[8.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-200"
                      >
                        <Ruler size={10} className="text-slate-500" />
                        <span>كارت القياسات والترزي 🪡</span>
                      </button>
                    </div>
                  );
                }

                if (stageId === 'picked_up') {
                  const booking = bride.bookings?.[0];
                  const isDelivered = booking?.status === 'picked_up' || booking?.status === 'out';

                  const weddingDate = bride.wedding_date || booking?.event_date;
                  let isPickupOverdue = false;
                  if (weddingDate && !isDelivered) {
                    const isCairo = !bride.city || bride.city === 'القاهرة' || bride.city === 'الجيزة';
                    const pickupDate = new Date(new Date(weddingDate).getTime() - (isCairo ? 1 : 2) * 24 * 60 * 60 * 1000);
                    if (new Date() > pickupDate) {
                      isPickupOverdue = true;
                    }
                  }

                  if (!isDelivered) {
                    return (
                      <div className="space-y-1.5">
                        {isPickupOverdue && (
                          <div className="text-[8px] font-black text-rose-800 bg-rose-50/90 border border-rose-200 p-1.5 rounded-xl text-center leading-tight flex items-center justify-center gap-1 shadow-2xs">
                            <Bell size={10} className="text-rose-600 animate-bounce" />
                            <span>تنبيه: حان موعد الاستلام اليوم</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <button
                            disabled={isSubmitting}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onPickupClick) {
                                onPickupClick(bride);
                              } else {
                                handleStageAction('mark_picked_up');
                              }
                            }}
                            className="flex-1 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-md shadow-rose-600/20 active:scale-95 flex items-center justify-center gap-1 text-center"
                          >
                            <span>تسليم الفستان</span>
                          </button>
                          <button
                            disabled={isSubmitting}
                            onClick={handleSendPickupReminderWhatsApp}
                            title="إرسال تذكير واتساب"
                            className="w-8.5 h-8.5 flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
                          >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-4 h-4" style={{ filter: 'brightness(0) invert(1)' }} />
                          </button>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="space-y-1">
                        <div className="text-[8px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-center">
                          📦 الفستان في حوزة العروسة
                        </div>
                        <button
                          disabled={isSubmitting}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onReturnClick) {
                              onReturnClick(bride);
                            } else {
                              handleStageAction('mark_returned');
                            }
                          }}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl text-[9.5px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                        >
                          <span>تسجيل إرجاع الفستان 🔄</span>
                        </button>
                      </div>
                    );
                  }
                }

                if (stageId === 'returned') {
                  return (
                    <div className="space-y-1">
                      <div className="text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-center">
                        ✓ تم استلام الفستان بنجاح
                      </div>
                      <button
                        type="button"
                        onClick={handleSendCongratsWhatsApp}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9.5px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                      >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-3.5 h-3.5" style={{ filter: 'brightness(0) invert(1)' }} />
                        <span>إرسال تهنئة الزفاف 💐</span>
                      </button>
                    </div>
                  );
                }

                return null;
              })()}
              </div>
            </div>
          ) : (
            <div className="h-full border border-dashed border-slate-200/80 rounded-2xl flex items-center justify-center p-4 bg-slate-50/30">
              <span className="text-[10px] text-slate-400 font-bold">لا توجد مرحلة حالية</span>
            </div>
          )}
        </div>
      </div>
    );

  };

  const handlePaymentSubmit = (e) => {
    handleCreatePayment(e);
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <h3 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">
            <span>متابعة رحلة العروس: </span>
            <span className="text-indigo-650">{bride?.name}</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Settings / Finances Button */}
          <button 
            type="button"
            onClick={() => setShowFinancesModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs text-[9px] font-bold cursor-pointer"
          >
            <Edit3 size={11} className="text-slate-500" />
            <span>تعديل وحسابات</span>
          </button>

          <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100">
            المرحلة الحالية: {bride?.current_stage ? bride.current_stage.toUpperCase() : 'VISIT'}
          </span>
        </div>
      </div>

      {/* Mobile Stage Stepper & Card View (md:hidden) */}
      <div className="block md:hidden space-y-3">
        {/* Horizontal Stage Stepper Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {STAGES.map((s) => {
            const isCurrent = (bride?.current_stage || 'visit') === s.id;
            const isSelected = selectedMobileStage === s.id;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedMobileStage(s.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isCurrent
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Icon size={12} />
                <span>{s.label.split(' ')[0]}</span>
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Stage Card on Mobile */}
        <div>
          {(() => {
            const currentStageObj = STAGES.find((s) => s.id === selectedMobileStage) || STAGES[0];
            return renderColumn(currentStageObj.id, currentStageObj.label, currentStageObj.icon, currentStageObj.color);
          })()}
        </div>
      </div>

      {/* Desktop Grid containing 5 Columns */}
      <div className="hidden md:grid md:grid-cols-5 gap-4">
        {STAGES.map((stage) => (
          <React.Fragment key={stage.id}>
            {renderColumn(stage.id, stage.label, stage.icon, stage.color)}
          </React.Fragment>
        ))}
      </div>

      {/* Payment Popup Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-sm w-full border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] space-y-3 max-h-[min(90vh,600px)] overflow-y-auto scrollbar-thin my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <CreditCard size={14} className="text-indigo-650 animate-pulse" />
                <span>إتمام عملية الدفع للعروس</span>
              </h3>
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentReceipt(null); }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 block text-right">نوع المعاملة المالية</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="fitting_fee">رسوم بروفة قياس (Trying Fee)</option>
                  <option value="deposit">دفعة عربون حجز (Deposit)</option>
                  <option value="balance">سداد متبقي الإيجار (Balance Payment)</option>
                  <option value="security_deposit">مبلغ تأمين مسترد (Security Deposit)</option>
                  <option value="late_fee">غرامة تأخير إرجاع (Late Fee)</option>
                  <option value="damage_fee">رسوم تلفيات / تنظيف (Damage/Cleaning)</option>
                  <option value="other">أخرى (Other)</option>
                </select>
              </div>

              <MultiPaymentMethodInput
                payments={customPayments}
                onChange={(updated) => {
                  setCustomPayments(updated);
                  const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                  setPaymentAmount(total > 0 ? total.toString() : '');
                }}
                label="طرق ومبالغ السداد"
                required
              />

              {/* Receipt Upload */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 block text-right">إرفاق إيصال الدفع / التحويل (اختياري)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPaymentReceipt(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="trying-fee-receipt-input-journey"
                  />
                  <label
                    htmlFor="trying-fee-receipt-input-journey"
                    className="flex-grow px-3 py-2 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-indigo-650 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                  >
                    <CreditCard size={12} className="inline mr-1" />
                    <span>{paymentReceipt ? 'تغيير الإيصال المرفق' : 'رفع صورة الإيصال 📎'}</span>
                  </label>
                  {paymentReceipt && (
                    <button
                      type="button"
                      onClick={() => setPaymentReceipt(null)}
                      className="p-2 bg-rose-50 border border-rose-100 text-rose-500 rounded-xl hover:bg-rose-100/60 transition-all cursor-pointer text-xs"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                {paymentReceipt && (
                  <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[80px] flex items-center justify-center bg-slate-50 mt-1">
                    <img src={paymentReceipt} alt="معاينة الإيصال" className="w-full h-full object-contain max-h-[75px]" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 block text-right">ملاحظات وتفاصيل التحويل</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="تفاصيل إضافية أو مرجع الحوالة..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none h-14"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95 text-center"
                >
                  {isSubmittingPayment ? 'جاري التسجيل...' : 'تأكيد الدفع'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPaymentModal(false); setPaymentReceipt(null); }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fitting Appointment Booking Popup Modal */}
      {showFittingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[min(90vh,620px)] sm:max-h-[min(88vh,660px)] my-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-3.5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <CalIcon size={14} className="text-indigo-650 animate-pulse" />
                <span>حجز موعد بروفة قياس جديدة</span>
              </h3>
              <button
                onClick={() => setShowFittingModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleFittingSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-3.5 sm:p-4 space-y-2.5 overflow-y-auto flex-1 min-h-0 text-right scrollbar-thin">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block text-right">تاريخ موعد القياس</label>
                    <input
                      type="date"
                      required
                      value={fittingDate}
                      onChange={(e) => setFittingDate(e.target.value)}
                      className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right ${
                        isFittingDateBlocked ? 'border-rose-300 bg-rose-50/20 text-rose-700' : 'bg-slate-50 border-slate-100'
                      }`}
                    />
                    {isFittingDateBlocked && (
                      <span className="text-[8.5px] font-bold text-rose-600 block mt-0.5 text-right">⚠️ هذا التاريخ غير متاح لتواجد الفستان بالأتيليه.</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block text-right">الوقت (الساعة)</label>
                    <select
                      required
                      value={fittingTime}
                      onChange={(e) => setFittingTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right pr-8"
                    >
                      {["01:00 م", "01:30 م", "02:00 م", "02:30 م", "03:00 م", "03:30 م", "04:00 م", "04:30 م", "05:00 م", "05:30 م", "06:00 م", "06:30 م", "07:00 م", "07:30 م", "08:00 م", "08:30 م"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100/80 text-right">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">
                    {bride.bookings?.[0]?.dress2 ? 'فساتين البروفة (الفستانين المحجوزين للعروس)' : 'فستان البروفة (الفستان المحجوز)'}
                  </label>
                  {(() => {
                    const booking = bride.bookings?.[0];
                    const bookedDress = booking?.dress;
                    const bookedDress2 = booking?.dress2;
                    if (bookedDress && bookedDress2) {
                      return (
                        <div className="space-y-2 mt-1">
                          <div className="p-2 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                            <div className="flex flex-col text-right">
                              <span className="text-xs font-black text-indigo-700">1. {bookedDress.name}</span>
                              <span className="text-[8.5px] font-bold text-slate-500">مقاس: {bookedDress.size || '—'} {bookedDress.code ? `(كود: ${bookedDress.code})` : ''}</span>
                            </div>
                            <span className="text-[9px] font-extrabold text-indigo-600 bg-white px-2 py-0.5 rounded-lg border border-indigo-100">فستان 1</span>
                          </div>
                          <div className="p-2 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
                            <div className="flex flex-col text-right">
                              <span className="text-xs font-black text-purple-700">2. {bookedDress2.name}</span>
                              <span className="text-[8.5px] font-bold text-slate-500">مقاس: {bookedDress2.size || '—'} {bookedDress2.code ? `(كود: ${bookedDress2.code})` : ''}</span>
                            </div>
                            <span className="text-[9px] font-extrabold text-purple-600 bg-white px-2 py-0.5 rounded-lg border border-purple-100">فستان 2</span>
                          </div>
                        </div>
                      );
                    }
                    if (bookedDress) {
                      return (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <span className="text-xs font-black text-indigo-650">{bookedDress.name} {bookedDress.code ? `(${bookedDress.code})` : ''}</span>
                          <span className="text-[9px] font-bold text-slate-500">مقاس: {bookedDress.size || '—'} | رسوم التجربة: {parseFloat(bookedDress.trying_fee || 0).toLocaleString()} ج.م</span>
                        </div>
                      );
                    }
                    return <span className="text-xs font-bold text-rose-500">لا يوجد فستان محجوز حالياً!</span>;
                  })()}
                </div>

                {parseFloat(tryingFee) > 0 && (
                  <MultiPaymentMethodInput
                    payments={fittingPayments}
                    onChange={(updated) => {
                      setFittingPayments(updated);
                      const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                      setTryingFee(total.toString());
                    }}
                    totalExpected={expectedFittingFee}
                    label="طرق وسداد رسوم القياس"
                    required
                  />
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">ملاحظات إضافية</label>
                  <textarea
                    value={fittingNotes}
                    onChange={(e) => setFittingNotes(e.target.value)}
                    placeholder="ملاحظات حول المقاسات أو تفاصيل الموعد..."
                    className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none h-12 min-h-[44px] text-right"
                  />
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="flex items-center gap-2.5 p-3 sm:p-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <button
                  type="submit"
                  disabled={isSubmitting || isFittingDateBlocked}
                  className={`flex-1 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md text-center ${
                    isSubmitting || isFittingDateBlocked
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-indigo-650 hover:bg-indigo-700 text-white shadow-indigo-600/10 active:scale-95'
                  }`}
                >
                  {isSubmitting ? 'جاري تسجيل الموعد...' : 'تأكيد وحجز موعد القياس'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFittingModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gown Booking Confirmation Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[min(92vh,720px)] my-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-3.5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <Heart size={14} className="text-rose-600 animate-pulse" />
                <span>تأكيد حجز فستان للعروس ({bride.name})</span>
              </h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={(e) => handleBookingSubmit(e, false)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1 min-h-0 text-right scrollbar-thin">

                {/* Sales Person Selection */}
                <div className="space-y-1 bg-amber-50/40 p-2.5 rounded-2xl border border-amber-150/70">
                  <label className="text-[10px] font-extrabold text-amber-900 block text-right flex items-center justify-between">
                    <span>مسؤول المبيعات / السيلز (Sales Person)</span>
                    <span className="text-[8.5px] font-normal text-amber-700">(اختياري)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <select
                      value={employeesList.some(e => e.name === salesName) ? salesName : (salesName ? '__custom__' : '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== '__custom__') {
                          setSalesName(val);
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
                    {(!employeesList.some(e => e.name === salesName) || salesName === '') && (
                      <input
                        type="text"
                        placeholder="أو اكتب اسم السيلز..."
                        value={salesName}
                        onChange={(e) => setSalesName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right"
                      />
                    )}
                  </div>
                </div>

                {/* Dress 1 Selection with Fast Search */}
                <div className="space-y-1.5 bg-rose-50/20 p-2.5 rounded-2xl border border-rose-100">
                  <label className="text-[10px] font-black text-rose-900 block text-right">👗 الفستان الأساسي (الفستان 1)</label>
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

                  {/* Filtered dress buttons / selection list */}
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
                        const isSelected = bookingDressId === d.id.toString();
                        return (
                          <button
                            type="button"
                            key={d.id}
                            onClick={() => {
                              setBookingDressId(d.id.toString());
                              const p1 = parseFloat(d.rental_price || 0);
                              const d2 = bookingHasSecondDress ? dressesList.find(x => x.id.toString() === bookingDress2Id) : null;
                              const p2 = parseFloat(d2?.rental_price || 0);
                              setBookingTotalAmount((p1 + p2).toString());
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-rose-50 hover:border-rose-200'
                            }`}
                          >
                            {d.name} {d.code ? <span className="opacity-75 font-mono text-[9px]">({d.code})</span> : ''}
                          </button>
                        );
                      })}
                  </div>

                  {/* Currently selected dress indicator */}
                  {(() => {
                    const activeDress = dressesList.find((d) => d.id.toString() === bookingDressId);
                    if (!activeDress) return null;
                    return (
                      <div className="text-[10px] font-extrabold text-rose-700 bg-rose-50/70 border border-rose-100 px-2.5 py-1 rounded-lg flex items-center justify-between">
                        <span>الفستان 1 المختار: <strong className="font-black">{activeDress.name}</strong></span>
                        <span className="font-mono text-[9.5px] text-rose-800">السعر: {activeDress.rental_price} ج.م</span>
                      </div>
                    );
                  })()}

                  {isBookingDateBlocked && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[9px] font-bold text-rose-700 text-right">
                      ⚠️ الفستان الأول غير متوفر في هذا التاريخ لتقاطعه مع حجز آخر. يمكنك المتابعة وتأكيد الحجز بتجاوز التعارض.
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
                        const d1 = dressesList.find(d => d.id.toString() === bookingDressId);
                        const d2 = dressesList.find(d => d.id.toString() === bookingDress2Id);
                        const p1 = parseFloat(d1?.rental_price || 0);
                        const p2 = checked && d2 ? parseFloat(d2?.rental_price || 0) : 0;
                        setBookingTotalAmount((p1 + p2).toString());
                        setBookingInsuranceAmount(checked ? '10000' : '5000');
                      }}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                    />
                  </label>

                  {bookingHasSecondDress && (
                    <div className="space-y-1.5 pt-1 border-t border-purple-100">
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
                          .filter((d) => d.id.toString() !== bookingDressId)
                          .filter((d) => {
                            if (!bookingDress2Search.trim()) return true;
                            const q = bookingDress2Search.toLowerCase().trim();
                            return d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q);
                          })
                          .map((d) => {
                            const isSelected = bookingDress2Id === d.id.toString();
                            return (
                              <button
                                type="button"
                                key={d.id}
                                onClick={() => {
                                  setBookingDress2Id(d.id.toString());
                                  const d1 = dressesList.find(x => x.id.toString() === bookingDressId);
                                  const p1 = parseFloat(d1?.rental_price || 0);
                                  const p2 = parseFloat(d.rental_price || 0);
                                  setBookingTotalAmount((p1 + p2).toString());
                                }}
                                className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-purple-600 border-purple-600 text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-purple-50'
                                }`}
                              >
                                {d.name} {d.code ? `(${d.code})` : ''} - {d.rental_price} ج.م
                              </button>
                            );
                          })}
                      </div>

                      {bookingDress2Id && (() => {
                        const activeDress2 = dressesList.find((d) => d.id.toString() === bookingDress2Id);
                        if (!activeDress2) return null;
                        return (
                          <div className="text-[10px] font-extrabold text-purple-800 bg-purple-100/60 border border-purple-200 px-2.5 py-1 rounded-lg flex items-center justify-between">
                            <span>الفستان 2 المختار: <strong className="font-black">{activeDress2.name}</strong></span>
                            <span className="font-mono text-[9.5px]">السعر: {activeDress2.rental_price} ج.م</span>
                          </div>
                        );
                      })()}

                      {isBookingDate2Blocked && (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[9px] font-bold text-rose-700 text-right">
                          ⚠️ الفستان الثاني غير متوفر في هذا التاريخ لتقاطعه مع حجز آخر. يمكنك المتابعة وتأكيد الحجز بتجاوز التعارض.
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
                      value={bookingPhone}
                      onChange={(e) => setBookingPhone(e.target.value)}
                      placeholder="مثال: 01012345678"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block text-right">رقم هاتف إضافي (اختياري)</label>
                    <input
                      type="tel"
                      value={bookingPhone2}
                      onChange={(e) => setBookingPhone2(e.target.value)}
                      placeholder="رقم آخر / مرافق..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">تاريخ الفرح / المناسبة</label>
                  <input
                    type="date"
                    required
                    value={bookingEventDate}
                    onChange={(e) => setBookingEventDate(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right ${
                      (isBookingDateBlocked || isBookingDate2Blocked) ? 'border-amber-300 bg-amber-50/20 text-amber-900' : 'bg-slate-50 border-slate-150'
                    }`}
                  />
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
                    setBookingDepositAmount(total.toString());
                  }}
                  label="سداد وطرق دفع العربون"
                  required
                />

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">ملاحظات إضافية</label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="ملاحظات وتعديلات الفستان المطلوبة..."
                    className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none h-12 min-h-[44px] text-right"
                  />
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="flex items-center gap-2.5 p-3 sm:p-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md text-center active:scale-95"
                >
                  {isSubmitting ? 'جاري الحفظ...' : (isBookingDateBlocked || isBookingDate2Blocked) ? 'تأكيد الحجز (يوجد تعارض)' : 'تأكيد الحجز وتثبيت التاريخ'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conflict Override Confirmation Dialog Modal */}
      {showConflictConfirmDialog && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[10000] flex items-center justify-center p-3 sm:p-4 text-right animate-fade-in" dir="rtl">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md border border-amber-200 shadow-2xl p-5 space-y-4 my-auto">
            <div className="flex items-center gap-2.5 text-amber-600 border-b border-amber-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">تنبيه: تعارض في مواعيد حجز الفستان</h3>
                <p className="text-[10px] text-slate-500 font-bold">يوجد حجز آخر أو فترة تسليم تتقاطع مع هذا التاريخ</p>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs font-bold text-amber-900 leading-relaxed">
              <p>{conflictWarningMessage || 'هذا الفستان محجوز لعميلة أخرى في هذه الفترة أو قيد الإرجاع والتنظيف.'}</p>
              <div className="text-[11px] text-slate-600 font-normal pt-1 border-t border-amber-200/60">
                هل ترغب في المتابعة وتأكيد الحجز وتجاوز هذا التعارض على مسؤوليتك؟
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleBookingSubmit(null, true)}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-600/20 active:scale-95 text-center flex items-center justify-center gap-1.5"
              >
                <span>⚡ تأكيد الحجز رغم التعارض</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConflictConfirmDialog(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                تغيير الفستان / الموعد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bride Journey Details Popup Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-right animate-fade-in overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[min(90vh,640px)] sm:max-h-[min(88vh,700px)] my-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <CalIcon size={16} className="text-indigo-600 animate-pulse" />
                <span>تفاصيل رحلة العروس والطلب الحالي</span>
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0 scrollbar-thin">
              {/* Client Info Section */}
              <div className="bg-indigo-50/25 p-4 rounded-2xl border border-indigo-100/50 space-y-2">
                <h4 className="text-xs font-black text-indigo-900 border-b border-indigo-100/60 pb-1.5 mb-2">👰🏻‍♀️ بيانات العروس الأساسية</h4>
                <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                  <div><span className="text-slate-400 font-medium">الاسم:</span> {bride.name}</div>
                  <div><span className="text-slate-400 font-medium">رقم الهاتف:</span> <span className="font-mono">{bride.phone}</span></div>
                  <div><span className="text-slate-400 font-medium">المحافظة/المدينة:</span> {bride.city || 'غير محدد'}</div>
                  <div><span className="text-slate-400 font-medium">المرحلة الحالية:</span> <span className="text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-md text-[10px]">{STAGES.find((s) => s.id === bride.current_stage)?.label || bride.current_stage}</span></div>
                </div>
              </div>

              {/* Stage-Specific Content */}
              {(() => {
              const booking = bride.bookings && bride.bookings.length > 0 ? bride.bookings[0] : null;

              // Visit Stage Details
              if (bride.current_stage === 'visit') {
                return (
                  <div className="space-y-4">
                      <div className="bg-rose-50/20 p-4 rounded-2xl border border-rose-100/50 space-y-2.5">
                        <h4 className="text-xs font-black text-rose-900 border-b border-rose-100/60 pb-1.5">🌸 تفاصيل زيارة تجربة الفساتين</h4>
                        <div className="space-y-2 text-xs font-bold text-slate-700">
                          <div><span className="text-slate-400 font-medium">تاريخ الزيارة المفضل:</span> <span className="font-mono text-indigo-600">{bride.latest_visit_date || 'غير محدد'}</span></div>
                          {booking &&
                        <div className="mt-3 p-3 bg-white rounded-xl border border-slate-100 space-y-2">
                              <span className="text-[10px] font-black text-slate-400 block mb-1">الفساتين المطلوبة للتجربة:</span>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                <span>1. {booking.dress?.name || 'غير محدد'}</span>
                              </div>
                              {booking.dress_2_id &&
                          <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                  <span>2. {booking.dress2?.name || 'فستان إضافي 2'}</span>
                                </div>
                          }
                              {booking.dress_3_id &&
                          <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                  <span>3. {booking.dress3?.name || 'فستان إضافي 3'}</span>
                                </div>
                          }
                            </div>
                        }
                        </div>
                      </div>
                    </div>);

              }

              // Booking/Fitting/Picked Up/Returned Stage Details
              if (booking) {
                const totalPaid = booking.revenues?.reduce((sum, r) => sum + parseFloat(r.amount), 0) || parseFloat(booking.deposit_amount || 0);
                const remaining = parseFloat(booking.total_amount || 0) - totalPaid;

                return (
                  <div className="space-y-4">
                      {/* Gown details */}
                      <div className="bg-rose-50/20 p-4 rounded-2xl border border-rose-100/50 space-y-2.5">
                        <h4 className="text-xs font-black text-rose-900 border-b border-rose-100/60 pb-1.5 flex items-center justify-between">
                          <span>👗 الفساتين المعتمدة والمحجوزة</span>
                          {booking.sales_name && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-150">
                              السيلز: {booking.sales_name}
                            </span>
                          )}
                        </h4>
                        
                        {/* Dress 1 */}
                        <div className="flex items-start gap-3 bg-white p-2.5 rounded-xl border border-slate-100">
                          {booking.dress?.image_url &&
                            <img src={booking.dress.image_url} alt="dress" className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
                          }
                          <div className="space-y-0.5 text-xs font-bold text-slate-700 flex-grow">
                            <div className="text-rose-700 font-black">1. {booking.dress?.name || 'غير محدد'}</div>
                            <div className="text-[10px] text-slate-500 font-normal">كود: {booking.dress?.code || '—'} | الإيجار: {booking.dress?.rental_price || 0} ج.م</div>
                          </div>
                        </div>

                        {/* Dress 2 if present */}
                        {booking.dress2 && (
                          <div className="flex items-start gap-3 bg-white p-2.5 rounded-xl border border-purple-100">
                            {booking.dress2?.image_url &&
                              <img src={booking.dress2.image_url} alt="dress 2" className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
                            }
                            <div className="space-y-0.5 text-xs font-bold text-slate-700 flex-grow">
                              <div className="text-purple-700 font-black">2. {booking.dress2?.name} (فستان إضافي)</div>
                              <div className="text-[10px] text-slate-500 font-normal">كود: {booking.dress2?.code || '—'} | الإيجار: {booking.dress2?.rental_price || 0} ج.م</div>
                            </div>
                          </div>
                        )}

                        <div className="pt-1 text-xs font-bold text-slate-600">
                          <span>تاريخ المناسبة / الزفاف: </span>
                          <span className="font-mono text-rose-600">{booking.event_date ? booking.event_date.split('T')[0].split(' ')[0] : 'غير محدد'}</span>
                          {booking.is_override && (
                            <span className="mr-2 text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                              ⚠️ تم تأكيد الحجز بتجاوز التعارض
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Financial details */}
                      <div className="bg-emerald-50/20 p-4 rounded-2xl border border-emerald-100/50 space-y-2.5">
                        <h4 className="text-xs font-black text-emerald-900 border-b border-emerald-100/60 pb-1.5">💰 الوضع المالي والمدفوعات</h4>
                        <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                          <div><span className="text-slate-400 font-medium">إجمالي قيمة الإيجار:</span> {booking.total_amount} ج.م</div>
                          <div><span className="text-slate-400 font-medium">العربون / المدفوع:</span> {totalPaid} ج.م</div>
                          <div><span className="text-slate-400 font-medium">مبلغ التأمين:</span> {booking.insurance_amount || 5000} ج.م</div>
                          <div><span className="text-slate-400 font-medium">المبلغ المتبقي:</span> <span className={`${remaining > 0 ? 'text-rose-600 font-black' : 'text-emerald-600'}`}>{remaining} ج.م</span></div>
                        </div>
                        {booking.revenues && booking.revenues.length > 0 &&
                      <div className="space-y-1.5 mt-2 bg-white p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 block mb-1">تاريخ عمليات الدفع:</span>
                            {booking.revenues.map((rev, idx) =>
                        <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                                <span>{rev.amount} ج.م ({PAYMENT_METHODS.find((m) => m.id === rev.payment_method)?.label || rev.payment_method})</span>
                                <span className="font-mono text-slate-400">{rev.payment_date ? rev.payment_date.split('T')[0].split(' ')[0] : ''}</span>
                              </div>
                        )}
                          </div>
                      }
                      </div>

                      {/* Fittings if in fitting or later stages */}
                      {bride.fittings && bride.fittings.length > 0 &&
                    <div className="bg-amber-50/20 p-4 rounded-2xl border border-amber-100/50 space-y-2.5">
                          <h4 className="text-xs font-black text-amber-900 border-b border-amber-100/60 pb-1.5">📐 سجل البروفات والقياس</h4>
                          <div className="space-y-2">
                            {bride.fittings.map((fit, idx) =>
                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                                <div className="space-y-0.5 text-right">
                                  <div>بروفة رقم #{idx + 1}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{fit.fitting_date}</div>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-md ${fit.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {fit.status === 'completed' ? 'مكتملة' : 'مجدولة'}
                                </span>
                              </div>
                        )}
                          </div>
                        </div>
                    }
                    </div>);

              }

              // Fallback if no booking exists but not in visit stage
              return (
                <div className="text-center py-6 text-slate-400 font-bold text-xs">
                    لا توجد تفاصيل حجز أو فستان مسجلة لهذه العروس بعد.
                  </div>);

            })()}
            </div>
                        {/* Footer */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0 text-center">
              <button
              onClick={() => setShowDetailsModal(false)}
              className="px-6 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer">
              
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finances & Stage Revert Modal */}
      {showFinancesModal && (
        <BookingFinancesModal
          isOpen={showFinancesModal}
          booking={bride.bookings?.[0]}
          onClose={() => setShowFinancesModal(false)}
          onUpdate={onStageUpdate}
        />
      )}
    </div>);

}