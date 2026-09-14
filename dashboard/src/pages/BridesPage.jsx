import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, UserPlus, Search, Phone, MapPin, Calendar, 
  Eye, Edit3, Trash2, X, Check, MessageCircle, 
  Sparkles, Filter, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, RotateCcw
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { formatWhatsAppNumber } from '@/lib/whatsapp';
import { cleanDate } from '@/lib/utils';

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

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    phone2: '',
    city: 'القاهرة',
    address: '',
    source: 'instagram',
    wedding_date: '',
    notes: '',
  });

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
      notes: '',
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (bride) => {
    setEditingBride(bride);
    setFormData({
      name: bride.name || '',
      phone: bride.phone || '',
      phone2: bride.phone2 || '',
      city: bride.city || bride.address || 'القاهرة',
      address: bride.address || '',
      source: bride.source || 'instagram',
      wedding_date: bride.wedding_date ? String(bride.wedding_date).substring(0, 10) : '',
      notes: bride.notes || '',
    });
  };

  const handleSaveBride = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم العروس');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBride) {
        // Update existing bride
        await apiClient.put(`/clients/${editingBride.id}`, {
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          phone2: formData.phone2.trim() || null,
          city: formData.city,
          address: formData.address.trim() || null,
          source: formData.source,
          wedding_date: formData.wedding_date || null,
          notes: formData.notes.trim() || null,
        });
        toast.success(`تم تحديث بيانات العروس (${formData.name}) بنجاح ✨`);
        setEditingBride(null);
      } else {
        // Add new bride
        await apiClient.post('/clients', {
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          phone2: formData.phone2.trim() || null,
          city: formData.city,
          address: formData.address.trim() || null,
          source: formData.source,
          wedding_date: formData.wedding_date || null,
          notes: formData.notes.trim() || null,
        });
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
              <span className="text-[9px] font-black text-slate-400 leading-none">موعد المناسبة</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pt-0.5"
                title="تصفية بحسب موعد المناسبة في قاعدة البيانات"
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
            <form onSubmit={handleSaveBride} className="p-4 sm:p-5 space-y-3.5">
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
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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

              {/* Wedding Date */}
              <div>
                <label className="text-[11px] font-extrabold text-slate-700 block mb-1">
                  تاريخ المناسبة / الزفاف
                </label>
                <input
                  type="date"
                  value={formData.wedding_date}
                  onChange={(e) => setFormData({ ...formData, wedding_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                />
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