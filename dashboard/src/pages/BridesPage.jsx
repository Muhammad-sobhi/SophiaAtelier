import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { Search, Plus, X, Trash2, Edit3, Calendar, Ruler, Heart, Package, RotateCcw, Phone, MapPin, CreditCard } from 'lucide-react';

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
  fitting: { label: 'تسليم الفستان للعروس', action: 'mark_picked_up', color: 'bg-rose-600 hover:bg-rose-700' },
  picked_up: { label: 'تسجيل إرجاع الفستان', action: 'mark_returned', color: 'bg-blue-600 hover:bg-blue-700' }
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

export default function BridesPage() {
  const navigate = useNavigate();
  const [bridesList, setBridesList] = useState([]);
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
  const [newSource, setNewSource] = useState('انستقرام');
  const [newVisitDate, setNewVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [newWeddingDate, setNewWeddingDate] = useState('');
  const [newNote, setNewNote] = useState('');
  const [selectedModels, setSelectedModels] = useState([]);

  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [selectedBrideForPickup, setSelectedBrideForPickup] = useState(null);
  const [checkedAccessories, setCheckedAccessories] = useState({});
  const [pickupPaymentAmount, setPickupPaymentAmount] = useState('0');
  const [pickupInsuranceAmount, setPickupInsuranceAmount] = useState('0');
  const [pickupPaymentMethod, setPickupPaymentMethod] = useState('cash');
  const [recordPickupPayment, setRecordPickupPayment] = useState(true);
  const [pickupReceipt, setPickupReceipt] = useState(null);

  // Fitting modal states
  const [showFittingModal, setShowFittingModal] = useState(false);
  const [selectedBrideForFitting, setSelectedBrideForFitting] = useState(null);
  const [fittingDate, setFittingDate] = useState(new Date().toISOString().split('T')[0]);
  const [fittingTime, setFittingTime] = useState('01:00 م');
  const [fittingDressId, setFittingDressId] = useState('');
  const [tryingFee, setTryingFee] = useState('150');
  const [fittingPaymentMethod, setFittingPaymentMethod] = useState('cash');
  const [fittingNotes, setFittingNotes] = useState('');
  const [fittingReceipt, setFittingReceipt] = useState(null);

  // Booking modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBrideForBooking, setSelectedBrideForBooking] = useState(null);
  const [bookingDressId, setBookingDressId] = useState('');
  const [bookingEventDate, setBookingEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTotalAmount, setBookingTotalAmount] = useState('3500');
  const [bookingDepositAmount, setBookingDepositAmount] = useState('1000');
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState('cash');
  const [bookingReceipt, setBookingReceipt] = useState(null);
  const [bookingNotes, setBookingNotes] = useState('');

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

  // Pay Remaining modal states
  const [isPayRemainingModalOpen, setIsPayRemainingModalOpen] = useState(false);
  const [selectedBrideForPayRemaining, setSelectedBrideForPayRemaining] = useState(null);
  const [payRemainingAmount, setPayRemainingAmount] = useState('0');
  const [payRemainingMethod, setPayRemainingMethod] = useState('cash');
  const [payRemainingReceipt, setPayRemainingReceipt] = useState(null);
  const [payRemainingReceiptPreview, setPayRemainingReceiptPreview] = useState(null);
  const [payRemainingNotes, setPayRemainingNotes] = useState('');
  const [isSubmittingPayRemaining, setIsSubmittingPayRemaining] = useState(false);

  const handleOpenPayRemaining = (bride) => {
    const booking = bride.bookings?.[0];
    const totalPaid = booking?.revenues?.reduce((sum, rev) => sum + parseFloat(rev.amount), 0) ?? parseFloat(booking?.deposit_amount || 0);
    const remaining = booking ? Math.max(0, parseFloat(booking?.total_amount || 0) - totalPaid) : 0;
    setSelectedBrideForPayRemaining(bride);
    setPayRemainingAmount(remaining.toString());
    setPayRemainingMethod('cash');
    setPayRemainingReceipt(null);
    setPayRemainingReceiptPreview(null);
    setPayRemainingNotes('');
    setIsPayRemainingModalOpen(true);
  };

  const handlePayRemainingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBrideForPayRemaining || !payRemainingAmount || parseFloat(payRemainingAmount) <= 0) return;

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

      await apiClient.put(`/clients/${selectedBrideForPayRemaining.id}/stage-action`, {
        action: 'pay_remaining',
        amount: parseFloat(payRemainingAmount),
        payment_method: payRemainingMethod,
        notes: payRemainingNotes,
        receipt: receiptBase64
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
      setPickupPaymentAmount(remaining > 0 ? remaining.toString() : '0');
      setPickupInsuranceAmount(booking?.insurance_amount?.toString() || '0');
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

  const fetchBrides = async () => {
    try {
      const response = await apiClient.get('/clients?per_page=1000');
      const data = response.data || [];
      const mapped = data.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
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

    apiClient.get('/dresses').then((res) => {
      const data = res.data?.data || res.data || [];
      setDressesList(data);
      setAvailableDresses(data.map((d) => ({
        id: d.id,
        name: d.name || '',
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

  const handleFittingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBrideForFitting) return;
    try {
      await apiClient.put(`/clients/${selectedBrideForFitting.id}/stage-action`, {
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
      setSelectedBrideForFitting(null);
      fetchBrides();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBrideForBooking) return;
    try {
      await apiClient.put(`/clients/${selectedBrideForBooking.id}/stage-action`, {
        action: 'confirm_booking',
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
      const dressText = dress ? `\n• *فستان الزفاف:* ${dress.name}` : '';

      let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${selectedBrideForBooking.name}* 🤍،\nيسعدنا جداً تأكيد حجز موعدكِ وتجهيز فستان أحلامكِ!\n\n📅 *تفاصيل الموعد:*\n• *التاريخ:* ${visitDate}\n• *الوقت:* ${visitTime}\n${dressText}\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nنحن بانتظار تشريفكِ لتنيري المكان ✨🎀`;

      try {
        const templates = await apiClient.get('/whatsapp-templates');
        const t = templates.find((x) => x.key === 'booking_confirmation');
        if (t) {
          message = t.body.
            replace(/\{\{client_name\}\}/g, selectedBrideForBooking.name).
            replace(/\{\{wedding_date\}\}/g, selectedBrideForBooking.wedding_date || visitDate).
            replace(/\{\{visit_date\}\}/g, visitDate).
            replace(/\{\{visit_time\}\}/g, visitTime).
            replace(/\{\{dress_line\}\}/g, dress ? `${dress.name}` : '');
        }
      } catch (err) {
        console.error('Failed to fetch whatsapp template, using fallback:', err);
      }

      const cleanPhone = selectedBrideForBooking.phone.replace(/[^\d]/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ حجز الفستان');
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
      fd.append('name', newName);
      fd.append('phone', newPhone || '0000000000');
      fd.append('email', `${Date.now()}@atelier-bride.com`);
      fd.append('city', newCity);
      fd.append('address', newCity);
      fd.append('source', mappedSource);
      if (newWeddingDate) {
        fd.append('wedding_date', newWeddingDate);
      }
      fd.append('notes', newNote);
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
    setNewSource(b.source || 'انستقرام');
    setNewWeddingDate(b.wedding_date || '');
    setNewNote(b.notes || '');
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
      fd.append('name', newName);
      fd.append('phone', newPhone || '0000000000');
      fd.append('city', newCity);
      fd.append('address', newCity);
      fd.append('source', mappedSource);
      if (newWeddingDate) {
        fd.append('wedding_date', newWeddingDate);
      }
      fd.append('notes', newNote);
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
    setNewSource('انستقرام');
    setNewVisitDate(new Date().toISOString().split('T')[0]);
    setNewWeddingDate('');
    setNewNote('');
    setSelectedModels([]);
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
  const itemsPerPage = 12;

  const filteredBrides = bridesList.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.phone && b.phone.includes(searchQuery)
  );

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
      `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${bride.image_path}` :
      mockAvatars[idx % mockAvatars.length];
    let actionInfo = STAGE_ACTIONS_CONFIG[bride.current_stage];
    if (bride.current_stage === 'picked_up') {
      const booking = bride.bookings?.[0];
      if (booking?.status === 'picked_up') {
        actionInfo = { label: 'تسجيل إرجاع الفستان', action: 'mark_returned', color: 'bg-blue-600 hover:bg-blue-700' };
      }
    }

    return (
      <div
        key={bride.id}
        className="bg-white rounded-2xl border border-slate-150 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-all relative group">

        <div>
          {/* Top Row: Avatar & Stage Badge */}
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 shadow-xs flex-shrink-0 bg-slate-50">
              <img src={avatar} alt={bride.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-[8.5px] font-extrabold px-2.5 py-1 rounded-full border ${stageColor(bride.current_stage)}`}>
                {stageLabel(bride.current_stage)}
              </span>
              {/* Admin actions overlay on hover */}
              {isAdmin &&
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditBrideClick(bride)}
                    className="p-1 text-indigo-650 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                    title="تعديل">

                    <Edit3 size={11} />
                  </button>
                  <button
                    onClick={() => handleDeleteBride(bride.id)}
                    className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    title="حذف">

                    <Trash2 size={11} />
                  </button>
                </div>
              }
            </div>
          </div>

          {/* Bride Details */}
          <div className="mb-3 space-y-1 text-right">
            <h4 className="text-xs font-black text-slate-800 tracking-tight">{bride.name}</h4>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold justify-start">
              <Phone size={10} className="text-slate-400" />
              <span className="font-mono">{bride.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold justify-start">
              <MapPin size={10} className="text-slate-400" />
              <span>{bride.city || 'Cairo'}</span>
            </div>
            {bride.wedding_date &&
              <div className="text-[8.5px] font-bold text-indigo-650 bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100 leading-tight block w-full mt-1">
                👰🏻‍♀️ موعد الزفاف: {formatDate(bride.wedding_date)}
              </div>
            }
            <div className="text-[8px] text-slate-400 font-extrabold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md inline-block mt-1">
              المصدر: {bride.source || 'Walk-in'}
            </div>
          </div>
        </div>

        {/* Stage Action & Pay Remaining Buttons */}
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
          {(() => {
            const booking = bride.bookings?.[0];
            const totalPaid = booking?.revenues?.reduce((sum, rev) => sum + parseFloat(rev.amount), 0) ?? parseFloat(booking?.deposit_amount || 0);
            const remaining = booking ? Math.max(0, parseFloat(booking?.total_amount || 0) - totalPaid) : 0;

            if (!booking || remaining <= 0) return null;

            return (
              <button
                type="button"
                onClick={() => handleOpenPayRemaining(bride)}
                className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[9.5px] font-black transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 active:scale-95 mb-1.5">
                <CreditCard size={13} />
                <span>سداد المبلغ المتبقي ({remaining.toLocaleString()} ج.م)</span>
              </button>
            );
          })()}
          {bride.current_stage === 'returned' ?
            <button
              onClick={async () => {
                let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nألف مبروك لجميلتنا الرائعة *${bride.name}* 🤍👰🏻‍♀️،\nنتمنى لكِ حياة زوجية سعيدة ومليئة بالحب والفرح! سعدنا جداً بكوننا جزءاً من يومكِ المميز وتألقكِ بفستان أحلامكِ المختار من فساتين صوفيا 👗💖✨`;
                try {
                  const templates = await apiClient.get('/whatsapp-templates');
                  const t = templates.find((x) => x.key === 'wedding_congratulations');
                  if (t) {
                    message = t.body.replace(/\{\{client_name\}\}/g, bride.name);
                  }
                } catch (e) {
                  console.error('Failed to load wedding congratulations template:', e);
                }
                const phone = bride.phone.replace(/[^\d]/g, '');
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-extrabold transition-all cursor-pointer">

              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-3.5 h-3.5" style={{ filter: 'brightness(0) invert(1)' }} />
              <span>إرسال تهنئة الزفاف</span>
            </button> :
            actionInfo ?
              <button
                onClick={async () => {
                  if (actionInfo.action === 'mark_picked_up') {
                    setSelectedBrideForPickup(bride);
                    setIsPickupModalOpen(true);
                  } else if (actionInfo.action === 'mark_returned') {
                    setSelectedBrideForReturn(bride);
                    setIsReturnModalOpen(true);
                  } else if (actionInfo.action === 'confirm_booking') {
                    setSelectedBrideForBooking(bride);
                    setBookingEventDate(bride.wedding_date || new Date().toISOString().split('T')[0]);
                    setShowBookingModal(true);
                  } else if (actionInfo.action === 'schedule_fitting') {
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
                  } else {
                    try {
                      await apiClient.put(`/clients/${bride.id}/stage-action`, { action: actionInfo.action });
                      fetchBrides();
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }}
                className={`w-full py-2.5 text-white rounded-xl text-[9px] font-extrabold transition-all duration-300 active:scale-95 cursor-pointer shadow-xs ${actionInfo.color}`}>

                {actionInfo.label}
              </button> :

              <div className="text-center py-2 text-emerald-650 font-extrabold text-[9px] bg-emerald-50 border border-emerald-100 rounded-xl">
                ✓ الرحلة مكتملة
              </div>
          }
        </div>
      </div>);

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
      {isModalOpen &&
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">تسجيل ملف عروس جديدة</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-605 transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddBrideSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              {/* Image Upload Option */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 block">صورة العروس (اختياري)</label>
                {imagePreviewUrl ?
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                    <img src={imagePreviewUrl} alt="Bride Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setBrideImage(null); setImagePreviewUrl(null); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-sm cursor-pointer">

                      <X size={10} />
                    </button>
                  </div> :

                  <label className="flex flex-col items-center justify-center gap-1.5 w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all">
                    <Plus size={16} className="text-indigo-500" />
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
                      }} />

                  </label>
                }
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اسم العروس الكامل</label>
                <input type="text" required placeholder="مثال: ريم عبدالله" value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">المدينة</label>
                  <select value={newCity} onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                    <option value="القاهرة">القاهرة</option>
                    <option value="الجيزة">الجيزة</option>
                    <option value="الإسكندرية">الإسكندرية</option>
                    <option value="طنطا">طنطا</option>
                    <option value="المنصورة">المنصورة</option>
                    <option value="أخرى خارج القاهرة">أخرى خارج القاهرة</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">رقم الجوال</label>
                  <input type="tel" required placeholder="مثال: 01012345678" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">مصدر العميل</label>
                  <select value={newSource} onChange={(e) => setNewSource(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                    <option value="انستقرام">انستقرام</option>
                    <option value="فيسبوك">فيسبوك</option>
                    <option value="تيك توك">تيك توك</option>
                    <option value="إحالة">إحالة / توصية</option>
                    <option value="موقع">الموقع الإلكتروني</option>
                    <option value="واتساب">واتساب</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ الزيارة</label>
                  <input type="date" required value={newVisitDate} onChange={(e) => setNewVisitDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">تاريخ الزفاف (الفرح)</label>
                <input type="date" value={newWeddingDate} onChange={(e) => setNewWeddingDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              </div>

              {/* Dress Selection */}
              {availableDresses.length > 0 &&
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600 block">الفساتين المهتمة بها (حتى 3)</label>
                  <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-100/50">
                    {availableDresses.map((dress) => {
                      const isSelected = selectedModels.includes(dress.name);
                      return (
                        <button type="button" key={dress.id} onClick={() => handleToggleModelSelection(dress.name)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-155 text-slate-600 hover:bg-slate-100'}`
                          }>
                          {dress.name}
                        </button>);

                    })}
                  </div>
                </div>
              }

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">ملاحظات</label>
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="تفضيلات العروس..."
                  className="w-full min-h-[60px] p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm">
                  حفظ ملف العروس
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Edit Bride Modal */}
      {editingBride &&
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700" dir="rtl">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">تعديل بيانات العروس</h3>
              <button onClick={() => setEditingBride(null)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditBrideSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              {/* Image Upload Option */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 block">صورة العروس (اختياري)</label>
                {imagePreviewUrl ?
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                    <img src={imagePreviewUrl} alt="Bride Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setBrideImage(null); setImagePreviewUrl(null); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-sm cursor-pointer">

                      <X size={10} />
                    </button>
                  </div> :

                  <label className="flex flex-col items-center justify-center gap-1.5 w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all">
                    <Plus size={16} className="text-indigo-500" />
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
                      }} />

                  </label>
                }
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اسم العروس</label>
                <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">رقم الهاتف</label>
                  <input type="text" required value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">المدينة</label>
                  <select value={newCity} onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                    <option value="القاهرة">القاهرة</option>
                    <option value="الجيزة">الجيزة</option>
                    <option value="الإسكندرية">الإسكندرية</option>
                    <option value="طنطا">طنطا</option>
                    <option value="المنصورة">المنصورة</option>
                    <option value="أخرى خارج القاهرة">أخرى خارج القاهرة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">مصدر العميل</label>
                  <select value={newSource} onChange={(e) => setNewSource(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                    <option value="انستقرام">انستقرام</option>
                    <option value="فيسبوك">فيسبوك</option>
                    <option value="تيك توك">تيك توك</option>
                    <option value="إحالة">إحالة / توصية</option>
                    <option value="موقع">الموقع الإلكتروني</option>
                    <option value="واتساب">واتساب</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ الزفاف (الفرح)</label>
                  <input type="date" value={newWeddingDate} onChange={(e) => setNewWeddingDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">ملاحظات</label>
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="ملاحظات..."
                  className="w-full min-h-[60px] p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm">
                  حفظ التعديلات
                </button>
                <button type="button" onClick={() => setEditingBride(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

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
            // 1. Record Pickup Payment
            if (recordPickupPayment && parseFloat(pickupPaymentAmount) > 0 && booking) {
              await apiClient.post('/revenues', {
                booking_id: booking.id,
                type: 'balance',
                amount: parseFloat(pickupPaymentAmount),
                payment_method: pickupPaymentMethod,
                payment_date: new Date().toISOString().split('T')[0],
                notes: 'دفعة استلام الفستان النهائية',
                receipt_image: pickupReceipt
              });
            }

            // 2. Record Insurance Deposit (if entered)
            if (parseFloat(pickupInsuranceAmount) > 0 && booking) {
              await apiClient.post('/revenues', {
                booking_id: booking.id,
                type: 'other',
                amount: parseFloat(pickupInsuranceAmount),
                payment_method: pickupPaymentMethod,
                payment_date: new Date().toISOString().split('T')[0],
                notes: 'تأمين الفستان المسترد',
                receipt_image: pickupReceipt
              });
            }

            // 3. Mark stage picked_up
            await apiClient.put(`/clients/${selectedBrideForPickup.id}/stage-action`, {
              action: 'mark_picked_up',
              insurance_amount: parseFloat(pickupInsuranceAmount)
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
            <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="text-sm font-extrabold text-slate-800">تسليم الفستان للعروس</h3>
                <button onClick={() => { setIsPickupModalOpen(false); setSelectedBrideForPickup(null); }} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePickupConfirm} className="flex flex-col flex-grow min-h-0 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
                  {/* Client and Dress info */}
                  <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 space-y-1">
                    <h4 className="text-xs font-black text-indigo-700">بيانات العروس والفستان</h4>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-700 mt-2">
                      <div>العروس: <span className="font-extrabold">{selectedBrideForPickup.name}</span></div>
                      <div>الهاتف: <span className="font-mono">{selectedBrideForPickup.phone}</span></div>
                      <div className="col-span-2 border-t border-slate-150 pt-2 mt-1">
                        الفستان الأساسي: <span className="font-extrabold">{dress?.name || '—'} (مقاس: {dress?.size || '—'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-black text-slate-700">ملخص الحساب المالي للفستان</h4>
                    <div className="grid grid-cols-3 gap-2 text-[9px] font-extrabold text-slate-500">
                      <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                        <div className="text-slate-400 mb-0.5">الإجمالي</div>
                        <div className="text-slate-800 font-black text-xs">{parseFloat(booking?.total_amount || 0).toLocaleString()} ج.م</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                        <div className="text-slate-400 mb-0.5">المدفوع سابقاً</div>
                        <div className="text-emerald-600 font-black text-xs">{totalPaid.toLocaleString()} ج.م</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                        <div className="text-slate-400 mb-0.5">المتبقي</div>
                        <div className="text-rose-600 font-black text-xs">{remaining.toLocaleString()} ج.م</div>
                      </div>
                    </div>

                    {/* Payment Inputs */}
                    {remaining > 0 &&
                      <div className="pt-2 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={recordPickupPayment}
                            onChange={(e) => setRecordPickupPayment(e.target.checked)}
                            className="w-3.5 h-3.5 text-indigo-650 border-slate-350 rounded-sm" />

                          <span className="text-[10px] font-bold text-slate-700">تسجيل سداد المبلغ المتبقي الآن</span>
                        </label>
                        {recordPickupPayment &&
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-extrabold text-slate-500">مبلغ السداد</label>
                              <input
                                type="number"
                                value={pickupPaymentAmount}
                                onChange={(e) => setPickupPaymentAmount(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 mt-0.5" />

                            </div>
                            <div>
                              <label className="text-[9px] font-extrabold text-slate-500">طريقة الدفع</label>
                              <select
                                value={pickupPaymentMethod}
                                onChange={(e) => setPickupPaymentMethod(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 mt-0.5">

                                <option value="cash">نقداً (Cash)</option>
                                <option value="card">فيزا / كارت (Card)</option>
                                <option value="instapay">إنستا باي (InstaPay)</option>
                              </select>
                            </div>
                          </div>
                        }
                      </div>
                    }

                    {/* Insurance Input */}
                    <div className="pt-1 border-t border-slate-150 mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-extrabold text-slate-500">مبلغ التأمين المستلم</label>
                        <input
                          type="number"
                          value={pickupInsuranceAmount}
                          onChange={(e) => setPickupInsuranceAmount(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 mt-0.5" />

                      </div>
                      <div className="flex items-end text-[8px] text-slate-400 font-bold pb-2 leading-tight">
                        * هذا المبلغ تأمين مسترد يتم إرجاعه للعميلة عند إرجاع الفستان سليم.
                      </div>
                    </div>
                    {/* Upload Receipt */}
                    <div className="pt-2 border-t border-slate-150 mt-2 space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-500 block text-right">إرفاق إيصال الدفع (اختياري)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setPickupReceipt(reader.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                          id="pickup-receipt-file-input" />

                        <label
                          htmlFor="pickup-receipt-file-input"
                          className="flex-grow px-3 py-1.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-indigo-650 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-center gap-1 transition-all">

                          <CreditCard size={12} className="inline mr-1" />
                          <span>{pickupReceipt ? 'تغيير الإيصال المرفق' : 'رفع إيصال'}</span>
                        </label>
                        {pickupReceipt &&
                          <button
                            type="button"
                            onClick={() => setPickupReceipt(null)}
                            className="p-1.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-xl hover:bg-rose-100/60 transition-all cursor-pointer text-xs">

                            <X size={12} />
                          </button>
                        }
                      </div>
                      {pickupReceipt &&
                        <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[80px] flex items-center justify-center bg-slate-50 mt-1">
                          <img src={pickupReceipt} alt="معاينة الإيصال" className="w-full h-full object-contain max-h-[75px]" />
                        </div>
                      }
                    </div>
                  </div>

                  {/* Accessories Checklist */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-700">قائمة إكسسوارات الفستان (تأكيد التسليم للعروس)</h4>
                    {accessoriesList.length > 0 ?
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {accessoriesList.map((acc, idx) => {
                          const key = `${acc.name}_${idx}`;
                          return (
                            <label key={idx} className="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-slate-100">
                              <input
                                type="checkbox"
                                checked={!!checkedAccessories[key]}
                                onChange={(e) => setCheckedAccessories({ ...checkedAccessories, [key]: e.target.checked })}
                                className="w-3.5 h-3.5 text-indigo-650 border-slate-250 rounded-sm focus:ring-indigo-500" />

                              <span className="text-[10px] font-bold text-slate-700">
                                {acc.name} <span className="text-slate-400 font-normal">({acc.dressName})</span>
                              </span>
                            </label>);

                        })}
                      </div> :

                      <div className="text-center py-4 text-slate-400 text-xs font-bold bg-slate-50 border border-slate-100 rounded-2xl">
                        لا يوجد إكسسوارات مسجلة لهذا الفستان في النظام.
                      </div>
                    }
                  </div>
                </div>

                {/* Fixed Action Buttons Footer */}
                <div className="flex items-center gap-3 p-5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                  <button type="submit" className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95">
                    تأكيد تسليم الفستان والملحقات
                  </button>
                  <button type="button" onClick={() => { setIsPickupModalOpen(false); setSelectedBrideForPickup(null); }} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>);

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
          ...(dress3?.accessories || []).map((a) => ({ name: a.name || a, dressName: dress3.name }))];


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
            await apiClient.put(`/clients/${selectedBrideForReturn.id}/stage-action`, { action: 'mark_returned' });

            setIsReturnModalOpen(false);
            setSelectedBrideForReturn(null);
            fetchBrides();
          } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء حفظ البيانات');
          }
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
            <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="text-sm font-extrabold text-slate-800">تسجيل استلام وإرجاع الفستان</h3>
                <button onClick={() => { setIsReturnModalOpen(false); setSelectedBrideForReturn(null); }} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleReturnConfirm} className="flex flex-col flex-grow min-h-0 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
                  {/* Client and Dress info */}
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 space-y-1">
                    <h4 className="text-xs font-black text-emerald-700">بيانات العروس والفستان المرتجع</h4>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-700 mt-2">
                      <div>العروس: <span className="font-extrabold">{selectedBrideForReturn.name}</span></div>
                      <div>الهاتف: <span className="font-mono">{selectedBrideForReturn.phone}</span></div>
                      <div className="col-span-2 border-t border-slate-150 pt-2 mt-1">
                        الفستان الأساسي: <span className="font-extrabold">{dress?.name || '—'} (مقاس: {dress?.size || '—'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Return Checklist */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-rose-650 flex items-center gap-1.5">
                      <span>⚠️ يرجى جرد قائمة الملحقات والتأكد من استلامها كاملة:</span>
                    </h4>
                    {accessoriesList.length > 0 ?
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {accessoriesList.map((acc, idx) => {
                          const key = `${acc.name}_${idx}`;
                          return (
                            <label key={idx} className="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-slate-100">
                              <input
                                type="checkbox"
                                checked={!!returnCheckedAccessories[key]}
                                onChange={(e) => setReturnCheckedAccessories({ ...returnCheckedAccessories, [key]: e.target.checked })}
                                className="w-3.5 h-3.5 text-indigo-650 border-slate-250 rounded-sm focus:ring-indigo-500" />

                              <span className="text-[10px] font-bold text-slate-700">
                                {acc.name} <span className="text-slate-400 font-normal">({acc.dressName})</span>
                              </span>
                            </label>);

                        })}
                      </div> :

                      <div className="text-center py-4 text-slate-400 text-xs font-bold bg-slate-50 border border-slate-100 rounded-2xl">
                        لا يوجد إكسسوارات مسجلة لهذا الفستان في النظام.
                      </div>
                    }
                  </div>

                  {/* Return Condition Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600 block">حالة الفستان والملاحظات عند الاستلام</label>
                    <textarea
                      required
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="مثال: تم الإرجاع سليم وبحالة جيدة للغسيل..."
                      className="w-full min-h-[60px] p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />

                  </div>
                </div>

                {/* Fixed Action Buttons Footer */}
                <div className="flex items-center gap-3 p-5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                  <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95">
                    تأكيد إرجاع الفستان وحفظ الملحقات
                  </button>
                  <button type="button" onClick={() => { setIsReturnModalOpen(false); setSelectedBrideForReturn(null); }} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>);

      })()}
      {/* Fitting Appointment Booking Popup Modal */}
      {showFittingModal && selectedBrideForFitting &&
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <Calendar size={14} className="text-indigo-650 animate-pulse" />
                <span>حجز موعد بروفة قياس جديدة للعروس</span>
              </h3>
              <button
                onClick={() => { setShowFittingModal(false); setSelectedBrideForFitting(null); }}
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
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right" />

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
                    const booking = selectedBrideForFitting?.bookings?.[0];
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

                <div className="grid grid-cols-2 gap-3">
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

                      <option value="cash">نقدي (Cash)</option>
                      <option value="credit_card">فيزا / كارت (Visa / Card)</option>
                      <option value="instapay">إنستاباي (InstaPay)</option>
                    </select>
                  </div>
                </div>

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
                      id="brides-fitting-receipt-file-input" />

                    <label
                      htmlFor="brides-fitting-receipt-file-input"
                      className="flex-grow px-3 py-1.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-indigo-650 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-center gap-1 transition-all">

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
                  <label className="text-[10px] font-extrabold text-slate-550 block text-right">ملاحظات إضافية</label>
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
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md text-center">

                  تأكيد وحجز موعد القياس
                </button>
                <button
                  type="button"
                  onClick={() => { setShowFittingModal(false); setSelectedBrideForFitting(null); }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">

                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Gown Booking Confirmation Modal */}
      {showBookingModal && selectedBrideForBooking &&
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <Heart size={14} className="text-rose-600 animate-pulse" />
                <span>تأكيد حجز فستان للعروس</span>
              </h3>
              <button
                onClick={() => { setShowBookingModal(false); setSelectedBrideForBooking(null); }}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">

                <X size={14} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleBookingSubmit} className="flex flex-col flex-grow min-h-0 overflow-hidden">
              <div className="p-4 space-y-3 overflow-y-auto flex-grow text-right scrollbar-thin">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">اختر الفستان المراد حجزها</label>
                  <select
                    required
                    value={bookingDressId}
                    onChange={(e) => setBookingDressId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right">

                    {dressesList.map((d) =>
                      <option key={d.id} value={d.id}>{d.name} (مقاس: {d.size || '—'} | {parseFloat(d.rental_price || 0).toLocaleString()} ج.م)</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block text-right">تاريخ الفرح / المناسبة</label>
                  <input
                    type="date"
                    required
                    value={bookingEventDate}
                    onChange={(e) => setBookingEventDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 focus:outline-none text-right" />

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
                        id="brides-booking-receipt-file-input" />

                      <label
                        htmlFor="brides-booking-receipt-file-input"
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
                  <label className="text-[10px] font-extrabold text-slate-550 block text-right">ملاحظات إضافية</label>
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
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md text-center active:scale-95">

                  تأكيد الحجز وتثبيت التاريخ
                </button>
                <button
                  type="button"
                  onClick={() => { setShowBookingModal(false); setSelectedBrideForBooking(null); }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">

                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                  <CreditCard size={18} />
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
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                    <span>الفستان: {dressName}</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                      إجمالي الإيجار: {parseFloat(booking?.total_amount || 0).toLocaleString()} ج.م
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold pt-1">
                    <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                      <div className="text-slate-400 mb-0.5">المدفوع سابقاً</div>
                      <div className="text-emerald-600 font-black text-xs">{totalPaid.toLocaleString()} ج.م</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                      <div className="text-slate-400 mb-0.5">المتبقي المطلوب</div>
                      <div className="text-rose-600 font-black text-xs">{remaining.toLocaleString()} ج.م</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handlePayRemainingSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">مبلغ السداد (ج.م)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payRemainingAmount}
                  onChange={(e) => setPayRemainingAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">طريقة الدفع</label>
                <select
                  value={payRemainingMethod}
                  onChange={(e) => setPayRemainingMethod(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Receipt File Upload */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">رفع صورة الإيصال / الفاتورة (اختياري)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPayRemainingReceipt(file);
                      setPayRemainingReceiptPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-2xl p-2 bg-slate-50"
                />
                {payRemainingReceiptPreview && (
                  <div className="relative mt-2 w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                    <img src={payRemainingReceiptPreview} alt="Receipt preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPayRemainingReceipt(null); setPayRemainingReceiptPreview(null); }}
                      className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full shadow-xs"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 block">ملاحظات إضافية (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: تم سداد باقي الفستان وحفظ الإيصال"
                  value={payRemainingNotes}
                  onChange={(e) => setPayRemainingNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPayRemaining}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-emerald-600/10 active:scale-95 text-center"
                >
                  {isSubmittingPayRemaining ? 'جاري التسجيل...' : 'تأكيد وتسجيل الدفعة بالمالية 💰'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPayRemainingModalOpen(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};