import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Plus,
  Search,
  Sparkles,
  SlidersHorizontal,
  X,
  CreditCard,
  ImageIcon,

  FileText,
  Trash2,
  Edit3 } from
'lucide-react';














export function getOccupiedDatesForBooking(weddingDateStr, city) {
  if (!weddingDateStr) return [];
  const weddingDate = new Date(weddingDateStr);
  const dates = [];

  // Cairo / Giza: 2 days before (pending start), pickup 1 day before, wedding day, 1 day after return
  // Other cities: 3 days before (pending start), pickup 2 days before, wedding day, 1 day after return
  const isCairoOrGiza = !city || city === 'القاهرة' || city === 'الجيزة' || city === 'cairo' || city === 'giza';
  const daysBefore = isCairoOrGiza ? 2 : 3;
  const daysAfter = 1;

  for (let i = -daysBefore; i <= daysAfter; i++) {
    const d = new Date(weddingDate);
    d.setDate(weddingDate.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}


const DRESS_PRICES = {
  'فستان الأميرة كلاسيك': '12,000 ج.م',
  'فستان السهرة ذهبي': '15,000 ج.م',
  'فستان الزفاف الأبيض الملكي': '18,000 ج.م',
  'فستان الناعم الوردي بريق': '10,000 ج.م',
  'فستان مطرز بلوري': '14,000 ج.م',
  'فستان الكوتور الفرنسي': '22,000 ج.م'
};

const initialBookings = [
{
  id: 1,
  client: 'سارة أحمد',
  dress: 'فستان الأميرة كلاسيك',
  weddingDate: '2026-09-15',
  amount: '12,000 ج.م',
  status: 'مؤكد',
  city: 'القاهرة',
  paymentMethod: 'instapay',
  receiptImage: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=80'
},
{
  id: 2,
  client: 'نورة محمد',
  dress: 'فستان السهرة ذهبي',
  weddingDate: '2026-10-01',
  amount: '15,000 ج.م',
  status: 'في الانتظار',
  city: 'جدة',
  paymentMethod: 'bank transfer',
  receiptImage: null
},
{
  id: 3,
  client: 'فاطمة العلي',
  dress: 'فستان الزفاف الأبيض الملكي',
  weddingDate: '2026-08-20',
  amount: '18,000 ج.م',
  status: 'مؤكد',
  city: 'القاهرة',
  paymentMethod: 'cash',
  receiptImage: null
}];


const statusStyles = {
  'مؤكد': { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  'في الانتظار': { dot: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' },
  'ملغي': { dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' }
};

const paymentMethodLabels = {
  'instapay': 'إنستاباي (InstaPay)',
  'vodafone cash': 'فودافون كاش',
  'bank transfer': 'تحويل بنكي',
  'cash': 'نقدي (كاش)'
};

export default function BookingsPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 12)); // July 2026
  const [selectedDateStr, setSelectedDateStr] = useState('2026-07-12');
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Core collections
  const [manualBookings, setManualBookings] = useState([]);
  const [mergedBookings, setMergedBookings] = useState([]);
  const [dressesObjects, setDressesObjects] = useState([]);
  const [clientsObjects, setClientsObjects] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [availableDresses, setAvailableDresses] = useState([
  'فستان الأميرة كلاسيك',
  'فستان السهرة ذهبي',
  'فستان الزفاف الأبيض الملكي',
  'فستان الناعم الوردي بريق',
  'فستان مطرز بلوري',
  'فستان الكوتور الفرنسي']
  );

  // Add Booking Form state
  const [newClient, setNewClient] = useState('');
  const [newDress, setNewDress] = useState('فستان الأميرة كلاسيك');
  const [newWeddingDate, setNewWeddingDate] = useState('2026-09-15');
  const [newAmount, setNewAmount] = useState('12,000 ج.م');
  const [newStatus, setNewStatus] = useState('في الانتظار');
  const [newCity, setNewCity] = useState('القاهرة');
  const [newPaymentMethod, setNewPaymentMethod] = useState('cash');
  const [newReceiptImage, setNewReceiptImage] = useState(null);

  // Selected Booking Details Pop-up state
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);

  // Custom Alert Popup Modal state
  const [alertConfig, setAlertConfig] = useState(null);

  // Local check helper
  const checkLocalAvailabilityConflict = (dressName, dateStr, cityStr, excludeId) => {
    if (!dressName || !dateStr) return null;

    const proposedWedding = new Date(dateStr);
    if (isNaN(proposedWedding.getTime())) return null;

    const isCairo = cityStr === 'القاهرة' || cityStr === 'cairo' || !cityStr;
    const daysBefore = isCairo ? 2 : 3;
    const daysAfter = 1;

    const proposedStart = new Date(proposedWedding);
    proposedStart.setDate(proposedWedding.getDate() - daysBefore);
    proposedStart.setHours(0, 0, 0, 0);

    const proposedEnd = new Date(proposedWedding);
    proposedEnd.setDate(proposedWedding.getDate() + daysAfter);
    proposedEnd.setHours(23, 59, 59, 999);

    const existing = mergedBookings.filter((b) =>
    b.dress === dressName &&
    b.status !== 'ملغي' && (
    excludeId === undefined || b.id !== excludeId)
    );

    for (const eb of existing) {
      if (!eb.weddingDate) continue;
      const exWedding = new Date(eb.weddingDate);
      if (isNaN(exWedding.getTime())) continue;

      const exCity = eb.city || 'القاهرة';
      const exIsCairo = exCity === 'القاهرة' || exCity === 'cairo';
      const exDaysBefore = exIsCairo ? 2 : 3;
      const exDaysAfter = 1;

      const exStart = new Date(exWedding);
      exStart.setDate(exWedding.getDate() - exDaysBefore);
      exStart.setHours(0, 0, 0, 0);

      const exEnd = new Date(exWedding);
      exEnd.setDate(exWedding.getDate() + exDaysAfter);
      exEnd.setHours(23, 59, 59, 999);

      if (proposedStart <= exEnd && proposedEnd >= exStart) {
        const nextAvail = new Date(exEnd);
        nextAvail.setDate(exEnd.getDate() + 1);
        const yyyy = nextAvail.getFullYear();
        const mm = String(nextAvail.getMonth() + 1).padStart(2, '0');
        const dd = String(nextAvail.getDate()).padStart(2, '0');
        return `${dd}-${mm}-${yyyy}`;
      }
    }

    return null;
  };

  // Load bookings from API
  const fetchBookings = async () => {
    try {
      const res = await apiClient.get('/bookings');
      const data = res.data || [];
      const mapped = data.map((b) => ({
        id: b.id,
        client: b.client?.name || '-',
        dress: b.dress?.name || '-',
        weddingDate: b.event_date || '',
        amount: `${parseFloat(b.total_amount || 0).toLocaleString()} ج.م`,
        status: b.status === 'confirmed' ? 'مؤكد' : b.status === 'cancelled' ? 'ملغي' : 'في الانتظار',
        city: 'القاهرة',
        paymentMethod: 'cash',
        receiptImage: null
      }));
      setManualBookings(mapped);
      setMergedBookings(mapped);
    } catch (e) {
      console.error('Failed to load bookings:', e);
    }
  };

  useEffect(() => {
    const active = localStorage.getItem('atelier_current_employee');
    if (active) {
      try {
        const emp = JSON.parse(active);
        setIsAdmin(emp.role === 'admin' || emp.email === 'admin@atelier.test');
      } catch (e) {}
    }

    fetchBookings();

    // Load clients catalog from API
    apiClient.get('/clients').then((res) => {
      const data = res.data || [];
      setClientsObjects(data);
    }).catch(() => {});

    // Load dresses catalog from API
    apiClient.get('/dresses?per_page=all').then((res) => {
      const data = Array.isArray(res) ? res : (res.data?.data || res.data || []);
      setDressesObjects(data);
      if (data.length > 0) setAvailableDresses(data.map((d) => d.name));
    }).catch(() => {});
  }, []);

  // Check availability dynamically on field changes
  useEffect(() => {
    if (!isModalOpen && !editingBooking) return;
    const conflict = checkLocalAvailabilityConflict(newDress, newWeddingDate, newCity, editingBooking?.id);
    if (conflict) {
      setAlertConfig({
        isOpen: true,
        title: 'تنبيه بعدم توفر الفستان',
        message: `هذا الفستان غير متاح في التاريخ المحدد نظراً لحجزه لعروس أخرى وفترة الشحن والتجهيز اللازمة لمدينتها.\n\nسيكون متاحاً مجدداً بتاريخ: ${conflict}`
      });
    }
  }, [newDress, newWeddingDate, newCity]);

  // Update dress price automatically in add form when dress changes
  useEffect(() => {
    setNewAmount(DRESS_PRICES[newDress] || '10,000 ج.م');
  }, [newDress]);

  const saveBookings = (updatedManual) => {
    setManualBookings(updatedManual);
    localStorage.setItem('atelier_bookings', JSON.stringify(updatedManual));

    const storedVisits = localStorage.getItem('atelier_visits');
    let visitsList = [];
    if (storedVisits) {
      try {
        visitsList = JSON.parse(storedVisits);
      } catch (e) {}
    }
    const syncedBookings = [];
    visitsList.forEach((visit) => {
      if (visit.bookedDresses && visit.bookedDresses.length > 0 && (visit.status === 'حجز مؤكد' || visit.status === 'حضر')) {
        visit.bookedDresses.forEach((dressName) => {
          const alreadyExists = updatedManual.some(
            (b) => b.client === visit.client && b.dress === dressName
          );
          if (!alreadyExists) {
            let wedDate = visit.date;
            try {
              const d = new Date(visit.date);
              d.setMonth(d.getMonth() + 2);
              wedDate = d.toISOString().split('T')[0];
            } catch (err) {}
            syncedBookings.push({
              id: Number(visit.id) + 1000000,
              client: visit.client,
              dress: dressName,
              weddingDate: wedDate,
              amount: DRESS_PRICES[dressName] || '10,000 ج.م',
              status: 'مؤكد',
              isSyncedFromVisit: true,
              paymentMethod: 'cash',
              city: 'القاهرة'
            });
          }
        });
      }
    });
    setMergedBookings([...updatedManual, ...syncedBookings]);
  };

  const handleEditBookingClick = (b) => {
    setEditingBooking(b);
    setNewClient(b.client);
    setNewDress(b.dress);
    setNewWeddingDate(b.weddingDate);
    setNewAmount(b.amount);
    setNewStatus(b.status);
    setNewCity(b.city || 'القاهرة');
    setNewPaymentMethod(b.paymentMethod || 'cash');
  };

  const handleEditBookingSubmit = async (e) => {
    e.preventDefault();
    if (!editingBooking) return;

    const conflict = checkLocalAvailabilityConflict(newDress, newWeddingDate, newCity, editingBooking.id);
    if (conflict) {
      setAlertConfig({
        isOpen: true,
        title: 'تنبيه تعارض الحجز',
        message: `الفستان غير متاح في هذا التاريخ. سيكون متاحاً مجدداً بتاريخ ${conflict}.`
      });
      return;
    }

    const dressObj = dressesObjects.find((d) => d.name === newDress);
    const dressId = dressObj?.id || 1;

    const clientObj = clientsObjects.find((c) => c.name === newClient);
    const clientId = clientObj?.id || 1;

    const amountNum = parseFloat(newAmount.replace(/[^\d.]/g, '')) || 0;
    const mappedStatus = newStatus === 'مؤكد' ? 'confirmed' : newStatus === 'ملغي' ? 'cancelled' : 'pending';

    try {
      await apiClient.put(`/bookings/${editingBooking.id}`, {
        client_id: clientId,
        dress_id: dressId,
        booking_date: new Date().toISOString().split('T')[0],
        event_date: newWeddingDate,
        status: mappedStatus,
        total_amount: amountNum,
        payment_method: newPaymentMethod
      });

      fetchBookings();
      setEditingBooking(null);

      setNewClient('');
      setNewWeddingDate('2026-09-15');
      setNewAmount('12,000 ج.م');
      setNewStatus('في الانتظار');
      setNewCity('القاهرة');
      setNewPaymentMethod('cash');
    } catch (err) {
      console.error('Failed to update booking:', err);
      setAlertConfig({
        isOpen: true,
        title: 'فشل تعديل الحجز',
        message: err.message || 'الفستان غير متاح أو فشل الاتصال بالخادم.'
      });
    }
  };

  const handleAddBooking = async (e) => {
    e.preventDefault();
    if (!newClient.trim()) return;

    const conflict = checkLocalAvailabilityConflict(newDress, newWeddingDate, newCity);
    if (conflict) {
      setAlertConfig({
        isOpen: true,
        title: 'تنبيه تعارض الحجز',
        message: `الفستان غير متاح في هذا التاريخ. سيكون متاحاً مجدداً بتاريخ ${conflict}.`
      });
      return;
    }

    let clientObj = clientsObjects.find((c) => c.name.trim() === newClient.trim());
    let clientId = clientObj?.id;
    if (!clientId) {
      try {
        const clientRes = await apiClient.post('/clients', {
          name: newClient,
          phone: '0000000000',
          email: `${Date.now()}@booking-client.com`,
          source: 'walkin',
          city: newCity
        });
        clientId = clientRes.id || clientRes.data?.id;
      } catch (err) {
        console.error('Failed to create client for booking:', err);
        clientId = 1;
      }
    }

    const dressObj = dressesObjects.find((d) => d.name === newDress);
    const dressId = dressObj?.id || 1;

    const amountNum = parseFloat(newAmount.replace(/[^\d.]/g, '')) || 0;
    const mappedStatus = newStatus === 'مؤكد' ? 'confirmed' : newStatus === 'ملغي' ? 'cancelled' : 'pending';

    try {
      await apiClient.post('/bookings', {
        client_id: clientId,
        dress_id: dressId,
        booking_date: new Date().toISOString().split('T')[0],
        event_date: newWeddingDate,
        status: mappedStatus,
        total_amount: amountNum,
        payment_method: newPaymentMethod
      });

      fetchBookings();

      apiClient.post('/tasks', {
        title: `تجهيز فاتورة وتفاصيل سداد ${newClient}`,
        description: `تجهيز العقد وإيصال سداد الدفعة وحفظ التفاصيل المالية للطلب للعروس ${newClient} لحجز ${newDress}.`,
        status: 'pending',
        priority: 'high'
      }).catch(() => {});

      setIsModalOpen(false);

      setNewClient('');
      setNewDress('فستان الأميرة كلاسيك');
      setNewWeddingDate('2026-09-15');
      setNewStatus('في الانتظار');
      setNewCity('القاهرة');
      setNewPaymentMethod('cash');
      setNewReceiptImage(null);
    } catch (err) {
      console.error('Failed to create booking:', err);
      setAlertConfig({
        isOpen: true,
        title: 'فشل حجز الفستان',
        message: err.message || 'الفستان غير متاح أو حدث خطأ أثناء الحفظ.'
      });
    }
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewReceiptImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateBookingStatus = async (id, statusStr) => {
    const mappedStatus = statusStr === 'مؤكد' ? 'confirmed' : statusStr === 'ملغي' ? 'cancelled' : 'pending';
    try {
      await apiClient.put(`/bookings/${id}`, {
        status: mappedStatus
      });
      fetchBookings();
    } catch (e) {
      console.error('Failed to update booking status:', e);
    }
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];


  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => {
    const day = new Date(y, m, 1).getDay();
    return (day + 6) % 7; // Shift Sunday to last day for RTL calendar mapping
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  const calendarCells = [];

  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i);
  }

  const navigateMonth = (direction) => {
    if (direction === 'next') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  // Filters and queries
  const displayedBookings = mergedBookings.filter((b) => {
    const matchesSearch = b.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.dress.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (isFilterActive) {
      return b.weddingDate === selectedDateStr;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 flex flex-col h-full max-h-full overflow-y-auto bg-slate-50/50 text-right" dir="rtl">
      
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">إدارة وحجوزات الفساتين</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">عرض مواعيد الأفراح والحجوزات المؤكدة لفساتين الزفاف الملكية والسهرة.</p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setNewWeddingDate(selectedDateStr);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-md shadow-indigo-600/10 active:scale-95 cursor-pointer">
          
          <Plus size={16} />
          <span>إضافة حجز يدوي</span>
        </button>
      </div>

      {/* Calendar widget */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-indigo-500" />
            <h2 className="text-xs font-extrabold text-slate-800">
              تقويم حجوزات ومواعيد فرح العرائس - <span className="text-indigo-600">{monthNames[month]} {year}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors cursor-pointer">
              
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors cursor-pointer">
              
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'].map((d) =>
          <div key={d} className="text-center py-2 text-[10px] font-extrabold text-slate-400">{d}</div>
          )}

          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="bg-slate-50/20 rounded-2xl min-h-[90px] border border-transparent" />;
            }

            const currentDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayBlockouts = mergedBookings.filter((b) => {
              if (b.status === 'ملغي') return false;
              const occupied = getOccupiedDatesForBooking(b.weddingDate, b.city || 'القاهرة');
              return occupied.includes(currentDayStr);
            });
            const isSelected = selectedDateStr === currentDayStr;

            return (
              <div
                key={`day-${day}`}
                onClick={() => {
                  setSelectedDateStr(currentDayStr);
                  setIsFilterActive(true);
                }}
                className={`p-2 rounded-2xl min-h-[90px] border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected ?
                'border-indigo-600 bg-indigo-50/20 shadow-md shadow-indigo-100/30' :
                'border-slate-100 hover:border-indigo-100 bg-white'}`
                }>
                
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-600'}`}>
                    {day}
                  </span>
                  {dayBlockouts.length > 0 &&
                  <span className={`w-1.5 h-1.5 rounded-full ${
                  dayBlockouts.some((b) => b.weddingDate === currentDayStr) ? 'bg-indigo-500' : 'bg-amber-500'}`
                  } />
                  }
                </div>

                {/* Day Bookings & Blockouts Mini Cards */}
                <div className="space-y-1 mt-1 flex-grow overflow-y-auto max-h-[55px] scrollbar-none">
                  {dayBlockouts.slice(0, 2).map((b) => {
                    const isWeddingDay = b.weddingDate === currentDayStr;
                    const style = isWeddingDay ?
                    statusStyles[b.status] || statusStyles['مؤكد'] :
                    { bg: 'bg-amber-50/60', text: 'text-amber-700', dot: 'bg-amber-500' };

                    return (
                      <div
                        key={b.id}
                        className={`px-1 py-0.5 rounded text-[8px] font-bold flex items-center justify-between gap-0.5 border border-slate-100/60 ${style.bg} ${style.text} truncate`}>
                        
                        <span className="truncate max-w-[50px]">
                          {isWeddingDay ? `فرح ${b.client}` : `تجهيز لـ ${b.client}`}
                        </span>
                        <span className={`w-1 h-1 rounded-full ${style.dot} flex-shrink-0`} />
                      </div>);

                  })}
                  {dayBlockouts.length > 2 &&
                  <div className="text-[7px] font-extrabold text-slate-400 text-center">
                      +{dayBlockouts.length - 2} أخرى
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
                {isFilterActive ? 'حجوزات تاريخ فرح يوم:' : 'جميع الحجوزات المسجلة'}
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
            <p className="text-[10px] font-semibold text-slate-400">تظهر هنا المبالغ والفساتين المحجوزة والفساتين المتزامنة تلقائياً من الزيارات مع طريقة الدفع.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="بحث في اسم العميلة أو الفستان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-white border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700 shadow-sm" />
            
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          </div>
        </div>

        {displayedBookings.length === 0 ?
        <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center space-y-3">
            <div className="w-10 h-10 bg-slate-50 text-slate-400 flex items-center justify-center rounded-2xl mx-auto">
              <CalendarIcon size={20} />
            </div>
            <p className="text-xs font-bold text-slate-500">لا توجد حجوزات لعرضها</p>
            <p className="text-[10px] text-slate-400">تأكدي من إضافة حجز أو تسجيل فستان محجوز في صفحة الزيارات.</p>
          </div> :

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.01)] border border-slate-50 overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100/70">
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">العميلة</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">الفستان المطلوب</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">تاريخ الفرح</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">القيمة الإجمالية</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">طريقة الدفع</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">الحالة</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-400">النوع</th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-400">
                    <SlidersHorizontal size={14} className="text-slate-400 inline-block" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedBookings.map((b) => {
                const s = statusStyles[b.status] || statusStyles['في الانتظار'];
                return (
                  <tr
                    key={b.id}
                    onClick={() => setSelectedBookingDetails(b)}
                    className="border-b border-slate-50 last:border-0 hover:bg-indigo-50/20 transition-all duration-300 cursor-pointer">
                    
                      <td className="px-6 py-4 text-xs font-bold text-slate-800">{b.client}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-semibold">{b.dress}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-semibold">{b.weddingDate}</td>
                      <td className="px-6 py-4 text-xs font-bold text-indigo-600">{b.amount}</td>
                      <td className="px-6 py-4 text-xs font-extrabold text-slate-600">
                        {paymentMethodLabels[b.paymentMethod || 'cash']}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <select
                        value={b.status}
                        onChange={(e) => updateBookingStatus(b.id, e.target.value)}
                        className="bg-transparent border-0 font-bold text-xs focus:ring-0 focus:outline-none cursor-pointer p-0 text-slate-700"
                        style={{ color: s.text.replace('text-', '') }}>
                        
                          {Object.keys(statusStyles).map((opt) =>
                        <option key={opt} value={opt}>{opt}</option>
                        )}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        {b.isSyncedFromVisit ?
                      <span className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-lg text-[9px] font-extrabold border border-violet-100 flex items-center gap-1 w-fit">
                            <Sparkles size={8} />
                            متزامن من زيارة
                          </span> :

                      <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-bold border border-slate-100 w-fit">
                            يدوي
                          </span>
                      }
                      </td>
                      <td className="px-6 py-4 text-left" onClick={(e) => e.stopPropagation()}>
                        {isAdmin &&
                      <div className="flex items-center gap-2 justify-end">
                            {!b.isSyncedFromVisit &&
                        <button
                          onClick={() => handleEditBookingClick(b)}
                          className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all cursor-pointer"
                          title="تعديل الحجز">
                          
                                <Edit3 size={12} />
                              </button>
                        }
                            <button
                          onClick={() => {
                            setDeleteConfirm({
                              isOpen: true,
                              title: 'تأكيد حذف الحجز',
                              message: 'هل أنتِ متأكدة من رغبتكِ في حذف هذا الحجز؟',
                              onConfirm: async () => {
                                try {
                                  await apiClient.delete(`/bookings/${b.id}`);
                                  fetchBookings();
                                } catch (e) {
                                  console.error('Failed to delete booking:', e);
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

      {/* Transaction Details Modal */}
      {selectedBookingDetails &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] text-right">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">تفاصيل الحجز والمعاملة المالية</h3>
              <button
              onClick={() => setSelectedBookingDetails(null)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-grow scrollbar-thin">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block">اسم العميلة</span>
                  <span className="text-xs font-bold text-slate-700 mt-1 block">{selectedBookingDetails.client}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block">الفستان المطلوب</span>
                  <span className="text-xs font-bold text-slate-700 mt-1 block">{selectedBookingDetails.dress}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block">تاريخ الفرح</span>
                  <span className="text-xs font-semibold text-slate-600 mt-1 block">{selectedBookingDetails.weddingDate}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block">طريقة الدفع</span>
                  <span className="text-xs font-extrabold text-indigo-600 mt-1 block">
                    {paymentMethodLabels[selectedBookingDetails.paymentMethod || 'cash']}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block">المبلغ الإجمالي</span>
                  <span className="text-xs font-extrabold text-emerald-600 mt-1 block">{selectedBookingDetails.amount}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block">حالة الحجز</span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border w-fit block mt-1 ${
                `${statusStyles[selectedBookingDetails.status]?.text || 'text-slate-600'} ${statusStyles[selectedBookingDetails.status]?.bg || 'bg-slate-50'}`}`
                }>
                    {selectedBookingDetails.status}
                  </span>
                </div>
              </div>

              {/* Receipt Image Container */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-slate-600 block">إيصال الدفع المرفق</span>
                {selectedBookingDetails.receiptImage ?
              <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm max-h-[300px] flex items-center justify-center bg-slate-50 relative group">
                    <img
                  src={selectedBookingDetails.receiptImage}
                  alt="إيصال الدفع"
                  className="w-full h-full object-contain max-h-[280px]" />
                
                    <a
                  href={selectedBookingDetails.receiptImage}
                  download={`receipt-${selectedBookingDetails.client}.png`}
                  className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all">
                  
                      <FileText size={12} /> تحميل الإيصال
                    </a>
                  </div> :

              <div className="border border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                    <ImageIcon size={28} className="text-slate-300" />
                    <span className="text-xs font-bold">لم يتم إرفاق صورة إيصال دفع للمعاملة</span>
                    <span className="text-[10px]">الدفع نقدي أو بانتظار تزويدنا بالإيصال</span>
                  </div>
              }
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end">
              <button
              onClick={() => setSelectedBookingDetails(null)}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer">
              
                إغلاق
              </button>
            </div>
          </div>
        </div>
      }

      {/* Add Booking Modal */}
      {isModalOpen &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">إضافة حجز فستان جديد</h3>
              <button
              onClick={() => setIsModalOpen(false)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddBooking} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              {/* Client Name */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اسم العروس (العميلة)</label>
                <input
                type="text"
                required
                placeholder="مثال: سارة أحمد"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700" />
              
              </div>

              {/* Dress Selection */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">الفستان المطلوب حجزوه</label>
                <select
                value={newDress}
                onChange={(e) => setNewDress(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700">
                
                  {availableDresses.map((dress) =>
                <option key={dress} value={dress}>{dress}</option>
                )}
                </select>
              </div>

              {/* Wedding Date */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">تاريخ الفرح / التسليم</label>
                <input
                type="date"
                required
                value={newWeddingDate}
                onChange={(e) => setNewWeddingDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700" />
              
              </div>

              {/* Amount, Status & City */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">القيمة الإجمالية</label>
                  <input
                  type="text"
                  disabled
                  value={newAmount}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-500 cursor-not-allowed" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">حالة الحجز</label>
                  <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700">
                  
                    {Object.keys(statusStyles).map((opt) =>
                  <option key={opt} value={opt}>{opt}</option>
                  )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">مدينة العروس</label>
                  <select
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700">
                  
                    <option value="القاهرة">القاهرة (داخل القاهرة)</option>
                    <option value="خارج القاهرة">خارج القاهرة</option>
                  </select>
                </div>
              </div>

              {/* Payment Option Selection */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">خيار طريقة الدفع</label>
                <select
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700">
                
                  <option value="instapay">إنستاباي (InstaPay)</option>
                  <option value="vodafone cash">فودافون كاش (Vodafone Cash)</option>
                  <option value="bank transfer">تحويل بنكي (Bank Transfer)</option>
                  <option value="cash">نقدي (Cash)</option>
                </select>
              </div>

              {/* Upload Receipt */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-600 block">إرفاق صورة إيصال التحويل / الدفع</label>
                <div className="flex items-center gap-3">
                  <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  className="hidden"
                  id="receipt-file-input" />
                
                  <label
                  htmlFor="receipt-file-input"
                  className="flex-grow px-4 py-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs font-bold text-indigo-600 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-center gap-1.5 transition-all">
                  
                    <CreditCard size={14} />
                    <span>{newReceiptImage ? 'تغيير صورة الإيصال المرفقة' : 'اختر ملف صورة الإيصال للرفع'}</span>
                  </label>
                  {newReceiptImage &&
                <button
                  type="button"
                  onClick={() => setNewReceiptImage(null)}
                  className="p-2.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl hover:bg-rose-100/60 transition-all">
                  
                      <Trash2Icon size={14} />
                    </button>
                }
                </div>
                {newReceiptImage &&
              <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[140px] flex items-center justify-center bg-slate-50">
                    <img src={newReceiptImage} alt="معاينة الإيصال" className="w-full h-full object-contain max-h-[130px]" />
                  </div>
              }
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center shadow-sm">
                
                  حفظ الحجز
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

      {/* Edit Booking Modal */}
      {editingBooking &&
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700" dir="rtl">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">تعديل بيانات حجز العروس</h3>
              <button
              onClick={() => setEditingBooking(null)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditBookingSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اسم العروس / العميلة</label>
                <input
                type="text"
                required
                placeholder="مثال: سارة أحمد"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">الفستان المطلوب</label>
                  <select
                  value={newDress}
                  onChange={(e) => setNewDress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                  
                    {availableDresses.map((d) =>
                  <option key={d} value={d}>{d}</option>
                  )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">مدينة العروس (للشحن والتجهيز)</label>
                  <select
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                  
                    <option value="القاهرة">داخل القاهرة (تجهيز 2 يوم قبل الفرح و1 يوم بعده)</option>
                    <option value="خارج القاهرة">خارج القاهرة (تجهيز 3 أيام قبل الفرح و1 يوم بعده)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ ليلة الفرح</label>
                  <input
                  type="date"
                  required
                  value={newWeddingDate}
                  onChange={(e) => setNewWeddingDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">القيمة الإجمالية للإيجار</label>
                  <input
                  type="text"
                  required
                  placeholder="مثال: 5,000 ج.م"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">طريقة الدفع</label>
                  <select
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                  
                    <option value="cash">كاش / نقدي</option>
                    <option value="insta-pay">انستا باي (InstaPay)</option>
                    <option value="vodafone-cash">فودافون كاش</option>
                    <option value="visa">فيزا / شبكة</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">حالة الحجز</label>
                  <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                  
                    <option value="في الانتظار">في الانتظار</option>
                    <option value="مؤكد">مؤكد</option>
                    <option value="مكتمل">مكتمل</option>
                    <option value="ملغي">ملغي</option>
                  </select>
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
                onClick={() => setEditingBooking(null)}
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
    </div>);

}

// Small Icon Helper since Trash2 is not imported in top
function Trash2Icon({ size }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />
    </svg>);

}