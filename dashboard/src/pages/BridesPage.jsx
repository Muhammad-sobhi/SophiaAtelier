import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, UserPlus, Search, Phone, MapPin, Calendar, 
  Eye, Edit3, Trash2, X, Check, MessageCircle, 
  Sparkles, Filter, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, RotateCcw,
  Package, Clock
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { formatWhatsAppNumber } from '@/lib/whatsapp';
import { cleanDate } from '@/lib/utils';
import { getDressConflict } from '@/components/bride-journey/UnifiedStageModal';

export function calculateScheduledDates(weddingDate, city) {
  if (!weddingDate) return { pickupDate: '', returnDate: '' };
  try {
    const isCairo = !city ||
      city.includes('القاهرة') ||
      city.includes('الجيزة') ||
      city.toLowerCase().includes('cairo') ||
      city.toLowerCase().includes('giza');
    
    // 1 day before wedding for Cairo & Giza, 2 days before for other cities
    const daysBefore = isCairo ? 1 : 2;
    const daysAfter = 1;

    const [year, month, day] = String(weddingDate).split('T')[0].split(' ')[0].split('-').map(Number);
    if (!year || !month || !day) return { pickupDate: '', returnDate: '' };

    const wDate = new Date(Date.UTC(year, month - 1, day));
    const pDate = new Date(wDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);
    const rDate = new Date(wDate.getTime() + daysAfter * 24 * 60 * 60 * 1000);

    return {
      pickupDate: pDate.toISOString().split('T')[0],
      returnDate: rDate.toISOString().split('T')[0],
    };
  } catch (e) {
    return { pickupDate: '', returnDate: '' };
  }
}

const CITIES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الشرقية',
  'الدقهلية', 'المنوفية', 'الغربية', 'دمياط', 'البحيرة',
  'الإسماعيلية', 'السويس', 'بورسعيد', 'الفيوم', 'بني سويف',
  'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان',
  'التجمع الأول', 'التجمع الخامس', 'مدينة نصر', 'مصر الجديدة',
  'المعادي', 'الشيخ زايد', '6 أكتوبر', 'الشروق', 'مدينتي'
];

const SOURCES = [
  { id: 'instagram', label: 'انستجرام' },
  { id: 'whatsapp', label: 'واتساب' },
  { id: 'website', label: 'الموقع الإلكتروني' },
  { id: 'walkin', label: 'زيارة مباشرة (Walk-in)' },
  { id: 'referral', label: 'ترشيح من عميلة أخرى' },
];

const getSourceLabel = (src) => {
  if (!src) return '—';
  if (src === 'instagram' || src === 'انستجرام' || src === 'انستقرام') return 'انستجرام';
  const found = SOURCES.find(s => s.id === src);
  return found ? found.label : src;
};

function getPageNumbers(current, last) {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (current < last - 2) pages.push('...');
  pages.push(last);
  return pages;
}

const STAGE_LABELS = {
  visit: { label: 'طلب زيارة', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  booking: { label: 'حجز فستان', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  fitting: { label: 'بروفة / قياس', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  picked_up: { label: 'استلام الفستان', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  returned: { label: 'مرتجع مكتمل', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export default function BridesPage() {
  const [brides, setBrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [paginationMeta, setPaginationMeta] = useState({
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
  });
  const [stats, setStats] = useState({
    total_brides: 0,
    with_wedding_date: 0,
    with_bookings: 0,
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBride, setEditingBride] = useState(null);
  const [viewingBride, setViewingBride] = useState(null);
  const [deletingBride, setDeletingBride] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dressesList, setDressesList] = useState([]);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    phone2: '',
    city: 'القاهرة',
    address: '',
    source: 'instagram',
    wedding_date: '',
    pickup_scheduled_on: '',
    return_scheduled_on: '',
    notes: '',
    dress_id: '',
    dress_2_id: '',
    dress_3_id: '',
    has_dress_2: false,
    has_dress_3: false,
    trying_fee: '',
    dress_1_search: '',
    dress_2_search: '',
    dress_3_search: '',
  });

  useEffect(() => {
    apiClient.get('/dresses?per_page=1000&with_bookings=1')
      .then((res) => {
        const list = res.data || res || [];
        setDressesList(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  const fetchBrides = async (
    page = currentPage,
    query = searchQuery,
    city = selectedCity,
    source = selectedSource,
    date = selectedDate,
    limit = perPage
  ) => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: limit,
      };
      if (query && query.trim()) params.search = query.trim();
      if (city && city !== 'all') params.city = city;
      if (source && source !== 'all') params.source = source;
      if (date) params.date = date;

      const res = await apiClient.get('/clients', { params });
      const list = Array.isArray(res) ? res : (res.data || []);
      const mapped = list.map((c) => ({
        ...c,
        current_stage: c.current_stage || c.stage || 'visit',
        wedding_date: c.wedding_date || c.bookings?.[0]?.event_date || '',
        pickup_scheduled_on: c.pickup_scheduled_on || c.bookings?.[0]?.pickup_scheduled_on || '',
        return_scheduled_on: c.return_scheduled_on || c.bookings?.[0]?.return_scheduled_on || '',
        latest_visit_date: c.latest_visit_date || c.visits?.[0]?.visit_date || '',
      }));
      setBrides(mapped);

      if (res && res.total !== undefined) {
        setPaginationMeta({
          total: Number(res.total) || 0,
          last_page: Number(res.last_page) || 1,
          from: Number(res.from) || (mapped.length > 0 ? 1 : 0),
          to: Number(res.to) || mapped.length,
        });
      } else {
        setPaginationMeta({
          total: mapped.length,
          last_page: 1,
          from: mapped.length > 0 ? 1 : 0,
          to: mapped.length,
        });
      }

      if (res && res.stats) {
        setStats(res.stats);
      }

      return mapped;
    } catch (err) {
      console.error('Failed to fetch brides:', err);
      toast.error('فشل تحميل قائمة العرائس من الخادم');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Debounced server-side search and filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchBrides(1, searchQuery, selectedCity, selectedSource, selectedDate, perPage);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCity, selectedSource, selectedDate, perPage]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > paginationMeta.last_page || newPage === currentPage) return;
    setCurrentPage(newPage);
    fetchBrides(newPage, searchQuery, selectedCity, selectedSource, selectedDate, perPage);
  };

  const handleRefresh = () => {
    fetchBrides(currentPage, searchQuery, selectedCity, selectedSource, selectedDate, perPage);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      phone2: '',
      city: 'القاهرة',
      address: '',
      source: 'instagram',
      wedding_date: '',
      pickup_scheduled_on: '',
      return_scheduled_on: '',
      notes: '',
      dress_id: '',
      dress_2_id: '',
      dress_3_id: '',
      has_dress_2: false,
      has_dress_3: false,
      trying_fee: '',
      dress_1_search: '',
      dress_2_search: '',
      dress_3_search: '',
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (bride) => {
    setEditingBride(bride);
    const b = bride.bookings?.[0];
    const d1 = b?.dress_id ? String(b.dress_id) : '';
    const d2 = b?.dress_2_id ? String(b.dress_2_id) : '';
    const d3 = b?.dress_3_id ? String(b.dress_3_id) : '';
    const tf = (bride.latest_dress_trying_fee !== undefined && bride.latest_dress_trying_fee > 0)
      ? String(bride.latest_dress_trying_fee)
      : (b?.dress?.trying_fee ? String(b.dress.trying_fee) : '');

    const wDate = bride.wedding_date ? String(bride.wedding_date).substring(0, 10) : '';
    const clientCity = bride.city || bride.address || 'القاهرة';

    let initialPickup = (bride.pickup_scheduled_on || b?.pickup_scheduled_on)
      ? String(bride.pickup_scheduled_on || b?.pickup_scheduled_on).substring(0, 10)
      : '';
    let initialReturn = (bride.return_scheduled_on || b?.return_scheduled_on)
      ? String(bride.return_scheduled_on || b?.return_scheduled_on).substring(0, 10)
      : '';

    if (wDate && (!initialPickup || !initialReturn)) {
      const { pickupDate, returnDate } = calculateScheduledDates(wDate, clientCity);
      if (!initialPickup) initialPickup = pickupDate;
      if (!initialReturn) initialReturn = returnDate;
    }

    setFormData({
      name: bride.name || '',
      phone: bride.phone || '',
      phone2: bride.phone2 || '',
      city: clientCity,
      address: bride.address || '',
      source: bride.source || 'instagram',
      wedding_date: wDate,
      pickup_scheduled_on: initialPickup,
      return_scheduled_on: initialReturn,
      notes: bride.notes || '',
      dress_id: d1,
      dress_2_id: d2,
      dress_3_id: d3,
      has_dress_2: Boolean(d2),
      has_dress_3: Boolean(d3),
      trying_fee: tf,
      dress_1_search: '',
      dress_2_search: '',
      dress_3_search: '',
    });
  };

  const handleWeddingDateChange = (newDate) => {
    const { pickupDate, returnDate } = calculateScheduledDates(newDate, formData.city);
    setFormData(prev => ({
      ...prev,
      wedding_date: newDate,
      pickup_scheduled_on: pickupDate || '',
      return_scheduled_on: returnDate || '',
    }));
  };

  const handleCityChange = (newCity) => {
    setFormData(prev => {
      let nextPickup = prev.pickup_scheduled_on;
      let nextReturn = prev.return_scheduled_on;
      if (prev.wedding_date) {
        const { pickupDate, returnDate } = calculateScheduledDates(prev.wedding_date, newCity);
        nextPickup = pickupDate || '';
        nextReturn = returnDate || '';
      }
      return {
        ...prev,
        city: newCity,
        pickup_scheduled_on: nextPickup,
        return_scheduled_on: nextReturn,
      };
    });
  };

  const calculateBrideTryingFee = (d1Id, d2Id, d3Id, hasD2, hasD3) => {
    let total = 0;
    const d1 = dressesList.find(d => String(d.id) === String(d1Id));
    if (d1 && d1.trying_fee) total += parseFloat(d1.trying_fee);

    if (hasD2 && d2Id) {
      const d2 = dressesList.find(d => String(d.id) === String(d2Id));
      if (d2 && d2.trying_fee) total += parseFloat(d2.trying_fee);
    }

    if (hasD3 && d3Id) {
      const d3 = dressesList.find(d => String(d.id) === String(d3Id));
      if (d3 && d3.trying_fee) total += parseFloat(d3.trying_fee);
    }

    return total;
  };

  const handleSelectBrideDress1 = (dress) => {
    const dId = String(dress.id);
    const fee = calculateBrideTryingFee(dId, formData.dress_2_id, formData.dress_3_id, formData.has_dress_2, formData.has_dress_3);
    setFormData(prev => ({
      ...prev,
      dress_id: dId,
      trying_fee: fee > 0 ? String(fee) : prev.trying_fee,
    }));
  };

  const handleSelectBrideDress2 = (dress) => {
    const dId = String(dress.id);
    const fee = calculateBrideTryingFee(formData.dress_id, dId, formData.dress_3_id, true, formData.has_dress_3);
    setFormData(prev => ({
      ...prev,
      dress_2_id: dId,
      trying_fee: fee > 0 ? String(fee) : prev.trying_fee,
    }));
  };

  const handleSelectBrideDress3 = (dress) => {
    const dId = String(dress.id);
    const fee = calculateBrideTryingFee(formData.dress_id, formData.dress_2_id, dId, formData.has_dress_2, true);
    setFormData(prev => ({
      ...prev,
      dress_3_id: dId,
      trying_fee: fee > 0 ? String(fee) : prev.trying_fee,
    }));
  };

  // Conflict helpers in BridesPage
  const brideDress1Obj = dressesList.find(d => String(d.id) === String(formData.dress_id));
  const brideDress2Obj = (formData.has_dress_2 && formData.dress_2_id) ? dressesList.find(d => String(d.id) === String(formData.dress_2_id)) : null;
  const brideDress3Obj = (formData.has_dress_3 && formData.dress_3_id) ? dressesList.find(d => String(d.id) === String(formData.dress_3_id)) : null;

  const brideDress1Conflict = React.useMemo(() => {
    return getDressConflict(brideDress1Obj, formData.wedding_date, editingBride?.id, formData.city);
  }, [brideDress1Obj, formData.wedding_date, editingBride?.id, formData.city]);

  const brideDress2Conflict = React.useMemo(() => {
    return getDressConflict(brideDress2Obj, formData.wedding_date, editingBride?.id, formData.city);
  }, [brideDress2Obj, formData.wedding_date, editingBride?.id, formData.city]);

  const brideDress3Conflict = React.useMemo(() => {
    return getDressConflict(brideDress3Obj, formData.wedding_date, editingBride?.id, formData.city);
  }, [brideDress3Obj, formData.wedding_date, editingBride?.id, formData.city]);

  const handleSaveBride = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم العروس');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        phone2: formData.phone2.trim() || null,
        city: formData.city,
        address: formData.address.trim() || null,
        source: formData.source,
        wedding_date: formData.wedding_date || null,
        pickup_scheduled_on: formData.pickup_scheduled_on || null,
        return_scheduled_on: formData.return_scheduled_on || null,
        notes: formData.notes.trim() || null,
        dress_id: formData.dress_id ? parseInt(formData.dress_id) : null,
        dress_2_id: (formData.has_dress_2 && formData.dress_2_id) ? parseInt(formData.dress_2_id) : null,
        dress_3_id: (formData.has_dress_3 && formData.dress_3_id) ? parseInt(formData.dress_3_id) : null,
        trying_fee: formData.trying_fee ? parseFloat(formData.trying_fee) : 0,
      };

      if (editingBride) {
        // Update existing bride
        await apiClient.put(`/clients/${editingBride.id}`, payload);
        toast.success(`تم تحديث بيانات العروس (${formData.name}) بنجاح ✨`);
        setEditingBride(null);
      } else {
        // Add new bride
        await apiClient.post('/clients', payload);
        toast.success(`تمت إضافة العروس (${formData.name}) بنجاح ✨`);
        setIsAddModalOpen(false);
      }
      resetForm();
      await fetchBrides(currentPage, searchQuery, selectedCity, selectedSource, selectedDate, perPage);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'حدث خطأ أثناء حفظ بيانات العروس');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBride = async () => {
    if (!deletingBride) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/clients/${deletingBride.id}`);
      toast.success(`تم حذف العروس (${deletingBride.name}) بنجاح`);
      setDeletingBride(null);
      await fetchBrides(currentPage, searchQuery, selectedCity, selectedSource, selectedDate, perPage);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'فشل حذف العروس');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActiveFilters = Boolean(searchQuery || selectedCity !== 'all' || selectedSource !== 'all' || selectedDate);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 text-right animate-fade-in" dir="rtl">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Users size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              إدارة العرائس
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-bold mt-1">
            سجل بيانات العرائس والبحث في كامل قاعدة البيانات مع التصفية وتحديد الصفحات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
            title="تحديث البيانات"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-600' : ''} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-2"
          >
            <UserPlus size={15} />
            <span>إضافة عروس جديدة</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-150 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 block">إجمالي العرائس</span>
          <span className="text-lg sm:text-xl font-black text-slate-800 font-mono">
            {stats.total_brides || paginationMeta.total}
          </span>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 block">عرائس بموعد مناسبة</span>
          <span className="text-lg sm:text-xl font-black text-indigo-600 font-mono">
            {stats.with_wedding_date}
          </span>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 block">تم حجز فستان</span>
          <span className="text-lg sm:text-xl font-black text-amber-600 font-mono">
            {stats.with_bookings}
          </span>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 block">نتائج البحث الحالية</span>
          <span className="text-lg sm:text-xl font-black text-slate-700 font-mono">
            {paginationMeta.total}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3.5 shadow-2xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في كامل قاعدة البيانات بالاسم، الهاتف، المدينة..."
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <Calendar size={14} className="text-slate-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 leading-none">تاريخ الاستلام</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pt-0.5"
                title="تصفية بحسب تاريخ استلام الفستان"
              />
            </div>
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="مسح تصفية التاريخ"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* City Filter */}
          <div className="w-36 sm:w-40">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">جميع المدن والمناطق</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="w-32 sm:w-36">
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">جميع المصادر</option>
              {SOURCES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCity('all');
                setSelectedSource('all');
                setSelectedDate('');
              }}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title="إلغاء كافة الفلاتر"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">مسح الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
        {loading && brides.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold flex flex-col items-center justify-center gap-2">
            <RefreshCw size={24} className="animate-spin text-indigo-600" />
            <span>جاري تحميل بيانات العرائس من قاعدة البيانات...</span>
          </div>
        ) : brides.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold space-y-2">
            <p>لا توجد عرائس مطابقة لمعايير البحث في قاعدة البيانات.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCity('all');
                  setSelectedSource('all');
                  setSelectedDate('');
                }}
                className="text-indigo-600 hover:underline font-bold text-xs cursor-pointer"
              >
                مسح معايير البحث والتصفية
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-150 text-[11px] font-extrabold text-slate-400">
                    <th className="p-3.5">العروس</th>
                    <th className="p-3.5">الاتصال</th>
                    <th className="p-3.5">المدينة</th>
                    <th className="p-3.5">تاريخ المناسبة</th>
                    <th className="p-3.5">المرحلة الحالية</th>
                    <th className="p-3.5">المصدر</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brides.map((b) => {
                    const stageInfo = STAGE_LABELS[b.current_stage] || STAGE_LABELS.visit;
                    return (
                      <tr key={b.id} className="hover:bg-indigo-50/20 transition-colors group">
                        {/* Name & Initials */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-extrabold text-xs flex-shrink-0">
                              {b.name?.substring(0, 2) || 'BB'}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-800 block text-xs group-hover:text-indigo-600 transition-colors">
                                {b.name}
                              </span>
                              {b.notes && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[160px] block" title={b.notes}>
                                  {b.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Phone & WhatsApp */}
                        <td className="p-3.5 font-mono font-bold text-slate-600">
                          <div className="flex items-center gap-2">
                            <span>{b.phone || '—'}</span>
                            {b.phone && (
                              <a
                                href={`https://wa.me/${formatWhatsAppNumber(b.phone)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-500 hover:text-emerald-600 p-1 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="محادثة واتساب سريعة"
                              >
                                <MessageCircle size={14} />
                              </a>
                            )}
                          </div>
                          {b.phone2 && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              بديل: {b.phone2}
                            </div>
                          )}
                        </td>

                        {/* City */}
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            <MapPin size={10} className="text-slate-400" />
                            <span>{b.city || '—'}</span>
                          </span>
                        </td>

                        {/* Wedding Date */}
                        <td className="p-3.5 font-mono font-bold text-slate-600">
                          {cleanDate(b.wedding_date) ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-150">
                              <Calendar size={10} className="text-indigo-500" />
                              <span>{cleanDate(b.wedding_date)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px]">غير محدد</span>
                          )}
                        </td>

                        {/* Stage Badge (Informational) */}
                        <td className="p-3.5">
                          <span className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-black border ${stageInfo.color}`}>
                            {stageInfo.label}
                          </span>
                        </td>

                        {/* Source */}
                        <td className="p-3.5 text-[11px] text-slate-500 font-bold">
                          {getSourceLabel(b.source)}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingBride(b)}
                              className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer"
                              title="عرض تفاصيل العروس"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(b)}
                              className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
                              title="تعديل بيانات العروس"
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingBride(b)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                              title="حذف العروس"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Cards (No horizontal scrollbar) */}
            <div className="md:hidden divide-y divide-slate-100">
              {brides.map((b) => {
                const stageInfo = STAGE_LABELS[b.current_stage] || STAGE_LABELS.visit;
                return (
                  <div key={b.id} className="p-4 space-y-3">
                    {/* Header: Avatar, Name, Stage */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black text-xs flex-shrink-0">
                          {b.name?.substring(0, 2) || 'BB'}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-sm leading-tight">{b.name}</h4>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-1">
                            <MapPin size={11} className="text-slate-400" />
                            <span>{b.city || '—'}</span>
                            <span className="mx-1">•</span>
                            <span>{getSourceLabel(b.source)}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[9.5px] font-black border flex-shrink-0 ${stageInfo.color}`}>
                        {stageInfo.label}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50/80 rounded-2xl p-3 border border-slate-150 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">رقم الهاتف:</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-700">
                          <span>{b.phone || '—'}</span>
                          {b.phone && (
                            <a
                              href={`https://wa.me/${formatWhatsAppNumber(b.phone)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-500 hover:text-emerald-600 p-0.5"
                              title="واتساب"
                            >
                              <MessageCircle size={13} />
                            </a>
                          )}
                        </div>
                        {b.phone2 && (
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">بديل: {b.phone2}</span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">تاريخ المناسبة:</span>
                        {cleanDate(b.wedding_date) ? (
                          <span className="inline-flex items-center gap-1 font-mono font-black text-indigo-700">
                            <Calendar size={11} className="text-indigo-500" />
                            <span>{cleanDate(b.wedding_date)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">غير محدد</span>
                        )}
                      </div>

                      {b.notes && (
                        <div className="col-span-2 pt-1 border-t border-slate-200/60 text-[11px] text-slate-600">
                          <span className="font-bold text-slate-400">ملاحظات: </span>
                          <span>{b.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setViewingBride(b)}
                        className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={14} />
                        <span>عرض التفاصيل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(b)}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit3 size={14} />
                        <span>تعديل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingBride(b)}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={14} />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Bar */}
            {paginationMeta.total > 0 && (
              <div className="p-3 sm:p-4 border-t border-slate-150 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                {/* Info & Per Page */}
                <div className="flex flex-wrap items-center justify-between w-full sm:w-auto gap-2 text-slate-500 font-bold">
                  <span>
                    عرض <strong className="text-slate-800 font-black">{paginationMeta.from}</strong> إلى <strong className="text-slate-800 font-black">{paginationMeta.to}</strong> من إجمالي <strong className="text-indigo-600 font-black">{paginationMeta.total}</strong> عروس
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">لكل صفحة:</span>
                    <select
                      value={perPage}
                      onChange={(e) => {
                        const newLimit = Number(e.target.value);
                        setPerPage(newLimit);
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Page Navigation Buttons */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    className="px-2.5 sm:px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <ChevronRight size={14} />
                    <span>السابق</span>
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers(currentPage, paginationMeta.last_page).map((p, idx) => {
                      if (p === '...') {
                        return <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-black">...</span>;
                      }
                      const isActive = p === currentPage;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePageChange(p)}
                          disabled={loading}
                          className={`min-w-[30px] sm:min-w-[32px] h-8 px-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center flex-shrink-0 ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= paginationMeta.last_page || loading}
                    className="px-2.5 sm:px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span>التالي</span>
                    <ChevronLeft size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: ADD OR EDIT BRIDE */}
      {(isAddModalOpen || editingBride) && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" 
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAddModalOpen(false);
              setEditingBride(null);
            }
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-150 shadow-[0_25px_60px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col my-auto animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  {editingBride ? <Edit3 size={15} /> : <UserPlus size={15} />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    {editingBride ? `تعديل بيانات العروس (${editingBride.name})` : 'إضافة عروس جديدة'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400">
                    {editingBride ? 'تعديل البيانات الشخصية والتواصل' : 'تسجيل عروس جديدة بالنظام'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsAddModalOpen(false); setEditingBride(null); }}
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBride} className="p-4 sm:p-5 space-y-3.5 max-h-[82vh] overflow-y-auto scrollbar-thin">
              {/* Name */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                  اسم العروس <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="الاسم الكامل للعروس..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Phone 1 & Phone 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                    رقم الهاتف الأساسي
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                    رقم هاتف إضافي (بديل)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone2}
                    onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* City & Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                    المدينة / المنطقة
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                    المصدر
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    {SOURCES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Wedding Date & Trying Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                    تاريخ المناسبة / الزفاف
                  </label>
                  <input
                    type="date"
                    value={formData.wedding_date}
                    onChange={(e) => handleWeddingDateChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                    رسوم قياس الفساتين (إن وجدت)
                  </label>
                  <input
                    type="number"
                    value={formData.trying_fee}
                    onChange={(e) => setFormData({ ...formData, trying_fee: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Scheduled Pickup and Return Dates (Auto calculated from Wedding Date, but Editable) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/40 border border-indigo-100 rounded-2xl">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-extrabold text-indigo-950 flex items-center gap-1.5">
                      <Package size={13} className="text-indigo-600" />
                      <span>تاريخ استلام الفستان (Pickup)</span>
                    </label>
                    <span className="text-[9.5px] font-bold text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                      {formData.wedding_date ? (['القاهرة', 'الجيزة', 'مدينة نصر', 'مصر الجديدة', 'المعادي', 'التجمع الأول', 'التجمع الخامس', 'الشيخ زايد', '6 أكتوبر', 'الشروق', 'مدينتي'].some(c => (formData.city || '').includes(c)) ? 'قبل الفرح بيوم' : 'قبل الفرح بيومين') : 'تلقائي'}
                    </span>
                  </div>
                  <input
                    type="date"
                    value={formData.pickup_scheduled_on}
                    onChange={(e) => setFormData({ ...formData, pickup_scheduled_on: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm"
                  />
                  <p className="text-[9px] text-indigo-700/70 mt-1 font-medium">
                    محسوب تلقائياً حسب المحافظة وموعد الفرح (قابل للتعديل)
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-extrabold text-indigo-950 flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-600" />
                      <span>تاريخ إرجاع الفستان (Return)</span>
                    </label>
                    <span className="text-[9.5px] font-bold text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                      {formData.wedding_date ? 'بعد الفرح بيوم' : 'تلقائي'}
                    </span>
                  </div>
                  <input
                    type="date"
                    value={formData.return_scheduled_on}
                    onChange={(e) => setFormData({ ...formData, return_scheduled_on: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm"
                  />
                  <p className="text-[9px] text-indigo-700/70 mt-1 font-medium">
                    محسوب تلقائياً بعد الفرح بيوم واحد (قابل للتعديل)
                  </p>
                </div>
              </div>

              {/* Interested Dresses Section (Up to 3 Dresses) */}
              <div className="bg-rose-50/30 p-3 rounded-2xl border border-rose-100 space-y-3">
                <div className="flex items-center justify-between border-b border-rose-100/60 pb-2">
                  <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                    <span>👗 الفساتين المطلوب قياسها / تجربتها (حتى 3 فساتين)</span>
                  </span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-100/60 px-2 py-0.5 rounded-full">
                    {(formData.dress_id ? 1 : 0) + (formData.has_dress_2 && formData.dress_2_id ? 1 : 0) + (formData.has_dress_3 && formData.dress_3_id ? 1 : 0)} / 3 فساتين
                  </span>
                </div>

                {/* Dress 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-extrabold text-slate-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>فستان التجربة 1</span>
                      <span className="text-[9px] text-slate-400 font-normal">(اختياري)</span>
                    </label>
                    {formData.dress_id && (
                      <button
                        type="button"
                        onClick={() => {
                          const fee = calculateBrideTryingFee('', formData.dress_2_id, formData.dress_3_id, formData.has_dress_2, formData.has_dress_3);
                          setFormData(prev => ({ ...prev, dress_id: '', trying_fee: fee > 0 ? String(fee) : prev.trying_fee }));
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <X size={10} /> إلغاء الاختيار
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 بحث عن الفستان بالاسم أو الكود..."
                      value={formData.dress_1_search}
                      onChange={(e) => setFormData({ ...formData, dress_1_search: e.target.value })}
                      className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-right"
                    />
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-100 max-h-24 overflow-y-auto scrollbar-thin">
                    {dressesList
                      .filter((d) => {
                        if (!formData.dress_1_search.trim()) return true;
                        const q = formData.dress_1_search.toLowerCase().trim();
                        return d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q);
                      })
                      .map((d) => {
                        const isSelected = formData.dress_id === String(d.id);
                        const conflict = formData.wedding_date ? getDressConflict(d, formData.wedding_date, editingBride?.id, formData.city) : null;
                        const isBlocked = Boolean(conflict);

                        return (
                          <button
                            type="button"
                            key={d.id}
                            onClick={() => handleSelectBrideDress1(d)}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-rose-600 border-rose-600 text-white shadow-xs font-black'
                                : isBlocked
                                  ? 'bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100/80'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-rose-50'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isBlocked ? (isSelected ? 'bg-white' : 'bg-rose-500 animate-pulse') : (isSelected ? 'bg-white' : 'bg-emerald-500')}`} />
                            <span>{d.name} {d.code ? `(${d.code})` : ''}</span>
                          </button>
                        );
                      })}
                  </div>

                  {brideDress1Obj && (
                    <div className="text-[10px] font-extrabold text-rose-700 bg-rose-50/70 border border-rose-100 px-2.5 py-1 rounded-lg flex items-center justify-between">
                      <span>الفستان 1: <strong className="font-black">{brideDress1Obj.name}</strong></span>
                      <span className="font-mono text-[9.5px] text-rose-800">
                        رسوم التجربة: {parseFloat(brideDress1Obj.trying_fee || 0) > 0 ? `${parseFloat(brideDress1Obj.trying_fee).toLocaleString()} ج.م` : 'مجانية'}
                      </span>
                    </div>
                  )}

                  {brideDress1Conflict && (
                    <div className="p-2 bg-rose-50/90 border border-rose-300 rounded-xl text-right text-xs space-y-0.5">
                      <div className="text-[10.5px] font-black text-rose-800 flex items-center gap-1">
                        <AlertTriangle size={12} className="text-rose-600 animate-bounce" />
                        تعارض في الفستان 1: محجوز للعروس {brideDress1Conflict.clientName}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        فترة الحظر: من {brideDress1Conflict.startDate} إلى {brideDress1Conflict.endDate}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dress 2 */}
                {!formData.has_dress_2 ? (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, has_dress_2: true }))}
                    className="w-full py-1.5 border border-dashed border-purple-300 text-purple-700 hover:bg-purple-50/50 rounded-xl text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>+ إضافة فستان ثانٍ للتجربة</span>
                  </button>
                ) : (
                  <div className="bg-purple-50/30 p-2.5 rounded-xl border border-purple-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10.5px] font-extrabold text-purple-900 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        <span>فستان التجربة 2</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const fee = calculateBrideTryingFee(formData.dress_id, '', formData.dress_3_id, false, formData.has_dress_3);
                          setFormData(prev => ({ ...prev, has_dress_2: false, dress_2_id: '', trying_fee: fee > 0 ? String(fee) : prev.trying_fee }));
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <X size={10} /> حذف الفستان 2
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="🔍 بحث عن الفستان الثاني..."
                        value={formData.dress_2_search}
                        onChange={(e) => setFormData({ ...formData, dress_2_search: e.target.value })}
                        className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-right"
                      />
                      <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    </div>

                    <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-100 max-h-24 overflow-y-auto scrollbar-thin">
                      {dressesList
                        .filter((d) => {
                          if (!formData.dress_2_search.trim()) return true;
                          const q = formData.dress_2_search.toLowerCase().trim();
                          return d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q);
                        })
                        .map((d) => {
                          const isSelected = formData.dress_2_id === String(d.id);
                          const conflict = formData.wedding_date ? getDressConflict(d, formData.wedding_date, editingBride?.id, formData.city) : null;
                          const isBlocked = Boolean(conflict);

                          return (
                            <button
                              type="button"
                              key={d.id}
                              onClick={() => handleSelectBrideDress2(d)}
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-purple-600 border-purple-600 text-white shadow-xs font-black'
                                  : isBlocked
                                    ? 'bg-purple-50/70 border-purple-200 text-purple-800 hover:bg-purple-100/80'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-purple-50'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isBlocked ? (isSelected ? 'bg-white' : 'bg-rose-500 animate-pulse') : (isSelected ? 'bg-white' : 'bg-emerald-500')}`} />
                              <span>{d.name} {d.code ? `(${d.code})` : ''}</span>
                            </button>
                          );
                        })}
                    </div>

                    {brideDress2Obj && (
                      <div className="text-[10px] font-extrabold text-purple-700 bg-purple-50/70 border border-purple-100 px-2.5 py-1 rounded-lg flex items-center justify-between">
                        <span>الفستان 2: <strong className="font-black">{brideDress2Obj.name}</strong></span>
                        <span className="font-mono text-[9.5px] text-purple-800">
                          رسوم التجربة: {parseFloat(brideDress2Obj.trying_fee || 0) > 0 ? `${parseFloat(brideDress2Obj.trying_fee).toLocaleString()} ج.م` : 'مجانية'}
                        </span>
                      </div>
                    )}

                    {brideDress2Conflict && (
                      <div className="p-2 bg-rose-50/90 border border-rose-300 rounded-xl text-right text-xs space-y-0.5">
                        <div className="text-[10.5px] font-black text-rose-800 flex items-center gap-1">
                          <AlertTriangle size={12} className="text-rose-600 animate-bounce" />
                          تعارض في الفستان 2: محجوز للعروس {brideDress2Conflict.clientName}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          فترة الحظر: من {brideDress2Conflict.startDate} إلى {brideDress2Conflict.endDate}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Dress 3 */}
                {formData.has_dress_2 && (
                  !formData.has_dress_3 ? (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, has_dress_3: true }))}
                      className="w-full py-1.5 border border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50/50 rounded-xl text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>+ إضافة فستان ثالث للتجربة (الحد الأقصى 3)</span>
                    </button>
                  ) : (
                    <div className="bg-indigo-50/30 p-2.5 rounded-xl border border-indigo-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10.5px] font-extrabold text-indigo-900 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span>فستان التجربة 3</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const fee = calculateBrideTryingFee(formData.dress_id, formData.dress_2_id, '', formData.has_dress_2, false);
                            setFormData(prev => ({ ...prev, has_dress_3: false, dress_3_id: '', trying_fee: fee > 0 ? String(fee) : prev.trying_fee }));
                          }}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <X size={10} /> حذف الفستان 3
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          placeholder="🔍 بحث عن الفستان الثالث..."
                          value={formData.dress_3_search}
                          onChange={(e) => setFormData({ ...formData, dress_3_search: e.target.value })}
                          className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                        />
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      </div>

                      <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-100 max-h-24 overflow-y-auto scrollbar-thin">
                        {dressesList
                          .filter((d) => {
                            if (!formData.dress_3_search.trim()) return true;
                            const q = formData.dress_3_search.toLowerCase().trim();
                            return d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q);
                          })
                          .map((d) => {
                            const isSelected = formData.dress_3_id === String(d.id);
                            const conflict = formData.wedding_date ? getDressConflict(d, formData.wedding_date, editingBride?.id, formData.city) : null;
                            const isBlocked = Boolean(conflict);

                            return (
                              <button
                                type="button"
                                key={d.id}
                                onClick={() => handleSelectBrideDress3(d)}
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs font-black'
                                    : isBlocked
                                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-800 hover:bg-indigo-100/80'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isBlocked ? (isSelected ? 'bg-white' : 'bg-rose-500 animate-pulse') : (isSelected ? 'bg-white' : 'bg-emerald-500')}`} />
                                <span>{d.name} {d.code ? `(${d.code})` : ''}</span>
                              </button>
                            );
                          })}
                      </div>

                      {brideDress3Obj && (
                        <div className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50/70 border border-indigo-100 px-2.5 py-1 rounded-lg flex items-center justify-between">
                          <span>الفستان 3: <strong className="font-black">{brideDress3Obj.name}</strong></span>
                          <span className="font-mono text-[9.5px] text-indigo-800">
                            رسوم التجربة: {parseFloat(brideDress3Obj.trying_fee || 0) > 0 ? `${parseFloat(brideDress3Obj.trying_fee).toLocaleString()} ج.م` : 'مجانية'}
                          </span>
                        </div>
                      )}

                      {brideDress3Conflict && (
                        <div className="p-2 bg-rose-50/90 border border-rose-300 rounded-xl text-right text-xs space-y-0.5">
                          <div className="text-[10.5px] font-black text-rose-800 flex items-center gap-1">
                            <AlertTriangle size={12} className="text-rose-600 animate-bounce" />
                            تعارض في الفستان 3: محجوز للعروس {brideDress3Conflict.clientName}
                          </div>
                          <div className="text-[10px] text-slate-600">
                            فترة الحظر: من {brideDress3Conflict.startDate} إلى {brideDress3Conflict.endDate}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                  ملاحظات
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أي ملاحظات خاصة بالعروس أو الموديلات المفضلة..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-150 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingBride(null); }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>جاري الحفظ...</span>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>{editingBride ? 'حفظ التعديلات' : 'إضافة العروس'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: VIEW DETAILS */}
      {viewingBride && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" 
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewingBride(null);
            }
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-150 shadow-[0_25px_60px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col my-auto animate-in fade-in duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black text-sm">
                  {viewingBride.name?.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">{viewingBride.name}</h3>
                  <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black border mt-0.5 ${STAGE_LABELS[viewingBride.current_stage]?.color || 'bg-slate-100'}`}>
                    {STAGE_LABELS[viewingBride.current_stage]?.label || 'زيارة'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingBride(null)}
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Details Content */}
            <div className="p-4 sm:p-5 space-y-3 text-xs">
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-400 font-bold">الهاتف:</span>
                  <div className="flex items-center gap-2 font-mono font-black text-slate-800">
                    <span>{viewingBride.phone || '—'}</span>
                    {viewingBride.phone && (
                      <a
                        href={`https://wa.me/${formatWhatsAppNumber(viewingBride.phone)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-500 hover:text-emerald-600"
                        title="محادثة واتساب"
                      >
                        <MessageCircle size={15} />
                      </a>
                    )}
                  </div>
                </div>

                {viewingBride.phone2 && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold">هاتف بديل:</span>
                    <span className="font-mono font-bold text-slate-700">{viewingBride.phone2}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-400 font-bold">المدينة / المحافظة:</span>
                  <span className="font-bold text-slate-800">{viewingBride.city || '—'}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-400 font-bold">تاريخ المناسبة:</span>
                  <span className="font-mono font-extrabold text-indigo-700">
                    {cleanDate(viewingBride.wedding_date) || 'غير محدد'}
                  </span>
                </div>

                {(viewingBride.pickup_scheduled_on || viewingBride.bookings?.[0]?.pickup_scheduled_on) && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold flex items-center gap-1">
                      <Package size={12} className="text-indigo-600" />
                      <span>تاريخ الاستلام المجدول:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      {cleanDate(viewingBride.pickup_scheduled_on || viewingBride.bookings?.[0]?.pickup_scheduled_on)}
                    </span>
                  </div>
                )}

                {(viewingBride.return_scheduled_on || viewingBride.bookings?.[0]?.return_scheduled_on) && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-bold flex items-center gap-1">
                      <Clock size={12} className="text-indigo-600" />
                      <span>تاريخ الإرجاع المجدول:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      {cleanDate(viewingBride.return_scheduled_on || viewingBride.bookings?.[0]?.return_scheduled_on)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-400 font-bold">المصدر:</span>
                  <span className="font-bold text-slate-700">
                    {getSourceLabel(viewingBride.source)}
                  </span>
                </div>

                {viewingBride.notes && (
                  <div className="pt-1">
                    <span className="text-slate-400 font-bold block mb-1">الملاحظات:</span>
                    <p className="text-slate-700 font-semibold bg-white p-2.5 rounded-xl border border-slate-100">
                      {viewingBride.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const b = viewingBride;
                    setViewingBride(null);
                    handleOpenEdit(b);
                  }}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-black text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 size={14} />
                  <span>تعديل البيانات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingBride(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {deletingBride && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" 
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setDeletingBride(null);
            }
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-150 shadow-2xl p-5 space-y-4 my-auto animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-slate-800">
                تأكيد حذف العروس
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                هل أنت متأكد من رغبتك في حذف العروس <strong className="text-slate-800 font-black">{deletingBride.name}</strong>؟
              </p>
              <p className="text-[10px] text-rose-500 font-bold">
                سيتم حذف كافة الحجوزات والزيارات المرتبطة بهذا السجل.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBride(null)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteBride}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm text-center"
              >
                {isSubmitting ? 'جاري الحذف...' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}