import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, ChevronRight, ChevronLeft, ChevronDown, RotateCcw, Loader2,
  ClipboardList, Banknote, Wallet, Hourglass,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatDate, todayStr } from '@/lib/utils';

const money = (n) => `${(Number(n) || 0).toLocaleString()} ج.م`;

const CERTAINTY_FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'sure', label: 'مؤكد' },
  { id: 'unsure', label: 'غير مؤكد' },
];

const shiftMonth = (month, offset) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' });
};

const dayLabel = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
};

const dressNames = (dresses) =>
  dresses?.length ? dresses.map((d) => (d.code ? `${d.name} (${d.code})` : d.name)).join('، ') : '—';

function CertaintyBadge({ sure }) {
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border whitespace-nowrap ${
      sure ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}>
      {sure ? 'مؤكد' : 'غير مؤكد'}
    </span>
  );
}

// Bookings made per day in a month (by booking date), with paid / remaining rent
export function BookingsReport() {
  const currentMonth = todayStr().slice(0, 7);
  const today = todayStr();
  const [month, setMonth] = useState(currentMonth);
  const [certainty, setCertainty] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDays, setOpenDays] = useState(() => new Set([today]));

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/reports/bookings', { params: { month, certainty } });
      setData(res);
    } catch (err) {
      console.error('Failed to load bookings report:', err);
      setError('تعذر تحميل تقرير الحجوزات');
    } finally {
      setLoading(false);
    }
  }, [month, certainty]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const toggleDay = (date) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const summary = data?.summary || {};
  const days = data?.days || [];

  const cards = [
    {
      label: 'عدد الحجوزات',
      value: summary.count ?? 0,
      hint: `مؤكد ${summary.sure_count ?? 0} · غير مؤكد ${summary.unsure_count ?? 0}`,
      icon: ClipboardList,
      tone: 'text-indigo-600 bg-indigo-50',
    },
    { label: 'إجمالي قيمة الحجوزات', value: money(summary.total_amount), icon: Wallet, tone: 'text-slate-700 bg-slate-100' },
    { label: 'إجمالي المدفوع', value: money(summary.paid), icon: Banknote, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'إجمالي المتبقي', value: money(summary.remaining), icon: Hourglass, tone: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-4 animate-fade-in text-right" dir="rtl">
      {/* Filter bar: month navigator + certainty filter */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-150 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
            <CalendarDays size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">تقرير الحجوزات</h3>
            <p className="text-[10px] font-bold text-slate-400">الحجوزات حسب تاريخ الحجز مع المدفوع والمتبقي</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white transition-all cursor-pointer"
              aria-label="الشهر السابق"
            >
              <ChevronRight size={16} />
            </button>
            <span className="min-w-[110px] text-center text-xs font-black text-slate-800">{monthLabel(month)}</span>
            <button
              type="button"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white transition-all cursor-pointer"
              aria-label="الشهر التالي"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          {month !== currentMonth && (
            <button
              type="button"
              onClick={() => setMonth(currentMonth)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all cursor-pointer"
            >
              الشهر الحالي
            </button>
          )}

          <div className="flex p-1 bg-slate-100 rounded-xl">
            {CERTAINTY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCertainty(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  certainty === f.id ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
            title="تحديث البيانات"
            aria-label="تحديث البيانات"
          >
            <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-16 flex items-center justify-center text-slate-400">
          <Loader2 size={22} className="animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-bold">{error}</div>
      ) : (
        <>
          {/* Month summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${c.tone}`}>
                    <Icon size={16} />
                  </div>
                  <p className="text-[11px] font-bold text-slate-400">{c.label}</p>
                  <p className="text-base font-black text-slate-800 font-mono">{c.value}</p>
                  {c.hint && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{c.hint}</p>}
                </div>
              );
            })}
          </div>

          {/* Days list */}
          <div className={`space-y-2.5 transition-opacity ${loading ? 'opacity-50' : ''}`}>
            {days.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl py-12 text-center text-slate-400 font-bold text-xs">
                لا توجد حجوزات في هذا الشهر
              </div>
            ) : (
              days.map((day) => {
                const isOpen = openDays.has(day.date);
                const isToday = day.date === today;
                return (
                  <div
                    key={day.date}
                    className={`bg-white rounded-2xl border shadow-2xs overflow-hidden ${isToday ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-150'}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleDay(day.date)}
                      aria-expanded={isOpen}
                      className="w-full p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-right hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? '' : 'rotate-90'}`} />
                        <span className="text-sm font-black text-slate-800">{dayLabel(day.date)}</span>
                        {isToday && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">النهارده</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 flex-wrap pr-6 sm:pr-0">
                        <span><strong className="font-mono font-black text-indigo-700">{day.count}</strong> حجز</span>
                        <span>مدفوع <strong className="font-mono font-black text-emerald-700">{money(day.paid)}</strong></span>
                        <span>متبقي <strong className="font-mono font-black text-amber-700">{money(day.remaining)}</strong></span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-100">
                        {/* Desktop / tablet table */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-50/80 text-[10.5px] font-black text-slate-500">
                              <tr>
                                <th className="py-2.5 px-3">العروسة</th>
                                <th className="py-2.5 px-3">الفستان</th>
                                <th className="py-2.5 px-3">تاريخ الفرح</th>
                                <th className="py-2.5 px-3">تاريخ الحجز</th>
                                <th className="py-2.5 px-3">قيمة الحجز</th>
                                <th className="py-2.5 px-3">المدفوع</th>
                                <th className="py-2.5 px-3">المتبقي</th>
                                <th className="py-2.5 px-3 text-center">الحالة</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                              {day.bookings.map((b) => (
                                <tr key={b.booking_id} className="hover:bg-slate-50/60">
                                  <td className="py-2.5 px-3">
                                    <div className="font-black text-slate-800">{b.client_name || '—'}</div>
                                    <div className="font-mono text-[10.5px] text-slate-400">{b.client_phone}</div>
                                  </td>
                                  <td className="py-2.5 px-3">{dressNames(b.dresses)}</td>
                                  <td className="py-2.5 px-3 font-mono">{formatDate(b.event_date)}</td>
                                  <td className="py-2.5 px-3 font-mono">{formatDate(b.booking_date)}</td>
                                  <td className="py-2.5 px-3 font-mono">{money(b.total_amount)}</td>
                                  <td className="py-2.5 px-3 font-mono font-black text-emerald-700">{money(b.paid)}</td>
                                  <td className="py-2.5 px-3 font-mono font-black text-amber-700">{money(b.remaining)}</td>
                                  <td className="py-2.5 px-3 text-center"><CertaintyBadge sure={b.is_sure} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="block md:hidden p-3 space-y-2.5">
                          {day.bookings.map((b) => (
                            <div key={b.booking_id} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 space-y-2.5">
                              <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                                <div className="min-w-0">
                                  <div className="font-black text-slate-800 text-sm truncate">{b.client_name || '—'}</div>
                                  <div className="text-[11px] font-bold text-slate-500 mt-0.5">👗 {dressNames(b.dresses)}</div>
                                </div>
                                <CertaintyBadge sure={b.is_sure} />
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 text-center">
                                <div className="bg-white border border-slate-150 rounded-xl py-1.5 px-1">
                                  <span className="text-[9.5px] text-slate-400 block font-bold">تاريخ الفرح</span>
                                  <span className="font-mono font-black text-slate-700 text-xs">{formatDate(b.event_date)}</span>
                                </div>
                                <div className="bg-white border border-slate-150 rounded-xl py-1.5 px-1">
                                  <span className="text-[9.5px] text-slate-400 block font-bold">تاريخ الحجز</span>
                                  <span className="font-mono font-black text-slate-700 text-xs">{formatDate(b.booking_date)}</span>
                                </div>
                                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl py-1.5 px-1">
                                  <span className="text-[9.5px] text-emerald-800 block font-black">المدفوع</span>
                                  <span className="font-mono font-black text-emerald-700 text-xs">{money(b.paid)}</span>
                                </div>
                                <div className="bg-amber-50/80 border border-amber-200 rounded-xl py-1.5 px-1">
                                  <span className="text-[9.5px] text-amber-800 block font-black">المتبقي</span>
                                  <span className="font-mono font-black text-amber-700 text-xs">{money(b.remaining)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default BookingsReport;
