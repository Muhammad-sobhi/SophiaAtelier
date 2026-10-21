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
import { useContactNumber } from '../../lib/useContactNumber';
import styles from './TrackOrder.module.css';

/* ── BRIDE JOURNEY: 4 steps. Fittings are optional and shown as information, never as a step ── */
const JOURNEY_STEPS = [
  { id: 'visit', icon: Calendar },
  { id: 'booking', icon: Check },
  { id: 'pickup', icon: Shirt },
  { id: 'return', icon: Heart },
];

// journey_step from the API -> index of the current step (4 = all done); "with_bride" = picked up, return pending
const STEP_PROGRESS = {
  visit: 0,
  booking: 1,
  pickup: 2,
  with_bride: 3,
  returned: 4,
};

export default function TrackOrder() {
  const { brideUser, logoutBride, setAuthModalOpen, t, lang } = useStore();
  const contact = useContactNumber();
  const [clientData, setClientData] = useState(null);

  const progressRef = useScrollAnimation();
  const detailsRef = useScrollAnimation();
  const conciergeRef = useScrollAnimation();

  useEffect(() => {
    if (brideUser) {
      setClientData(null);
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const payload = { phone: brideUser.phone, email: brideUser.email };

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

  // The step comes from the API (journey_step): the dashboard stage names are columns, not events
  const journeyStep = clientData?.journey_step || 'visit';
  const isCancelled = journeyStep === 'cancelled';
  const activeIndex = STEP_PROGRESS[journeyStep] ?? 0;
  const tj = t.track.journey;

  const latestBooking = clientData?.bookings && clientData.bookings.length > 0 ? clientData.bookings[0] : null;
  const currentDress = latestBooking?.dress;
  const currentDress2 = latestBooking?.dress2;
  const latestVisit = clientData?.visits && clientData.visits.length > 0 ? clientData.visits[0] : null;
  const fittings = clientData?.fittings || [];

  const dressNames = [latestBooking?.dress, latestBooking?.dress2, latestBooking?.dress3]
    .filter(Boolean)
    .map((d) => (lang === 'ar' && d.name_ar) || d.name)
    .join(' | ');
  const weddingDate = latestBooking?.event_date || clientData?.wedding_date || null;
  const money = (v) => `${Number(v || 0).toLocaleString()} ${tj.currency}`;

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
                <span style={{ color: '#888' }}>Selected Gown{currentDress2 ? 's' : ''}:</span> <strong style={{ color: '#111' }}>{currentDress.name}{currentDress2 ? ` & ${currentDress2.name}` : ''}</strong>
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
          1. YOUR JOURNEY STEPS (visit -> booking -> pickup -> return)
          ═══════════════════════════════════════ */}
      <section className={styles.progressSection} ref={progressRef}>
        <span className={styles.sectionLabel}>{tj.sectionLabel}</span>

        {isCancelled && (
          <div style={{ background: '#fcf2f2', border: '1px solid #f5c6c6', borderRadius: '12px', padding: '12px 16px', margin: '0 auto 20px', maxWidth: '640px', fontSize: '13px', color: '#9b2c2c', textAlign: 'center' }}>
            <strong>{tj.cancelledTitle}</strong> — {tj.cancelledNote}
          </div>
        )}

        {/* Horizontal Stepper: a cancelled booking shows no progress */}
        <div className={styles.stepper}>
          {JOURNEY_STEPS.map((step, i) => {
            const isCompleted = !isCancelled && i < activeIndex;
            const isCurrent = !isCancelled && i === activeIndex;
            const statusClass = isCompleted ? styles.stepCompleted : isCurrent ? styles.stepCurrent : styles.stepUpcoming;

            return (
              <div key={step.id} className={styles.stepCol}>
                {i > 0 && <div className={`${styles.connector} ${i <= activeIndex ? styles.connectorFilled : ''}`} />}
                <div className={`${styles.stepCircle} ${statusClass}`}>
                  {isCompleted ? <Check size={18} strokeWidth={2.5} /> : <step.icon size={18} strokeWidth={1.5} />}
                </div>
                <span className={styles.stepLabel}>{`${i + 1}. ${t.track.stages[step.id]}`}</span>
                <span className={styles.stepDate}>{isCompleted ? tj.completed : isCurrent ? tj.current : tj.upcoming}</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendCompleted}`} /> {tj.completed}
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendCurrent}`} /> {tj.current}
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendUpcoming}`} /> {tj.upcoming}
          </span>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          2. APPOINTMENT / FITTING / PICKUP DETAILS & LOGS
          ═══════════════════════════════════════ */}
      <section className={styles.detailsSection} ref={detailsRef}>
        <div className={styles.detailsGrid}>
          {/* ── LEFT: DETAILS OF THE CURRENT STEP ── */}
          <div className={styles.appointmentCard}>
            {(() => {
              const row = (Icon, title, value) => (
                <div className={styles.metaRow}>
                  <Icon size={18} strokeWidth={1.4} className={styles.metaIcon} />
                  <div>
                    <span className={styles.metaTitle}>{title}</span>
                    <span className={styles.metaValue}>{value}</span>
                  </div>
                </div>
              );
              const note = (text, tone = 'green') => (
                <div style={{
                  background: tone === 'green' ? '#ecfdf5' : '#faf8f5',
                  border: `1px solid ${tone === 'green' ? '#a7f3d0' : '#efebe4'}`,
                  borderRadius: '12px', padding: '12px 16px', marginTop: '16px', fontSize: '12px',
                  color: tone === 'green' ? '#065f46' : '#555', lineHeight: '1.5',
                }}>{text}</div>
              );
              const location = row(MapPin, tj.location, 'First Settlement, Al-Yasmeen 2, Villa 161 (basement)');

              const content = {
                visit: {
                  title: tj.visitTitle,
                  rows: latestVisit ? (
                    <>
                      {row(Calendar, tj.visitDate, `${latestVisit.visit_date}${latestVisit.time_slot ? ` (${latestVisit.time_slot})` : ''}`)}
                      {row(Clock, tj.status, latestVisit.status === 'pending' ? tj.visitPending : tj.visitConfirmed)}
                      {location}
                    </>
                  ) : location,
                  note: latestVisit ? null : note(tj.noVisit, 'plain'),
                },
                booking: {
                  title: tj.bookingTitle,
                  rows: (
                    <>
                      {row(Shirt, tj.dresses, dressNames || '—')}
                      {row(Calendar, tj.weddingDate, weddingDate || '—')}
                      {latestBooking && row(Heart, tj.payment, `${tj.deposit}: ${money(latestBooking.deposit_amount)} | ${tj.total}: ${money(latestBooking.total_amount)}`)}
                      {location}
                    </>
                  ),
                },
                pickup: {
                  title: tj.pickupTitle,
                  rows: (
                    <>
                      {row(Shirt, tj.dresses, dressNames || '—')}
                      {row(Calendar, tj.pickupDate, latestBooking?.pickup_scheduled_on || tj.toBeSet)}
                      {row(Calendar, tj.weddingDate, weddingDate || '—')}
                      {location}
                    </>
                  ),
                  note: note(tj.pickupNote),
                },
                with_bride: {
                  title: tj.withBrideTitle,
                  rows: (
                    <>
                      {row(Shirt, tj.dresses, dressNames || '—')}
                      {row(Calendar, tj.returnDate, latestBooking?.return_scheduled_on || tj.toBeSet)}
                      {location}
                    </>
                  ),
                  note: note(tj.withBrideNote),
                },
                returned: {
                  title: tj.returnedTitle,
                  rows: row(Shirt, tj.dresses, dressNames || '—'),
                  note: note(tj.returnedNote),
                },
                cancelled: {
                  title: tj.cancelledTitle,
                  rows: location,
                  note: note(tj.cancelledNote, 'plain'),
                },
              }[journeyStep] || null;

              if (!content) return null;
              const stepNumber = Math.min(activeIndex, JOURNEY_STEPS.length - 1) + 1;

              return (
                <>
                  <span className={styles.cardLabel} style={{ color: isCancelled ? '#c53030' : '#059669' }}>
                    {isCancelled ? tj.cancelledLabel : `${tj.stepLabel} ${stepNumber}: ${t.track.stages[JOURNEY_STEPS[stepNumber - 1].id]}`}
                  </span>
                  <h3 className={styles.appointmentHeading}>{content.title}</h3>
                  <div className={styles.appointmentMeta}>{content.rows}</div>
                  {content.note}
                </>
              );
            })()}

            {/* Fittings are optional: shown as information only when the bride has some */}
            {fittings.length > 0 && !isCancelled && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #efebe4' }}>
                <span className={styles.metaTitle} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Scissors size={14} /> {tj.fittingsTitle}
                </span>
                <span style={{ display: 'block', fontSize: '11px', color: '#888', margin: '2px 0 10px' }}>{tj.fittingsHint}</span>
                {fittings.map((fit) => (
                  <div key={fit.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#faf8f5', padding: '10px 14px', borderRadius: '10px', border: '1px solid #efebe4', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#111', fontWeight: 600 }}>
                      <Calendar size={14} style={{ color: '#888' }} /> {fit.fitting_date}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: fit.status === 'completed' ? '#dcfce7' : '#fef3c7', color: fit.status === 'completed' ? '#15803d' : '#b45309' }}>
                      {fit.status === 'completed' ? tj.fittingDone : tj.fittingScheduled}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.appointmentActions}>
              <a href={contact.whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.rescheduleBtn} style={{ textDecoration: 'none', textAlign: 'center' }}>{tj.contactUs}</a>
              <a
                href="https://www.google.com/maps?ll=30.047744,31.445114&z=15&t=m&hl=en-US&gl=US&mapclient=embed&q=30%C2%B002%2751.9%22N+31%C2%B026%2742.4%22E+30.047744,+31.445114@30.047744,31.445114"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.directionsBtn}
                style={{ textDecoration: 'none' }}
              >
                {tj.directions} <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* ── RIGHT: LIVE HISTORY & UPDATES ── */}
          <div className={styles.updatesCard}>
            <span className={styles.cardLabel}>{tj.historyLabel}</span>

            <div className={styles.timeline}>
              {clientData?.bookings && clientData.bookings.length > 0 ? (
                clientData.bookings.map((booking, idx) => {
                  const cleanDate = booking.booking_date || '—';
                  const statusLabel = tj.bookingStatuses[booking.status] || booking.status;
                  return (
                    <div key={booking.id || idx} className={styles.timelineItem}>
                      <div className={styles.timelineDate}>
                        <span className={styles.timelineDateText}>{cleanDate}</span>
                        <span className={styles.timelineTime}>{statusLabel}</span>
                      </div>

                      <div className={styles.timelineDotCol}>
                        <span className={`${styles.timelineDot} ${idx === 0 ? styles.timelineDotActive : ''}`} />
                        {idx < clientData.bookings.length - 1 && <span className={styles.timelineLine} />}
                      </div>

                      <div className={styles.timelineContent}>
                        <h5 className={styles.timelineTitle}>
                          {[booking.dress, booking.dress2, booking.dress3].filter(Boolean).map((d) => (lang === 'ar' && d.name_ar) || d.name).join(' | ') || `#${booking.id}`}
                        </h5>
                        <p className={styles.timelineDesc}>
                          {tj.total}: {money(booking.total_amount)} | {statusLabel}
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
                      <span className={styles.timelineTime}>{visit.status === 'pending' ? tj.visitPending : tj.visitStatuses[visit.status] || visit.status}</span>
                    </div>

                    <div className={styles.timelineDotCol}>
                      <span className={`${styles.timelineDot} ${idx === 0 ? styles.timelineDotActive : ''}`} />
                      {idx < clientData.visits.length - 1 && <span className={styles.timelineLine} />}
                    </div>

                    <div className={styles.timelineContent}>
                      <h5 className={styles.timelineTitle}>{tj.visitTitle}</h5>
                      <p className={styles.timelineDesc}>
                        {visit.time_slot ? `${tj.visitDate}: ${visit.visit_date} (${visit.time_slot})` : `${tj.visitDate}: ${visit.visit_date}`}
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
            <Image src="/images/about.webp" alt="Your Bridal Concierge" fill quality={90} className={styles.conciergeImage} />
          </div>

          <div className={styles.conciergeContent}>
            <span className={styles.conciergeEyebrow}>WE ARE HERE FOR YOU</span>
            <h3 className={styles.conciergeHeading}>Your Bridal Concierge</h3>
            <p className={styles.conciergeText}>
              Have questions about your fitting or alterations? Connect directly with our atelier.
            </p>
            <div className={styles.conciergeButtons}>
              <a href={contact.whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.conciergeBtnPrimary} style={{ textDecoration: 'none' }}>
                <MessageCircle size={15} /> WHATSAPP STYLIST
              </a>
              <a href={contact.telHref} className={styles.conciergeBtnOutline} style={{ textDecoration: 'none' }}>
                <Phone size={15} /> CALL BOUTIQUE
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
