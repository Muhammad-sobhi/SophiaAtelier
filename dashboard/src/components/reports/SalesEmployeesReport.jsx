import React, { useState, useEffect, useMemo } from 'react';
import { Award, Users, DollarSign, Calendar, Heart, Ruler, Package, RotateCcw, TrendingUp, Search, Eye } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { SalesEmployeeDetailsModal } from './SalesEmployeeDetailsModal';

export function SalesEmployeesReport() {
  const [employees, setEmployees] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [fittings, setFittings] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiClient.get('/employees'),
      apiClient.get('/bookings?per_page=1000'),
      apiClient.get('/fittings?per_page=1000'),
      apiClient.get('/visits?per_page=1000'),
    ])
      .then(([empRes, bookRes, fitRes, visRes]) => {
        if (!isMounted) return;
        setEmployees(Array.isArray(empRes) ? empRes : empRes?.data || []);
        setBookings(Array.isArray(bookRes) ? bookRes : bookRes?.data || []);
        setFittings(Array.isArray(fitRes) ? fitRes : fitRes?.data || []);
        setVisits(Array.isArray(visRes) ? visRes : visRes?.data || []);
      })
      .catch((err) => console.error('Failed to load sales report data:', err))
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, []);

  // Available months from bookings
  const availableMonths = useMemo(() => {
    const set = new Set();
    bookings.forEach((b) => {
      const d = b.booking_date || b.created_at;
      if (d) set.add(d.substring(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [bookings]);

  const UNASSIGNED_NAME = 'حجوزات عامة (بدون سيلز محدد)';

  // Aggregate stats per sales name / employee
  const statsList = useMemo(() => {
    const map = {};

    // Initialize map from employees
    employees.forEach((emp) => {
      const name = emp.name?.trim();
      if (!name) return;
      map[name] = {
        name,
        role: emp.role || emp.position || 'موظف مبيعات',
        phone: emp.phone || '—',
        bookingsCount: 0,
        totalSales: 0,
        fittingsCount: 0,
        pickupsCount: 0,
        returnsCount: 0,
        visitsCount: 0,
        allBookingsList: [],
        allPickupsList: [],
        allReturnsList: [],
        allFittingsList: [],
        allVisitsList: [],
        bookingsList: [],
        pickupsList: [],
        returnsList: [],
        fittingsList: [],
        visitsList: [],
      };
    });

    // Add unassigned placeholder
    map[UNASSIGNED_NAME] = {
      name: UNASSIGNED_NAME,
      role: 'مبيعات عامة / غير معين',
      phone: '—',
      bookingsCount: 0,
      totalSales: 0,
      fittingsCount: 0,
      pickupsCount: 0,
      returnsCount: 0,
      visitsCount: 0,
      allBookingsList: [],
      allPickupsList: [],
      allReturnsList: [],
      allFittingsList: [],
      allVisitsList: [],
      bookingsList: [],
      pickupsList: [],
      returnsList: [],
      fittingsList: [],
      visitsList: [],
      isUnassigned: true,
    };

    // Helper to get or create entry
    const getOrCreate = (name, defaultRole = 'سيلز خارجي / يدوي') => {
      const key = name?.trim() || UNASSIGNED_NAME;
      if (!map[key]) {
        map[key] = {
          name: key,
          role: defaultRole,
          phone: '—',
          bookingsCount: 0,
          totalSales: 0,
          fittingsCount: 0,
          pickupsCount: 0,
          returnsCount: 0,
          visitsCount: 0,
          allBookingsList: [],
          allPickupsList: [],
          allReturnsList: [],
          allFittingsList: [],
          allVisitsList: [],
          bookingsList: [],
          pickupsList: [],
          returnsList: [],
          fittingsList: [],
          visitsList: [],
        };
      }
      return map[key];
    };

    // Process bookings
    bookings.forEach((b) => {
      const d = b.booking_date || b.created_at;
      const inMonth = selectedMonth === 'all' || (d && d.startsWith(selectedMonth));

      const entry = getOrCreate(b.sales_name);
      entry.allBookingsList.push(b);
      if (inMonth) {
        entry.bookingsCount += 1;
        entry.totalSales += parseFloat(b.total_amount || 0);
        entry.bookingsList.push(b);
      }

      if (b.pickup_sales_name?.trim()) {
        const pEntry = getOrCreate(b.pickup_sales_name);
        pEntry.allPickupsList.push(b);
        if (inMonth) {
          pEntry.pickupsCount += 1;
          pEntry.pickupsList.push(b);
        }
      }

      if (b.return_sales_name?.trim()) {
        const rEntry = getOrCreate(b.return_sales_name);
        rEntry.allReturnsList.push(b);
        if (inMonth) {
          rEntry.returnsCount += 1;
          rEntry.returnsList.push(b);
        }
      }
    });

    // Process fittings
    fittings.forEach((f) => {
      const sName = f.sales_name?.trim() || f.sales_associate?.trim() || f.booking?.sales_name?.trim();
      const d = f.fitting_date || f.created_at;
      const inMonth = selectedMonth === 'all' || (d && d.startsWith(selectedMonth));

      if (sName) {
        const fEntry = getOrCreate(sName);
        fEntry.allFittingsList.push(f);
        if (inMonth) {
          fEntry.fittingsCount += 1;
          fEntry.fittingsList.push(f);
        }
      }
    });

    // Process visits
    visits.forEach((v) => {
      const sName = v.sales_name?.trim() || v.client?.sales_name?.trim();
      const d = v.visit_date || v.created_at;
      const inMonth = selectedMonth === 'all' || (d && d.startsWith(selectedMonth));

      if (sName) {
        const vEntry = getOrCreate(sName);
        vEntry.allVisitsList.push(v);
        if (inMonth) {
          vEntry.visitsCount += 1;
          vEntry.visitsList.push(v);
        }
      }
    });

    // Remove unassigned entry if it has 0 operations
    if (map[UNASSIGNED_NAME]?.allBookingsList.length === 0) {
      delete map[UNASSIGNED_NAME];
    }

    return Object.values(map).sort((a, b) => {
      if (a.isUnassigned && !b.isUnassigned) return 1;
      if (!a.isUnassigned && b.isUnassigned) return -1;
      return b.totalSales - a.totalSales || b.bookingsCount - a.bookingsCount;
    });
  }, [employees, bookings, fittings, visits, selectedMonth]);

  // Filtered list
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return statsList;
    const q = searchQuery.toLowerCase().trim();
    return statsList.filter(s => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
  }, [statsList, searchQuery]);

  const totalSalesRevenue = useMemo(() => {
    return filteredList.reduce((sum, s) => sum + s.totalSales, 0);
  }, [filteredList]);

  const totalBookingsCount = useMemo(() => {
    return filteredList.reduce((sum, s) => sum + s.bookingsCount, 0);
  }, [filteredList]);

  return (
    <div className="space-y-4 animate-fade-in text-right" dir="rtl">
      {/* Top Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-150 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Award size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">تقرير كفاءة موظفي المبيعات (Sales)</h3>
            <p className="text-[10px] font-bold text-slate-400">تتبع العقود والمبيعات المنجزة عبر مراحل الرحلة</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <Calendar size={13} className="text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">كافة الشهور</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-48">
            <input
              type="text"
              placeholder="بحث عن موظف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-7 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <Search size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-amber-800 block">إجمالي مبيعات الفريق</span>
            <span className="font-mono text-base sm:text-lg font-black text-amber-950">
              {totalSalesRevenue.toLocaleString()} ج.م
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <DollarSign size={16} />
          </div>
        </div>

        <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-indigo-800 block">إجمالي عقود الحجز</span>
            <span className="font-mono text-base sm:text-lg font-black text-indigo-950">
              {totalBookingsCount} حجز
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
            <Heart size={16} />
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-800 block">أفضل سيلز إنجازاً</span>
            <span className="text-xs sm:text-sm font-black text-emerald-950 truncate block max-w-[150px]">
              {filteredList[0]?.name || '—'}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Award size={16} />
          </div>
        </div>
      </div>

      {/* Employees Table & Mobile Cards */}
      <div className="bg-white rounded-3xl border border-slate-150 shadow-2xs overflow-hidden">
        {/* Desktop / Tablet Table View (hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-150 text-[10.5px] font-black text-slate-500">
                <th className="py-3 px-3">الترتيب</th>
                <th className="py-3 px-3">اسم الموظف</th>
                <th className="py-3 px-2 text-center">الزيارات</th>
                <th className="py-3 px-2 text-center">الحجوزات</th>
                <th className="py-3 px-2 text-center">البروفات</th>
                <th className="py-3 px-2 text-center">التسليم</th>
                <th className="py-3 px-2 text-center">الاستلام</th>
                <th className="py-3 px-3 text-left">قيمة المبيعات</th>
                <th className="py-3 px-3 text-center">التقرير والتفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold text-xs">
                    لا توجد بيانات موظفين مسجلة
                  </td>
                </tr>
              ) : (
                filteredList.map((emp, idx) => (
                  <tr
                    key={emp.name || idx}
                    onClick={() => setSelectedEmployeeForModal(emp)}
                    className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    title="انقر لعرض التقرير والتفاصيل الكاملة لهذا الموظف"
                  >
                    <td className="py-3 px-3">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-[10px] ${
                        idx === 0 ? 'bg-amber-100 text-amber-800' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-800' : 'text-slate-400 bg-slate-100'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-slate-800 group-hover:text-indigo-700 transition-colors">{emp.name}</div>
                      <div className="text-[9.5px] text-slate-400 font-normal">{emp.role}</div>
                    </td>
                    <td className="py-3 px-2 text-center font-mono">{emp.visitsCount}</td>
                    <td className="py-3 px-2 text-center font-mono font-black text-indigo-600">
                      {emp.bookingsCount}
                    </td>
                    <td className="py-3 px-2 text-center font-mono">{emp.fittingsCount}</td>
                    <td className="py-3 px-2 text-center font-mono">{emp.pickupsCount}</td>
                    <td className="py-3 px-2 text-center font-mono">{emp.returnsCount}</td>
                    <td className="py-3 px-3 text-left font-mono font-black text-emerald-700">
                      {emp.totalSales.toLocaleString()} ج.م
                    </td>
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeForModal(emp)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 text-[11px] font-bold rounded-xl inline-flex items-center justify-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                        title="عرض كافة العقود والزيارات والبروفات الخاصة بهذا الموظف"
                      >
                        <Eye size={12} />
                        <span>عرض التفاصيل</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (displayed strictly on mobile without horizontal scroll) */}
        <div className="block md:hidden p-3 space-y-3">
          {filteredList.length === 0 ? (
            <div className="py-10 text-center text-slate-400 font-bold text-xs">
              لا توجد بيانات موظفين مسجلة
            </div>
          ) : (
            filteredList.map((emp, idx) => (
              <div
                key={emp.name || idx}
                onClick={() => setSelectedEmployeeForModal(emp)}
                className="bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/80 rounded-2xl p-3.5 space-y-3 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
              >
                {/* Header: Rank + Employee Info + Sales */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-[10px] flex-shrink-0 ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-200'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-700'
                          : idx === 2
                          ? 'bg-orange-100 text-orange-800'
                          : 'text-slate-400 bg-slate-100'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-black text-slate-800 text-xs sm:text-sm">{emp.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{emp.role}</div>
                    </div>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <span className="text-[9.5px] text-slate-400 block font-bold">المبيعات</span>
                    <span className="font-mono font-black text-emerald-700 text-xs sm:text-sm">
                      {emp.totalSales.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>

                {/* Operations 5-Pill Grid */}
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  <div className="bg-white border border-slate-150 rounded-xl py-1 px-0.5">
                    <span className="text-[9px] text-slate-400 block font-bold">زيارات</span>
                    <span className="font-mono font-black text-slate-700 text-[11px]">{emp.visitsCount}</span>
                  </div>
                  <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl py-1 px-0.5">
                    <span className="text-[9px] text-indigo-700 block font-black">حجوزات</span>
                    <span className="font-mono font-black text-indigo-700 text-[11px]">{emp.bookingsCount}</span>
                  </div>
                  <div className="bg-white border border-slate-150 rounded-xl py-1 px-0.5">
                    <span className="text-[9px] text-slate-400 block font-bold">بروفات</span>
                    <span className="font-mono font-black text-slate-700 text-[11px]">{emp.fittingsCount}</span>
                  </div>
                  <div className="bg-white border border-slate-150 rounded-xl py-1 px-0.5">
                    <span className="text-[9px] text-slate-400 block font-bold">تسليم</span>
                    <span className="font-mono font-black text-slate-700 text-[11px]">{emp.pickupsCount}</span>
                  </div>
                  <div className="bg-white border border-slate-150 rounded-xl py-1 px-0.5">
                    <span className="text-[9px] text-slate-400 block font-bold">استلام</span>
                    <span className="font-mono font-black text-slate-700 text-[11px]">{emp.returnsCount}</span>
                  </div>
                </div>

                {/* View Details Action Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEmployeeForModal(emp);
                  }}
                  className="w-full py-2 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black rounded-xl inline-flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-98 cursor-pointer"
                >
                  <Eye size={13} />
                  <span>عرض التقرير والتفاصيل الكاملة</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Employee Operations Details Modal */}
      {selectedEmployeeForModal && (
        <SalesEmployeeDetailsModal
          isOpen={Boolean(selectedEmployeeForModal)}
          onClose={() => setSelectedEmployeeForModal(null)}
          employee={selectedEmployeeForModal}
          selectedMonth={selectedMonth}
        />
      )}
    </div>
  );
}

export default SalesEmployeesReport;
