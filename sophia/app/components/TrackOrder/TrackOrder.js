'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Check,
  Scissors,
  Shirt,
  Users,
  Calendar,
  Clock,
  MapPin,
  User,
  ArrowRight,
  MessageCircle,
  Phone,
  LogOut,
  Sparkles,
  Heart,
} from 'lucide-react';
import { useScrollAnimation } from '../ScrollAnimations/useScrollAnimation';
import { useStore } from '../../context/StoreContext';
import styles from './TrackOrder.module.css';

/* ── BRIDE JOURNEY STAGES ── */
const BRIDE_JOURNEY_STAGES = [
  { id: 'visit', label: '1. Visit &\nConsultation', icon: Calendar, desc: 'Boutique visit & gown selection' },
  { id: 'fitting', label: '2. Fitting &\nMeasurements', icon: Scissors, desc: 'Detailed measurements & fitting' },
  { id: 'booking', label: '3. Booking\nConfirmed', icon: Check, desc: 'Contract & gown reserved' },
  { id: 'picked_up', label: '4. Gown\nPickup', icon: Shirt, desc: 'Delivered for your big day' },
  { id: 'returned', label: '5. Returned &\nCompleted', icon: Heart, desc: 'Event completed with love' },
];

export default function TrackOrder() {
  const { brideUser, logoutBride, setAuthModalOpen, t, lang } = useStore();
  const [clientData, setClientData] = useState(null);

  const progressRef = useScrollAnimation();
  const detailsRef = useScrollAnimation();
  const conciergeRef = useScrollAnimation();

  useEffect(() => {
    if (brideUser) {
      setClientData(null);
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const payload = brideUser.id
        ? { phone: brideUser.phone, email: brideUser.email, client_id: brideUser.id }
        : { phone: brideUser.phone, email: brideUser.email };

      fetch(`${API_BASE}/public/find-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.id) setClientData(data);
          else setClientData(brideUser);
        })
        .catch(() => setClientData(brideUser));
    } else {
      setClientData(null);
    }
  }, [brideUser]);

  if (!brideUser) {
    return (
      <div className={styles.page} style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', background: '#fff', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
          <User size={48} style={{ color: '#c8a96a', marginBottom: '16px' }} />
          <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '28px', marginBottom: '12px', textTransform: 'uppercase' }}>{t.track.title}</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
            {t.track.loginNotice}
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            style={{
              padding: '14px 28px',
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '1px',
              cursor: 'pointer',
            }}
          >
            {t.nav.account}
          </button>
        </div>
      </div>
    );
  }

  // Determine current stage from clientData.current_stage (visit -> fitting -> booking -> picked_up -> returned)
  const currentStage = clientData?.current_stage || 'visit';

  const getStageIndex = (stage) => {
    switch (stage) {
      case 'visit':
        return 0;
      case 'fitting':
        return 1;
      case 'booking':
        return 2;
      case 'ready_for_pickup':
      case 'picked_up':
      case 'out':
        return 3;
      case 'returned':
      case 'cleaning':
      case 'dry_clean':
        return 4;
      default:
        return 0;
    }
  };

  const activeIndex = getStageIndex(currentStage);
  const latestBooking = clientData?.bookings && clientData.bookings.length > 0 ? clientData.bookings[0] : null;
  const currentDress = latestBooking?.dress;

  // Active visit or fitting info
  const latestVisit = clientData?.visits && clientData.visits.length > 0 ? clientData.visits[0] : null;
  const latestFitting = clientData?.fittings && clientData.fittings.length > 0 ? clientData.fittings[0] : null;

  const brideJourneyStages = [
    { id: 'visit', label: t.track.stages.visit, icon: Calendar, desc: 'Boutique visit & gown selection' },
    { id: 'fitting', label: t.track.stages.fitting, icon: Scissors, desc: 'Detailed measurements & fitting' },
    { id: 'booking', label: t.track.stages.booking, icon: Check, desc: 'Contract & gown reserved' },
    { id: 'picked_up', label: t.track.stages.pickup, icon: Shirt, desc: 'Delivered for your big day' },
    { id: 'returned', label: t.track.stages.return, icon: Heart, desc: 'Event completed with love' },
  ];

  return (
    <div className={styles.page}>
      {/* ── BRIDE ACCOUNT HEADER ── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 20px', padding: '0 20px' }}>
        <div style={{ background: '#fff', padding: '24px 30px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', border: '1px solid #efebe4' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#c8a96a', letterSpacing: '1.5px', textTransform: 'uppercase' }}>{t.track.welcome}</span>
            <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '32px', fontWeight: '600', margin: '4px 0 0', color: '#111' }}>
              {clientData?.name || brideUser.name}
            </h1>
            <p style={{ fontSize: '13px', color: '#777', margin: '4px 0 0' }}>
              {t.contact.phone}: {clientData?.phone || brideUser.phone} {clientData?.city ? `| ${clientData.city}` : ''}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {currentDress && (
              <div style={{ background: '#faf8f5', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e8e3d9', fontSize: '12px', fontWeight: '600' }}>
                <span style={{ color: '#888' }}>Selected Gown:</span> <strong style={{ color: '#111' }}>{currentDress.name}</strong>
              </div>
            )}
            <button
              onClick={logoutBride}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                background: '#fcf2f2',
                border: '1px solid #f5c6c6',
                color: '#c53030',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          1. YOUR JOURNEY STAGES (MATCHES DASHBOARD)
          ═══════════════════════════════════════ */}
      <section className={styles.progressSection} ref={progressRef}>
        <span className={styles.sectionLabel}>YOUR BRIDE JOURNEY STAGE</span>

        {/* Horizontal Stepper */}
        <div className={styles.stepper}>
          {BRIDE_JOURNEY_STAGES.map((step, i) => {
            const isCompleted = i < activeIndex;
            const isCurrent = i === activeIndex;
            const statusClass = isCompleted ? styles.stepCompleted : isCurrent ? styles.stepCurrent : styles.stepUpcoming;

            return (
              <div key={step.id} className={styles.stepCol}>
                {i > 0 && <div className={`${styles.connector} ${i <= activeIndex ? styles.connectorFilled : ''}`} />}
                <div className={`${styles.stepCircle} ${statusClass}`}>
                  {isCompleted ? <Check size={18} strokeWidth={2.5} /> : <step.icon size={18} strokeWidth={1.5} />}
                </div>
                <span className={styles.stepLabel}>{step.label}</span>
                <span className={styles.stepDate}>{isCompleted ? 'Completed' : isCurrent ? 'Active Stage' : 'Upcoming'}</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendCompleted}`} /> Completed
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendCurrent}`} /> Active Stage
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendUpcoming}`} /> Upcoming
          </span>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          2. APPOINTMENT / FITTING / PICKUP DETAILS & LOGS
          ═══════════════════════════════════════ */}
      <section className={styles.detailsSection} ref={detailsRef}>
        <div className={styles.detailsGrid}>
          {/* ── LEFT: STAGE SPECIFIC DETAILS ── */}
          <div className={styles.appointmentCard}>
            {currentStage === 'returned' ? (
              <>
                <span className={styles.cardLabel} style={{ color: '#059669' }}>💖 STAGE 5: GOWN RETURNED & COMPLETED</span>
                <h3 className={styles.appointmentHeading}>Thank You for Choosing Sophia Dresses!</h3>
                <div className={styles.appointmentMeta}>
                  <div className={styles.metaRow}>
                    <Shirt size={18} strokeWidth={1.4} className={styles.metaIcon} />
                    <div>
                      <span className={styles.metaTitle}>Worn Gown</span>
                      <span className={styles.metaValue}>{currentDress?.name || 'Luxury Wedding Gown'}</span>
                    </div>
                  </div>
                  <div className={styles.metaRow}>
                    <Heart size={18} strokeWidth={1.4} className={styles.metaIcon} />
                    <div>
                      <span className={styles.metaTitle}>Journey Status</span>
                      <span className={styles.metaValue}>Successfully Returned & Insurance Refunded</span>
                    </div>
                  </div>
                </div>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '14px 16px', marginTop: '16px', fontSize: '12px', color: '#065f46', lineHeight: '1.5' }}>
                  <strong>Congratulations Bride!</strong> We wish you a lifetime of love and happiness. If you have photos from your special day, we would love to feature your story in our Real Brides Gallery!
                </div>
              </>
            ) : currentStage === 'picked_up' ? (
              <>
                <span className={styles.cardLabel} style={{ color: '#059669' }}>✨ STAGE 4: GOWN PICKUP</span>
                <h3 className={styles.appointmentHeading}>
                  {latestBooking?.status === 'picked_up' || currentDress?.status === 'out'
                    ? 'Gown Handed Over for Your Big Day!'
                    : 'Your Dress is Ready to Pick Up!'}
                </h3>
                {(() => {
                  const weddingDateRaw = latestBooking?.event_date || clientData?.wedding_date || '';
                  const weddingDateStr = weddingDateRaw ? weddingDateRaw.split('T')[0] : '';
                  const isCairo = !clientData?.city || clientData.city.includes('القاهرة') || clientData.city.toLowerCase().includes('cairo');
                  const pickupDaysBefore = isCairo ? 1 : 2;
                  let pickupDateStr = weddingDateStr;
                  if (weddingDateStr) {
                    try {
                      const parts = weddingDateStr.split('-');
                      if (parts.length >= 3) {
                        const y = parseInt(parts[0], 10);
                        const m = parseInt(parts[1], 10) - 1;
                        const d = parseInt(parts[2], 10);
                        const pD = new Date(y, m, d - pickupDaysBefore);
                        const dd = String(pD.getDate()).padStart(2, '0');
                        const mm = String(pD.getMonth() + 1).padStart(2, '0');
                        pickupDateStr = `${pD.getFullYear()}-${mm}-${dd}`;
                      }
                    } catch (e) {}
                  }

                  return (
                    <div className={styles.appointmentMeta}>
                      <div className={styles.metaRow}>
                        <Shirt size={18} strokeWidth={1.4} className={styles.metaIcon} />
                        <div>
                          <span className={styles.metaTitle}>Selected Gown</span>
                          <span className={styles.metaValue}>{currentDress?.name || 'Luxury Wedding Dress'}</span>
                        </div>
                      </div>
                      <div className={styles.metaRow}>
                        <Calendar size={18} strokeWidth={1.4} className={styles.metaIcon} />
                        <div>
                          <span className={styles.metaTitle}>Scheduled Pickup Date</span>
                          <span className={styles.metaValue}>{pickupDateStr || 'Scheduled via Studio'}</span>
                        </div>
                      </div>
                      <div className={styles.metaRow}>
                        <Calendar size={18} strokeWidth={1.4} className={styles.metaIcon} />
                        <div>
                          <span className={styles.metaTitle}>Wedding / Event Date</span>
                          <span className={styles.metaValue}>{weddingDateStr || 'Upcoming Event'}</span>
                        </div>
                      </div>
                      <div className={styles.metaRow}>
                        <MapPin size={18} strokeWidth={1.4} className={styles.metaIcon} />
                        <div>
                          <span className={styles.metaTitle}>Boutique Location</span>
                          <span className={styles.metaValue}>First Settlement, Al-Yasmeen 2, Villa 161 (basement)</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '12px 16px', marginTop: '16px', fontSize: '12px', color: '#065f46' }}>
                  {latestBooking?.status === 'picked_up' || currentDress?.status === 'out' ? (
                    <span><strong>Enjoy Your Wedding Day!</strong> Please return the gown within 1 day after your event. Your deposit/insurance will be refunded upon clean return!</span>
                  ) : (
                    <span><strong>Welcome to Boutique:</strong> Your gown is pressed and ready for collection! Please bring your ID and contract receipt.</span>
                  )}
                </div>
              </>
            ) : currentStage === 'booking' ? (
              <>
                <span className={styles.cardLabel} style={{ color: '#059669' }}>✨ STAGE 3: BOOKING CONFIRMED</span>
                <h3 className={styles.appointmentHeading}>Your Wedding Dress is Officially Reserved!</h3>
                <div className={styles.appointmentMeta}>
                  <div className={styles.metaRow}>
                    <Shirt size={18} strokeWidth={1.4} className={styles.metaIcon} />
                    <div>
                      <span className={styles.metaTitle}>Reserved Wedding Gown</span>
                      <span className={styles.metaValue}>{currentDress?.name || 'Luxury Wedding Dress'}</span>
                    </div>
                  </div>
                  <div className={styles.metaRow}>
                    <Calendar size={18} strokeWidth={1.4} className={styles.metaIcon} />
                    <div>
                      <span className={styles.metaTitle}>Wedding / Event Date</span>
                      <span className={styles.metaValue}>
                        {latestBooking?.event_date
                          ? latestBooking.event_date.split('T')[0]
                          : clientData?.wedding_date || 'Upcoming Event'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.metaRow}>
                    <Heart size={18} strokeWidth={1.4} className={styles.metaIcon} />
                    <div>
                      <span className={styles.metaTitle}>Booking Payment Info</span>
                      <span className={styles.metaValue}>
                        Deposit Paid: ${latestBooking?.deposit_amount || '1000'} | Total: ${latestBooking?.total_amount || '3500'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.metaRow}>
                    <MapPin size={18} strokeWidth={1.4} className={styles.metaIcon} />
                    <div>
                      <span className={styles.metaTitle}>Atelier Location</span>
                      <span className={styles.metaValue}>First Settlement, Al-Yasmeen 2, Villa 161 (basement)</span>
                    </div>
                  </div>
                </div>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '12px 16px', marginTop: '16px', fontSize: '12px', color: '#065f46' }}>
                  <strong>Contract Confirmed:</strong> Your gown reservation is active in our studio. Our team will schedule your upcoming fitting sessions close to your wedding date!
                </div>
              </>
            ) : (
              <>
                <span className={styles.cardLabel}>APPOINTMENT & FITTING SCHEDULE</span>
                <h3 className={styles.appointmentHeading}>
                  {clientData?.fittings && clientData.fittings.length > 0
                    ? `Fittings (${clientData.fittings.length} Scheduled)`
                    : latestVisit
                    ? `Boutique Visit (${latestVisit.status === 'confirmed' ? 'confirmed' : 'waiting for confirmation'})`
                    : 'Studio Consultation'}
                </h3>

                <div className={styles.appointmentMeta}>
                  {clientData?.fittings && clientData.fittings.length > 0 ? (
                    clientData.fittings.map((fit, fitIdx) => {
                      const fitNum = fitIdx + 1;
                      const numLabel = fitNum === 1 ? '1st' : fitNum === 2 ? '2nd' : fitNum === 3 ? '3rd' : `${fitNum}th`;
                      const fitDateStr = fit.fitting_date ? fit.fitting_date.split('T')[0] : 'Scheduled';
                      return (
                        <div key={fit.id || fitIdx} style={{ background: '#faf8f5', padding: '14px 16px', borderRadius: '12px', border: '1px solid #efebe4', marginBottom: fitIdx < clientData.fittings.length - 1 ? '10px' : '0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#c8a96a', letterSpacing: '1px' }}>
                              {numLabel.toUpperCase()} FITTING SCHEDULE
                            </span>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: fit.status === 'completed' ? '#dcfce7' : '#fef3c7', color: fit.status === 'completed' ? '#15803d' : '#b45309', fontWeight: '600' }}>
                              {fit.status || 'scheduled'}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#111', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} style={{ color: '#888' }} /> {fitDateStr} {fit.time_slot ? `(${fit.time_slot})` : ''}
                          </div>
                          {fit.additional_notes && (
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                              {fit.additional_notes}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.metaRow}>
                      <Calendar size={18} strokeWidth={1.4} className={styles.metaIcon} />
                      <div>
                        <span className={styles.metaTitle}>Date & Time</span>
                        <span className={styles.metaValue}>
                          {latestVisit
                            ? `${latestVisit.visit_date ? latestVisit.visit_date.split('T')[0] : 'Scheduled'} (${latestVisit.time_slot || '12:00 PM'})`
                            : 'Scheduled via Website'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className={styles.metaRow} style={{ marginTop: '14px' }}>
                    <MapPin size={18} strokeWidth={1.4} className={styles.metaIcon} />
                    <div>
                      <span className={styles.metaTitle}>Boutique Location</span>
                      <span className={styles.metaValue}>First Settlement, Al-Yasmeen 2, Villa 161 (basement)</span>
                    </div>
                  </div>
                  <div className={styles.metaRow}>
                    <div className={styles.stylistAvatar}>
                      <User size={18} strokeWidth={1.4} />
                    </div>
                    <div>
                      <span className={styles.metaTitle}>Assigned Tailor / Stylist</span>
                      <span className={styles.metaValue}>{latestFitting?.tailor_name || 'Sophia Atelier Stylist'}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.appointmentActions}>
                  <a href="/contact" className={styles.rescheduleBtn} style={{ textDecoration: 'none', textAlign: 'center' }}>BOOK NEW FITTING</a>
                  <a
                    href="https://www.google.com/maps?ll=30.047744,31.445114&z=15&t=m&hl=en-US&gl=US&mapclient=embed&q=30%C2%B002%2751.9%22N+31%C2%B026%2742.4%22E+30.047744,+31.445114@30.047744,31.445114"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.directionsBtn}
                    style={{ textDecoration: 'none' }}
                  >
                    VIEW MAP DIRECTIONS <ArrowRight size={14} />
                  </a>
                </div>
              </>
            )}
          </div>

          {/* ── RIGHT: LIVE HISTORY & UPDATES ── */}
          <div className={styles.updatesCard}>
            <span className={styles.cardLabel}>LIVE JOURNEY UPDATES</span>

            <div className={styles.timeline}>
              {clientData?.bookings && clientData.bookings.length > 0 ? (
                clientData.bookings.map((booking, idx) => {
                  const cleanDate = (booking.booking_date || booking.pickup_date || 'Booking').toString().split('T')[0];
                  return (
                    <div key={booking.id || idx} className={styles.timelineItem}>
                      <div className={styles.timelineDate}>
                        <span className={styles.timelineDateText}>{cleanDate}</span>
                        <span className={styles.timelineTime}>{booking.status}</span>
                      </div>

                      <div className={styles.timelineDotCol}>
                        <span className={`${styles.timelineDot} ${idx === 0 ? styles.timelineDotActive : ''}`} />
                        {idx < clientData.bookings.length - 1 && <span className={styles.timelineLine} />}
                      </div>

                      <div className={styles.timelineContent}>
                        <h5 className={styles.timelineTitle}>
                          {booking.dress?.name
                            ? `Gown: ${booking.dress.name}`
                            : `Booking #${booking.id}`}
                        </h5>
                        <p className={styles.timelineDesc}>
                          Rental: ${booking.rental_price || booking.total_amount || '0'} | Status: {booking.status}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : clientData?.visits && clientData.visits.length > 0 ? (
                clientData.visits.map((visit, idx) => (
                  <div key={visit.id || idx} className={styles.timelineItem}>
                    <div className={styles.timelineDate}>
                      <span className={styles.timelineDateText}>{visit.visit_date}</span>
                      <span className={styles.timelineTime}>{visit.status}</span>
                    </div>

                    <div className={styles.timelineDotCol}>
                      <span className={`${styles.timelineDot} ${idx === 0 ? styles.timelineDotActive : ''}`} />
                      {idx < clientData.visits.length - 1 && <span className={styles.timelineLine} />}
                    </div>

                    <div className={styles.timelineContent}>
                      <h5 className={styles.timelineTitle}>Boutique Visit Scheduled</h5>
                      <p className={styles.timelineDesc}>
                        {visit.notes || 'Visit booked successfully via website.'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDate}>
                    <span className={styles.timelineDateText}>Today</span>
                    <span className={styles.timelineTime}>Active</span>
                  </div>
                  <div className={styles.timelineDotCol}>
                    <span className={`${styles.timelineDot} ${styles.timelineDotActive}`} />
                  </div>
                  <div className={styles.timelineContent}>
                    <h5 className={styles.timelineTitle}>Account Connected</h5>
                    <p className={styles.timelineDesc}>
                      Your account is active. When staff update your fitting date or move your bride card in the dashboard, changes will immediately reflect here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          3. BRIDAL CONCIERGE BANNER
          ═══════════════════════════════════════ */}
      <section className={styles.conciergeSection} ref={conciergeRef}>
        <div className={styles.conciergeBanner}>
          <div className={styles.conciergeImageWrap}>
            <Image src="/images/about.png" alt="Your Bridal Concierge" fill quality={90} className={styles.conciergeImage} />
          </div>

          <div className={styles.conciergeContent}>
            <span className={styles.conciergeEyebrow}>WE ARE HERE FOR YOU</span>
            <h3 className={styles.conciergeHeading}>Your Bridal Concierge</h3>
            <p className={styles.conciergeText}>
              Have questions about your fitting or alterations? Connect directly with our atelier.
            </p>
            <div className={styles.conciergeButtons}>
              <a href="https://wa.me/201554159359" target="_blank" rel="noopener noreferrer" className={styles.conciergeBtnPrimary} style={{ textDecoration: 'none' }}>
                <MessageCircle size={15} /> WHATSAPP STYLIST
              </a>
              <a href="tel:+201554159359" className={styles.conciergeBtnOutline} style={{ textDecoration: 'none' }}>
                <Phone size={15} /> CALL BOUTIQUE
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
