import React, { useState, useMemo } from 'react';
import {
  X, Search, Download, TrendingUp, TrendingDown,
  DollarSign, Building2, Shield, FileSpreadsheet, Calendar
} from 'lucide-react';
import { getStorageUrl } from '@/lib/api-client';

export function FinanceStatsDetailModal({
  isOpen,
  onClose,
  statType, // 'net_profit' | 'net_revenue' | 'net_expense' | 'total_assets' | 'held_insurances'
  totals = {},
  transactions = [],
  dresses = [],
  heldInsurancesList = [],
}) {
  if (!isOpen || !statType) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const meta = {
    net_profit: {
      title: 'تفاصيل صافي الأرباح',
      subtitle: 'كشف حركة المقبوضات والمصروفات وصافي الأرباح التراكمية',
      icon: TrendingUp,
      color: 'indigo',
      value: `${(totals.net_profit || 0).toLocaleString()} ج.م`,
    },
    net_revenue: {
      title: 'تفاصيل المبيعات والإيرادات',
      subtitle: 'كافة المقبوضات وعرابين الحجز والدفعات المسجلة بالخزينة',
      icon: DollarSign,
      color: 'emerald',
      value: `${(totals.net_revenue || 0).toLocaleString()} ج.م`,
    },
    net_expense: {
      title: 'تفاصيل المصروفات التشغيلية',
      subtitle: 'كشف بنود الصرف والمصروفات التشغيلية والمشتريات',
      icon: TrendingDown,
      color: 'rose',
      value: `${(totals.net_expense || 0).toLocaleString()} ج.م`,
    },
    total_assets: {
      title: 'تفاصيل أصول الفساتين بالأتيليه',
      subtitle: 'قائمة الفساتين وتكلفة الشراء التقديرية لكل فستان وحالته الحالية',
      icon: Building2,
      color: 'sky',
      value: `${(totals.total_assets || 0).toLocaleString()} ج.م`,
    },
    held_insurances: {
      title: 'تفاصيل التأمينات المحتجزة (أمانات)',
      subtitle: 'مبالغ التأمين المودعة طرف الأتيليه للعقود النشطة وقيد الاستلام',
      icon: Shield,
      color: 'amber',
      value: `${(totals.held_insurances || 0).toLocaleString()} ج.م`,
    },
  }[statType] || {
    title: 'تفاصيل المعاملات المالية',
    subtitle: '',
    icon: DollarSign,
    color: 'indigo',
    value: '0 ج.م',
  };

  const Icon = meta.icon;

  // Compile items depending on selected statType
  const rawItems = useMemo(() => {
    if (statType === 'net_revenue') {
      return transactions.filter(t => t.isRevenue);
    }
    if (statType === 'net_expense') {
      return transactions.filter(t => !t.isRevenue);
    }
    if (statType === 'net_profit') {
      return transactions;
    }
    if (statType === 'total_assets') {
      return dresses;
    }
    if (statType === 'held_insurances') {
      return heldInsurancesList;
    }
    return [];
  }, [statType, transactions, dresses, heldInsurancesList]);

  // Search filter
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return rawItems;
    const q = searchQuery.toLowerCase().trim();

    return rawItems.filter((item) => {
      if (!item) return false;
      if (statType === 'total_assets') {
        return (
          (item.name || '').toLowerCase().includes(q) ||
          (item.code || '').toLowerCase().includes(q) ||
          (item.category?.name || '').toLowerCase().includes(q)
        );
      }
      if (statType === 'held_insurances') {
        return (
          (item.brideName || '').toLowerCase().includes(q) ||
          (item.bridePhone || '').includes(q) ||
          (item.dressName || '').toLowerCase().includes(q)
        );
      }
      // General transactions
      return (
        (item.desc || '').toLowerCase().includes(q) ||
        (item.clientName || '').toLowerCase().includes(q) ||
        (item.paymentMethod || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.date || '').includes(q)
      );
    });
  }, [rawItems, searchQuery, statType]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredItems.length) return;
    let headers = [];
    let rows = [];

    if (statType === 'total_assets') {
      headers = ['كود الفستان', 'اسم الفستان', 'القسم', 'سعر الشراء / الأصل', 'سعر الإيجار', 'الحالة'];
      rows = filteredItems.map(d => [
        d.code || '-',
        d.name || '-',
        d.category?.name || '-',
        d.purchase_cost || d.price || 0,
        d.rental_price || 0,
        d.status || 'ready'
      ]);
    } else if (statType === 'held_insurances') {
      headers = ['اسم العروس', 'الهاتف', 'الفستان', 'مبلغ التأمين', 'تاريخ المناسبة', 'حالة العقد'];
      rows = filteredItems.map(h => [
        h.brideName || '-',
        h.bridePhone || '-',
        h.dressName || '-',
        h.insuranceAmount || 0,
        h.eventDate || '-',
        h.stage || '-'
      ]);
    } else {
      headers = ['التاريخ', 'البيان / العميل', 'النوع', 'المبلغ', 'طريقة الدفع', 'الملاحظات'];
      rows = filteredItems.map(t => [
        t.date || '-',
        t.desc || '-',
        t.isRevenue ? 'إيراد' : 'مصروف',
        t.rawAmount || 0,
        t.paymentMethod || '-',
        t.notes || '-'
      ]);
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${statType}_details_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-5 text-right overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-150 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-${meta.color}-50 text-${meta.color}-600 border border-${meta.color}-200`}>
              <Icon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800">{meta.title}</h3>
                <span className="font-mono text-xs font-black bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-700">
                  {meta.value}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-400 mt-0.5">{meta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              title="تصدير كشف البيانات"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search & Count Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 flex-shrink-0 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="بحث في السجلات..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            {filteredItems.length} سجل
          </span>
        </div>

        {/* Table Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-thin">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-bold">
              لا توجد سجلات مطابقة للبحث
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-150 text-[11px] font-black text-slate-400">
                    {statType === 'total_assets' ? (
                      <>
                        <th className="pb-3 pr-2">الكود</th>
                        <th className="pb-3">اسم الفستان</th>
                        <th className="pb-3">القسم</th>
                        <th className="pb-3 text-center">سعر الأصل / الشراء</th>
                        <th className="pb-3 text-center">سعر الإيجار</th>
                        <th className="pb-3 text-left pl-2">الحالة</th>
                      </>
                    ) : statType === 'held_insurances' ? (
                      <>
                        <th className="pb-3 pr-2">اسم العروس</th>
                        <th className="pb-3">الهاتف</th>
                        <th className="pb-3">الفستان المحجوز</th>
                        <th className="pb-3 text-center">مبلغ التأمين</th>
                        <th className="pb-3 text-center">تاريخ المناسبة</th>
                        <th className="pb-3 text-left pl-2">المرحلة</th>
                      </>
                    ) : (
                      <>
                        <th className="pb-3 pr-2">التاريخ</th>
                        <th className="pb-3">البيان / الطرف</th>
                        <th className="pb-3">طريقة الدفع</th>
                        <th className="pb-3 text-center">المبلغ</th>
                        <th className="pb-3 text-left pl-2">النوع</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {paginatedItems.map((item, idx) => {
                    if (statType === 'total_assets') {
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-2 font-mono text-indigo-600 font-black">{item.code || '-'}</td>
                          <td className="py-3 font-black text-slate-800">{item.name}</td>
                          <td className="py-3 text-slate-500 font-medium">{item.category?.name || '-'}</td>
                          <td className="py-3 text-center font-mono font-black text-slate-800">
                            {parseFloat(item.purchase_cost || item.price || 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-3 text-center font-mono text-slate-600">
                            {parseFloat(item.rental_price || 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-3 text-left pl-2">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                              item.status === 'ready' ? 'bg-emerald-50 text-emerald-700' :
                              item.status === 'out' ? 'bg-blue-50 text-blue-700' :
                              item.status === 'cleaning' ? 'bg-amber-50 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {item.status === 'ready' ? 'جاهز' :
                               item.status === 'out' ? 'مستلم' :
                               item.status === 'cleaning' ? 'غسيل وكي' : item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    if (statType === 'held_insurances') {
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-2 font-black text-slate-800">{item.brideName}</td>
                          <td className="py-3 font-mono text-slate-500">{item.bridePhone || '—'}</td>
                          <td className="py-3 text-slate-700">{item.dressName}</td>
                          <td className="py-3 text-center font-mono font-black text-amber-700">
                            {parseFloat(item.insuranceAmount || 5000).toLocaleString()} ج.م
                          </td>
                          <td className="py-3 text-center font-mono text-slate-500">{item.eventDate || '—'}</td>
                          <td className="py-3 text-left pl-2">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              تأمين محتجز
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    // Transactions row
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-2 font-mono text-slate-500 text-[11px]">{item.date}</td>
                        <td className="py-3">
                          <span className="block font-black text-slate-800 truncate max-w-[280px]">{item.desc}</span>
                          {item.notes && (
                            <span className="block text-[10px] text-slate-400 font-normal truncate max-w-[280px]">
                              {item.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                            {item.paymentMethod || 'cash'}
                          </span>
                        </td>
                        <td className={`py-3 text-center font-mono font-black ${
                          item.isRevenue ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {item.isRevenue ? '+' : '-'}{parseFloat(item.rawAmount || 0).toLocaleString()} ج.م
                        </td>
                        <td className="py-3 text-left pl-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                            item.isRevenue ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {item.isRevenue ? 'مقبوضات' : 'مصروفات'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-600 flex-shrink-0">
            <span>صفحة {currentPage} من {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                السابق
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                التالي
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default FinanceStatsDetailModal;
