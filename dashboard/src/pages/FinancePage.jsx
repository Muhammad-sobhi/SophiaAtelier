import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  DollarSign, TrendingUp, TrendingDown, Shield, SlidersHorizontal,
  X, FileText, Image as ImageIcon, Plus, CreditCard, Banknote,
  Smartphone, Building2, Wallet, ChevronRight, ChevronLeft, Filter, Search,
  Sparkles, Trash2, Paperclip, Download, FileSpreadsheet, ArrowLeftRight
} from 'lucide-react';
import { MultiPaymentMethodInput } from '@/components/MultiPaymentMethodInput';















const paymentMethodKeys = ['cash', 'credit_card', 'instapay', 'vodafone_cash', 'bank_transfer'];

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  // handles DD-MM-YYYY format from our formatter
  if (parts[0].length === 2) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

const formatDateStr = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  } catch {return dateStr;}
};

const paymentMethodLabels = {
  'instapay': 'إنستاباي',
  'vodafone cash': 'فودافون كاش',
  'vodafone_cash': 'فودافون كاش',
  'bank transfer': 'تحويل بنكي',
  'bank_transfer': 'تحويل بنكي',
  'credit_card': 'فيزا / كارت',
  'cash': 'نقدي (كاش)'
};

const categoryLabels = {
  'shop': 'مبيعات وحجوزات المحل',
  'operational': 'المشتريات والرواتب',
  'utilities': 'المرافق والخدمات العامة',
  'transfers': 'مناقلات وسحب وإيداع',
  'other': 'مصروفات أخرى',
  'deposit': 'مقدم حجز فستان',
  'balance': 'باقي مستحقات الحجز',
  'fitting_fee': 'رسوم تجربة (قياس)',
  'salary': 'رواتب موظفين',
  'cleaning': 'مصاريف تنظيف',
  'purchase': 'مشتريات فساتين وخامات',
  'maintenance': 'مصاريف صيانة',
  'transfer_out': 'مناقلة (تحويل صادر)',
  'transfer_in': 'مناقلة (تحويل وارد)',
  'owner_withdrawal': 'مسحوبات رصيد',
  'capital_deposit': 'إيداع رصيد'
};

const pmIcons = {
  'cash': Banknote, 'credit_card': CreditCard, 'instapay': Smartphone, 'vodafone_cash': Smartphone,
  'bank_transfer': Building2
};

export default function FinancePage() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePaymentFilter, setActivePaymentFilter] = useState(null);

  // Search & Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Date range filter & presets ('all' | 'today' | 'this_month' | 'last_3_months' | 'custom')
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [datePreset, setDatePreset] = useState('all');

  // Quick Receipt Preview Modal
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);

  // Vault Operations State (Transfer, Deposit, Withdraw)
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultTab, setVaultTab] = useState('transfer'); // 'transfer' | 'deposit' | 'withdraw'
  const [vaultFromMethod, setVaultFromMethod] = useState('instapay');
  const [vaultToMethod, setVaultToMethod] = useState('cash');
  const [vaultAmount, setVaultAmount] = useState('');
  const [vaultDate, setVaultDate] = useState(new Date().toISOString().split('T')[0]);
  const [vaultNotes, setVaultNotes] = useState('');
  const [vaultReceipt, setVaultReceipt] = useState(null);
  const [isSubmittingVault, setIsSubmittingVault] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, activePaymentFilter, searchQuery, filterStart, filterEnd]);

  const handleSelectDatePreset = (presetKey) => {
    setDatePreset(presetKey);
    const today = new Date();
    const formatYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (presetKey === 'all') {
      setFilterStart('');
      setFilterEnd('');
    } else if (presetKey === 'today') {
      const tStr = formatYMD(today);
      setFilterStart(tStr);
      setFilterEnd(tStr);
    } else if (presetKey === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFilterStart(formatYMD(firstDay));
      setFilterEnd(formatYMD(today));
    } else if (presetKey === 'last_3_months') {
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      setFilterStart(formatYMD(threeMonthsAgo));
      setFilterEnd(formatYMD(today));
    } else if (presetKey === 'custom') {
      if (!filterStart && !filterEnd) {
        setFilterStart(formatYMD(today));
        setFilterEnd(formatYMD(today));
      }
    }
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('لا توجد معاملات لتصديرها');
      return;
    }

    const headers = [
      'رقم المعاملة',
      'التاريخ',
      'الوصف',
      'العميل / العروس',
      'نوع المعاملة',
      'التصنيف',
      'طريقة الدفع',
      'المبلغ (ج.م)',
      'يوجد إيصال'
    ];

    const rows = filteredTransactions.map((t) => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${(t.desc || '').replace(/"/g, '""')}"`,
      `"${(t.clientName || '-').replace(/"/g, '""')}"`,
      `"${t.type}"`,
      `"${categoryLabels[t.category] || t.category || '-'}"`,
      `"${paymentMethodLabels[t.paymentMethod] || t.paymentMethod || 'نقدي'}"`,
      `"${t.rawAmount * (t.isRevenue ? 1 : -1)}"`,
      `"${t.receiptImage ? 'نعم' : 'لا'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_المعاملات_المالية_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // New Transaction Form state
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('مصروف');
  const [newCategory, setNewCategory] = useState('other');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPaymentMethod, setNewPaymentMethod] = useState('cash');
  const [revenueSplitPayments, setRevenueSplitPayments] = useState([{ amount: '', payment_method: 'cash' }]);
  const [newReceiptImage, setNewReceiptImage] = useState(null);

  // Cleaning Orders State
  const [cleaningOrders, setCleaningOrders] = useState([]);
  const [cleaningSummary, setCleaningSummary] = useState({ total_orders: 0, total_cost: 0, total_paid: 0, outstanding: 0 });
  const [isCleaningModalOpen, setIsCleaningModalOpen] = useState(false);
  const [showCleaningSection, setShowCleaningSection] = useState(false);
  const [cleaningDesc, setCleaningDesc] = useState('');
  const [cleaningCost, setCleaningCost] = useState('');
  const [cleaningPaid, setCleaningPaid] = useState('');
  const [cleaningDate, setCleaningDate] = useState(new Date().toISOString().split('T')[0]);
  const [cleaningNotes, setCleaningNotes] = useState('');

  // Numeric totals from backend
  const [totals, setTotals] = useState({ 
    net_revenue: 0, 
    net_expense: 0, 
    net_profit: 0, 
    held_insurances: 0, 
    total_assets: 0 
  });

  const buildQS = useCallback(() => {
    const p = { per_page: '500' };
    if (filterStart) p.start_date = filterStart;
    if (filterEnd) p.end_date = filterEnd;
    return new URLSearchParams(p).toString();
  }, [filterStart, filterEnd]);

  const loadData = useCallback(async () => {
    try {
      const qs = buildQS();
      const [revRes, expRes, summaryRes] = await Promise.all([
      apiClient.get(`/revenues?${qs}`),
      apiClient.get(`/expenses?${qs}`),
      apiClient.get(`/finance/summary?${qs}`)]
      );

      const revList = Array.isArray(revRes) ? revRes : revRes.data || [];
      const expList = Array.isArray(expRes) ? expRes : expRes.data || [];

      const revenueTxs = revList.map((r) => {
        const val = parseFloat(r.amount || 0);
        let mappedCat = 'shop';
        let txType = val >= 0 ? 'إيراد' : 'مرتجع';
        if (r.type === 'transfer_in') {
          mappedCat = 'transfers';
          txType = 'مناقلة (وارد)';
        } else if (r.type === 'capital_deposit') {
          mappedCat = 'transfers';
          txType = 'إيداع رصيد';
        }

        return {
          id: `revenue-${r.id}`,
          desc: r.notes || `دفعة مالية (${r.type || 'other'})`,
          type: txType,
          category: mappedCat,
          rawAmount: val,
          amount: val >= 0 ? `+${val.toLocaleString()} ج.م` : `-${Math.abs(val).toLocaleString()} ج.م`,
          date: formatDateStr(r.payment_date || ''),
          isRevenue: true,
          paymentMethod: (r.payment_method || 'cash').toLowerCase().replace(/ /g, '_'),
          clientName: r.booking?.client?.name,
          receiptImage: r.receipt_url
        };
      });

      const expenseTxs = expList.map((e) => {
        let mappedCat = 'other';
        let txType = 'مصروف';
        if (e.category === 'salary' || e.category === 'purchase') mappedCat = 'operational';
        else if (e.category === 'cleaning' || e.category === 'maintenance') mappedCat = 'utilities';
        else if (e.category === 'transfer_out') {
          mappedCat = 'transfers';
          txType = 'مناقلة (صادر)';
        } else if (e.category === 'owner_withdrawal') {
          mappedCat = 'transfers';
          txType = 'سحب رصيد';
        }

        return {
          id: `expense-${e.id}`,
          desc: e.description || `مصروف (${e.category || 'other'})`,
          type: txType,
          category: mappedCat,
          rawAmount: parseFloat(e.amount || 0),
          amount: `-${parseFloat(e.amount || 0).toLocaleString()} ج.م`,
          date: formatDateStr(e.date || ''),
          isRevenue: false,
          paymentMethod: (e.payment_method || 'cash').toLowerCase().replace(/ /g, '_'),
          receiptImage: e.receipt_url
        };
      });

      const combined = [...revenueTxs, ...expenseTxs];
      combined.sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
      setAllTransactions(combined);

      if (summaryRes) {
        setTotals({
          net_revenue: summaryRes.net_revenue || 0,
          net_expense: summaryRes.net_expense || 0,
          net_profit: summaryRes.net_profit || 0,
          held_insurances: summaryRes.held_insurances || 0,
          total_assets: summaryRes.total_assets || 0,
        });
      }
    } catch (e) {
      console.error('Failed to load finance data:', e);
    }
  }, [buildQS]);

  useEffect(() => {loadData();}, [loadData]);

  // Load cleaning orders
  const loadCleaningOrders = useCallback(async () => {
    try {
      const res = await apiClient.get('/cleaning-orders');
      setCleaningOrders(res.orders || []);
      setCleaningSummary(res.summary || { total_orders: 0, total_cost: 0, total_paid: 0, outstanding: 0 });
    } catch (e) {
      console.error('Failed to load cleaning orders:', e);
    }
  }, []);

  useEffect(() => {
    if (showCleaningSection) loadCleaningOrders();
  }, [showCleaningSection, loadCleaningOrders]);

  const handleAddTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!newDesc.trim() || !newAmount.trim()) return;

    const amountVal = parseFloat(newAmount);
    const isRevenue = newType === 'إيراد';

    try {
      if (isRevenue) {
        const validPayments = revenueSplitPayments.filter(p => parseFloat(p.amount) > 0);
        const totalRev = validPayments.length > 0
          ? validPayments.reduce((s, p) => s + parseFloat(p.amount), 0)
          : amountVal;

        await apiClient.post('/revenues', {
          type: newCategory === 'shop' ? 'deposit' : 'other',
          amount: totalRev,
          payment_method: validPayments.length === 1 ? validPayments[0].payment_method : (validPayments.length > 1 ? 'multiple' : newPaymentMethod),
          payments: validPayments.length > 0 ? validPayments : [{ amount: totalRev, payment_method: newPaymentMethod }],
          payment_date: newDate,
          notes: newDesc,
          receipt_image: newReceiptImage
        });
      } else {
        let backendCat = 'other';
        if (newCategory === 'operational') backendCat = 'purchase';else
        if (newCategory === 'utilities') backendCat = 'maintenance';

        await apiClient.post('/expenses', {
          category: backendCat,
          amount: amountVal,
          description: newDesc,
          date: newDate,
          payment_method: newPaymentMethod,
          receipt_image: newReceiptImage
        });
      }

      loadData();
      setIsModalOpen(false);

      setNewDesc('');
      setNewType('مصروف');
      setNewCategory('other');
      setNewAmount('');
      setRevenueSplitPayments([{ amount: '', payment_method: 'cash' }]);
      setNewDate(new Date().toISOString().split('T')[0]);
      setNewPaymentMethod('cash');
      setNewReceiptImage(null);
    } catch (e) {
      console.error('Failed to add transaction:', e);
    }
  };

  const handleAddCleaningOrder = async (e) => {
    e.preventDefault();
    if (!cleaningDesc.trim() || !cleaningCost) return;

    try {
      await apiClient.post('/cleaning-orders', {
        description: cleaningDesc,
        cost: parseFloat(cleaningCost),
        paid_amount: parseFloat(cleaningPaid) || 0,
        date: cleaningDate,
        notes: cleaningNotes,
      });

      setIsCleaningModalOpen(false);
      setCleaningDesc('');
      setCleaningCost('');
      setCleaningPaid('');
      setCleaningNotes('');
      loadCleaningOrders();
      loadData(); // refresh finance totals too
    } catch (e) {
      console.error('Failed to add cleaning order:', e);
    }
  };

  const handleDeleteCleaningOrder = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      await apiClient.delete(`/cleaning-orders/${id}`);
      loadCleaningOrders();
    } catch (e) {
      console.error('Failed to delete cleaning order:', e);
    }
  };

  const handleUpdateCleaningPayment = async (order, newPaidAmount) => {
    try {
      await apiClient.put(`/cleaning-orders/${order.id}`, {
        paid_amount: parseFloat(newPaidAmount),
      });
      loadCleaningOrders();
    } catch (e) {
      console.error('Failed to update cleaning payment:', e);
    }
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewReceiptImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVaultReceiptUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVaultReceipt(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVaultSubmit = async (e) => {
    e.preventDefault();
    if (!vaultAmount || parseFloat(vaultAmount) <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    setIsSubmittingVault(true);
    try {
      if (vaultTab === 'transfer') {
        if (vaultFromMethod === vaultToMethod) {
          alert('لا يمكن التحويل لنفس وسيلة الدفع');
          setIsSubmittingVault(false);
          return;
        }
        await apiClient.post('/finance/transfer', {
          from_method: vaultFromMethod,
          to_method: vaultToMethod,
          amount: parseFloat(vaultAmount),
          date: vaultDate,
          notes: vaultNotes,
          receipt_image: vaultReceipt
        });
      } else if (vaultTab === 'deposit') {
        await apiClient.post('/finance/deposit', {
          payment_method: vaultToMethod,
          amount: parseFloat(vaultAmount),
          date: vaultDate,
          notes: vaultNotes,
          receipt_image: vaultReceipt
        });
      } else if (vaultTab === 'withdraw') {
        await apiClient.post('/finance/withdraw', {
          payment_method: vaultFromMethod,
          amount: parseFloat(vaultAmount),
          date: vaultDate,
          notes: vaultNotes,
          receipt_image: vaultReceipt
        });
      }

      await loadData();
      setIsVaultModalOpen(false);
      setVaultAmount('');
      setVaultNotes('');
      setVaultReceipt(null);
      setVaultDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      console.error('Failed vault operation:', err);
      alert(err.response?.data?.message || 'حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setIsSubmittingVault(false);
    }
  };

  // Payment method breakdown
  const paymentBreakdown = paymentMethodKeys.map((key) => {
    const methods = [key, key.replace('_', ' ')];
    const txs = allTransactions.filter((t) => methods.includes(t.paymentMethod));
    const income = txs.filter((t) => t.isRevenue).reduce((s, t) => s + t.rawAmount, 0);
    const outcome = txs.filter((t) => !t.isRevenue).reduce((s, t) => s + t.rawAmount, 0);
    const balance = income - outcome;
    return { key, label: paymentMethodLabels[key] || key, income, outcome, balance, count: txs.length };
  });

  // Filter transactions based on active tab, active payment filter, AND search query
  const filteredTransactions = allTransactions.filter((t) => {
    const tabOk = activeTab === 'all' || t.category === activeTab;
    const methodOk = !activePaymentFilter ||
    [activePaymentFilter, activePaymentFilter.replace('_', ' ')].includes(t.paymentMethod);

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      (t.desc && t.desc.toLowerCase().includes(query)) ||
      (categoryLabels[t.category] && categoryLabels[t.category].toLowerCase().includes(query)) ||
      (paymentMethodLabels[t.paymentMethod] && paymentMethodLabels[t.paymentMethod].toLowerCase().includes(query)) ||
      (t.amount && t.amount.toLowerCase().includes(query)) ||
      (t.date && t.date.includes(query));

    return tabOk && methodOk && matchesSearch;
  });

  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const summaryCards = [
  { label: 'صافي الأرباح', value: `${totals.net_profit.toLocaleString()} ج.م`, icon: TrendingUp, colorClass: totals.net_profit >= 0 ? 'text-indigo-600' : 'text-rose-600', bgClass: totals.net_profit >= 0 ? 'bg-indigo-50' : 'bg-rose-50' },
  { label: 'المبيعات / الإيرادات', value: `${totals.net_revenue.toLocaleString()} ج.م`, icon: DollarSign, colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50' },
  { label: 'المصروفات التشغيلية', value: `${totals.net_expense.toLocaleString()} ج.م`, icon: TrendingDown, colorClass: 'text-rose-600', bgClass: 'bg-rose-50' },
  { label: 'إجمالي الأصول (الفساتين)', value: `${totals.total_assets.toLocaleString()} ج.م`, icon: Building2, colorClass: 'text-sky-600', bgClass: 'bg-sky-50' },
  { label: 'التأمينات المحتجزة (أمانات)', value: `${totals.held_insurances.toLocaleString()} ج.م`, icon: Shield, colorClass: 'text-amber-600', bgClass: 'bg-amber-50' }];


  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 text-right pb-12" dir="rtl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-800">المركز المالي والحسابات</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">مراقبة المقبوضات وصافي الأرباح وإدارة المصروفات التشغيلية.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            type="button"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl transition-all text-xs font-bold shadow-xs active:scale-95 cursor-pointer w-full sm:w-auto"
            title="تصدير كشف المعاملات إلى ملف Excel"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-md shadow-indigo-600/10 active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Plus size={16} />
            <span>إضافة معاملة مالية</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter with Quick Presets */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 ml-1">
            <Filter size={15} className="text-indigo-500" />
            <span className="text-xs font-extrabold text-slate-700">فلتر الفترة:</span>
          </div>

          {/* Quick Presets: اليوم / هذا الشهر / آخر 3 أشهر / الكل / مخصص */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 flex-wrap">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'today', label: 'اليوم' },
              { id: 'this_month', label: 'هذا الشهر' },
              { id: 'last_3_months', label: 'آخر 3 أشهر' },
              { id: 'custom', label: 'مخصص 📅' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectDatePreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right side: Manual Date Inputs (Only when Custom is selected) + Transactions count */}
        <div className="flex items-center gap-2 flex-wrap">
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap animate-fade-in">
              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                <label className="text-[10px] font-extrabold text-slate-400">من</label>
                <input
                  type="date"
                  value={filterStart}
                  onChange={(e) => {
                    setFilterStart(e.target.value);
                  }}
                  className="w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-700 font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                <label className="text-[10px] font-extrabold text-slate-400">إلى</label>
                <input
                  type="date"
                  value={filterEnd}
                  onChange={(e) => {
                    setFilterEnd(e.target.value);
                  }}
                  className="w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-700 font-mono"
                />
              </div>
              {(filterStart || filterEnd) && (
                <button
                  type="button"
                  onClick={() => handleSelectDatePreset('all')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-extrabold bg-rose-50 text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-100/60 transition-all cursor-pointer"
                >
                  <X size={12} /> مسح
                </button>
              )}
            </div>
          )}
          <span className="text-[10px] font-extrabold text-indigo-500 bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-indigo-100">
            {filteredTransactions.length} معاملة
          </span>
        </div>
      </div>

      {/* KPI Cards (2 Columns on Mobile, 5 Columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-5 flex-shrink-0">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(79,70,229,0.05)] transition-all duration-300">
              <div className="flex items-center gap-2.5 mb-2 sm:mb-3.5">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center ${card.bgClass} ${card.colorClass}`}>
                  <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                </div>
              </div>
              <div className={`text-sm sm:text-xl font-extrabold ${card.colorClass} truncate`}>{card.value}</div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-1 truncate">{card.label}</div>
            </div>);

        })}
      </div>

      {/* Payment Method Breakdown */}
      {paymentBreakdown.length > 0 &&
      <div className="flex-shrink-0">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Wallet size={15} className="text-indigo-500" />
              <h2 className="text-xs font-extrabold text-slate-700">تفصيل وسائل الدفع</h2>
              <span className="text-[9px] font-bold text-slate-400 hidden sm:inline">— اضغط لعرض معاملات وسيلة بعينها</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setVaultTab('transfer');
                setVaultFromMethod('instapay');
                setVaultToMethod('cash');
                setVaultAmount('');
                setVaultNotes('');
                setVaultReceipt(null);
                setVaultDate(new Date().toISOString().split('T')[0]);
                setIsVaultModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <ArrowLeftRight size={13} className="text-indigo-600" />
              <span>مناقلة / سحب وإيداع 🔄</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {paymentBreakdown.map((pm) => {
            const Icon = pmIcons[pm.key] || Wallet;
            const isActive = activePaymentFilter === pm.key;
            return (
              <button key={pm.key} onClick={() => setActivePaymentFilter(isActive ? null : pm.key)}
              className={`text-right p-3 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer w-full ${
              isActive ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' :
              'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-slate-50'}`}>
                      <Icon size={14} className={isActive ? 'text-white' : 'text-indigo-500'} />
                    </div>
                    {isActive && <X size={13} className="text-white/70" />}
                  </div>
                  <p className={`text-[10px] font-extrabold mb-1 ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{pm.label}</p>
                  <p className={`text-xs sm:text-sm font-black ${isActive ? 'text-white' : pm.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                    {pm.balance.toLocaleString()} ج.م
                  </p>
                  <div className={`text-[9px] font-bold mt-1 flex items-center justify-between gap-1 ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                    <span className={isActive ? 'text-white/90' : 'text-emerald-600'}>+{pm.income.toLocaleString()}</span>
                    {pm.outcome > 0 && <span className={isActive ? 'text-white/90' : 'text-rose-500'}>-{pm.outcome.toLocaleString()}</span>}
                  </div>
                  <p className={`text-[8.5px] mt-1 font-bold ${isActive ? 'text-white/60' : 'text-slate-400'}`}>{pm.count} معاملة</p>
                </button>);

          })}
          </div>
          {activePaymentFilter &&
        <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                عرض: {paymentMethodLabels[activePaymentFilter] || activePaymentFilter} ({filteredTransactions.length} معاملة)
              </span>
              <button onClick={() => setActivePaymentFilter(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline cursor-pointer">
                عرض الكل
              </button>
            </div>
        }
        </div>
      }

      {/* Section Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none flex-shrink-0 -mx-1 px-1">
        {[
        { id: 'all', label: 'الكل' },
        { id: 'shop', label: 'مبيعات وحجوزات' },
        { id: 'operational', label: 'المشتريات والرواتب' },
        { id: 'utilities', label: 'المرافق والخدمات' },
        { id: 'transfers', label: 'مناقلات وسحب وإيداع 🔄' },
        { id: 'other', label: 'مصروفات أخرى' }].
        map((tab) =>
        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
        className={`px-3.5 py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${
        activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' :
        'bg-white border border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            {tab.label}
          </button>
        )}
        <button
          onClick={() => setShowCleaningSection(!showCleaningSection)}
          className={`px-3.5 py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            showCleaningSection ? 'bg-sparkles-600 bg-sky-600 text-white shadow-md shadow-sky-600/15' : 'bg-sky-50 border border-sky-100 text-sky-700 hover:bg-sky-100'
          }`}>
          <Sparkles size={13} />
          <span>طلبات التنظيف والكي ({cleaningSummary.total_orders || 0})</span>
        </button>
      </div>

      {/* Cleaning Orders Section */}
      {showCleaningSection && (
        <div className="bg-white rounded-3xl p-5 border border-sky-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <Sparkles size={16} className="text-sky-500" />
                تتبع تكاليف الشخص المسئول عن تنظيف الفساتين
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">تسجيل تكاليف غسيل/تنظيف الفساتين وتدقيق المبالغ المدفوعة والمتبقية</p>
            </div>
            <button
              onClick={() => setIsCleaningModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer self-start sm:self-auto">
              <Plus size={15} />
              <span>تسجيل طلب تنظيف جديد</span>
            </button>
          </div>

          {/* Cleaning Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-sky-50/50 p-3 rounded-2xl border border-sky-100">
              <span className="text-[10px] text-slate-400 font-bold block">إجمالي عدد الطلبات:</span>
              <span className="font-extrabold text-sky-700 text-sm">{cleaningSummary.total_orders} طلب</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block">إجمالي التكلفة:</span>
              <span className="font-extrabold text-slate-800 text-sm">{cleaningSummary.total_cost.toLocaleString()} ج.م</span>
            </div>
            <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 font-bold block">المبلغ المدفوع:</span>
              <span className="font-extrabold text-emerald-700 text-sm">{cleaningSummary.total_paid.toLocaleString()} ج.م</span>
            </div>
            <div className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100">
              <span className="text-[10px] text-slate-400 font-bold block">المتبقي (آجل/غير مدفوع):</span>
              <span className="font-extrabold text-rose-600 text-sm">{cleaningSummary.outstanding.toLocaleString()} ج.م</span>
            </div>
          </div>

          {/* Cleaning Orders List */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">بيان / تفاصيل التنظيف</th>
                  <th className="p-3">التكلفة الإجمالية</th>
                  <th className="p-3">المبلغ المدفوع</th>
                  <th className="p-3">حالة الدفع</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cleaningOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400 font-bold">لا يوجد طلبات تنظيف مسجلة</td>
                  </tr>
                ) : (
                  cleaningOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 font-semibold">
                      <td className="p-3 text-slate-500 whitespace-nowrap">{order.date}</td>
                      <td className="p-3 text-slate-800 font-bold">
                        {order.description}
                        {order.notes && <span className="block text-[10px] text-slate-400 font-normal">{order.notes}</span>}
                      </td>
                      <td className="p-3 font-extrabold text-slate-800">{parseFloat(order.cost).toLocaleString()} ج.م</td>
                      <td className="p-3 font-extrabold text-emerald-600">
                        {parseFloat(order.paid_amount).toLocaleString()} ج.م
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                          order.payment_status === 'partial' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {order.payment_status === 'paid' ? 'تم الدفع بالكامل' : order.payment_status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              const newAmount = prompt('أدخل المبلغ المدفوع الجديد:', order.paid_amount);
                              if (newAmount !== null && !isNaN(parseFloat(newAmount))) {
                                handleUpdateCleaningPayment(order, newAmount);
                              }
                            }}
                            className="text-[10px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 px-2 py-1 rounded-lg cursor-pointer">
                            تحديث المدفوع
                          </button>
                          <button
                            onClick={() => handleDeleteCleaningOrder(order.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Log Table & Mobile Cards */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-50 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800">
              {activePaymentFilter ? `معاملات ${paymentMethodLabels[activePaymentFilter] || activePaymentFilter}` :
              activeTab === 'all' ? 'سجل كافة المعاملات المالية' : `سجل: ${categoryLabels[activeTab]}`}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              إجمالي نتائج البحث: {filteredTransactions.length} قيد (حد أقصى 20 معاملة بالصفحة)
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="بحث بالوصف، المبلغ، وسيلة الدفع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">لا توجد قيود مالية مطابقة للبحث أو الفلتر المحدد.</div>
        ) : (
          <>
            {/* Mobile Cards View (Visible on screens < md) */}
            <div className="block md:hidden p-3 space-y-2.5">
              {paginatedTransactions.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTx(t)}
                  className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 flex flex-col gap-2 active:bg-indigo-50/30 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {t.receiptImage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = t.receiptImage.startsWith('http') || t.receiptImage.startsWith('data:')
                              ? t.receiptImage
                              : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/${t.receiptImage.replace(/^(storage\/|public\/)/, '')}`;
                            setPreviewReceiptUrl(url);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-[9px] font-extrabold transition-all cursor-pointer flex-shrink-0"
                          title="معاينة إيصال الدفع"
                        >
                          <Paperclip size={10} className="text-indigo-600" />
                          <span>إيصال</span>
                        </button>
                      )}
                      <span className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">{t.desc}</span>
                    </div>
                    <span className={`text-xs font-extrabold whitespace-nowrap ${t.isRevenue && t.rawAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.amount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-white border border-slate-150 rounded-md font-extrabold text-slate-600">
                        {categoryLabels[t.category] || '-'}
                      </span>
                      <span>{paymentMethodLabels[t.paymentMethod] || 'نقدي'}</span>
                    </div>
                    <span className="font-mono">{t.date}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (Visible on screens >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100/70">
                    <th className="px-5 py-4 text-xs font-extrabold text-slate-400">الوصف</th>
                    <th className="px-5 py-4 text-xs font-extrabold text-slate-400">التصنيف</th>
                    <th className="px-5 py-4 text-xs font-extrabold text-slate-400">وسيلة الدفع</th>
                    <th className="px-5 py-4 text-xs font-extrabold text-slate-400">المبلغ</th>
                    <th className="px-5 py-4 text-xs font-extrabold text-slate-400">التاريخ</th>
                    <th className="px-5 py-4 text-xs text-left"><SlidersHorizontal size={13} className="text-slate-400 inline" /></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTx(t)}
                      className="border-b border-slate-50 last:border-0 hover:bg-indigo-50/20 transition-all duration-200 cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-800 max-w-[260px]">
                        <div className="flex items-center gap-1.5">
                          {t.receiptImage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = t.receiptImage.startsWith('http') || t.receiptImage.startsWith('data:')
                                  ? t.receiptImage
                                  : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/${t.receiptImage.replace(/^(storage\/|public\/)/, '')}`;
                                setPreviewReceiptUrl(url);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-[9px] font-extrabold transition-all cursor-pointer shadow-2xs flex-shrink-0"
                              title="معاينة إيصال الدفع"
                            >
                              <Paperclip size={10} className="text-indigo-600" />
                              <span>إيصال</span>
                            </button>
                          )}
                          <span className="truncate">{t.desc}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-extrabold text-slate-650">
                          {categoryLabels[t.category] || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-semibold whitespace-nowrap">
                        {paymentMethodLabels[t.paymentMethod] || 'نقدي'}
                      </td>
                      <td className={`px-5 py-3.5 text-xs font-extrabold whitespace-nowrap ${t.isRevenue && t.rawAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.amount}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-semibold whitespace-nowrap">{t.date}</td>
                      <td className="px-5 py-3.5 text-left">
                        <ChevronRight size={14} className="text-slate-300 inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {filteredTransactions.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-extrabold text-slate-500">
                <div>
                  عرض {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} من إجمالي {filteredTransactions.length} قيد
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5 dir-rtl">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ChevronRight size={14} />
                      <span>السابق</span>
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                        .map((page, idx, arr) => {
                          const prevPage = arr[idx - 1];
                          const isGap = prevPage && page - prevPage > 1;

                          return (
                            <React.Fragment key={page}>
                              {isGap && <span className="text-slate-300 text-xs px-1">...</span>}
                              <button
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={`w-7 h-7 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                                  currentPage === page
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>التالي</span>
                      <ChevronLeft size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Transaction details popup */}
      {selectedTx &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] text-right">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">بيانات المعاملة المالية بالتفصيل</h3>
              <button
              onClick={() => setSelectedTx(null)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-grow scrollbar-thin">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-700">
                <div className="col-span-2">
                  <span className="text-[10px] font-extrabold text-slate-400 block">وصف العملية</span>
                  <span className="text-xs font-bold text-slate-700 mt-1 block">{selectedTx.desc}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block">نوع المعاملة</span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border w-fit block mt-1 ${
                selectedTx.isRevenue && selectedTx.rawAmount >= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`
                }>
                    {selectedTx.type}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block">التصنيف</span>
                  <span className="text-xs font-bold text-slate-600 mt-1 block">
                    {categoryLabels[selectedTx.category] || categoryLabels['other']}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block">تاريخ العملية</span>
                  <span className="text-xs font-semibold text-slate-600 mt-1 block">{selectedTx.date}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block">طريقة الدفع</span>
                  <span className="text-xs font-extrabold text-indigo-600 mt-1 block">
                    {paymentMethodLabels[selectedTx.paymentMethod || 'cash'] || 'نقدي (كاش)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block">المبلغ</span>
                  <span className={`text-xs font-extrabold mt-1 block ${selectedTx.isRevenue && selectedTx.rawAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedTx.amount}
                  </span>
                </div>
              </div>
              {/* Receipt photo preview if available */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-slate-600 block">إيصال الدفع المرفق للمعاملة</span>
                {selectedTx.receiptImage ?
              <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm max-h-[300px] flex items-center justify-center bg-slate-50 relative group">
                    <img
                  src={selectedTx.receiptImage.startsWith('http') || selectedTx.receiptImage.startsWith('data:') ?
                  selectedTx.receiptImage :
                  `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/${selectedTx.receiptImage.replace(/^(storage\/|public\/)/, '')}`}
                  alt="إيصال الدفع المعاملة"
                  className="w-full h-full object-contain max-h-[280px]" />
                
                    <a
                  href={selectedTx.receiptImage}
                  download={`tx-receipt-${selectedTx.id}.png`}
                  className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all">
                  
                      <FileText size={12} /> تحميل إيصال المعاملة
                    </a>
                  </div> :

              <div className="border border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                    <ImageIcon size={28} className="text-slate-300" />
                    <span className="text-xs font-bold">لا يوجد إيصال دفع مرفق</span>
                    <span className="text-[10px]">المعاملة تمت نقداً (كاش) أو لم يتم رفع إيصال رقمي لها بعد.</span>
                  </div>
              }
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
              onClick={() => setSelectedTx(null)}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer">
              
                إغلاق
              </button>
            </div>
          </div>
        </div>
      }

      {/* Add Manual Transaction Modal */}
      {isModalOpen &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">إضافة معاملة مالية جديدة</h3>
              <button
              onClick={() => setIsModalOpen(false)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddTransactionSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">الوصف المعاملة</label>
                <input
                type="text"
                required
                placeholder="مثال: فاتورة صيانة المحل أو دفعة مبيعات"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700" />
              
              </div>

              {/* Type and Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">نوع المعاملة</label>
                  <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700">
                  
                    <option value="مصروف">مصروف (سحب/تكلفة)</option>
                    <option value="إيراد">إيراد (مقبوضات)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">قسم / تصنيف المعاملة</label>
                  <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700">
                  
                    <option value="shop">مبيعات وحجوزات المحل</option>
                    <option value="operational">المشتريات والرواتب</option>
                    <option value="utilities">المرافق والخدمات</option>
                    <option value="other">مصروفات أخرى</option>
                  </select>
                </div>
              </div>

              {/* Amount & Payment Method for Revenue vs Expense */}
              {newType === 'إيراد' ? (
                <div className="space-y-3">
                  <MultiPaymentMethodInput
                    payments={revenueSplitPayments}
                    onChange={(updated) => {
                      setRevenueSplitPayments(updated);
                      const total = updated.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                      setNewAmount(total > 0 ? total.toString() : '');
                    }}
                    label="طرق ومبالغ الإيراد"
                    required
                  />
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">التاريخ</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-600">المبلغ (ج.م)</label>
                      <input
                        type="number"
                        required
                        placeholder="مثال: 500"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-600">التاريخ</label>
                      <input
                        type="date"
                        required
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">طريقة السداد / الدفع</label>
                    <select
                      value={newPaymentMethod}
                      onChange={(e) => setNewPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
                    >
                      <option value="credit_card">فيزا / كارت</option>
                      <option value="instapay">إنستاباي (InstaPay)</option>
                      <option value="vodafone_cash">فودافون كاش</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="cash">نقدي (كاش)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Upload Receipt */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-600 block">إرفاق صورة الإيصال (اختياري)</label>
                <div className="flex items-center gap-3">
                  <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  className="hidden"
                  id="finance-file-input" />
                
                  <label
                  htmlFor="finance-file-input"
                  className="flex-grow px-4 py-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs font-bold text-indigo-600 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-center gap-1.5 transition-all">
                  
                    <CreditCard size={14} />
                    <span>{newReceiptImage ? 'تغيير صورة الإيصال المرفقة' : 'رفع إيصال'}</span>
                  </label>
                  {newReceiptImage &&
                <button
                  type="button"
                  onClick={() => setNewReceiptImage(null)}
                  className="p-2.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl hover:bg-rose-100/60 transition-all cursor-pointer">
                  
                      <X size={14} />
                    </button>
                }
                </div>
                {newReceiptImage &&
              <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[120px] flex items-center justify-center bg-slate-50">
                    <img src={newReceiptImage} alt="معاينة الإيصال" className="w-full h-full object-contain max-h-[110px]" />
                  </div>
              }
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center shadow-sm">
                
                  حفظ المعاملة
                </button>
                <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Cleaning Order Modal */}
      {isCleaningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs text-slate-700">
          <div className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-md border border-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Sparkles size={16} className="text-sky-500" />
                تسجيل طلب تنظيف/غسيل جديد
              </h3>
              <button
                onClick={() => setIsCleaningModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCleaningOrder} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-600 block mb-1">البيان / تفاصيل الفساتين والنظافة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تنظيف 3 فساتين زفاف كود D-101, D-105"
                  value={cleaningDesc}
                  onChange={(e) => setCleaningDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-600 block mb-1">التكلفة الإجمالية (ج.م)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="مثال: 300"
                    value={cleaningCost}
                    onChange={(e) => setCleaningCost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600 block mb-1">المبلغ المدفوع حالياً (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="مثال: 200"
                    value={cleaningPaid}
                    onChange={(e) => setCleaningPaid(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600 block mb-1">التاريخ</label>
                <input
                  type="date"
                  required
                  value={cleaningDate}
                  onChange={(e) => setCleaningDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-600 block mb-1">ملاحظات إضافية (اختياري)</label>
                <textarea
                  rows={2}
                  value={cleaningNotes}
                  onChange={(e) => setCleaningNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-semibold resize-none"
                  placeholder="ملاحظات حول حالة الغسيل أو موعد الاستلام..."
                />
              </div>

              <div className="bg-sky-50 border border-sky-200 p-3 rounded-2xl">
                <p className="text-[10px] text-sky-700 font-bold">
                  ℹ️ سيتم إضافة التكلفة تلقائياً إلى المصروفات في المالية تحت قسم "خدمات وتنظيف".
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer">
                  حفظ طلب التنظيف
                </button>
                <button
                  type="button"
                  onClick={() => setIsCleaningModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vault Operations Modal (Transfer, Deposit, Withdraw) */}
      {isVaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ArrowLeftRight size={18} className="text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-800">إدارة حركة الخزائن والمحافظ</h3>
              </div>
              <button
                onClick={() => setIsVaultModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/30 p-2 gap-1.5">
              <button
                type="button"
                onClick={() => setVaultTab('transfer')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  vaultTab === 'transfer'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowLeftRight size={13} />
                <span>تحويل بين الخزائن</span>
              </button>
              <button
                type="button"
                onClick={() => setVaultTab('deposit')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  vaultTab === 'deposit'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Plus size={13} />
                <span>إيداع رصيد</span>
              </button>
              <button
                type="button"
                onClick={() => setVaultTab('withdraw')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  vaultTab === 'withdraw'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TrendingDown size={13} />
                <span>سحب رصيد</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleVaultSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              {/* Transfer Fields */}
              {vaultTab === 'transfer' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600 block">من وسيلة (المصدر)</label>
                    <select
                      value={vaultFromMethod}
                      onChange={(e) => {
                        setVaultFromMethod(e.target.value);
                        if (e.target.value === vaultToMethod) {
                          const other = paymentMethodKeys.find((k) => k !== e.target.value);
                          if (other) setVaultToMethod(other);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    >
                      {paymentMethodKeys.map((k) => (
                        <option key={k} value={k}>{paymentMethodLabels[k] || k}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600 block">إلى وسيلة (الوجهة)</label>
                    <select
                      value={vaultToMethod}
                      onChange={(e) => setVaultToMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    >
                      {paymentMethodKeys.filter((k) => k !== vaultFromMethod).map((k) => (
                        <option key={k} value={k}>{paymentMethodLabels[k] || k}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Deposit Field */}
              {vaultTab === 'deposit' && (
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600 block">إلى وسيلة الدفع / الخزينة المستفيدة</label>
                  <select
                    value={vaultToMethod}
                    onChange={(e) => setVaultToMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700"
                  >
                    {paymentMethodKeys.map((k) => (
                      <option key={k} value={k}>{paymentMethodLabels[k] || k}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Withdraw Field */}
              {vaultTab === 'withdraw' && (
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600 block">من وسيلة الدفع / الخزينة المسحوب منها</label>
                  <select
                    value={vaultFromMethod}
                    onChange={(e) => setVaultFromMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-700"
                  >
                    {paymentMethodKeys.map((k) => (
                      <option key={k} value={k}>{paymentMethodLabels[k] || k}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600 block">المبلغ (ج.م)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="مثال: 5000"
                    value={vaultAmount}
                    onChange={(e) => setVaultAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600 block">التاريخ</label>
                  <input
                    type="date"
                    required
                    value={vaultDate}
                    onChange={(e) => setVaultDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Notes / Description */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600 block">البيان / ملاحظات العملية</label>
                <input
                  type="text"
                  placeholder={
                    vaultTab === 'transfer' ? 'مثال: تحويل سيولة لتغطية مصاريف الأسبوع' :
                    vaultTab === 'deposit' ? 'مثال: تغذية حساب إنستاباي برصيد إضافي' :
                    'مثال: مسحوبات أرباح المالك'
                  }
                  value={vaultNotes}
                  onChange={(e) => setVaultNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Upload Receipt */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600 block">إرفاق إيصال / سكرين شوت (اختياري)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleVaultReceiptUpload}
                    className="hidden"
                    id="vault-receipt-input"
                  />
                  <label
                    htmlFor="vault-receipt-input"
                    className="flex-grow px-3 py-2 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Paperclip size={13} />
                    <span>{vaultReceipt ? 'تغيير صورة الإيصال المرفقة' : 'رفع إيصال التحويل'}</span>
                  </label>
                  {vaultReceipt && (
                    <button
                      type="button"
                      onClick={() => setVaultReceipt(null)}
                      className="p-2 bg-rose-50 border border-rose-100 text-rose-500 rounded-xl hover:bg-rose-100/60 transition-all cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Informative Notice */}
              <div className="bg-indigo-50/70 border border-indigo-150 p-2.5 rounded-xl text-[10px] text-indigo-800 font-bold leading-relaxed">
                {vaultTab === 'transfer' && 'ℹ️ التحويل الداخلي بين الخزائن يغير أرصدة وسائل الدفع فوراً دون التأثير على أرباح الأتيليه التشغيلية.'}
                {vaultTab === 'deposit' && 'ℹ️ الإيداع يضيف رصيداً جديداً للخزينة المحددة تحت بند "إيداع رصيد".'}
                {vaultTab === 'withdraw' && 'ℹ️ السحب يخصم المبلغ من الخزينة المحددة ويصنفه كـ "مسحوبات رصيد".'}
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmittingVault}
                  className={`flex-1 py-2.5 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                    vaultTab === 'transfer' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' :
                    vaultTab === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' :
                    'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {isSubmittingVault ? 'جاري الحفظ...' :
                   vaultTab === 'transfer' ? 'تأكيد التحويل بين الخزائن 🔄' :
                   vaultTab === 'deposit' ? 'تأكيد الإيداع في الخزينة 📥' :
                   'تأكيد السحب من الخزينة 📤'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsVaultModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Receipt Lightbox Preview Modal */}
      {previewReceiptUrl && (
        <div
          onClick={() => setPreviewReceiptUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in text-slate-700 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] text-right cursor-default"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Paperclip size={16} className="text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-800">معاينة إيصال الدفع</h3>
              </div>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-900/5 max-h-[70vh] overflow-auto">
              <img
                src={previewReceiptUrl}
                alt="إيصال الدفع"
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-md border border-slate-200 bg-white"
              />
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <a
                href={previewReceiptUrl}
                download={`receipt_${Date.now()}.png`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download size={14} />
                <span>تحميل الإيصال</span>
              </a>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}