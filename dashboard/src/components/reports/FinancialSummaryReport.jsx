import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Wallet, PieChart, Shield, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { apiClient, getAllPages } from '@/lib/api-client';

export function FinancialSummaryReport() {
  const [summary, setSummary] = useState({ net_profit: 0, net_revenue: 0, net_expense: 0, held_insurances: 0 });
  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiClient.get('/finance/summary'),
      getAllPages('/revenues'),
      getAllPages('/expenses'),
    ])
      .then(([sumRes, revRes, expRes]) => {
        if (!isMounted) return;
        setSummary(sumRes || {});
        setRevenues(Array.isArray(revRes) ? revRes : revRes?.data || []);
        setExpenses(Array.isArray(expRes) ? expRes : expRes?.data || []);
      })
      .catch((err) => console.error('Failed to load financial report data:', err))
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, []);

  const totalRev = parseFloat(summary.net_revenue || 0);
  const totalExp = parseFloat(summary.net_expense || 0);
  const netProfit = parseFloat(summary.net_profit || 0);
  const profitMargin = totalRev > 0 ? Math.round((netProfit / totalRev) * 100) : 0;

  // Payment methods breakdown
  const paymentMethodStats = useMemo(() => {
    const map = {};
    const methodNames = {
      cash: 'كاش (نقدي)',
      instapay: 'إنستاباي (InstaPay)',
      vodafone_cash: 'فودافون كاش',
      credit_card: 'فيزا / بطاقة ائتمان',
      bank_transfer: 'تحويل بنكي'
    };

    revenues.forEach((r) => {
      const m = (r.payment_method || 'cash').toLowerCase().replace(' ', '_');
      const amt = parseFloat(r.amount || 0);
      if (!map[m]) map[m] = 0;
      map[m] += amt;
    });

    return Object.entries(map).map(([key, amount]) => ({
      key,
      label: methodNames[key] || key,
      amount,
      percent: totalRev > 0 ? Math.round((amount / totalRev) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);
  }, [revenues, totalRev]);

  // Expenses category breakdown
  const expenseCategories = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      const c = e.category || 'عام';
      const amt = parseFloat(e.amount || 0);
      map[c] = (map[c] || 0) + amt;
    });

    return Object.entries(map)
      .map(([name, amount]) => ({
        name,
        amount,
        percent: totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, totalExp]);

  return (
    <div className="space-y-4 animate-fade-in text-right" dir="rtl">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-3xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-black text-indigo-700">
            <span>صافي الأرباح</span>
            <TrendingUp size={16} />
          </div>
          <div className="font-mono text-xl font-black text-indigo-950">
            {netProfit.toLocaleString()} ج.م
          </div>
          <div className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
            <span>هامش الربح:</span>
            <span className="font-mono font-black">{profitMargin}%</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-black text-emerald-700">
            <span>إجمالي المقبوضات</span>
            <ArrowUpRight size={16} />
          </div>
          <div className="font-mono text-xl font-black text-emerald-950">
            {totalRev.toLocaleString()} ج.م
          </div>
          <div className="text-[10px] font-bold text-emerald-600">
            {revenues.length} معاملة إيراد
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-black text-rose-700">
            <span>المصروفات التشغيلية</span>
            <ArrowDownRight size={16} />
          </div>
          <div className="font-mono text-xl font-black text-rose-950">
            {totalExp.toLocaleString()} ج.م
          </div>
          <div className="text-[10px] font-bold text-rose-600">
            {expenses.length} بند مصروفات
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-black text-amber-700">
            <span>التأمينات المحتجزة</span>
            <Shield size={16} />
          </div>
          <div className="font-mono text-xl font-black text-amber-950">
            {parseFloat(summary.held_insurances || 0).toLocaleString()} ج.م
          </div>
          <div className="text-[10px] font-bold text-amber-600">
            أمانات مستردة عند التسليم
          </div>
        </div>
      </div>

      {/* Two Columns: Payment Methods & Expense Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Methods */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-150 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-emerald-600" />
              <h3 className="text-xs font-black text-slate-800">توزيع المقبوضات حسب وسيلة الدفع</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">إجمالي الخزينة</span>
          </div>

          <div className="space-y-3">
            {paymentMethodStats.map((pm) => (
              <div key={pm.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{pm.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-800">{pm.amount.toLocaleString()} ج.م</span>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {pm.percent}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${pm.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-150 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChart size={16} className="text-rose-600" />
              <h3 className="text-xs font-black text-slate-800">بنود المصروفات التشغيلية</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">الصرف والتشغيل</span>
          </div>

          <div className="space-y-3">
            {expenseCategories.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-bold">
                لا توجد مصروفات مسجلة
              </div>
            ) : (
              expenseCategories.map((exp) => (
                <div key={exp.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>{exp.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-rose-600">{exp.amount.toLocaleString()} ج.م</span>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {exp.percent}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${exp.percent}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinancialSummaryReport;
