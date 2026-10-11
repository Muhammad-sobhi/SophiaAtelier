import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Calendar as CalendarIcon, X, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ً-ٟ]/g, '')
    .trim();
};

// Event types returned by /calendar/events, each placed on its own date
const EVENT_TYPES = [
  { id: 'visit', label: 'زيارة', short: 'زيارة', dot: 'bg-orange-500', pill: 'text-orange-600 bg-orange-50 border-orange-300 hover:bg-orange-100' },
  { id: 'booking', label: 'حجز', short: 'حجز', dot: 'bg-emerald-500', pill: 'text-emerald-600 bg-emerald-50 border-emerald-300 hover:bg-emerald-100' },
  { id: 'fitting', label: 'بروفة', short: 'بروفة', dot: 'bg-purple-500', pill: 'text-purple-600 bg-purple-50 border-purple-300 hover:bg-purple-100' },
  { id: 'pickup', label: 'تسليم (للعروس)', short: 'تسليم', dot: 'bg-blue-500', pill: 'text-blue-600 bg-blue-50 border-blue-300 hover:bg-blue-100' },
  { id: 'return', label: 'استلام من العروس (مرتجع)', short: 'مرتجع', dot: 'bg-red-500', pill: 'text-red-600 bg-red-50 border-red-300 hover:bg-red-100' },
];
const TYPE_BY_ID = Object.fromEntries(EVENT_TYPES.map((t) => [t.id, t]));

const monthNamesAr = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const pad = (n) => String(n).padStart(2, '0');

export default function CalendarTab({ calDate, setCalDate, onOpenClient }) {
  const [events, setEvents] = useState([]);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const currentYear = calDate.getFullYear();
  const currentMonth = calDate.getMonth() + 1; // 1-indexed
  const monthKey = `${currentYear}-${pad(currentMonth)}`;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sunday
  const startMonthStr = `${monthKey}-01`;
  const endMonthStr = `${monthKey}-${pad(daysInMonth)}`;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');
    apiClient.get(`/calendar/events?start_date=${startMonthStr}&end_date=${endMonthStr}`)
      .then((res) => {
        if (isMounted) setEvents(res.events || []);
      })
      .catch((err) => {
        console.error('Failed to load calendar events:', err);
        if (isMounted) {
          setEvents([]);
          setError('تعذر تحميل مواعيد هذا الشهر');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [startMonthStr, endMonthStr]);

  useEffect(() => {
    let isMounted = true;
    apiClient.get('/calendar/months')
      .then((res) => {
        if (isMounted) setMonths(res.months || []);
      })
      .catch((err) => console.error('Failed to load calendar months:', err));
    return () => { isMounted = false; };
  }, []);

  // Events of the month after the type filter and the bride-name search, grouped by date
  const eventsByDate = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    const grouped = {};
    events.forEach((ev) => {
      if (selectedType !== 'all' && ev.type !== selectedType) return;
      if (q && !normalizeArabic(ev.client_name).includes(q)) return;
      (grouped[ev.date] ||= []).push(ev);
    });
    return grouped;
  }, [events, selectedType, searchQuery]);

  const availableMonths = useMemo(() => {
    const list = months.map((m) => ({
      key: m.month,
      count: selectedType === 'all'
        ? Object.values(m.counts || {}).reduce((sum, n) => sum + n, 0)
        : (m.counts?.[selectedType] || 0),
    }));
    if (!list.some((m) => m.key === monthKey)) {
      list.push({ key: monthKey, count: 0 });
      list.sort((a, b) => a.key.localeCompare(b.key));
    }
    return list.map((m) => {
      const [y, mo] = m.key.split('-').map(Number);
      return { ...m, year: y, month: mo, label: `${monthNamesAr[mo - 1]} ${y}` };
    });
  }, [months, selectedType, monthKey]);

  const handlePrevMonth = () => setCalDate(new Date(currentYear, currentMonth - 2, 1));
  const handleNextMonth = () => setCalDate(new Date(currentYear, currentMonth, 1));
  const handleToday = () => setCalDate(new Date());
  const handleSelectMonthKey = (key) => {
    const [y, m] = key.split('-').map(Number);
    setCalDate(new Date(y, m - 1, 1));
  };

  return (
    <div className="space-y-4 animate-fade-in flex flex-col w-full" dir="rtl">
      {/* Top Filter & Navigation Bar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-150 shadow-xs flex flex-col gap-3">
        {/* Row 1: Title + Month Navigation & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <CalendarIcon size={18} />}
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

            <div className="flex items-center gap-2 border border-slate-200/90 rounded-full px-3.5 py-1.5 bg-white/90 shadow-2xs hover:border-slate-300 transition-all">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer flex items-center justify-center p-0.5"
                title="الشهر السابق"
                aria-label="الشهر السابق"
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
                aria-label="الشهر التالي"
              >
                <ChevronLeft size={15} />
              </button>
            </div>
          </div>

          {/* Search (by bride name only) */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                placeholder="بحث باسم العروس..."
                aria-label="بحث باسم العروس"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-9 py-2 bg-slate-50/90 hover:bg-white focus:bg-white border border-slate-200 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700 shadow-2xs"
              />
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="مسح البحث"
                  aria-label="مسح البحث"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Month Quick-Filter Bar (event counts for the selected type) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-100">
          <span className="text-[11px] font-black text-slate-400 whitespace-nowrap pl-1">الشهور:</span>
          {availableMonths.map((m) => {
            const isSelected = m.key === monthKey;
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

        {/* Row 3: Event Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-100">
          <span className="text-[11px] font-black text-slate-400 whitespace-nowrap pl-1">المرحلة:</span>
          {[{ id: 'all', label: 'الكل', dot: 'bg-slate-400' }, ...EVENT_TYPES].map((type) => {
            const active = selectedType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                aria-pressed={active}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${type.dot}`} />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl px-4 py-3">
          {error}
        </div>
      )}

      {/* 7-Column Month Calendar Grid */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-150 shadow-xs w-full overflow-x-auto">
        <div className={`min-w-[700px] transition-opacity ${loading ? 'opacity-50' : ''}`}>
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

          <div className="grid grid-cols-7 gap-2.5">
            {Array(firstDay).fill(null).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 min-h-[110px]" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const matches = eventsByDate[`${monthKey}-${pad(day)}`] || [];
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

                  <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-y-auto pr-1 pl-0.5 scrollbar-thin max-h-[140px] sm:max-h-[160px]">
                    {matches.map((ev) => {
                      const type = TYPE_BY_ID[ev.type];
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onOpenClient(ev.client_id)}
                          className={`flex-shrink-0 min-h-[26px] h-[26px] text-[10px] font-extrabold px-2 py-1 text-center sm:text-right rounded-xl w-full truncate transition-all duration-150 active:scale-95 border cursor-pointer shadow-2xs flex items-center justify-between gap-1 ${type?.pill || ''}`}
                          title={`${ev.client_name} (${type?.label || ev.type})${ev.dress_name ? ` - ${ev.dress_name}` : ''}`}
                        >
                          <span className="truncate flex-1 text-right">{ev.client_name}</span>
                          {selectedType === 'all' && type && (
                            <span className="text-[8.5px] font-bold opacity-70 flex-shrink-0">{type.short}</span>
                          )}
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
