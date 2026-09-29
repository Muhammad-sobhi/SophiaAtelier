// Status of the bride's try-on visit (visit stage). Labels are shown as badges on the bride card and popup.
export const VISIT_STATUS = {
  pending: { label: 'تحتاج تأكيد', badgeClass: 'bg-amber-50 text-amber-800 border-amber-300', dotColor: 'bg-amber-500' },
  confirmed: { label: 'زيارة مؤكدة', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  arrived: { label: 'حضرت للتجربة', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200', dotColor: 'bg-sky-500' },
  done: { label: 'لم تختر فستاناً', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', dotColor: 'bg-slate-400' },
  no_show: { label: 'لم تحضر', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', dotColor: 'bg-rose-500' },
  booked: { label: 'تم الحجز', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200', dotColor: 'bg-indigo-500' },
  declined: { label: 'تم رفض الطلب', badgeClass: 'bg-slate-100 text-slate-500 border-slate-200', dotColor: 'bg-slate-400' },
};

export const OPEN_VISIT_STATUSES = ['pending', 'confirmed', 'arrived'];

export function getLatestVisit(bride) {
  const visits = Array.isArray(bride?.visits) ? bride.visits : [];
  return visits.reduce((latest, v) => (!latest || (v.id || 0) > (latest.id || 0) ? v : latest), null);
}

// Confirmed (by the system or an employee) but the bride has not received the WhatsApp details yet
export const WHATSAPP_PENDING_STATUS = {
  label: 'مؤكدة — أرسل الواتساب',
  badgeClass: 'bg-lime-50 text-lime-800 border-lime-300',
  dotColor: 'bg-lime-500',
};

export function needsWhatsApp(visit) {
  return visit?.status === 'confirmed' && !visit.confirmation_sent_at;
}

// Website request from a phone number that already had a visit: the employee decides
export const REPEAT_REQUEST_STATUS = {
  label: '⚠️ طلب متكرر — زارت من قبل',
  badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
  dotColor: 'bg-rose-500',
};

export function isPendingRepeatRequest(visit) {
  return visit?.status === 'pending' && Boolean(visit.previous_visit_id);
}

export function getVisitStatus(bride) {
  const visit = getLatestVisit(bride);
  if (isPendingRepeatRequest(visit)) return REPEAT_REQUEST_STATUS;
  if (needsWhatsApp(visit)) return WHATSAPP_PENDING_STATUS;
  return VISIT_STATUS[visit?.status] || VISIT_STATUS.pending;
}

// Dresses the bride asked to try; older records kept them on a pending booking
export function getVisitDresses(bride) {
  const requested = getLatestVisit(bride)?.requested_dresses;
  if (Array.isArray(requested) && requested.length > 0) return requested;
  const booking = bride?.bookings?.[0];
  if (booking?.status !== 'pending') return [];
  return [booking.dress, booking.dress2, booking.dress3].filter(Boolean);
}
