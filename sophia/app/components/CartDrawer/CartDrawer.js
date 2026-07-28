'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, Minus, Plus, Trash2, Calendar, Clock, CheckCircle, AlertCircle, Heart } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import styles from './CartDrawer.module.css';

/* ── 30-MINUTE VISIT SLOTS FROM 01:00 PM TO 08:30 PM (MAX 4 PER SLOT) ── */
const VISIT_TIME_SLOTS = [
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM',
  '06:30 PM',
  '07:00 PM',
  '07:30 PM',
  '08:00 PM',
  '08:30 PM',
];

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeFromCart, updateCartQty, brideUser, setAuthModalOpen, t, lang } = useStore();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [visitDate, setVisitDate] = useState(todayStr);
  const [visitTime, setVisitTime] = useState('01:00 PM');
  const [weddingDate, setWeddingDate] = useState('');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [fullyBookedSlots, setFullyBookedSlots] = useState([]);
  
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cartOpen) {
      document.body.style.overflow = 'hidden';
      setBookingSuccess(false);
      setError('');
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen]);

  // Fetch fully booked slots (4 visits limit) whenever visitDate changes
  useEffect(() => {
    if (visitDate) {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      fetch(`${API_BASE}/public/fully-booked-slots?date=${visitDate}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setFullyBookedSlots(data);
            const available = VISIT_TIME_SLOTS.filter((s) => !data.includes(s));
            if (available.length > 0 && data.includes(visitTime)) {
              setVisitTime(available[0]);
            }
          }
        })
        .catch(() => setFullyBookedSlots([]));
    }
  }, [visitDate, visitTime]);

  if (!cartOpen) return null;

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  const availableSlots = VISIT_TIME_SLOTS.filter((slot) => !fullyBookedSlots.includes(slot));

  const handleBookVisit = async () => {
    if (!brideUser) {
      setCartOpen(false);
      setAuthModalOpen(true);
      return;
    }

    if (!visitDate) {
      setError(lang === 'ar' ? 'يرجى اختيار تاريخ زيارة الأتيليه' : 'Please choose your preferred boutique visit date');
      return;
    }

    if (!weddingDate) {
      setError(lang === 'ar' ? 'يرجى تحديد تاريخ الزفاف للتأكد من المواعيد' : 'Please choose your wedding / event date');
      return;
    }

    if (!rulesAccepted) {
      setError(lang === 'ar' ? 'يرجى الموافقة على شروط وقواعد الزيارة أولاً' : 'Please acknowledge and accept boutique visit rules.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const dressIds = cart.map((item) => item.id);

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
          dress_ids: dressIds,
          notes: `Visit booking for ${totalItems} dresses. Wedding date: ${weddingDate}.`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to book visit');
      }

      setBookingSuccess(true);
    } catch (err) {
      setError(err.message || 'Booking submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={() => setCartOpen(false)}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t.cart.title} ({totalItems}/3)</h3>
          <button className={styles.closeBtn} onClick={() => setCartOpen(false)} aria-label="Close"><X size={20} /></button>
        </div>

        {bookingSuccess ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <CheckCircle size={56} style={{ color: '#10b981', marginBottom: '16px' }} />
            <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '26px', marginBottom: '8px' }}>
              {lang === 'ar' ? 'تم حجز موعد الزيارة بنجاح!' : 'VISIT BOOKED SUCCESSFULLY!'}
            </h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px', lineHeight: '1.5' }}>
              {lang === 'ar' ? 'تم إرسال طلب حجز الزيارة. يمكنكِ متابعة حالة حجزكِ من حسابكِ.' : 'Your boutique visit request has been sent. You can track your appointment status.'}
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

              {cart.map((item) => (
                <div key={item.id} className={styles.item}>
                  <Image src={item.image} alt={item.name} width={80} height={100} className={styles.itemImage} />
                  <div className={styles.itemInfo}>
                    <h4 className={styles.itemName}>{lang === 'ar' && item.name_ar ? item.name_ar : item.name}</h4>
                    <p className={styles.itemPrice}>{item.price}</p>
                    <div className={styles.qtyRow}>
                      <button className={styles.qtyBtn} onClick={() => updateCartQty(item.id, item.qty - 1)}><Minus size={14} /></button>
                      <span className={styles.qtyNum}>{item.qty}</span>
                      <button className={styles.qtyBtn} onClick={() => updateCartQty(item.id, item.qty + 1)}><Plus size={14} /></button>
                    </div>
                  </div>
                  <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)} aria-label="Remove"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            {/* Visit Details Section */}
            <div className={styles.footer}>
              {error && <div style={{ background: '#fdf2f2', color: '#9b1c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '10px', textAlign: 'center' }}>{error}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {/* 1. VISIT DATE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#444', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                    <Calendar size={12} /> 1. Preferred Visit Date
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #e2ddd5', borderRadius: '10px', fontSize: '12px', background: '#faf8f5', outline: 'none' }}
                  />
                </div>

                {/* 2. VISIT TIME SLOT (01:00 PM to 08:30 PM, 30 Mins Each, Max 4 Visits Limit) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#444', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                    <Clock size={12} /> 2. Preferred Visit Time (01:00 PM – 08:30 PM)
                  </label>
                  {availableSlots.length > 0 ? (
                    <select
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      style={{ padding: '10px 12px', border: '1px solid #e2ddd5', borderRadius: '10px', fontSize: '12px', background: '#faf8f5', outline: 'none' }}
                    >
                      {availableSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot} (Available)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ padding: '10px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', fontSize: '11px', color: '#e11d48', fontWeight: '600' }}>
                      All time slots are fully booked for this date. Please select another visit date.
                    </div>
                  )}
                </div>

                {/* 3. WEDDING / EVENT DATE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#444', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                    <Heart size={12} /> 3. Your Wedding / Event Date
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid #e2ddd5', borderRadius: '10px', fontSize: '12px', background: '#faf8f5', outline: 'none' }}
                  />
                </div>

                {/* 4. BOUTIQUE VISIT RULES ACKNOWLEDGEMENT */}
                <div style={{ background: '#fcf8f2', border: '1px solid #f0e6d6', borderRadius: '12px', padding: '12px 14px', marginTop: '4px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#854d0e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> BOUTIQUE VISIT RULES (شروط وقواعد الزيارة)
                  </div>
                  <ul style={{ fontSize: '11px', color: '#555', margin: '0 0 10px 0', paddingLeft: '16px', lineHeight: '1.6' }}>
                    <li>مسموح بدخول فردين فقط مع العروسة (Ladies only)</li>
                    <li>الدخول بأولوية الحضور</li>
                    <li>ممنوع اصطحاب الأطفال</li>
                  </ul>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', color: '#111', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rulesAccepted}
                      onChange={(e) => setRulesAccepted(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#c8a96a', cursor: 'pointer' }}
                    />
                    I have read and agree to all boutique visit rules
                  </label>
                </div>
              </div>

              <button
                className={styles.checkoutBtn}
                onClick={handleBookVisit}
                disabled={loading || availableSlots.length === 0}
              >
                {loading ? 'BOOKING VISIT...' : 'BOOK A VISIT FOR MY DRESSES'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
