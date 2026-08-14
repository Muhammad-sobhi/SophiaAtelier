import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
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
  CreditCard } from
'lucide-react';





























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
  const [selectedMobileStage, setSelectedMobileStage] = useState(bride?.current_stage || 'visit');

  React.useEffect(() => {
    setSelectedMobileStage(bride?.current_stage || 'visit');
  }, [bride?.id, bride?.current_stage]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentType, setPaymentType] = useState('fitting_fee');
  const [paymentNotes, setPaymentNotes] = useState('');

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
  const [fittingPaymentMethod, setFittingPaymentMethod] = useState('cash');
  const [fittingNotes, setFittingNotes] = useState('');
  const [dressesList, setDressesList] = useState([]);
  const [dressDetails, setDressDetails] = useState(null);
  const [fittingReceipt, setFittingReceipt] = useState(null);

  // Booking modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDressId, setBookingDressId] = useState('');
  const [bookingDressSearch, setBookingDressSearch] = useState('');
  const [bookingPhone, setBookingPhone] = useState(bride.phone || '');
  const [bookingEventDate, setBookingEventDate] = useState(bride.wedding_date || new Date().toISOString().split('T')[0]);
  const [bookingTotalAmount, setBookingTotalAmount] = useState('0');
  const [bookingDepositAmount, setBookingDepositAmount] = useState('0');
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState('instapay');
  const [bookingReceipt, setBookingReceipt] = useState(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  React.useEffect(() => {
    setBookingPhone(bride.phone || '');
  }, [bride.id, bride.phone]);

  React.useEffect(() => {
    if (showFittingModal) {
      const bookedDressId = bride.bookings?.[0]?.dress_id;
      if (bookedDressId) {
        setFittingDressId(bookedDressId.toString());
        const bookedDress = bride.bookings?.[0]?.dress;
        if (bookedDress) {
          setTryingFee(parseFloat(bookedDress.trying_fee || 0).toString());
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
            setTryingFee(fee > 0 ? fee.toString() : '0');
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

  // Calculate if selected wedding/booking date is blocked
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
      await apiClient.put(`/clients/${bride.id}/stage-action`, {
        action: 'schedule_fitting',
        fitting_date: fittingDate,
        fitting_time: fittingTime,
        dress_id: parseInt(fittingDressId),
        trying_fee: parseFloat(tryingFee || '0'),
        payment_method: fittingPaymentMethod,
        notes: fittingNotes,
        receipt_image: fittingReceipt
      });
      setShowFittingModal(false);
      setFittingReceipt(null);
      onStageUpdate?.();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const activePhone = bookingPhone.trim() || bride.phone || '';
      await apiClient.put(`/clients/${bride.id}/stage-action`, {
        action: 'confirm_booking',
        phone: activePhone,
        dress_id: parseInt(bookingDressId),
        event_date: bookingEventDate,
        total_amount: parseFloat(bookingTotalAmount),
        deposit_amount: parseFloat(bookingDepositAmount),
        payment_method: bookingPaymentMethod,
        receipt_image: bookingReceipt,
        notes: bookingNotes
      });
      setShowBookingModal(false);
      setBookingReceipt(null);
      onStageUpdate?.();

      // WhatsApp redirection
      const visitDate = bookingEventDate || bride.wedding_date || bride.latest_visit_date || '';
      let visitTime = bride.latest_visit_time || bride.visits?.[0]?.time_slot;
      if (!visitTime || visitTime === 'غير محدد') {
        const match = bride.notes?.match(/(?:وقت المقابلة:?\s*)?([0-1]?\d:[0-5]\d(?:\s*(?:م|ص|AM|PM|am|pm))?)/i);
        visitTime = match ? match[1].trim() : 'خلال أوقات العمل الرسمية (من ١:٠٠ م حتى ٨:٣٠ م)';
      }
      const dress = dressesList.find((d) => d.id.toString() === bookingDressId);
      const dressText = dress ? `\n• *فستان الزفاف:* ${dress.name}` : '';

      let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${bride.name}* 🤍،\nيسعدنا جداً تأكيد حجز موعدكِ وتجهيز فستان أحلامكِ!\n\n📅 *تفاصيل الموعد:*\n• *التاريخ:* ${visitDate}\n• *الوقت:* ${visitTime}\n${dressText}\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nنحن بانتظار تشريفكِ لتنيري المكان ✨🎀`;

      try {
        const templates = await apiClient.get('/whatsapp-templates');
        const t = templates.find((x) => x.key === 'booking_confirmation');
        if (t) {
          message = t.body.
          replace(/\{\{client_name\}\}/g, bride.name).
          replace(/\{\{wedding_date\}\}/g, bride.wedding_date || visitDate).
          replace(/\{\{visit_date\}\}/g, visitDate).
          replace(/\{\{visit_time\}\}/g, visitTime).
          replace(/\{\{dress_line\}\}/g, dress ? `${dress.name}` : '');
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
      alert(err?.message || 'حدث خطأ أثناء حفظ حجز الفستان');
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

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingPayment(true);
      const amountNum = parseFloat(paymentAmount);
      if (!isNaN(amountNum) && amountNum > 0) {
        await apiClient.post('/revenues', {
          type: paymentType,
          amount: amountNum,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString().split('T')[0],
          notes: paymentNotes || (paymentType === 'fitting_fee' ? `رسوم قياس للعروس: ${bride.name}` : `دفعة حجز للعروس: ${bride.name}`)
        });
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentMethod('cash');
        setPaymentNotes('');
        onStageUpdate?.();
      }
    } catch (e) {
      console.error('Failed to record payment:', e);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const openPaymentModalFor = (type) => {
    setPaymentType(type);
    setPaymentAmount(type === 'fitting_fee' ? '150' : '');
    setPaymentNotes(type === 'fitting_fee' ? `رسوم قياس للعروس: ${bride.name}` : `دفعة حجز للعروس: ${bride.name}`);
    setPaymentMethod('cash');
    setShowPaymentModal(true);
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
        <div className="flex-1 min-h-[220px]">
          {isActive ?
          <div
            onClick={() => setShowDetailsModal(true)}
            className="bg-white rounded-2xl border border-slate-150 p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative transition-all duration-300 hover:shadow-md flex flex-col justify-between h-full cursor-pointer hover:border-indigo-400">
            
              <div>
                {/* Bride Image with Source Badge */}
                <div className="relative w-full h-28 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 mb-3 flex-shrink-0">
                  <img
                  src={avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'}
                  alt={bride.name}
                  className="w-full h-full object-cover" />
                
                  {bride.source &&
                <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {bride.source}
                    </span>
                }
                </div>

                {/* Bride Details */}
                <div className="mb-3 space-y-1">
                  <h4 className="text-xs font-black text-slate-800 tracking-tight text-right">{bride.name}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-550 justify-end">
                    <span className="font-mono">{bride.phone || '—'}</span>
                    <Phone size={10} className="text-slate-400" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-550 justify-end">
                    <span>{bride.city || 'Cairo'}</span>
                    <MapPin size={10} className="text-slate-400" />
                  </div>
                </div>

                {/* Gown Info if selected */}
                {bride.latest_dress_name &&
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[9px] font-extrabold text-slate-650 mb-3 text-right">
                    <span className="text-[7.5px] text-slate-400 block mb-0.5 uppercase tracking-wider">Gown Details</span>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600 font-mono">{bride.latest_dress_name}</span>
                      <span className="text-slate-400">الفستان:</span>
                    </div>
                    {bride.latest_visit_date &&
                <div className="flex justify-between items-center mt-0.5">
                        <span>{bride.latest_visit_date}</span>
                        <span className="text-slate-400">التاريخ:</span>
                      </div>
                }
                  </div>
              }

                {/* Pickup details and blockout periods */}
                {stageId === 'picked_up' && (bride.wedding_date || bride.bookings?.[0]?.event_date) && (() => {
                const weddingDateStr = bride.bookings?.[0]?.event_date || bride.wedding_date;
                const weddingDate = new Date(weddingDateStr);
                const cityLower = (bride.city || '').toLowerCase();
                const isCairoOrGiza = !bride.city || bride.city === 'القاهرة' || bride.city === 'الجيزة' || cityLower.includes('cairo') || cityLower.includes('giza');
                const pickupDaysBefore = isCairoOrGiza ? 1 : 2;
                const pickupDate = new Date(weddingDate.getTime() - pickupDaysBefore * 24 * 60 * 60 * 1000);
                const day = String(pickupDate.getDate()).padStart(2, '0');
                const month = String(pickupDate.getMonth() + 1).padStart(2, '0');
                const year = pickupDate.getFullYear();
                const pickupDateFormatted = `${year}-${month}-${day}`;

                const blockoutDaysBefore = isCairoOrGiza ? 2 : 3;
                const blockoutStart = new Date(weddingDate.getTime() - blockoutDaysBefore * 24 * 60 * 60 * 1000);
                const blockoutEnd = new Date(weddingDate.getTime() + 1 * 24 * 60 * 60 * 1000);
                const formatD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                return (
                  <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-100/50 text-[9px] font-bold text-amber-850 space-y-1 text-right mb-3">
                      <div>✨ <span className="font-extrabold text-amber-900">موعد الاستلام:</span> {pickupDateFormatted}</div>
                      <div className="text-[7.5px] text-amber-600 font-medium leading-normal">🔒 حظر الفستان: من {formatD(blockoutStart)} إلى {formatD(blockoutEnd)}</div>
                    </div>);

              })()}
              </div>
              {/* Action Buttons */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex-shrink-0 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                {(() => {
                if (stageId === 'visit') {
                  return (
                    <div className="space-y-1.5">
                        <button
                        disabled={isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStageAction('confirm_visit');
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer shadow-xs">
                        
                          {isSubmitting ? 'جاري الحفظ...' : 'تأكيد موعد الزيارة 💬'}
                        </button>
                        <button
                        disabled={isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowBookingModal(true);
                        }}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer shadow-xs">
                        
                          حجز فستان الزفاف 👗
                        </button>
                      </div>);

                }

                if (stageId === 'booking') {
                  return (
                    <button
                      disabled={isSubmitting}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFittingModal(true);
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer shadow-xs">
                      
                        حجز موعد بروفة قياس 📏
                      </button>);

                }

                if (stageId === 'fitting') {
                  return (
                    <div className="space-y-1.5">
                        <button
                        disabled={isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFittingModal(true);
                        }}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer shadow-xs">
                        
                          إضافة بروفة إضافية ➕
                        </button>
                        <button
                        disabled={isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStageAction('end_fitting');
                        }}
                        className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer shadow-xs">
                        
                          إنهاء البروفات 🏁
                        </button>
                      </div>);

                }

                if (stageId === 'picked_up') {
                  const booking = bride.bookings?.[0];
                  if (booking?.status === 'picked_up') {
                    return (
                      <button
                        disabled={isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReturnClick?.(bride);
                        }}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer shadow-xs">
                        
                          تسجيل إرجاع الفستان 🔄
                        </button>);

                  }
                  return (
                    <div className="space-y-1.5">
                        <button
                        disabled={isSubmitting}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const brideName = (bride.name || '').trim() || 'عروسنا الجميلة';
                          const weddingDateRaw = bride.wedding_date || bride.bookings?.[0]?.event_date || '';
                          const weddingDate = weddingDateRaw ? weddingDateRaw.split(' ')[0].split('T')[0] : '';
                          const cityLower = (bride.city || '').toLowerCase();
                          const isCairoOrGiza = !bride.city || bride.city === 'القاهرة' || bride.city === 'الجيزة' || cityLower.includes('cairo') || cityLower.includes('giza');
                          const pickupDaysBefore = isCairoOrGiza ? 1 : 2;
                          let pickupDateFormatted = 'غير محدد';
                          if (weddingDate) {
                            try {
                              const parts = weddingDate.split('-');
                              if (parts.length >= 3) {
                                const year = parseInt(parts[0], 10);
                                const month = parseInt(parts[1], 10) - 1;
                                const day = parseInt(parts[2], 10);
                                const pD = new Date(year, month, day - pickupDaysBefore);
                                const dd = String(pD.getDate()).padStart(2, '0');
                                const mm = String(pD.getMonth() + 1).padStart(2, '0');
                                const yyyy = pD.getFullYear();
                                pickupDateFormatted = `${yyyy}-${mm}-${dd}`;
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }

                          let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${brideName}* 🤍👰🏻‍♀️،\nنود تذكيركِ بموعد استلام فستان زفافكِ المختار من فساتين صوفيا!\n\n📅 *موعد الاستلام:* ${pickupDateFormatted}\n📍 *العنوان:* التجمع الأول - الياسمين 2 - فيلا 161 (الباب الجانبي)\n\nنحن بانتظاركِ وتجهيز كل التفاصيل لتكوني أجمل عروس ✨🎀`;
                          try {
                            const templates = await apiClient.get('/whatsapp-templates');
                            const list = Array.isArray(templates) ? templates : templates.data || [];
                            const t = list.find((x) => x.key === 'pickup_reminder');
                            if (t) {
                              message = t.body.
                              replace(/\{\{client_name\}\}/g, brideName).
                              replace(/\{\{wedding_date\}\}/g, weddingDate || 'غير محدد').
                              replace(/\{\{pickup_date\}\}/g, pickupDateFormatted);
                            }
                          } catch (err) {
                            console.error('Failed to fetch whatsapp template:', err);
                          }

                          const cleanPhone = (bride.phone || '').replace(/[^\d]/g, '');
                          if (cleanPhone) {
                            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
                            window.open(whatsappUrl, '_blank');
                          }
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1">
                        
                          <span>تذكير بموعد الاستلام 💬</span>
                        </button>
                        <button
                        disabled={isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPickupClick?.(bride);
                        }}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer shadow-xs">
                        
                          تسليم الفستان للعروس 👗
                        </button>
                      </div>);

                }

                return (
                  <div className="text-center py-2 text-emerald-600 font-black text-[9px] bg-emerald-50 border border-emerald-100 rounded-xl">
                      ✓ الرحلة مكتملة
                    </div>);

              })()}
              </div>
            </div> :

          <div className="h-full border border-dashed border-slate-200/60 rounded-2xl flex items-center justify-center bg-slate-50/20 p-4 min-h-[220px]">
              <span className="text-[10px] font-bold text-slate-350">—</span>
            </div>
          }
        </div>
      </div>);

  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-4 sm:p-6 shadow-xs animate-fade-in text-right h-full" dir="rtl">
      {/* Title Header */}
      <div className="border-b border-slate-100 pb-3.5 mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">
            متابعة رحلة العروس: {bride?.name || ''}
          </h2>
          <p className="text-[9px] text-slate-400 font-extrabold mt-0.5">مخطط وجدول مراحل العروس بالأكاديمية والورشة</p>
        </div>
        <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100">
          المرحلة الحالية: {bride?.current_stage ? bride.current_stage.toUpperCase() : 'VISIT'}
        </span>
      </div>

      {/* Mobile Stage Selector Tabs (visible only on mobile) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-3 mb-4 border-b border-slate-100 scrollbar-none">
        {STAGES.map((s) => {
          const isSelected = selectedMobileStage === s.id;
          const isCurrentStage = bride?.current_stage === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedMobileStage(s.id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isCurrentStage
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span>{s.label.split(' ')[0]}</span>
              {isCurrentStage && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* Desktop Grid containing 5 Columns */}
      <div className="hidden md:grid md:grid-cols-5 gap-4">
        {STAGES.map((stage) =>
          renderColumn(stage.id, stage.label, stage.icon, stage.color)
        )}
      </div>

      {/* Mobile Single Selected Stage Display */}
      <div className="block md:hidden">
        {(() => {
          const stageObj = STAGES.find((s) => s.id === selectedMobileStage) || STAGES[0];
          return renderColumn(stageObj.id, stageObj.label, stageObj.icon, stageObj.color);
        })()}
      </div>

      {/* Payment Popup Modal */}
      {showPaymentModal &&
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <CreditCard size={14} className="text-indigo-650 animate-pulse" />
                <span>إتمام عملية الدفع للعروس</span>
              </h3>
              <button
              onClick={() => setShowPaymentModal(false)}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-4 text-slate-700">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 block text-right">نوع الدفعة</label>
                <input
                type="text"
                disabled
                value={paymentType === 'fitting_fee' ? 'رسوم تجربة (قياس)' : 'مقدم حجز فستان'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-500 focus:outline-none" />
              
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">المبلغ (ج.م)</label>
                  <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-center font-mono" />
                
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">طريقة الدفع</label>
                  <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none">
                  
                    {PAYMENT_METHODS.map((pm) =>
                  <option key={pm.id} value={pm.id}>{pm.label}</option>
                  )}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 block text-right">ملاحظات وتفاصيل التحويل</label>
                <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="تفاصيل إضافية أو مرجع الحوالة..."
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none h-20" />
              
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                type="submit"
                disabled={isSubmittingPayment}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95 text-center">
                
                  {isSubmittingPayment ? 'جاري التسجيل...' : 'تأكيد الدفع'}
                </button>
                <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Fitting Appointment Booking Popup Modal */}
      {showFittingModal &&
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <CalIcon size={14} className="text-indigo-650 animate-pulse" />
                <span>حجز موعد بروفة قياس جديدة</span>
              </h3>
              <button
              onClick={() => setShowFittingModal(false)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={14} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleFittingSubmit} className="flex flex-col flex-grow min-h-0 overflow-hidden">
              <div className="p-4 space-y-3 overflow-y-auto flex-grow text-right scrollbar-thin">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block text-right">تاريخ موعد القياس</label>
                    <input
                    type="date"
                    required
                    value={fittingDate}
                    onChange={(e) => setFittingDate(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right ${
                    isFittingDateBlocked ? 'border-rose-300 bg-rose-50/20 text-rose-700' : 'bg-slate-50 border-slate-100'}`
                    } />
                  
                    {isFittingDateBlocked &&
                  <span className="text-[8.5px] font-bold text-rose-600 block mt-0.5 text-right">⚠️ هذا التاريخ غير متاح لتواجد الفستان بالأتيليه.</span>
                  }
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block text-right">الوقت (الساعة)</label>
                    <select
                    required
                    value={fittingTime}
                    onChange={(e) => setFittingTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right pr-8">
                    
                      {["01:00 م", "01:30 م", "02:00 م", "02:30 م", "03:00 م", "03:30 م", "04:00 م", "04:30 م", "05:00 م", "05:30 م", "06:00 م", "06:30 م", "07:00 م", "07:30 م", "08:00 م", "08:30 م"].map((t) =>
                    <option key={t} value={t}>{t}</option>
                    )}
                    </select>
                  </div>
                </div>

                <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80 text-right">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">فستان البروفة (الفستان المحجوز)</label>
                  {(() => {
                  const booking = bride.bookings?.[0];
                  const bookedDress = booking?.dress;
                  if (bookedDress) {
                    return (
                      <div className="flex flex-col gap-1 mt-1">
                          <span className="text-xs font-black text-indigo-650">{bookedDress.name}</span>
                          <span className="text-[9px] font-bold text-slate-500">مقاس: {bookedDress.size || '—'} | رسوم التجربة والقياس: {parseFloat(bookedDress.trying_fee || 0).toLocaleString()} ج.م</span>
                        </div>);

                  }
                  return <span className="text-xs font-bold text-rose-500">لا يوجد فستان محجوز حالياً!</span>;
                })()}
                </div>

                {parseFloat(tryingFee) > 0 &&
              <div className="grid grid-cols-2 gap-3 bg-indigo-50/20 border border-indigo-150 p-2.5 rounded-2xl animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 block text-right">رسوم القياس المستحقة</label>
                      <input
                    type="text"
                    disabled
                    value={`${parseFloat(tryingFee).toLocaleString()} ج.م`}
                    className="w-full px-3 py-1.5 bg-white border border-slate-150 rounded-xl text-xs font-black text-indigo-650 text-right" />
                  
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 block text-right">طريقة دفع الرسوم</label>
                      <select
                    value={fittingPaymentMethod}
                    onChange={(e) => setFittingPaymentMethod(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right pr-8">
                    
                        {PAYMENT_METHODS.map((pm) =>
                    <option key={pm.id} value={pm.id}>{pm.label}</option>
                    )}
                      </select>
                    </div>
                  </div>
              }

                {/* Upload Receipt */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">إرفاق إيصال الدفع (اختياري)</label>
                  <div className="flex items-center gap-2">
                    <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFittingReceipt(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="fitting-receipt-file-input" />
                  
                    <label
                    htmlFor="fitting-receipt-file-input"
                    className="flex-grow px-3 py-1.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-indigo-600 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-center gap-1 transition-all">
                    
                      <CreditCard size={12} />
                      <span>{fittingReceipt ? 'تغيير الإيصال المرفق' : 'رفع إيصال'}</span>
                    </label>
                    {fittingReceipt &&
                  <button
                    type="button"
                    onClick={() => setFittingReceipt(null)}
                    className="p-1.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-xl hover:bg-rose-100/60 transition-all cursor-pointer text-xs">
                    
                        <X size={12} />
                      </button>
                  }
                  </div>
                  {fittingReceipt &&
                <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[80px] flex items-center justify-center bg-slate-50 mt-1">
                      <img src={fittingReceipt} alt="معاينة الإيصال" className="w-full h-full object-contain max-h-[75px]" />
                    </div>
                }
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">ملاحظات إضافية</label>
                  <textarea
                  value={fittingNotes}
                  onChange={(e) => setFittingNotes(e.target.value)}
                  placeholder="ملاحظات حول المقاسات أو تفاصيل الموعد..."
                  className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none h-14 text-right" />
                
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="flex items-center gap-3 p-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <button
                type="submit"
                disabled={isSubmitting || isFittingDateBlocked}
                className={`flex-1 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md text-center ${
                isSubmitting || isFittingDateBlocked ?
                'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' :
                'bg-indigo-650 hover:bg-indigo-700 text-white shadow-indigo-600/10 active:scale-95'}`
                }>
                
                  {isSubmitting ? 'جاري تسجيل الموعد...' : 'تأكيد وحجز موعد القياس'}
                </button>
                <button
                type="button"
                onClick={() => setShowFittingModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }
      {/* Gown Booking Confirmation Modal */}
      {showBookingModal &&
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <Heart size={14} className="text-rose-600 animate-pulse" />
                <span>تأكيد حجز فستان للعروس</span>
              </h3>
              <button
              onClick={() => setShowBookingModal(false)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={14} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleBookingSubmit} className="flex flex-col flex-grow min-h-0 overflow-hidden">
              <div className="p-4 space-y-3 overflow-y-auto flex-grow text-right scrollbar-thin">
                {/* Dress Selection with Fast Search */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">الفستان المراد حجزه</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 بحث سريع عن الفستان بالاسم أو الكود..."
                      value={bookingDressSearch}
                      onChange={(e) => setBookingDressSearch(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-right"
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
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100 max-h-32 overflow-y-auto scrollbar-thin">
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
                              if (d.rental_price) {
                                setBookingTotalAmount(parseFloat(d.rental_price || 0).toString());
                              }
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
                    {dressesList.filter((d) => {
                      if (!bookingDressSearch.trim()) return true;
                      const q = bookingDressSearch.toLowerCase().trim();
                      return d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q);
                    }).length === 0 && (
                      <div className="w-full text-center py-2 text-[10px] font-bold text-slate-400">
                        لا توجد فساتين مطابقة للبحث "{bookingDressSearch}"
                      </div>
                    )}
                  </div>

                  {/* Currently selected dress indicator */}
                  {(() => {
                    const activeDress = dressesList.find((d) => d.id.toString() === bookingDressId);
                    if (!activeDress) return null;
                    return (
                      <div className="text-[10px] font-extrabold text-rose-700 bg-rose-50/70 border border-rose-100 px-2.5 py-1 rounded-lg flex items-center justify-between">
                        <span>الفستان المختار: <strong className="font-black">{activeDress.name}</strong></span>
                        {activeDress.code && <span className="font-mono text-[9.5px] text-rose-800">كود: {activeDress.code}</span>}
                      </div>
                    );
                  })()}

                  {(() => {
                  if (!dressDetails || !dressDetails.bookings || dressDetails.bookings.length === 0) return null;
                  const ranges = dressDetails.bookings.
                  filter((b) => b.client_id !== bride.id).
                  map((b) => {
                    const city = b.client?.city ?? 'القاهرة';
                    const isCairo = city.includes('القاهرة') || city.toLowerCase().includes('cairo');
                    const daysBefore = isCairo ? 2 : 3;
                    const daysAfter = 1;

                    const wDate = new Date(b.event_date.split(' ')[0]);
                    const start = new Date(wDate);
                    start.setDate(start.getDate() - daysBefore);
                    const end = new Date(wDate);
                    end.setDate(end.getDate() + daysAfter);

                    const formatYMD = (d) => {
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const dd = String(d.getDate()).padStart(2, '0');
                      return `${y}-${m}-\u200f${dd}`;
                    };
                    return {
                      start: formatYMD(start),
                      end: formatYMD(end),
                      clientName: b.client?.name || 'عروس أخرى'
                    };
                  });

                  if (ranges.length === 0) return null;
                  return (
                    <div className="mt-2 p-3 bg-rose-50/50 border border-rose-100 rounded-xl space-y-1.5 text-right">
                        <span className="text-[9px] font-black text-rose-800 block">🔒 تواريخ عدم توفر الفستان (خارج الأتيليه):</span>
                        {ranges.map((r, i) =>
                      <div key={i} className="text-[8.5px] font-extrabold text-rose-700 leading-relaxed">
                            • من <span className="font-mono text-rose-800">{r.start}</span> إلى <span className="font-mono text-rose-800">{r.end}</span> (مع العروس: {r.clientName})
                          </div>
                      )}
                      </div>);

                })()}
                </div>

                {/* Bride Phone Field */}
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
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">تاريخ الفرح / المناسبة</label>
                  <input
                  type="date"
                  required
                  value={bookingEventDate}
                  onChange={(e) => setBookingEventDate(e.target.value)}
                  className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right ${
                  isBookingDateBlocked ? 'border-rose-300 bg-rose-50/20 text-rose-700' : 'bg-slate-50 border-slate-150'}`
                  } />
                
                  {isBookingDateBlocked &&
                <span className="text-[8.5px] font-bold text-rose-600 block mt-0.5 text-right">⚠️ هذا التاريخ غير متاح لتواجد الفستان بالأتيليه.</span>
                }
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block text-right">مبلغ الإيجار الإجمالي</label>
                    <input
                    type="number"
                    required
                    value={bookingTotalAmount}
                    onChange={(e) => setBookingTotalAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right" />
                  
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block text-right">العربون المدفوع</label>
                    <input
                    type="number"
                    required
                    value={bookingDepositAmount}
                    onChange={(e) => setBookingDepositAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right" />
                  
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block text-right">طريقة دفع العربون</label>
                    <select
                    value={bookingPaymentMethod}
                    onChange={(e) => setBookingPaymentMethod(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right pr-8">
                    
                      {PAYMENT_METHODS.map((pm) =>
                    <option key={pm.id} value={pm.id}>{pm.label}</option>
                    )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block text-right">إرفاق إيصال العربون (اختياري)</label>
                    <div className="flex items-center gap-2">
                      <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBookingReceipt(reader.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="booking-receipt-file-input" />
                    
                      <label
                      htmlFor="booking-receipt-file-input"
                      className="flex-grow px-2 py-1.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[9px] font-bold text-indigo-650 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-center gap-1 transition-all">
                      
                        <CreditCard size={10} />
                        <span>{bookingReceipt ? 'تغيير الإيصال' : 'رفع إيصال'}</span>
                      </label>
                      {bookingReceipt &&
                    <button
                      type="button"
                      onClick={() => setBookingReceipt(null)}
                      className="p-1 bg-rose-50 border border-rose-100 text-rose-500 rounded-xl hover:bg-rose-100/60 transition-all cursor-pointer text-xs">
                      
                          <X size={10} />
                        </button>
                    }
                    </div>
                  </div>
                </div>

                {bookingReceipt &&
              <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[80px] flex items-center justify-center bg-slate-50 mt-1">
                    <img src={bookingReceipt} alt="معاينة الإيصال" className="w-full h-full object-contain max-h-[75px]" />
                  </div>
              }

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">ملاحظات إضافية</label>
                  <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="ملاحظات وتعديلات الفستان المطلوبة..."
                  className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none h-14 text-right" />
                
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="flex items-center gap-3 p-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <button
                type="submit"
                disabled={isSubmitting || isBookingDateBlocked}
                className={`flex-1 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md text-center ${
                isSubmitting || isBookingDateBlocked ?
                'bg-slate-350 text-slate-500 cursor-not-allowed shadow-none' :
                'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'}`
                }>
                
                  {isSubmitting ? 'جاري الحفظ...' : 'تأكيد الحجز وتثبيت التاريخ'}
                </button>
                <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Bride Journey Details Popup Modal */}
      {showDetailsModal &&
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <CalIcon size={16} className="text-indigo-600 animate-pulse" />
                <span>تفاصيل رحلة العروس والطلب الحالي</span>
              </h3>
              <button
              onClick={() => setShowDetailsModal(false)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-5 flex-grow scrollbar-thin">
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
                              <span className="text-[10px] font-black text-slate-400 block mb-1">الفساتين الـ 3 المطلوبة للتجربة:</span>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                <span>1. {booking.dress?.name || 'غير محدد'}</span>
                              </div>
                              {booking.dress_2_id &&
                          <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                  <span>2. {booking.dress2?.name || 'فستان إضافي 2'}</span>
                                </div>
                          }
                              {booking.dress_3_id &&
                          <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
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
                        <h4 className="text-xs font-black text-rose-900 border-b border-rose-100/60 pb-1.5">👗 الفستان المعتمد المحجوز</h4>
                        <div className="flex items-start gap-3">
                          {booking.dress?.image_url &&
                        <img src={booking.dress.image_url} alt="dress" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                        }
                          <div className="space-y-1 text-xs font-bold text-slate-700 flex-grow">
                            <div><span className="text-slate-400 font-medium">الفستان:</span> {booking.dress?.name || 'غير محدد'}</div>
                            <div><span className="text-slate-400 font-medium">تاريخ المناسبة / الزفاف:</span> <span className="font-mono text-rose-600">{booking.event_date ? booking.event_date.split('T')[0].split(' ')[0] : 'غير محدد'}</span></div>
                          </div>
                        </div>
                      </div>

                      {/* Financial details */}
                      <div className="bg-emerald-50/20 p-4 rounded-2xl border border-emerald-100/50 space-y-2.5">
                        <h4 className="text-xs font-black text-emerald-900 border-b border-emerald-100/60 pb-1.5">💰 الوضع المالي والمدفوعات</h4>
                        <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                          <div><span className="text-slate-400 font-medium">إجمالي قيمة الإيجار:</span> {booking.total_amount} ج.م</div>
                          <div><span className="text-slate-400 font-medium">العربون / المدفوع:</span> {totalPaid} ج.م</div>
                          <div className="col-span-2"><span className="text-slate-400 font-medium">المبلغ المتبقي:</span> <span className={`${remaining > 0 ? 'text-rose-600 font-black' : 'text-emerald-600'}`}>{remaining} ج.م</span></div>
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
      }
    </div>);

}