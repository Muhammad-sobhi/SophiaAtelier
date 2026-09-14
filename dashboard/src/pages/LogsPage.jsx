import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Search,
  Calendar,
  User,
  ShieldCheck,
  RefreshCw,
  Clock,
  Filter,
  ChevronRight,
  ChevronLeft,
  Info,
  CheckCircle2,
  DollarSign,
  Package,
  RotateCcw,
  LogIn,
  LogOut,
  Sparkles,
  X
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  const quickActionFilters = [
    { id: 'all', label: 'كافة الحركات' },
    { id: 'حجز', label: 'حجوزات' },
    { id: 'زيارة', label: 'زيارات' },
    { id: 'بروفة', label: 'بروفات' },
    { id: 'تسليم', label: 'تسليم للعروس' },
    { id: 'استلام', label: 'استلام الفستان' },
    { id: 'سداد', label: 'مدفوعات ومالية' },
    { id: 'دخول', label: 'دخول وخروج' },
  ];

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedAction, selectedDate, perPage]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: perPage,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (selectedAction !== 'all') {
        params.action = selectedAction;
      }

      if (selectedDate) {
        params.date = selectedDate;
      }

      const res = await apiClient.get('/activity-logs', { params });
      const items = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
      setLogs(items);
      setTotalPages(res.last_page || res.data?.last_page || 1);
      setTotalCount(res.total ?? res.data?.total ?? items.length);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, perPage, selectedAction, selectedDate, debouncedSearch]);

  // Handle Search submit immediately
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setDebouncedSearch(searchQuery);
    setPage(1);
  };

  const getActionBadgeStyle = (action = '') => {
    const act = action.toLowerCase();
    if (act.includes('حجز') || act.includes('booking')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('تسليم') || act.includes('pickup')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('استلام') || act.includes('إرجاع') || act.includes('return')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    if (act.includes('سداد') || act.includes('إيداع') || act.includes('سحب') || act.includes('مال')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (act.includes('بروفة') || act.includes('fitting')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (act.includes('دخول') || act.includes('login')) {
      return 'bg-teal-50 text-teal-700 border-teal-200';
    }
    if (act.includes('خروج') || act.includes('logout') || act.includes('حذف')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getActionIcon = (action = '') => {
    const act = action.toLowerCase();
    if (act.includes('حجز')) return <CheckCircle2 size={13} className="text-emerald-600" />;
    if (act.includes('تسليم')) return <Package size={13} className="text-blue-600" />;
    if (act.includes('استلام') || act.includes('إرجاع')) return <RotateCcw size={13} className="text-indigo-600" />;
    if (act.includes('سداد') || act.includes('إيداع') || act.includes('سحب')) return <DollarSign size={13} className="text-amber-600" />;
    if (act.includes('دخول')) return <LogIn size={13} className="text-teal-600" />;
    if (act.includes('خروج')) return <LogOut size={13} className="text-rose-600" />;
    return <Activity size={13} className="text-slate-500" />;
  };

  // Render readable summary description
  const renderSummaryText = (log) => {
    if (!log.summary) return null;
    if (typeof log.summary === 'string') {
      try {
        const parsed = JSON.parse(log.summary);
        return renderSummaryObject(parsed);
      } catch {
        return <span className="text-[11px] text-slate-500 font-medium">{log.summary}</span>;
      }
    }
    if (typeof log.summary === 'object') {
      return renderSummaryObject(log.summary);
    }
    return null;
  };

  const renderSummaryObject = (obj) => {
    if (!obj) return null;
    const parts = [];
    if (obj.bride_name) parts.push(`العروس: ${obj.bride_name}`);
    if (obj.bride_phone) parts.push(`الهاتف: ${obj.bride_phone}`);
    if (obj.amount) parts.push(`المبلغ: ${Number(obj.amount).toLocaleString()} ج.م`);
    if (obj.from && obj.to) parts.push(`من ${obj.from} إلى ${obj.to}`);
    if (obj.sales_name) parts.push(`المسؤول: ${obj.sales_name}`);
    if (obj.description) parts.push(obj.description);
    if (obj.email) parts.push(`الحساب: ${obj.email}`);

    if (parts.length === 0) {
      return <span className="text-[10.5px] text-slate-400 font-mono">{JSON.stringify(obj)}</span>;
    }

    return (
      <div className="flex flex-wrap items-center gap-1 text-[10.5px]">
        {parts.map((p, i) => (
          <span key={i} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-bold">
            {p}
          </span>
        ))}
      </div>
    );
  };

  // Pagination helper
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 animate-fade-in text-right font-sans" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-indigo-900 flex items-center justify-center text-white shadow-md shadow-slate-900/15 flex-shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800">
                سجل نشاطات النظام والرقابة الإدارية
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-black bg-rose-50 text-rose-700 rounded-full border border-rose-200">
                خاص بالمدير فقط 🔒
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              تتبع كافة العمليات وحركات الموظفين والتعديلات المنفذة في النظام بدقة
            </p>
          </div>
        </div>

        {/* Retention Policy Badge & Refresh */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold shadow-2xs">
            <Clock size={13} className="text-amber-600" />
            <span>سياسة الحفظ: <strong className="font-black">6 أشهر (180 يوماً)</strong> - حذف تلقائي دوري</span>
          </div>

          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw size={13} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-150 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 block">إجمالي السجلات المحفوظة</span>
            <span className="font-mono text-lg font-black text-slate-800">{totalCount.toLocaleString()} حركة</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Activity size={16} />
          </div>
        </div>

        <div className="bg-white border border-slate-150 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 block">الصفحة الحالية</span>
            <span className="font-mono text-lg font-black text-slate-800">
              {page} من {totalPages}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <div className="bg-white border border-slate-150 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 block">نظام الحذف الدوري</span>
            <span className="text-xs font-black text-amber-700 block mt-1">يومياً عند منتصف الليل 🕛</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={16} />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-150 shadow-2xs space-y-3">
        {/* Row 1: Search & Date */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full sm:w-80">
            <input
              type="text"
              placeholder="بحث باسم الموظف، نوع الحركة، أو التفاصيل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
            />
            <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </form>

          {/* Date Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs w-full sm:w-auto">
              <Calendar size={13} className="text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate('');
                    setPage(1);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer mr-1"
                  title="مسح التاريخ"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Quick Action Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-100">
          <span className="text-[11px] font-black text-slate-400 whitespace-nowrap pl-1">نوع الحركة:</span>
          {quickActionFilters.map((act) => {
            const active = selectedAction === act.id;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  setSelectedAction(act.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {act.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container: Desktop Table + Mobile Cards */}
      <div className="bg-white rounded-3xl border border-slate-150 shadow-2xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-150 text-[10.5px] font-black text-slate-500">
                <th className="py-3 px-4">الموظف / المنفذ</th>
                <th className="py-3 px-3">نوع الحركة</th>
                <th className="py-3 px-3">العنصر</th>
                <th className="py-3 px-4">التفاصيل والملخص</th>
                <th className="py-3 px-3">الـ IP</th>
                <th className="py-3 px-4 text-left">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold text-xs">
                    جاري تحميل سجل النشاطات...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold text-xs">
                    <div>لا توجد حركات مسجلة مطابقة للبحث أو الفلتر المختار</div>
                    {(selectedAction !== 'all' || selectedDate || searchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAction('all');
                          setSelectedDate('');
                          setSearchQuery('');
                          setDebouncedSearch('');
                          setPage(1);
                        }}
                        className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-black transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <RotateCcw size={13} />
                        <span>إعادة ضبط وعرض كافة الحركات</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 font-black text-[10px]">
                          {log.employee_name ? log.employee_name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-800">{log.employee_name || 'غير معروف'}</div>
                          {log.user?.email && (
                            <div className="text-[9.5px] text-slate-400 font-normal">{log.user.email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10.5px] font-black border shadow-2xs ${getActionBadgeStyle(log.action)}`}>
                        {getActionIcon(log.action)}
                        <span>{log.action}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {log.entity_type ? (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {log.entity_type} #{log.entity_id || ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {renderSummaryText(log) || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                      {log.ip || '—'}
                    </td>
                    <td className="py-3 px-4 text-left font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (displayed strictly on mobile without horizontal scroll) */}
        <div className="block md:hidden p-3 space-y-2.5">
          {loading ? (
            <div className="py-10 text-center text-slate-400 font-bold text-xs">
              جاري التحميل...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-slate-400 font-bold text-xs">
              <div>لا توجد حركات مسجلة مطابقة للبحث أو الفلتر</div>
              {(selectedAction !== 'all' || selectedDate || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAction('all');
                    setSelectedDate('');
                    setSearchQuery('');
                    setDebouncedSearch('');
                    setPage(1);
                  }}
                  className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-black transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>إعادة ضبط وعرض كافة الحركات</span>
                </button>
              )}
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 space-y-2 shadow-2xs"
              >
                {/* Header: Employee + Action badge */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-[10px] flex-shrink-0">
                      {log.employee_name ? log.employee_name.charAt(0) : 'U'}
                    </div>
                    <span className="font-extrabold text-slate-800 text-xs truncate">
                      {log.employee_name || 'غير معروف'}
                    </span>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border flex-shrink-0 ${getActionBadgeStyle(log.action)}`}>
                    {getActionIcon(log.action)}
                    <span>{log.action}</span>
                  </span>
                </div>

                {/* Body: Summary & details */}
                {log.summary && (
                  <div className="pt-0.5">
                    {renderSummaryText(log)}
                  </div>
                )}

                {/* Footer: Date & Entity */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/40">
                  <span className="font-mono">
                    {log.entity_type ? `${log.entity_type} #${log.entity_id || ''}` : ''}
                  </span>
                  <span className="font-mono">
                    {log.created_at ? new Date(log.created_at).toLocaleString('ar-EG', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : ''}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 bg-slate-50/70 border-t border-slate-150">
            {/* Info & Per Page selector */}
            <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
              <span>
                إجمالي الحركات: <span className="text-indigo-600 font-mono font-black">{totalCount.toLocaleString()}</span>
              </span>
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-[11px] text-slate-400">لكل صفحة:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Page Navigation Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1" dir="rtl">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
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
                    const isCur = num === page;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPage(num)}
                        className={`w-7 h-7 rounded-xl text-xs font-mono font-black transition-all cursor-pointer flex items-center justify-center ${
                          isCur
                            ? 'bg-slate-800 text-white shadow-xs'
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
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
      </div>
    </div>
  );
}
