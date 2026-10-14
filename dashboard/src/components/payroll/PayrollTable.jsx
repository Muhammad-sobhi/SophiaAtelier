import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cycleLabel, periodLabel, periodRange } from '@/lib/payroll';

const STATUS_FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'unpaid', label: 'لم يُصرف' },
  { id: 'partial', label: 'صرف جزئي' },
  { id: 'paid', label: 'تم الصرف' },
];

// Grid cell colors per payment status (letter too, so state isn't conveyed by color alone)
const CELL = {
  paid: { short: 'ص', className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  partial: { short: 'ج', className: 'bg-amber-50 border-amber-200 text-amber-700' },
  unpaid: { short: 'ل', className: 'bg-slate-50 border-slate-200 text-slate-600' },
};

const num = (n) => Math.round(n || 0).toLocaleString();

/**
 * Payroll of the selected month as a compact grid: one row per employee, one small cell per pay period
 * (a month, a week or a custom block), colored by payment status. Clicking a cell opens its payslip,
 * where the period is paid, pieces are recorded and loans are edited.
 */
export default function PayrollTable({ rows, canManagePayroll, onPayslip }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const counts = useMemo(() => {
    const c = { all: rows.length, unpaid: 0, partial: 0, paid: 0 };
    rows.forEach((r) => { c[r.payment_status] = (c[r.payment_status] || 0) + 1; });
    return c;
  }, [rows]);

  // Rows grouped per employee (the API returns them ordered by name), keeping only the periods that match
  const employees = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byId = new Map();
    rows.forEach((r) => {
      if (q && !r.employee_name.toLowerCase().includes(q) && !(r.position || '').toLowerCase().includes(q)) return;
      if (status !== 'all' && r.payment_status !== status) return;
      if (!byId.has(r.employee_id)) byId.set(r.employee_id, { ...r, periods: [] });
      byId.get(r.employee_id).periods.push(r);
    });
    return [...byId.values()].map((e) => ({
      ...e,
      periods: e.periods.sort((a, b) => a.period_start.localeCompare(b.period_start)),
      net: e.periods.reduce((s, p) => s + p.net_salary, 0),
      loans: e.periods.reduce((s, p) => s + (p.loan_deduction || 0), 0),
      remaining: e.periods.reduce((s, p) => s + (p.remaining_amount || 0), 0),
    }));
  }, [rows, search, status]);

  const totalEmployees = useMemo(() => new Set(rows.map((r) => r.employee_id)).size, [rows]);
  const hasFilters = search || status !== 'all';

  const cell = (pay) => {
    const st = CELL[pay.payment_status] || CELL.unpaid;
    const hint = [
      periodLabel(pay),
      `الصافي ${num(pay.net_salary)} ج.م`,
      pay.loan_deduction > 0 && `سلف ${num(pay.loan_deduction)} ج.م`,
      pay.remaining_amount > 0 && pay.paid_amount > 0 && `متبقي ${num(pay.remaining_amount)} ج.م`,
      !pay.period_finished && 'فترة جارية',
    ].filter(Boolean).join(' · ');
    return (
      <button
        key={pay.period_key}
        onClick={() => onPayslip(pay)}
        title={hint}
        aria-label={hint}
        className={`relative min-w-[92px] px-2 py-1 rounded-xl border text-right transition-all cursor-pointer hover:ring-2 hover:ring-indigo-300 ${st.className} ${
          !pay.period_finished ? 'ring-2 ring-sky-300' : ''}`}>
        {pay.loan_deduction > 0 && (
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white" aria-hidden="true" />
        )}
        <span className="flex items-center justify-between gap-1.5 text-[9px] font-bold opacity-80 whitespace-nowrap">
          <span>{periodRange(pay)}</span>
          <span className="font-black">{st.short}</span>
        </span>
        <span className="block text-[11px] font-black whitespace-nowrap">{num(pay.net_salary)}</span>
      </button>
    );
  };

  return (
    <div className="flex-1 bg-white rounded-3xl border border-slate-100/70 shadow-xs flex flex-col min-h-0">
      {/* Filters */}
      <div className="p-3 sm:p-4 border-b border-slate-100 space-y-2.5 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الموظف أو الوظيفة..."
            aria-label="بحث عن موظف"
            className="w-full bg-slate-50 border border-slate-200 pr-9 pl-3 py-2 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setStatus(f.id)}
                aria-pressed={status === f.id}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                  status === f.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                {f.label} ({counts[f.id] || 0})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
            <span>{employees.length} من {totalEmployees} موظف</span>
            {hasFilters && (
              <button onClick={() => { setSearch(''); setStatus('all'); }} className="flex items-center gap-0.5 text-indigo-600 hover:text-indigo-800 cursor-pointer">
                <X size={12} /> مسح
              </button>
            )}
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap text-[10px] font-bold text-slate-500">
          <span className="flex items-center gap-1"><span className="px-1.5 rounded-md border bg-emerald-50 border-emerald-200 text-emerald-700">ص</span>تم الصرف</span>
          <span className="flex items-center gap-1"><span className="px-1.5 rounded-md border bg-amber-50 border-amber-200 text-amber-700">ج</span>صرف جزئي</span>
          <span className="flex items-center gap-1"><span className="px-1.5 rounded-md border bg-slate-50 border-slate-200 text-slate-600">ل</span>لم يُصرف</span>
          <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-md ring-2 ring-sky-300" />فترة جارية</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />عليها سلفة</span>
          <span className="text-slate-400">· اضغط على الفترة لكشف الحساب{canManagePayroll ? ' والصرف' : ''}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        {rows.length === 0 ? (
          <p className="text-center py-10 text-xs font-bold text-slate-400">لا توجد فترات رواتب تنتهي في هذا الشهر</p>
        ) : employees.length === 0 ? (
          <p className="text-center py-10 text-xs font-bold text-slate-400">لا توجد نتائج مطابقة للبحث</p>
        ) : (
          <>
            {/* Column headers (wide screens only) */}
            <div className="hidden xl:grid grid-cols-[170px_1fr_100px_90px_100px] gap-3 px-4 py-2 bg-slate-50 text-[10px] font-extrabold text-slate-500 sticky top-0 z-10">
              <span>الموظف</span>
              <span>فترات الشهر (الصافي)</span>
              <span>إجمالي الصافي</span>
              <span>السلف</span>
              <span>المتبقي</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <li key={emp.employee_id} className="px-3 sm:px-4 py-2.5 xl:grid xl:grid-cols-[170px_1fr_100px_90px_100px] xl:gap-3 xl:items-center hover:bg-slate-50/60">
                  <div className="flex items-baseline justify-between xl:block gap-2 min-w-0">
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-800 truncate">{emp.employee_name}</div>
                      <div className="text-[9px] font-bold text-slate-400 truncate">{emp.position} · {cycleLabel(emp.pay_cycle, emp.pay_cycle_days)}</div>
                    </div>
                    {/* Totals inline below wide screens */}
                    <div className="xl:hidden text-[10px] font-bold text-slate-500 whitespace-nowrap text-left">
                      <span className="text-emerald-600 font-extrabold">{num(emp.net)} ج.م</span>
                      {emp.loans > 0 && <span className="text-amber-600"> · سلف {num(emp.loans)}</span>}
                      {emp.remaining > 0 && <span className="text-rose-600"> · متبقي {num(emp.remaining)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2 xl:mt-0">
                    {emp.periods.map(cell)}
                  </div>
                  <span className="hidden xl:block text-xs font-extrabold text-emerald-600">{num(emp.net)} ج.م</span>
                  <span className={`hidden xl:block text-xs font-extrabold ${emp.loans > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{emp.loans > 0 ? `${num(emp.loans)} ج.م` : '—'}</span>
                  <span className={`hidden xl:block text-xs font-extrabold ${emp.remaining > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{emp.remaining > 0 ? `${num(emp.remaining)} ج.م` : '—'}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
