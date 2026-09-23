import React, { useMemo, useEffect } from 'react';
import { Search, Filter, MessageCircle } from 'lucide-react';
import { formatWhatsAppNumber } from '@/lib/whatsapp';
import { cleanDate, calculateScheduledDates } from '@/lib/utils';

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
  // availableMonths, helpers, and stage counts are defined below after matchesStage

  // Returns the stage-relevant date used for month filtering & sorting
  const getStageDate = (b, targetStage) => {
    const wDate = b.bookings?.[0]?.event_date || b.wedding_date || b.relevant_date;
    switch (targetStage) {
      case 'visit':
        return b.latest_visit_date || b.visits?.[0]?.visit_date || b.bookings?.[0]?.booking_date;
      case 'booking':
        return wDate || b.bookings?.[0]?.booking_date || b.latest_visit_date;
      case 'fitting':
        return b.fittings?.[0]?.fitting_date || b.latest_fitting_date;
      case 'pickup':
      case 'picked_up': {
        const direct = b.bookings?.[0]?.pickup_scheduled_on || b.pickup_scheduled_on;
        if (direct) return direct;
        if (wDate) {
          const scheduled = calculateScheduledDates(wDate, b.city);
          if (scheduled.pickupDate) return scheduled.pickupDate;
        }
        return null;
      }
      case 'receive':
      case 'returned': {
        const direct = b.bookings?.[0]?.return_scheduled_on || b.return_scheduled_on || b.expected_return_date;
        if (direct) return direct;
        if (wDate) {
          const scheduled = calculateScheduledDates(wDate, b.city);
          if (scheduled.returnDate) return scheduled.returnDate;
        }
        return null;
      }
      default:
        return null;
    }
  };

  // Effective stage: dress delivered to bride => return stage (receive from bride)
  const getEffectiveStage = (b) => {
    const raw = b.current_stage || b.stage || 'visit';
    const isDelivered =
      (b.bookings?.[0]?.status === 'picked_up' || b.bookings?.[0]?.status === 'out') ||
      b.bookings?.some((bk) => bk.status === 'picked_up' || bk.status === 'out');
    return raw === 'picked_up' && isDelivered ? 'returned' : raw;
  };

  // Return-stage badge: "returned" only when the dress actually came back,
  // otherwise show the countdown to (or delay past) the scheduled return date.
  const getReturnBadge = (b) => {
    const raw = b.current_stage || b.stage || 'visit';
    const isOut = b.bookings?.some((bk) => bk.status === 'picked_up' || bk.status === 'out');
    const isReturned =
      !isOut &&
      (b.bookings?.some((bk) => bk.status === 'returned') || raw === 'returned' || raw === 'completed');
    if (isReturned) return null;

    const retDate = getStageDate(b, 'returned');
    if (!retDate) {
      return { label: 'قيد الإرجاع', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', dotColor: 'bg-blue-500' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ret = new Date(String(retDate).slice(0, 10));
    ret.setHours(0, 0, 0, 0);
    const diffDays = Math.round((ret - today) / 86400000);

    if (diffDays < 0) {
      return { label: `متأخر ${Math.abs(diffDays)} يوم`, badgeClass: 'bg-rose-100 text-rose-800 border-rose-300', dotColor: 'bg-rose-500' };
    }
    if (diffDays === 0) {
      return { label: 'الإرجاع اليوم', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300', dotColor: 'bg-amber-500' };
    }
    return { label: `الإرجاع بعد ${diffDays} يوم`, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', dotColor: 'bg-blue-500' };
  };

  // Stage match helper:
  // 1. Bookings > 15 days away stay in 'booking'
  // 2. Bookings <= 15 days appear in 'picked_up'
  // 3. Brides with fittings appear in 'fitting' without being removed from booking/pickup
  // 4. Returned brides auto-disappear after receiving + return month has ended
  const matchesStage = (b, targetStage) => {
    if (targetStage === 'all') return true;

    const raw = b.current_stage || b.stage || 'visit';
    const latestBk = b.bookings?.[0];
    const isDelivered =
      latestBk?.status === 'picked_up' ||
      latestBk?.status === 'out' ||
      b.bookings?.some((bk) => bk.status === 'picked_up' || bk.status === 'out');
    const isReturned =
      latestBk?.status === 'returned' ||
      b.bookings?.some((bk) => bk.status === 'returned') ||
      raw === 'returned' ||
      raw === 'completed';

    const hasFitting =
      (Array.isArray(b.fittings) && b.fittings.some((f) => f.status !== 'completed' && f.status !== 'cancelled')) ||
      Boolean(b.has_fitting);

    // 1. Fitting stage: show any bride who has a pending/scheduled fitting
    if (targetStage === 'fitting') {
      return Boolean(hasFitting);
    }

    // 2. Return stage:
    if (targetStage === 'returned') {
      // Must be currently delivered/out OR returned in current month
      if (isDelivered) return true;
      if (isReturned) {
        // Disappear if received + month ended:
        const retDate = latestBk?.return_scheduled_on || latestBk?.updated_at || b.return_scheduled_on;
        if (retDate) {
          const retMonth = String(retDate).slice(0, 7);
          const currentMonth = new Date().toISOString().slice(0, 7);
          if (retMonth < currentMonth) {
            return false; // Month ended -> auto-disappear from active returned stage
          }
        }
        return true;
      }
      return false;
    }

    // If already returned or delivered, she is not in visit/booking/pickup
    if (isDelivered || isReturned) {
      return false;
    }

    // 3. Pickup stage: booked AND pickup date is within 15 days (or today/past)
    if (targetStage === 'picked_up' || targetStage === 'pickup') {
      return raw === 'picked_up';
    }

    // 4. Booking stage: booked AND pickup date is > 15 days away
    if (targetStage === 'booking') {
      return raw === 'booking';
    }

    // 5. Visit stage:
    if (targetStage === 'visit') {
      return raw === 'visit';
    }

    return raw === targetStage;
  };

  // Helper: does a bride match the search query?
  const matchesSearch = (b) => {
    if (!brideSearch.trim()) return true;
    const q = brideSearch.toLowerCase().trim();
    return (b.name || '').toLowerCase().includes(q) || (b.phone || '').includes(q);
  };

  // Helper: does a bride match the month filter for a given stage?
  const matchesMonthForStage = (b, targetStage, month) => {
    if (month === 'all') return true;
    if (targetStage !== 'all') {
      const stageDate = getStageDate(b, targetStage);
      return !!stageDate && stageDate.slice(0, 7) === month;
    }
    if (dateBasis === 'wedding_date') {
      return (b.wedding_date?.slice(0, 7) || b.bookings?.[0]?.event_date?.slice(0, 7)) === month;
    }
    if (dateBasis === 'visit_date') {
      return b.latest_visit_date?.slice(0, 7) === month;
    }
    if (dateBasis === 'booking_date') {
      return b.bookings?.[0]?.booking_date?.slice(0, 7) === month;
    }
    const wDate = b.bookings?.[0]?.event_date || b.wedding_date || b.relevant_date;
    const scheduled = calculateScheduledDates(wDate, b.city);
    const pDate = b.bookings?.[0]?.pickup_scheduled_on || b.pickup_scheduled_on || scheduled.pickupDate;
    const rDate = b.bookings?.[0]?.return_scheduled_on || b.return_scheduled_on || scheduled.returnDate;
    return (
      (wDate && wDate.slice(0, 7) === month) ||
      (b.latest_visit_date && b.latest_visit_date.slice(0, 7) === month) ||
      (b.bookings?.[0]?.booking_date && b.bookings[0].booking_date.slice(0, 7) === month) ||
      (pDate && pDate.slice(0, 7) === month) ||
      (rDate && rDate.slice(0, 7) === month)
    );
  };

  // Extract available months — scoped to current stage and search
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    brides.forEach((b) => {
      if (!matchesStage(b, stageFilter)) return;
      if (!matchesSearch(b)) return;

      let dates = [];
      if (stageFilter !== 'all') {
        const sd = getStageDate(b, stageFilter);
        if (sd) dates.push(sd);
      } else if (dateBasis === 'wedding_date') {
        const wd = b.bookings?.[0]?.event_date || b.wedding_date;
        if (wd) dates.push(wd);
      } else if (dateBasis === 'visit_date') {
        if (b.latest_visit_date) dates.push(b.latest_visit_date);
      } else if (dateBasis === 'booking_date') {
        const bd = b.bookings?.[0]?.booking_date;
        if (bd) dates.push(bd);
      } else {
        const wDate = b.bookings?.[0]?.event_date || b.wedding_date || b.relevant_date;
        const scheduled = calculateScheduledDates(wDate, b.city);
        const pDate = b.bookings?.[0]?.pickup_scheduled_on || b.pickup_scheduled_on || scheduled.pickupDate;
        const rDate = b.bookings?.[0]?.return_scheduled_on || b.return_scheduled_on || scheduled.returnDate;
        dates = [
          wDate,
          b.latest_visit_date,
          b.bookings?.[0]?.booking_date,
          pDate,
          rDate,
        ].filter(Boolean);
      }

      dates.forEach((d) => {
        const match = d.match(/^(\d{4}-\d{2})/);
        if (match) monthsSet.add(match[1]);
      });
    });
    return Array.from(monthsSet).sort().reverse();
  }, [brides, stageFilter, brideSearch, dateBasis]);

  // Auto-reset month filter when current selection is no longer available
  useEffect(() => {
    if (monthFilter !== 'all' && !availableMonths.includes(monthFilter)) {
      setMonthFilter('all');
    }
  }, [availableMonths, monthFilter, setMonthFilter]);

  // Stage pill counts — reflect active search + month filters
  const filteredStageCounts = useMemo(() => {
    const counts = {};
    STAGES.forEach((s) => {
      counts[s.id] = brides.filter((b) => {
        if (!matchesStage(b, s.id)) return false;
        if (!matchesSearch(b)) return false;
        if (!matchesMonthForStage(b, s.id, monthFilter)) return false;
        return true;
      }).length;
    });
    return counts;
  }, [brides, brideSearch, monthFilter, dateBasis]);

  // Filtered Brides
  const filteredBrides = useMemo(() => {
    const list = brides.filter((b) => {
      // 1. Stage filter
      if (!matchesStage(b, stageFilter)) {
        return false;
      }

      // 2. Search query
      if (brideSearch.trim()) {
        const q = brideSearch.toLowerCase().trim();
        const nameMatch = (b.name || '').toLowerCase().includes(q);
        const phoneMatch = (b.phone || '').includes(q);
        if (!nameMatch && !phoneMatch) return false;
      }

      // 3. Monthly Filter — matched against the active stage's own date
      if (!matchesMonthForStage(b, stageFilter, monthFilter)) {
        return false;
      }

      return true;
    });

    // Sort by the active stage's own date (then relevant date as tiebreak)
    list.sort((a, b) => {
      const dateA = (stageFilter !== 'all' ? getStageDate(a, stageFilter) : null) || a.relevant_date || a.wedding_date || '';
      const dateB = (stageFilter !== 'all' ? getStageDate(b, stageFilter) : null) || b.relevant_date || b.wedding_date || '';
      return String(dateA).localeCompare(String(dateB));
    });

    return list;
  }, [brides, stageFilter, brideSearch, monthFilter, dateBasis]);

  return (
    <div className="space-y-2.5 sm:space-y-3 animate-fade-in flex flex-col h-[460px] md:h-[490px]">
      {/* Stage Filter Pills Strip (touch scrollable) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-shrink-0 touch-pan-x">
        {STAGES.map((s) => {
          const count = filteredStageCounts[s.id] ?? 0;
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
          {monthFilter !== 'all' && stageFilter === 'all' && (
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
              const stage = getEffectiveStage(bride);
              const activeStageKey = stageFilter !== 'all' ? stageFilter : stage;
              const baseStageCfg = STAGE_MAP[activeStageKey] || STAGE_MAP[stage] || STAGE_MAP.visit;
              const stageCfg = activeStageKey === 'returned' ? getReturnBadge(bride) || baseStageCfg : baseStageCfg;
              const displayDate = bride.bookings?.[0]?.event_date || bride.wedding_date || bride.relevant_date || bride.latest_visit_date || '';

              const wDate = bride.bookings?.[0]?.event_date || bride.wedding_date || bride.relevant_date;
              const scheduled = calculateScheduledDates(wDate, bride.city);
              const pickupDate = bride.bookings?.[0]?.pickup_scheduled_on || bride.pickup_scheduled_on || scheduled.pickupDate;

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

                  {/* Bottom row: Stage Badge & Date (return date for return stage, else wedding date) */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-extrabold border ${stageCfg.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stageCfg.dotColor}`} />
                      <span>{stageCfg.label}</span>
                    </span>

                    {(() => {
                      const cardReturnDate = bride.bookings?.[0]?.return_scheduled_on || bride.return_scheduled_on || scheduled.returnDate;
                      if (stage === 'returned' && cardReturnDate) {
                        return (
                          <span className="text-[9.5px] sm:text-[10px] font-mono text-rose-600 font-bold truncate" title="تاريخ الإرجاع">
                            {cleanDate(cardReturnDate)}
                          </span>
                        );
                      }
                      return cleanDate(displayDate) ? (
                        <span className="text-[9.5px] sm:text-[10px] font-mono text-slate-400 font-semibold truncate" title="تاريخ المناسبة / الزفاف">
                          {cleanDate(displayDate)}
                        </span>
                      ) : null;
                    })()}
                  </div>

                  {/* Visit Date — always visible on card face (fitting date during fitting stage) */}
                  {(() => {
                    const faceVisitDate = bride.latest_visit_date || bride.visits?.[0]?.visit_date || bride.bookings?.[0]?.booking_date;
                    const faceFittingDate = bride.fittings?.[0]?.fitting_date || bride.latest_fitting_date;
                    const faceDate = stage === 'fitting' && faceFittingDate ? faceFittingDate : faceVisitDate;
                    if (!faceDate) return null;
                    return (
                      <div className="mt-1.5 pt-1.5 border-t border-dashed border-slate-100 flex items-center justify-between text-[9px] font-mono font-bold">
                        <span className={`${stage === 'fitting' ? 'text-purple-700' : 'text-amber-700'} truncate`} title={stage === 'fitting' ? 'تاريخ البروفة' : 'تاريخ الزيارة'}>
                          {stage === 'fitting' ? 'بروفة: ' : 'زيارة: '}{cleanDate(faceDate)}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Scheduled Pickup Date — only from booking stage onward (return date removed from card face) */}
                  {stage !== 'visit' && pickupDate && (
                    <div className="mt-1.5 pt-1.5 border-t border-dashed border-slate-100 flex items-center justify-between text-[9px] font-mono font-bold">
                      <span className="text-blue-600 truncate" title="تاريخ الاستلام">استلام: {cleanDate(pickupDate)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

