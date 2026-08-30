import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, getStorageUrl } from '@/lib/api-client';
import { Search, Plus, X, Trash2, Edit3, Calendar, Ruler, Heart, Package, RotateCcw, Phone, MapPin, CreditCard, LayoutGrid, User, Clock, CheckCircle2, AlertCircle, PhoneCall, ChevronRight, ChevronLeft, Sparkles, MessageCircle, Eye, Tag, Filter } from 'lucide-react';
import { MultiPaymentMethodInput } from '@/components/MultiPaymentMethodInput';

const BRIDE_STAGES = [
  { id: 'visit', label: 'طلب زيارة / تجربة', icon: Calendar },
  { id: 'booking', label: 'حجز', icon: Heart },
  { id: 'fitting', label: 'غرفة القياس', icon: Ruler },
  { id: 'picked_up', label: 'استلام الفستان', icon: Package },
  { id: 'returned', label: 'إرجاع الفستان', icon: RotateCcw }];


const mockAvatars = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=120&auto=format&fit=crop&q=80'];


const STAGE_ACTIONS_CONFIG = {
  visit: { label: 'تأكيد حجز الفستان', action: 'confirm_booking', color: 'bg-amber-600 hover:bg-amber-700' },
  booking: { label: 'حجز موعد قياس', action: 'schedule_fitting', color: 'bg-indigo-600 hover:bg-indigo-700' },
  fitting: { label: 'إنهاء البروفة', action: 'end_fitting', color: 'bg-emerald-600 hover:bg-emerald-700' },
  picked_up: { label: 'تسليم الفستان للعروس', action: 'mark_picked_up', color: 'bg-rose-600 hover:bg-rose-700' }
};

const PAYMENT_METHODS = [
  { id: 'cash', label: 'نقدي (Cash)' },
  { id: 'credit_card', label: 'فيزا / كارت (Visa / Card)' },
  { id: 'instapay', label: 'إنستاباي (Instapay)' },
  { id: 'vodafone_cash', label: 'فودافون كاش (Vodafone Cash)' },
  { id: 'bank_transfer', label: 'تحويل بنكي (Bank Transfer)' }];


const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
};

const ALL_EGYPT_CITIES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'طنطا',
  'المنصورة',
  'الزقازيق',
  'بورسعيد',
  'السويس',
  'الإسماعيلية',
  'دمياط',
  'كفر الشيخ',
  'دمنهور',
  'المحلة الكبرى',
  'بنها',
  'شبين الكوم',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'الغردقة',
  'شرم الشيخ',
  'مرسى مطروح',
  'التجمع الأول',
  'التجمع الخامس',
  'مدينة نصر',
  'مصر الجديدة',
  'المعادي',
  'الشيخ زايد',
  '6 أكتوبر',
  'الشروق',
  'مدينتي',
  'بدر',
  'العبور',
  'حلوان'
];

export default function BridesPage() {
  const navigate = useNavigate();
  const [bridesList, setBridesList] = useState([]);
  const allCitiesOptions = React.useMemo(() => {
    const set = new Set(ALL_EGYPT_CITIES);
    bridesList.forEach((b) => {
      if (b.city && b.city.trim()) {
        set.add(b.city.trim());
      }
    });
    return Array.from(set);
  }, [bridesList]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingBride, setEditingBride] = useState(null);
  const [availableDresses, setAvailableDresses] = useState([]);

  // Bride Image upload state
  const [brideImage, setBrideImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('القاهرة');
  const [newPhone, setNewPhone] = useState('');
  const [newPhone2, setNewPhone2] = useState('');
  const [newSource, setNewSource] = useState('انستقرام');
  const [newVisitDate, setNewVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [newWeddingDate, setNewWeddingDate] = useState('');
  const [newNote, setNewNote] = useState('');
  const [selectedModels, setSelectedModels] = useState([]);
  const [brideDressSearch, setBrideDressSearch] = useState('');

  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [selectedBrideForPickup, setSelectedBrideForPickup] = useState(null);
  const [checkedAccessories, setCheckedAccessories] = useState({});
  const [pickupPaymentAmount, setPickupPaymentAmount] = useState('0');
  const [pickupInsuranceAmount, setPickupInsuranceAmount] = useState('0');
  const [pickupPaymentMethod, setPickupPaymentMethod] = useState('cash');
  const [pickupRemainingPayments, setPickupRemainingPayments] = useState([{ amount: '0', payment_method: 'cash' }]);
  const [pickupInsurancePayments, setPickupInsurancePayments] = useState([{ amount: '5000', payment_method: 'cash' }]);
  const [recordPickupPayment, setRecordPickupPayment] = useState(true);
  const [pickupReceipt, setPickupReceipt] = useState(null);

  // Fitting modal states
  const [showFittingModal, setShowFittingModal] = useState(false);
  const [selectedBrideForFitting, setSelectedBrideForFitting] = useState(null);
  const [expectedFittingFee, setExpectedFittingFee] = useState(150);
  const [fittingDate, setFittingDate] = useState(new Date().toISOString().split('T')[0]);
  const [fittingTime, setFittingTime] = useState('01:00 م');
  const [fittingDressId, setFittingDressId] = useState('');
  const [tryingFee, setTryingFee] = useState('150');
  const [fittingPaymentMethod, setFittingPaymentMethod] = useState('cash');
  const [fittingPayments, setFittingPayments] = useState([{ amount: '150', payment_method: 'cash' }]);
  const [fittingNotes, setFittingNotes] = useState('');
  const [fittingReceipt, setFittingReceipt] = useState(null);

  // Booking modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBrideForBooking, setSelectedBrideForBooking] = useState(null);
  const [bookingDressId, setBookingDressId] = useState('');
  const [bookingDressSearch, setBookingDressSearch] = useState('');
  const [bookingHasSecondDress, setBookingHasSecondDress] = useState(false);
  const [bookingDress2Id, setBookingDress2Id] = useState('');
  const [bookingDress2Search, setBookingDress2Search] = useState('');
  const [bookingDress1Details, setBookingDress1Details] = useState(null);
  const [bookingDress2Details, setBookingDress2Details] = useState(null);
  const [bookingSalesName, setBookingSalesName] = useState('');
  const [employeesList, setEmployeesList] = useState([]);
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingPhone2, setBookingPhone2] = useState('');
  const [bookingEventDate, setBookingEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTotalAmount, setBookingTotalAmount] = useState('3500');
  const [bookingDepositAmount, setBookingDepositAmount] = useState('1000');
  const [bookingInsuranceAmount, setBookingInsuranceAmount] = useState('5000');
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState('cash');
  const [bookingPayments, setBookingPayments] = useState([{ amount: '1000', payment_method: 'cash' }]);
  const [bookingReceipt, setBookingReceipt] = useState(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [showConflictConfirmDialog, setShowConflictConfirmDialog] = useState(false);
  const [conflictWarningMessage, setConflictWarningMessage] = useState('');

  // Excel Import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  // Complete list of dresses
  const [dressesList, setDressesList] = useState([]);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedBrideForReturn, setSelectedBrideForReturn] = useState(null);
  const [returnCheckedAccessories, setReturnCheckedAccessories] = useState({});
  const [returnNotes, setReturnNotes] = useState('تم الإرجاع بحالة جيدة');
  const [damageDeduction, setDamageDeduction] = useState('0');
  const [damageNotes, setDamageNotes] = useState('');

  // Pay Remaining modal states
  const [isPayRemainingModalOpen, setIsPayRemainingModalOpen] = useState(false);
  const [selectedBrideForPayRemaining, setSelectedBrideForPayRemaining] = useState(null);
  const [expectedRemainingAmount, setExpectedRemainingAmount] = useState(0);
  const [payRemainingAmount, setPayRemainingAmount] = useState('0');
  const [payRemainingMethod, setPayRemainingMethod] = useState('cash');
  const [payRemainingPayments, setPayRemainingPayments] = useState([{ amount: '0', payment_method: 'cash' }]);
  const [payRemainingReceipt, setPayRemainingReceipt] = useState(null);
  const [payRemainingReceiptPreview, setPayRemainingReceiptPreview] = useState(null);
  const [payRemainingNotes, setPayRemainingNotes] = useState('');
  const [isSubmittingPayRemaining, setIsSubmittingPayRemaining] = useState(false);
  // Insurance states (within pay remaining modal)
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [insuranceAmount, setInsuranceAmount] = useState('5000');
  const [insurancePayments, setInsurancePayments] = useState([{ amount: '5000', payment_method: 'cash', receipt_image: null }]);

  // Booked Dresses Modal
  const [isBookedDressesModalOpen, setIsBookedDressesModalOpen] = useState(false);
  const [bookedDressesSearch, setBookedDressesSearch] = useState('');
  const [bookedDressesMonthFilter, setBookedDressesMonthFilter] = useState('all');
  const [bookedDressesDateFilter, setBookedDressesDateFilter] = useState('');
  const [bookedDressesDateType, setBookedDressesDateType] = useState('wedding');
  const [bookedDressesPage, setBookedDressesPage] = useState(1);
  const [bookedDressesPerPage, setBookedDressesPerPage] = useState(9);
  const bookedDressesScrollRef = React.useRef(null);

  useEffect(() => {
    setBookedDressesPage(1);
  }, [bookedDressesSearch, bookedDressesMonthFilter, bookedDressesDateFilter, bookedDressesDateType, bookedDressesPerPage]);

  const handleOpenPayRemaining = (bride) => {
    const booking = bride.bookings?.[0];
    const totalPaid = booking?.revenues?.reduce((sum, rev) => sum + parseFloat(rev.amount), 0) ?? parseFloat(booking?.deposit_amount || 0);
    const remaining = booking ? Math.max(0, parseFloat(booking?.total_amount || 0) - totalPaid) : 0;
    const defaultIns = (booking?.insurance_amount && parseFloat(booking.insurance_amount) > 0)
      ? booking.insurance_amount.toString()
      : '5000';
    setSelectedBrideForPayRemaining(bride);
    setExpectedRemainingAmount(remaining);
    setPayRemainingAmount(remaining.toString());
    setPayRemainingMethod('cash');
    setPayRemainingPayments([{ amount: remaining.toString(), payment_method: 'cash' }]);
    setPayRemainingReceipt(null);
    setPayRemainingReceiptPreview(null);
    setPayRemainingNotes('');
    setInsuranceEnabled(false);
    setInsuranceAmount(defaultIns);
    setInsurancePayments([{ amount: defaultIns, payment_method: 'cash', receipt_image: null }]);
    setIsPayRemainingModalOpen(true);
  };

  const handlePayRemainingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBrideForPayRemaining) return;

    const validPayments = payRemainingPayments.filter(p => parseFloat(p.amount) > 0);
    const totalAmt = validPayments.length > 0
      ? validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
      : parseFloat(payRemainingAmount || '0');

    if (totalAmt <= 0) return;

    setIsSubmittingPayRemaining(true);
    try {
      let receiptBase64 = null;
      if (payRemainingReceipt) {
        receiptBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(payRemainingReceipt);
        });
      }

      const validInsPayments = insuranceEnabled
        ? insurancePayments.filter(p => parseFloat(p.amount) > 0)
        : [];
      const totalInsAmt = validInsPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      await apiClient.put(`/clients/${selectedBrideForPayRemaining.id}/stage-action`, {
        action: 'pay_remaining',
        amount: totalAmt,
        payment_method: validPayments.length === 1 ? validPayments[0].payment_method : (validPayments.length > 1 ? 'multiple' : payRemainingMethod),
        payments: validPayments,
        notes: payRemainingNotes,
        receipt: receiptBase64,
        ...(insuranceEnabled && validInsPayments.length > 0 && {
          insurance_amount: totalInsAmt,
          insurance_payments: validInsPayments,
        }),
      });

      setIsPayRemainingModalOpen(false);
      setSelectedBrideForPayRemaining(null);
      fetchBrides();
    } catch (err) {
      console.error('Failed to submit pay remaining:', err);
      alert('حدث خطأ أثناء تسجيل دافع المبلغ المتبقي');
    } finally {
      setIsSubmittingPayRemaining(false);
    }
  };

  // Trying fee / Payment modal states for BridesPage
  const [showTryingFeeModal, setShowTryingFeeModal] = useState(false);
  const [selectedBrideForTryingFee, setSelectedBrideForTryingFee] = useState(null);
  const [tryingFeeAmount, setTryingFeeAmount] = useState('150');
  const [tryingFeeMethod, setTryingFeeMethod] = useState('cash');
  const [tryingFeePayments, setTryingFeePayments] = useState([{ amount: '150', payment_method: 'cash' }]);
  const [tryingFeeType, setTryingFeeType] = useState('fitting_fee');
  const [tryingFeeNotes, setTryingFeeNotes] = useState('');
  const [tryingFeeReceipt, setTryingFeeReceipt] = useState(null);
  const [isSubmittingTryingFee, setIsSubmittingTryingFee] = useState(false);

  const handleOpenTryingFee = (bride) => {
    setSelectedBrideForTryingFee(bride);
    setTryingFeeType('fitting_fee');
    const bookedDress = bride.bookings?.[0]?.dress || bride.visits?.[0]?.dress;
    const fee = (bride.latest_dress_trying_fee && bride.latest_dress_trying_fee > 0)
      ? bride.latest_dress_trying_fee
      : (bookedDress ? parseFloat(bookedDress.trying_fee || 150) : 150);
    setTryingFeeAmount(fee.toString());
    setTryingFeeMethod('cash');
    setTryingFeePayments([{ amount: fee.toString(), payment_method: 'cash' }]);
    setTryingFeeNotes(`رسوم قياس وتجربة للعروس: ${bride.name}`);
    setTryingFeeReceipt(null);
    setShowTryingFeeModal(true);
  };

  const handleTryingFeeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBrideForTryingFee) return;
    try {
      setIsSubmittingTryingFee(true);
      const validPayments = tryingFeePayments.filter(p => parseFloat(p.amount) > 0);
      const totalAmt = validPayments.length > 0
        ? validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
        : parseFloat(tryingFeeAmount);

      if (!isNaN(totalAmt) && totalAmt > 0) {
        await apiClient.post('/revenues', {
          booking_id: selectedBrideForTryingFee.bookings?.[0]?.id || null,
          type: tryingFeeType,
          amount: totalAmt,
          payment_method: validPayments.length === 1 ? validPayments[0].payment_method : (validPayments.length > 1 ? 'multiple' : tryingFeeMethod),
          payments: validPayments.length > 0 ? validPayments : [{ amount: totalAmt, payment_method: tryingFeeMethod }],
          payment_date: new Date().toISOString().split('T')[0],
          notes: tryingFeeNotes || `رسوم قياس وتجربة للعروس: ${selectedBrideForTryingFee.name}`,
          receipt_image: tryingFeeReceipt
        });
        setShowTryingFeeModal(false);
        setSelectedBrideForTryingFee(null);
        setTryingFeeReceipt(null);
        fetchBrides();
      }
    } catch (err) {
      console.error('Failed to save trying fee:', err);
      alert('حدث خطأ أثناء حفظ رسوم القياس');
    } finally {
      setIsSubmittingTryingFee(false);
    }
  };

  const handleSendPickupReminderWhatsApp = async (bride) => {
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

  const handleConfirmVisitWhatsApp = async (bride) => {
    try {
      await apiClient.put(`/clients/${bride.id}/stage-action`, { action: 'confirm_visit' });
      fetchBrides();

      const rawVisitDate = bride.latest_visit_date || bride.visits?.[0]?.visit_date || bride.wedding_date || new Date().toISOString().split('T')[0];
      const visitDate = rawVisitDate.split(' ')[0].split('T')[0];
      const visitTime = bride.latest_visit_time || bride.visits?.[0]?.time_slot || 'خلال أوقات العمل الرسمية';

      const bookedDress = bride.bookings?.[0]?.dress || bride.visits?.[0]?.dress;
      const feeAmount = (bride.latest_dress_trying_fee && bride.latest_dress_trying_fee > 0)
        ? bride.latest_dress_trying_fee
        : (bookedDress ? parseFloat(bookedDress.trying_fee || 0) : 0);
      const tryingFeeText = feeAmount > 0 ? `${feeAmount} ج.م` : 'مجانية (بدون رسوم)';

      let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${bride.name}* 🤍،\nيسعدنا جداً تأكيد موعدكِ معنا لتجربة فستان أحلامكِ!\n\n📅 *تفاصيل الموعد:*\n• *التاريخ:* ${visitDate}\n• *الوقت:* ${visitTime}\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n• *رسوم التجربة والقياس:* ${tryingFeeText}\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nنحن بانتظار تشريفكِ لتنيري المكان ✨🎀`;

      try {
        const templates = await apiClient.get('/whatsapp-templates');
        const t = templates.find((x) => x.key === 'visit_confirmation');
        if (t) {
          message = t.body
            .replace(/\{\{client_name\}\}/g, bride.name)
            .replace(/\{\{visit_date\}\}/g, visitDate)
            .replace(/\{\{visit_time\}\}/g, visitTime)
            .replace(/\{\{trying_fee\}\}/g, tryingFeeText);
        }
      } catch (err) {}

      const cleanPhone = (bride.phone || '').replace(/[^\d]/g, '');
      if (cleanPhone) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء تأكيد الزيارة');
    }
  };

  const handleOpenBookingModal = (bride) => {
    setSelectedBrideForBooking(bride);
    setBookingPhone(bride.phone || '');
    setBookingPhone2(bride.phone2 || '');
    setBookingDressSearch('');
    setBookingDress2Search('');
    setBookingEventDate(bride.wedding_date || bride.bookings?.[0]?.event_date || new Date().toISOString().split('T')[0]);
    
    const booking = bride.bookings?.[0];
    if (booking) {
      setBookingDressId(booking.dress_id ? booking.dress_id.toString() : '');
      if (booking.dress_2_id) {
        setBookingHasSecondDress(true);
        setBookingDress2Id(booking.dress_2_id.toString());
      } else {
        setBookingHasSecondDress(false);
        setBookingDress2Id('');
      }
      setBookingSalesName(booking.sales_name || '');
      setBookingTotalAmount(booking.total_amount ? booking.total_amount.toString() : '3500');
      setBookingDepositAmount(booking.deposit_amount ? booking.deposit_amount.toString() : '1000');
      setBookingInsuranceAmount(booking.insurance_amount ? booking.insurance_amount.toString() : '5000');
      setBookingNotes(booking.notes || '');
    } else {
      setBookingHasSecondDress(false);
      setBookingDress2Id('');
      setBookingSalesName('');
      setBookingDepositAmount('1000');
      setBookingInsuranceAmount('5000');
      setBookingNotes('');
      if (dressesList.length > 0) {
        setBookingDressId(dressesList[0].id.toString());
        setBookingTotalAmount(parseFloat(dressesList[0].rental_price || 3500).toString());
      }
    }
    setShowBookingModal(true);
  };

  useEffect(() => {
    if (selectedBrideForPickup) {
      const booking = selectedBrideForPickup.bookings?.[0];
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
      const remStr = remaining > 0 ? remaining.toString() : '0';
      const insStr = (booking?.insurance_amount ?? 5000).toString();
      setPickupPaymentAmount(remStr);
      setPickupRemainingPayments([{ amount: remStr, payment_method: 'cash' }]);
      setPickupInsuranceAmount(insStr);
      setPickupInsurancePayments([{ amount: insStr, payment_method: 'cash' }]);
    }
  }, [selectedBrideForPickup]);

  useEffect(() => {
    if (selectedBrideForReturn) {
      const booking = selectedBrideForReturn.bookings?.[0];
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
  }, [selectedBrideForReturn]);

  useEffect(() => {
    if (selectedBrideForFitting) {
      setFittingNotes('');
      setFittingReceipt(null);
      setFittingPaymentMethod('cash');
      setFittingDate(new Date().toISOString().split('T')[0]);
      setFittingTime('01:00 م');
      const bookedDress = selectedBrideForFitting.bookings?.[0]?.dress || selectedBrideForFitting.visits?.[0]?.dress;
      const fee = (selectedBrideForFitting.latest_dress_trying_fee && selectedBrideForFitting.latest_dress_trying_fee > 0)
        ? selectedBrideForFitting.latest_dress_trying_fee
        : (bookedDress ? parseFloat(bookedDress.trying_fee || 150) : 150);
      setExpectedFittingFee(fee);
      setTryingFee(fee.toString());
      setFittingPayments([{ amount: fee.toString(), payment_method: 'cash' }]);
      const bookedDressId = selectedBrideForFitting.bookings?.[0]?.dress_id;
      if (bookedDressId) {
        setFittingDressId(bookedDressId.toString());
      } else if (dressesList.length > 0) {
        setFittingDressId(dressesList[0].id.toString());
      }
    }
  }, [selectedBrideForFitting]);

  useEffect(() => {
    if (selectedBrideForBooking) {
      setBookingNotes('');
      setBookingReceipt(null);
      setBookingDressSearch('');
      setBookingDress2Search('');
      setBookingHasSecondDress(false);
      setBookingDress2Id('');
      setBookingSalesName('');
      setBookingInsuranceAmount('5000');
      setBookingDepositAmount('1000');
      setBookingPaymentMethod('cash');
      setBookingPayments([{ amount: '1000', payment_method: 'cash' }]);
      setBookingPhone(selectedBrideForBooking.phone || '');
      setBookingPhone2(selectedBrideForBooking.phone2 || '');
      setBookingEventDate(selectedBrideForBooking.wedding_date || selectedBrideForBooking.bookings?.[0]?.event_date || new Date().toISOString().split('T')[0]);
      const bookedDressId = selectedBrideForBooking.bookings?.[0]?.dress_id || (dressesList.length > 0 ? dressesList[0].id.toString() : '');
      if (bookedDressId) {
        setBookingDressId(bookedDressId.toString());
        const d = dressesList.find(x => x.id.toString() === bookedDressId.toString());
        if (d && d.rental_price) {
          setBookingTotalAmount(parseFloat(d.rental_price || 0).toString());
        }
      }
    }
  }, [selectedBrideForBooking]);

  const fetchBrides = async () => {
    try {
      const response = await apiClient.get('/clients?per_page=1000');
      const data = response.data || [];
      const mapped = data.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        phone2: c.phone2 || '',
        email: c.email || '',
        source: c.source || '',
        city: c.city || c.address || '',
        notes: c.notes || '',
        current_stage: c.current_stage || 'visit',
        image_path: c.image_path,
        date: c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '--',
        wedding_date: c.wedding_date || c.bookings?.[0]?.event_date || '',
        bookings: c.bookings || [],
        visits: c.visits || [],
        latest_visit_date: c.latest_visit_date || c.visits?.[0]?.visit_date || '',
        latest_visit_time: c.latest_visit_time || c.visits?.[0]?.time_slot || '',
        latest_dress_name: c.latest_dress_name || c.bookings?.[0]?.dress?.name || '',
        latest_dress_trying_fee: c.latest_dress_trying_fee ?? 0
      }));
      setBridesList(mapped);
    } catch (e) {
      console.error('Failed to fetch clients:', e);
    }
  };

  useEffect(() => {
    const active = localStorage.getItem('atelier_current_employee');
    if (active) {
      try {
        const emp = JSON.parse(active);
        setIsAdmin(emp.role === 'admin' || emp.email === 'admin@atelier.test');
      } catch (e) { }
    }

    fetchBrides();

    apiClient.get('/employees').then((res) => {
      const data = Array.isArray(res) ? res : (res.data?.data || res.data || []);
      setEmployeesList(data);
    }).catch(() => { });

    apiClient.get('/dresses?per_page=all').then((res) => {
      const data = Array.isArray(res) ? res : (res.data?.data || res.data || []);
      setDressesList(data);
      setAvailableDresses(data.map((d) => ({
        id: d.id,
        name: d.name || '',
        code: d.code || '',
        image: d.images?.[0]?.image_path ?
          `${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${d.images[0].image_path}` :
          ''
      })));
      if (data.length > 0) {
        setFittingDressId(data[0].id.toString());
        setBookingDressId(data[0].id.toString());
      }
    }).catch(() => { });

    const interval = setInterval(() => {
      if (!isModalOpen && !isPickupModalOpen && !isReturnModalOpen) {
        fetchBrides();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isModalOpen, isPickupModalOpen, isReturnModalOpen]);

  useEffect(() => {
    if (showBookingModal && bookingDressId) {
      apiClient.get(`/dresses/${bookingDressId}`).then((res) => {
        setBookingDress1Details(res.data || res || null);
      }).catch(() => setBookingDress1Details(null));
    } else {
      setBookingDress1Details(null);
    }
  }, [showBookingModal, bookingDressId]);

  useEffect(() => {
    if (showBookingModal && bookingHasSecondDress && bookingDress2Id) {
      apiClient.get(`/dresses/${bookingDress2Id}`).then((res) => {
        setBookingDress2Details(res.data || res || null);
      }).catch(() => setBookingDress2Details(null));
    } else {
      setBookingDress2Details(null);
    }
  }, [showBookingModal, bookingHasSecondDress, bookingDress2Id]);

  // Calculate if selected wedding/booking date is blocked for Dress 1
  const isBookingDateBlocked = (() => {
    if (!bookingEventDate || !bookingDress1Details || !bookingDress1Details.bookings || !selectedBrideForBooking) return false;
    const fD = new Date(bookingEventDate);
    fD.setHours(0, 0, 0, 0);

    return bookingDress1Details.bookings.some((b) => {
      if (b.client_id === selectedBrideForBooking.id) return false;

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
    if (!bookingHasSecondDress || !bookingDress2Id || !bookingEventDate || !bookingDress2Details || !bookingDress2Details.bookings || !selectedBrideForBooking) return false;
    const fD = new Date(bookingEventDate);
    fD.setHours(0, 0, 0, 0);

    return bookingDress2Details.bookings.some((b) => {
      if (b.client_id === selectedBrideForBooking.id) return false;

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

  const handleFittingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBrideForFitting) return;
    try {
      const validPayments = fittingPayments.filter(p => parseFloat(p.amount) > 0);
      const totalFee = validPayments.length > 0
        ? validPayments.reduce((s, p) => s + parseFloat(p.amount), 0)
        : parseFloat(tryingFee || '0');

      await apiClient.put(`/clients/${selectedBrideForFitting.id}/stage-action`, {
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
      setSelectedBrideForFitting(null);
      fetchBrides();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleBookingSubmit = async (e, forceOverride = false) => {
    if (e) e.preventDefault();
    if (!selectedBrideForBooking) return;

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
      const activePhone = bookingPhone.trim() || selectedBrideForBooking.phone || '';
      const validPayments = bookingPayments.filter(p => parseFloat(p.amount) > 0);
      const totalDepositCalculated = validPayments.length > 0
        ? validPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
        : parseFloat(bookingDepositAmount || '0');

      await apiClient.put(`/clients/${selectedBrideForBooking.id}/stage-action`, {
        action: 'confirm_booking',
        phone: activePhone,
        phone2: bookingPhone2.trim() || null,
        dress_id: parseInt(bookingDressId),
        dress_2_id: bookingHasSecondDress && bookingDress2Id ? parseInt(bookingDress2Id) : null,
        sales_name: bookingSalesName.trim() || null,
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
      setSelectedBrideForBooking(null);
      fetchBrides();

      // WhatsApp redirection
      const visitDate = selectedBrideForBooking.latest_visit_date || '';
      let visitTime = selectedBrideForBooking.latest_visit_time || selectedBrideForBooking.visits?.[0]?.time_slot;
      if (!visitTime) {
        const match = selectedBrideForBooking.notes?.match(/(?:وقت المقابلة:?\s*)?([0-1]?\d:[0-5]\d(?:\s*(?:م|ص|AM|PM|am|pm))?)/i);
        visitTime = match ? match[1].trim() : 'غير محدد';
      }
      const dress = dressesList.find((d) => d.id.toString() === bookingDressId);
      const dress2 = bookingHasSecondDress && bookingDress2Id ? dressesList.find((d) => d.id.toString() === bookingDress2Id) : null;
      let dressText = '';
      if (dress && dress2) {
        dressText = `\n• *فستان الزفاف 1:* ${dress.name}\n• *فستان 2:* ${dress2.name}`;
      } else if (dress) {
        dressText = `\n• *فستان الزفاف:* ${dress.name}`;
      }

      let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${selectedBrideForBooking.name}* 🤍،\nيسعدنا جداً تأكيد حجز موعدكِ وتجهيز فستان أحلامكِ!\n\n📅 *تفاصيل الموعد:*\n• *التاريخ:* ${visitDate}\n• *الوقت:* ${visitTime}\n${dressText}\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nنحن بانتظار تشريفكِ لتنيري المكان ✨🎀`;

      try {
        const templates = await apiClient.get('/whatsapp-templates');
        const t = templates.find((x) => x.key === 'booking_confirmation');
        if (t) {
          message = t.body
            .replace(/\{\{client_name\}\}/g, selectedBrideForBooking.name)
            .replace(/\{\{wedding_date\}\}/g, selectedBrideForBooking.wedding_date || visitDate)
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
    }
  };

  const handleDeleteBride = (id) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'تأكيد حذف العروس',
      message: 'هل أنتِ متأكدة من رغبتكِ في حذف ملف هذه العروس نهائياً؟\nجميع البيانات المرتبطة بالمراحل التشغيلية ستُحذف.',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/clients/${id}`);
          setBridesList((prev) => prev.filter((b) => b.id !== id));
        } catch (e) {
          console.error('Failed to delete bride:', e);
        }
      }
    });
  };

  const handleAddBrideSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    let mappedSource = 'instagram';
    if (newSource.includes('موقع')) mappedSource = 'website'; else
      if (newSource.includes('توصية') || newSource.includes('إحالة')) mappedSource = 'referral'; else
        if (newSource.includes('واتس')) mappedSource = 'whatsapp'; else
          if (newSource.includes('زيارة') || newSource.includes('أخرى')) mappedSource = 'walkin';

    try {
      const fd = new FormData();
      fd.append('name', newName.trim());
      fd.append('phone', newPhone.trim() || '0000000000');
      if (newPhone2.trim()) {
        fd.append('phone2', newPhone2.trim());
      }
      fd.append('email', `${Date.now()}@atelier-bride.com`);
      fd.append('city', newCity.trim());
      fd.append('address', newCity.trim());
      fd.append('source', mappedSource);
      if (newWeddingDate) {
        fd.append('wedding_date', newWeddingDate);
      }
      let finalNote = newNote.trim();
      if (selectedModels.length > 0) {
        const modelsText = `الفساتين المهتمة بها: ${selectedModels.join(', ')}`;
        finalNote = finalNote ? `${finalNote}\n${modelsText}` : modelsText;
      }
      fd.append('notes', finalNote);
      if (brideImage) {
        fd.append('image', brideImage);
      }

      const res = await apiClient.postFormData('/clients', fd);

      // Create a Visit record
      apiClient.post('/visits', {
        client_id: res.id || res.data?.id,
        visit_date: newVisitDate || new Date().toISOString().split('T')[0],
        status: 'arrived',
        source: mappedSource,
        notes: 'تمت الزيارة والجدولة تلقائياً عند إضافة العروس'
      }).catch(() => { });

      fetchBrides();
    } catch (e) {
      console.error('Failed to create bride:', e);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleEditBrideClick = (b) => {
    setEditingBride(b);
    setNewName(b.name);
    setNewCity(b.city || 'القاهرة');
    setNewPhone(b.phone || '');
    setNewPhone2(b.phone2 || '');
    setNewSource(b.source || 'انستقرام');
    setNewWeddingDate(b.wedding_date || '');

    // Extract selected models from notes if present
    const modelMatch = b.notes?.match(/الفساتين المهتمة بها:\s*([^\n]+)/);
    if (modelMatch && modelMatch[1]) {
      const models = modelMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
      setSelectedModels(models);
      setNewNote(b.notes.replace(/الفساتين المهتمة بها:\s*[^\n]+\n?/g, '').trim());
    } else {
      setSelectedModels([]);
      setNewNote(b.notes || '');
    }

    setBrideDressSearch('');
    if (b.image_path) {
      setImagePreviewUrl(`${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${b.image_path}`);
    } else {
      setImagePreviewUrl(null);
    }
    setBrideImage(null);
  };

  const handleEditBrideSubmit = async (e) => {
    e.preventDefault();
    if (!editingBride) return;

    let mappedSource = 'instagram';
    if (newSource.includes('موقع')) mappedSource = 'website'; else
      if (newSource.includes('توصية') || newSource.includes('إحالة')) mappedSource = 'referral'; else
        if (newSource.includes('واتس')) mappedSource = 'whatsapp'; else
          if (newSource.includes('زيارة') || newSource.includes('أخرى')) mappedSource = 'walkin';

    try {
      const fd = new FormData();
      fd.append('_method', 'PUT');
      fd.append('name', newName.trim());
      fd.append('phone', newPhone.trim() || '0000000000');
      fd.append('phone2', newPhone2.trim() || '');
      fd.append('city', newCity.trim());
      fd.append('address', newCity.trim());
      fd.append('source', mappedSource);
      if (newWeddingDate) {
        fd.append('wedding_date', newWeddingDate);
      }
      let finalNote = newNote.trim();
      if (selectedModels.length > 0) {
        const cleanNote = finalNote.replace(/الفساتين المهتمة بها:\s*[^\n]+\n?/g, '').trim();
        const modelsText = `الفساتين المهتمة بها: ${selectedModels.join(', ')}`;
        finalNote = cleanNote ? `${cleanNote}\n${modelsText}` : modelsText;
      }
      fd.append('notes', finalNote);
      if (brideImage) {
        fd.append('image', brideImage);
      }

      await apiClient.postFormData(`/clients/${editingBride.id}`, fd);
      fetchBrides();
    } catch (err) {
      console.error('Failed to update bride:', err);
    }

    setEditingBride(null);
    resetForm();
  };

  const resetForm = () => {
    setNewName('');
    setNewCity('القاهرة');
    setNewPhone('');
    setNewPhone2('');
    setNewSource('انستقرام');
    setNewVisitDate(new Date().toISOString().split('T')[0]);
    setNewWeddingDate('');
    setNewNote('');
    setSelectedModels([]);
    setBrideDressSearch('');
    setBrideImage(null);
    setImagePreviewUrl(null);
  };

  const handleToggleModelSelection = (model) => {
    if (selectedModels.includes(model)) {
      setSelectedModels(selectedModels.filter((m) => m !== model));
    } else {
      if (selectedModels.length >= 3) return;
      setSelectedModels([...selectedModels, model]);
    }
  };

  const [activePage, setActivePage] = useState(1);
  const [archivePage, setArchivePage] = useState(1);
  const [selectedWeddingMonth, setSelectedWeddingMonth] = useState('all');
  const itemsPerPage = 12;

  // Extract unique wedding months from bridesList
  const weddingMonthsOptions = React.useMemo(() => {
    const monthNamesAr = [
      'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const monthsMap = {};

    bridesList.forEach((b) => {
      if (b.wedding_date) {
        const d = new Date(b.wedding_date);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const monthIdx = d.getMonth();
          const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
          const label = `${monthNamesAr[monthIdx]} ${year}`;
          if (!monthsMap[key]) {
            monthsMap[key] = { key, label, count: 0 };
          }
          monthsMap[key].count += 1;
        }
      } else {
        if (!monthsMap['no_date']) {
          monthsMap['no_date'] = { key: 'no_date', label: 'بدون تاريخ زفاف', count: 0 };
        }
        monthsMap['no_date'].count += 1;
      }
    });

    const sortedKeys = Object.keys(monthsMap)
      .filter((k) => k !== 'no_date')
      .sort();

    const result = sortedKeys.map((k) => monthsMap[k]);
    if (monthsMap['no_date']) {
      result.push(monthsMap['no_date']);
    }
    return result;
  }, [bridesList]);

  const filteredBrides = bridesList.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/\//g, '-');
    const weddingDateStr = String(b.wedding_date || '');
    const formattedWeddingDate = formatDate(b.wedding_date);

    const matchesSearch =
      !q ||
      b.name.toLowerCase().includes(q) ||
      (b.phone && b.phone.includes(q)) ||
      (b.phone2 && b.phone2.includes(q)) ||
      (b.city && b.city.toLowerCase().includes(q)) ||
      (b.address && b.address.toLowerCase().includes(q)) ||
      weddingDateStr.includes(cleanQ) ||
      formattedWeddingDate.includes(cleanQ);

    let matchesMonth = true;
    if (selectedWeddingMonth !== 'all') {
      if (selectedWeddingMonth === 'no_date') {
        matchesMonth = !b.wedding_date;
      } else if (b.wedding_date) {
        const d = new Date(b.wedding_date);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          matchesMonth = key === selectedWeddingMonth;
        } else {
          matchesMonth = false;
        }
      } else {
        matchesMonth = false;
      }
    }

    return matchesSearch && matchesMonth;
  });

  // All active booked dresses collected from all brides in bridesList
  const allBookedDressesList = React.useMemo(() => {
    const dresses = [];

    bridesList.forEach((bride) => {
      // Exclude brides who already returned their dress
      if (bride.current_stage === 'returned') return;

      const bookings = Array.isArray(bride.bookings) && bride.bookings.length > 0 ? bride.bookings : [];
      bookings.forEach((booking) => {
        if (booking.status === 'returned' || booking.status === 'cancelled') return;

        const eventDate = booking.event_date || bride.wedding_date || '';

        const getDress = (dressObj, dressId, fallbackName) => {
          if (dressObj && typeof dressObj === 'object' && Object.keys(dressObj).length > 0) return dressObj;
          if (dressId) {
            const found = dressesList.find((d) => String(d.id) === String(dressId));
            if (found) return found;
          }
          if (fallbackName) {
            return { id: dressId || 'unknown', name: fallbackName, code: '' };
          }
          return null;
        };

        // Dress 1
        const d1 = getDress(booking.dress, booking.dress_id, bride.latest_dress_name || 'فستان 1');
        if (d1) {
          dresses.push({
            id: `b-${booking.id || 'x'}-d1-${d1.id || '1'}`,
            dress: d1,
            bride,
            booking,
            eventDate,
            slot: 'فستان 1'
          });
        }

        // Dress 2
        const d2 = getDress(booking.dress2, booking.dress_2_id, null);
        if (d2) {
          dresses.push({
            id: `b-${booking.id || 'x'}-d2-${d2.id || '2'}`,
            dress: d2,
            bride,
            booking,
            eventDate,
            slot: 'فستان 2 (إضافي)'
          });
        }

        // Dress 3
        const d3 = getDress(booking.dress3, booking.dress_3_id, null);
        if (d3) {
          dresses.push({
            id: `b-${booking.id || 'x'}-d3-${d3.id || '3'}`,
            dress: d3,
            bride,
            booking,
            eventDate,
            slot: 'فستان 3 (إضافي)'
          });
        }
      });
    });

    return dresses.sort((a, b) => {
      if (!a.eventDate) return 1;
      if (!b.eventDate) return -1;
      return new Date(a.eventDate) - new Date(b.eventDate);
    });
  }, [bridesList, dressesList]);

  // Pre-month-filtered list: applies date picker + text search but NOT month chip
  // Used to compute accurate per-month counts that reflect active filters
  const bookedDressesPreMonthFiltered = React.useMemo(() => {
    return allBookedDressesList.filter((item) => {
      // Date picker filter
      if (bookedDressesDateFilter) {
        const targetDate = bookedDressesDateFilter;
        let eventDateIso = '';
        if (item.eventDate) {
          try {
            const d = new Date(item.eventDate);
            if (!isNaN(d.getTime())) {
              eventDateIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
          } catch {}
        }
        let bookingDateIso = '';
        const bDate = item.booking?.booking_date || item.booking?.created_at;
        if (bDate) {
          try {
            const d = new Date(bDate);
            if (!isNaN(d.getTime())) {
              bookingDateIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
          } catch {}
        }
        if (bookedDressesDateType === 'wedding') {
          if (eventDateIso !== targetDate) return false;
        } else if (bookedDressesDateType === 'booking') {
          if (bookingDateIso !== targetDate) return false;
        } else {
          if (eventDateIso !== targetDate && bookingDateIso !== targetDate) return false;
        }
      }
      // Text search filter
      if (bookedDressesSearch.trim()) {
        const q = bookedDressesSearch.toLowerCase().trim();
        const cleanQ = q.replace(/\//g, '-');
        const eventDateStr = String(item.eventDate || '');
        const bookingDateStr = String(item.booking?.booking_date || item.booking?.created_at || '');
        const dateMatch =
          eventDateStr.includes(cleanQ) ||
          bookingDateStr.includes(cleanQ) ||
          formatDate(item.eventDate).includes(cleanQ) ||
          formatDate(item.booking?.booking_date || item.booking?.created_at).includes(cleanQ);
        return (
          String(item.dress?.name || '').toLowerCase().includes(q) ||
          String(item.dress?.code || '').toLowerCase().includes(q) ||
          String(item.bride?.name || '').toLowerCase().includes(q) ||
          String(item.bride?.phone || '').toLowerCase().includes(q) ||
          String(item.bride?.phone2 || '').toLowerCase().includes(q) ||
          String(item.bride?.city || item.bride?.address || '').toLowerCase().includes(q) ||
          String(item.booking?.sales_name || '').toLowerCase().includes(q) ||
          String(item.booking?.notes || '').toLowerCase().includes(q) ||
          dateMatch
        );
      }
      return true;
    });
  }, [allBookedDressesList, bookedDressesDateFilter, bookedDressesDateType, bookedDressesSearch]);

  // Unique month filters — counts reflect active date picker + search (not month chip itself)
  const bookedDressesMonthsOptions = React.useMemo(() => {
    const monthsMap = new Map();
    bookedDressesPreMonthFiltered.forEach((item) => {
      if (item.eventDate) {
        try {
          const d = new Date(item.eventDate);
          if (!isNaN(d.getTime())) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthsMap.set(key, (monthsMap.get(key) || 0) + 1);
          }
        } catch {}
      }
    });
    return Array.from(monthsMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const [y, m] = key.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1, 1);
        const label = date.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
        return { key, label, count };
      });
  }, [bookedDressesPreMonthFiltered]);

  // Filtered booked dresses across ALL dresses in the atelier
  const filteredBookedDresses = React.useMemo(() => {
    return allBookedDressesList.filter((item) => {
      // 1. Exact Date filter (Picker)
      if (bookedDressesDateFilter) {
        const targetDate = bookedDressesDateFilter; // "YYYY-MM-DD"
        
        let eventDateIso = '';
        if (item.eventDate) {
          try {
            const d = new Date(item.eventDate);
            if (!isNaN(d.getTime())) {
              eventDateIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
          } catch {}
        }

        let bookingDateIso = '';
        const bDate = item.booking?.booking_date || item.booking?.created_at;
        if (bDate) {
          try {
            const d = new Date(bDate);
            if (!isNaN(d.getTime())) {
              bookingDateIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
          } catch {}
        }

        if (bookedDressesDateType === 'wedding') {
          if (eventDateIso !== targetDate) return false;
        } else if (bookedDressesDateType === 'booking') {
          if (bookingDateIso !== targetDate) return false;
        } else {
          // 'all' / either
          if (eventDateIso !== targetDate && bookingDateIso !== targetDate) return false;
        }
      }

      // 2. Month filter
      if (bookedDressesMonthFilter !== 'all') {
        if (!item.eventDate) return false;
        try {
          const d = new Date(item.eventDate);
          if (isNaN(d.getTime())) return false;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (key !== bookedDressesMonthFilter) return false;
        } catch {
          return false;
        }
      }

      // 3. Search query filter - searches across ALL fields including dates
      if (bookedDressesSearch.trim()) {
        const q = bookedDressesSearch.toLowerCase().trim();
        const cleanQ = q.replace(/\//g, '-');
        const dName = String(item.dress?.name || '').toLowerCase();
        const dCode = String(item.dress?.code || '').toLowerCase();
        const bName = String(item.bride?.name || '').toLowerCase();
        const bPhone = String(item.bride?.phone || '').toLowerCase();
        const bPhone2 = String(item.bride?.phone2 || '').toLowerCase();
        const bCity = String(item.bride?.city || item.bride?.address || '').toLowerCase();
        const salesName = String(item.booking?.sales_name || '').toLowerCase();
        const notes = String(item.booking?.notes || '').toLowerCase();
        
        // Date search in text
        const eventDateStr = String(item.eventDate || '');
        const bookingDateStr = String(item.booking?.booking_date || item.booking?.created_at || '');
        const formattedEventDate = formatDate(item.eventDate);
        const formattedBookingDate = formatDate(item.booking?.booking_date || item.booking?.created_at);

        const dateMatch =
          eventDateStr.includes(cleanQ) ||
          bookingDateStr.includes(cleanQ) ||
          formattedEventDate.includes(cleanQ) ||
          formattedBookingDate.includes(cleanQ);

        return (
          dName.includes(q) ||
          dCode.includes(q) ||
          bName.includes(q) ||
          bPhone.includes(q) ||
          bPhone2.includes(q) ||
          bCity.includes(q) ||
          salesName.includes(q) ||
          notes.includes(q) ||
          dateMatch
        );
      }

      return true;
    });
  }, [allBookedDressesList, bookedDressesMonthFilter, bookedDressesSearch, bookedDressesDateFilter, bookedDressesDateType]);

  // Pagination for Booked Dresses Modal
  const totalBookedDressesPages = bookedDressesPerPage === 'all'
    ? 1
    : Math.ceil(filteredBookedDresses.length / Number(bookedDressesPerPage)) || 1;

  const paginatedBookedDresses = React.useMemo(() => {
    if (bookedDressesPerPage === 'all') return filteredBookedDresses;
    const perPage = Number(bookedDressesPerPage);
    const start = (bookedDressesPage - 1) * perPage;
    return filteredBookedDresses.slice(start, start + perPage);
  }, [filteredBookedDresses, bookedDressesPage, bookedDressesPerPage]);



  const activeBrides = filteredBrides.filter((b) => b.current_stage !== 'returned');
  const previousBrides = filteredBrides.filter((b) => b.current_stage === 'returned');

  const totalActivePages = Math.ceil(activeBrides.length / itemsPerPage) || 1;
  const totalArchivePages = Math.ceil(previousBrides.length / itemsPerPage) || 1;

  const paginatedActiveBrides = activeBrides.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
  const paginatedPreviousBrides = previousBrides.slice((archivePage - 1) * itemsPerPage, archivePage * itemsPerPage);

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('atelier_auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/clients/export/csv`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('فشل تصدير البيانات');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `previous_brides_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('حدث خطأ أثناء تصدير البيانات');
    }
  };

  const stageLabel = (stage) => {
    return BRIDE_STAGES.find((s) => s.id === stage)?.label || stage;
  };

  const stageColor = (stage) => {
    switch (stage) {
      case 'visit': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'fitting': return 'text-violet-600 bg-violet-50 border-violet-100';
      case 'booking': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'ready_for_pickup': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'picked_up': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'returned': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  const renderBrideCard = (bride, idx) => {
    const avatar = bride.image_path ?
      getStorageUrl(bride.image_path) :
      mockAvatars[idx % mockAvatars.length];
    
    const booking = bride.bookings?.[0];
    const totalPaid = booking?.revenues?.reduce((sum, rev) => sum + parseFloat(rev.amount), 0) ?? parseFloat(booking?.deposit_amount || 0);
    const remaining = booking ? Math.max(0, parseFloat(booking?.total_amount || 0) - totalPaid) : 0;
    const stage = bride.current_stage || 'visit';

    // Dress resolution
    const dress = booking?.dress;
    const dressName = dress?.name || bride.latest_dress_name;
    let dressImg = null;
    if (dress) {
      if (Array.isArray(dress.images) && dress.images.length > 0) {
        const p = dress.images.find((x) => x.is_primary) || dress.images[0];
        dressImg = getStorageUrl(p?.image_path || p?.image_url || p);
      }
      if (!dressImg) dressImg = getStorageUrl(dress.primary_image || dress.image_path);
    }

    return (
      <div
        key={bride.id}
        onClick={() => setSelectedBrideDetails(bride)}
        className="bg-white rounded-3xl border border-slate-150/90 p-3 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between hover:border-indigo-300 relative group cursor-pointer"
      >
        <div>
          {/* 1. Header: Avatar + Bride Name + Phone on Right, Stage Pill & Admin on Left */}
          <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-100/80">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shadow-2xs bg-slate-50 flex items-center justify-center relative">
                  <img
                    src={avatar}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = mockAvatars[idx % mockAvatars.length];
                    }}
                  />
                </div>
                {bride.source && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-2xs border border-white text-white text-[7px]"
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
                    {bride.source === 'whatsapp' ? '💬' : bride.source === 'instagram' ? '📷' : '★'}
                  </span>
                )}
              </div>

              <div className="min-w-0 text-right">
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-black text-slate-800 tracking-tight truncate">{bride.name}</h4>
                  <span className="text-[7.5px] font-black text-amber-800 bg-amber-100/90 border border-amber-300/80 px-1 py-0.2 rounded shadow-2xs">VIP</span>
                </div>
                <a
                  href={`tel:${bride.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[9px] font-bold text-slate-500 hover:text-indigo-650 font-mono block truncate"
                >
                  {bride.phone || '—'}
                </a>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border ${stageColor(bride.current_stage)}`}>
                {stageLabel(bride.current_stage)}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[7.5px] font-bold text-slate-400">
                  {bride.city || 'القاهرة'}
                </span>
                {isAdmin && (
                  <div className="flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditBrideClick(bride)}
                      className="p-0.5 text-indigo-600 hover:bg-indigo-50 rounded transition-all cursor-pointer"
                      title="تعديل"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      onClick={() => handleDeleteBride(bride.id)}
                      className="p-0.5 text-rose-500 hover:bg-rose-50 rounded transition-all cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Middle Section: Dress Preview & Wedding Date */}
          <div className="space-y-1.5 mb-2">
            {dressName ? (
              <div className="bg-slate-50/90 rounded-xl p-1.5 border border-slate-150 flex items-center gap-2 text-right">
                <div className="w-8 h-10 rounded-lg overflow-hidden bg-white border border-slate-100 flex-shrink-0 flex items-center justify-center relative">
                  {dressImg ? (
                    <>
                      <img
                        src={dressImg}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex';
                        }}
                      />
                      <span className="hidden w-full h-full items-center justify-center text-xs bg-slate-50">👗</span>
                    </>
                  ) : (
                    <span className="text-xs">👗</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9.5px] font-black text-slate-800 truncate block leading-tight">{dressName}</span>
                  {dress?.code && (
                    <span className="text-[7px] font-bold text-slate-400 font-mono block mt-0.5">كود: {dress.code}</span>
                  )}
                </div>
              </div>
            ) : null}

            {/* Wedding Date chip */}
            {bride.wedding_date && (
              <div className="bg-indigo-50/40 px-2 py-1 rounded-xl border border-indigo-100 flex items-center justify-between text-[8.5px] font-bold text-slate-700">
                <div className="flex items-center gap-1 font-mono font-black text-indigo-900">
                  <Calendar size={10} className="text-indigo-600" />
                  <span>{String(bride.wedding_date).split('T')[0]}</span>
                </div>
                <span className="text-indigo-500 text-[7.5px] font-extrabold">موعد الزفاف 👰🏻‍♀️</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Action Area (Compact buttons) */}
        <div className="mt-1.5 pt-2 border-t border-slate-100 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          {booking && remaining > 0 && (
            <button
              type="button"
              onClick={() => handleOpenPayRemaining(bride)}
              className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[9.5px] font-black transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-95"
            >
              <CreditCard size={11} />
              <span>سداد المتبقي ({remaining.toLocaleString()} ج.م)</span>
            </button>
          )}

          {(() => {
            if (stage === 'visit') {
              return (
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleConfirmVisitWhatsApp(bride)}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                    >
                      <span>تأكيد الزيارة 💬</span>
                    </button>
                    <button
                      onClick={() => handleOpenBookingModal(bride)}
                      className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[9px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                    >
                      <span>حجز فستان 👗</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenTryingFee(bride)}
                    className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[8.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <CreditCard size={10} className="text-slate-500" />
                    <span>تسجيل رسوم القياس 💰</span>
                  </button>
                </div>
              );
            }

            if (stage === 'booking') {
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedBrideForFitting(bride);
                        const bookedDressId = bride.bookings?.[0]?.dress_id;
                        if (bookedDressId) {
                          setFittingDressId(bookedDressId.toString());
                          const bookedDress = bride.bookings?.[0]?.dress;
                          if (bookedDress) {
                            setTryingFee(parseFloat(bookedDress.trying_fee || 0).toString());
                          }
                        }
                        setShowFittingModal(true);
                      }}
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                    >
                      <span>حجز موعد قياس 📐</span>
                    </button>
                    <button
                      onClick={() => handleOpenBookingModal(bride)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[8.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-200 flex-shrink-0"
                      title="تعديل الحجز / استبدال الفستان"
                    >
                      <Edit3 size={10} className="text-slate-500" />
                      <span>تعديل</span>
                    </button>
                  </div>
                </div>
              );
            }

            if (stage === 'fitting') {
              return (
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedBrideForFitting(bride);
                        const bookedDressId = bride.bookings?.[0]?.dress_id;
                        if (bookedDressId) {
                          setFittingDressId(bookedDressId.toString());
                          const bookedDress = bride.bookings?.[0]?.dress;
                          if (bookedDress) {
                            setTryingFee(parseFloat(bookedDress.trying_fee || 0).toString());
                          }
                        }
                        setShowFittingModal(true);
                      }}
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                    >
                      <span>بروفة إضافية 📐</span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await apiClient.put(`/clients/${bride.id}/stage-action`, { action: 'end_fitting' });
                          fetchBrides();
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                    >
                      <span>إنهاء البروفة ✂️</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/fittings')}
                    className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[8.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <Ruler size={10} className="text-slate-500" />
                    <span>كارت القياسات والترزي 🪡</span>
                  </button>
                </div>
              );
            }

            if (stage === 'picked_up') {
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
                  <div className="space-y-1">
                    {isPickupOverdue && (
                      <div className="text-[7.5px] font-black text-rose-700 bg-rose-50 border border-rose-200 p-1 rounded-lg text-center leading-tight">
                        ⚠️ تنبيه: حان موعد استلام الفستان!
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedBrideForPickup(bride);
                          setIsPickupModalOpen(true);
                        }}
                        className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[9.5px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                      >
                        <span>تسليم الفستان للعروس 📦</span>
                      </button>
                      <button
                        onClick={() => handleSendPickupReminderWhatsApp(bride)}
                        className="w-7 h-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer flex-shrink-0 shadow-2xs"
                        title="تذكير بموعد الاستلام واتساب"
                      >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-3.5 h-3.5" style={{ filter: 'brightness(0) invert(1)' }} />
                      </button>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="space-y-1">
                    <div className="text-[8px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-center">
                      📦 الفستان خارج الأتيليه
                    </div>
                    <button
                      onClick={() => {
                        setSelectedBrideForReturn(bride);
                        setIsReturnModalOpen(true);
                      }}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9.5px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                    >
                      <span>تسجيل إرجاع الفستان 🔄</span>
                    </button>
                  </div>
                );
              }
            }

            if (stage === 'returned') {
              return (
                <div className="space-y-1">
                  <div className="text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-center">
                    ✓ تم استلام الفستان بنجاح
                  </div>
                  <button
                    onClick={async () => {
                      let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nألف مبروك لجميلتنا الرائعة *${bride.name}* 🤍👰🏻‍♀️،\nنتمنى لكِ حياة زوجية سعيدة ومليئة بالحب والفرح! سعدنا جداً بكوننا جزءاً من يومكِ المميز وتألقكِ بفستان أحلامكِ المختار من فساتين صوفيا 👗💖✨`;
                      try {
                        const templates = await apiClient.get('/whatsapp-templates');
                        const t = templates.find((x) => x.key === 'wedding_congratulations');
                        if (t) {
                          message = t.body.replace(/\{\{client_name\}\}/g, bride.name);
                        }
                      } catch (e) {}
                      const phone = (bride.phone || '').replace(/[^\d]/g, '');
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9.5px] font-extrabold transition-all cursor-pointer shadow-2xs"
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
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 flex flex-col min-h-full overflow-y-auto bg-slate-50/50 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">العملاء والعرائس</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">متابعة مسار رحلة كل عروس بالتفصيل</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <div className="relative w-40 xs:w-56 flex-grow md:flex-grow-0">
            <input
              type="text"
              placeholder="بحث عن عميلة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-white border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700 shadow-sm" />

            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          </div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-sm active:scale-95 cursor-pointer whitespace-nowrap">
            <Package size={14} />
            <span>استيراد شيت إكسيل</span>
          </button>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-sm active:scale-95 cursor-pointer whitespace-nowrap">

            <Plus size={14} />
            <span>إضافة عميلة</span>
          </button>
        </div>
      </div>

      {/* Wedding Month Filter Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-150 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Calendar size={16} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-800">تصفية بحسب شهر الزفاف</h3>
            <p className="text-[10px] text-slate-400 font-bold">تقسيم وتصنيف العرائس بناءً على موعد الفرح</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 max-w-full">
          <button
            onClick={() => { setSelectedWeddingMonth('all'); setActivePage(1); setArchivePage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedWeddingMonth === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>جميع الشهور</span>
            <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${selectedWeddingMonth === 'all' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {bridesList.length}
            </span>
          </button>

          {weddingMonthsOptions.map((m) => (
            <button
              key={m.key}
              onClick={() => { setSelectedWeddingMonth(m.key); setActivePage(1); setArchivePage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedWeddingMonth === m.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{m.label}</span>
              <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${selectedWeddingMonth === m.key ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {m.count}
              </span>
            </button>
          ))}
        </div>
        
        <button
          onClick={() => {
            setBookedDressesMonthFilter(selectedWeddingMonth);
            setBookedDressesSearch('');
            setBookedDressesPage(1);
            setIsBookedDressesModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all flex-shrink-0 whitespace-nowrap cursor-pointer active:scale-95 shadow-xs"
        >
          <LayoutGrid size={16} />
          <span>الفساتين المحجوزة ({allBookedDressesList.length})</span>
        </button>
      </div>

      {/* Active Brides Section */}
      <div className="flex-1 bg-white rounded-3xl p-5 border border-slate-100 flex flex-col overflow-hidden shadow-sm">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h2 className="text-xs font-extrabold text-slate-600">العرائس النشطات ({activeBrides.length})</h2>
          {totalActivePages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={activePage === 1}
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer">
                السابق
              </button>
              <span className="text-xs font-bold text-slate-500">{activePage} / {totalActivePages}</span>
              <button
                disabled={activePage === totalActivePages}
                onClick={() => setActivePage((p) => Math.min(totalActivePages, p + 1))}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer">
                التالي
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin select-none">
          {paginatedActiveBrides.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
              {paginatedActiveBrides.map((bride, idx) => renderBrideCard(bride, idx))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs font-bold">لا يوجد عرائس نشطات حالياً.</div>
          )}
        </div>
      </div>

      {/* Previous Brides Section */}
      <div className="flex-1 bg-white rounded-3xl p-5 border border-slate-100 flex flex-col overflow-hidden shadow-sm">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-extrabold text-slate-600">العرائس السابقات (الأرشيف) ({previousBrides.length})</h2>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-650 hover:bg-emerald-700 text-emerald-600 border border-emerald-200 rounded-xl transition-all duration-300 text-[10px] font-bold shadow-xs active:scale-95 cursor-pointer hover:bg-emerald-50">
              <span>تصدير إكسل (CSV)</span>
            </button>
          </div>

          {totalArchivePages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={archivePage === 1}
                onClick={() => setArchivePage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer">
                السابق
              </button>
              <span className="text-xs font-bold text-slate-500">{archivePage} / {totalArchivePages}</span>
              <button
                disabled={archivePage === totalArchivePages}
                onClick={() => setArchivePage((p) => Math.min(totalArchivePages, p + 1))}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer">
                التالي
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin select-none">
          {paginatedPreviousBrides.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
              {paginatedPreviousBrides.map((bride, idx) => renderBrideCard(bride, idx))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs font-bold">لا يوجد عرائس سابقات في الأرشيف.</div>
          )}
        </div>
      </div>

      {/* Add Bride Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[min(90vh,640px)] sm:max-h-[min(88vh,700px)] my-auto">
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-sm font-extrabold text-slate-800">تسجيل ملف عروس جديدة</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddBrideSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 min-h-0 text-right scrollbar-thin">
                {/* Image Upload Option */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600 block">صورة العروس (اختياري)</label>
                  {imagePreviewUrl ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                      <img src={imagePreviewUrl} alt="Bride Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setBrideImage(null); setImagePreviewUrl(null); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-sm cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-1 w-full py-2.5 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all">
                      <Plus size={15} className="text-indigo-500" />
                      <span className="text-[10px] font-bold text-slate-500">اضغط لرفع صورة العروس</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setBrideImage(file);
                            setImagePreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">اسم العروس الكامل</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ريم عبدالله"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">رقم الجوال الأساسي</label>
                    <input
                      type="tel"
                      required
                      placeholder="مثال: 01012345678"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-mono text-right"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">رقم هاتف إضافي (اختياري)</label>
                    <input
                      type="tel"
                      placeholder="رقم آخر / مرافق..."
                      value={newPhone2}
                      onChange={(e) => setNewPhone2(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-mono text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">المدينة / المحافظة</label>
                    <input
                      type="text"
                      list="egypt-cities-datalist"
                      required
                      placeholder="اختر أو اكتب المدينة..."
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">مصدر العميل</label>
                    <select
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    >
                      <option value="انستقرام">انستقرام</option>
                      <option value="فيسبوك">فيسبوك</option>
                      <option value="تيك توك">تيك توك</option>
                      <option value="إحالة">إحالة / توصية</option>
                      <option value="موقع">الموقع الإلكتروني</option>
                      <option value="واتساب">واتساب</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">تاريخ الزيارة</label>
                    <input
                      type="date"
                      required
                      value={newVisitDate}
                      onChange={(e) => setNewVisitDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ الزفاف (الفرح)</label>
                  <input
                    type="date"
                    value={newWeddingDate}
                    onChange={(e) => setNewWeddingDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>

                {/* Fast Dress Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-600">
                      الفساتين المهتمة بها <span className="text-[10px] font-bold text-indigo-600">({selectedModels.length}/3 فساتين)</span>
                    </label>
                    {selectedModels.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedModels([])}
                        className="text-[10px] text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
                      >
                        مسح المختار
                      </button>
                    )}
                  </div>

                  {/* Selected Chips */}
                  {selectedModels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-indigo-50/50 rounded-xl border border-indigo-100/60">
                      {selectedModels.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white rounded-xl text-[10px] font-bold shadow-xs"
                        >
                          <span>{m}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleModelSelection(m)}
                            className="hover:bg-indigo-700 rounded-full p-0.5 transition-colors cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Fast Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 بحث سريع عن الفستان بالاسم أو الكود..."
                      value={brideDressSearch}
                      onChange={(e) => setBrideDressSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    />
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    {brideDressSearch && (
                      <button
                        type="button"
                        onClick={() => setBrideDressSearch('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Dresses List with instant filter */}
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100 max-h-24 sm:max-h-28 overflow-y-auto scrollbar-thin">
                    {dressesList
                      .filter((d) => {
                        if (!brideDressSearch.trim()) return true;
                        const q = brideDressSearch.toLowerCase().trim();
                        return (
                          d.name?.toLowerCase().includes(q) ||
                          d.code?.toLowerCase().includes(q)
                        );
                      })
                      .map((dress) => {
                        const isSelected = selectedModels.includes(dress.name);
                        return (
                          <button
                            type="button"
                            key={dress.id}
                            onClick={() => handleToggleModelSelection(dress.name)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200'
                            }`}
                          >
                            {dress.name} {dress.code ? <span className="opacity-70 font-mono text-[9px]">({dress.code})</span> : ''}
                          </button>
                        );
                      })}
                    {dressesList.filter((d) => {
                      if (!brideDressSearch.trim()) return true;
                      const q = brideDressSearch.toLowerCase().trim();
                      return d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q);
                    }).length === 0 && (
                      <div className="w-full text-center py-2 text-[10px] font-bold text-slate-400">
                        لا توجد فساتين مطابقة للبحث "{brideDressSearch}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">ملاحظات</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="تفضيلات العروس..."
                    className="w-full h-12 min-h-[44px] p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 sm:p-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 text-center">
                  حفظ ملف العروس
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bride Modal */}
      {editingBride && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[min(90vh,640px)] sm:max-h-[min(88vh,700px)] my-auto">
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-sm font-extrabold text-slate-800">تعديل بيانات العروس</h3>
              <button onClick={() => setEditingBride(null)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditBrideSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 min-h-0 text-right scrollbar-thin">
                {/* Image Upload Option */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600 block">صورة العروس (اختياري)</label>
                  {imagePreviewUrl ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                      <img src={imagePreviewUrl} alt="Bride Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setBrideImage(null); setImagePreviewUrl(null); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-sm cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-1 w-full py-2.5 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all">
                      <Plus size={15} className="text-indigo-500" />
                      <span className="text-[10px] font-bold text-slate-500">اضغط لرفع صورة جديدة للعروس</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setBrideImage(file);
                            setImagePreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">اسم العروس</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">رقم الهاتف الأساسي</label>
                    <input
                      type="text"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-mono text-right"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">رقم هاتف إضافي (اختياري)</label>
                    <input
                      type="text"
                      placeholder="رقم آخر / مرافق..."
                      value={newPhone2}
                      onChange={(e) => setNewPhone2(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-mono text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">المدينة / المحافظة</label>
                    <input
                      type="text"
                      list="egypt-cities-datalist"
                      required
                      placeholder="اختر أو اكتب المدينة..."
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">مصدر العميل</label>
                    <select
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    >
                      <option value="انستقرام">انستقرام</option>
                      <option value="فيسبوك">فيسبوك</option>
                      <option value="تيك توك">تيك توك</option>
                      <option value="إحالة">إحالة / توصية</option>
                      <option value="موقع">الموقع الإلكتروني</option>
                      <option value="واتساب">واتساب</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ الزفاف (الفرح)</label>
                  <input
                    type="date"
                    value={newWeddingDate}
                    onChange={(e) => setNewWeddingDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>

                {/* Fast Dress Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-600">
                      الفساتين المهتمة بها <span className="text-[10px] font-bold text-indigo-600">({selectedModels.length}/3 فساتين)</span>
                    </label>
                    {selectedModels.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedModels([])}
                        className="text-[10px] text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
                      >
                        مسح المختار
                      </button>
                    )}
                  </div>

                  {/* Selected Chips */}
                  {selectedModels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-indigo-50/50 rounded-xl border border-indigo-100/60">
                      {selectedModels.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white rounded-xl text-[10px] font-bold shadow-xs"
                        >
                          <span>{m}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleModelSelection(m)}
                            className="hover:bg-indigo-700 rounded-full p-0.5 transition-colors cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Fast Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 بحث سريع عن الفستان بالاسم أو الكود..."
                      value={brideDressSearch}
                      onChange={(e) => setBrideDressSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    />
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    {brideDressSearch && (
                      <button
                        type="button"
                        onClick={() => setBrideDressSearch('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Dresses List with instant filter */}
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100 max-h-24 sm:max-h-28 overflow-y-auto scrollbar-thin">
                    {dressesList
                      .filter((d) => {
                        if (!brideDressSearch.trim()) return true;
                        const q = brideDressSearch.toLowerCase().trim();
                        return (
                          d.name?.toLowerCase().includes(q) ||
                          d.code?.toLowerCase().includes(q)
                        );
                      })
                      .map((dress) => {
                        const isSelected = selectedModels.includes(dress.name);
                        return (
                          <button
                            type="button"
                            key={dress.id}
                            onClick={() => handleToggleModelSelection(dress.name)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200'
                            }`}
                          >
                            {dress.name} {dress.code ? <span className="opacity-70 font-mono text-[9px]">({dress.code})</span> : ''}
                          </button>
                        );
                      })}
                    {dressesList.filter((d) => {
                      if (!brideDressSearch.trim()) return true;
                      const q = brideDressSearch.toLowerCase().trim();
                      return d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q);
                    }).length === 0 && (
                      <div className="w-full text-center py-2 text-[10px] font-bold text-slate-400">
                        لا توجد فساتين مطابقة للبحث "{brideDressSearch}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">ملاحظات</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="ملاحظات..."
                    className="w-full h-12 min-h-[44px] p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 sm:p-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 text-center">
                  حفظ التعديلات
                </button>
                <button type="button" onClick={() => setEditingBride(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm?.isOpen &&
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-xl space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 size={20} className="animate-pulse" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 text-center">{deleteConfirm.title}</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed text-center whitespace-pre-line">{deleteConfirm.message}</p>
            <div className="flex items-center gap-3">
              <button onClick={() => { deleteConfirm.onConfirm(); setDeleteConfirm(null); }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95">
                تأكيد الحذف
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      }

      {/* Pickup stage Confirmation Modal */}
      {isPickupModalOpen && selectedBrideForPickup && (() => {
        const booking = selectedBrideForPickup.bookings?.[0];
        const dress = booking?.dress;
        const dress2 = booking?.dress2;
        const dress3 = booking?.dress3;

        const accessoriesList = [
          ...(dress?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress.name })),
          ...(dress2?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress2.name })),
          ...(dress3?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress3.name }))];


        const totalPaid = booking?.revenues?.reduce((sum, rev) => sum + parseFloat(rev.amount), 0) || parseFloat(booking?.deposit_amount || 0);
        const remaining = parseFloat(booking?.total_amount || 0) - totalPaid;

        const handlePickupConfirm = async (e) => {
          e.preventDefault();
          try {
            const validBal = recordPickupPayment ? pickupRemainingPayments.filter(p => parseFloat(p.amount) > 0) : [];
            const validIns = pickupInsurancePayments.filter(p => parseFloat(p.amount) > 0);
            const totalIns = validIns.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

            // Send to stage-action PUT which handles recording revenues and marking picked_up
            await apiClient.put(`/clients/${selectedBrideForPickup.id}/stage-action`, {
              action: 'mark_picked_up',
              insurance_amount: totalIns,
              balance_payments: validBal,
              insurance_payments: validIns,
              receipt_image: pickupReceipt
            });

            setIsPickupModalOpen(false);
            setSelectedBrideForPickup(null);
            setPickupReceipt(null);
            fetchBrides();
          } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء حفظ البيانات');
          }
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg border border-slate-100 shadow-xl overflow-hidden flex flex-col max-h-[min(90vh,640px)] sm:max-h-[min(88vh,700px)] my-auto">
              <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="text-sm font-extrabold text-slate-800">تسليم الفستان للعروس</h3>
                <button onClick={() => { setIsPickupModalOpen(false); setSelectedBrideForPickup(null); }} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePickupConfirm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 min-h-0 text-right scrollbar-thin">
                  {/* Client and Dress info */}
                  <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-3 space-y-1">
                    <h4 className="text-xs font-black text-indigo-700">بيانات العروس والفستان</h4>
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-700 mt-1">
                      <div>العروس: <span className="font-extrabold">{selectedBrideForPickup.name}</span></div>
                      <div>الهاتف: <span className="font-mono">{selectedBrideForPickup.phone}</span></div>
                      <div className="col-span-2 border-t border-slate-150 pt-1.5 mt-0.5">
                        الفستان الأساسي: <span className="font-extrabold">{dress?.name || '—'} (مقاس: {dress?.size || '—'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 space-y-1.5">
                    <h4 className="text-xs font-black text-slate-700">ملخص الحساب المالي للفستان</h4>
                    <div className="grid grid-cols-3 gap-2 text-[9px] font-extrabold text-slate-500">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-100 text-center">
                        <div className="text-slate-400 mb-0.5">الإجمالي</div>
                        <div className="text-slate-800 font-black text-xs">{parseFloat(booking?.total_amount || 0).toLocaleString()} ج.م</div>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-100 text-center">
                        <div className="text-slate-400 mb-0.5">المدفوع سابقاً</div>
                        <div className="text-emerald-600 font-black text-xs">{totalPaid.toLocaleString()} ج.م</div>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-100 text-center">
                        <div className="text-slate-400 mb-0.5">المتبقي</div>
                        <div className="text-rose-600 font-black text-xs">{remaining.toLocaleString()} ج.م</div>
                      </div>
                    </div>

                    {/* Payment Inputs */}
                    {remaining > 0 && (
                      <div className="pt-1.5 space-y-1.5 border-t border-slate-150">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={recordPickupPayment}
                            onChange={(e) => setRecordPickupPayment(e.target.checked)}
                            className="w-3.5 h-3.5 text-indigo-650 border-slate-350 rounded-sm"
                          />
                          <span className="text-[10px] font-bold text-slate-700">تسجيل سداد المبلغ المتبقي الآن</span>
                        </label>
                        {recordPickupPayment && (
                          <MultiPaymentMethodInput
                            payments={pickupRemainingPayments}
                            onChange={(updated) => {
                              setPickupRemainingPayments(updated);
                              const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                              setPickupPaymentAmount(total.toString());
                            }}
                            totalExpected={remaining}
                            label="طرق ومبالغ سداد المتبقي"
                          />
                        )}
                      </div>
                    )}

                    {/* Insurance Input */}
                    <div className="pt-2 border-t border-slate-150">
                      <MultiPaymentMethodInput
                        payments={pickupInsurancePayments}
                        onChange={(updated) => {
                          setPickupInsurancePayments(updated);
                          const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                          setPickupInsuranceAmount(total.toString());
                        }}
                        totalExpected={parseFloat(pickupInsuranceAmount) || null}
                        label="طرق ومبلغ التأمين المستلم (تأمين مسترد)"
                      />
                      <p className="text-[8.5px] text-slate-400 font-bold mt-1 text-right">
                        * هذا المبلغ تأمين مسترد يتم إرجاعه للعميلة عند إرجاع الفستان سليم.
                      </p>
                    </div>
                  </div>

                  {/* Accessories Checklist */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-slate-700">قائمة إكسسوارات الفستان (تأكيد التسليم للعروس)</h4>
                    {accessoriesList.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {accessoriesList.map((acc, idx) => {
                          const key = `${acc.name}_${idx}`;
                          return (
                            <label key={idx} className="flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-slate-100">
                              <input
                                type="checkbox"
                                checked={!!checkedAccessories[key]}
                                onChange={(e) => setCheckedAccessories({ ...checkedAccessories, [key]: e.target.checked })}
                                className="w-3.5 h-3.5 text-indigo-650 border-slate-250 rounded-sm focus:ring-indigo-500"
                              />
                              <span className="text-[10px] font-bold text-slate-700">
                                {acc.name} <span className="text-slate-400 font-normal">({acc.dressName})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-slate-400 text-xs font-bold bg-slate-50 border border-slate-100 rounded-2xl">
                        لا يوجد إكسسوارات مسجلة لهذا الفستان في النظام.
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed Action Buttons Footer */}
                <div className="flex items-center gap-2.5 p-3 sm:p-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                  <button type="submit" className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 text-center">
                    تأكيد تسليم الفستان والملحقات
                  </button>
                  <button type="button" onClick={() => { setIsPickupModalOpen(false); setSelectedBrideForPickup(null); }} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Return stage Confirmation Modal */}
      {isReturnModalOpen && selectedBrideForReturn && (() => {
        const booking = selectedBrideForReturn.bookings?.[0];
        const dress = booking?.dress;
        const dress2 = booking?.dress2;
        const dress3 = booking?.dress3;

        const accessoriesList = [
          ...(dress?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress.name })),
          ...(dress2?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress2.name })),
          ...(dress3?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress3.name }))
        ];

        const handleReturnConfirm = async (e) => {
          e.preventDefault();
          try {
            // Update booking notes with condition
            if (booking) {
              await apiClient.put(`/bookings/${booking.id}`, {
                client_id: booking.client_id,
                dress_id: booking.dress_id,
                dress_2_id: booking.dress_2_id,
                dress_3_id: booking.dress_3_id,
                booking_date: booking.booking_date,
                event_date: booking.event_date,
                status: 'returned',
                total_amount: booking.total_amount,
                deposit_amount: booking.deposit_amount,
                insurance_amount: booking.insurance_amount,
                notes: (booking.notes ? booking.notes + ' | ' : '') + `[إرجاع: ${returnNotes}]`
              });
            }

            // Call stage-action PUT
            await apiClient.put(`/clients/${selectedBrideForReturn.id}/stage-action`, {
              action: 'mark_returned',
              damage_deduction: parseFloat(damageDeduction || 0),
              damage_notes: damageNotes
            });

            setIsReturnModalOpen(false);
            setSelectedBrideForReturn(null);
            setDamageDeduction('0');
            setDamageNotes('');
            fetchBrides();
          } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء حفظ البيانات');
          }
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg border border-slate-100 shadow-xl overflow-hidden flex flex-col max-h-[min(90vh,640px)] sm:max-h-[min(88vh,700px)] my-auto">
              <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="text-sm font-extrabold text-slate-800">تسجيل استلام وإرجاع الفستان</h3>
                <button onClick={() => { setIsReturnModalOpen(false); setSelectedBrideForReturn(null); }} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleReturnConfirm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 min-h-0 text-right scrollbar-thin">
                  {/* Client and Dress info */}
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3 space-y-1">
                    <h4 className="text-xs font-black text-emerald-700">بيانات العروس والفستان المرتجع</h4>
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-700 mt-1">
                      <div>العروس: <span className="font-extrabold">{selectedBrideForReturn.name}</span></div>
                      <div>الهاتف: <span className="font-mono">{selectedBrideForReturn.phone}</span></div>
                      <div className="col-span-2 border-t border-slate-150 pt-1.5 mt-0.5">
                        الفستان الأساسي: <span className="font-extrabold">{dress?.name || '—'} (مقاس: {dress?.size || '—'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Return Checklist */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-rose-650 flex items-center gap-1.5">
                      <span>⚠️ يرجى جرد قائمة الملحقات والتأكد من استلامها كاملة:</span>
                    </h4>
                    {accessoriesList.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {accessoriesList.map((acc, idx) => {
                          const key = `${acc.name}_${idx}`;
                          return (
                            <label key={idx} className="flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-slate-100">
                              <input
                                type="checkbox"
                                checked={!!returnCheckedAccessories[key]}
                                onChange={(e) => setReturnCheckedAccessories({ ...returnCheckedAccessories, [key]: e.target.checked })}
                                className="w-3.5 h-3.5 text-indigo-650 border-slate-250 rounded-sm focus:ring-indigo-500"
                              />
                              <span className="text-[10px] font-bold text-slate-700">
                                {acc.name} <span className="text-slate-400 font-normal">({acc.dressName})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-slate-400 text-xs font-bold bg-slate-50 border border-slate-100 rounded-2xl">
                        لا يوجد إكسسوارات مسجلة لهذا الفستان في النظام.
                      </div>
                    )}
                  </div>

                  {/* Insurance & Damage Deduction Section */}
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-amber-900">
                      <span>مبلغ التأمين المحصل:</span>
                      <span className="font-mono text-sm">{parseFloat(booking?.insurance_amount || 5000).toLocaleString()} ج.م</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/60">
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-700 block mb-0.5">خصم تلفيات / صيانة (اختياري)</label>
                        <input
                          type="number"
                          min="0"
                          max={parseFloat(booking?.insurance_amount || 5000)}
                          value={damageDeduction}
                          onChange={(e) => setDamageDeduction(e.target.value)}
                          placeholder="0"
                          className="w-full p-1.5 bg-white border border-amber-200 rounded-xl text-xs font-bold focus:outline-none text-right font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-700 block mb-0.5">سبب خصم التلفيات</label>
                        <input
                          type="text"
                          value={damageNotes}
                          onChange={(e) => setDamageNotes(e.target.value)}
                          placeholder="مثال: حرق في الذيل / قطع سحاب"
                          className="w-full p-1.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold focus:outline-none text-right"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-black text-emerald-800 pt-1 border-t border-amber-200/60">
                      <span>صافي التأمين المسترد للعروس:</span>
                      <span className="font-mono text-sm font-extrabold bg-emerald-100 text-emerald-850 px-2 py-0.5 rounded-lg">
                        {Math.max(0, parseFloat(booking?.insurance_amount || 5000) - parseFloat(damageDeduction || 0)).toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>

                  {/* Return Condition Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600 block">حالة الفستان والملاحظات عند الاستلام</label>
                    <textarea
                      required
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="مثال: تم الإرجاع سليم وبحالة جيدة للغسيل..."
                      className="w-full h-12 min-h-[44px] p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    />
                  </div>
                </div>

                {/* Fixed Action Buttons Footer */}
                <div className="flex items-center gap-2.5 p-3 sm:p-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                  <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 text-center">
                    تأكيد إرجاع الفستان وحفظ الملحقات
                  </button>
                  <button type="button" onClick={() => { setIsReturnModalOpen(false); setSelectedBrideForReturn(null); }} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Fitting Appointment Booking Popup Modal */}
      {showFittingModal && selectedBrideForFitting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[min(90vh,620px)] sm:max-h-[min(88vh,660px)] my-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-3.5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <Calendar size={14} className="text-indigo-650 animate-pulse" />
                <span>حجز موعد بروفة قياس جديدة للعروس</span>
              </h3>
              <button
                onClick={() => { setShowFittingModal(false); setSelectedBrideForFitting(null); }}
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
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right"
                    />
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
                    {selectedBrideForFitting?.bookings?.[0]?.dress2 ? 'فساتين البروفة (الفستانين المحجوزين للعروس)' : 'فستان البروفة (الفستان المحجوز)'}
                  </label>
                  {(() => {
                    const booking = selectedBrideForFitting?.bookings?.[0];
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
                  <label className="text-[10px] font-extrabold text-slate-550 block text-right">ملاحظات إضافية</label>
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
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md text-center active:scale-95"
                >
                  تأكيد وحجز موعد القياس
                </button>
                <button
                  type="button"
                  onClick={() => { setShowFittingModal(false); setSelectedBrideForFitting(null); }}
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
      {showBookingModal && selectedBrideForBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[min(92vh,720px)] my-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-3.5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <Heart size={14} className="text-rose-600 animate-pulse" />
                <span>تأكيد حجز فستان للعروس ({selectedBrideForBooking.name})</span>
              </h3>
              <button
                onClick={() => { setShowBookingModal(false); setSelectedBrideForBooking(null); }}
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
                      value={employeesList.some(e => e.name === bookingSalesName) ? bookingSalesName : (bookingSalesName ? '__custom__' : '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== '__custom__') {
                          setBookingSalesName(val);
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
                    {(!employeesList.some(e => e.name === bookingSalesName) || bookingSalesName === '') && (
                      <input
                        type="text"
                        placeholder="أو اكتب اسم السيلز..."
                        value={bookingSalesName}
                        onChange={(e) => setBookingSalesName(e.target.value)}
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
                  <label className="text-[10px] font-extrabold text-slate-550 block text-right">ملاحظات إضافية</label>
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
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md text-center active:scale-95"
                >
                  {(isBookingDateBlocked || isBookingDate2Blocked) ? 'تأكيد الحجز (يوجد تعارض)' : 'تأكيد الحجز وتثبيت التاريخ'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowBookingModal(false); setSelectedBrideForBooking(null); }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
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

      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col text-right">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">استيراد شيت الإكسيل مباشرة</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">رفع شيت العرائس وتلقائياً قراءة وتوزيع البيانات والماليات</p>
              </div>
              <button
                onClick={() => { setIsImportModalOpen(false); setImportFile(null); setImportStatus(null); }}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-indigo-800">
                  <Package size={14} className="text-indigo-600" />
                  <span>الأعمدة المدعومة وتوزيعها تلقائياً:</span>
                </p>
                <p className="text-[11px] leading-relaxed text-indigo-700 font-semibold">
                  اسم العروسه | اسم الفستان | تاريخ الحجز | الديبوزيت | كاش/تحويل (ك = كاش ، ت = انستا) | يوم الاستلام | ميعاد الفرح | يوم التسليم | الباقي | محافظه | التامين | السيلز | ملاحظات
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">اختر ملف الشيت (.csv / .xlsx)</label>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImportFile(file);
                  }}
                  className="w-full text-xs text-slate-500 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-2xl p-2 bg-slate-50"
                />
              </div>

              {importStatus && (
                <div className={`p-3 rounded-2xl text-xs font-extrabold text-center ${importStatus.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {importStatus.message}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsImportModalOpen(false); setImportFile(null); setImportStatus(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer">
                إلغاء
              </button>
              <button
                type="button"
                disabled={!importFile || isImporting}
                onClick={async () => {
                  if (!importFile) return;
                  setIsImporting(true);
                  setImportStatus(null);
                  try {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                      try {
                        const text = e.target.result;
                        const lines = text.split(/\r\n|\n/);
                        const rows = [];
                        let headers = [];
                        lines.forEach((line, idx) => {
                          if (!line.trim()) return;
                          const cols = line.split(/,|\t|;/).map(c => c.replace(/^["']|["']$/g, '').trim());
                          if (idx === 0) {
                            headers = cols;
                          } else {
                            const rowObj = {};
                            cols.forEach((col, cIdx) => {
                              const headerKey = headers[cIdx] ? headers[cIdx].trim() : cIdx;
                              rowObj[headerKey] = col;
                              rowObj[cIdx] = col;
                            });
                            rows.push(rowObj);
                          }
                        });

                        const res = await apiClient.post('/clients/import-excel', { rows });
                        if (res.success) {
                          setImportStatus({ success: true, message: res.message });
                          fetchBrides();
                          setTimeout(() => {
                            setIsImportModalOpen(false);
                            setImportFile(null);
                            setImportStatus(null);
                          }, 1800);
                        } else {
                          setImportStatus({ success: false, message: res.message || 'فشل الاستيراد' });
                        }
                      } catch (err) {
                        setImportStatus({ success: false, message: 'حدث خطأ في قراءة ملف الإكسيل: ' + err.message });
                      } finally {
                        setIsImporting(false);
                      }
                    };
                    reader.readAsText(importFile, 'UTF-8');
                  } catch (err) {
                    setImportStatus({ success: false, message: 'فشل قراءة الملف' });
                    setIsImporting(false);
                  }
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm">
                {isImporting ? 'جاري الاستيراد...' : 'بدء الاستيراد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Remaining Modal */}
      {isPayRemainingModalOpen && selectedBrideForPayRemaining && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-3.5 animate-fade-in max-h-[min(90vh,620px)] sm:max-h-[min(88vh,660px)] overflow-y-auto scrollbar-thin my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">تسجيل سداد المبلغ المتبقي</h3>
                  <p className="text-[10px] text-slate-400 font-bold">العروس: {selectedBrideForPayRemaining.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayRemainingModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Booking Summary Box */}
            {(() => {
              const booking = selectedBrideForPayRemaining.bookings?.[0];
              const totalPaid = booking?.revenues?.reduce((sum, rev) => sum + parseFloat(rev.amount), 0) ?? parseFloat(booking?.deposit_amount || 0);
              const remaining = booking ? Math.max(0, parseFloat(booking?.total_amount || 0) - totalPaid) : 0;
              const dressName = booking?.dress?.name || 'فستان زفاف';

              return (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                    <span>الفستان: {dressName}</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                      إجمالي الإيجار: {parseFloat(booking?.total_amount || 0).toLocaleString()} ج.م
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold pt-0.5">
                    <div className="bg-white p-1.5 rounded-xl border border-slate-100 text-center">
                      <div className="text-slate-400 mb-0.5">المدفوع سابقاً</div>
                      <div className="text-emerald-600 font-black text-xs">{totalPaid.toLocaleString()} ج.م</div>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-slate-100 text-center">
                      <div className="text-slate-400 mb-0.5">المتبقي المطلوب</div>
                      <div className="text-rose-600 font-black text-xs">{remaining.toLocaleString()} ج.م</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handlePayRemainingSubmit} className="space-y-3">
              <MultiPaymentMethodInput
                payments={payRemainingPayments}
                onChange={(updated) => {
                  setPayRemainingPayments(updated);
                  const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                  setPayRemainingAmount(total.toString());
                }}
                totalExpected={expectedRemainingAmount}
                label="طرق ومبالغ السداد"
                required
              />

              {/* ── Insurance Section ── */}
              <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${insuranceEnabled ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-slate-50/60'}`}>
                {/* Toggle header */}
                <button
                  type="button"
                  onClick={() => setInsuranceEnabled(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${insuranceEnabled ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-600'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <span className={`text-[11px] font-extrabold transition-colors ${insuranceEnabled ? 'text-amber-700' : 'text-slate-600 group-hover:text-amber-700'}`}>
                      تأمين مسترد (اختياري)
                    </span>
                    {insuranceEnabled && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
                        يُسترد عند إعادة الفستان
                      </span>
                    )}
                  </div>
                  <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${insuranceEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                    <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                  </div>
                </button>

                {/* Expanded insurance form */}
                {insuranceEnabled && (
                  <div className="px-3 pb-3 space-y-2 border-t border-amber-200/60">
                    {/* Amount row */}
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <div className="relative w-36 flex-shrink-0">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={insuranceAmount}
                          onChange={(e) => {
                            setInsuranceAmount(e.target.value);
                            setInsurancePayments(prev =>
                              prev.map((p, i) => i === 0 ? { ...p, amount: e.target.value } : p)
                            );
                          }}
                          className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-black text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400 text-left font-mono"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-slate-400 pointer-events-none">ج.م</span>
                      </div>
                      <label className="text-[10px] font-extrabold text-amber-700">مبلغ التأمين</label>
                    </div>

                    {/* Payment method + receipt rows */}
                    <MultiPaymentMethodInput
                      payments={insurancePayments}
                      onChange={(updated) => {
                        setInsurancePayments(updated);
                        const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                        setInsuranceAmount(total.toString());
                      }}
                      totalExpected={parseFloat(insuranceAmount) || 0}
                      label="طريقة سداد التأمين"
                      required={false}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-700 block">ملاحظات إضافية (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: تم سداد باقي الفستان وحفظ الإيصال"
                  value={payRemainingNotes}
                  onChange={(e) => setPayRemainingNotes(e.target.value)}
                  className="w-full px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1.5">
                <button
                  type="submit"
                  disabled={isSubmittingPayRemaining}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-emerald-600/10 active:scale-95 text-center"
                >
                  {isSubmittingPayRemaining ? 'جاري التسجيل...' : 'تأكيد وتسجيل الدفعة بالمالية 💰'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPayRemainingModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trying Fee / Quick Payment Modal */}
      {showTryingFeeModal && selectedBrideForTryingFee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-sm w-full border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] space-y-3 max-h-[min(90vh,600px)] overflow-y-auto scrollbar-thin my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <CreditCard size={14} className="text-indigo-650 animate-pulse" />
                <span>إتمام عملية الدفع للعروس ({selectedBrideForTryingFee.name})</span>
              </h3>
              <button
                onClick={() => { setShowTryingFeeModal(false); setSelectedBrideForTryingFee(null); setTryingFeeReceipt(null); }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleTryingFeeSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 block text-right">نوع المعاملة المالية</label>
                <select
                  value={tryingFeeType}
                  onChange={(e) => setTryingFeeType(e.target.value)}
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
                payments={tryingFeePayments}
                onChange={(updated) => {
                  setTryingFeePayments(updated);
                  const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                  setTryingFeeAmount(total.toString());
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
                          setTryingFeeReceipt(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="trying-fee-receipt-input-bridespage"
                  />
                  <label
                    htmlFor="trying-fee-receipt-input-bridespage"
                    className="flex-grow px-3 py-2 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-indigo-650 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                  >
                    <CreditCard size={12} className="inline mr-1" />
                    <span>{tryingFeeReceipt ? 'تغيير الإيصال المرفق' : 'رفع صورة الإيصال 📎'}</span>
                  </label>
                  {tryingFeeReceipt && (
                    <button
                      type="button"
                      onClick={() => setTryingFeeReceipt(null)}
                      className="p-2 bg-rose-50 border border-rose-100 text-rose-500 rounded-xl hover:bg-rose-100/60 transition-all cursor-pointer text-xs"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                {tryingFeeReceipt && (
                  <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[80px] flex items-center justify-center bg-slate-50 mt-1">
                    <img src={tryingFeeReceipt} alt="معاينة الإيصال" className="w-full h-full object-contain max-h-[75px]" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 block text-right">ملاحظات وتفاصيل التحويل</label>
                <textarea
                  value={tryingFeeNotes}
                  onChange={(e) => setTryingFeeNotes(e.target.value)}
                  placeholder="تفاصيل إضافية أو مرجع الحوالة..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none h-14"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={isSubmittingTryingFee}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95 text-center"
                >
                  {isSubmittingTryingFee ? 'جاري التسجيل...' : 'تأكيد الدفع'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowTryingFeeModal(false); setSelectedBrideForTryingFee(null); setTryingFeeReceipt(null); }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booked Dresses Modal */}
      {isBookedDressesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4 text-right overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-6xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col h-[90vh] max-h-[92vh] overflow-hidden my-auto">
            {/* Header */}
            <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/90 rounded-t-3xl flex-shrink-0 flex flex-col gap-3">
              {/* Top Row: Title, Count, Close */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-xs flex-shrink-0">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                      <span>الفساتين المحجوزة</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black">
                        {filteredBookedDresses.length} {filteredBookedDresses.length === allBookedDressesList.length ? 'فستان' : `من أصل ${allBookedDressesList.length} فستان`}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold">
                      عرض جميع الفساتين المحجوزة النشطة وتفاصيلها ومواعيد الزفاف
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsBookedDressesModalOpen(false);
                    setBookedDressesSearch('');
                    setBookedDressesDateFilter('');
                    setBookedDressesPage(1);
                  }}
                  className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all cursor-pointer shadow-xs"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Middle Row: Text Search Input & Date Search Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                {/* Live Text Search */}
                <div className="relative sm:col-span-7">
                  <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={bookedDressesSearch}
                    onChange={(e) => {
                      setBookedDressesSearch(e.target.value);
                      setBookedDressesPage(1);
                    }}
                    placeholder="بحث بالاسم، الكود، العروس، الهاتف، أو التاريخ (مثال: 15-08-2026)..."
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs"
                  />
                  {bookedDressesSearch && (
                    <button
                      onClick={() => {
                        setBookedDressesSearch('');
                        setBookedDressesPage(1);
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Date Picker Input */}
                <div className="sm:col-span-5 flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 pointer-events-none" />
                    <input
                      type="date"
                      value={bookedDressesDateFilter}
                      onChange={(e) => {
                        setBookedDressesDateFilter(e.target.value);
                        setBookedDressesPage(1);
                      }}
                      className="w-full pl-7 pr-8 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all shadow-2xs cursor-pointer"
                      title="البحث بتاريخ محدد"
                    />
                    {bookedDressesDateFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          setBookedDressesDateFilter('');
                          setBookedDressesPage(1);
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 text-xs font-bold p-0.5 cursor-pointer"
                        title="إلغاء فلتر التاريخ"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Date Target Selector (Wedding / Booking date) */}
                  <select
                    value={bookedDressesDateType}
                    onChange={(e) => {
                      setBookedDressesDateType(e.target.value);
                      setBookedDressesPage(1);
                    }}
                    className="px-2 py-2 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 focus:outline-none focus:border-rose-400 transition-all shadow-2xs cursor-pointer flex-shrink-0"
                    title="نوع التاريخ المراد مطابقته"
                  >
                    <option value="wedding">موعد الزفاف 👰🏻‍♀️</option>
                    <option value="booking">تاريخ الحجز 📅</option>
                    <option value="all">أي تاريخ</option>
                  </select>
                </div>
              </div>

              {/* Quick Date Presets & Active Date Indicator */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 flex-shrink-0">
                    <Clock size={11} className="text-slate-400" />
                    اختصارات التاريخ:
                  </span>
                  
                  {/* Today Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const y = today.getFullYear();
                      const m = String(today.getMonth() + 1).padStart(2, '0');
                      const d = String(today.getDate()).padStart(2, '0');
                      const todayStr = `${y}-${m}-${d}`;
                      setBookedDressesDateFilter(bookedDressesDateFilter === todayStr ? '' : todayStr);
                      setBookedDressesPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10.5px] font-black transition-all cursor-pointer whitespace-nowrap ${
                      bookedDressesDateFilter === new Date().toISOString().split('T')[0]
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    اليوم
                  </button>

                  {/* Tomorrow Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const y = tomorrow.getFullYear();
                      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
                      const d = String(tomorrow.getDate()).padStart(2, '0');
                      const tomorrowStr = `${y}-${m}-${d}`;
                      setBookedDressesDateFilter(bookedDressesDateFilter === tomorrowStr ? '' : tomorrowStr);
                      setBookedDressesPage(1);
                    }}
                    className="px-2.5 py-1 rounded-xl text-[10.5px] font-black bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 transition-all cursor-pointer whitespace-nowrap"
                  >
                    غداً
                  </button>

                  {/* Clear date if set */}
                  {bookedDressesDateFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setBookedDressesDateFilter('');
                        setBookedDressesPage(1);
                      }}
                      className="px-2 py-1 rounded-xl text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <X size={11} />
                      <span>مسح التاريخ المحدد ({formatDate(bookedDressesDateFilter)})</span>
                    </button>
                  )}
                </div>

                {/* Per Page Quick Selector */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-bold text-slate-400">في الصفحة:</span>
                  <select
                    value={bookedDressesPerPage}
                    onChange={(e) => {
                      setBookedDressesPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value));
                      setBookedDressesPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded-xl px-2 py-1 text-[10.5px] font-bold text-slate-700 focus:outline-none focus:border-rose-400 cursor-pointer shadow-2xs"
                  >
                    <option value="6">6</option>
                    <option value="9">9</option>
                    <option value="12">12</option>
                    <option value="24">24</option>
                    <option value="all">عرض الكل</option>
                  </select>
                </div>
              </div>

              {/* Bottom Row: Month Selector Chips inside Modal */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 border-t border-slate-200/60 pt-2">
                <button
                  onClick={() => {
                    setBookedDressesMonthFilter('all');
                    setBookedDressesPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    bookedDressesMonthFilter === 'all'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <span>جميع الشهور</span>
                  <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                    bookedDressesMonthFilter === 'all' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {allBookedDressesList.length}
                  </span>
                </button>

                {bookedDressesMonthsOptions.map((m) => (
                  <button
                    key={`modal-m-${m.key}`}
                    onClick={() => {
                      setBookedDressesMonthFilter(m.key);
                      setBookedDressesPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      bookedDressesMonthFilter === m.key
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                      bookedDressesMonthFilter === m.key ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {m.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Body Cards Container - SEPARATED SCROLLABLE WRAPPER & GRID */}
            <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 bg-slate-50/80 scrollbar-thin">
              {paginatedBookedDresses.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                  <Package size={52} className="mb-3 opacity-20 text-slate-500" />
                  <p className="text-sm font-extrabold text-slate-600">لا توجد فساتين محجوزة مطابقة لهذا الاختيار</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">جرب اختيار "جميع الشهور" أو مسح عبارة البحث</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                  {paginatedBookedDresses.map((item, idx) => {
                    const dress = item.dress || {};
                    const bride = item.bride || {};
                    const booking = item.booking || {};

                    // Robust Image Resolution
                    let rawImagePath = null;
                    if (Array.isArray(dress.images) && dress.images.length > 0) {
                      const primary = dress.images.find((img) => img.is_primary) || dress.images[0];
                      rawImagePath = primary?.image_path || primary?.image || primary?.url;
                    }
                    if (!rawImagePath && dress.main_image) rawImagePath = dress.main_image;
                    if (!rawImagePath && dress.image_path) rawImagePath = dress.image_path;
                    if (!rawImagePath && dress.image) rawImagePath = dress.image;
                    const imageUrl = rawImagePath ? getStorageUrl(rawImagePath) : 'https://placehold.co/400x500/f8fafc/94a3b8?text=No+Image';

                    // Financial calculations
                    const totalAmount = Number(booking.total_amount) || 0;
                    const revenuesSum = Array.isArray(booking.revenues)
                      ? booking.revenues.reduce((sum, rev) => sum + (Number(rev?.amount) || 0), 0)
                      : 0;
                    const deposit = Number(booking.deposit_amount) || 0;
                    const totalPaid = revenuesSum > 0 ? revenuesSum : deposit;
                    const remaining = Math.max(0, totalAmount - totalPaid);
                    const isFullyPaid = totalAmount > 0 && remaining <= 0;

                    return (
                      <div
                        key={item.id || `item-${idx}`}
                        className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group"
                      >
                        {/* Image Header with Overlay Badges */}
                        <div className="h-52 bg-slate-100 relative overflow-hidden flex-shrink-0">
                          <img
                            src={imageUrl}
                            alt={dress.name || 'فستان'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/400x500/f8fafc/94a3b8?text=No+Image';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />

                          {/* Code Badge & Slot */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                            <span className="bg-white/95 backdrop-blur-md text-slate-800 font-black text-[10.5px] px-2.5 py-1 rounded-xl shadow-xs border border-white/50">
                              كود: {dress.code || 'بدون كود'}
                            </span>
                            {item.slot && (
                              <span className="bg-rose-600/90 backdrop-blur-md text-white font-black text-[9.5px] px-2 py-1 rounded-xl shadow-xs">
                                {item.slot}
                              </span>
                            )}
                          </div>

                          {/* Stage Badge */}
                          <div className="absolute top-2.5 left-2.5">
                            <span className={`font-black text-[9.5px] px-2.5 py-1 rounded-xl backdrop-blur-md shadow-xs ${
                              bride.current_stage === 'picked_up'
                                ? 'bg-amber-500/90 text-white'
                                : bride.current_stage === 'fitting'
                                ? 'bg-purple-600/90 text-white'
                                : 'bg-indigo-600/90 text-white'
                            }`}>
                              {bride.current_stage === 'picked_up' ? 'مستلم خارج الأتيليه' : bride.current_stage === 'fitting' ? 'غرفة القياس' : 'حجز مؤكد'}
                            </span>
                          </div>

                          {/* Dress Name overlay */}
                          <div className="absolute bottom-2.5 right-3 left-3 text-white">
                            <h4 className="text-sm font-black line-clamp-1 drop-shadow-sm">{dress.name || 'فستان غير معروف'}</h4>
                          </div>
                        </div>

                        {/* Card Details */}
                        <div className="p-4 flex flex-col gap-3 flex-1 justify-between bg-white text-right">
                          {/* Dates Grid */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-50/90 p-2.5 rounded-2xl border border-slate-100 text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <Clock size={11} className="text-slate-400" />
                                تاريخ الحجز:
                              </span>
                              <span className="font-black text-slate-700 text-[11px]">
                                {booking.booking_date || booking.created_at ? formatDate(booking.booking_date || booking.created_at) : 'غير مسجل'}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                                <Calendar size={11} className="text-rose-500" />
                                موعد الزفاف:
                              </span>
                              <span className="font-black text-rose-700 text-[11px]">
                                {item.eventDate ? formatDate(item.eventDate) : 'غير محدد'}
                              </span>
                            </div>
                          </div>

                          {/* Payment Status Block */}
                          <div className="p-3 rounded-2xl bg-indigo-50/40 border border-indigo-100/60 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-black text-indigo-950 flex items-center gap-1.5">
                                <CreditCard size={12} className="text-indigo-600" />
                                حالة السداد
                              </span>
                              {isFullyPaid ? (
                                <span className="text-[9.5px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-1">
                                  <CheckCircle2 size={11} />
                                  خالص السداد
                                </span>
                              ) : remaining > 0 ? (
                                <span className="text-[9.5px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-lg flex items-center gap-1">
                                  <AlertCircle size={11} />
                                  متبقي {remaining.toLocaleString()} ج.م
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-lg">
                                  غير محدد
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-1 pt-1.5 text-center border-t border-indigo-100/40">
                              <div>
                                <div className="text-[9px] text-slate-400 font-bold">الإجمالي</div>
                                <div className="text-[11px] font-black text-slate-700">{totalAmount.toLocaleString()} ج.م</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-emerald-600 font-bold">المدفوع</div>
                                <div className="text-[11px] font-black text-emerald-700">{totalPaid.toLocaleString()} ج.م</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-rose-500 font-bold">المتبقي</div>
                                <div className="text-[11px] font-black text-rose-700">{remaining.toLocaleString()} ج.م</div>
                              </div>
                            </div>
                          </div>

                          {/* Bride Details Block */}
                          <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                                  <User size={11} />
                                </div>
                                <span className="font-black text-slate-800 text-xs truncate max-w-[130px]">{bride.name || 'بدون اسم'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                                <MapPin size={10} className="text-slate-400" />
                                <span className="truncate max-w-[90px]">{bride.city || bride.address || 'غير محدد'}</span>
                              </div>
                            </div>

                            {/* Phone Numbers with call/WhatsApp buttons */}
                            <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-1.5 font-bold text-slate-700" dir="ltr">
                                <Phone size={11} className="text-emerald-600" />
                                <span>{bride.phone || 'لا يوجد رقم'}</span>
                                {bride.phone2 && <span className="text-[9.5px] text-slate-400">/ {bride.phone2}</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                {bride.phone && (
                                  <a
                                    href={`https://wa.me/${bride.phone.replace(/[^\d]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-md transition-colors"
                                  >
                                    واتساب
                                  </a>
                                )}
                                {bride.phone && (
                                  <a
                                    href={`tel:${bride.phone}`}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-md transition-colors"
                                  >
                                    اتصال
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-bold text-[11px]">
                  {filteredBookedDresses.length === 0 ? (
                    'لا توجد نتائج'
                  ) : bookedDressesPerPage === 'all' ? (
                    `عرض جميع الـ ${filteredBookedDresses.length} فستان`
                  ) : (
                    `عرض ${(bookedDressesPage - 1) * Number(bookedDressesPerPage) + 1} - ${Math.min(bookedDressesPage * Number(bookedDressesPerPage), filteredBookedDresses.length)} من أصل ${filteredBookedDresses.length} فستان`
                  )}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px] font-semibold">لكل صفحة:</span>
                  <select
                    value={bookedDressesPerPage}
                    onChange={(e) => {
                      setBookedDressesPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value));
                      setBookedDressesPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-rose-400"
                  >
                    <option value="6">6</option>
                    <option value="9">9</option>
                    <option value="12">12</option>
                    <option value="24">24</option>
                    <option value="48">48</option>
                    <option value="all">عرض الكل</option>
                  </select>
                </div>
              </div>

              {totalBookedDressesPages > 1 && bookedDressesPerPage !== 'all' && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={bookedDressesPage === 1}
                    onClick={() => setBookedDressesPage(1)}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-colors cursor-pointer"
                    title="الصفحة الأولى"
                  >
                    «
                  </button>
                  <button
                    disabled={bookedDressesPage === 1}
                    onClick={() => setBookedDressesPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-colors cursor-pointer"
                  >
                    السابق
                  </button>

                  {/* Page numbers with smart window */}
                  {Array.from({ length: totalBookedDressesPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalBookedDressesPages || Math.abs(p - bookedDressesPage) <= 2)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      return (
                        <React.Fragment key={p}>
                          {prev && p - prev > 1 && (
                            <span className="px-1 text-slate-400 font-bold">...</span>
                          )}
                          <button
                            onClick={() => setBookedDressesPage(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              bookedDressesPage === p
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    disabled={bookedDressesPage === totalBookedDressesPages}
                    onClick={() => setBookedDressesPage((p) => Math.min(totalBookedDressesPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-colors cursor-pointer"
                  >
                    التالي
                  </button>
                  <button
                    disabled={bookedDressesPage === totalBookedDressesPages}
                    onClick={() => setBookedDressesPage(totalBookedDressesPages)}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-colors cursor-pointer"
                    title="الصفحة الأخيرة"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Egypt Cities Datalist for Creatable City Selection */}
      <datalist id="egypt-cities-datalist">
        {allCitiesOptions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
};