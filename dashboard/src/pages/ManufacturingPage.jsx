import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Factory, RefreshCw, ListOrdered, LayoutList } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import OrdersTab from '@/components/manufacturing/OrdersTab';
import MaterialsTab from '@/components/manufacturing/MaterialsTab';
import PurchasesTab from '@/components/manufacturing/PurchasesTab';
import SuppliersTab from '@/components/manufacturing/SuppliersTab';
import WorkersTab from '@/components/manufacturing/WorkersTab';
import MaintenanceTab from '@/components/manufacturing/MaintenanceTab';
import { LoadError } from '@/components/manufacturing/shared';

const TABS = [
  { id: 'orders', label: 'أوامر التصنيع' },
  { id: 'materials', label: 'الخامات والمخزن' },
  { id: 'purchases', label: 'فواتير الشراء' },
  { id: 'suppliers', label: 'الموردين' },
  { id: 'workers', label: 'العمال والرواتب' },
  { id: 'maintenance', label: 'خامات الصيانة' },
];

const isAdminUser = () => {
  try {
    const u = JSON.parse(localStorage.getItem('atelier_current_employee') || 'null');
    return u?.role === 'admin' || u?.role === 'owner';
  } catch {
    return false;
  }
};

const ENTRY_MODE_KEY = 'manufacturing_entry_mode';
const readEntryMode = () => {
  try {
    return localStorage.getItem(ENTRY_MODE_KEY) === 'form' ? 'form' : 'steps';
  } catch {
    return 'steps';
  }
};

export default function ManufacturingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'orders';

  // Lists shared by several tabs (pickers + stock levels)
  const [materials, setMaterials] = useState([]);
  const [materialsMeta, setMaterialsMeta] = useState({ categories: {}, units: {}, stock_value: 0 });
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersTotal, setSuppliersTotal] = useState(0);
  const [workers, setWorkers] = useState([]);
  const [dresses, setDresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // New purchases and orders: guided steps or the classic single form (per-user preference)
  const [entryMode, setEntryMode] = useState(readEntryMode);
  const changeEntryMode = (mode) => {
    setEntryMode(mode);
    try { localStorage.setItem(ENTRY_MODE_KEY, mode); } catch { /* preference only */ }
  };

  const loadShared = useCallback(async () => {
    setError(false);
    try {
      const [mat, sup, wrk] = await Promise.all([
        apiClient.get('/materials'),
        apiClient.get('/suppliers'),
        apiClient.get('/workers'),
      ]);
      setMaterials((mat.data || []).map((m) => ({ ...m, unit_label: mat.units?.[m.unit] || m.unit })));
      setMaterialsMeta({ categories: mat.categories || {}, units: mat.units || {}, stock_value: mat.stock_value || 0 });
      setSuppliers(sup.data || []);
      setSuppliersTotal(sup.total_balance || 0);
      setWorkers(wrk.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadShared(); }, [loadShared]);

  // Dresses are only needed for maintenance and linking finished pieces
  useEffect(() => {
    if (!['maintenance', 'orders'].includes(activeTab) || dresses.length) return;
    apiClient.get('/dresses?per_page=all')
      .then((res) => setDresses(Array.isArray(res) ? res : res.data?.data || res.data || []))
      .catch(() => {});
  }, [activeTab, dresses.length]);

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    next.delete('supplier');
    setSearchParams(next);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 pb-12 min-w-0" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Factory size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">التصنيع</h1>
          </div>
          <p className="text-xs text-slate-400 font-bold mt-1">
            الخامات والمخزن، الموردين ومديونياتهم، العمال ورواتبهم، وأوامر تصنيع الفساتين — وكل المدفوعات تظهر في المالية
          </p>
        </div>
        <button
          type="button"
          onClick={loadShared}
          className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 cursor-pointer"
          title="تحديث البيانات"
          aria-label="تحديث البيانات"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-600' : ''} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-black text-slate-500">طريقة الإدخال:</span>
        <div className="inline-flex bg-white border border-slate-200 rounded-2xl p-0.5" role="radiogroup" aria-label="طريقة الإدخال">
          {[['steps', 'خطوات منظمة', ListOrdered], ['form', 'نموذج عادي', LayoutList]].map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={entryMode === id}
              onClick={() => changeEntryMode(id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer ${entryMode === id ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap cursor-pointer transition-all ${
              activeTab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <LoadError onRetry={loadShared} />
      ) : loading ? (
        <p className="text-xs text-slate-400 font-bold text-center py-10">جاري التحميل...</p>
      ) : (
        <>
          {activeTab === 'orders' && (
            <OrdersTab
              materials={materials}
              meta={materialsMeta}
              suppliers={suppliers}
              workers={workers}
              dresses={dresses}
              isAdmin={isAdminUser()}
              stepMode={entryMode === 'steps'}
              reloadShared={loadShared}
            />
          )}
          {activeTab === 'materials' && <MaterialsTab materials={materials} meta={materialsMeta} suppliers={suppliers} reload={loadShared} />}
          {activeTab === 'purchases' && (
            <PurchasesTab materials={materials} meta={materialsMeta} suppliers={suppliers} stepMode={entryMode === 'steps'} reloadShared={loadShared} />
          )}
          {activeTab === 'suppliers' && (
            <SuppliersTab suppliers={suppliers} totalBalance={suppliersTotal} reload={loadShared} initialSupplierId={searchParams.get('supplier')} />
          )}
          {activeTab === 'workers' && <WorkersTab reloadShared={loadShared} />}
          {activeTab === 'maintenance' && <MaintenanceTab materials={materials} dresses={dresses} reloadShared={loadShared} />}
        </>
      )}
    </div>
  );
}
