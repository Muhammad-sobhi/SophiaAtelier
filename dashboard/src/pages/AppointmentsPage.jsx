import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import {
  Search,





  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
  Plus,


  CalendarDays,
  X } from
'lucide-react';

































const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split(' ')[0].split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

const formatLocalYYYYMMDD = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const DRESS_STAGES = [
{ id: 'ready', label: 'جاهز', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
{ id: 'booked', label: 'محجوز', color: 'text-blue-600 bg-blue-50 border-blue-100' },
{ id: 'dry_clean', label: 'دراي كلين', color: 'text-purple-600 bg-purple-50 border-purple-100' }];


export default function AppointmentsPage() {
  const [searchParams] = useSearchParams();
  const highlightBookingId = searchParams ? searchParams.get('booking_id') : null;
  const [selectedAppointmentForDetail, setSelectedAppointmentForDetail] = useState(null);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('monthly');
  const [selectedDailyDay, setSelectedDailyDay] = useState('Saturday');

  const getSelectedDailyDateStr = () => {
    const dayIndex = calendarColumns.indexOf(selectedDailyDay);
    if (dayIndex === -1) return '';
    const colDate = parseLocalDate(startDateStr);
    colDate.setDate(colDate.getDate() + dayIndex);
    return formatLocalYYYYMMDD(colDate);
  };

  // Week navigation state
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, +1 = next week
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');

  // Dropdown lists
  const [clientsList, setClientsList] = useState([]);
  const [dressesList, setDressesList] = useState([]);

  // Book Appointment Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newApptType, setNewApptType] = useState('visit');
  const [newClientId, setNewClientId] = useState('');
  const [newDressId, setNewDressId] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newApptTime, setNewApptTime] = useState('01:00 م');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTotalAmount, setNewTotalAmount] = useState('3,500');
  const [newDepositAmount, setNewDepositAmount] = useState('1,000');
  const [newNotes, setNewNotes] = useState('');

  // Conflict Resolution Modal states
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictBooking, setConflictBooking] = useState(null);
  const [conflictSuggestedDate, setConflictSuggestedDate] = useState('');
  const [conflictActionType, setConflictActionType] = useState('date');
  const [conflictNewDate, setConflictNewDate] = useState('');
  const [conflictNewDressId, setConflictNewDressId] = useState('');
  const [isConflictSubmitting, setIsConflictSubmitting] = useState(false);

  // Scroll reference for weekly calendar
  const scrollRef = useRef(null);

  // Mock static days starting Saturday to Friday
  const calendarColumns = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const getWeekDates = (offset) => {
    const today = new Date();
    today.setDate(today.getDate() + offset * 7);

    const day = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysSinceSaturday = (day + 1) % 7;

    const saturday = new Date(today);
    saturday.setDate(today.getDate() - daysSinceSaturday);

    const friday = new Date(saturday);
    friday.setDate(saturday.getDate() + 6);

    return {
      start: saturday.toISOString().split('T')[0],
      end: friday.toISOString().split('T')[0]
    };
  };

  const getMonthDates = (offset) => {
    const today = new Date();
    today.setMonth(today.getMonth() + offset);
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      start: formatLocalYYYYMMDD(firstDay),
      end: formatLocalYYYYMMDD(lastDay)
    };
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { start, end } = viewMode === 'monthly' ? getMonthDates(weekOffset) : getWeekDates(weekOffset);
    setStartDateStr(start);
    setEndDateStr(end);

    try {
      const res = await apiClient.get(`/calendar/events?start_date=${start}&end_date=${end}`);
      const list = res.events || [];

      const mapped = list.map((e, idx) => {
        const dateObj = parseLocalDate(e.date);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[dateObj.getDay()];

        const dummyImages = [
        'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1549417229-aa67d3263c09?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=150&auto=format&fit=crop&q=80'];


        return {
          id: e.id,
          type: e.type,
          date: dayName,
          original_date: e.date,
          booking_date: e.booking_date,
          time_slot: e.time_slot,
          client_id: e.client_id,
          client_name: e.client_name,
          client_phone: e.client_phone,
          client_city: e.client_city,
          is_cairo: e.is_cairo,
          status: e.status,
          notes: e.notes || 'No description provided.',
          dress_name: e.dress_name,
          dress_id: e.dress_id,
          dress_2_name: e.dress_2_name,
          dress_2_id: e.dress_2_id,
          dress_3_name: e.dress_3_name,
          dress_3_id: e.dress_3_id,
          dress_1_conflict_date: e.dress_1_conflict_date,
          dress_2_conflict_date: e.dress_2_conflict_date,
          dress_3_conflict_date: e.dress_3_conflict_date,
          trying_fee: e.trying_fee || 0,
          event_date: e.event_date,
          dress_image: dummyImages[idx % dummyImages.length],
          booking_id: e.booking_id,
          total_amount: e.total_amount,
          deposit_amount: e.deposit_amount
        };
      });

      setEvents(mapped);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = () => {
    apiClient.get('/clients').then((res) => {
      setClientsList(res.data || []);
      if (res.data?.length > 0) setNewClientId(res.data[0].id.toString());
    }).catch(() => {});

    apiClient.get('/dresses?per_page=all').then((res) => {
      const data = Array.isArray(res) ? res : (res.data?.data || res.data || []);
      setDressesList(data);
      if (data.length > 0) setNewDressId(data[0].id.toString());
    }).catch(() => {});
  };

  useEffect(() => {
    fetchEvents();
  }, [weekOffset, viewMode]);

  useEffect(() => {
    loadDropdowns();
  }, []);

  // Auto-open highlighted booking request from notification URL query param
  useEffect(() => {
    if (events.length > 0 && highlightBookingId) {
      const match = events.find((e) => {
        const numericId = e.id.toString().replace('booking-', '').replace('visit-', '');
        return String(numericId) === String(highlightBookingId);
      });
      if (match) {
        setSelectedAppointmentForDetail(match);
      }
    }
  }, [events, highlightBookingId]);

  const handleBookApptSubmit = async (e) => {
    e.preventDefault();
    if (!newClientId) return;

    try {
      const finalNotes = newNotes ?
      `${newNotes}\n[وقت المقابلة: ${newApptTime}]` :
      `[وقت المقابلة: ${newApptTime}]`;

      if (newApptType === 'visit') {
        await apiClient.post('/visits', {
          client_id: parseInt(newClientId),
          visit_date: newDate,
          status: 'arrived',
          source: 'walkin',
          notes: finalNotes
        });
      } else {
        const total = parseFloat(newTotalAmount.replace(/[^\d]/g, '')) || 0;
        const deposit = parseFloat(newDepositAmount.replace(/[^\d]/g, '')) || 0;

        await apiClient.post('/bookings', {
          client_id: parseInt(newClientId),
          dress_id: parseInt(newDressId),
          booking_date: newDate,
          event_date: newEventDate,
          total_amount: total,
          deposit_amount: deposit,
          insurance_amount: 500,
          status: 'confirmed',
          notes: finalNotes
        });
      }

      fetchEvents();
      setIsModalOpen(false);
      setNewNotes('');
    } catch (err) {
      console.error('Failed to save appointment:', err);
      alert(err?.message || 'فشل حفظ الموعد. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleStageAction = async (clientId, type, action) => {
    try {
      if (type === 'visit') {
        await apiClient.put(`/clients/${clientId}/stage-action`, { action: 'schedule_fitting' });
      } else {
        await apiClient.put(`/clients/${clientId}/stage-action`, { action });
      }
      fetchEvents();

      if (action === 'mark_returned') {
        const client = events.find((e) => e.client_id === clientId);
        if (client) {
          const dressName = client.dress_name || '';
          const message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${client.client_name}* 🤍،\nنشكركِ جداً على اختياركِ لفساتين صوفيا لمشاركتكِ فرحتكِ! 🥰🌸\n\nنود تأكيد استلام فستان زفافكِ *${dressName}* بحالة سليمة وجيدة اليوم، وتم إرجاع مبلغ التأمين بالكامل. 💰✔️\n\nسعدنا جداً بخدمتكِ وكونكِ إحدى جميلات فساتين صوفيا، ويسعدنا جداً مشاركتنا صور زفافكِ الجميلة بالفستان إذا رغبتِ! 📸👰🏻‍♀️🤍\n\nنتمنى لكِ حياة زوجية سعيدة ومليئة بالحب والفرح! ✨🎀`;
          const cleanPhone = client.client_phone.replace(/[^\d]/g, '');
          const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
        }
      }
    } catch (err) {
      console.error(err);
      alert(err?.message || 'فشل تحديث حالة المرحلة.');
    }
  };

  const handleBookingStatus = async (bookingId, status) => {
    const numericId = typeof bookingId === 'string' ? bookingId.replace('booking-', '') : bookingId;
    try {
      await apiClient.put(`/bookings/${numericId}`, { status });
      fetchEvents();

      // Automatically construct and open WhatsApp message on confirmation
      const event = events.find((e) => e.id === bookingId);
      if (status === 'confirmed' && event) {
        const atelierName = "فساتين صوفيا (Sophia Dresses)";
        const visitDate = event.original_date || '';

        // Extract time from time_slot or notes
        let visitTime = event.time_slot;
        if (!visitTime) {
          const match = event.notes?.match(/(?:وقت المقابلة:?\s*)?([0-1]?\d:[0-5]\d(?:\s*(?:م|ص|AM|PM|am|pm))?)/i);
          visitTime = match ? match[1].trim() : 'غير محدد';
        }

        const tryingFeeVal = event.trying_fee && event.trying_fee > 0 ?
        `${event.trying_fee} ج.م` :
        '0.00 ج.م';

        const message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${event.client_name}* 🤍،\nيسعدنا جداً تأكيد موعدكِ معنا لتجربة فستان أحلامكِ!\n\n📅 *تفاصيل الموعد:*\n• *التاريخ:* ${visitDate}\n• *الوقت:* ${visitTime}\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n• *رسوم التجربة والقياس:* ${tryingFeeVal}\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nنحن بانتظار تشريفكِ لتنيري المكان ✨🎀`;

        const cleanPhone = event.client_phone.replace(/[^\d]/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to update booking status:', err);
      const errData = err?.data;
      if (errData && errData.available_date) {
        const event = events.find((e) => e.id === bookingId);
        setConflictBooking({
          id: numericId,
          clientName: event?.client_name || 'العميلة',
          dressName: event?.dress_name || 'الفستان',
          dressId: event?.dress_id || '',
          eventDate: event?.original_date || ''
        });
        setConflictSuggestedDate(errData.available_date);
        setConflictNewDate(errData.available_date); // Default to suggested date
        if (dressesList.length > 0) setConflictNewDressId(dressesList[0].id.toString());
        setConflictActionType('date');
        setIsConflictModalOpen(true);
      } else {
        alert(err?.message || 'فشل تحديث حالة الحجز.');
      }
    }
  };

  const handleResolveConflict = async (e) => {
    e.preventDefault();
    if (!conflictBooking) return;
    try {
      setIsConflictSubmitting(true);
      const numericId = conflictBooking.id;

      if (conflictActionType === 'date') {
        if (!conflictNewDate) return;
        await apiClient.put(`/bookings/${numericId}`, {
          event_date: conflictNewDate,
          booking_date: conflictNewDate,
          status: 'confirmed'
        });
      } else if (conflictActionType === 'dress') {
        if (!conflictNewDressId) return;
        await apiClient.put(`/bookings/${numericId}`, {
          dress_id: parseInt(conflictNewDressId),
          status: 'confirmed'
        });
      } else if (conflictActionType === 'decline') {
        await apiClient.put(`/bookings/${numericId}`, {
          status: 'cancelled'
        });
      }

      setIsConflictModalOpen(false);
      setConflictBooking(null);
      fetchEvents();
      alert('تم تحديث الحجز بنجاح.');
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      alert(err?.message || 'فشل تحديث الحجز.');
    } finally {
      setIsConflictSubmitting(false);
    }
  };

  const handleUpdateBookingDress = async (bookingId, dressField, newDressIdVal) => {
    const numericId = typeof bookingId === 'string' ? bookingId.replace('booking-', '') : bookingId;
    try {
      await apiClient.put(`/bookings/${numericId}`, {
        [dressField]: newDressIdVal ? parseInt(newDressIdVal) : null
      });
      fetchEvents();
      alert('تم تحديث الفستان بنجاح.');
    } catch (err) {
      console.error('Failed to update booking dress:', err);
      alert(err?.message || 'فشل تحديث الفستان.');
    }
  };

  const handleSendPickupReminder = async (event) => {
    const clientCity = event.client_city || 'القاهرة';
    const isCairo = clientCity.toLowerCase().includes('cairo') || clientCity.includes('القاهرة');
    const daysBefore = isCairo ? 1 : 2;

    const rawWeddingDate = event.event_date || event.wedding_date || '';
    const weddingDate = rawWeddingDate ? rawWeddingDate.split(' ')[0].split('T')[0] : 'غير محدد';
    let pickupDateStr = 'غير محدد';

    if (rawWeddingDate) {
      try {
        const evDate = parseLocalDate(rawWeddingDate);
        evDate.setDate(evDate.getDate() - daysBefore);
        pickupDateStr = evDate.toISOString().split('T')[0];
      } catch {}
    }

    const clientName = event.client_name || 'عروسنا الجميلة';
    let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${clientName}* 🤍،\nنود تذكيركِ بموعد استلام فستان زفافكِ 👗\n\n📅 *تفاصيل الاستلام:*\n• *تاريخ الزفاف:* ${weddingDate}\n• *تاريخ الاستلام المقترح:* ${pickupDateStr} (خلال أوقات العمل من ١:٠٠ م إلى ٨:٣٠ م)\n\n🌸 *شروط وقواعد فساتين صوفيا:*\n( مسموح ب دخول فردين فقط مع العروسه ladies only )\n(الدخول ب أولوية الحضور)\n\nAddress ⤵️\nالتجمع الاول الياسمين ٢ \nفيلا 161 الباب الجانبي للفيلا بيكون شمال باب الفيلا (basement) \n⬅️اليافطه السودا161\n\nLocation📍\nhttps://maps.app.goo.gl/RUyaQk3v1rZR4gVC6\n\nيسعدنا تشريفكِ لتستلمي فستان أحلامكِ ✨🎀`;

    try {
      const templates = await apiClient.get('/whatsapp-templates');
      const t = Array.isArray(templates) ? templates.find((x) => x.key === 'pickup_reminder') : null;
      if (t) {
        message = t.body.
        replace(/\{\{client_name\}\}/g, clientName).
        replace(/\{\{wedding_date\}\}/g, weddingDate).
        replace(/\{\{pickup_date\}\}/g, pickupDateStr);
      }
    } catch (err) {
      console.error('Failed to fetch whatsapp template:', err);
    }

    const cleanPhone = (event.client_phone || '').replace(/[^\d]/g, '');
    if (cleanPhone) {
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const scrollCalendar = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 flex flex-col min-h-full overflow-y-auto bg-slate-50/50 text-right font-sans text-slate-800" dir="rtl">
      
      {/* Global Control & Filter Bar */}
      <div className="bg-white border border-slate-200/80 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col xl:flex-row gap-3 sm:gap-4 items-stretch xl:items-center justify-between flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative w-full sm:w-60 flex-shrink-0">
            <input
              type="text"
              placeholder="البحث عن العرائس أو الفساتين..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 shadow-sm" />
            
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          </div>
          
          {/* Week Selector Controls */}
          <div className="flex items-center justify-between gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50 flex-shrink-0 max-w-full">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all cursor-pointer flex-shrink-0"
              title="السابق">
              
              <ChevronRight size={15} />
            </button>
            <span className="text-[10px] sm:text-xs font-black px-1.5 sm:px-2 text-slate-700 font-mono whitespace-nowrap text-center truncate">
              {startDateStr} إلى {endDateStr}
            </span>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all cursor-pointer flex-shrink-0"
              title="التالي">
              
              <ChevronLeft size={15} />
            </button>
          </div>
        </div>

        {/* View Mode & Add Appt */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border">
            <button
              onClick={() => setViewMode('monthly')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
              viewMode === 'monthly' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`
              }>
              
              <CalendarDays size={12} />
              <span>شهري</span>
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
              viewMode === 'weekly' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`
              }>
              
              <CalendarDays size={12} />
              <span>أسبوعي</span>
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
              viewMode === 'daily' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`
              }>
              
              <CalIcon size={12} />
              <span>يومي</span>
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap">
            
            <Plus size={14} />
            <span>حجز موعد</span>
          </button>
        </div>
      </div>

      {/* Weekly Grid Calendar Display */}
      {viewMode === 'weekly' ?
      <div className="relative flex-1 flex items-center w-full group overflow-hidden">
          
          {/* Scroll Right Navigation Arrow (Floats on right) */}
          <button
          onClick={() => scrollCalendar('right')}
          className="absolute right-2 z-10 w-9 h-9 rounded-full bg-white/95 border border-slate-200 shadow-md hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-all cursor-pointer opacity-80 hover:opacity-100 active:scale-90">
          
            <ChevronRight size={18} />
          </button>

          {/* Scroll Left Navigation Arrow (Floats on left) */}
          <button
          onClick={() => scrollCalendar('left')}
          className="absolute left-2 z-10 w-9 h-9 rounded-full bg-white/95 border border-slate-200 shadow-md hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-all cursor-pointer opacity-80 hover:opacity-100 active:scale-90">
          
            <ChevronLeft size={18} />
          </button>

          {/* Main Scrollable viewport */}
          <div
          ref={scrollRef}
          className="w-full h-full bg-white border border-slate-200/80 rounded-[2rem] p-5 shadow-xs overflow-x-auto scroll-smooth scrollbar-none"
          style={{ scrollbarWidth: 'none' }}>
          
            <div className="flex gap-4 h-full min-h-[580px]">
              {calendarColumns.map((day) => {
              const dayIndex = calendarColumns.indexOf(day);
              const colDate = parseLocalDate(startDateStr);
              colDate.setDate(colDate.getDate() + dayIndex);
              const colDateStr = formatLocalYYYYMMDD(colDate);

              const dayEvents = events.filter((e) => e.original_date === colDateStr && (
              e.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              e.dress_name?.toLowerCase().includes(searchQuery.toLowerCase()))
              );

              const dateLabel = colDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });

              return (
                <div key={day} className="flex-shrink-0 w-[265px] h-full bg-slate-50/45 border border-slate-150 rounded-2xl p-4 flex flex-col min-h-[460px]">
                    <span className="text-xs font-black text-slate-700 border-b border-slate-150 pb-2 mb-3.5 text-center block bg-slate-100/50 py-1.5 rounded-lg">
                      <span className="block text-[8px] font-extrabold text-[#c5a880] mb-0.5 tracking-wider">{dateLabel}</span>
                      {day === 'Saturday' ? 'السبت' :
                    day === 'Sunday' ? 'الأحد' :
                    day === 'Monday' ? 'الاثنين' :
                    day === 'Tuesday' ? 'الثلاثاء' :
                    day === 'Wednesday' ? 'الأربعاء' :
                    day === 'Thursday' ? 'الخميس' : 'الجمعة'}
                    </span>

                    <div className="flex-1 space-y-4.5 overflow-y-auto pr-1">
                      {dayEvents.map((event) =>
                    <div
                      key={event.id}
                      onClick={() => setSelectedAppointmentForDetail(event)}
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition-all bg-white hover:shadow-md cursor-pointer hover:border-indigo-400 select-none ${
                      event.type === 'visit' ?
                      'border-rose-100/80 text-rose-900 shadow-rose-600/5 hover:border-rose-350 bg-rose-50/5' :
                      event.type === 'fitting' ?
                      'border-purple-100/80 text-purple-900 shadow-purple-600/5 hover:border-purple-350 bg-purple-50/5' :
                      event.type === 'pickup' ?
                      'border-amber-100/80 text-amber-900 shadow-amber-600/5 hover:border-amber-350 bg-amber-50/10' :
                      event.status === 'pending' ?
                      'border-orange-200/80 text-orange-950 shadow-orange-600/5 hover:border-orange-350 bg-orange-50/5' :
                      'border-blue-100/80 text-blue-900 shadow-blue-600/5 hover:border-blue-350 bg-blue-50/5'}`
                      }>
                      
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 bg-slate-100 flex-shrink-0 shadow-xs">
                            <img src={event.dress_image} alt="dress" className="w-full h-full object-cover" />
                          </div>
                          <div className="text-right flex-grow min-w-0">
                            <h4 className="text-[11px] font-black text-slate-800 leading-tight truncate">{event.client_name}</h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                          event.type === 'visit' ?
                          'bg-rose-50 text-rose-600 border border-rose-100' :
                          event.type === 'fitting' ?
                          'bg-purple-50 text-purple-600 border border-purple-100' :
                          event.type === 'pickup' ?
                          'bg-amber-50 text-amber-600 border border-amber-150' :
                          event.status === 'pending' ?
                          'bg-orange-100 text-orange-700 border border-orange-200' :
                          'bg-blue-50 text-blue-600 border border-blue-100'}`
                          }>
                                {event.type === 'visit' ?
                            'زيارة' :
                            event.type === 'fitting' ?
                            'بروفة' :
                            event.type === 'pickup' ?
                            'استلام' :
                            event.status === 'pending' ?
                            'طلب معلق' :
                            'حجز مؤكد'}
                              </span>
                              <span className="text-[8px] text-slate-500 truncate block max-w-[120px] font-semibold">
                                {event.type === 'visit' ?
                            '3 فساتين مطلوبة' :
                            event.dress_name || 'غير محدد'}
                              </span>
                            </div>
                          </div>
                        </div>
                    )}
                      {dayEvents.length === 0 &&
                    <div className="h-full flex items-center justify-center text-[10px] text-slate-300 font-bold py-10">
                          لا يوجد مواعيد
                        </div>
                    }
                    </div>
                  </div>);

            })}
            </div>
          </div>
        </div> : viewMode === 'monthly' ? (
      /* Monthly Grid Calendar View */
      <div className="flex-1 bg-white border border-slate-200/80 rounded-[2rem] p-4 md:p-5 shadow-xs overflow-y-auto flex flex-col">
        <div className="overflow-x-auto w-full flex-1 flex flex-col pb-2 scrollbar-thin">
          <div className="min-w-[700px] flex-1 flex flex-col">
            {/* Month Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-black text-slate-700 bg-slate-50/80 py-2.5 rounded-xl border border-slate-100">
              <div>السبت</div>
              <div>الأحد</div>
              <div>الاثنين</div>
              <div>الثلاثاء</div>
              <div>الأربعاء</div>
              <div>الخميس</div>
              <div>الجمعة</div>
            </div>

            {/* Month Grid Cells */}
            <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
              {(() => {
                if (!startDateStr) return null;
                const monthStart = parseLocalDate(startDateStr);
                const startDayIdx = (monthStart.getDay() + 1) % 7; // Saturday = 0
                const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

                const cells = [];
                // Padding cells before first day of month
                for (let i = 0; i < startDayIdx; i++) {
                  cells.push(<div key={`pad-${i}`} className="bg-slate-50/30 border border-slate-100/50 rounded-2xl min-h-[110px]" />);
                }

                // Month days
                for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
                  const currentCellDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), dayNum);
                  const dateStr = formatLocalYYYYMMDD(currentCellDate);

                  const dayEvents = events.filter((e) => e.original_date === dateStr && (
                    e.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.dress_name?.toLowerCase().includes(searchQuery.toLowerCase())
                  ));

                  const isToday = dateStr === formatLocalYYYYMMDD(new Date());

                  cells.push(
                    <div
                      key={`day-${dayNum}`}
                      className={`border rounded-2xl p-2 flex flex-col min-h-[115px] transition-all bg-white hover:border-indigo-300 ${
                        isToday ? 'border-indigo-400 bg-indigo-50/10' : 'border-slate-150'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1.5 gap-1">
                        <span className={`text-[11px] font-black rounded-md px-1.5 py-0.5 flex-shrink-0 ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>
                          {dayNum}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap flex-shrink-0">
                            {dayEvents.length} {dayEvents.length === 1 ? 'موعد' : 'مواعيد'}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[130px] pr-0.5 scrollbar-none">
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            onClick={() => setSelectedAppointmentForDetail(event)}
                            className={`p-1.5 rounded-xl border flex items-center gap-1.5 transition-all bg-white hover:shadow-sm cursor-pointer select-none ${
                              event.type === 'visit'
                                ? 'border-rose-100 text-rose-900 bg-rose-50/20'
                                : event.type === 'fitting'
                                ? 'border-purple-100 text-purple-900 bg-purple-50/20'
                                : event.type === 'pickup'
                                ? 'border-amber-100 text-amber-900 bg-amber-50/20'
                                : event.status === 'pending'
                                ? 'border-orange-200 text-orange-950 bg-orange-50/20'
                                : 'border-blue-100 text-blue-900 bg-blue-50/20'
                            }`}
                          >
                            <img
                              src={event.dress_image}
                              alt="dress"
                              className="w-6 h-6 rounded-lg object-cover flex-shrink-0 border border-slate-100"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] font-black truncate block text-slate-800">
                                  {event.client_name}
                                </span>
                                <span className={`text-[7px] font-bold px-1 rounded ${
                                  event.type === 'visit' ? 'bg-rose-100 text-rose-700' :
                                  event.type === 'fitting' ? 'bg-purple-100 text-purple-700' :
                                  event.type === 'pickup' ? 'bg-amber-100 text-amber-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {event.type === 'visit' ? 'زيارة' : event.type === 'fitting' ? 'بروفة' : event.type === 'pickup' ? 'استلام' : 'حجز'}
                                </span>
                              </div>
                              <span className="text-[7.5px] text-slate-400 font-semibold block truncate">
                                {event.time_slot || event.dress_name || 'موعد'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return cells;
              })()}
            </div>
          </div>
        </div>
      </div>
    ) : (

      /* Daily View List */
      <div className="flex-1 bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-xs overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
            <span className="text-xs font-black text-slate-800 whitespace-nowrap flex-shrink-0">
              اختر يوم العرض:
            </span>
            <div className="flex flex-wrap gap-1.5 min-w-0">
              {calendarColumns.map((day) => {
              const dayIndex = calendarColumns.indexOf(day);
              const colDate = parseLocalDate(startDateStr);
              colDate.setDate(colDate.getDate() + dayIndex);
              const dateLabel = `${colDate.getDate()}/${colDate.getMonth() + 1}`;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDailyDay(day)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer border transition-all ${
                  selectedDailyDay === day ?
                  'bg-indigo-600 border-indigo-600 text-white shadow-xs' :
                  'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`
                  }>
                  
                    {day === 'Saturday' ? 'السبت' :
                  day === 'Sunday' ? 'الأحد' :
                  day === 'Monday' ? 'الاثنين' :
                  day === 'Tuesday' ? 'الثلاثاء' :
                  day === 'Wednesday' ? 'الأربعاء' :
                  day === 'Thursday' ? 'الخميس' : 'الجمعة'} ({dateLabel})
                  </button>);

            })}
            </div>
          </div>

          <div className="space-y-3">
            {events.filter((e) => e.original_date === getSelectedDailyDateStr()).map((event) =>
          <div
            key={event.id}
            onClick={() => setSelectedAppointmentForDetail(event)}
            className="p-3 bg-white rounded-2xl border border-slate-150 flex items-center justify-between gap-4 cursor-pointer hover:border-indigo-300 transition-all hover:bg-slate-50 select-none">
            
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 bg-white">
                    <img src={event.dress_image} alt="dress" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-0.5 text-right">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-slate-800">{event.client_name}</h4>
                      <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border ${
                  event.type === 'visit' ?
                  'text-rose-600 bg-rose-50 border-rose-100' :
                  event.type === 'fitting' ?
                  'text-purple-600 bg-purple-50 border-purple-100' :
                  event.type === 'pickup' ?
                  'text-amber-600 bg-amber-50 border-amber-100' :
                  event.status === 'pending' ?
                  'text-orange-600 bg-orange-50 border-orange-100' :
                  'text-blue-600 bg-blue-50 border-blue-100'}`
                  }>
                        {event.type === 'visit' ? 'زيارة' : event.type === 'fitting' ? 'بروفة' : event.type === 'pickup' ? 'استلام' : event.status === 'pending' ? 'طلب معلق' : 'حجز مؤكد'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-555 font-bold">
                      <span>{event.client_phone}</span>
                      <span>•</span>
                      <span>{event.client_city}</span>
                      <span>•</span>
                      <span className="text-slate-500 font-extrabold">
                        {event.type === 'visit' ? '3 فساتين مطلوبة' : event.dress_name || 'غير محدد'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
          )}
            {events.filter((e) => e.original_date === getSelectedDailyDateStr()).length === 0 &&
          <div className="py-10 text-center text-slate-350 font-bold text-xs">
                لا يوجد مواعيد مجدولة لهذا اليوم
              </div>
          }
          </div>
        </div>)
      }

      {/* Add Appointment Modal */}
      {isModalOpen &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">حجز موعد أو زيارة جديدة</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBookApptSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">نوع الموعد</label>
                <div className="flex bg-slate-100 rounded-xl p-1">
                  <button
                  type="button"
                  onClick={() => setNewApptType('visit')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  newApptType === 'visit' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`
                  }>
                  
                    زيارة وتجربة فستان
                  </button>
                  <button
                  type="button"
                  onClick={() => setNewApptType('booking')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  newApptType === 'booking' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`
                  }>
                  
                    حجز وتأجير فستان
                  </button>
                </div>
              </div>

              {/* Bride Selection */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اختر العروس</label>
                <select
                value={newClientId}
                onChange={(e) => setNewClientId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                
                  {clientsList.map((c) =>
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                )}
                </select>
              </div>

              {/* Gown Selection (Only for Booking) */}
              {newApptType === 'booking' &&
            <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">اختر فستان الزفاف</label>
                  <select
                value={newDressId}
                onChange={(e) => setNewDressId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                
                    {dressesList.map((d) =>
                <option key={d.id} value={d.id}>{d.name} - {d.designer?.name || d.designer}</option>
                )}
                  </select>
                </div>
            }

              {/* Dates & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ الموعد</label>
                  <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">الوقت المفضل (30 دقيقة)</label>
                  <select
                  value={newApptTime}
                  onChange={(e) => setNewApptTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 animate-fade-in">
                  
                    {['01:00 م', '01:30 م', '02:00 م', '02:30 م', '03:00 م', '03:30 م', '04:00 م', '04:30 م', '05:00 م', '05:30 م', '06:00 م', '06:30 م', '07:00 م', '07:30 م', '08:00 م', '08:30 م'].map((t) =>
                  <option key={t} value={t}>{t}</option>
                  )}
                  </select>
                </div>
              </div>

              {newApptType === 'booking' &&
            <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ الفرح / المناسبة</label>
                  <input
                type="date"
                required
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              
                </div>
            }

              {/* Financials (Only for Booking) */}
              {newApptType === 'booking' &&
            <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">مبلغ الإيجار الإجمالي</label>
                    <input
                  type="text"
                  required
                  value={newTotalAmount}
                  onChange={(e) => setNewTotalAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">العربون المدفوع</label>
                    <input
                  type="text"
                  required
                  value={newDepositAmount}
                  onChange={(e) => setNewDepositAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                  </div>
                </div>
            }

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">ملاحظات إضافية</label>
                <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="ملاحظات الموعد وتفضيلات القياس..."
                className="w-full min-h-[60px] p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm">
                  تسجيل وحجز الموعد
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {isConflictModalOpen && conflictBooking &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700" dir="rtl">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <span className="text-rose-505 font-bold">⚠️</span>
                <span>تنبيه: تعارض في حجز الفستان</span>
              </h3>
              <button onClick={() => setIsConflictModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleResolveConflict} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl space-y-1.5 text-xs text-rose-800 font-medium">
                <p>الفستان <strong>({conflictBooking.dressName})</strong> غير متاح في تاريخ المناسبة المختار للعميلة <strong>({conflictBooking.clientName})</strong>.</p>
                <p className="font-bold">سيكون متاحاً مجدداً ابتداءً من تاريخ: {conflictSuggestedDate}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-600 block">يرجى اختيار إجراء للتعامل مع التعارض:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                  type="button"
                  onClick={() => setConflictActionType('date')}
                  className={`py-2 px-3 rounded-xl border text-[10px] font-bold transition-all cursor-pointer text-center ${
                  conflictActionType === 'date' ?
                  'bg-indigo-50 border-indigo-200 text-indigo-750' :
                  'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`
                  }>
                  
                    تغيير التاريخ
                  </button>
                  <button
                  type="button"
                  onClick={() => setConflictActionType('dress')}
                  className={`py-2 px-3 rounded-xl border text-[10px] font-bold transition-all cursor-pointer text-center ${
                  conflictActionType === 'dress' ?
                  'bg-indigo-50 border-indigo-200 text-indigo-750' :
                  'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`
                  }>
                  
                    تغيير الفستان
                  </button>
                  <button
                  type="button"
                  onClick={() => setConflictActionType('decline')}
                  className={`py-2 px-3 rounded-xl border text-[10px] font-bold transition-all cursor-pointer text-center ${
                  conflictActionType === 'decline' ?
                  'bg-rose-50 border-rose-200 text-rose-750' :
                  'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`
                  }>
                  
                    رفض وإلغاء الحجز
                  </button>
                </div>
              </div>

              {/* Action content based on choice */}
              {conflictActionType === 'date' &&
            <div className="space-y-1 animate-fade-in">
                  <label className="text-xs font-extrabold text-slate-600">التاريخ الجديد المقترح</label>
                  <input
                type="date"
                required
                value={conflictNewDate}
                onChange={(e) => setConflictNewDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              
                  <p className="text-[10px] text-slate-400 font-bold mt-1">تاريخ التوفر المقترح تلقائياً: {conflictSuggestedDate}</p>
                </div>
            }

              {conflictActionType === 'dress' &&
            <div className="space-y-1 animate-fade-in">
                  <label className="text-xs font-extrabold text-slate-600">اختر الفستان الجديد البديل</label>
                  <select
                required
                value={conflictNewDressId}
                onChange={(e) => setConflictNewDressId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                
                    {dressesList.map((d) =>
                <option key={d.id} value={d.id}>{d.name} - {d.designer?.name || d.designer}</option>
                )}
                  </select>
                </div>
            }

              {conflictActionType === 'decline' &&
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] text-slate-505 font-bold leading-relaxed animate-fade-in">
                  سيتم تغيير حالة هذا الحجز إلى <strong>ملغى (Cancelled)</strong> وسيتم إخلاء تاريخ الفستان للاستخدامات الأخرى.
                </div>
            }

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                disabled={isConflictSubmitting}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50">
                
                  {isConflictSubmitting ? 'جاري التنفيذ...' : 'تأكيد وحفظ الإجراء'}
                </button>
                <button
                type="button"
                onClick={() => setIsConflictModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                
                  تراجع
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Appointment Detail Popup Modal */}
      {selectedAppointmentForDetail &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700 font-sans text-right" dir="rtl">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              selectedAppointmentForDetail.type === 'visit' ?
              'bg-rose-50 text-rose-600' :
              selectedAppointmentForDetail.type === 'fitting' ?
              'bg-purple-55 text-purple-650' :
              'bg-blue-50 text-blue-600'}`
              }>
                  {selectedAppointmentForDetail.type === 'visit' ? '🌸' : selectedAppointmentForDetail.type === 'fitting' ? '✂️' : '👗'}
                </div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  {selectedAppointmentForDetail.type === 'visit' ?
                'تفاصيل زيارة وتجربة الفساتين' :
                selectedAppointmentForDetail.type === 'fitting' ?
                'تفاصيل بروفة قياس العروس' :
                selectedAppointmentForDetail.type === 'pickup' ?
                'تفاصيل موعد استلام الفستان' :
                'تفاصيل حجز الفستان للعروس'}
                </h3>
              </div>
              <button
              onClick={() => setSelectedAppointmentForDetail(null)}
              className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-grow scrollbar-thin text-right">
              {/* Premium Progress Bar */}
              <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-450 font-black block mb-3">مرحلة العروس الحالية:</span>
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
                  {['visit', 'booking', 'fitting', 'pickup'].map((stage, i) => {
                  const stageLabels = {
                    visit: 'الزيارة والتجربة',
                    booking: 'حجز الفستان',
                    fitting: 'بروفة القياس',
                    pickup: 'الاستلام والارتجاع'
                  };
                  const stageIcons = {
                    visit: '🌸',
                    booking: '👗',
                    fitting: '✂️',
                    pickup: '✨'
                  };
                  const stagesOrder = ['visit', 'booking', 'fitting', 'pickup'];
                  const currentIdx = stagesOrder.indexOf(selectedAppointmentForDetail.type);
                  const activeIdx = stagesOrder.indexOf(stage);
                  const isCompleted = activeIdx < currentIdx;
                  const isActive = activeIdx === currentIdx;

                  return (
                    <div key={stage} className="flex flex-col items-center z-10">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                      isActive ?
                      'bg-indigo-650 border-indigo-650 text-white ring-4 ring-indigo-500/20' :
                      isCompleted ?
                      'bg-emerald-555 border-emerald-555 text-white' :
                      'bg-white border-slate-200 text-slate-400'}`
                      }>
                          {isCompleted ? '✓' : stageIcons[stage]}
                        </div>
                        <span className={`text-[8px] font-black mt-1.5 ${
                      isActive ? 'text-indigo-650 font-black' : isCompleted ? 'text-emerald-600 font-bold' : 'text-slate-400'}`
                      }>
                          {stageLabels[stage]}
                        </span>
                      </div>);

                })}
                </div>
              </div>

              {/* Bride Info Section */}
              <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-black text-slate-550 border-b pb-2 mb-2">بيانات العروس العامة</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">الاسم</span>
                    <span className="text-xs font-black text-slate-800">{selectedAppointmentForDetail.client_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">الهاتف</span>
                    <span className="text-xs font-black text-slate-800 leading-tight">{selectedAppointmentForDetail.client_phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">المدينة / العنوان</span>
                    <span className="text-xs font-black text-slate-800">{selectedAppointmentForDetail.client_city || 'غير محدد'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">التوقيت المفضل</span>
                    <span className="text-xs font-black text-slate-800">{selectedAppointmentForDetail.time_slot || 'غير محدد'}</span>
                  </div>
                </div>
              </div>

              {/* Visit Stage Specific: Choose 3 Dresses and edit them directly */}
              {selectedAppointmentForDetail.type === 'visit' &&
            <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-3">
                  <h4 className="text-xs font-black text-slate-550 border-b pb-2 mb-2">الفساتين الـ 3 المحددة للاستشارة والقياس (تعديل مباشر)</h4>
                  <div className="space-y-3">
                    {/* Dress 1 */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 text-right">
                        <span className="text-xs font-bold text-slate-700">1. {selectedAppointmentForDetail.dress_name || 'غير محدد'}</span>
                        <select
                      value={selectedAppointmentForDetail.dress_id || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        handleUpdateBookingDress(selectedAppointmentForDetail.id, 'dress_id', e.target.value);
                        const val = e.target.value;
                        setSelectedAppointmentForDetail((prev) => prev ? { ...prev, dress_id: parseInt(val), dress_name: dressesList.find((d) => d.id === parseInt(val))?.name || prev.dress_name } : null);
                      }}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 max-w-[150px] font-semibold text-slate-700 focus:outline-none">
                      
                          {dressesList.map((d) =>
                      <option key={d.id} value={d.id}>{d.name}</option>
                      )}
                        </select>
                      </div>
                      {selectedAppointmentForDetail.dress_1_conflict_date ?
                  <div className="text-[10px] font-bold text-rose-600 bg-rose-50/80 p-2 rounded-lg border border-rose-100 leading-tight">
                          ⚠️ غير متوفر في هذا التاريخ. سيكون متوفراً مجدداً بتاريخ: {selectedAppointmentForDetail.dress_1_conflict_date}
                        </div> :

                  <div className="text-[9px] font-bold text-emerald-600">✔️ متوفر ومتاح للتأكيد</div>
                  }
                    </div>

                    {/* Dress 2 */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 text-right">
                        <span className="text-xs font-bold text-slate-700">2. {selectedAppointmentForDetail.dress_2_name || 'لا يوجد فستان ثانٍ'}</span>
                        <select
                      value={selectedAppointmentForDetail.dress_2_id || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        handleUpdateBookingDress(selectedAppointmentForDetail.id, 'dress_2_id', e.target.value);
                        const val = e.target.value;
                        setSelectedAppointmentForDetail((prev) => prev ? { ...prev, dress_2_id: val ? parseInt(val) : null, dress_2_name: val ? dressesList.find((d) => d.id === parseInt(val))?.name : null } : null);
                      }}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 max-w-[150px] font-semibold text-slate-700 focus:outline-none">
                      
                          <option value="">-- اختر فستاناً آخر --</option>
                          {dressesList.map((d) =>
                      <option key={d.id} value={d.id}>{d.name}</option>
                      )}
                        </select>
                      </div>
                      {selectedAppointmentForDetail.dress_2_id && (
                  selectedAppointmentForDetail.dress_2_conflict_date ?
                  <div className="text-[10px] font-bold text-rose-600 bg-rose-50/80 p-2 rounded-lg border border-rose-100 leading-tight">
                            ⚠️ غير متوفر في هذا التاريخ. سيكون متوفراً مجدداً بتاريخ: {selectedAppointmentForDetail.dress_2_conflict_date}
                          </div> :

                  <div className="text-[9px] font-bold text-emerald-600">✔️ متوفر ومتاح للتأكيد</div>)

                  }
                    </div>

                    {/* Dress 3 */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 text-right">
                        <span className="text-xs font-bold text-slate-700">3. {selectedAppointmentForDetail.dress_3_name || 'لا يوجد فستان ثالث'}</span>
                        <select
                      value={selectedAppointmentForDetail.dress_3_id || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        handleUpdateBookingDress(selectedAppointmentForDetail.id, 'dress_3_id', e.target.value);
                        const val = e.target.value;
                        setSelectedAppointmentForDetail((prev) => prev ? { ...prev, dress_3_id: val ? parseInt(val) : null, dress_3_name: val ? dressesList.find((d) => d.id === parseInt(val))?.name : null } : null);
                      }}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 max-w-[150px] font-semibold text-slate-700 focus:outline-none">
                      
                          <option value="">-- اختر فستاناً آخر --</option>
                          {dressesList.map((d) =>
                      <option key={d.id} value={d.id}>{d.name}</option>
                      )}
                        </select>
                      </div>
                      {selectedAppointmentForDetail.dress_3_id && (
                  selectedAppointmentForDetail.dress_3_conflict_date ?
                  <div className="text-[10px] font-bold text-rose-600 bg-rose-50/80 p-2 rounded-lg border border-rose-100 leading-tight">
                            ⚠️ غير متوفر في هذا التاريخ. سيكون متوفراً مجدداً بتاريخ: {selectedAppointmentForDetail.dress_3_conflict_date}
                          </div> :

                  <div className="text-[9px] font-bold text-emerald-600">✔️ متوفر ومتاح للتأكيد</div>)

                  }
                    </div>
                  </div>
                </div>
            }

              {/* Booking/Fitting/Pickup Stages Specific details (Wedding date, Financials, Chosen Gown) */}
              {selectedAppointmentForDetail.type !== 'visit' &&
            <>
                  {/* Selected Reserved Dress Card */}
                  <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-3">
                    <h4 className="text-xs font-black text-slate-550 border-b pb-2 mb-2">الفستان المحجوز المعتمد</h4>
                    <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-150">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                        <img src={selectedAppointmentForDetail.dress_image} alt="dress" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-right flex-grow min-w-0">
                        <h4 className="text-xs font-black text-slate-800">{selectedAppointmentForDetail.dress_name}</h4>
                        <span className="text-[10px] font-semibold text-slate-500 block mt-1">تاريخ الحجز المعتمد: {selectedAppointmentForDetail.booking_date || selectedAppointmentForDetail.original_date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financials details */}
                  <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-3">
                    <h4 className="text-xs font-black text-slate-550 border-b pb-2 mb-2">البيانات المالية للحجز</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-[9px] text-slate-400 font-bold block mb-0.5">مبلغ الإيجار الإجمالي</span>
                        <span className="text-xs font-black text-slate-800">{selectedAppointmentForDetail.total_amount?.toLocaleString() || 0} ج.م</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-[9px] text-slate-400 font-bold block mb-0.5">العربون المدفوع</span>
                        <span className="text-xs font-black text-emerald-600">{selectedAppointmentForDetail.deposit_amount?.toLocaleString() || 0} ج.م</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-[9px] text-slate-400 font-bold block mb-0.5">المبلغ المتبقي</span>
                        <span className="text-xs font-black text-rose-650">
                          {((selectedAppointmentForDetail.total_amount || 0) - (selectedAppointmentForDetail.deposit_amount || 0)).toLocaleString()} ج.م
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Event/Fitting Dates */}
                  <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-3">
                    <h4 className="text-xs font-black text-slate-550 border-b pb-2 mb-2">التواريخ والمواعيد المهمة</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">تاريخ الفرح / المناسبة</span>
                        <span className="text-xs font-black text-indigo-700 font-mono">{selectedAppointmentForDetail.event_date || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">حالة بروفة القياس والتعديل</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md mt-1 inline-block uppercase ${
                    selectedAppointmentForDetail.type === 'fitting' ?
                    'bg-purple-50 text-purple-600' :
                    'bg-slate-100 text-slate-500'}`
                    }>
                          {selectedAppointmentForDetail.type === 'fitting' ? 'تحت البروفة والتعديل حالياً' : 'مجدولة أو منتهية'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
            }

              {/* Notes */}
              <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-1.5 text-right">
                <span className="text-[10px] text-slate-455 font-bold block">ملاحظات وطلبات خاصة للعميلة</span>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line">{selectedAppointmentForDetail.notes || 'لا يوجد ملاحظات.'}</p>
              </div>

              {/* Action Buttons specific to active stage */}
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">إجراءات الموعد الحالي:</span>
                <div className="flex flex-wrap gap-2 justify-end">
                  {selectedAppointmentForDetail.type === 'visit' ?
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStageAction(selectedAppointmentForDetail.client_id, 'visit', 'schedule_fitting');
                    setSelectedAppointmentForDetail(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer">
                  
                      تأكيد الزيارة وجدولة قياس
                    </button> :

                <>
                      {selectedAppointmentForDetail.status === 'pending' &&
                  <div className="flex gap-2">
                          <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookingStatus(selectedAppointmentForDetail.id, 'confirmed');
                        setSelectedAppointmentForDetail(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer">
                      
                            تأكيد وقبول الحجز
                          </button>
                          <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookingStatus(selectedAppointmentForDetail.id, 'cancelled');
                        setSelectedAppointmentForDetail(null);
                      }}
                      className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      
                            رفض وإلغاء الحجز
                          </button>
                        </div>
                  }
                      {selectedAppointmentForDetail.status === 'confirmed' &&
                  <div className="flex gap-2">
                          {selectedAppointmentForDetail.type === 'booking' && !selectedAppointmentForDetail.fittings_completed ?
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStageAction(selectedAppointmentForDetail.client_id, 'booking', 'schedule_fitting');
                        setSelectedAppointmentForDetail(null);
                      }}
                      className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer">
                      
                              جدولة بروفة قياس
                            </button> :
                    selectedAppointmentForDetail.type === 'fitting' ?
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await apiClient.put(`/clients/${selectedAppointmentForDetail.client_id}/stage-action`, { action: 'end_fitting' });
                          fetchEvents();
                          setSelectedAppointmentForDetail(null);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer">
                      
                              إنهاء البروفة والتجهيز للاستلام
                            </button> :

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStageAction(selectedAppointmentForDetail.client_id, 'booking', 'mark_picked_up');
                        setSelectedAppointmentForDetail(null);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer">
                      
                              تسليم الفستان للعميلة
                            </button>
                    }
                          <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendPickupReminder(selectedAppointmentForDetail);
                      }}
                      className="px-4 py-2 border border-amber-200 hover:bg-amber-50 text-amber-700 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      
                            إرسال تذكير بالاستلام
                          </button>
                        </div>
                  }
                      {selectedAppointmentForDetail.status === 'picked_up' &&
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStageAction(selectedAppointmentForDetail.client_id, 'booking', 'mark_returned');
                      setSelectedAppointmentForDetail(null);
                    }}
                    className="px-4 py-2 bg-purple-650 hover:bg-purple-50 text-white hover:text-purple-750 border border-purple-600 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer">
                    
                          تسجيل إرجاع ودراي كلين
                        </button>
                  }
                    </>
                }
                  <a
                  href={`https://wa.me/${selectedAppointmentForDetail.client_phone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 cursor-pointer">
                  
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-4 h-4 ml-1" />
                    <span>تواصل واتساب</span>
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      }

    </div>);

}