// Pay cycle rules (mirror of PayrollService on the backend, used for previews only):
// the employee's pay is a daily rate; a cycle is worth daily rate x cycle days.
export const MONTH_DAYS = 30;
export const WEEK_DAYS = 7;

export function cycleDays(payCycle, payCycleDays) {
  if (payCycle === 'weekly') return WEEK_DAYS;
  if (payCycle === 'custom' && parseInt(payCycleDays) > 0) return parseInt(payCycleDays);
  return MONTH_DAYS;
}

export function cycleLabel(payCycle, payCycleDays) {
  if (payCycle === 'weekly') return 'أسبوعي';
  if (payCycle === 'custom') return `كل ${cycleDays(payCycle, payCycleDays)} يوم`;
  return 'شهري';
}

export const formatMoney = (n) => `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString()} ج.م`;

// "شهر 10 / 2026" for monthly rows, "من 05/09 إلى 11/09" for weekly / custom rows of /payroll/summary
const shortDate = (d) => d.split('-').reverse().slice(0, 2).join('/');
export const periodLabel = (row) => row.pay_cycle === 'monthly'
  ? `شهر ${row.period_start.slice(5, 7)} / ${row.period_start.slice(0, 4)}`
  : `من ${shortDate(row.period_start)} إلى ${shortDate(row.period_end)}`;
