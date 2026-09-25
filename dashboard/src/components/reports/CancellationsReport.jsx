import React, { useState, useEffect, useCallback } from 'react';
import { Ban, Banknote, Shield, Wallet, Percent, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const STAGE_LABELS = {
  booking: 'حجز',
  fitting: 'بروفة',
  picked_up: 'قبل الاستلام',
};

const money = (n) => `${(Number(n) || 0).toLocaleString()} ج.م`;

const monthRange = (offset) => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return [fmt(first), fmt(last)];
};

const PRESETS = [
  { id: 'all', label: 'كل الفترات' },
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'last_month', label: 'الشهر الماضي' },
];

export function CancellationsReport() {
  const [preset, setPreset] = useState('this_month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (preset !== 'all') {
        const [from, to] = monthRange(preset === 'this_month' ? 0 : -1);
        params.from_date = from;
        params.to_date = to;
      }
      const res = await apiClient.get('/reports/cancellations', { params });
      setData(res);
    } catch (err) {
      console.error('Failed to load cancellations report:', err);
      setError('تعذر تحميل تقرير الإلغاءات');
    } finally {
      setLoading(false);
    }
  }, [preset]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const summary = data?.summary || {};
  const rows = data?.data || [];
  const byReason = data?.by_reason || [];
  const maxReason = Math.max(1, ...byReason.map((r) => r.count));

  const cards = [
    { label: 'حجوزات ملغية', value: summary.count ?? 0, icon: Ban, tone: 'text-rose-600 bg-rose-50' },
    { label: 'نسبة الإلغاء', value: `${summary.cancellation_rate ?? 0}%`, icon: Percent, tone: 'text-amber-600 bg-amber-50' },
    { label: 'عربون مرتجع', value: money(summary.deposit_refunded), icon: Banknote, tone: 'text-slate-700 bg-slate-100' },
    { label: 'تأمين مرتجع', value: money(summary.insurance_refunded), icon: Shield, tone: 'text-slate-700 bg-slate-100' },
    { label: 'متبقي للمحل', value: money(summary.kept_amount), icon: Wallet, tone: 'text-emerald-600 bg-emerald-50' },
  ];

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
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-bold">{error}</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${c.tone}`}>
                    <Icon size={16} />
                  </div>
                  <p className="text-[11px] font-bold text-slate-400">{c.label}</p>
                  <p className="text-base font-black text-slate-800 font-mono">{c.value}</p>
                </div>
              );
            })}
          </div>

          {/* By reason */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-3">أسباب الإلغاء</h3>
            {byReason.length === 0 ? (
              <p className="text-xs font-bold text-slate-400">لا توجد إلغاءات في هذه الفترة</p>
            ) : (
              <div className="space-y-2">
                {byReason.map((r) => (
                  <div key={r.reason} className="flex items-center gap-3 text-xs">
                    <span className="w-36 font-bold text-slate-700 truncate">{r.reason}</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(r.count / maxReason) * 100}%` }} />
                    </div>
                    <span className="w-8 text-left font-mono font-black text-slate-800">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-500 font-black">
                  <tr>
                    <th className="p-3">العروس</th>
                    <th className="p-3">الفستان</th>
                    <th className="p-3">تاريخ الفرح</th>
                    <th className="p-3">تاريخ الإلغاء</th>
                    <th className="p-3">المرحلة</th>
                    <th className="p-3">السبب</th>
                    <th className="p-3">المدفوع</th>
                    <th className="p-3">رد عربون</th>
                    <th className="p-3">رد تأمين</th>
                    <th className="p-3">متبقي للمحل</th>
                    <th className="p-3">بواسطة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-slate-400 font-bold">لا توجد حجوزات ملغية</td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.booking_id} className="hover:bg-slate-50/60">
                        <td className="p-3">
                          <div className="font-extrabold text-slate-800">{r.client_name || '—'}</div>
                          <div className="font-mono text-[10.5px] text-slate-400">{r.client_phone}</div>
                        </td>
                        <td className="p-3 font-bold text-slate-700">{r.dress_name || '—'}{r.dress_code ? ` (${r.dress_code})` : ''}</td>
                        <td className="p-3 font-mono">{r.event_date || '—'}</td>
                        <td className="p-3 font-mono">{r.cancelled_at || '—'}</td>
                        <td className="p-3">{STAGE_LABELS[r.cancelled_stage] || r.cancelled_stage || '—'}</td>
                        <td className="p-3">
                          <div className="font-bold text-rose-700">{r.reason_label}</div>
                          {r.note && <div className="text-[10.5px] text-slate-400 max-w-[200px] truncate" title={r.note}>{r.note}</div>}
                        </td>
                        <td className="p-3 font-mono">{money(r.paid_rent + r.paid_insurance)}</td>
                        <td className="p-3 font-mono text-rose-600">{money(r.deposit_refund)}</td>
                        <td className="p-3 font-mono text-rose-600">{money(r.insurance_refund)}</td>
                        <td className="p-3 font-mono font-black text-emerald-700">{money(r.kept_amount)}</td>
                        <td className="p-3">{r.cancelled_by_name || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CancellationsReport;
