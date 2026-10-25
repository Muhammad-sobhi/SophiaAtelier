import React, { useCallback, useEffect, useState } from 'react';
import { ShoppingBag, ChevronDown, ChevronUp, Plus, Pencil, Trash2, AlertTriangle, Search } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal, Field, SubmitRow, inputClass, errorMessage, todayStr, LoadError } from '@/components/manufacturing/shared';
import DressPurchaseForm, { formatMoney, ReceiptInput, PAYMENT_METHODS } from './DressPurchaseForm';

const STATUS_LABELS = {
  paid: ['مدفوع بالكامل', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
  partial: ['مدفوع جزئياً', 'bg-amber-50 text-amber-700 border-amber-200'],
  unpaid: ['غير مدفوع', 'bg-rose-50 text-rose-700 border-rose-200'],
};

const dressLabel = (d) => (d ? `${d.code ? `${d.code} — ` : ''}${d.name}` : '—');

/** Records one scheduled installment as paid (the backend writes its expense) */
function PayModal({ payment, onClose, onPaid }) {
  const [paidDate, setPaidDate] = useState(todayStr());
  const [method, setMethod] = useState('cash');
  const [receipt, setReceipt] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      await apiClient.post(`/dress-purchase-payments/${payment.id}/pay`, { paid_date: paidDate, payment_method: method, receipt });
      toast.success('تم تسجيل الدفعة');
      onPaid();
    } catch (err) {
      toast.error(errorMessage(err, 'تعذر تسجيل الدفعة'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title={`تسجيل دفع ${formatMoney(payment.amount)}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs font-bold text-slate-500">{dressLabel(payment.purchase?.dress)} — مستحقة {payment.due_date}</p>
        <Field label="تاريخ الدفع">
          <input required type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="طريقة الدفع">
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
            {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
        <ReceiptInput id="pay-installment-receipt" value={receipt} onPick={setReceipt} onRemove={() => setReceipt(null)} />
        <SubmitRow onCancel={onClose} isSubmitting={isSaving} label="تسجيل الدفع" />
      </form>
    </Modal>
  );
}

/**
 * Finance page: dress purchases (bought, or our share of a dress shared with a bride), installments due soon,
 * and old dresses whose purchase was never recorded. Every amount shown comes from the backend.
 */
export default function DressPurchasesSection({ onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState('due'); // due | purchases | pending
  const [due, setDue] = useState(null);
  const [pendingSummary, setPendingSummary] = useState(null);
  const [list, setList] = useState(null);
  const [listError, setListError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // { purchase } | { legacyDress } | {}
  const [paying, setPaying] = useState(null);

  const loadHeader = useCallback(() => {
    apiClient.get('/dress-purchases/due-payments?days=30').then(setDue).catch(() => setDue({ data: [], total: 0, overdue_total: 0, error: true }));
    apiClient.get('/dress-purchases/pending-dresses?per_page=1').then(setPendingSummary).catch(() => setPendingSummary(null));
  }, []);

  useEffect(() => { loadHeader(); }, [loadHeader]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadList = useCallback(() => {
    if (!expanded || view === 'due') return;
    const p = new URLSearchParams({ page: String(page), per_page: '10' });
    if (debouncedSearch) p.set('search', debouncedSearch);
    const url = view === 'purchases'
      ? (p.set('status', statusFilter), `/dress-purchases?${p}`)
      : `/dress-purchases/pending-dresses?${p}`;
    setList(null);
    setListError(false);
    apiClient.get(url).then(setList).catch(() => setListError(true));
  }, [expanded, view, page, debouncedSearch, statusFilter]);

  useEffect(() => { loadList(); }, [loadList]);

  const refresh = () => { loadHeader(); loadList(); onChanged?.(); };

  const openEdit = async (id) => {
    try {
      setForm({ purchase: await apiClient.get(`/dress-purchases/${id}`) });
    } catch (err) {
      toast.error(errorMessage(err, 'تعذر تحميل بيانات الشراء'));
    }
  };

  const remove = async (purchase) => {
    if (!await confirmDialog(`حذف بيانات شراء "${purchase.dress?.name}"؟ هتتشال كل دفعاتها من المصروفات، وتكلفة الفستان هتفضل زي ما هي.`)) return;
    try {
      await apiClient.delete(`/dress-purchases/${purchase.id}`);
      toast.success('تم الحذف');
      refresh();
    } catch (err) {
      toast.error(errorMessage(err, 'تعذر الحذف'));
    }
  };

  const overdueCount = (due?.data || []).filter((p) => p.is_overdue).length;
  const pendingCount = pendingSummary?.pending_count || 0;

  const tabs = [
    { id: 'due', label: `دفعات مستحقة (${due?.data?.length || 0})` },
    { id: 'purchases', label: 'فواتير شراء الفساتين' },
    { id: 'pending', label: `فساتين بدون بيانات شراء (${pendingCount})` },
  ];

  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="flex items-center gap-2.5 cursor-pointer text-right min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={17} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              مشتريات الفساتين والدفعات
              {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
            </div>
            <div className="text-[10px] font-bold text-slate-400 truncate">
              {due ? `مستحق خلال 30 يوم: ${formatMoney(due.total)}` : 'جاري التحميل...'}
              {overdueCount > 0 && <span className="text-rose-600"> · {overdueCount} دفعة متأخرة ({formatMoney(due.overdue_total)})</span>}
              {pendingCount > 0 && <span className="text-amber-600"> · {pendingCount} فستان محتاج بيانات شراء</span>}
            </div>
          </div>
        </button>
        <button type="button" onClick={() => setForm({})}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black cursor-pointer w-full sm:w-auto">
          <Plus size={14} /> شراء فستان / مشاركة
        </button>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
            {tabs.map((t) => (
              <button key={t.id} type="button" onClick={() => { setView(t.id); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer ${view === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {view === 'due' && (
            !due ? <p className="text-xs font-bold text-slate-400 py-4 text-center">جاري التحميل...</p>
              : due.error ? <LoadError onRetry={loadHeader} />
              : due.data.length === 0 ? <p className="text-xs font-bold text-slate-400 py-4 text-center">مفيش دفعات مستحقة خلال 30 يوم</p>
              : (
                <ul className="divide-y divide-slate-100">
                  {due.data.map((p) => (
                    <li key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-800 truncate">
                          {dressLabel(p.purchase?.dress)}
                          {p.purchase?.type === 'shared' && <span className="text-violet-600 font-bold"> · مشاركة مع {p.purchase.partner_name}</span>}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500">
                          {p.purchase?.supplier?.name ? `${p.purchase.supplier.name} · ` : ''}
                          مستحقة {p.due_date}
                          {p.is_overdue && <span className="inline-flex items-center gap-1 text-rose-600 mr-1.5"><AlertTriangle size={11} /> متأخرة</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-between sm:justify-end">
                        <span className="text-sm font-black text-slate-800">{formatMoney(p.amount)}</span>
                        <button type="button" onClick={() => setPaying(p)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black cursor-pointer">تسجيل الدفع</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
          )}

          {view !== 'due' && (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={view === 'purchases' ? 'بحث بالفستان أو المورد أو العروسة...' : 'بحث باسم أو كود الفستان...'} className={`${inputClass} pr-8`} aria-label="بحث" />
                  <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                {view === 'purchases' && (
                  <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={`${inputClass} sm:w-44`} aria-label="حالة الدفع">
                    <option value="open">عليها فلوس</option>
                    <option value="paid">مدفوعة بالكامل</option>
                    <option value="all">الكل</option>
                  </select>
                )}
              </div>

              {view === 'pending' && pendingCount > 0 && (
                <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  الفساتين دي ليها تكلفة ({formatMoney(pendingSummary.pending_cost)}) بس مالهاش بيانات شراء. حدد لكل فستان: مدفوع بالكامل قبل كده، ولا لسه عليه فلوس.
                </p>
              )}

              {listError ? <LoadError onRetry={loadList} />
                : !list ? <p className="text-xs font-bold text-slate-400 py-4 text-center">جاري التحميل...</p>
                : list.data.length === 0 ? <p className="text-xs font-bold text-slate-400 py-4 text-center">لا توجد نتائج</p>
                : view === 'purchases' ? (
                  <ul className="divide-y divide-slate-100">
                    {list.data.map((p) => {
                      const [statusLabel, statusClass] = STATUS_LABELS[p.payment_status] || STATUS_LABELS.unpaid;
                      return (
                        <li key={p.id} className="py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-800 truncate">
                              {dressLabel(p.dress)}
                              <span className={`mr-2 px-1.5 py-0.5 rounded-md border text-[10px] ${statusClass}`}>{statusLabel}</span>
                            </div>
                            <div className="text-[11px] font-bold text-slate-500">
                              {p.type === 'shared' ? `مشاركة مع ${p.partner_name} (سعر الفستان ${formatMoney(p.dress_total_price)})` : 'شراء'}
                              {p.supplier?.name ? ` · ${p.supplier.name}` : ''} · {p.purchase_date}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 justify-between lg:justify-end text-[11px] font-bold whitespace-nowrap flex-wrap">
                            <span className="text-slate-500">المطلوب <b className="text-slate-800">{formatMoney(p.amount)}</b></span>
                            <span className="text-slate-500">المدفوع <b className="text-emerald-700">{formatMoney(p.paid_total)}</b></span>
                            <span className="text-slate-500">الباقي <b className="text-rose-600">{formatMoney(p.remaining)}</b></span>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => openEdit(p.id)} aria-label="تعديل" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"><Pencil size={13} /></button>
                              <button type="button" onClick={() => remove(p)} aria-label="حذف" className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {list.data.map((d) => (
                      <li key={d.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-800 truncate">{dressLabel(d)}</div>
                          <div className="text-[11px] font-bold text-slate-500">التكلفة {formatMoney(d.purchase_price)} · {d.purchase_date ? String(d.purchase_date).slice(0, 10) : 'بدون تاريخ'}</div>
                        </div>
                        <button type="button" onClick={() => setForm({ legacyDress: d })} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-black cursor-pointer whitespace-nowrap">استكمال</button>
                      </li>
                    ))}
                  </ul>
                )}

              {list && list.last_page > 1 && (
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>صفحة {list.current_page} من {list.last_page}</span>
                  <div className="flex gap-1.5">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((x) => x - 1)} className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer">السابق</button>
                    <button type="button" disabled={page >= list.last_page} onClick={() => setPage((x) => x + 1)} className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer">التالي</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {form && (
        <DressPurchaseForm purchase={form.purchase} legacyDress={form.legacyDress} onClose={() => setForm(null)}
          onSaved={() => { setForm(null); refresh(); }} />
      )}
      {paying && <PayModal payment={paying} onClose={() => setPaying(null)} onPaid={() => { setPaying(null); refresh(); }} />}
    </div>
  );
}
