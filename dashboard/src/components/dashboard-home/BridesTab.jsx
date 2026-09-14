import React, { useMemo } from 'react';
import { Search, Filter, MessageCircle } from 'lucide-react';
import { formatWhatsAppNumber } from '@/lib/whatsapp';
import { cleanDate } from '@/lib/utils';

export default function BridesTab({
  brides,
  stageFilter,
  setStageFilter,
  brideSearch,
  setBrideSearch,
  monthFilter,
  setMonthFilter,
  dateBasis,
  setDateBasis,
  searchParams,
  setSearchParams,
  openBrideModal,
  STAGES,
  STAGE_MAP,
}) {
  // Extract available months from brides for the monthly filter dropdown
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    brides.forEach((b) => {
      const dates = [
        b.wedding_date,
        b.relevant_date,
        b.latest_visit_date,
        b.bookings?.[0]?.booking_date,
        b.bookings?.[0]?.event_date,
      ].filter(Boolean);

      dates.forEach((d) => {
        const match = d.match(/^(\d{4}-\d{2})/);
        if (match) monthsSet.add(match[1]);
      });
    });
    return Array.from(monthsSet).sort().reverse();
  }, [brides]);

  // Filtered Brides
  const filteredBrides = useMemo(() => {
    return brides.filter((b) => {
      // 1. Stage filter
      const stage = b.current_stage || b.stage || 'visit';
      if (stageFilter !== 'all' && stage !== stageFilter) {
        return false;
      }

      // 2. Search query
      if (brideSearch.trim()) {
        const q = brideSearch.toLowerCase().trim();
        const nameMatch = (b.name || '').toLowerCase().includes(q);
        const phoneMatch = (b.phone || '').includes(q);
        if (!nameMatch && !phoneMatch) return false;
      }

      // 3. Monthly Filter
      if (monthFilter !== 'all') {
        let matchesMonth = false;
        const weddingMonth = b.wedding_date?.slice(0, 7) || b.bookings?.[0]?.event_date?.slice(0, 7);
        const visitMonth = b.latest_visit_date?.slice(0, 7);
        const bookingMonth = b.bookings?.[0]?.booking_date?.slice(0, 7);

        if (dateBasis === 'wedding_date') {
          matchesMonth = weddingMonth === monthFilter;
        } else if (dateBasis === 'visit_date') {
          matchesMonth = visitMonth === monthFilter;
        } else if (dateBasis === 'booking_date') {
          matchesMonth = bookingMonth === monthFilter;
        } else {
          // 'all' dates basis: any date matches the month
          matchesMonth =
            weddingMonth === monthFilter ||
            visitMonth === monthFilter ||
            bookingMonth === monthFilter ||
            b.relevant_date?.slice(0, 7) === monthFilter;
        }

        if (!matchesMonth) return false;
      }

      return true;
    });
  }, [brides, stageFilter, brideSearch, monthFilter, dateBasis]);

  return (
    <div className="space-y-2.5 sm:space-y-3 animate-fade-in flex flex-col h-[460px] md:h-[490px]">
      {/* Stage Filter Pills Strip (touch scrollable) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-shrink-0 touch-pan-x">
        {STAGES.map((s) => {
          const count = s.id === 'all'
            ? brides.length
            : brides.filter((b) => (b.current_stage || b.stage || 'visit') === s.id).length;
          const isActive = stageFilter === s.id;

          return (
            <button
              key={s.id}
              onClick={() => {
                setStageFilter(s.id);
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set('stage', s.id);
                setSearchParams(nextParams);
              }}
              className={`flex-shrink-0 px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border min-h-[36px] ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {s.dotColor && <span className={`w-2 h-2 rounded-full ${s.dotColor}`} />}
              <span>{s.label}</span>
              <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-md ${isActive ? 'bg-white/25' : 'bg-slate-100 text-slate-700 font-mono'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar: Search & Monthly Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shadow-2xs flex-shrink-0">
        {/* Live Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
            value={brideSearch}
            onChange={(e) => setBrideSearch(e.target.value)}
            className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400 min-h-[40px]"
          />
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
        </div>

        {/* Monthly Filter Controls */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-bold text-[11px] sm:text-xs">
            <Filter size={12} className="text-slate-400" />
            <span>الشهر:</span>
          </div>

          {/* Month Selector */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="flex-1 sm:flex-initial bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-2 py-1.5 font-bold text-[11px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[38px]"
          >
            <option value="all">كافة الشهور</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Date Basis Selector */}
          {monthFilter !== 'all' && (
            <select
              value={dateBasis}
              onChange={(e) => setDateBasis(e.target.value)}
              className="flex-1 sm:flex-initial bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-2 py-1.5 font-bold text-[11px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[38px]"
            >
              <option value="all">أي تاريخ</option>
              <option value="wedding_date">تاريخ الزفاف</option>
              <option value="visit_date">تاريخ المقابلة</option>
              <option value="booking_date">تاريخ الحجز</option>
            </select>
          )}

          {/* Clear button if filters applied */}
          {(monthFilter !== 'all' || brideSearch || stageFilter !== 'all') && (
            <button
              onClick={() => {
                setMonthFilter('all');
                setDateBasis('all');
                setBrideSearch('');
                setStageFilter('all');
              }}
              className="text-[10px] sm:text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 cursor-pointer whitespace-nowrap min-h-[36px] flex items-center"
            >
              إلغاء التصفية
            </button>
          )}
        </div>
      </div>

      {/* Bride Cards Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filteredBrides.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center text-slate-400 font-bold text-xs">
            لا توجد عرائس مطابقة لمعايير البحث والتصفية المحددة.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3 select-none pb-4">
            {filteredBrides.map((bride) => {
              const stage = bride.current_stage || bride.stage || 'visit';
              const stageCfg = STAGE_MAP[stage] || STAGE_MAP.visit;
              const displayDate = bride.wedding_date || bride.relevant_date || bride.latest_visit_date || '';

              return (
                <div
                  key={bride.id}
                  onClick={() => openBrideModal(bride)}
                  className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer group active:scale-[0.98] min-h-[96px]"
                >
                  {/* Name and Stage */}
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                        {bride.name}
                      </h4>
                    </div>

                    {/* Phone with WhatsApp Link */}
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 mt-1">
                      <span>{bride.phone || '—'}</span>
                      {bride.phone && (
                        <a
                          href={`https://wa.me/${formatWhatsAppNumber(bride.phone)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-emerald-500 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-md transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                          title="محادثة واتساب سريعة"
                        >
                          <MessageCircle size={15} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: Stage Badge & Date */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-extrabold border ${stageCfg.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stageCfg.dotColor}`} />
                      <span>{stageCfg.label}</span>
                    </span>

                    {cleanDate(displayDate) && (
                      <span className="text-[9.5px] sm:text-[10px] font-mono text-slate-400 font-semibold truncate">
                        {cleanDate(displayDate)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

