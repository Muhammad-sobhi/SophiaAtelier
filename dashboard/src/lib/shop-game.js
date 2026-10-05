// Shop game view of the bride journey: where each bride stands in the 3D shop and which
// real actions (existing stage modals / stage-action API) apply to her there.
// Pure functions only, so they run under `npm test`.
import { calculateScheduledDates, cleanDate, todayStr } from './utils.js';
import { getLatestVisit, OPEN_VISIT_STATUSES, needsWhatsApp } from '../components/bride-journey/visitStatus.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `from` to `to` (both YYYY-MM-DD); positive when `to` is later */
export function daysBetween(from, to) {
  const a = cleanDate(from);
  const b = cleanDate(to);
  if (!a || !b) return null;
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY_MS);
}

export function latestBooking(bride) {
  return Array.isArray(bride?.bookings) ? bride.bookings[0] || null : null;
}

/** Earliest fitting that is still open (not completed/cancelled) */
export function pendingFitting(bride) {
  const list = Array.isArray(bride?.fittings) ? bride.fittings : [];
  return list
    .filter((f) => f.status !== 'completed' && f.status !== 'cancelled')
    .sort((a, b) => String(a.fitting_date || '').localeCompare(String(b.fitting_date || '')))[0] || null;
}

/** Fitting time is saved inside additional_notes as "الوقت: 4:00 م | ..." */
export function fittingTime(fitting) {
  const m = String(fitting?.additional_notes || '').match(/الوقت:\s*([^|]+)/);
  return m ? m[1].trim() : '';
}

export function brideDates(bride) {
  const booking = latestBooking(bride);
  const wedding = cleanDate(booking?.event_date || bride?.wedding_date || '');
  const scheduled = calculateScheduledDates(wedding, bride?.city);
  return {
    wedding,
    pickup: cleanDate(booking?.pickup_scheduled_on || bride?.pickup_scheduled_on || '') || scheduled.pickupDate,
    ret: cleanDate(booking?.return_scheduled_on || bride?.return_scheduled_on || '') || scheduled.returnDate,
  };
}

/**
 * Where the bride is in the shop:
 *  queue      open visit request (in front of the shop)
 *  fitting    open fitting due today or earlier (at the fitting room)
 *  cabinet    booked, pickup more than 15 days away (key in the cabinet)
 *  vitrine    pickup window, dress not handed over yet (dress in the vitrine)
 *  home       dress with the bride, return date still ahead
 *  returnDoor dress with the bride, return date today or passed
 *  null       not shown (closed visit, cancelled, returned, archived)
 */
export function gamePlace(bride, today = todayStr()) {
  const stage = bride?.current_stage || bride?.stage || 'visit';
  const booking = latestBooking(bride);
  const dates = brideDates(bride);
  const fitting = pendingFitting(bride);
  const fittingIn = fitting ? daysBetween(today, fitting.fitting_date) : null;
  const base = { stage, dates, fitting, fittingIn };

  if (stage === 'cancelled' || stage === 'completed') return { ...base, zone: null };

  const delivered = booking?.status === 'picked_up' || booking?.status === 'out';
  if (delivered) {
    const left = daysBetween(today, dates.ret);
    return { ...base, zone: left !== null && left <= 0 ? 'returnDoor' : 'home', returnIn: left };
  }
  if (booking?.status === 'returned' || stage === 'returned') return { ...base, zone: null };

  if (stage === 'visit') {
    const visit = getLatestVisit(bride);
    if (!visit || !OPEN_VISIT_STATUSES.includes(visit.status || 'pending')) return { ...base, zone: null };
    return {
      ...base,
      zone: 'queue',
      visit,
      visitStatus: visit.status || 'pending',
      visitIn: daysBetween(today, visit.visit_date),
      whatsApp: needsWhatsApp(visit),
    };
  }

  if (fitting && fittingIn !== null && fittingIn <= 0) return { ...base, zone: 'fitting' };
  if (stage === 'picked_up') return { ...base, zone: 'vitrine', pickupIn: daysBetween(today, dates.pickup) };
  if (stage === 'booking') return { ...base, zone: 'cabinet' };
  return { ...base, zone: null };
}

// How far along the journey each zone is (fitting sits with the booking stages)
export const ZONE_RANK = { queue: 0, cabinet: 1, fitting: 1, vitrine: 2, home: 3, returnDoor: 3 };

/**
 * Actions for the top bar. `open` names what the page opens:
 *  'visit' | 'booking' | 'fitting' | 'picked_up'  UnifiedStageModal with that stage
 *  'return'  ReturnDressModal · 'cancel' CancelBookingModal · 'details' BrideJourneyPopup
 *  'quick'   stage-action call with `action` / `payload` after `confirm`
 *  'measure' fittings page · 'whatsapp' visit confirmation message
 * The first `primary` action is the one the game highlights.
 */
export function gameActions(bride, place) {
  if (!place?.zone) return [{ key: 'details', label: 'كل التفاصيل', open: 'details' }];
  const booking = latestBooking(bride);
  const canCancel = booking?.status === 'confirmed';
  const list = [];
  const fittingActions = (primary) => {
    if (!place.fitting) return;
    list.push({ key: 'endFitting', label: 'البروفة تمت', open: 'quick', action: 'end_fitting', primary, confirm: `إنهاء البروفة لـ ${bride.name} وتحويلها للاستلام؟` });
    list.push({ key: 'measure', label: 'تسجيل المقاسات', open: 'measure' });
  };

  switch (place.zone) {
    case 'queue':
      if (place.visitStatus === 'pending') {
        list.push({ key: 'confirmVisit', label: 'مراجعة وتأكيد الزيارة', open: 'visit', primary: true });
        list.push({ key: 'book', label: 'حجز فستان', open: 'booking' });
      } else {
        if (place.whatsApp) list.push({ key: 'whatsApp', label: 'ابعتي تأكيد الزيارة واتساب', open: 'whatsapp', primary: true });
        list.push({ key: 'book', label: 'اختارت فستان: حجز', open: 'booking', primary: !place.whatsApp });
        list.push({ key: 'reschedule', label: 'تغيير الموعد', open: 'visit', isEdit: true });
        list.push({ key: 'noBook', label: 'لم تختر فستاناً', open: 'quick', action: 'close_visit', payload: { visit_status: 'done' }, confirm: 'تسجيل أن العروسة جربت ولم تختر فستاناً؟' });
        list.push({ key: 'noShow', label: 'لم تحضر', open: 'quick', action: 'close_visit', payload: { visit_status: 'no_show', tried_dresses: [] }, confirm: 'تسجيل أن العروسة لم تحضر الزيارة؟' });
      }
      break;
    case 'fitting':
      fittingActions(true);
      list.push({ key: 'moreFitting', label: 'بروفة إضافية', open: 'fitting' });
      break;
    case 'cabinet':
      if (place.fitting) fittingActions(false);
      else list.push({ key: 'scheduleFitting', label: 'تحديد موعد بروفة', open: 'fitting', primary: true });
      list.push({ key: 'editBooking', label: 'تعديل الحجز', open: 'booking' });
      break;
    case 'vitrine':
      list.push({ key: 'handover', label: 'تسليم الفستان', open: 'picked_up', primary: true, walk: true });
      if (place.fitting) fittingActions(false);
      else list.push({ key: 'scheduleFitting', label: 'تحديد موعد بروفة', open: 'fitting' });
      list.push({ key: 'editBooking', label: 'تعديل موعد الاستلام', open: 'booking' });
      break;
    case 'home':
    case 'returnDoor':
      list.push({ key: 'return', label: 'استلام الفستان من العروسة', open: 'return', primary: true });
      break;
    default:
      break;
  }
  if (canCancel && ['cabinet', 'vitrine', 'fitting'].includes(place.zone)) {
    list.push({ key: 'cancel', label: 'إلغاء الحجز', open: 'cancel', danger: true });
  }
  list.push({ key: 'details', label: 'كل التفاصيل', open: 'details' });
  return list;
}

/** What changed between two places, used to pick the animation and the level-up message */
export function journeyEvent(before, after) {
  const from = before?.zone || null;
  const to = after?.zone || null;
  if (before?.fitting && !after?.fitting && from !== null && to !== null) return { type: 'fittingDone', from, to };
  if (from === to) return before?.fitting?.id !== after?.fitting?.id && after?.fitting ? { type: 'fittingScheduled', from, to } : null;
  if (from === 'queue' && (to === 'cabinet' || to === 'vitrine' || to === 'fitting')) return { type: 'booked', from, to };
  if (from === 'queue' && to === null) return { type: 'visitClosed', from, to };
  if ((from === 'vitrine' || from === 'fitting' || from === 'cabinet') && (to === 'home' || to === 'returnDoor')) return { type: 'handedOver', from, to };
  if ((from === 'home' || from === 'returnDoor') && to === null) return { type: 'returned', from, to };
  if (to === null) return { type: 'cancelled', from, to };
  return { type: 'moved', from, to };
}

export const LEVEL_UPS = {
  booked: { title: 'الفستان اتحجز!', sub: 'مفتاحها اتعلّق في الدولاب', xp: 30 },
  fittingDone: { title: 'البروفة خلصت!', sub: 'الفستان مقاسه مظبوط', xp: 30 },
  handedOver: { title: 'الفستان اتسلّم!', sub: 'ألف مبروك، العدّاد بدأ', xp: 30 },
  returned: { title: 'الرحلة اكتملت!', sub: 'الفستان رجع بالسلامة', xp: 90 },
};

export const XP_PER_LEVEL = 120;
export const XP_PER_ACTION = 10;
