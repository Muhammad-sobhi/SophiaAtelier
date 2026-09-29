'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, Trash2, Calendar, Clock, CheckCircle, AlertCircle, Heart, Loader2 } from 'lucide-react';
import { useStore, MAX_BAG_DRESSES } from '../../context/StoreContext';
import { checkAvailability, isVideoUrl } from '../../lib/api';
import styles from './CartDrawer.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/* ── 30-MINUTE VISIT SLOTS FROM 01:00 PM TO 08:30 PM (MAX 4 PER SLOT) ── */
const VISIT_TIME_SLOTS = [
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
];

/** "03:30 PM" → "15:30" (the format the API stores and returns) */
function to24h(slot) {
  const m = String(slot).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return slot;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/** Current date and time at the shop (Cairo), whatever the visitor's timezone */
function shopNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function readVisitDate(today) {
  try {
    const saved = localStorage.getItem('sophia_visit_date');
    return saved && saved >= today ? saved : today;
  } catch (e) {
    return today;
  }
}

const labelStyle = { fontSize: '10px', fontWeight: '700', color: '#444', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' };
const inputStyle = { padding: '10px 12px', border: '1px solid #e2ddd5', borderRadius: '10px', fontSize: '12px', background: '#faf8f5', outline: 'none' };

export default function CartDrawer() {
  const {
    cart, cartOpen, setCartOpen, removeFromCart, clearCart, bagNotice, setBagNotice,
    weddingDate, setWeddingDate, brideUser, setAuthModalOpen, t, lang,
  } = useStore();
  const router = useRouter();
  const a = t.availability;
  const isAr = lang === 'ar';

  const today = shopNow().date;
  const [visitDate, setVisitDate] = useState(today);
  const [visitTime, setVisitTime] = useState(VISIT_TIME_SLOTS[0]);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [fullyBookedSlots, setFullyBookedSlots] = useState([]);
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [availability, setAvailability] = useState({ loading: false, error: false, data: null });
  const weddingInputRef = useRef(null);

  const [bookingResult, setBookingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setVisitDate(readVisitDate(shopNow().date)); }, []);
  useEffect(() => {
    try { localStorage.setItem('sophia_visit_date', visitDate); } catch (e) {}
  }, [visitDate]);

  useEffect(() => {
    if (cartOpen) {
      document.body.style.overflow = 'hidden';
      setBookingResult(null);
      setError('');
    } else {
      document.body.style.overflow = '';
      setBagNotice('');
    }
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen, setBagNotice]);

  // Slots that already hold 4 visits on this date (API returns "15:30" style times)
  useEffect(() => {
    if (!cartOpen || !visitDate) return;
    fetch(`${API_BASE}/public/fully-booked-slots?date=${visitDate}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setFullyBookedSlots(Array.isArray(data) ? data : []))
      .catch(() => setFullyBookedSlots([]));
  }, [cartOpen, visitDate, slotsVersion]);

  const now = shopNow();
  const availableSlots = VISIT_TIME_SLOTS.filter((slot) => {
    const time = to24h(slot);
    if (fullyBookedSlots.includes(time)) return false;
    return !(visitDate === now.date && time <= now.time);
  });
  const availableKey = availableSlots.join(',');

  // Keep the selected time valid when the date or the booked slots change
  useEffect(() => {
    if (availableSlots.length > 0 && !availableSlots.includes(visitTime)) setVisitTime(availableSlots[0]);
  }, [availableKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live availability of the dresses in the bag for her visit date and wedding date
  const dressKey = cart.map((x) => x.id).join(',');
  useEffect(() => {
    if (!cartOpen || cart.length === 0 || (!visitDate && !weddingDate)) {
      setAvailability({ loading: false, error: false, data: null });
      return;
    }
    let cancelled = false;
    setAvailability((prev) => ({ ...prev, loading: true, error: false }));
    const timer = setTimeout(() => {
      checkAvailability({
        dress_ids: cart.map((x) => x.id),
        visit_date: visitDate || undefined,
        wedding_date: weddingDate || undefined,
        city: brideUser?.city,
        client_id: brideUser?.id,
      })
        .then((data) => !cancelled && setAvailability({ loading: false, error: false, data }))
        .catch(() => !cancelled && setAvailability({ loading: false, error: true, data: null }));
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [cartOpen, dressKey, visitDate, weddingDate, brideUser?.id, brideUser?.city]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cartOpen) return null;

  const rowsById = Object.fromEntries((availability.data?.dresses || []).map((r) => [r.dress_id, r]));
  const isBlocking = (row) => row && ((row.wedding_date && !row.wedding_date.available) || (row.visit_date && !row.visit_date.available));
  const hasBlocking = cart.some((item) => isBlocking(rowsById[item.id]));
  const hasVisitConflict = cart.some((item) => rowsById[item.id]?.visit_date && !rowsById[item.id].visit_date.available);
  const suggestedDate = availability.data?.suggested_visit_date;
  const totalTryingFee = cart.reduce((sum, item) => sum + parseFloat(rowsById[item.id]?.trying_fee ?? item.trying_fee ?? 0), 0);

  const visitStatusText = (vd) => {
    if (!vd || vd.available) return null;
    switch (vd.reason_code) {
      case 'booked': return a.tryBooked(vd.available_from);
      case 'overdue': return a.tryOverdue;
      default: return null;
    }
  };

  const focusWeddingDate = () => {
    weddingInputRef.current?.focus();
    weddingInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const chooseAnotherDress = (id) => {
    removeFromCart(id);
    setCartOpen(false);
    router.push('/collections');
  };

  const handleBookVisit = async () => {
    if (!brideUser) {
      setCartOpen(false);
      setAuthModalOpen(true);
      return;
    }
    if (!visitDate) {
      setError(isAr ? 'يرجى اختيار تاريخ زيارة الأتيليه' : 'Please choose your preferred boutique visit date');
      return;
    }
    if (!weddingDate) {
      setError(isAr ? 'يرجى تحديد تاريخ الزفاف للتأكد من المواعيد' : 'Please choose your wedding / event date');
      focusWeddingDate();
      return;
    }
    if (hasBlocking) {
      setError(a.fixToContinue);
      return;
    }
    if (!rulesAccepted) {
      setError(isAr ? 'يرجى الموافقة على شروط وقواعد الزيارة أولاً' : 'Please acknowledge and accept boutique visit rules.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/public/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: brideUser.id,
          client_name: brideUser.name || 'Bride User',
          client_phone: brideUser.phone || '0000000000',
          client_email: brideUser.email || null,
          client_city: brideUser.city || 'Cairo',
          visit_date: visitDate,
          time_slot: visitTime,
          wedding_date: weddingDate,
          dress_ids: cart.map((item) => item.id),
          notes: `Visit booking for ${cart.length} dresses. Wedding date: ${weddingDate}.`,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Something changed since the bag was checked: show the fresh situation
        if (data.code === 'dresses_unavailable' && data.availability) {
          setAvailability({ loading: false, error: false, data: data.availability });
          setError(a.fixToContinue);
        } else if (data.code === 'slot_full') {
          setSlotsVersion((v) => v + 1);
          setError(a.slotFull);
        } else if (data.code === 'slot_in_past') {
          setError(a.slotPast);
        } else if (res.status === 429) {
          setError(a.tooManyAttempts);
        } else {
          setError(data.message || (isAr ? 'تعذر إرسال الطلب، حاولي مرة أخرى.' : 'Booking submission failed. Please try again.'));
        }
        return;
      }

      setBookingResult({ autoConfirmed: Boolean(data.auto_confirmed) });
      clearCart();
      setRulesAccepted(false);
    } catch (err) {
      setError(isAr ? 'تعذر إرسال الطلب، حاولي مرة أخرى.' : 'Booking submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={() => setCartOpen(false)}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t.cart.title} ({cart.length}/{MAX_BAG_DRESSES})</h3>
          <button className={styles.closeBtn} onClick={() => setCartOpen(false)} aria-label="Close"><X size={20} /></button>
        </div>

        {bookingResult ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <CheckCircle size={56} style={{ color: '#10b981', marginBottom: '16px' }} />
            <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '26px', marginBottom: '8px' }}>
              {bookingResult.autoConfirmed ? a.confirmedTitle : a.pendingTitle}
            </h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px', lineHeight: '1.5' }}>
              {bookingResult.autoConfirmed ? a.confirmedDesc : a.pendingDesc}
            </p>
            <button
              style={{ padding: '12px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              onClick={() => { setCartOpen(false); window.location.href = '/track'; }}
            >
              {t.nav.myJourney}
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className={styles.empty}>
            {bagNotice && <p className={styles.notice}>{bagNotice}</p>}
            <p>{t.cart.empty}</p>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>{t.quickView.maxDressesNote}</p>
            <button className={styles.shopBtn} onClick={() => setCartOpen(false)}>{t.cart.startBrowsing}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            <div className={styles.items}>
              <div style={{ background: '#faf8f5', padding: '12px 14px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #efebe4', fontSize: '12px', color: '#666' }}>
                {t.cart.subtitle}
              </div>
              {bagNotice && <p className={styles.notice} role="status">{bagNotice}</p>}
              {availability.loading && (
                <p className={styles.checking}><Loader2 size={13} className={styles.spin} /> {a.checking}</p>
              )}
              {availability.error && <p className={styles.notice}>{a.checkFailed}</p>}

              {cart.map((item) => {
                const row = rowsById[item.id];
                const vd = row?.visit_date;
                const wd = row?.wedding_date;
                const visitText = visitStatusText(vd);
                const blocking = isBlocking(row);
                return (
                  <div key={item.id} className={`${styles.item} ${blocking ? styles.itemBlocked : ''}`}>
                    {isVideoUrl(item.image) ? (
                    <video src={item.image} className={styles.itemImage} muted loop autoPlay playsInline aria-label={item.name} />
                  ) : (
                    <Image src={item.image} alt={item.name} width={80} height={100} className={styles.itemImage} />
                  )}
                    <div className={styles.itemInfo}>
                      <h4 className={styles.itemName}>{isAr && item.name_ar ? item.name_ar : item.name}</h4>
                      <p className={styles.itemMeta}>
                        {a.tryingFee}: {parseFloat(row?.trying_fee ?? item.trying_fee ?? 0) > 0 ? `${parseFloat(row?.trying_fee ?? item.trying_fee).toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}` : a.free}
                      </p>

                      {vd && (
                        <p className={vd.available ? styles.statusOk : styles.statusBad}>
                          {vd.available ? '✓' : '✗'} {a.tryDay}: {vd.available ? a.available : visitText}
                        </p>
                      )}
                      {wd && (
                        <p className={wd.available ? styles.statusOk : styles.statusBad}>
                          {wd.available ? '✓' : '✗'} {a.weddingDay}: {wd.available ? a.available : a.bookedOnDate}
                          {!wd.available && wd.available_from && <> · {a.availableFrom(wd.available_from)}</>}
                        </p>
                      )}
                      {wd && !wd.available && (
                        <div className={styles.fixActions}>
                          <button type="button" className={styles.fixBtn} onClick={focusWeddingDate}>{a.changeWeddingDate}</button>
                          <button type="button" className={styles.fixBtn} onClick={() => chooseAnotherDress(item.id)}>{a.chooseAnother}</button>
                        </div>
                      )}
                    </div>
                    <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)} aria-label={t.cart.remove}><Trash2 size={16} /></button>
                  </div>
                );
              })}

              {hasVisitConflict && suggestedDate && suggestedDate !== visitDate && (
                <button type="button" className={styles.suggestBtn} onClick={() => setVisitDate(suggestedDate)}>
                  <Calendar size={14} /> {a.useSuggestedDate(suggestedDate)}
                </button>
              )}
            </div>

            {/* Visit Details Section */}
            <div className={styles.footer}>
              {error && <div role="alert" style={{ background: '#fdf2f2', color: '#9b1c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '10px', textAlign: 'center' }}>{error}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {/* 1. VISIT DATE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="bag-visit-date" style={labelStyle}>
                    <Calendar size={12} /> {isAr ? '1. تاريخ الزيارة' : '1. Preferred Visit Date'}
                  </label>
                  <input
                    id="bag-visit-date"
                    type="date"
                    min={today}
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* 2. VISIT TIME SLOT (01:00 PM to 08:30 PM, 30 Mins Each, Max 4 Visits Limit) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="bag-visit-time" style={labelStyle}>
                    <Clock size={12} /> {isAr ? '2. وقت الزيارة (01:00 م – 08:30 م)' : '2. Preferred Visit Time (01:00 PM – 08:30 PM)'}
                  </label>
                  {availableSlots.length > 0 ? (
                    <select id="bag-visit-time" dir="ltr" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} style={inputStyle}>
                      {availableSlots.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ padding: '10px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', fontSize: '11px', color: '#e11d48', fontWeight: '600' }}>
                      {a.noSlots}
                    </div>
                  )}
                </div>

                {/* 3. WEDDING / EVENT DATE (shared with the catalog badges) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="bag-wedding-date" style={labelStyle}>
                    <Heart size={12} /> {isAr ? '3. تاريخ الزفاف' : '3. Your Wedding / Event Date'}
                  </label>
                  <input
                    id="bag-wedding-date"
                    ref={weddingInputRef}
                    type="date"
                    min={today}
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {totalTryingFee > 0 && (
                  <div className={styles.totalRow}>
                    <span>{t.cart.tryingFee}</span>
                    <span className={styles.totalPrice}>{totalTryingFee.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                )}

                {/* 4. BOUTIQUE VISIT RULES ACKNOWLEDGEMENT */}
                <div style={{ background: '#fcf8f2', border: '1.5px solid #eab308', borderRadius: '14px', padding: '16px 18px', marginTop: '6px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#854d0e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={18} /> BOUTIQUE VISIT RULES (شروط وقواعد الزيارة)
                  </div>
                  <ul style={{ fontSize: '14px', fontWeight: '600', color: '#334155', margin: '0 0 12px 0', paddingInlineStart: '20px', lineHeight: '1.8' }}>
                    <li>مسموح بدخول فردين فقط مع العروسة (Ladies only)</li>
                    <li>الدخول بأولوية الحضور</li>
                    <li>ممنوع اصطحاب الأطفال</li>
                  </ul>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '800', color: '#0f172a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rulesAccepted}
                      onChange={(e) => setRulesAccepted(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#ca8a04', cursor: 'pointer' }}
                    />
                    {isAr ? 'قرأت ووافقت على كافة شروط وقواعد الزيارة' : 'I have read and agree to all boutique visit rules'}
                  </label>
                </div>
              </div>

              {hasBlocking && <p className={styles.blockedNote}>{a.fixToContinue}</p>}
              <button
                className={styles.checkoutBtn}
                onClick={handleBookVisit}
                disabled={loading || availableSlots.length === 0 || hasBlocking || availability.loading}
              >
                {loading ? (isAr ? 'جاري الإرسال...' : 'BOOKING VISIT...') : (isAr ? 'احجزي موعد تجربة الفساتين' : 'BOOK A VISIT FOR MY DRESSES')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
