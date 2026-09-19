import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Sparkles, LayoutGrid, Search, TrendingUp, TrendingDown, DollarSign, 
  Tag, CheckCircle2, ChevronRight, ChevronLeft, Calendar, RotateCcw, X, Filter, Loader2 
} from 'lucide-react';
import { apiClient, getStorageUrl } from '@/lib/api-client';

// Dresses Report Component with 100% Backend-Calculated Metrics (View-Only)
export function DressesReport() {
  const [reportData, setReportData] = useState({
    status_counts: { ready: 0, booked: 0, out: 0, cleaning: 0 },
    total_dresses: 0,
    total_bookings: 0,
    total_revenue: 0,
    total_tried: 0,
    dresses: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('top'); // 'top' | 'all' | 'idle'
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // Date Filter States
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'this_month' | 'last_month' | 'last_30_days' | 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Handle Date Preset Selection
  const handleSelectPreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'this_month') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      setFromDate(`${y}-${m}-01`);
      setToDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prev.getFullYear();
      const m = String(prev.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, prev.getMonth() + 1, 0).getDate();
      setFromDate(`${y}-${m}-01`);
      setToDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_30_days') {
      const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      setFromDate(past30.toISOString().split('T')[0]);
      setToDate(now.toISOString().split('T')[0]);
    }
  };

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, viewMode, fromDate, toDate, perPage]);

  // Fetch Report Data from Backend (100% Backend Calculation)
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (viewMode) params.sort = viewMode;

      const res = await apiClient.get('/reports/dresses', { params });
      setReportData(res || {
        status_counts: { ready: 0, booked: 0, out: 0, cleaning: 0 },
        total_dresses: 0,
        total_bookings: 0,
        total_revenue: 0,
        total_tried: 0,
        dresses: [],
      });
    } catch (err) {
      console.error('Failed to load dress report data:', err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, searchQuery, viewMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReport();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchReport]);

  const dressesList = reportData.dresses || [];
  const statusCounts = reportData.status_counts || { ready: 0, booked: 0, out: 0, cleaning: 0 };

  // Pagination computation over backend pre-calculated and pre-sorted dresses
  const totalItems = dressesList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, totalItems);
  const paginatedList = useMemo(() => {
    return dressesList.slice(startIndex, endIndex);
  }, [dressesList, startIndex, endIndex]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (validCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (validCurrentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-4 animate-fade-in text-right" dir="rtl">
      {/* Top Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-150 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <LayoutGrid size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">تقارير الفساتين</h3>
              <p className="text-[10px] font-bold text-slate-400">تحليل الفساتين الأكثر والأقل طلباً وتوزيع حالاتها</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* View Mode Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('top')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'top' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                الأعلى طلباً 🔥
              </button>
              <button
                type="button"
                onClick={() => setViewMode('idle')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'idle' ? 'bg-white text-amber-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                الأقل طلباً ❄️
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'all' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                كافة الفساتين
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:w-44">
              <input
                type="text"
                placeholder="بحث بالكود أو الاسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-7 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Date Filter Bar - 100% Backend Handled */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-2.5 flex-wrap">
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
            <span className="text-[11px] font-black text-slate-400 flex items-center gap-1 ml-1">
              <Calendar size={13} className="text-indigo-600" />
              <span>الفترة الزمنية:</span>
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset('all')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'all' && !fromDate && !toDate
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              كل الأوقات
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('this_month')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'this_month'
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('last_month')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'last_month'
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              الشهر السابق
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('last_30_days')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'last_30_days'
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              آخر 30 يوم
            </button>
          </div>

          {/* Custom Date Inputs (From / To) */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <label className="text-[11px] font-bold text-slate-400">من:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <label className="text-[11px] font-bold text-slate-400">إلى:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => handleSelectPreset('all')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all cursor-pointer"
                title="إلغاء تصفية التاريخ"
              >
                <X size={12} />
                <span>إلغاء</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchReport}
              disabled={loading}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
              title="تحديث البيانات من السيرفر"
            >
              <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Selected Filter Summary Badge */}
        {(fromDate || toDate) && (
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl px-3 py-2 flex items-center justify-between text-xs font-bold text-indigo-900 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span>
                إحصائيات الفترة من <span className="font-mono font-black">{fromDate || 'البداية'}</span> إلى <span className="font-mono font-black">{toDate || 'اليوم'}</span>:
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span>إجمالي الحجوزات: <strong className="font-mono font-black text-indigo-700">{reportData.total_bookings}</strong></span>
              <span>مرات القياس: <strong className="font-mono font-black text-slate-700">{reportData.total_tried}</strong></span>
              <span>الإيراد المحقق: <strong className="font-mono font-black text-emerald-700">{reportData.total_revenue.toLocaleString()} ج.م</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Status Distribution Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-800 block">جاهز للاستخدام</span>
            <span className="font-mono text-base font-black text-emerald-950">
              {loading ? '...' : (statusCounts.ready || 0)} فستان
            </span>
          </div>
          <span className="text-xl">✨</span>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-indigo-800 block">محجوز لمناسبات</span>
            <span className="font-mono text-base font-black text-indigo-950">
              {loading ? '...' : (statusCounts.booked || 0)} فستان
            </span>
          </div>
          <span className="text-xl">📅</span>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-blue-800 block">في حوزة العرائس (خارج)</span>
            <span className="font-mono text-base font-black text-blue-950">
              {loading ? '...' : (statusCounts.out || 0)} فستان
            </span>
          </div>
          <span className="text-xl">👗</span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-amber-800 block">دراي كلين وصيانة</span>
            <span className="font-mono text-base font-black text-amber-950">
              {loading ? '...' : (statusCounts.cleaning || 0)} فستان
            </span>
          </div>
          <span className="text-xl">🧼</span>
        </div>
      </div>

      {/* Dresses List Table & Mobile Cards (View-Only, Server Data) */}
      <div className="bg-white rounded-3xl border border-slate-150 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 font-bold text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-indigo-600" />
            <span>جاري استرداد تقارير الفساتين وحساب الإحصائيات من السيرفر...</span>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-150 text-[10.5px] font-black text-slate-500">
                    <th className="py-3 px-3">الفستان</th>
                    <th className="py-3 px-3">الكود</th>
                    <th className="py-3 px-3 text-center">مرات الحجز</th>
                    <th className="py-3 px-3 text-center">مرات القياس</th>
                    <th className="py-3 px-3 text-center">سعر الإيجار</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                    <th className="py-3 px-3 text-left">إجمالي الإيراد المحقق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {paginatedList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold text-xs">
                        لا توجد فساتين مسجلة تطابق هذه الفترة أو الفلتر
                      </td>
                    </tr>
                  ) : (
                    paginatedList.map((dress) => (
                      <tr key={dress.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-11 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                              {dress.image_path ? (
                                <img src={getStorageUrl(dress.image_path)} alt={dress.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">👗</div>
                              )}
                            </div>
                            <span className="font-black text-slate-800">{dress.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-rose-600">{dress.code}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-indigo-700">
                          {dress.times_booked}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-600">
                          {dress.times_tried}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {parseFloat(dress.rental_price || 0).toLocaleString()} ج.م
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black ${
                            dress.status === 'ready' || dress.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                            dress.status === 'out' ? 'bg-blue-50 text-blue-700' :
                            dress.status === 'cleaning' || dress.status === 'dry_clean' || dress.status === 'maintenance' ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {dress.status === 'ready' || dress.status === 'available' ? 'جاهز' :
                             dress.status === 'out' ? 'مستلم' :
                             dress.status === 'cleaning' || dress.status === 'dry_clean' ? 'دراي كلين' :
                             dress.status === 'maintenance' ? 'صيانة' : dress.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-black text-emerald-700">
                          {parseFloat(dress.total_revenue || 0).toLocaleString()} ج.م
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (displayed on mobile without horizontal scroll) */}
            <div className="block md:hidden p-3 space-y-3">
              {paginatedList.length === 0 ? (
                <div className="py-10 text-center text-slate-400 font-bold text-xs">
                  لا توجد فساتين مسجلة تطابق هذه الفترة أو الفلتر
                </div>
              ) : (
                paginatedList.map((dress) => (
                  <div
                    key={dress.id}
                    className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 space-y-2.5 shadow-2xs"
                  >
                    {/* Dress Header: Image + Name + Code + Status */}
                    <div className="flex items-center justify-between gap-2.5 border-b border-slate-200/60 pb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white flex-shrink-0 shadow-2xs">
                          {dress.image_path ? (
                            <img src={getStorageUrl(dress.image_path)} alt={dress.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">👗</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-800 text-xs sm:text-sm truncate">{dress.name}</div>
                          <span className="font-mono font-black text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100 inline-block mt-0.5">
                            {dress.code}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black flex-shrink-0 ${
                        dress.status === 'ready' || dress.status === 'available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        dress.status === 'out' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        dress.status === 'cleaning' || dress.status === 'dry_clean' || dress.status === 'maintenance' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {dress.status === 'ready' || dress.status === 'available' ? 'جاهز' :
                         dress.status === 'out' ? 'مستلم' :
                         dress.status === 'cleaning' || dress.status === 'dry_clean' ? 'دراي كلين' :
                         dress.status === 'maintenance' ? 'صيانة' : dress.status}
                      </span>
                    </div>

                    {/* Stats 4-Column Grid */}
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="bg-white border border-slate-150 rounded-xl py-1 px-1">
                        <span className="text-[9px] text-slate-400 block font-bold">مرات الحجز</span>
                        <span className="font-mono font-black text-indigo-700 text-xs">{dress.times_booked}</span>
                      </div>
                      <div className="bg-white border border-slate-150 rounded-xl py-1 px-1">
                        <span className="text-[9px] text-slate-400 block font-bold">مرات القياس</span>
                        <span className="font-mono font-black text-slate-600 text-xs">{dress.times_tried}</span>
                      </div>
                      <div className="bg-white border border-slate-150 rounded-xl py-1 px-1">
                        <span className="text-[9px] text-slate-400 block font-bold">سعر الإيجار</span>
                        <span className="font-mono font-black text-slate-700 text-[11px]">
                          {parseFloat(dress.rental_price || 0).toLocaleString()} ج.م
                        </span>
                      </div>
                      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl py-1 px-1">
                        <span className="text-[9px] text-emerald-800 block font-black">الإيراد</span>
                        <span className="font-mono font-black text-emerald-700 text-[11px]">
                          {parseFloat(dress.total_revenue || 0).toLocaleString()} ج.م
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Bar */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 bg-slate-50/70 border-t border-slate-150">
                {/* Info & Per Page selector */}
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                  <span>
                    عرض <span className="text-slate-800 font-mono font-black">{startIndex + 1}</span> - <span className="text-slate-800 font-mono font-black">{endIndex}</span> من إجمالي <span className="text-indigo-600 font-mono font-black">{totalItems}</span> فستان
                  </span>
                  <div className="flex items-center gap-1.5 mr-2">
                    <span className="text-[11px] text-slate-400">لكل صفحة:</span>
                    <select
                      value={perPage}
                      onChange={(e) => setPerPage(Number(e.target.value))}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {/* Page Navigation Buttons */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1" dir="rtl">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={validCurrentPage === 1}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="الصفحة السابقة"
                    >
                      <ChevronRight size={14} />
                      <span>السابق</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((num, idx) => {
                        if (num === '...') {
                          return (
                            <span key={`dots-${idx}`} className="px-1.5 text-xs text-slate-400 select-none">
                              ...
                            </span>
                          );
                        }
                        const isCur = num === validCurrentPage;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setCurrentPage(num)}
                            className={`w-7 h-7 rounded-xl text-xs font-mono font-black transition-all cursor-pointer flex items-center justify-center ${
                              isCur
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={validCurrentPage === totalPages}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="الصفحة التالية"
                    >
                      <span>التالي</span>
                      <ChevronLeft size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DressesReport;
