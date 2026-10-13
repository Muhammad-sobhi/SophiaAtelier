import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert, RotateCcw, Loader2, ChevronDown, CheckCircle2, AlertTriangle, Search,
  Trash2, ExternalLink, GitMerge, Lightbulb, CalendarCheck, CalendarX, Pencil, X, Wallet,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { apiClient } from '@/lib/api-client';
import { formatDate, cleanDate, todayStr } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { BrideJourneyPopup } from '@/components/bride-journey/BrideJourneyPopup';
import { BookingPaymentsModal } from '@/components/bride-journey/BookingPaymentsModal';

const GROUPS = [
  { id: 'bookings', label: 'الحجوزات' },
  { id: 'payments', label: 'الدفعات والمالية' },
  { id: 'visits', label: 'الزيارات' },
  { id: 'brides', label: 'العرايس' },
];

const BOOKING_STATUS = { pending: 'معلّق', confirmed: 'مؤكد', picked_up: 'اتسلم', returned: 'رجع', cancelled: 'ملغي' };
const VISIT_STATUS = { pending: 'معلّقة', confirmed: 'مؤكدة', arrived: 'وصلت', done: 'تمت', booked: 'حجزت', no_show: 'ماجتش', declined: 'اعتذرت' };
const REVENUE_TYPE = {
  deposit: 'عربون', balance: 'باقي', insurance: 'تأمين', security_deposit: 'تأمين', fitting_fee: 'رسوم تجربة',
  insurance_refund: 'استرداد تأمين', deposit_refund: 'استرداد عربون', damage_fee: 'خصم تلفيات', late_fee: 'غرامة تأخير',
};

const money = (n) => `${(Number(n) || 0).toLocaleString()} ج.م`;

const matches = (row, q) =>
  !q || [row.id, row.client_name, row.phone, row.booking_id].some((v) => String(v ?? '').toLowerCase().includes(q));

function ActionButton({ icon: Icon, label, onClick, disabled, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    rose: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100',
    indigo: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100',
    amber: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-100',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

const Th = ({ children }) => <th className="py-2.5 px-3 font-black whitespace-nowrap">{children}</th>;
// Actions stay visible at the row end (left in RTL) while the rest of a wide table scrolls
const STICKY = 'sticky left-0 bg-white/95 shadow-[4px_0_6px_-4px_rgba(15,23,42,0.12)]';
// Cells stay on one line (the table scrolls sideways on small screens); long text columns opt into wrapping
const Td = ({ children, className = '' }) => <td className={`py-2.5 px-3 align-top whitespace-nowrap ${className}`}>{children}</td>;

function BrideCell({ row }) {
  return (
    <>
      <div className="font-black text-slate-800">{row.client_name || '—'}</div>
      {row.phone && <div className="font-mono text-[10.5px] text-slate-400" dir="ltr">{row.phone}</div>}
    </>
  );
}

function BookingTable({ rows, busy, fix, onOpen, onEdit, onPayments, onDelete }) {
  return (
    <table className="w-full text-right text-xs">
      <thead className="bg-slate-50 text-[10.5px] text-slate-500">
        <tr><Th>#</Th><Th>العروسة</Th><Th>الفستان</Th><Th>الحجز</Th><Th>الفرح</Th><Th>الاستلام / الإرجاع</Th><Th>القيمة</Th><Th>مدفوع</Th><Th>تأمين</Th><Th>الحالة</Th><Th>اتسجل</Th><Th /></tr>
      </thead>
      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50/60">
            <Td className="font-mono text-slate-400">{r.id}</Td>
            <Td><BrideCell row={r} /></Td>
            <Td className="whitespace-normal min-w-[160px]">{[r.dress, r.dress_2, r.dress_3].filter(Boolean).join('، ') || '—'}</Td>
            <Td className="font-mono">{formatDate(r.booking_date)}</Td>
            <Td className="font-mono">{formatDate(r.event_date)}</Td>
            <Td className="font-mono text-[11px]">{formatDate(r.pickup_scheduled_on)} ← {formatDate(r.return_scheduled_on)}</Td>
            <Td className="font-mono">{money(r.total_amount)}</Td>
            <Td className={`font-mono ${Number(r.paid_rent) > Number(r.total_amount) ? 'text-rose-700' : 'text-emerald-700'}`}>{money(r.paid_rent)}</Td>
            <Td className="font-mono">{money(r.insurance)}</Td>
            <Td>{BOOKING_STATUS[r.status] || r.status}</Td>
            <Td className="font-mono text-[10.5px] text-slate-400">{r.created}</Td>
            <Td className={STICKY}>
              <div className="flex gap-1.5 justify-end">
                {fix === 'payments' && <ActionButton icon={Wallet} label="الدفعات / تسجيل الباقي" tone="emerald" onClick={() => onPayments(r)} disabled={busy} />}
                {Array.isArray(fix) && <ActionButton icon={Pencil} label={fixLabel(fix)} tone="emerald" onClick={() => onEdit(r)} disabled={busy} />}
                {r.client_id && <ActionButton icon={ExternalLink} label="فتح كرت العروسة" tone="indigo" onClick={() => onOpen(r.client_id)} disabled={busy} />}
                <ActionButton icon={Trash2} label="حذف الحجز" tone="rose" onClick={() => onDelete(r)} disabled={busy} />
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RevenueTable({ rows, busy, fix, onOpen, onEdit, onDelete }) {
  return (
    <table className="w-full text-right text-xs">
      <thead className="bg-slate-50 text-[10.5px] text-slate-500">
        <tr><Th>#</Th><Th>العروسة</Th><Th>الحجز</Th><Th>النوع</Th><Th>المبلغ</Th><Th>الطريقة</Th><Th>تاريخ الدفع</Th><Th>اتسجل</Th><Th>ملاحظات</Th><Th /></tr>
      </thead>
      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50/60">
            <Td className="font-mono text-slate-400">{r.id}</Td>
            <Td><BrideCell row={r} /></Td>
            <Td className="font-mono">{r.booking_id ? `#${r.booking_id}` : '—'}</Td>
            <Td>{REVENUE_TYPE[r.type] || r.type}</Td>
            <Td className={`font-mono ${Number(r.amount) < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{money(r.amount)}</Td>
            <Td>{r.payment_method || '—'}</Td>
            <Td className="font-mono">{formatDate(r.payment_date)}</Td>
            <Td className="font-mono text-[10.5px] text-slate-400" dir="ltr">{r.created}</Td>
            <Td className="whitespace-normal text-[11px] text-slate-500 min-w-[180px] max-w-[260px]">{r.notes || '—'}</Td>
            <Td className={STICKY}>
              <div className="flex gap-1.5 justify-end">
                {Array.isArray(fix) && <ActionButton icon={Pencil} label={fixLabel(fix)} tone="emerald" onClick={() => onEdit(r)} disabled={busy} />}
                {r.client_id && <ActionButton icon={ExternalLink} label="فتح كرت العروسة" tone="indigo" onClick={() => onOpen(r.client_id)} disabled={busy} />}
                <ActionButton icon={Trash2} label="حذف الدفعة" tone="rose" onClick={() => onDelete(r)} disabled={busy} />
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VisitTable({ rows, busy, closable, selected, setSelected, onOpen, onClose, onDelete }) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <table className="w-full text-right text-xs">
      <thead className="bg-slate-50 text-[10.5px] text-slate-500">
        <tr>
          {closable && (
            <Th>
              <input
                type="checkbox"
                aria-label="تحديد الكل"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
              />
            </Th>
          )}
          <Th>#</Th><Th>العروسة</Th><Th>تاريخ الزيارة</Th><Th>الوقت</Th><Th>الحالة</Th><Th>المصدر</Th><Th>اتسجلت</Th><Th />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
        {rows.map((r) => (
          <tr key={r.id} className={selected.has(r.id) ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'}>
            {closable && (
              <Td><input type="checkbox" aria-label={`تحديد زيارة ${r.id}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></Td>
            )}
            <Td className="font-mono text-slate-400">{r.id}</Td>
            <Td><BrideCell row={r} /></Td>
            <Td className="font-mono">{formatDate(r.visit_date)}</Td>
            <Td className="font-mono">{r.time_slot || '—'}</Td>
            <Td>{VISIT_STATUS[r.status] || r.status}</Td>
            <Td>{r.source || '—'}</Td>
            <Td className="font-mono text-[10.5px] text-slate-400">{r.created}</Td>
            <Td className={STICKY}>
              <div className="flex gap-1.5 justify-end">
                {closable && (
                  <>
                    <ActionButton icon={CalendarCheck} label="حضرت" tone="emerald" onClick={() => onClose([r.id], 'done')} disabled={busy} />
                    <ActionButton icon={CalendarX} label="ماجتش" tone="amber" onClick={() => onClose([r.id], 'no_show')} disabled={busy} />
                  </>
                )}
                {r.client_id && <ActionButton icon={ExternalLink} label="فتح كرت العروسة" tone="indigo" onClick={() => onOpen(r.client_id)} disabled={busy} />}
                {!closable && <ActionButton icon={Trash2} label="حذف الزيارة" tone="rose" onClick={() => onDelete(r)} disabled={busy} />}
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Brides sharing a phone, grouped so the admin picks the record to keep and merges the rest into it
function DuplicateClients({ rows, busy, onOpen, onMerge, onDelete }) {
  const groups = useMemo(() => {
    const byPhone = new Map();
    rows.forEach((r) => byPhone.set(r.phone, [...(byPhone.get(r.phone) || []), r]));
    return [...byPhone.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [rows]);
  const [keepByPhone, setKeepByPhone] = useState({});

  return (
    <div className="space-y-3 p-3">
      {groups.map(([phone, clients]) => {
        // Default: the record with the most history
        const fallback = [...clients].sort((a, b) =>
          (b.bookings_count + b.visits_count) - (a.bookings_count + a.visits_count) || a.id - b.id)[0].id;
        const keepId = keepByPhone[phone] ?? fallback;
        const others = clients.filter((c) => c.id !== keepId);
        return (
          <div key={phone} className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2">
              <span className="font-mono text-xs font-black text-slate-700" dir="ltr">{phone}</span>
              <span className="text-[11px] font-bold text-slate-500">{clients.length} سجلات على نفس الرقم</span>
            </div>
            <table className="w-full text-right text-xs">
              <thead className="text-[10.5px] text-slate-500">
                <tr><Th>الأساسي</Th><Th>#</Th><Th>الاسم</Th><Th>الفرح</Th><Th>حجوزات</Th><Th>زيارات</Th><Th>اتسجلت</Th><Th /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {clients.map((c) => (
                  <tr key={c.id} className={c.id === keepId ? 'bg-emerald-50/50' : ''}>
                    <Td>
                      <input
                        type="radio"
                        name={`keep-${phone}`}
                        aria-label={`اعتبر ${c.client_name} السجل الأساسي`}
                        checked={c.id === keepId}
                        onChange={() => setKeepByPhone((prev) => ({ ...prev, [phone]: c.id }))}
                      />
                    </Td>
                    <Td className="font-mono text-slate-400">{c.id}</Td>
                    <Td className="font-black text-slate-800">{c.client_name}</Td>
                    <Td className="font-mono">{formatDate(c.wedding_date)}</Td>
                    <Td className="font-mono">{c.bookings_count}{c.active_bookings > 0 && <span className="text-[10px] text-indigo-600"> ({c.active_bookings} شغال)</span>}</Td>
                    <Td className="font-mono">{c.visits_count}</Td>
                    <Td className="font-mono text-[10.5px] text-slate-400">{c.created}</Td>
                    <Td className={STICKY}>
                      <div className="flex gap-1.5 justify-end">
                        <ActionButton icon={ExternalLink} label="فتح الكرت" tone="indigo" onClick={() => onOpen(c.id)} disabled={busy} />
                        {c.id !== keepId && c.bookings_count === 0 && c.visits_count === 0 && (
                          <ActionButton icon={Trash2} label="حذف (فاضي)" tone="rose" onClick={() => onDelete(c)} disabled={busy} />
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500">
                لو كلهم نفس العروسة: ادمجهم في السجل الأساسي. لو عرايس مختلفين على رقم وهمي: سيبهم.
              </span>
              <ActionButton
                icon={GitMerge}
                label={`ادمج ${others.length} في الأساسي`}
                tone="emerald"
                disabled={busy || others.length === 0}
                onClick={() => onMerge(clients.find((c) => c.id === keepId), others)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClientTable({ rows, busy, onOpen }) {
  return (
    <table className="w-full text-right text-xs">
      <thead className="bg-slate-50 text-[10.5px] text-slate-500">
        <tr><Th>#</Th><Th>العروسة</Th><Th>الفرح</Th><Th>حجوزات</Th><Th>زيارات</Th><Th>اتسجلت</Th><Th /></tr>
      </thead>
      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
        {rows.map((c) => (
          <tr key={c.id} className="hover:bg-slate-50/60">
            <Td className="font-mono text-slate-400">{c.id}</Td>
            <Td><BrideCell row={c} /></Td>
            <Td className="font-mono">{formatDate(c.wedding_date)}</Td>
            <Td className="font-mono">{c.bookings_count} ({c.active_bookings} شغال)</Td>
            <Td className="font-mono">{c.visits_count}</Td>
            <Td className="font-mono text-[10.5px] text-slate-400">{c.created}</Td>
            <Td className={STICKY}><div className="flex justify-end"><ActionButton icon={ExternalLink} label="فتح كرت العروسة" tone="indigo" onClick={() => onOpen(c.id)} disabled={busy} /></div></Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Fields the admin can correct directly on one booking / payment. The bride card only edits a booking
// before pickup, so picked-up and returned bookings (most old data) are fixed here.
const FIELDS = {
  booking_date: { label: 'تاريخ الحجز', type: 'date', max: true },
  event_date: { label: 'تاريخ الفرح', type: 'date' },
  pickup_scheduled_on: { label: 'ميعاد الاستلام', type: 'date' },
  return_scheduled_on: { label: 'ميعاد الإرجاع', type: 'date' },
  total_amount: { label: 'قيمة الإيجار (ج.م)', type: 'number', min: 0 },
  payment_date: { label: 'تاريخ الدفع', type: 'date', max: true },
  amount: { label: 'المبلغ (ج.م)', type: 'number' },
};

// The fix each check offers on its rows: the fields that cause it, or 'payments' for the booking's
// payments screen (record the remaining money, edit the total, delete a duplicate payment).
// Checks not listed only have open-card / delete.
const CHECK_FIX = {
  booking_after_wedding: ['booking_date', 'event_date'],
  booking_no_date: ['booking_date'],
  booking_no_event: ['event_date'],
  booking_future_date: ['booking_date'],
  booking_zero_total: ['total_amount'],
  booking_overpaid: 'payments',
  booking_unpaid_after_pickup: 'payments',
  booking_bad_schedule: ['event_date', 'pickup_scheduled_on', 'return_scheduled_on'],
  revenue_no_date: ['payment_date'],
  revenue_future: ['payment_date'],
  revenue_non_positive: ['amount'],
  revenue_deposit_before_booking: ['payment_date'],
};

const fixLabel = (keys) => (keys.length === 1 ? `تعديل ${FIELDS[keys[0]].label.replace(/ \(.*\)$/, '')}` : 'تعديل التواريخ');

function EditRowModal({ entity, row, keys, onCancel, onSave }) {
  const fields = keys.map((key) => ({ key, ...FIELDS[key] }));
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [
    f.key, f.type === 'date' ? cleanDate(row[f.key] || '') : String(row[f.key] ?? ''),
  ])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, saving]);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (entity === 'booking' && values.booking_date && values.event_date && values.booking_date > values.event_date) {
      setError('تاريخ الحجز لا يمكن أن يكون بعد تاريخ الفرح');
      return;
    }
    // Send only what changed, so untouched fields keep their stored values
    const changes = Object.fromEntries(fields
      .filter((f) => values[f.key] !== (f.type === 'date' ? cleanDate(row[f.key] || '') : String(row[f.key] ?? '')))
      .map((f) => [f.key, f.type === 'number' ? Number(values[f.key]) : values[f.key] || null]));
    if (!Object.keys(changes).length) { onCancel(); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(changes);
    } catch (err) {
      setError(err.message || 'حصل خطأ، حاول تاني');
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4" style={{ zIndex: 100000 }} dir="rtl">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-md text-right">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-800">
            {entity === 'booking' ? `تعديل الحجز #${row.id}` : `تعديل الدفعة #${row.id}`}
            {row.client_name && <span className="text-slate-500 font-bold"> — {row.client_name}</span>}
          </h3>
          <button type="button" onClick={onCancel} disabled={saving} aria-label="إغلاق" className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="text-[11px] font-black text-slate-600 block mb-1">{f.label}</span>
              <input
                type={f.type}
                required={f.type === 'date' || f.key === 'total_amount'}
                min={f.min}
                step={f.type === 'number' ? 'any' : undefined}
                max={f.max ? todayStr() : undefined}
                value={values[f.key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
              />
            </label>
          ))}
        </div>
        {error && <p className="mx-4 mb-3 text-[11.5px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>}
        <div className="flex gap-2 px-4 pb-4">
          <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />}
            حفظ
          </button>
          <button type="button" onClick={onCancel} disabled={saving} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer">
            إلغاء
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function CheckDetails({ checkKey, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [bride, setBride] = useState(null);
  const [editing, setEditing] = useState(null);
  const [payments, setPayments] = useState(null);
  const fix = CHECK_FIX[checkKey];

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await apiClient.get(`/data-health/${checkKey}`));
      setSelected(new Set());
    } catch (err) {
      setError(err.message || 'تعذر تحميل التفاصيل');
    }
  }, [checkKey]);

  useEffect(() => { load(); }, [load]);

  const afterChange = async (message) => {
    if (message) toast.success(message);
    await load();
    onChanged();
  };

  // Every action shares one busy flag so nothing is submitted twice
  const run = async (question, action, success) => {
    if (busy || (question && !(await confirmDialog(question)))) return;
    setBusy(true);
    try {
      const res = await action();
      await afterChange(typeof success === 'function' ? success(res) : success);
    } catch (err) {
      toast.error(err.message || 'حصل خطأ، حاول تاني');
    } finally {
      setBusy(false);
    }
  };

  const openBride = async (clientId) => {
    if (busy) return;
    setBusy(true);
    try {
      setBride(await apiClient.get(`/clients/${clientId}`));
    } catch (err) {
      toast.error(err.message || 'تعذر فتح كرت العروسة');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (changes) => {
    const path = data.entity === 'booking' ? `/bookings/${editing.id}` : `/revenues/${editing.id}`;
    await apiClient.put(path, changes);
    setEditing(null);
    await afterChange('تم الحفظ');
  };

  const openPayments = async (r) => {
    if (busy) return;
    setBusy(true);
    try {
      setPayments(await apiClient.get(`/bookings/${r.id}`));
    } catch (err) {
      toast.error(err.message || 'تعذر فتح الدفعات');
    } finally {
      setBusy(false);
    }
  };

  const deleteBooking = (r) => run(
    `حذف الحجز #${r.id} للعروسة ${r.client_name || ''}؟ هيتحذف معاه كل الدفعات والبروفات بتاعته نهائياً.`,
    () => apiClient.delete(`/bookings/${r.id}`),
    'تم حذف الحجز',
  );
  const deleteRevenue = (r) => run(
    `حذف الدفعة #${r.id} (${REVENUE_TYPE[r.type] || r.type} ${money(r.amount)}) للعروسة ${r.client_name || ''}؟`,
    () => apiClient.delete(`/revenues/${r.id}`),
    'تم حذف الدفعة',
  );
  const deleteVisit = (r) => run(
    `حذف الزيارة #${r.id} للعروسة ${r.client_name || ''}؟`,
    () => apiClient.delete(`/visits/${r.id}`),
    'تم حذف الزيارة',
  );
  const deleteClient = (c) => run(
    `حذف السجل #${c.id} (${c.client_name})؟ السجل فاضي (مالوش حجوزات ولا زيارات).`,
    () => apiClient.delete(`/clients/${c.id}`),
    'تم حذف السجل',
  );
  const closeVisits = (ids, status) => run(
    ids.length > 1 ? `إغلاق ${ids.length} زيارة كـ "${VISIT_STATUS[status]}"؟` : null,
    () => apiClient.post('/data-health/close-visits', { ids, status }),
    (res) => res?.message || 'تم',
  );
  const mergeClients = (keep, others) => run(
    `دمج ${others.map((o) => `${o.client_name} (#${o.id})`).join('، ')} في ${keep.client_name} (#${keep.id})؟\n`
      + 'كل الحجوزات والزيارات والدفعات هتتنقل للسجل الأساسي، والسجلات التانية هتتشال. مينفعش يترجع.',
    () => apiClient.post('/data-health/merge-clients', { keep_id: keep.id, merge_ids: others.map((o) => o.id) }),
    'تم الدمج',
  );

  if (error) {
    return (
      <div className="p-4 text-xs font-bold text-rose-700 bg-rose-50 flex items-center justify-between gap-2">
        {error}
        <button type="button" onClick={load} className="underline cursor-pointer">حاول تاني</button>
      </div>
    );
  }
  if (!data) {
    return <div className="py-10 flex justify-center"><Loader2 size={20} className="animate-spin text-indigo-600" /></div>;
  }

  const q = query.trim().toLowerCase();
  const rows = data.rows.filter((r) => matches(r, q));
  const closable = checkKey === 'visit_stale_open';
  const common = { rows, busy, fix, onOpen: openBride, onEdit: setEditing };

  return (
    <div className="border-t border-slate-100">
      <div className="p-3 space-y-2.5 bg-slate-50/50">
        <p className="flex items-start gap-1.5 text-[11.5px] font-bold text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          <Lightbulb size={14} className="shrink-0 mt-0.5" />
          {data.hint}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[180px]">
            <span className="sr-only">بحث</span>
            <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم أو التليفون أو الرقم"
              className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-400"
            />
          </label>
          {closable && selected.size > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-slate-600">{selected.size} محددة:</span>
              <ActionButton icon={CalendarCheck} label="حضرت" tone="emerald" disabled={busy} onClick={() => closeVisits([...selected], 'done')} />
              <ActionButton icon={CalendarX} label="ماجتش" tone="amber" disabled={busy} onClick={() => closeVisits([...selected], 'no_show')} />
            </div>
          )}
          {busy && <Loader2 size={16} className="animate-spin text-indigo-600" aria-label="جاري التنفيذ" />}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-xs font-bold text-slate-400">
          {data.rows.length === 0 ? 'مفيش مشاكل هنا ✓' : 'مفيش نتائج للبحث'}
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          {data.entity === 'booking' && <BookingTable {...common} onPayments={openPayments} onDelete={deleteBooking} />}
          {data.entity === 'revenue' && <RevenueTable {...common} onDelete={deleteRevenue} />}
          {data.entity === 'visit' && (
            <VisitTable {...common} closable={closable} selected={selected} setSelected={setSelected} onClose={closeVisits} onDelete={deleteVisit} />
          )}
          {data.entity === 'client' && (checkKey === 'client_duplicate_phone'
            ? <DuplicateClients {...common} onMerge={mergeClients} onDelete={deleteClient} />
            : <ClientTable {...common} />)}
        </div>
      )}

      {editing && (
        <EditRowModal entity={data.entity} row={editing} keys={fix} onCancel={() => setEditing(null)} onSave={saveEdit} />
      )}

      {payments && (
        <BookingPaymentsModal
          isOpen
          bride={payments.client}
          booking={payments}
          onClose={() => { setPayments(null); afterChange(); }}
          onSuccess={load}
        />
      )}

      {bride && (
        <BrideJourneyPopup
          bride={bride}
          onClose={() => { setBride(null); afterChange(); }}
          onUpdate={async () => {
            try {
              setBride(await apiClient.get(`/clients/${bride.id}`));
            } catch {
              setBride(null); // deleted from the popup
            }
            afterChange();
          }}
        />
      )}
    </div>
  );
}

// Admin page: data that makes the reports wrong, each with the way to fix it
export default function DataHealthPage() {
  const [checks, setChecks] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState(null);
  const [showHealthy, setShowHealthy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setChecks(await apiClient.get('/data-health'));
    } catch (err) {
      setError(err.message || 'تعذر تحميل فحص البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const problems = (checks || []).filter((c) => c.count > 0);
  const healthy = (checks || []).filter((c) => c.count === 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 animate-fade-in text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">فحص البيانات</h1>
            <p className="text-xs text-slate-500 font-bold mt-0.5">بيانات غلط أو متكررة بتأثر على التقارير والمالية، وطريقة إصلاح كل واحدة</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer disabled:opacity-60"
        >
          <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
          إعادة الفحص
        </button>
      </div>

      {loading && !checks ? (
        <div className="py-16 flex justify-center"><Loader2 size={22} className="animate-spin text-indigo-600" /></div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-bold">{error}</div>
      ) : (
        <>
          <div className={`rounded-2xl px-4 py-3 text-sm font-black flex items-center gap-2 ${problems.length ? 'bg-amber-50 text-amber-900 border border-amber-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
            {problems.length ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            {problems.length
              ? `${problems.length} فحص فيهم مشاكل من ${checks.length}`
              : 'كل الفحوصات سليمة'}
          </div>

          {GROUPS.map((group) => {
            const list = problems.filter((c) => c.group === group.id);
            if (!list.length) return null;
            return (
              <section key={group.id} className="space-y-2">
                <h2 className="text-xs font-black text-slate-500 px-1">{group.label}</h2>
                {list.map((c) => {
                  const isOpen = openKey === c.key;
                  return (
                    <div key={c.key} className="bg-white rounded-2xl border border-slate-150 shadow-2xs overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenKey(isOpen ? null : c.key)}
                        aria-expanded={isOpen}
                        className="w-full flex items-center justify-between gap-3 p-3 sm:p-3.5 text-right hover:bg-slate-50/60 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? '' : 'rotate-90'}`} />
                          <span className="font-mono text-[10.5px] text-slate-400">#{c.number}</span>
                          <span className="text-sm font-black text-slate-800">{c.label}</span>
                        </span>
                        <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-100">
                          {c.count.toLocaleString()} مشكلة
                        </span>
                      </button>
                      {isOpen && <CheckDetails checkKey={c.key} onChanged={load} />}
                    </div>
                  );
                })}
              </section>
            );
          })}

          {healthy.length > 0 && (
            <section className="space-y-2">
              <button
                type="button"
                onClick={() => setShowHealthy((v) => !v)}
                aria-expanded={showHealthy}
                className="flex items-center gap-1.5 text-xs font-black text-emerald-700 px-1 cursor-pointer"
              >
                <CheckCircle2 size={14} />
                {healthy.length} فحص سليم
                <ChevronDown size={14} className={`transition-transform ${showHealthy ? '' : 'rotate-90'}`} />
              </button>
              {showHealthy && (
                <ul className="bg-white rounded-2xl border border-slate-150 divide-y divide-slate-100">
                  {healthy.map((c) => (
                    <li key={c.key} className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-600">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span className="font-mono text-[10.5px] text-slate-400">#{c.number}</span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
