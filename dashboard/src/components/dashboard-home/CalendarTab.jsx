import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Calendar as CalendarIcon, Filter, X, LayoutGrid } from 'lucide-react';
import { apiClient, getStorageUrl } from '@/lib/api-client';
import { cleanDate, calculateScheduledDates } from '@/lib/utils';

const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .trim();
};

export default function CalendarTab({
  calDate,
  setCalDate,
  calEvents = [],
  brides = [],
  dresses = [],
  openBrideModal,
}) {
  const [internalBrides, setInternalBrides] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');

  // Ensure we have full client records with all visits & bookings just like BridesPage
  useEffect(() => {
    let isMounted = true;
    apiClient.get('/clients?per_page=1000')
      .then((res) => {
        if (!isMounted) return;
        const data = res.data || res || [];
        const mapped = data.map((c) => {
          const wDate = (c.wedding_date || c.bookings?.[0]?.event_date) ? String(c.wedding_date || c.bookings?.[0]?.event_date).substring(0, 10) : '';
          const clientCity = c.city || c.address || 'القاهرة';
          const pDate = (c.pickup_scheduled_on || c.bookings?.[0]?.pickup_scheduled_on)
            ? String(c.pickup_scheduled_on || c.bookings?.[0]?.pickup_scheduled_on).substring(0, 10)
            : (wDate ? calculateScheduledDates(wDate, clientCity).pickupDate : '');
          const rDate = (c.return_scheduled_on || c.bookings?.[0]?.return_scheduled_on)
            ? String(c.return_scheduled_on || c.bookings?.[0]?.return_scheduled_on).substring(0, 10)
            : (wDate ? calculateScheduledDates(wDate, clientCity).returnDate : '');

          return {
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            phone2: c.phone2 || '',
            email: c.email || '',
            city: clientCity,
            notes: c.notes || '',
            current_stage: c.current_stage || 'visit',
            image_path: c.image_path,
            wedding_date: wDate,
            pickup_scheduled_on: pDate,
            return_scheduled_on: rDate,
            bookings: c.bookings || [],
            visits: c.visits || [],
            latest_visit_date: (c.latest_visit_date || c.visits?.[0]?.visit_date) ? String(c.latest_visit_date || c.visits?.[0]?.visit_date).substring(0, 10) : '',
            latest_dress_name: c.latest_dress_name || c.bookings?.[0]?.dress?.name || '',
          };
        });
        setInternalBrides(mapped);
      })
      .catch((err) => {
        console.error('Failed to load full clients in CalendarTab:', err);
      });

    return () => { isMounted = false; };
  }, []);

  const activeBridesList = internalBrides.length > 0 ? internalBrides : brides;

  const currentYear = calDate ? calDate.getFullYear() : new Date().getFullYear();
  const currentMonth = calDate ? calDate.getMonth() + 1 : new Date().getMonth() + 1; // 1-indexed

  const monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  // Days in current selected month
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sunday, 6 is Saturday

  const startMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const endMonthStr = `${String(daysInMonth).padStart(2, '0')}-${String(currentMonth).padStart(2, '0')}-${currentYear}`;

  const days = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push(i);
    }
    return arr;
  }, [daysInMonth]);

  // Extract available months from all brides data for quick navigation
  const availableMonths = useMemo(() => {
    const map = {};
    activeBridesList.forEach((b) => {
      const pDate = b.pickup_scheduled_on || (b.wedding_date ? calculateScheduledDates(b.wedding_date, b.city).pickupDate : '');
      const dates = [
        pDate,
        b.latest_visit_date,
        b.visits?.[0]?.visit_date,
      ].filter(Boolean);

      dates.forEach((dStr) => {
        try {
          const d = new Date(dStr);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const key = `${y}-${String(m).padStart(2, '0')}`;
            if (!map[key]) {
              map[key] = {
                key,
                year: y,
                month: m,
                label: `${monthNamesAr[m - 1]} ${y}`,
                count: 0
              };
            }
            map[key].count += 1;
          }
        } catch {}
      });
    });

    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [activeBridesList]);

  // Stage mapping helper
  const getBrideStage = (b) => {
    const raw = (b.current_stage || b.stage || '').toLowerCase().trim();
    if (raw === 'returned' || b.bookings?.some((bk) => bk.status === 'returned')) {
      return 'returned';
    }

    const latestBk = b.bookings?.[0] || b.bookings?.[b.bookings.length - 1];
    const isDelivered =
      latestBk?.status === 'picked_up' ||
      latestBk?.status === 'out' ||
      b.bookings?.some((bk) => bk.status === 'picked_up' || bk.status === 'out');

    if (raw === 'picked_up' || raw === 'pickup' || raw === 'receive' || raw === 'receiving' || isDelivered) {
      // Sub-stage 2: الفستان خارج الأتيليه مع العروس -> استلام (من العروس)
      if (isDelivered || raw === 'receive' || raw === 'receiving') {
        return 'receive';
      }
      // Sub-stage 1: بانتظار التسليم للعروس -> تسليم (للعروس)
      return 'pickup';
    }

    if (raw === 'fitting' || (Array.isArray(b.fittings) && b.fittings.some((f) => f.status !== 'completed'))) {
      return 'fitting';
    }

    if (raw === 'visit' || (b.visits?.length > 0 && (!b.bookings || b.bookings.length === 0))) {
      return 'visit';
    }

    return 'booking';
  };

  // Stage color scheme as specified:
  // visit: orange | booking: green | fitting: purple | pickup: blue | receive: dark blue | returned: red
  const getStageStyle = (stage) => {
    switch (stage) {
      case 'visit':
        // Orange
        return 'text-orange-600 bg-orange-50 border-orange-300 hover:bg-orange-100';
      case 'booking':
        // Green
        return 'text-emerald-600 bg-emerald-50 border-emerald-300 hover:bg-emerald-100';
      case 'fitting':
        // Purple
        return 'text-purple-600 bg-purple-50 border-purple-300 hover:bg-purple-100';
      case 'pickup':
      case 'picked_up':
        // Blue (pickup to bride)
        return 'text-blue-600 bg-blue-50 border-blue-300 hover:bg-blue-100';
      case 'receive':
      case 'receiving':
        // Dark Blue (receive from bride)
        return 'text-white bg-[#1e3a8a] border-[#172554] font-black hover:bg-[#1e40af] shadow-2xs';
      case 'returned':
        // Red
        return 'text-red-600 bg-red-50 border-red-300 hover:bg-red-100';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100';
    }
  };

  const getStageLabel = (stage) => {
    switch (stage) {
      case 'visit': return 'زيارة';
      case 'booking': return 'حجز';
      case 'fitting': return 'بروفة';
      case 'pickup':
      case 'picked_up': return 'تسليم (للعروس)';
      case 'receive':
      case 'receiving': return 'استلام (من العروس)';
      case 'returned': return 'مرتجع';
      default: return stage || 'حجز';
    }
  };

  // Find matching brides for a specific day
  const matchesForDay = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const results = [];

    for (const b of activeBridesList) {
      // 1. Search filter: MUST SEARCH ONLY BY BRIDE NAME
      if (searchQuery.trim()) {
        const q = normalizeArabic(searchQuery);
        const bName = normalizeArabic(b.name);
        if (!bName.includes(q)) continue;
      }

      // 2. Stage filter: Show ONLY brides in this stage, hide all others
      const brideStage = getBrideStage(b);
      if (selectedStageFilter !== 'all') {
        if (selectedStageFilter === 'pickup') {
          if (brideStage !== 'pickup' && brideStage !== 'picked_up') continue;
        } else if (selectedStageFilter === 'receive') {
          if (brideStage !== 'receive' && brideStage !== 'receiving') continue;
        } else {
          if (brideStage !== selectedStageFilter) continue;
        }
      }

      // 3. Date matching: Base day appearance on Pickup Date (or Visit Date for visits)
      const effectivePickupDate = cleanDate(
        b.pickup_scheduled_on ||
        b.bookings?.[0]?.pickup_scheduled_on ||
        (b.wedding_date ? calculateScheduledDates(b.wedding_date, b.city).pickupDate : '')
      );

      let isMatchDay = false;

      if (brideStage === 'visit') {
        isMatchDay =
          cleanDate(b.latest_visit_date)?.startsWith(dateStr) ||
          b.visits?.some((v) => cleanDate(v.visit_date)?.startsWith(dateStr)) ||
          calEvents.some((ev) => ev.client_id === b.id && cleanDate(ev.date)?.startsWith(dateStr));
      } else {
        // Bookings / fittings / pickup / receive / returned are positioned strictly on pickup date
        isMatchDay =
          effectivePickupDate === dateStr ||
          b.bookings?.some((bk) => cleanDate(bk.pickup_scheduled_on) === dateStr) ||
          calEvents.some((ev) => ev.client_id === b.id && cleanDate(ev.date)?.startsWith(dateStr));
      }

      if (!isMatchDay) continue;

      results.push({
        bride: b,
        dayStage: brideStage,
        effectivePickupDate,
      });
    }

    return results;
  };

  // All booked dresses in this selected month
  const bookedDressesThisMonth = useMemo(() => {
    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const list = [];

    activeBridesList.forEach((b) => {
      const bookings = Array.isArray(b.bookings) ? b.bookings : [];
      bookings.forEach((booking) => {
        const pDate = cleanDate(
          booking.pickup_scheduled_on ||
          b.pickup_scheduled_on ||
          (booking.event_date ? calculateScheduledDates(booking.event_date, b.city).pickupDate : '') ||
          (b.wedding_date ? calculateScheduledDates(b.wedding_date, b.city).pickupDate : '')
        );

        if (pDate && pDate.startsWith(monthKey)) {
          const dressName = booking.dress?.name || b.latest_dress_name || 'فستان زفاف';
          const dressCode = booking.dress?.code || '';
          let returnDate = booking.return_scheduled_on ? cleanDate(booking.return_scheduled_on) : '';
          if (!returnDate && pDate) {
            try {
              const d = new Date(pDate);
              if (!isNaN(d.getTime())) {
                d.setDate(d.getDate() + 2);
                returnDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              }
            } catch {}
          }
          list.push({
            id: booking.id,
            brideName: b.name,
            bridePhone: b.phone,
            dressName,
            dressCode,
            eventDate: cleanDate(booking.event_date || b.wedding_date || ''),
            pickupDate: pDate,
            returnDate: cleanDate(returnDate),
            stage: getBrideStage(b)
          });
        }
      });
    });

    return list;
  }, [activeBridesList, currentYear, currentMonth]);

  // Navigate months
  const handlePrevMonth = () => {
    const prev = new Date(currentYear, currentMonth - 2, 1);
    setCalDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentYear, currentMonth, 1);
    setCalDate(next);
  };

  const handleToday = () => {
    setCalDate(new Date());
  };

  const handleSelectMonthKey = (key) => {
    const [y, m] = key.split('-').map(Number);
    setCalDate(new Date(y, m - 1, 1));
  };

  return (
    <div className="space-y-4 animate-fade-in flex flex-col w-full" dir="rtl">
      {/* Top Filter & Navigation Bar (Full Options) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-150 shadow-xs flex flex-col gap-3">
        {/* Row 1: Title + Month Navigation & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 flex-wrap">
          {/* Calendar Month Title */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                <CalendarIcon size={18} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-800">
                  تقويم شهر {currentMonth}-{currentYear}
                </h2>
                <p className="text-[11px] font-bold text-slate-400">
                  {monthNamesAr[currentMonth - 1]} {currentYear}
                </p>
              </div>
            </div>

            {/* Month Range Selector Pill matching Screenshot 1 */}
            <div className="flex items-center gap-2 border border-slate-200/90 rounded-full px-3.5 py-1.5 bg-white/90 shadow-2xs hover:border-slate-300 transition-all">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer flex items-center justify-center p-0.5"
                title="الشهر السابق"
              >
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                onClick={handleToday}
                title="الرجوع للشهر الحالي"
                className="text-xs font-bold text-slate-800 font-mono tracking-tight select-none hover:text-indigo-600 transition-colors cursor-pointer whitespace-nowrap px-1"
              >
                {startMonthStr} إلى {endMonthStr}
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer flex items-center justify-center p-0.5"
                title="الشهر التالي"
              >
                <ChevronLeft size={15} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {/* Search Input (Matching Screenshot - rounded-full & searches ONLY by bride name) */}
            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                placeholder="بحث في التقويم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-9 py-2 bg-slate-50/90 hover:bg-white focus:bg-white border border-slate-200 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700 shadow-2xs"
                title="البحث باسم العروس فقط"
              />
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="مسح البحث"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Month Quick-Filter Bar (like BridesPage) */}
        {availableMonths.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-100">
            <span className="text-[11px] font-black text-slate-400 whitespace-nowrap pl-1">الشهور:</span>
            {availableMonths.map((m) => {
              const isSelected = m.year === currentYear && m.month === currentMonth;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => handleSelectMonthKey(m.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{m.label}</span>
                  <span
                    className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {m.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Row 3: Stage Filter Chips (6 stages + All) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-100">
          <span className="text-[11px] font-black text-slate-400 whitespace-nowrap pl-1">المرحلة:</span>
          {[
            { id: 'all', label: 'الكل', dot: 'bg-slate-400' },
            { id: 'visit', label: 'زيارة', dot: 'bg-orange-500' },
            { id: 'booking', label: 'حجز', dot: 'bg-emerald-500' },
            { id: 'fitting', label: 'بروفة', dot: 'bg-purple-500' },
            { id: 'pickup', label: 'تسليم (للعروس)', dot: 'bg-blue-500' },
            { id: 'receive', label: 'استلام (من العروس)', dot: 'bg-blue-950' },
            { id: 'returned', label: 'مرتجع', dot: 'bg-red-500' },
          ].map((stage) => {
            const active = selectedStageFilter === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setSelectedStageFilter(stage.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                <span>{stage.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Screen 2: 100% Matching 7-Column Month Calendar Grid */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-150 shadow-xs w-full overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day of Week Header: RTL order matching Screen 2 (الأحد to السبت) */}
          <div className="grid grid-cols-7 gap-2.5 mb-3">
            {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-black text-slate-500 py-2 bg-slate-50/90 rounded-2xl border border-slate-100/80"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-2.5">
            {/* Empty slots before first day */}
            {Array(firstDay).fill(null).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 min-h-[110px]" />
            ))}

            {/* Days 1 to daysInMonth */}
            {days.map((day) => {
              const matches = matchesForDay(day);
              const hasMatches = matches.length > 0;

              return (
                <div
                  key={day}
                  className={`min-h-[115px] sm:min-h-[125px] border rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 flex flex-col gap-1.5 transition-all duration-200 ${
                    hasMatches
                      ? 'bg-white border-indigo-100 shadow-2xs hover:border-indigo-300'
                      : 'bg-slate-50/40 border-slate-150/70'
                  }`}
                >
                  {/* Purple Circle Badge for Day Number (matching Screen 2) */}
                  <div className="flex items-center justify-between flex-shrink-0">
                    <span
                      className={`text-[10px] sm:text-[10.5px] font-black w-6 h-6 flex items-center justify-center rounded-full transition-transform ${
                        hasMatches
                          ? 'bg-indigo-600 text-white shadow-xs scale-105'
                          : 'text-slate-400 bg-slate-100'
                      }`}
                    >
                      {day}
                    </span>
                    {hasMatches && (
                      <span className="text-[9px] font-extrabold text-slate-400 font-mono">
                        {matches.length}
                      </span>
                    )}
                  </div>

                  {/* Bride Pills Stack */}
                  <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-y-auto pr-1 pl-0.5 scrollbar-thin max-h-[140px] sm:max-h-[160px]">
                    {matches.map(({ bride, dayStage }) => {
                      return (
                        <button
                          key={`${bride.id}-${dayStage}`}
                          type="button"
                          onClick={() => openBrideModal(bride)}
                          className={`flex-shrink-0 min-h-[26px] h-[26px] text-[10px] font-extrabold px-2 py-1 text-center sm:text-right rounded-xl w-full truncate transition-all duration-150 active:scale-95 border cursor-pointer shadow-2xs flex items-center justify-between gap-1 ${getStageStyle(
                            dayStage
                          )}`}
                          title={`${bride.name} (${getStageLabel(dayStage)}) - ${bride.latest_dress_name || 'فستان'}`}
                        >
                          <span className="truncate flex-1 text-right">{bride.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

