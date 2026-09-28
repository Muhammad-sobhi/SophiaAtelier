import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

/** Signed balance: minus = the shop owes the supplier, plus = overpaid */
export function formatBalance(value) {
  const n = Math.round(parseFloat(value || 0) * 100) / 100;
  if (n === 0) return '0 ج.م';
  return `${n > 0 ? '+' : '-'}${Math.abs(n).toLocaleString()} ج.م`;
}

export function balanceClass(value) {
  const n = parseFloat(value || 0);
  return n < 0 ? 'text-rose-600' : n > 0 ? 'text-emerald-600' : 'text-slate-500';
}

/** Finance page: what the shop owes (or overpaid) each supplier */
export default function SupplierBalancesCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient.get('/suppliers')
      .then((res) => active && setData(res))
      .catch(() => active && setError(true));
    return () => { active = false; };
  }, []);

  if (error) {
    return (
      <div className="bg-white rounded-3xl p-4 border border-slate-100 text-xs font-bold text-slate-400">
        تعذر تحميل أرصدة الموردين
      </div>
    );
  }
  if (!data) return null;

  const suppliers = data.data || [];

  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-2xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 cursor-pointer"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Truck size={17} />
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-slate-800">حسابات الموردين</div>
            <div className="text-[10px] font-bold text-slate-400">السالب = مديونية عليكِ · الموجب = مدفوع زيادة</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-black ${balanceClass(data.total_balance)}`} dir="ltr">{formatBalance(data.total_balance)}</span>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {suppliers.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 text-center py-3">
              لا يوجد موردين بعد — أضيفيهم من <Link to="/dashboard/manufacturing?tab=suppliers" className="text-indigo-600 underline">قسم التصنيع</Link>
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-xs">
                  <Link to={`/dashboard/manufacturing?tab=suppliers&supplier=${s.id}`} className="font-bold text-slate-700 hover:text-indigo-600">
                    {s.name}
                  </Link>
                  <span className={`font-black ${balanceClass(s.balance)}`} dir="ltr">{formatBalance(s.balance)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
