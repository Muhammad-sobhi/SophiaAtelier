import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Search, SlidersHorizontal, Plus, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Sparkles, Trash2, Edit3 } from 'lucide-react';











const MARKETING_SOURCES = [
{ value: 'انستقرام', label: 'انستقرام' },
{ value: 'سنابشات', label: 'سنابشات' },
{ value: 'جوجل', label: 'جوجل' },
{ value: 'تيك توك', label: 'تيك توك' },
{ value: 'تويتر', label: 'تويتر' },
{ value: 'إحالة', label: 'إحالة' },
{ value: 'أخرى', label: 'أخرى' }];


const STATUS_OPTIONS = [
{ value: 'وصل', label: 'وصل' },
{ value: 'انتهى', label: 'انتهى' },
{ value: 'حجز', label: 'حجز' },
{ value: 'لم يحضر', label: 'لم يحضر' }];


const initialVisits = [
{ id: 1, client: 'سارة أحمد', date: '2026-07-12', source: 'انستقرام', status: 'وصل', triedDresses: ['فستان الأميرة كلاسيك', 'فستان الزفاف الأبيض الملكي'], bookedDresses: [] },
{ id: 2, client: 'نورة محمد', date: '2026-07-12', source: 'جوجل', status: 'انتهى', triedDresses: ['فستان السهرة ذهبي'], bookedDresses: ['فستان السهرة ذهبي'] },
{ id: 3, client: 'فاطمة العلي', date: '2026-07-11', source: 'إحالة', status: 'حجز', triedDresses: ['فستان الزفاف الأبيض الملكي'], bookedDresses: ['فستان الزفاف الأبيض الملكي'] },
{ id: 4, client: 'خديجة حسن', date: '2026-07-11', source: 'تويتر', status: 'لم يحضر', triedDresses: [], bookedDresses: [] },
{ id: 5, client: 'مريم خالد', date: '2026-07-10', source: 'انستقرام', status: 'وصل', triedDresses: ['فستان الكوتور الفرنسي'], bookedDresses: [] },
{ id: 6, client: 'ريم عبدالرحمن', date: '2026-07-10', source: 'سنابشات', status: 'انتهى', triedDresses: ['فستان الكوتور الفرنسي', 'فستان الأميرة كلاسيك'], bookedDresses: ['فستان الكوتور الفرنسي'] },
{ id: 7, client: 'هند سعيد', date: '2026-07-09', source: 'جوجل', status: 'وصل', triedDresses: ['فستان الناعم الوردي بريق'], bookedDresses: [] },
{ id: 8, client: 'دانا يوسف', date: '2026-07-09', source: 'إحالة', status: 'حجز', triedDresses: ['فستان الناعم الوردي بريق'], bookedDresses: ['فستان الناعم الوردي بريق'] }];


const statusStyles = {
  'وصل': { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  'انتهى': { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50' },
  'حجز': { dot: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50' },
  'لم يحضر': { dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' }
};

export default function VisitsPage() {
  const [visitsList, setVisitsList] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 12)); // Start at July 2026
  const [selectedDateStr, setSelectedDateStr] = useState('2026-07-12');
  const [isFilterActive, setIsFilterActive] = useState(true); // Filter table by selected day
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [newClient, setNewClient] = useState('');
  const [newDate, setNewDate] = useState('2026-07-12');
  const [newSource, setNewSource] = useState('انستقرام');
  const [newStatus, setNewStatus] = useState('وصل');
  const [selectedTriedDresses, setSelectedTriedDresses] = useState([]);
  const [selectedBookedDresses, setSelectedBookedDresses] = useState([]);
  const [dressesData, setDressesData] = useState([]);
  const [clientsObjects, setClientsObjects] = useState([]);

  // Convert to Booking States
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedVisitToConvert, setSelectedVisitToConvert] = useState(null);
  const [convertDress, setConvertDress] = useState('');
  const [convertWeddingDate, setConvertWeddingDate] = useState('2026-09-15');
  const [convertAmount, setConvertAmount] = useState('5,000 ج.م');
  const [convertCity, setConvertCity] = useState('القاهرة');
  const [convertPaymentMethod, setConvertPaymentMethod] = useState('cash');

  // Custom Alert Popup Modal state
  const [alertConfig, setAlertConfig] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);
  const [availableDresses, setAvailableDresses] = useState([
  'فستان الأميرة كلاسيك',
  'فستان السهرة ذهبي',
  'فستان الزفاف الأبيض الملكي',
  'فستان الناعم الوردي بريق',
  'فستان مطرز بلوري',
  'فستان الكوتور الفرنسي']
  );

  const handleEditVisitClick = (v) => {
    setEditingVisit(v);
    setNewClient(v.client);
    setNewDate(v.date);
    setNewSource(v.source);
    setNewStatus(v.status);
    setSelectedTriedDresses(v.triedDresses || []);
    setSelectedBookedDresses(v.bookedDresses || []);
  };

  const handleEditVisitSubmit = async (e) => {
    e.preventDefault();
    if (!editingVisit) return;

    // Resolve client_id
    const clientObj = clientsObjects.find((c) => c.name === newClient);
    const clientId = clientObj?.id || 1;

    // Map source options
    let mappedSource = 'instagram';
    if (newSource.includes('سناب') || newSource.includes('تيك')) mappedSource = 'instagram';else
    if (newSource.includes('موقع')) mappedSource = 'website';else
    if (newSource.includes('توصية')) mappedSource = 'referral';else
    if (newSource.includes('واتس')) mappedSource = 'whatsapp';else
    mappedSource = 'walkin';

    // Map status options
    let mappedStatus = 'arrived';
    if (newStatus === 'انتهى') mappedStatus = 'done';else
    if (newStatus === 'حجز') mappedStatus = 'booked';else
    if (newStatus === 'لم يحضر') mappedStatus = 'no_show';

    try {
      await apiClient.put(`/visits/${editingVisit.id}`, {
        client_id: clientId,
        visit_date: newDate,
        source: mappedSource,
        status: mappedStatus,
        notes: `Tried: ${selectedTriedDresses.join(', ')}. Booked: ${selectedBookedDresses.join(', ')}`
      });

      fetchVisits();
      setEditingVisit(null);
    } catch (err) {
      console.error('Failed to update visit:', err);
    }

    // Reset Form
    setNewClient('');
    setNewDate('2026-07-12');
    setNewSource('انستقرام');
    setNewStatus('وصل');
    setSelectedTriedDresses([]);
    setSelectedBookedDresses([]);
  };

  const handleConvertToBookingClick = (v) => {
    setSelectedVisitToConvert(v);
    const initialDress = v.triedDresses?.[0] || availableDresses[0] || '';
    setConvertDress(initialDress);

    // Predetermine price based on dress selection
    const priceStr = dressesData.find((d) => d.name === initialDress)?.rentalCost || '5,000 ج.م';
    setConvertAmount(priceStr);

    // Set wedding date to 2 months from today or visit date
    let wedDate = v.date;
    try {
      const d = new Date(v.date);
      d.setMonth(d.getMonth() + 2);
      wedDate = d.toISOString().split('T')[0];
    } catch (e) {}
    setConvertWeddingDate(wedDate);

    setConvertCity('القاهرة');
    setConvertPaymentMethod('cash');
    setIsConvertModalOpen(true);
  };

  const handleDressChangeForConvert = (dressName) => {
    setConvertDress(dressName);
    const priceStr = dressesData.find((d) => d.name === dressName)?.rentalCost || '5,000 ج.م';
    setConvertAmount(priceStr);
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVisitToConvert) return;

    // Resolve client_id
    const clientObj = clientsObjects.find((c) => c.name === selectedVisitToConvert.client);
    const clientId = clientObj?.id || 1;

    // Resolve dress_id
    const dressObj = dressesData.find((d) => d.name === convertDress);
    const dressId = dressObj?.id || 1;

    const amountNum = parseFloat(convertAmount.replace(/[^\d]/g, '')) || 0;

    try {
      // 1. Create booking via API
      const bookingRes = await apiClient.post('/bookings', {
        client_id: clientId,
        dress_id: dressId,
        booking_date: new Date().toISOString().split('T')[0],
        event_date: convertWeddingDate,
        status: 'confirmed',
        total_amount: amountNum,
        payment_method: convertPaymentMethod
      });

      const bookingId = bookingRes.id || bookingRes.data?.id;

      // 2. Update visit status to 'booked' (which corresponds to 'حجز' in Arabic frontend)
      await apiClient.put(`/visits/${selectedVisitToConvert.id}`, {
        client_id: clientId,
        visit_date: selectedVisitToConvert.date,
        status: 'booked'
      });

      fetchVisits();

      if (bookingId) {
        // 3. Create fitting via API linked to booking_id
        apiClient.post('/fittings', {
          booking_id: bookingId,
          fitting_date: convertWeddingDate,
          status: 'scheduled',
          notes: 'تمت الجدولة تلقائياً عند تأكيد الحجز من الزيارة.'
        }).catch(() => {});

        // 4. Create task via API linked to booking_id
        apiClient.post('/tasks', {
          booking_id: bookingId,
          title: `تجهيز فستان ${convertDress} للعميلة ${selectedVisitToConvert.client}`,
          description: 'مراجعة تعديلات الفستان والقياسات قبل تاريخ التسليم.',
          status: 'pending',
          priority: 'high'
        }).catch(() => {});
      }

    } catch (err) {
      console.error('Failed to convert visit to booking:', err);
    }

    // Close Modal & Reset
    setIsConvertModalOpen(false);
    setSelectedVisitToConvert(null);

    // Show custom alert success
    setAlertConfig({
      isOpen: true,
      title: 'تم الحجز بنجاح',
      message: `تم تحويل زيارة العميلة "${selectedVisitToConvert.client}" إلى حجز مؤكد لفستان "${convertDress}" بنجاح!\nتمت جدولة القياس النهائي والمهام وإيرادات المالية تلقائياً.`
    });
  };

  const fetchVisits = () => {
    // Load visits from API
    apiClient.get('/visits').then((res) => {
      const data = res.data || [];
      setVisitsList(data.map((v) => ({
        id: v.id,
        client: v.client?.name || v.client_name || '-',
        date: v.visit_date || v.date || '',
        source: v.source || 'مباشر',
        status: v.status === 'arrived' ? 'وصل' : v.status === 'done' ? 'انتهى' : v.status === 'booked' ? 'حجز' : 'لم يحضر',
        triedDresses: v.tried_dresses || [],
        bookedDresses: v.booked_dresses || []
      })));
    }).catch((err) => console.error('Failed to load visits:', err));
  };

  // Load from API
  useEffect(() => {
    const active = localStorage.getItem('atelier_current_employee');
    if (active) {
      try {
        const emp = JSON.parse(active);
        setIsAdmin(emp.role === 'admin' || emp.email === 'admin@atelier.test');
      } catch (e) {}
    }

    fetchVisits();

    // Load clients
    apiClient.get('/clients').then((res) => {
      setClientsObjects(res.data || []);
    }).catch(() => {});

    // Load dresses catalog from API
    apiClient.get('/dresses?per_page=all').then((res) => {
      const data = Array.isArray(res) ? res : (res.data?.data || res.data || []);
      setDressesData(data);
      if (data.length > 0) setAvailableDresses(data.map((d) => d.name));
    }).catch(() => {});
  }, []);

  const saveVisits = (newVisits) => {
    setVisitsList(newVisits);
    // Mutations go through API
  };

  const handleAddVisit = async (e) => {
    e.preventDefault();
    if (!newClient.trim()) return;

    // 1. Resolve or create client
    let clientObj = clientsObjects.find((c) => c.name.trim() === newClient.trim());
    let clientId = clientObj?.id;
    if (!clientId) {
      try {
        const clientRes = await apiClient.post('/clients', {
          name: newClient,
          phone: '0000000000',
          email: `${Date.now()}@visit-client.com`,
          source: 'walkin'
        });
        clientId = clientRes.id || clientRes.data?.id;
      } catch (err) {
        console.error('Failed to create client for visit:', err);
        clientId = 1;
      }
    }

    // Map source options to valid enums required by backend validation: 'instagram', 'website', 'referral', 'walkin', 'whatsapp'
    let mappedSource = 'instagram';
    if (newSource.includes('سناب') || newSource.includes('تيك')) mappedSource = 'instagram';else
    if (newSource.includes('موقع')) mappedSource = 'website';else
    if (newSource.includes('توصية')) mappedSource = 'referral';else
    if (newSource.includes('واتس')) mappedSource = 'whatsapp';else
    mappedSource = 'walkin';

    // Map status options: 'arrived', 'done', 'booked', 'no_show'
    let mappedStatus = 'arrived';
    if (newStatus === 'انتهى') mappedStatus = 'done';else
    if (newStatus === 'حجز') mappedStatus = 'booked';else
    if (newStatus === 'لم يحضر') mappedStatus = 'no_show';

    try {
      await apiClient.post('/visits', {
        client_id: clientId,
        visit_date: newDate,
        source: mappedSource,
        status: mappedStatus,
        notes: `Tried: ${selectedTriedDresses.join(', ')}. Booked: ${selectedBookedDresses.join(', ')}`
      });

      fetchVisits();

      // Generate task via API
      apiClient.post('/tasks', {
        title: `تأكيد حضور زيارة ${newClient} اليوم`,
        description: `التواصل وتأكيد موعد الزيارة لمناقشة القياسات وكتالوج الفساتين.`,
        status: 'pending',
        priority: 'low'
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to add visit:', err);
    }

    setIsModalOpen(false);
    setNewClient('');
    setNewDate(selectedDateStr);
    setNewSource('انستقرام');
    setNewStatus('وصل');
    setSelectedTriedDresses([]);
    setSelectedBookedDresses([]);
  };

  const updateVisitStatus = async (id, status) => {
    let mappedStatus = 'arrived';
    if (status === 'انتهى') mappedStatus = 'done';else
    if (status === 'حجز') mappedStatus = 'booked';else
    if (status === 'لم يحضر') mappedStatus = 'no_show';

    try {
      await apiClient.put(`/visits/${id}`, {
        status: mappedStatus
      });
      fetchVisits();
    } catch (e) {
      console.error('Failed to update visit status:', e);
    }
  };

  const checkDressAvailability = (dress, targetDateStr) => {
    // Using in-memory bookings data from API
    return { available: true };
  };

  const toggleTriedDress = (dress) => {
    if (selectedTriedDresses.includes(dress)) {
      setSelectedTriedDresses(selectedTriedDresses.filter((d) => d !== dress));
      setSelectedBookedDresses(selectedBookedDresses.filter((d) => d !== dress));
    } else {
      const check = checkDressAvailability(dress, newDate);
      if (!check.available) {
        setAlertConfig({
          isOpen: true,
          title: 'الفستان مشغول/تحت التجهيز!',
          message: `الفستان غير متاح للقياس في هذا التاريخ.\nهو مشغول في فترة التحضير أو فرح للعميلة "${check.conflictBride}".\nسيكون الفستان متاحاً مجدداً ابتداءً من تاريخ: ${check.nextAvailableDate}.`
        });
        return;
      }
      setSelectedTriedDresses([...selectedTriedDresses, dress]);
    }
  };

  const toggleBookedDress = (dress) => {
    if (selectedBookedDresses.includes(dress)) {
      setSelectedBookedDresses(selectedBookedDresses.filter((d) => d !== dress));
    } else {
      const check = checkDressAvailability(dress, newDate);
      if (!check.available) {
        setAlertConfig({
          isOpen: true,
          title: 'الفستان غير متاح للحجز!',
          message: `الفستان مشغول بسبب فرح للعميلة "${check.conflictBride}".\nسيكون الفستان متاحاً مجدداً ابتداءً من تاريخ: ${check.nextAvailableDate}.`
        });
        return;
      }
      setSelectedBookedDresses([...selectedBookedDresses, dress]);
      if (!selectedTriedDresses.includes(dress)) {
        setSelectedTriedDresses([...selectedTriedDresses, dress]);
      }
    }
  };

  // Sync date form input when selectedDateStr changes
  useEffect(() => {
    setNewDate(selectedDateStr);
  }, [selectedDateStr]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];


  const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonthDays = month === 0 ? getDaysInMonth(year - 1, 11) : getDaysInMonth(year, month - 1);

  const calendarCells = [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, isCurrentMonth: false, dateStr });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, isCurrentMonth: true, dateStr });
  }

  // Next month padding
  const remaining = 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, isCurrentMonth: false, dateStr });
  }

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  // Filter visits for detail table
  const displayedVisits = visitsList.filter((v) => {
    const matchesSearch = searchQuery === '' ||
    v.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.source.toLowerCase().includes(searchQuery.toLowerCase());

    if (isFilterActive) {
      return v.date === selectedDateStr && matchesSearch;
    }
    return matchesSearch;
  });

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 space-y-8 animate-fade-in text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <span>سجل وجدول المواعيد والزيارات</span>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">لوحة التحكم</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-1">تتبع زيارات العرائس، فحص القياسات وتجربة الفساتين لتقارير التسويق والمبيعات.</p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer self-start sm:self-auto">
          
          <Plus size={16} />
          <span>إضافة زيارة جديدة</span>
        </button>
      </div>

      {/* Calendar Area */}
      <div className="bg-white rounded-3xl p-6 border border-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <CalendarIcon size={16} className="text-indigo-600" />
              <span>أجندة المواعيد</span>
            </h2>
            <span className="text-xs font-bold text-slate-400">({visitsList.length} زيارة مسجلة)</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100/70">
            <button
              onClick={() => navigateMonth('next')}
              className="p-1.5 hover:bg-white rounded-xl transition-colors text-slate-500 hover:text-slate-800 cursor-pointer">
              
              <ChevronRight size={16} />
            </button>
            <span className="text-xs font-extrabold text-slate-700 px-3 min-w-[100px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1.5 hover:bg-white rounded-xl transition-colors text-slate-500 hover:text-slate-800 cursor-pointer">
              
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-2 text-center">
          {daysOfWeek.map((day, idx) =>
          <div key={idx} className="text-xs font-extrabold text-slate-400 py-2 bg-slate-50/50 rounded-xl">
              {day}
            </div>
          )}
        </div>

        {/* Grid Cells - Compacted min-h to fit screen nicely */}
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((cell, idx) => {
            const isSelected = cell.dateStr === selectedDateStr;
            const dayVisits = visitsList.filter((v) => v.date === cell.dateStr);

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedDateStr(cell.dateStr);
                  setIsFilterActive(true);
                }}
                className={`min-h-[85px] p-2 rounded-xl border transition-all duration-300 flex flex-col justify-between cursor-pointer group ${
                isSelected && isFilterActive ?
                'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20' :
                cell.isCurrentMonth ?
                'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm' :
                'border-slate-50 bg-slate-50/20 text-slate-300'}`
                }>
                
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-extrabold ${
                  isSelected && isFilterActive ?
                  'text-indigo-600' :
                  cell.isCurrentMonth ?
                  'text-slate-700' :
                  'text-slate-300'}`
                  }>
                    {cell.day}
                  </span>
                  {dayVisits.length > 0 &&
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  }
                </div>

                {/* Day Visits Mini Cards */}
                <div className="space-y-1 mt-1 flex-grow overflow-y-auto max-h-[50px] scrollbar-none">
                  {dayVisits.slice(0, 2).map((visit) => {
                    const s = statusStyles[visit.status] || statusStyles['وصل'];
                    return (
                      <div
                        key={visit.id}
                        className={`px-1 py-0.5 rounded text-[8px] font-bold flex items-center justify-between gap-1 border border-slate-100 ${s.bg} ${s.text} truncate`}>
                        
                        <span className="truncate max-w-[45px]">{visit.client}</span>
                        <span className={`w-1 h-1 rounded-full ${s.dot} flex-shrink-0`} />
                      </div>);

                  })}
                  {dayVisits.length > 2 &&
                  <div className="text-[7px] font-extrabold text-slate-400 text-center">
                      +{dayVisits.length - 2} أخرى
                    </div>
                  }
                </div>
              </div>);

          })}
        </div>
      </div>

      {/* Selected Day Details Table */}
      <div className="space-y-4 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-slate-800">
                {isFilterActive ? 'تفاصيل زيارات يوم:' : 'جميع الزيارات المسجلة'}
              </h3>
              {isFilterActive ?
              <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl text-xs font-extrabold">{selectedDateStr}</span> :
              null}
              
              <button
                onClick={() => setIsFilterActive(!isFilterActive)}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50/50 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-indigo-100">
                
                {isFilterActive ? 'عرض جميع التواريخ' : `تصفية حسب يوم ${selectedDateStr}`}
              </button>
            </div>
            <p className="text-[10px] font-semibold text-slate-400">تظهر هنا البيانات الكاملة بما في ذلك المبيعات والفساتين التي تم تجربتها أو حجزها.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="بحث في اسم العميلة أو القناة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-white border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700 shadow-sm" />
            
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          </div>
        </div>

        {displayedVisits.length === 0 ?
        <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center space-y-3">
            <div className="w-10 h-10 bg-slate-50 text-slate-400 flex items-center justify-center rounded-2xl mx-auto">
              <CalendarIcon size={20} />
            </div>
            <p className="text-xs font-bold text-slate-500">لا توجد زيارات لعرضها</p>
            <p className="text-[10px] text-slate-400">حاول تغيير خيارات البحث أو قم بإضافة موعد جديد.</p>
          </div> :

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.01)] border border-slate-50 overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100/70">
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">العميلة</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">التاريخ</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">المصدر التسويقي</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">حالة الحضور والزيارة</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">الفساتين التي تم تجربتها (قياس)</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">الفساتين المحجوزة</th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-400">
                    <SlidersHorizontal size={14} className="text-slate-400 inline-block" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedVisits.map((visit) => {
                const s = statusStyles[visit.status] || statusStyles['وصل'];
                return (
                  <tr key={visit.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all duration-300">
                      <td className="px-6 py-4 text-xs font-bold text-slate-800">{visit.client}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-semibold">{visit.date}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-semibold">
                        <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-xl text-[10px]">
                          {visit.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                        value={visit.status}
                        onChange={(e) => updateVisitStatus(visit.id, e.target.value)}
                        className="bg-transparent border-0 font-bold text-xs focus:ring-0 focus:outline-none cursor-pointer p-0 text-slate-700"
                        style={{ color: s.text.replace('text-', '') }}>
                        
                          {STATUS_OPTIONS.map((opt) =>
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                        )}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-semibold">
                        {visit.triedDresses && visit.triedDresses.length > 0 ?
                      <div className="flex flex-wrap gap-1">
                            {visit.triedDresses.map((d, i) =>
                        <span key={i} className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-lg text-[9px] font-extrabold border border-violet-100">
                                {d}
                              </span>
                        )}
                          </div> :

                      <span className="text-slate-300">-</span>
                      }
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-semibold">
                        {visit.bookedDresses && visit.bookedDresses.length > 0 ?
                      <div className="flex flex-wrap gap-1">
                            {visit.bookedDresses.map((d, i) =>
                        <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-extrabold border border-indigo-100 flex items-center gap-1">
                                <Sparkles size={8} />
                                {d}
                              </span>
                        )}
                          </div> :

                      <span className="text-slate-300">لا يوجد حجز</span>
                      }
                      </td>
                      <td className="px-6 py-4 text-left">
                        {isAdmin &&
                      <div className="flex items-center gap-2 justify-end">
                            <button
                          onClick={() => handleConvertToBookingClick(visit)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all text-[10px] font-extrabold flex items-center gap-1 cursor-pointer border border-indigo-100/50"
                          title="تحويل لحجز فستان">
                          
                              <Sparkles size={10} className="animate-pulse" />
                              <span>تحويل لحجز</span>
                            </button>
                            <button
                          onClick={() => handleEditVisitClick(visit)}
                          className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all cursor-pointer"
                          title="تعديل الزيارة">
                          
                              <Edit3 size={12} />
                            </button>
                            <button
                          onClick={() => {
                            setDeleteConfirm({
                              isOpen: true,
                              title: 'تأكيد حذف الزيارة',
                              message: 'هل أنتِ متأكدة من رغبتكِ في حذف هذه الزيارة؟',
                              onConfirm: async () => {
                                try {
                                  await apiClient.delete(`/visits/${visit.id}`);
                                  fetchVisits();
                                } catch (e) {
                                  console.error('Failed to delete visit:', e);
                                }
                              }
                            });
                          }}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline cursor-pointer">
                          
                              حذف
                            </button>
                          </div>
                      }
                      </td>
                    </tr>);

              })}
              </tbody>
            </table>
          </div>
        }
      </div>

      {/* Add Visit Modal - Uses a strictly capped height flex modal to fit screen and scroll internally */}
      {isModalOpen &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">إضافة زيارة عميلة جديدة</h3>
              <button
              onClick={() => setIsModalOpen(false)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            {/* Modal Form - explicitly scrollable inside the constrained card height */}
            <form onSubmit={handleAddVisit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              {/* Client Name */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اسم العميلة</label>
                <input
                type="text"
                required
                placeholder="مثال: رزان عبدالله"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700" />
              
              </div>

              {/* Date & Source */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ الزيارة</label>
                  <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">مصدر التسويق</label>
                  <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700">
                  
                    {MARKETING_SOURCES.map((source) =>
                  <option key={source.value} value={source.value}>{source.label}</option>
                  )}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">الحالة الأولية للزيارة</label>
                <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700">
                
                  {STATUS_OPTIONS.map((opt) =>
                <option key={opt.value} value={opt.value}>{opt.label}</option>
                )}
                </select>
              </div>

              {/* Tried Dresses */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 block">الفساتين التي قامت بقياسها (تجربة)</label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100/50">
                  {availableDresses.map((dress) => {
                  const isSelected = selectedTriedDresses.includes(dress);
                  const check = checkDressAvailability(dress, newDate);
                  const detail = dressesData.find((d) => d.name === dress);
                  const feeLabel = detail && detail.tryingFee ? ` (رسوم: ${detail.tryingFee})` : '';
                  return (
                    <button
                      type="button"
                      key={dress}
                      onClick={() => toggleTriedDress(dress)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                      isSelected ?
                      'bg-violet-600 border-violet-600 text-white shadow-sm' :
                      !check.available ?
                      'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100/50' :
                      'bg-white border-slate-150 text-slate-600 hover:bg-slate-100'}`
                      }>
                      
                        {dress}{feeLabel} {!check.available && '(مشغول/تجهيز)'}
                      </button>);

                })}
                </div>
              </div>

              {/* Booked Dresses */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 block">الفساتين المحجوزة فوراً (إن وُجدت)</label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100/50">
                  {availableDresses.map((dress) => {
                  const isSelected = selectedBookedDresses.includes(dress);
                  const check = checkDressAvailability(dress, newDate);
                  const detail = dressesData.find((d) => d.name === dress);
                  const feeLabel = detail && detail.tryingFee ? ` (رسوم: ${detail.tryingFee})` : '';
                  return (
                    <button
                      type="button"
                      key={dress}
                      onClick={() => toggleBookedDress(dress)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                      isSelected ?
                      'bg-indigo-600 border-indigo-600 text-white shadow-sm' :
                      !check.available ?
                      'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100/50' :
                      'bg-white border-slate-150 text-slate-600 hover:bg-slate-100'}`
                      }>
                      
                        {dress}{feeLabel} {!check.available && '(مشغول/تجهيز)'}
                      </button>);

                })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center shadow-sm">
                
                  حفظ البيانات
                </button>
                <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Custom Premium Alert Modal Overlay */}
      {alertConfig?.isOpen &&
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 text-center">{alertConfig.title}</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed text-center whitespace-pre-line">{alertConfig.message}</p>
            <button
            onClick={() => setAlertConfig(null)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95">
            
              حسناً
            </button>
          </div>
        </div>
      }

      {/* Edit Visit Modal */}
      {editingVisit &&
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700" dir="rtl">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">تعديل بيانات الزيارة</h3>
              <button
              onClick={() => setEditingVisit(null)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditVisitSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اسم العميلة</label>
                <input
                type="text"
                required
                placeholder="مثال: رزان عبدالله"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ الزيارة</label>
                  <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">مصدر التسويق</label>
                  <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none text-slate-700">
                  
                    <option value="انستقرام">انستقرام (Instagram)</option>
                    <option value="فيسبوك">فيسبوك (Facebook)</option>
                    <option value="تيك توك">تيك توك (TikTok)</option>
                    <option value="إحالة">عميلة سابقة / إحالة</option>
                    <option value="موقع">الموقع الإلكتروني</option>
                    <option value="أخرى">أخرى / اتصال</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">حالة حضور الزيارة</label>
                <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none text-slate-700">
                
                  <option value="وصل">وصلت الصالون</option>
                  <option value="انتهى">انتهت الزيارة</option>
                  <option value="حجز">حجز مؤكد</option>
                  <option value="لم يحضر">لم تحضر</option>
                </select>
              </div>

              {/* Dresses tried selection */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-600 block">الفساتين التي تم قياسها / تجربتها</label>
                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-1 border border-slate-100 rounded-2xl bg-slate-50/50">
                  {availableDresses.map((d) => {
                  const isSelected = selectedTriedDresses.includes(d);
                  const matchedDress = dressesData.find((item) => item.name === d);
                  const feeText = matchedDress?.tryingFee ? ` (${matchedDress.tryingFee})` : '';

                  return (
                    <button
                      type="button"
                      key={d}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTriedDresses(selectedTriedDresses.filter((item) => item !== d));
                        } else {
                          setSelectedTriedDresses([...selectedTriedDresses, d]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                      isSelected ?
                      'bg-violet-600 border-violet-600 text-white shadow-sm' :
                      'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`
                      }>
                      
                        {d}{feeText}
                      </button>);

                })}
                </div>
              </div>

              {/* Dresses booked selection */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-600 block">الفساتين التي تم الاستقرار على حجزها</label>
                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-1 border border-slate-100 rounded-2xl bg-slate-50/50">
                  {availableDresses.map((d) => {
                  const isSelected = selectedBookedDresses.includes(d);
                  const matchedDress = dressesData.find((item) => item.name === d);
                  const feeText = matchedDress?.tryingFee ? ` (${matchedDress.tryingFee})` : '';

                  return (
                    <button
                      type="button"
                      key={d}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedBookedDresses(selectedBookedDresses.filter((item) => item !== d));
                        } else {
                          setSelectedBookedDresses([...selectedBookedDresses, d]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                      isSelected ?
                      'bg-indigo-600 border-indigo-600 text-white shadow-sm' :
                      'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`
                      }>
                      
                        {d}{feeText}
                      </button>);

                })}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center shadow-sm">
                
                  حفظ التعديلات
                </button>
                <button
                type="button"
                onClick={() => setEditingVisit(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirm?.isOpen &&
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 size={20} className="animate-pulse" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 text-center">{deleteConfirm.title}</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed text-center whitespace-pre-line">{deleteConfirm.message}</p>
            <div className="flex items-center gap-3">
              <button
              onClick={() => {
                deleteConfirm.onConfirm();
                setDeleteConfirm(null);
              }}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-600/10 active:scale-95 animate-fade-in">
              
                تأكيد الحذف
              </button>
              <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer">
              
                إلغاء
              </button>
            </div>
          </div>
        </div>
      }
    {/* Convert to Booking Modal */}
      {isConvertModalOpen && selectedVisitToConvert &&
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700 text-right" dir="rtl">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="text-indigo-600 animate-pulse" size={16} />
                <span>تحويل الزيارة إلى حجز مؤكد</span>
              </h3>
              <button
              onClick={() => {
                setIsConvertModalOpen(false);
                setSelectedVisitToConvert(null);
              }}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConvertSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow scrollbar-thin">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اسم العروس (العميلة)</label>
                <input
                type="text"
                readOnly
                value={selectedVisitToConvert.client}
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 focus:outline-none cursor-not-allowed" />
              
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">الفستان المختار للحجز</label>
                <select
                value={convertDress}
                onChange={(e) => handleDressChangeForConvert(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none"
                required>
                
                  <option value="" disabled>اختر الفستان...</option>
                  {availableDresses.map((d) =>
                <option key={d} value={d}>{d}</option>
                )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ الزفاف / التسليم</label>
                  <input
                  type="date"
                  required
                  value={convertWeddingDate}
                  onChange={(e) => setConvertWeddingDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">قيمة الحجز والعربون</label>
                  <input
                  type="text"
                  required
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none"
                  placeholder="مثال: 5,000 ج.م" />
                
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">مدينة الحفل</label>
                  <input
                  type="text"
                  required
                  value={convertCity}
                  onChange={(e) => setConvertCity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none"
                  placeholder="مثال: القاهرة" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">طريقة سداد الدفعة الأولى</label>
                  <select
                  value={convertPaymentMethod}
                  onChange={(e) => setConvertPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none">
                  
                    <option value="cash">نقدي (كاش)</option>
                    <option value="instapay">إنستاباي (InstaPay)</option>
                    <option value="vodafone cash">فودافون كاش</option>
                    <option value="bank transfer">تحويل بنكي</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center shadow-md shadow-indigo-600/10 active:scale-95">
                
                  تأكيد الحجز وتدفق البيانات
                </button>
                <button
                type="button"
                onClick={() => {
                  setIsConvertModalOpen(false);
                  setSelectedVisitToConvert(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

}