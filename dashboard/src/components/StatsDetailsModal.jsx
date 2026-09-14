import React, { useState, useMemo } from 'react';
import {
  X, Search, Download, ChevronLeft, ChevronRight,
  Filter, FileSpreadsheet, Sparkles, User, Calendar,
  Phone, DollarSign, Tag, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

export function StatsDetailsModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon = Sparkles,
  color = 'indigo',
  dataType = 'generic',
  data = [],
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filter items based on search query
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (!searchQuery.trim()) return data;

    const q = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      if (!item) return false;
      return Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          return Object.values(val).some(nested => String(nested).toLowerCase().includes(q));
        }
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [data, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!filteredData.length) return;

    let headers = [];
    let rows = [];

    if (dataType === 'dresses') {
      headers = ['كود الفستان', 'اسم الفستان', 'الحالة', 'سعر الإيجار', 'مرات الحجز', 'العميلة المستلمة', 'تاريخ الإرجاع'];
      rows = filteredData.map(d => [
        d.code || '-',
        d.name || '-',
        d.status_label || d.status || '-',
        d.rental_price || 0,
        d.bookings_count || 0,
        d.current_client_name || d.client_name || '-',
        d.expected_return_date || d.return_date || '-'
      ]);
    } else if (dataType === 'brides') {
      headers = ['اسم العروس', 'رقم الهاتف', 'المحافظة', 'المرحلة', 'تاريخ المناسبة', 'الفستان', 'إجمالي المبلغ', 'المدفوع', 'المتبقي'];
      rows = filteredData.map(b => [
        b.name || '-',
        b.phone || '-',
        b.city || '-',
        b.stage_label || b.current_stage || b.stage || '-',
        b.wedding_date || b.event_date || '-',
        b.dress_name || '-',
        b.total_amount || 0,
        b.paid_amount || b.deposit_amount || 0,
        b.remaining_amount || 0
      ]);
    } else if (dataType === 'revenues') {
      headers = ['التاريخ', 'اسم العروس', 'نوع الإيراد', 'المبلغ', 'طريقة الدفع', 'المسؤول / السيلز', 'ملاحظات'];
      rows = filteredData.map(r => [
        r.payment_date || r.date || '-',
        r.client_name || r.client?.name || '-',
        r.type_label || r.type || '-',
        r.amount || 0,
        r.payment_method || '-',
        r.sales_name || '-',
        r.notes || '-'
      ]);
    } else if (dataType === 'employees') {
      headers = ['اسم الموظف', 'الوظيفة / الدور', 'رقم الهاتف', 'عدد العقود والمبيعات', 'إجمالي مبيعاته (ج.م)', 'نسبة الإنجاز'];
      rows = filteredData.map(e => [
        e.name || '-',
        e.position || e.role || '-',
        e.phone || '-',
        e.totalBookings || e.completed_bookings || 0,
        e.totalSalesAmount || 0,
        e.successRate ? `${e.successRate}%` : '-'
      ]);
    } else {
      // Generic fallback
      const sample = filteredData[0];
      const keys = Object.keys(sample).filter(k => typeof sample[k] !== 'object');
      headers = keys;
      rows = filteredData.map(item => keys.map(k => item[k] ?? '-'));
    }

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تقرير_${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const colorStyles = {
    indigo: {
      border: 'border-indigo-100',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      iconBg: 'bg-indigo-50 text-indigo-600',
      accent: 'bg-indigo-600'
    },
    rose: {
      border: 'border-rose-100',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      iconBg: 'bg-rose-50 text-rose-600',
      accent: 'bg-rose-600'
    },
    emerald: {
      border: 'border-emerald-100',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-50 text-emerald-600',
      accent: 'bg-emerald-600'
    },
    amber: {
      border: 'border-amber-100',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: 'bg-amber-50 text-amber-600',
      accent: 'bg-amber-600'
    },
    purple: {
      border: 'border-purple-100',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      iconBg: 'bg-purple-50 text-purple-600',
      accent: 'bg-purple-600'
    },
    blue: {
      border: 'border-blue-100',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      iconBg: 'bg-blue-50 text-blue-600',
      accent: 'bg-blue-600'
    },
  }[color] || {
    border: 'border-slate-100',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    iconBg: 'bg-slate-50 text-slate-600',
    accent: 'bg-slate-800'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10005] flex items-center justify-center p-3 sm:p-5 text-right overflow-y-auto" dir="rtl" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-5xl border border-slate-100 shadow-[0_25px_60px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${colorStyles.iconBg} flex items-center justify-center border border-slate-100 shadow-xs flex-shrink-0`}>
              <Icon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-800">{title}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${colorStyles.badge}`}>
                  {filteredData.length} سجل
                </span>
              </div>
              {subtitle && <p className="text-xs text-slate-400 font-bold mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Search + Export Button */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="🔍 بحث سريع في هذه البيانات..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-right"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={handleExportCSV}
            disabled={!filteredData.length}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
          >
            <FileSpreadsheet size={15} />
            <span>تصدير إلى Excel (CSV)</span>
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 scrollbar-thin">
          {paginatedData.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search size={20} />
              </div>
              <p className="text-xs font-extrabold text-slate-600">لا توجد سجلات تطابق البحث في هذا الكارت.</p>
              <p className="text-[11px] text-slate-400">جرب البحث بكلمات أخرى أو مسح نص البحث.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-xs">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-extrabold">
                    {dataType === 'dresses' && (
                      <>
