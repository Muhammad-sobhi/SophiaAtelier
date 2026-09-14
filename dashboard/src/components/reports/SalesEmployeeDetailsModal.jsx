import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Award, Heart, Calendar, Ruler, Package, RotateCcw,
  DollarSign, TrendingUp, Search, Phone, Printer, CheckCircle,
  Clock, MapPin, Sparkles, User, ExternalLink, AlertCircle, Filter
} from 'lucide-react';
import { cleanDate, formatDate } from '@/lib/utils';

function formatMoney(n) {
  if (n === undefined || n === null) return '0';
  return parseFloat(n).toLocaleString();
}

export function SalesEmployeeDetailsModal({
  isOpen,
  onClose,
  employee,
  selectedMonth = 'all',
}) {
  const [activeSubTab, setActiveSubTab] = useState('bookings'); // 'bookings' | 'visits' | 'fittings' | 'pickups'
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(selectedMonth || 'all');

  useEffect(() => {
    setMonthFilter(selectedMonth || 'all');
  }, [employee?.name, selectedMonth]);

  // Use full lists if available from parent, fallback to filtered
  const rawBookings = useMemo(() => {
    return employee?.allBookingsList?.length ? employee.allBookingsList : (employee?.bookingsList || []);
  }, [employee?.allBookingsList, employee?.bookingsList]);

  const rawVisits = useMemo(() => {
    return employee?.allVisitsList?.length ? employee.allVisitsList : (employee?.visitsList || []);
  }, [employee?.allVisitsList, employee?.visitsList]);

  const rawFittings = useMemo(() => {
    return employee?.allFittingsList?.length ? employee.allFittingsList : (employee?.fittingsList || []);
  }, [employee?.allFittingsList, employee?.fittingsList]);

  const rawPickups = useMemo(() => {
    if (employee?.allPickupsList?.length || employee?.allReturnsList?.length) {
      return [...(employee.allPickupsList || []), ...(employee.allReturnsList || [])];
    }
    return [...(employee?.pickupsList || []), ...(employee?.returnsList || [])];
  }, [employee?.allPickupsList, employee?.allReturnsList, employee?.pickupsList, employee?.returnsList]);

  // Compute available months across all operations
  const availableMonths = useMemo(() => {
    const set = new Set();
    [...rawBookings, ...rawVisits, ...rawFittings, ...rawPickups].forEach((item) => {
      const d = item.booking_date || item.visit_date || item.fitting_date || item.pickup_date || item.return_date || item.event_date || item.created_at;
      if (d) {
        const c = cleanDate(d);
        if (c.length >= 7) set.add(c.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [rawBookings, rawVisits, rawFittings, rawPickups]);

  // Filter lists by selected month & search query
  const filteredBookings = useMemo(() => {
    return rawBookings.filter((b) => {
      if (monthFilter !== 'all') {
        const d = b.booking_date || b.created_at;
        const c = cleanDate(d);
        if (!c || !c.startsWith(monthFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const clientName = b.client?.name?.toLowerCase() || '';
        const clientPhone = b.client?.phone || '';
        const dressName = b.dress?.name?.toLowerCase() || '';
        const dressCode = b.dress?.code?.toLowerCase() || '';
        return clientName.includes(q) || clientPhone.includes(q) || dressName.includes(q) || dressCode.includes(q);
      }
      return true;
    });
  }, [rawBookings, monthFilter, searchQuery]);

  const filteredVisits = useMemo(() => {
    return rawVisits.filter((v) => {
      if (monthFilter !== 'all') {
        const d = v.visit_date || v.created_at;
        const c = cleanDate(d);
        if (!c || !c.startsWith(monthFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const clientName = v.client?.name?.toLowerCase() || '';
        const clientPhone = v.client?.phone || '';
        return clientName.includes(q) || clientPhone.includes(q);
      }
      return true;
    });
  }, [rawVisits, monthFilter, searchQuery]);

  const filteredFittings = useMemo(() => {
    return rawFittings.filter((f) => {
      if (monthFilter !== 'all') {
        const d = f.fitting_date || f.created_at;
        const c = cleanDate(d);
        if (!c || !c.startsWith(monthFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const clientName = f.booking?.client?.name?.toLowerCase() || '';
        const dressName = f.booking?.dress?.name?.toLowerCase() || '';
        return clientName.includes(q) || dressName.includes(q);
      }
      return true;
    });
  }, [rawFittings, monthFilter, searchQuery]);

  const filteredPickups = useMemo(() => {
    return rawPickups.filter((b) => {
      if (monthFilter !== 'all') {
        const d = b.pickup_date || b.return_date || b.event_date || b.created_at;
        const c = cleanDate(d);
        if (!c || !c.startsWith(monthFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const clientName = b.client?.name?.toLowerCase() || '';
        const dressName = b.dress?.name?.toLowerCase() || '';
        return clientName.includes(q) || dressName.includes(q);
      }
      return true;
    });
  }, [rawPickups, monthFilter, searchQuery]);

  if (!isOpen || !employee) return null;

  // Monthly stats
  const totalSalesCalculated = filteredBookings.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);
  const avgDealSize = filteredBookings.length > 0 ? Math.round(totalSalesCalculated / filteredBookings.length) : 0;

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir="rtl"
    >
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden text-right font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-150 bg-linear-to-r from-indigo-50 via-violet-50 to-white flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-md ${
              employee.isUnassigned ? 'bg-amber-600 text-white shadow-amber-200' : 'bg-indigo-600 text-white shadow-indigo-200'
            }`}>
              {employee.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-800">
                  {employee.name}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  employee.isUnassigned ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                }`}>
                  {employee.role || 'موظف مبيعات'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold flex items-center gap-2 mt-0.5">
                {employee.phone && employee.phone !== '—' && (
                  <span className="flex items-center gap-1">
                    <Phone size={11} className="text-slate-400" /> {employee.phone}
                  </span>
                )}
                <span>• تقرير مفصل للأداء والعمليات</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="طباعة التقرير"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">طباعة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Unassigned Warning Banner */}
        {employee.isUnassigned && (
          <div className="px-6 py-2.5 bg-amber-50/90 border-b border-amber-200/80 text-amber-900 text-xs font-bold flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span>هذه الحجوزات والعمليات تم تسجيلها بدون تحديد اسم موظف مبيعات. يمكنك تعديل أي حجز من خلال رحلة العروس لتحديد السيلز المسؤول.</span>
            </div>
          </div>
        )}

        {/* Top KPIs */}
        <div className="p-4 sm:p-6 pb-2 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10.5px] font-extrabold">إجمالي المبيعات</span>
                <DollarSign size={14} className="text-emerald-600" />
              </div>
              <div className="text-base font-black text-slate-800 font-mono">
                {formatMoney(totalSalesCalculated)} <span className="text-[10px] font-normal">ج.م</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10.5px] font-extrabold">عقود الحجز</span>
                <Heart size={14} className="text-rose-500" />
              </div>
              <div className="text-base font-black text-indigo-700 font-mono">
                {filteredBookings.length} <span className="text-[10px] font-normal">حجز</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10.5px] font-extrabold">متوسط العقد</span>
                <TrendingUp size={14} className="text-amber-500" />
              </div>
              <div className="text-base font-black text-slate-800 font-mono">
                {formatMoney(avgDealSize)} <span className="text-[10px] font-normal">ج.م</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10.5px] font-extrabold">زيارات وبروفات</span>
                <Sparkles size={14} className="text-indigo-500" />
              </div>
              <div className="text-base font-black text-slate-800 font-mono">
                {filteredVisits.length + filteredFittings.length} <span className="text-[10px] font-normal">عملية</span>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs and Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-2xl w-full sm:w-auto overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveSubTab('bookings')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeSubTab === 'bookings'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Heart size={12} />
                <span>عقود الحجوزات ({filteredBookings.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('visits')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeSubTab === 'visits'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar size={12} />
                <span>الزيارات ({filteredVisits.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('fittings')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeSubTab === 'fittings'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Ruler size={12} />
                <span>البروفات ({filteredFittings.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('pickups')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeSubTab === 'pickups'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package size={12} />
                <span>التسليم والاستلام ({filteredPickups.length})</span>
              </button>
            </div>

            {/* Quick Search & Month Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {availableMonths.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <Filter size={12} className="text-slate-400" />
                  <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">كافة الشهور (الكل)</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="relative flex-1 sm:w-52">
                <input
                  type="text"
                  placeholder="بحث بالعروس، الفستان..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-7 pl-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
                />
                <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-3 scrollbar-thin">
          {/* TAB 1: BOOKINGS */}
          {activeSubTab === 'bookings' && (
            <div className="space-y-2.5">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs font-bold space-y-2">
                  <AlertCircle size={24} className="mx-auto text-slate-300" />
                  {rawBookings.length > 0 ? (
                    <>
                      <p>لا توجد عقود حجز مسجلة في هذا الشهر المحدد ({monthFilter}).</p>
                      <p className="text-[11px] text-slate-400">يوجد إجمالي {rawBookings.length} عقد مسجل في شهور أخرى لهذا الموظف.</p>
                      <button
                        type="button"
                        onClick={() => setMonthFilter('all')}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <Filter size={12} />
                        <span>عرض كافة الشهور ({rawBookings.length})</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <p>لا توجد عقود حجز مسجلة لهذا الموظف حتى الآن.</p>
                      <p className="text-[10.5px] text-slate-400">
                        {employee?.isUnassigned
                          ? 'يمكنك تعديل أي حجز من رحلة العروس وتعيين السيلز المسؤول عنه.'
                          : 'يمكنك إسناد الحجوزات لهذا الموظف عند تسجيل أو تعديل أي حجز من رحلة العروس.'}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                          <Heart size={15} />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-800">
                            العروس: {b.client?.name || '—'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-2">
                            {b.client?.phone && <span>الهاتف: {b.client.phone}</span>}
                            {b.client?.city && <span>• {b.client.city}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                          b.status === 'picked_up' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          b.status === 'returned' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          b.status === 'confirmed' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {b.status === 'picked_up' ? 'تم الاستلام' :
                           b.status === 'returned' ? 'تم الإرجاع' :
                           b.status === 'confirmed' ? 'حجز مؤكد' : (b.status || 'قيد المعالجة')}
                        </span>
                        <div className="text-left">
                          <div className="text-xs font-black text-emerald-700 font-mono">
                            {formatMoney(b.total_amount)} ج.م
                          </div>
                          <div className="text-[9.5px] font-bold text-slate-400">
                            عربون: {formatMoney(b.deposit_amount)} ج.م
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dress & Date Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-600">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Sparkles size={12} className="text-amber-500" />
                        <span className="font-extrabold truncate">
                          الفستان: {b.dress?.name || '—'} {b.dress?.code ? `(${b.dress.code})` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <Calendar size={12} className="text-indigo-500" />
                        <span>تاريخ الحجز: {formatDate(b.booking_date)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <Clock size={12} className="text-rose-500" />
                        <span>تاريخ المناسبة: {formatDate(b.event_date)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: VISITS */}
          {activeSubTab === 'visits' && (
            <div className="space-y-2">
              {filteredVisits.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs font-bold space-y-2">
                  <AlertCircle size={24} className="mx-auto text-slate-300" />
                  {rawVisits.length > 0 ? (
                    <>
                      <p>لا توجد زيارات مسجلة في هذا الشهر المحدد ({monthFilter}).</p>
                      <p className="text-[11px] text-slate-400">يوجد إجمالي {rawVisits.length} زيارة مسجلة في شهور أخرى لهذا الموظف.</p>
                      <button
                        type="button"
                        onClick={() => setMonthFilter('all')}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <Filter size={12} />
                        <span>عرض كافة الشهور ({rawVisits.length})</span>
                      </button>
                    </>
                  ) : (
                    <p>لا توجد زيارات مسجلة لهذا الموظف حتى الآن.</p>
                  )}
                </div>
              ) : (
                filteredVisits.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-indigo-200 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                        <Calendar size={14} />
                      </div>
                      <div>
                        <div className="font-black text-slate-800">
                          العروس: {v.client?.name || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-2">
                          {v.client?.phone && <span>الهاتف: {v.client.phone}</span>}
                          {v.source && <span>• المصدر: {v.source}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-left space-y-0.5">
                      <div className="font-black text-slate-700">
                        {formatDate(v.visit_date)} {v.time_slot ? `(${v.time_slot})` : ''}
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black ${
                        v.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                        v.status === 'done' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {v.status === 'confirmed' ? 'مؤكدة' : v.status === 'done' ? 'تمت' : (v.status || 'زيارة')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: FITTINGS */}
          {activeSubTab === 'fittings' && (
            <div className="space-y-2">
              {filteredFittings.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs font-bold space-y-2">
                  <AlertCircle size={24} className="mx-auto text-slate-300" />
                  {rawFittings.length > 0 ? (
                    <>
                      <p>لا توجد بروفات قياس مسجلة في هذا الشهر المحدد ({monthFilter}).</p>
                      <p className="text-[11px] text-slate-400">يوجد إجمالي {rawFittings.length} بروفة مسجلة في شهور أخرى لهذا الموظف.</p>
                      <button
                        type="button"
                        onClick={() => setMonthFilter('all')}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <Filter size={12} />
                        <span>عرض كافة الشهور ({rawFittings.length})</span>
                      </button>
                    </>
                  ) : (
                    <p>لا توجد بروفات قياس مسجلة لهذا الموظف حتى الآن.</p>
                  )}
                </div>
              ) : (
                filteredFittings.map((f) => (
                  <div
                    key={f.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2 hover:border-indigo-200 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                          <Ruler size={14} />
                        </div>
                        <div>
                          <div className="font-black text-slate-800">
                            العروس: {f.booking?.client?.name || '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            الفستان: {f.booking?.dress?.name || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="font-black text-slate-700">
                          {formatDate(f.fitting_date)}
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black ${
                          f.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {f.status === 'completed' ? 'مكتملة' : 'مجدولة'}
                        </span>
                      </div>
                    </div>

                    {(f.additional_notes || f.alterations_notes) && (
                      <div className="p-2 bg-slate-50 rounded-xl text-[11px] text-slate-600 font-medium">
                        {f.additional_notes || f.alterations_notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: PICKUPS & RETURNS */}
          {activeSubTab === 'pickups' && (
            <div className="space-y-2">
              {filteredPickups.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs font-bold space-y-2">
                  <AlertCircle size={24} className="mx-auto text-slate-300" />
                  {rawPickups.length > 0 ? (
                    <>
                      <p>لا توجد عمليات تسليم أو استلام في هذا الشهر المحدد ({monthFilter}).</p>
                      <p className="text-[11px] text-slate-400">يوجد إجمالي {rawPickups.length} عملية مسجلة في شهور أخرى لهذا الموظف.</p>
                      <button
                        type="button"
                        onClick={() => setMonthFilter('all')}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <Filter size={12} />
                        <span>عرض كافة الشهور ({rawPickups.length})</span>
                      </button>
                    </>
                  ) : (
                    <p>لا توجد عمليات تسليم أو استلام مسجلة لهذا الموظف حتى الآن.</p>
                  )}
                </div>
              ) : (
                filteredPickups.map((b) => {
                  const isPickup = b.pickup_sales_name === employee.name;
                  const isReturn = b.return_sales_name === employee.name;

                  return (
                    <div
                      key={b.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                          isPickup ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {isPickup ? <Package size={14} /> : <RotateCcw size={14} />}
                        </div>
                        <div>
                          <div className="font-black text-slate-800">
                            العروس: {b.client?.name || '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            الفستان: {b.dress?.name || '—'} {b.dress?.code ? `(${b.dress.code})` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="text-left space-y-0.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isPickup ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isPickup ? 'تسليم فستان (Pickup)' : 'استلام فستان (Return)'}
                        </span>
                        <div className="text-[10.5px] font-bold text-slate-500">
                          {formatDate(isPickup ? b.pickup_date : b.return_date)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-150 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs font-extrabold text-slate-600">
            إجمالي العمليات المنجزة: <span className="text-indigo-600 font-mono font-black">{filteredBookings.length + filteredVisits.length + filteredFittings.length + filteredPickups.length}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

export default SalesEmployeeDetailsModal;
