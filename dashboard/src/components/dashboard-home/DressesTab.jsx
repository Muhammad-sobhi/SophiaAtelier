import React, { useState, useMemo } from 'react';
import { Search, Sparkles, Clock, AlertTriangle, CheckCircle2, LayoutGrid } from 'lucide-react';
import { getStorageUrl } from '@/lib/api-client';
import { cleanDate, calculateScheduledDates } from '@/lib/utils';
import BookedDressesModal from './BookedDressesModal';

const getDressImageUrl = (dress) => {
  if (!dress) return '/dress-placeholder.svg';
  let raw = null;
  if (Array.isArray(dress.images) && dress.images.length > 0) {
    const primary = dress.images.find((img) => img.is_primary) || dress.images[0];
    raw = primary?.image_path || primary?.image || primary?.url;
  }
  if (!raw && dress.main_image) raw = dress.main_image;
  if (!raw && dress.image_path) raw = dress.image_path;
  if (!raw && dress.image) raw = dress.image;
  return raw ? getStorageUrl(raw) : '/dress-placeholder.svg';
};

export default function DressesTab({
  dresses,
  brides,
  selectedDressId,
  setSelectedDressId,
  dressSearch,
  setDressSearch,
  dressFromDate,
  setDressFromDate,
  dressToDate,
  setDressToDate,
  openBrideModal,
  STAGE_MAP,
}) {
  const [isBookedModalOpen, setIsBookedModalOpen] = useState(false);

  // Total booked dresses count
  const bookedDressesTotalCount = useMemo(() => {
    let count = 0;
    (brides || []).forEach((b) => {
      (b.bookings || []).forEach((bk) => {
        if (bk.status === 'returned' || bk.status === 'cancelled') return;
        if (bk.dress_id || bk.dress) count++;
        if (bk.dress_2_id || bk.dress2) count++;
        if (bk.dress_3_id || bk.dress3) count++;
      });
    });
    return count;
  }, [brides]);

  // Selected dress object
  const selectedDress = useMemo(() => {
    return dresses.find((d) => d.id === selectedDressId) || dresses[0];
  }, [dresses, selectedDressId]);

  // Bookings for selected dress with computed pickup and return dates
  const selectedDressBookings = useMemo(() => {
    if (!selectedDress) return [];
    const results = [];
    brides.forEach((b) => {
      const bks = b.bookings || [];
      bks.forEach((bk) => {
        const matchDress =
          bk.dress_id === selectedDress.id ||
          bk.dress_2_id === selectedDress.id ||
          bk.dress_3_id === selectedDress.id;

        if (matchDress) {
          const rawDate = bk.event_date || b.wedding_date || b.relevant_date || '';
          const eventDate = cleanDate(rawDate) || '-';

          // Compute scheduled pickup & return dates
          const scheduled = calculateScheduledDates(eventDate !== '-' ? eventDate : '', b.city);
          const pickupDate = bk.pickup_scheduled_on
            ? cleanDate(bk.pickup_scheduled_on)
            : (b.pickup_scheduled_on ? cleanDate(b.pickup_scheduled_on) : scheduled.pickupDate);

          let returnDate = bk.return_scheduled_on ? cleanDate(bk.return_scheduled_on) : '';
          if (!returnDate && b.return_scheduled_on) {
            returnDate = cleanDate(b.return_scheduled_on);
          }
          if (!returnDate && scheduled.returnDate) {
            returnDate = scheduled.returnDate;
          }
          if (!returnDate && eventDate && eventDate !== '-') {
            try {
              const d = new Date(eventDate);
              if (!isNaN(d.getTime())) {
                d.setDate(d.getDate() + 1);
                returnDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              }
            } catch {}
          }

          // Filter by date range (matches pickupDate or eventDate)
          const filterDate = pickupDate || eventDate;
          if (dressFromDate && filterDate < dressFromDate) return;
          if (dressToDate && filterDate > dressToDate) return;

          results.push({
            brideId: b.id,
            brideName: b.name,
            bridePhone: b.phone,
            eventDate,
            pickupDate,
            returnDate,
            stage: b.current_stage || bk.status || 'booking',
            bookingId: bk.id,
            totalAmount: bk.total_amount,
          });
        }
      });
    });
    return results.sort((a, b) => (a.pickupDate || a.eventDate || '').localeCompare(b.pickupDate || b.eventDate || ''));
  }, [brides, selectedDress, dressFromDate, dressToDate]);

  // Check if the selected dress is currently out with any bride
  const currentlyOutBooking = useMemo(() => {
    return selectedDressBookings.find((b) => b.stage === 'picked_up');
  }, [selectedDressBookings]);

  // Helper to compute return status & overdue days
  const getReturnStatus = (returnDate, stage) => {
    if (!returnDate) return null;
    const isPickedUp = stage === 'picked_up';
    const isReturned = stage === 'returned';

    if (isReturned) {
      return {
        label: 'تم الإرجاع للأتيليه',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ret = new Date(returnDate);
    ret.setHours(0, 0, 0, 0);

    const diffTime = ret.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (isPickedUp) {
      if (diffDays < 0) {
        return {
          label: `متأخر في الإرجاع (${Math.abs(diffDays)} يوم) ⚠️`,
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse',
          isOverdue: true
        };
      } else if (diffDays === 0) {
        return {
          label: 'موعد الإرجاع اليوم ⏳',
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-black'
        };
      } else if (diffDays === 1) {
        return {
          label: 'الإرجاع غداً',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
        };
      } else {
        return {
          label: `باقي ${diffDays} أيام على الإرجاع`,
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
        };
      }
    }

    return null;
  };

  return (
    <div className="grid grid-cols-12 gap-3 sm:gap-4 flex-1 min-h-0 animate-fade-in" dir="rtl">
      {/* Left Column: Dress List */}
      <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3 flex flex-col max-h-[260px] md:max-h-[700px] shadow-xs">
        {/* Top Header with Booked Dresses Button */}
        <div className="flex items-center justify-between gap-2 mb-2 flex-shrink-0">
          <span className="text-xs font-black text-slate-700">قائمة الفساتين</span>
          <button
            type="button"
            onClick={() => setIsBookedModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-full text-xs font-black transition-all whitespace-nowrap cursor-pointer active:scale-95 shadow-xs border border-rose-200/80"
          >
            <LayoutGrid size={15} />
            <span>الفساتين المحجوزة ({bookedDressesTotalCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-2 flex-shrink-0">
          <input
            type="text"
            placeholder="بحث بالكود أو الاسم..."
            value={dressSearch}
            onChange={(e) => setDressSearch(e.target.value)}
            className="w-full pr-7 pl-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 placeholder:text-slate-400 min-h-[38px]"
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
        </div>

        {/* List of dresses */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
          {[...dresses]
            .sort((a, b) => {
              const codeA = (a.code || '').toString().toLowerCase();
              const codeB = (b.code || '').toString().toLowerCase();
              return codeA.localeCompare(codeB);
            })
            .filter((d) => {
              if (!dressSearch.trim()) return true;
              const q = dressSearch.toLowerCase();
              return (
                (d.name || '').toLowerCase().includes(q) ||
                (d.code || '').toString().toLowerCase().includes(q)
              );
            })
            .map((d) => {
              const isSel = selectedDressId === d.id;
              const imgUrl = getDressImageUrl(d);
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDressId(d.id)}
                  className={`flex items-center gap-2.5 p-2 rounded-2xl border transition-all cursor-pointer relative min-h-[52px] ${isSel
                      ? 'bg-indigo-50/90 border-indigo-400 shadow-2xs'
                      : 'bg-white border-slate-150 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                >
                  {isSel && (
                    <span className="absolute right-0 top-2 bottom-2 w-1.5 bg-indigo-600 rounded-l-full" />
                  )}

                  <div className="w-10 h-13 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center shadow-2xs">
                    <img
                      src={imgUrl}
                      alt={d.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/dress-placeholder.svg';
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0 pr-0.5">
                    <span className="text-[9.5px] font-mono text-slate-400 block">#{d.code || d.id}</span>
                    <h4 className="text-xs font-black text-slate-800 truncate">{d.name}</h4>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mt-0.5">
                      <span>{parseFloat(d.rental_price || 0).toLocaleString()} ج.م</span>
                      {d.size && <span className="text-slate-400">مقاس: {d.size}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Right Column: Dress Bookings Schedule Panel */}
      <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col min-h-[340px] md:max-h-[700px] shadow-xs">
        {selectedDress ? (
          <>
            {/* Dress Header Strip */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 flex-wrap gap-2.5 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-12 sm:w-16 h-16 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 shadow-xs">
                  <img
                    src={getDressImageUrl(selectedDress)}
                    alt={selectedDress.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/dress-placeholder.svg';
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black text-slate-800">{selectedDress.name}</h3>
                    <span className="text-[11px] font-mono font-bold text-slate-400">#{selectedDress.code || selectedDress.id}</span>
                    {currentlyOutBooking && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-500 text-white shadow-xs">
                        <Clock size={11} />
                        <span>الفستان بالخارج حالياً (إرجاع: {currentlyOutBooking.returnDate})</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-0.5">
                    سعر الإيجار: <strong className="text-indigo-600 font-mono">{parseFloat(selectedDress.rental_price || 0).toLocaleString()} ج.م</strong>
                    {selectedDress.size && <span className="mr-2">المقاس: {selectedDress.size}</span>}
                  </p>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="w-full sm:w-auto flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs font-bold text-slate-600 pt-1 sm:pt-0">
                <span className="text-[11px]">من:</span>
                <input
                  type="date"
                  value={dressFromDate}
                  onChange={(e) => setDressFromDate(e.target.value)}
                  className="flex-1 sm:flex-initial bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[34px]"
                />
                <span className="text-[11px]">إلى:</span>
                <input
                  type="date"
                  value={dressToDate}
                  onChange={(e) => setDressToDate(e.target.value)}
                  className="flex-1 sm:flex-initial bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[34px]"
                />
                {(dressFromDate || dressToDate) && (
                  <button
                    onClick={() => { setDressFromDate(''); setDressToDate(''); }}
                    className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 cursor-pointer"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>

            {/* Desktop View: Bookings Table */}
            <div className="hidden md:block flex-1 overflow-x-auto overflow-y-auto mt-3">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold text-[11px]">
                    <th className="pb-2 px-2.5">العروس</th>
                    <th className="pb-2 px-2.5">الهاتف</th>
                    <th className="pb-2 px-2.5">تاريخ الاستلام</th>
                    <th className="pb-2 px-2.5">تاريخ الإرجاع</th>
                    <th className="pb-2 px-2.5">المرحلة الحالية</th>
                    <th className="pb-2 px-2.5 text-left">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDressBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 font-bold">
                        لا توجد حجوزات مسجلة لهذا الفستان ضمن الفترة المحددة
                      </td>
                    </tr>
                  ) : (
                    selectedDressBookings.map((b) => {
                      const stageCfg = STAGE_MAP?.[b.stage] || { label: b.stage, badgeClass: 'bg-slate-50 text-slate-600 border-slate-200', dotColor: 'bg-slate-400' };
                      const returnStatus = getReturnStatus(b.returnDate, b.stage);
                      const isPickedUp = b.stage === 'picked_up';
                      const brideObj = (brides || []).find((c) => c.id === b.brideId);
                      return (
                        <tr key={b.bookingId || b.brideId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-2.5 font-bold text-slate-800">
                            <div className="flex items-center gap-2">
                              {isPickedUp && (
                                <span
                                  className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 animate-pulse"
                                  title="الفستان بالخارج مع العروس حالياً"
                                />
                              )}
                              <span>{b.brideName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 font-mono text-slate-500">{b.bridePhone}</td>
                          <td className="py-2.5 px-2.5 font-mono text-indigo-700 font-black">{b.pickupDate || b.eventDate || '—'}</td>
                          
                          {/* Return Date + Pending status badge */}
                          <td className="py-2.5 px-2.5">
                            {b.returnDate ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="font-mono text-slate-800 text-[11px] font-black">
                                  {b.returnDate}
                                </span>
                                {returnStatus && (
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] border leading-tight ${returnStatus.badgeClass}`}>
                                    {returnStatus.label}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">-</span>
                            )}
                          </td>

                          {/* Stage Badge */}
                          <td className="py-2.5 px-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-extrabold border ${stageCfg.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${stageCfg.dotColor}`} />
                              <span>{stageCfg.label}</span>
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="py-2.5 px-2.5 text-left">
                            <button
                              onClick={() => brideObj && openBrideModal(brideObj)}
                              className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg transition-colors cursor-pointer min-h-[28px]"
                            >
                              عرض العروس
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Cards (No horizontal scrollbar) */}
            <div className="md:hidden space-y-3 mt-3 overflow-y-auto max-h-[480px]">
              {selectedDressBookings.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-slate-150 p-4">
                  لا توجد حجوزات مسجلة لهذا الفستان ضمن الفترة المحددة
                </div>
              ) : (
                selectedDressBookings.map((b) => {
                  const stageCfg = STAGE_MAP?.[b.stage] || { label: b.stage, badgeClass: 'bg-slate-50 text-slate-600 border-slate-200', dotColor: 'bg-slate-400' };
                  const returnStatus = getReturnStatus(b.returnDate, b.stage);
                  const isPickedUp = b.stage === 'picked_up';
                  const brideObj = (brides || []).find((c) => c.id === b.brideId);

                  return (
                    <div
                      key={b.bookingId || b.brideId}
                      className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5 text-right"
                    >
                      {/* Top Header: Bride Name + Stage */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isPickedUp && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0 animate-pulse"
                              title="الفستان بالخارج مع العروس حالياً"
                            />
                          )}
                          <h4 className="font-black text-slate-800 text-xs sm:text-sm">{b.brideName}</h4>
                        </div>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9.5px] font-black border flex-shrink-0 ${stageCfg.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stageCfg.dotColor}`} />
                          <span>{stageCfg.label}</span>
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 rounded-xl p-2.5 border border-slate-150">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">الهاتف:</span>
                          <span className="font-mono font-bold text-slate-700">{b.bridePhone || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">تاريخ الاستلام:</span>
                          <span className="font-mono font-black text-indigo-700">{b.pickupDate || b.eventDate || '—'}</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">تاريخ الإرجاع:</span>
                            <span className="font-mono font-black text-slate-800 text-xs">
                              {b.returnDate || '—'}
                            </span>
                          </div>
                          {returnStatus && (
                            <span className={`inline-block px-2 py-0.5 rounded-lg text-[9.5px] font-black border ${returnStatus.badgeClass}`}>
                              {returnStatus.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={() => brideObj && openBrideModal(brideObj)}
                        className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-colors flex items-center justify-center cursor-pointer"
                      >
                        عرض تفاصيل العروس
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-300 font-bold text-xs py-8">
            حدد فستاناً من القائمة لعرض جدول حجوزاته.
          </div>
        )}
      </div>

      {/* Booked Dresses Standalone Modal Component */}
      <BookedDressesModal
        isOpen={isBookedModalOpen}
        onClose={() => setIsBookedModalOpen(false)}
        brides={brides}
        dresses={dresses}
        openBrideModal={openBrideModal}
      />
    </div>
  );
}

