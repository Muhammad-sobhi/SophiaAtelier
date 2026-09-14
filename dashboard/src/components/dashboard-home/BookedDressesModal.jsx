import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Calendar,
  Clock,
  LayoutGrid,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  MapPin,
  Package,
} from 'lucide-react';
import { apiClient, getStorageUrl } from '@/lib/api-client';
import { cleanDate, formatDate } from '@/lib/utils';

export default function BookedDressesModal({
  isOpen,
  onClose,
  brides = [],
  dresses = [],
  openBrideModal,
}) {
  const [internalBrides, setInternalBrides] = useState([]);
  const [bookedDressesSearch, setBookedDressesSearch] = useState('');
  const [bookedDressesSearchType, setBookedDressesSearchType] = useState('all');
  const [bookedDressesMonthFilter, setBookedDressesMonthFilter] = useState('all');
  const [bookedDressesDateFilter, setBookedDressesDateFilter] = useState('');
  const [bookedDressesDateType, setBookedDressesDateType] = useState('wedding');
  const [bookedDressesPage, setBookedDressesPage] = useState(1);
  const [bookedDressesPerPage, setBookedDressesPerPage] = useState(12);

  // Fetch complete client records to ensure all bookings (dress 1, 2, 3) are loaded
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    apiClient
      .get('/clients?per_page=1000')
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || res || [];
        setInternalBrides(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Failed to load full clients in BookedDressesModal:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const activeBridesList = internalBrides.length > 0 ? internalBrides : brides;

  const monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];

  // Helper to compute return date (next day of event date if not explicitly set)
  const computeReturnDate = (explicitReturn, eventDate) => {
    if (explicitReturn) return cleanDate(explicitReturn);
    if (!eventDate || eventDate === '-') return '';
    try {
      const d = new Date(eventDate);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    } catch {}
    return '';
  };

  // Compile all booked dresses across all brides
  const allBookedDressesList = useMemo(() => {
    const list = [];
    activeBridesList.forEach((bride) => {
      const bookings = Array.isArray(bride.bookings) ? bride.bookings : [];
      bookings.forEach((booking) => {
        if (booking.status === 'returned' || booking.status === 'cancelled') return;

        const rawEventDate = booking.event_date || bride.wedding_date || '';
        const eventDate = cleanDate(rawEventDate);
        const returnDate = computeReturnDate(booking.return_scheduled_on, eventDate);

        const getDress = (dressObj, dressId, fallbackName) => {
          const id = dressId || dressObj?.id;
          const foundInCatalog = id ? dresses.find((d) => String(d.id) === String(id)) : null;

          if (dressObj && typeof dressObj === 'object' && Object.keys(dressObj).length > 0) {
            if (foundInCatalog) {
              return {
                ...foundInCatalog,
                ...dressObj,
                images: (Array.isArray(dressObj.images) && dressObj.images.length > 0) ? dressObj.images : foundInCatalog.images,
                code: dressObj.code || foundInCatalog.code,
                name: dressObj.name || foundInCatalog.name,
              };
            }
            return dressObj;
          }
          if (foundInCatalog) return foundInCatalog;
          if (fallbackName) {
            return { id: dressId || 'unknown', name: fallbackName, code: '' };
          }
          return null;
        };

        // Slot 1: Primary Dress
        const d1 = getDress(booking.dress, booking.dress_id, bride.latest_dress_name);
        if (d1) {
          list.push({
            id: `${booking.id}-1`,
            booking,
            bride,
            dress: d1,
            slot: 'فستان رئيسي',
            eventDate,
            returnDate,
          });
        }

        // Slot 2: Second Dress
        const d2 = getDress(booking.dress2, booking.dress_2_id, null);
        if (d2) {
          list.push({
            id: `${booking.id}-2`,
            booking,
            bride,
            dress: d2,
            slot: 'فستان ثاني',
            eventDate,
            returnDate,
          });
        }

        // Slot 3: Third Dress
        const d3 = getDress(booking.dress3, booking.dress_3_id, null);
        if (d3) {
          list.push({
            id: `${booking.id}-3`,
            booking,
            bride,
            dress: d3,
            slot: 'فستان ثالث',
            eventDate,
            returnDate,
          });
        }
      });
    });

    return list;
  }, [activeBridesList, dresses]);

  // Filtered Booked Dresses
  const filteredBookedDresses = useMemo(() => {
    return allBookedDressesList.filter((item) => {
      const dress = item.dress || {};
      const bride = item.bride || {};
      const booking = item.booking || {};

      // 1. Month Filter (based on eventDate)
      if (bookedDressesMonthFilter !== 'all') {
        const rawDate = item.eventDate;
        if (!rawDate) return false;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== bookedDressesMonthFilter) return false;
      }

      // 2. Specific Date Filter
      if (bookedDressesDateFilter) {
        if (bookedDressesDateType === 'wedding') {
          if (item.eventDate !== bookedDressesDateFilter) return false;
        } else if (bookedDressesDateType === 'booking') {
          const bDate = cleanDate(booking.booking_date || booking.created_at);
          if (bDate !== bookedDressesDateFilter) return false;
        } else if (bookedDressesDateType === 'return') {
          if (item.returnDate !== bookedDressesDateFilter) return false;
        }
      }

      // 3. Search Query
      if (bookedDressesSearch.trim()) {
        const q = bookedDressesSearch.trim().toLowerCase();
        if (bookedDressesSearchType === 'dress_name') {
          return (dress.name || '').toLowerCase().includes(q);
        }
        if (bookedDressesSearchType === 'dress_code') {
          return (dress.code || '').toString().toLowerCase().includes(q);
        }
        if (bookedDressesSearchType === 'bride_name') {
          return (bride.name || '').toLowerCase().includes(q);
        }
        if (bookedDressesSearchType === 'phone') {
          return (
            (bride.phone || '').includes(q) ||
            (bride.phone2 || '').includes(q)
          );
        }
        return (
          (dress.name || '').toLowerCase().includes(q) ||
          (dress.code || '').toString().toLowerCase().includes(q) ||
          (bride.name || '').toLowerCase().includes(q) ||
          (bride.phone || '').includes(q)
        );
      }

      return true;
    });
  }, [
    allBookedDressesList,
    bookedDressesMonthFilter,
    bookedDressesDateFilter,
    bookedDressesDateType,
    bookedDressesSearch,
    bookedDressesSearchType,
  ]);

  // Month options with counts
  const bookedDressesMonthsOptions = useMemo(() => {
    const map = {};
    allBookedDressesList.forEach((item) => {
      const rawDate = item.eventDate;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      if (!map[key]) {
        map[key] = {
          key,
          year,
          monthIndex,
          label: `${monthNamesAr[monthIndex]} ${year}`,
          count: 0,
        };
      }
      map[key].count++;
    });

    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [allBookedDressesList]);

  // Pagination for Booked Dresses Modal
  const totalBookedDressesPages =
    bookedDressesPerPage === 'all'
      ? 1
      : Math.ceil(filteredBookedDresses.length / Number(bookedDressesPerPage)) || 1;

  const paginatedBookedDresses = useMemo(() => {
    if (bookedDressesPerPage === 'all') return filteredBookedDresses;
    const perPage = Number(bookedDressesPerPage);
    const start = (bookedDressesPage - 1) * perPage;
    return filteredBookedDresses.slice(start, start + perPage);
  }, [filteredBookedDresses, bookedDressesPage, bookedDressesPerPage]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[99990] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in text-right font-sans overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.25)] border border-slate-150 w-full max-w-6xl max-h-[92vh] my-auto flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/60 via-white to-indigo-50/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <LayoutGrid size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-800">
                  الفساتين المحجوزة
                </h3>
                <span className="bg-rose-100 text-rose-700 text-xs font-black px-2.5 py-0.5 rounded-full">
                  {allBookedDressesList.length} فستان محجوز
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                تصفح ومتابعة كافة الفساتين المحجوزة مع تواريخ الزفاف ومواعيد الإرجاع
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-white flex flex-col gap-3 flex-shrink-0">
          {/* Row 1: Search & Date Picker */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Search Input with Type Selector */}
            <div className="flex-1 w-full flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-500/10 transition-all">
              <Search size={16} className="text-slate-400 mr-2.5" />
              <input
                type="text"
                value={bookedDressesSearch}
                onChange={(e) => {
                  setBookedDressesSearch(e.target.value);
                  setBookedDressesPage(1);
                }}
                placeholder="ابحث باسم الفستان، الكود، اسم العروس، أو الهاتف..."
                className="w-full bg-transparent text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none px-2 py-1.5"
              />
              {bookedDressesSearch && (
                <button
                  onClick={() => setBookedDressesSearch('')}
                  className="text-slate-400 hover:text-slate-600 px-2"
                >
                  <X size={14} />
                </button>
              )}
              <select
                value={bookedDressesSearchType}
                onChange={(e) => setBookedDressesSearchType(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-600 focus:outline-none ml-1"
              >
                <option value="all">كل الحقول</option>
                <option value="dress_name">اسم الفستان</option>
                <option value="dress_code">كود الفستان</option>
                <option value="bride_name">اسم العروس</option>
                <option value="phone">الهاتف</option>
              </select>
            </div>

            {/* Specific Date Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-1 w-full sm:w-auto">
              <select
                value={bookedDressesDateType}
                onChange={(e) => setBookedDressesDateType(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-bold text-slate-600 focus:outline-none"
              >
                <option value="wedding">تاريخ الحفلة</option>
                <option value="booking">تاريخ الحجز</option>
                <option value="return">تاريخ الإرجاع</option>
              </select>
              <input
                type="date"
                value={bookedDressesDateFilter}
                onChange={(e) => {
                  setBookedDressesDateFilter(e.target.value);
                  setBookedDressesPage(1);
                }}
                className="bg-transparent text-xs font-bold text-slate-700 px-2 py-1 focus:outline-none"
              />
              {bookedDressesDateFilter && (
                <button
                  onClick={() => setBookedDressesDateFilter('')}
                  className="text-slate-400 hover:text-slate-600 px-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Months Quick-Filter Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-black text-slate-400 whitespace-nowrap pl-1">
              الشهور:
            </span>
            <button
              onClick={() => {
                setBookedDressesMonthFilter('all');
                setBookedDressesPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                bookedDressesMonthFilter === 'all'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>جميع الشهور</span>
              <span
                className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                  bookedDressesMonthFilter === 'all'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {allBookedDressesList.length}
              </span>
            </button>

            {bookedDressesMonthsOptions.map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  setBookedDressesMonthFilter(m.key);
                  setBookedDressesPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  bookedDressesMonthFilter === m.key
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{m.label}</span>
                <span
                  className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                    bookedDressesMonthFilter === m.key
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {m.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Body Cards Container */}
        <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 bg-slate-50/80 scrollbar-thin">
          {paginatedBookedDresses.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Package size={52} className="mb-3 opacity-20 text-slate-500" />
              <p className="text-sm font-extrabold text-slate-600">
                لا توجد فساتين محجوزة مطابقة لهذا الاختيار
              </p>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                جرب اختيار "جميع الشهور" أو مسح عبارة البحث
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 items-start">
              {paginatedBookedDresses.map((item, idx) => {
                const dress = item.dress || {};
                const bride = item.bride || {};
                const booking = item.booking || {};

                // Image Resolution
                let rawImagePath = null;
                if (Array.isArray(dress.images) && dress.images.length > 0) {
                  const primary = dress.images.find((img) => img.is_primary) || dress.images[0];
                  rawImagePath = primary?.image_path || primary?.image || primary?.url;
                }
                if (!rawImagePath && dress.main_image) rawImagePath = dress.main_image;
                if (!rawImagePath && dress.image_path) rawImagePath = dress.image_path;
                if (!rawImagePath && dress.image) rawImagePath = dress.image;
                const imageUrl = rawImagePath
                  ? getStorageUrl(rawImagePath)
                  : '/dress-placeholder.svg';

                // Financial calculations
                const totalAmount = Number(booking.total_amount) || 0;
                const revenuesSum = Array.isArray(booking.revenues)
                  ? booking.revenues.reduce((sum, rev) => sum + (Number(rev?.amount) || 0), 0)
                  : 0;
                const deposit = Number(booking.deposit_amount) || 0;
                const totalPaid = revenuesSum > 0 ? revenuesSum : deposit;
                const remaining = Math.max(0, totalAmount - totalPaid);
                const isFullyPaid = totalAmount > 0 && remaining <= 0;

                return (
                  <div
                    key={item.id || `item-${idx}`}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group"
                  >
                    {/* Image Header with Overlay Badges */}
                    <div className="h-32 sm:h-36 bg-slate-100 relative overflow-hidden flex-shrink-0">
                      <img
                        src={imageUrl}
                        alt={dress.name || 'فستان'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/dress-placeholder.svg';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />

                      {/* Code Badge & Slot */}
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <span className="bg-white/95 backdrop-blur-md text-slate-800 font-black text-[9px] px-2 py-0.5 rounded-lg shadow-xs border border-white/50">
                          كود: {dress.code || 'بدون كود'}
                        </span>
                        {item.slot && (
                          <span className="bg-rose-600/90 backdrop-blur-md text-white font-black text-[8px] px-1.5 py-0.5 rounded-lg shadow-xs">
                            {item.slot}
                          </span>
                        )}
                      </div>

                      {/* Stage Badge */}
                      <div className="absolute top-2 left-2">
                        <span
                          className={`font-black text-[8px] px-2 py-0.5 rounded-lg backdrop-blur-md shadow-xs ${
                            bride.current_stage === 'picked_up'
                              ? 'bg-amber-500/90 text-white'
                              : bride.current_stage === 'fitting'
                              ? 'bg-purple-600/90 text-white'
                              : 'bg-indigo-600/90 text-white'
                          }`}
                        >
                          {bride.current_stage === 'picked_up'
                            ? 'مستلم خارج الأتيليه'
                            : bride.current_stage === 'fitting'
                            ? 'غرفة القياس'
                            : 'حجز مؤكد'}
                        </span>
                      </div>

                      {/* Dress Name overlay */}
                      <div className="absolute bottom-2 right-2.5 left-2.5 text-white">
                        <h4 className="text-xs font-black line-clamp-1 drop-shadow-sm">
                          {dress.name || 'فستان غير معروف'}
                        </h4>
                      </div>
                    </div>

                    {/* Card Details */}
                    <div className="p-2.5 sm:p-3 flex flex-col gap-2 flex-1 justify-between bg-white text-right">
                      {/* Dates Grid */}
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-50/90 p-2 rounded-xl border border-slate-100 text-[11px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                            <Clock size={10} className="text-slate-400" />
                            تاريخ الحجز:
                          </span>
                          <span className="font-black text-slate-700 text-[10.5px]">
                            {booking.booking_date || booking.created_at
                              ? formatDate(booking.booking_date || booking.created_at)
                              : 'غير مسجل'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1">
                            <Calendar size={10} className="text-rose-500" />
                            موعد الزفاف:
                          </span>
                          <span className="font-black text-rose-700 text-[10.5px]">
                            {item.eventDate ? formatDate(item.eventDate) : 'غير محدد'}
                          </span>
                        </div>
                      </div>

                      {/* Payment Status Block */}
                      <div className="p-2 rounded-xl bg-indigo-50/40 border border-indigo-100/60 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-black text-indigo-950 flex items-center gap-1">
                            <CreditCard size={11} className="text-indigo-600" />
                            حالة السداد
                          </span>
                          {isFullyPaid ? (
                            <span className="text-[8.5px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md flex items-center gap-1">
                              <CheckCircle2 size={10} />
                              خالص السداد
                            </span>
                          ) : remaining > 0 ? (
                            <span className="text-[8.5px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md flex items-center gap-1">
                              <AlertCircle size={10} />
                              متبقي {remaining.toLocaleString()} ج.م
                            </span>
                          ) : (
                            <span className="text-[8.5px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                              غير محدد
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1 pt-1 text-center border-t border-indigo-100/40">
                          <div>
                            <div className="text-[8px] text-slate-400 font-bold">الإجمالي</div>
                            <div className="text-[10px] font-black text-slate-700">
                              {totalAmount.toLocaleString()} ج.م
                            </div>
                          </div>
                          <div>
                            <div className="text-[8px] text-emerald-600 font-bold">المدفوع</div>
                            <div className="text-[10px] font-black text-emerald-700">
                              {totalPaid.toLocaleString()} ج.م
                            </div>
                          </div>
                          <div>
                            <div className="text-[8px] text-rose-500 font-bold">المتبقي</div>
                            <div className="text-[10px] font-black text-rose-700">
                              {remaining.toLocaleString()} ج.م
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bride Details Block */}
                      <div className="pt-1.5 border-t border-slate-100 flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              if (openBrideModal) openBrideModal(bride);
                            }}
                            className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors text-right cursor-pointer min-w-0"
                          >
                            <div className="w-4.5 h-4.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                              <User size={10} />
                            </div>
                            <span className="font-black text-slate-800 text-[11px] truncate max-w-[120px]">
                              {bride.name || 'بدون اسم'}
                            </span>
                          </button>
                          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            <MapPin size={9} className="text-slate-400" />
                            <span className="truncate max-w-[75px]">
                              {bride.city || bride.address || 'غير محدد'}
                            </span>
                          </div>
                        </div>

                        {/* Phone Numbers with call/WhatsApp buttons */}
                        <div className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-1 font-bold text-slate-700" dir="ltr">
                            <Phone size={10} className="text-emerald-600" />
                            <span>{bride.phone || 'لا يوجد رقم'}</span>
                            {bride.phone2 && (
                              <span className="text-[8.5px] text-slate-400">/ {bride.phone2}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {bride.phone && (
                              <a
                                href={`https://wa.me/${bride.phone.replace(/[^\d]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[9px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
                              >
                                واتساب
                              </a>
                            )}
                            {bride.phone && (
                              <a
                                href={`tel:${bride.phone}`}
                                className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors"
                              >
                                اتصال
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-bold text-[11px]">
              {filteredBookedDresses.length === 0
                ? 'لا توجد نتائج'
                : bookedDressesPerPage === 'all'
                ? `عرض جميع الـ ${filteredBookedDresses.length} فستان`
                : `عرض ${(bookedDressesPage - 1) * Number(bookedDressesPerPage) + 1} - ${Math.min(
                    bookedDressesPage * Number(bookedDressesPerPage),
                    filteredBookedDresses.length
                  )} من أصل ${filteredBookedDresses.length} فستان`}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] font-semibold">لكل صفحة:</span>
              <select
                value={bookedDressesPerPage}
                onChange={(e) => {
                  setBookedDressesPerPage(
                    e.target.value === 'all' ? 'all' : Number(e.target.value)
                  );
                  setBookedDressesPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-rose-400"
              >
                <option value="6">6</option>
                <option value="9">9</option>
                <option value="12">12</option>
                <option value="24">24</option>
                <option value="48">48</option>
                <option value="all">عرض الكل</option>
              </select>
            </div>
          </div>

          {totalBookedDressesPages > 1 && bookedDressesPerPage !== 'all' && (
            <div className="flex items-center gap-1">
              <button
                disabled={bookedDressesPage === 1}
                onClick={() => setBookedDressesPage(1)}
                className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-colors cursor-pointer"
                title="الصفحة الأولى"
              >
                «
              </button>
              <button
                disabled={bookedDressesPage === 1}
                onClick={() => setBookedDressesPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-colors cursor-pointer"
              >
                السابق
              </button>

              {Array.from({ length: totalBookedDressesPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalBookedDressesPages ||
                    Math.abs(p - bookedDressesPage) <= 2
                )
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <React.Fragment key={p}>
                      {prev && p - prev > 1 && (
                        <span className="px-1 text-slate-400 font-bold">...</span>
                      )}
                      <button
                        onClick={() => setBookedDressesPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          bookedDressesPage === p
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                disabled={bookedDressesPage === totalBookedDressesPages}
                onClick={() =>
                  setBookedDressesPage((p) => Math.min(totalBookedDressesPages, p + 1))
                }
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-colors cursor-pointer"
              >
                التالي
              </button>
              <button
                disabled={bookedDressesPage === totalBookedDressesPages}
                onClick={() => setBookedDressesPage(totalBookedDressesPages)}
                className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-colors cursor-pointer"
                title="الصفحة الأخيرة"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
