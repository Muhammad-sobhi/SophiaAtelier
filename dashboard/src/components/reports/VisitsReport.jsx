import React, { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, CheckCircle2, UserCheck, Heart, UserX, Percent, Loader2, AlertTriangle, MessageCircle, Timer } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const money = (n) => `${(Number(n) || 0).toLocaleString()} ج.م`;

const SOURCE_LABELS = {
  website: 'الموقع',
  walkin: 'في المحل',
  phone: 'تليفون',
  whatsapp: 'واتساب',
  instagram: 'انستجرام',
  referral: 'ترشيح',
  unknown: 'غير محدد',
};

const monthRange = (offset) => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return [fmt(first), fmt(last)];
};

const PRESETS = [
  { id: 'last_month', label: 'الشهر الماضي', offset: -1 },
  { id: 'this_month', label: 'هذا الشهر', offset: 0 },
  { id: 'next_month', label: 'الشهر القادم', offset: 1 },
];

/** "15:30" → "03:30 م" */
const formatSlot = (slot) => {
  const [h, m] = String(slot).split(':').map(Number);
  if (Number.isNaN(h)) return slot;
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'م' : 'ص'}`;
};

const formatMinutes = (mins) => {
  if (mins === null || mins === undefined) return '—';
  if (mins < 60) return `${mins} دقيقة`;
  const hours = Math.round((mins / 60) * 10) / 10;
  return hours < 24 ? `${hours} ساعة` : `${Math.round((hours / 24) * 10) / 10} يوم`;
};

function Section({ title, hint, children }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <h3 className="text-sm font-black text-slate-800">{title}</h3>
      {hint && <p className="text-[11px] font-bold text-slate-400 mt-0.5 mb-3">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-xs font-bold text-slate-400">لا توجد بيانات في هذه الفترة</p>;
}

function Bar({ label, value, max, suffix = '', tone = 'bg-indigo-500' }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-28 sm:w-36 font-bold text-slate-700 truncate">{label}</span>
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="w-14 text-left font-mono font-black text-slate-800">{value}{suffix}</span>
    </div>
  );
}

function Table({ headers, rows, empty = 'لا توجد بيانات في هذه الفترة' }) {
  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full text-xs text-right">
        <thead className="bg-slate-50 text-slate-500 font-black">
          <tr>{headers.map((h) => <th key={h} className="p-3 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="p-5 text-center text-slate-400 font-bold">{empty}</td></tr>
          ) : rows}
        </tbody>
      </table>
    </div>
  );
}

export function VisitsReport() {
  const [preset, setPreset] = useState('this_month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [from, to] = monthRange(PRESETS.find((p) => p.id === preset).offset);
      const res = await apiClient.get('/reports/visits', { params: { from, to } });
      setData(res);
    } catch (err) {
      console.error('Failed to load visits report:', err);
      setError('تعذر تحميل تقرير الزيارات');
    } finally {
      setLoading(false);
    }
  }, [preset]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const f = data?.funnel || {};
  const confirmation = data?.confirmation || {};
  const noShow = data?.no_show || {};
  const fees = data?.trying_fees || {};

  const cards = [
    { label: 'طلبات الزيارة', value: f.requests ?? 0, icon: CalendarCheck, tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'مؤكدة', value: `${f.confirmed ?? 0}`, sub: `منها ${f.auto_confirmed ?? 0} تلقائي`, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'حضرت', value: f.attended ?? 0, sub: `${f.attend_rate ?? 0}% من المؤكدة`, icon: UserCheck, tone: 'text-sky-600 bg-sky-50' },
    { label: 'حجزت', value: f.booked ?? 0, sub: `${f.booking_rate ?? 0}% ممن حضرن`, icon: Heart, tone: 'text-rose-600 bg-rose-50' },
    { label: 'لم تحضر', value: f.no_show ?? 0, sub: `${noShow.rate ?? 0}% من الزيارات المنتهية`, icon: UserX, tone: 'text-amber-600 bg-amber-50' },
    { label: 'تحويل الطلب لحجز', value: `${f.overall_rate ?? 0}%`, icon: Percent, tone: 'text-violet-600 bg-violet-50' },
  ];

  const funnelMax = Math.max(1, f.requests || 0);
  const weekdayMax = Math.max(1, ...(noShow.by_weekday || []).map((d) => d.visits));
  const slotMax = Math.max(1, ...(noShow.by_slot || []).map((s) => s.visits));

  return (
    <div className="space-y-5">
      {/* Period filter */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
              preset === p.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        {data?.range && (
          <span className="self-center text-[11px] font-bold text-slate-400 font-mono" dir="ltr">{data.range.from} → {data.range.to}</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-bold">{error}</div>
      ) : (
        <>
          {/* Open work right now */}
          {(confirmation.pending_over_24h > 0 || confirmation.whatsapp_not_sent > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {confirmation.pending_over_24h > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs font-black">
                  <AlertTriangle size={16} /> {confirmation.pending_over_24h} طلب زيارة ينتظر التأكيد منذ أكثر من 24 ساعة
                </div>
              )}
              {confirmation.whatsapp_not_sent > 0 && (
                <div className="flex items-center gap-2 bg-lime-50 border border-lime-200 text-lime-900 rounded-2xl p-3 text-xs font-black">
                  <MessageCircle size={16} /> {confirmation.whatsapp_not_sent} زيارة مؤكدة لم تُرسل لها رسالة الواتساب
                </div>
              )}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${c.tone}`}>
                    <Icon size={16} />
                  </div>
                  <p className="text-[11px] font-bold text-slate-400">{c.label}</p>
                  <p className="text-base font-black text-slate-800 font-mono">{c.value}</p>
                  {c.sub && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{c.sub}</p>}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. Funnel */}
            <Section title="قمع الزيارات" hint="أين نخسر العرائس بين الطلب والحجز">
              {f.requests ? (
                <div className="space-y-2">
                  <Bar label="طلبات" value={f.requests} max={funnelMax} tone="bg-indigo-400" />
                  <Bar label="مؤكدة" value={f.confirmed} max={funnelMax} tone="bg-emerald-500" />
                  <Bar label="حضرت" value={f.attended} max={funnelMax} tone="bg-sky-500" />
                  <Bar label="حجزت" value={f.booked} max={funnelMax} tone="bg-rose-500" />
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[11px] font-bold text-slate-500">
                    <span>لم تختر فستاناً: {f.not_chosen}</span>
                    <span>لم تحضر: {f.no_show}</span>
                    <span>بانتظار التأكيد: {f.pending}</span>
                  </div>
                </div>
              ) : <Empty />}
            </Section>

            {/* 2. Sources */}
            <Section title="مصادر الزيارات" hint="الموقع مقابل المحل والتليفون والسوشيال">
              <Table
                headers={['المصدر', 'زيارات', 'حضرت', 'حجزت', 'نسبة الحجز']}
                rows={(data.sources || []).map((s) => (
                  <tr key={s.source} className="hover:bg-slate-50/60">
                    <td className="p-3 font-extrabold text-slate-800">{SOURCE_LABELS[s.source] || s.source}</td>
                    <td className="p-3 font-mono">{s.visits}</td>
                    <td className="p-3 font-mono">{s.attended}</td>
                    <td className="p-3 font-mono">{s.booked}</td>
                    <td className="p-3 font-mono font-black text-emerald-700">{s.booking_rate}%</td>
                  </tr>
                ))}
              />
            </Section>
          </div>

          {/* 3. Dresses: requested → tried → booked */}
          <Section title="أداء الفساتين: طلب ← تجربة ← حجز" hint="فستان يُطلب كثيراً ويُحجز قليلاً قد يحتاج مراجعة المقاس أو السعر أو شكله على الطبيعة">
            <Table
              headers={['الفستان', 'طُلب', 'جُرّب', 'حُجز', 'نسبة الحجز']}
              rows={(data.dresses || []).map((d) => (
                <tr key={d.dress_id} className="hover:bg-slate-50/60">
                  <td className="p-3 font-extrabold text-slate-800">{d.name || '—'}{d.code ? <span className="font-mono text-slate-400"> ({d.code})</span> : ''}</td>
                  <td className="p-3 font-mono">{d.requested}</td>
                  <td className="p-3 font-mono">{d.tried}</td>
                  <td className="p-3 font-mono">{d.booked}</td>
                  <td className={`p-3 font-mono font-black ${d.requested >= 3 && d.booking_rate < 20 ? 'text-rose-600' : 'text-emerald-700'}`}>{d.booking_rate}%</td>
                </tr>
              ))}
            />
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 4. Lost demand */}
            <Section title="طلب ضائع بسبب عدم الإتاحة" hint="فساتين أرادتها عرائس لكنها كانت محجوزة يوم زفافهن — مرشحة لشراء نسخة إضافية">
              <Table
                headers={['الفستان', 'مرات الطلب', 'عدد العرائس']}
                empty="لم تُسجل فساتين محجوزة طلبتها عرائس في هذه الفترة"
                rows={(data.lost_demand || []).map((d) => (
                  <tr key={d.dress_id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-extrabold text-slate-800">{d.name || '—'}{d.code ? <span className="font-mono text-slate-400"> ({d.code})</span> : ''}</td>
                    <td className="p-3 font-mono">{d.misses}</td>
                    <td className="p-3 font-mono font-black text-rose-600">{d.brides}</td>
                  </tr>
                ))}
              />
            </Section>

            {/* 5. Staff */}
            <Section title="أداء الموظفين في الزيارات" hint="نسبة الحجز من الزيارات التي حضرت مع كل موظف">
              <Table
                headers={['الموظف', 'زيارات', 'حضرت', 'حجزت', 'نسبة الحجز']}
                empty="لم يُسجل اسم الموظف على زيارات هذه الفترة"
                rows={(data.staff?.by_sales || []).map((s) => (
                  <tr key={s.sales_name} className="hover:bg-slate-50/60">
                    <td className="p-3 font-extrabold text-slate-800">{s.sales_name}</td>
                    <td className="p-3 font-mono">{s.visits}</td>
                    <td className="p-3 font-mono">{s.attended}</td>
                    <td className="p-3 font-mono">{s.booked}</td>
                    <td className="p-3 font-mono font-black text-emerald-700">{s.booking_rate}%</td>
                  </tr>
                ))}
              />
              {(data.staff?.confirmations || []).length > 0 && (
                <div className="mt-3 text-[11px] font-bold text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-slate-700">تأكيدات يدوية:</span>
                  {data.staff.confirmations.map((c) => <span key={c.name}>{c.name}: {c.confirmed}</span>)}
                </div>
              )}
            </Section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 6. No-shows & busy days */}
            <Section title="الحضور حسب اليوم" hint={`نسبة عدم الحضور ${noShow.rate ?? 0}% — لتحديد أيام إرسال التذكير`}>
              {(noShow.by_weekday || []).length === 0 ? <Empty /> : (
                <div className="space-y-2">
                  {noShow.by_weekday.map((d) => (
                    <div key={d.day_index} className="space-y-0.5">
                      <Bar label={d.day} value={d.visits} max={weekdayMax} tone="bg-sky-500" />
                      {d.no_show > 0 && <p className="text-[10.5px] font-bold text-amber-700 pr-32 sm:pr-40">لم تحضر {d.no_show} ({d.no_show_rate}%)</p>}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* 7. Busy slots */}
            <Section title="ضغط المواعيد" hint="أكثر الأوقات طلباً (الحد 4 زيارات لكل نصف ساعة)">
              {(noShow.by_slot || []).length === 0 ? <Empty /> : (
                <div className="space-y-2">
                  {noShow.by_slot.map((s) => (
                    <Bar key={s.slot} label={formatSlot(s.slot)} value={s.visits} max={slotMax} tone="bg-violet-500" />
                  ))}
                </div>
              )}
            </Section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 8. Confirmation speed */}
            <Section title="سرعة التأكيد" hint="من وصول طلب الموقع حتى تأكيد الموظف (الطلبات غير التلقائية)">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Timer size={18} /></div>
                <div>
                  <p className="text-lg font-black text-slate-800">{formatMinutes(confirmation.avg_minutes_to_confirm)}</p>
                  <p className="text-[11px] font-bold text-slate-400">متوسط على {confirmation.manual_confirmed ?? 0} طلب</p>
                </div>
              </div>
            </Section>

            {/* 9. Trying fees */}
            <Section title="رسوم التجربة" hint="المستحق من الزيارات التي حضرت">
              <p className="text-lg font-black text-slate-800 font-mono">{money(fees.total_due)}</p>
              <div className="mt-2 space-y-1 text-[11px] font-bold text-slate-500">
                <div>زيارات مدفوعة: {fees.paid_visits ?? 0} — نسبة الحجز {fees.paid_booking_rate ?? 0}%</div>
                <div>زيارات مجانية: {fees.free_visits ?? 0} — نسبة الحجز {fees.free_booking_rate ?? 0}%</div>
              </div>
            </Section>

            {/* 10. Dresses per visit */}
            <Section title="عدد الفساتين في الزيارة" hint="هل تجربة فساتين أكثر تزيد الحجز؟">
              {(data.dresses_per_visit || []).length === 0 ? <Empty /> : (
                <div className="space-y-1.5 text-xs">
                  {data.dresses_per_visit.map((d) => (
                    <div key={d.dresses} className="flex items-center justify-between font-bold text-slate-700">
                      <span>{d.dresses === 0 ? 'بدون فساتين محددة' : `${d.dresses} فستان`}</span>
                      <span className="font-mono">{d.visits} زيارة · <span className="font-black text-emerald-700">{d.booking_rate}%</span> حجز</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

export default VisitsReport;
