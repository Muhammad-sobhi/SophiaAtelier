import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { todayStr, formatDate } from '@/lib/utils';
import { offerLabel } from '@/lib/offers';
import {
  BadgePercent, Plus, Edit3, Trash2, Check, X, Search, CheckCircle, AlertCircle,
  RefreshCw, Eye, EyeOff, Percent, Gift, Banknote
} from 'lucide-react';
import { confirmDialog } from '@/components/ui/ConfirmDialog';

const TYPES = [
  { value: 'percentage', label: 'خصم بنسبة', icon: Percent },
  { value: 'perk', label: 'ميزة مجانية', icon: Gift },
  { value: 'fixed', label: 'خصم مبلغ ثابت', icon: Banknote },
];

const SCOPES = [
  { value: 'all', label: 'كل الفساتين' },
  { value: 'category', label: 'فئة' },
  { value: 'collection', label: 'تشكيلة' },
  { value: 'dresses', label: 'فساتين محددة' },
];

const STATUS = {
  running: { label: 'نشط الآن', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  scheduled: { label: 'مجدول', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  ended: { label: 'منتهي', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  disabled: { label: 'متوقف', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const inputClass = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all';

function addDays(date, days) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const emptyForm = () => ({
  name: '',
  name_ar: '',
  type: 'percentage',
  value: '',
  perk: '',
  perk_ar: '',
  scope: 'all',
  scope_id: '',
  dress_ids: [],
  banner_text: '',
  banner_text_ar: '',
  starts_at: todayStr(),
  ends_at: addDays(todayStr(), 7),
  is_active: true,
});

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [dresses, setDresses] = useState(null);
  const [loading, setLoading] = useState(true);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [dressSearch, setDressSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/offers');
      setOffers(res || []);
      setErrorMessage('');
    } catch (e) {
      setErrorMessage(e.message || 'فشل تحميل العروض من السيرفر');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    apiClient.get('/categories').then((res) => setCategories(Array.isArray(res) ? res : res.data || [])).catch(() => {});
    apiClient.get('/collections').then((res) => setCollections(Array.isArray(res) ? res : res.data || [])).catch(() => {});
  }, []);

  // The dress list is only needed when hand-picking dresses, so it loads on first use
  useEffect(() => {
    if (!isModalOpen || formData.scope !== 'dresses' || dresses !== null) return;
    apiClient.get('/dresses?per_page=all').then((res) => {
      setDresses(Array.isArray(res) ? res : res.data?.data || res.data || []);
    }).catch(() => {
      setDresses([]);
      setFormError('فشل تحميل قائمة الفساتين');
    });
  }, [isModalOpen, formData.scope, dresses]);

  const setField = (field, value) => {
    setFormError('');
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const openAddModal = () => {
    setEditingOffer(null);
    setFormData(emptyForm());
    setFormError('');
    setDressSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (offer) => {
    setEditingOffer(offer);
    setFormData({
      name: offer.name || '',
      name_ar: offer.name_ar || '',
      type: offer.type,
      value: offer.value != null ? String(Number(offer.value)) : '',
      perk: offer.perk || '',
      perk_ar: offer.perk_ar || '',
      scope: offer.scope,
      scope_id: offer.scope_id ? String(offer.scope_id) : '',
      dress_ids: offer.dress_ids || [],
      banner_text: offer.banner_text || '',
      banner_text_ar: offer.banner_text_ar || '',
      starts_at: offer.starts_at,
      ends_at: offer.ends_at,
      is_active: offer.is_active,
    });
    setFormError('');
    setDressSearch('');
    setIsModalOpen(true);
  };

  const validate = () => {
    if (!formData.name.trim()) return 'اكتبي اسم العرض بالإنجليزي';
    if (formData.type === 'perk' && !formData.perk_ar.trim()) return 'اكتبي الميزة المجانية بالعربي';
    if (formData.type !== 'perk') {
      const value = Number(formData.value);
      if (!formData.value || !(value > 0)) return 'اكتبي قيمة الخصم';
      if (formData.type === 'percentage' && value > 100) return 'النسبة لا تزيد عن 100%';
    }
    if ((formData.scope === 'category' || formData.scope === 'collection') && !formData.scope_id) return 'اختاري الفئة أو التشكيلة';
    if (formData.scope === 'dresses' && formData.dress_ids.length === 0) return 'اختاري فستانًا واحدًا على الأقل';
    if (!formData.starts_at || !formData.ends_at) return 'حددي تاريخ البداية والنهاية';
    if (formData.ends_at < formData.starts_at) return 'تاريخ النهاية لازم يكون بعد البداية';
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }

    const payload = {
      ...formData,
      value: formData.type === 'perk' ? null : Number(formData.value),
      scope_id: formData.scope_id ? Number(formData.scope_id) : null,
    };

    try {
      setSaving(true);
      if (editingOffer) {
        const updated = await apiClient.put(`/offers/${editingOffer.id}`, payload);
        setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        setSuccessMessage('تم تحديث العرض');
      } else {
        const created = await apiClient.post('/offers', payload);
        setOffers((prev) => [created, ...prev]);
        setSuccessMessage('تم إضافة العرض');
      }
      setErrorMessage('');
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'حدث خطأ أثناء حفظ العرض');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (offer) => {
    try {
      const updated = await apiClient.put(`/offers/${offer.id}`, { is_active: !offer.is_active });
      setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setSuccessMessage(updated.is_active ? 'تم تشغيل العرض' : 'تم إيقاف العرض');
    } catch (err) {
      setErrorMessage(err.message || 'فشل تغيير حالة العرض');
    }
  };

  const handleDelete = async (offer) => {
    if (!await confirmDialog(`حذف عرض "${offer.name_ar || offer.name}"؟`)) return;
    try {
      setDeletingId(offer.id);
      await apiClient.delete(`/offers/${offer.id}`);
      setOffers((prev) => prev.filter((o) => o.id !== offer.id));
      setSuccessMessage('تم حذف العرض');
    } catch (err) {
      setErrorMessage(err.message || 'فشل حذف العرض');
    } finally {
      setDeletingId(null);
    }
  };

  const scopeSummary = (offer) => {
    if (offer.scope === 'category') {
      const c = categories.find((x) => x.id === offer.scope_id);
      return `فئة: ${c ? c.name_ar || c.name : '—'}`;
    }
    if (offer.scope === 'collection') {
      const c = collections.find((x) => x.id === offer.scope_id);
      return `تشكيلة: ${c ? c.name_ar || c.name : '—'}`;
    }
    if (offer.scope === 'dresses') return `${(offer.dress_ids || []).length} فستان`;
    return 'كل الفساتين';
  };

  const filteredDresses = useMemo(() => {
    const q = dressSearch.trim().toLowerCase();
    if (!dresses) return [];
    if (!q) return dresses;
    return dresses.filter((d) => [d.code, d.name, d.name_ar].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [dresses, dressSearch]);

  const toggleDress = (id) => {
    setField('dress_ids', formData.dress_ids.includes(id)
      ? formData.dress_ids.filter((x) => x !== id)
      : [...formData.dress_ids, id]);
  };

  const running = offers.filter((o) => o.status === 'running');
  const totalBookings = offers.reduce((sum, o) => sum + (o.bookings_count || 0), 0);
  const totalDiscounts = offers.reduce((sum, o) => sum + (Number(o.discount_total) || 0), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-sans text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <BadgePercent size={24} />
            </div>
            <span>العروض</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
            عروض مؤقتة (Black Friday وغيرها) تظهر على الموقع كشريط وعلامة على الفساتين، من غير ما تظهر الأسعار
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
        >
          <Plus size={18} />
          <span>عرض جديد</span>
        </button>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700" aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-700" aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">العرض الظاهر على الموقع</span>
          <span className="text-lg font-extrabold text-emerald-600 mt-3 truncate">
            {running.length > 0 ? running[0].name_ar || running[0].name : 'لا يوجد'}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">حجوزات من العروض</span>
          <span className="text-2xl font-extrabold text-indigo-600 mt-3">{totalBookings}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">إجمالي الخصومات</span>
          <span className="text-2xl font-extrabold text-emerald-600 mt-3">{totalDiscounts.toLocaleString()} ج.م</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 font-bold text-xs">
          <RefreshCw className="animate-spin mx-auto mb-2 text-indigo-600" size={24} />
          جاري تحميل العروض...
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500 text-xs">
          <BadgePercent className="mx-auto mb-2 text-slate-300" size={32} />
          <p className="font-bold">ابدئي أول عرض</p>
          <p className="mt-1 text-slate-400">حددي النسبة أو الميزة والمدة، والعرض يظهر على الموقع ويختفي لوحده في ميعاده.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm divide-y divide-slate-100">
          {offers.map((offer) => {
            const status = STATUS[offer.status] || STATUS.disabled;
            return (
              <div key={offer.id} className={`p-5 flex flex-col md:flex-row md:items-center gap-4 ${offer.status === 'ended' || offer.status === 'disabled' ? 'opacity-70' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-slate-800 text-sm">{offer.name_ar || offer.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="font-bold text-indigo-700">{offerLabel(offer)}</span>
                    <span>{scopeSummary(offer)}</span>
                    <span>{formatDate(offer.starts_at)} ← {formatDate(offer.ends_at)}</span>
                  </p>
                </div>

                {/* Results: bookings made with the offer (cancelled ones excluded) and what it gave away */}
                <dl className="flex items-center gap-5 text-right flex-shrink-0">
                  <div>
                    <dt className="text-[10px] font-bold text-slate-400">الحجوزات</dt>
                    <dd className="text-sm font-extrabold text-slate-800">{offer.bookings_count || 0}</dd>
                  </div>
                  {offer.type !== 'perk' && (
                    <div>
                      <dt className="text-[10px] font-bold text-slate-400">الخصومات</dt>
                      <dd className="text-sm font-extrabold text-emerald-600">{Number(offer.discount_total || 0).toLocaleString()} ج.م</dd>
                    </div>
                  )}
                </dl>

                <div className="flex items-center gap-2 justify-end flex-shrink-0">
                  <button
                    onClick={() => handleToggleStatus(offer)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      offer.is_active
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200'
                    }`}
                    title={offer.is_active ? 'إيقاف العرض' : 'تشغيل العرض'}
                  >
                    {offer.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span>{offer.is_active ? 'مفعّل' : 'متوقف'}</span>
                  </button>
                  <button onClick={() => openEditModal(offer)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer" aria-label="تعديل العرض">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(offer)} disabled={deletingId === offer.id} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50" aria-label="حذف العرض">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 relative text-right max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute left-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors" aria-label="إغلاق">
              <X size={18} />
            </button>

            <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <BadgePercent className="text-indigo-600" size={22} />
              <span>{editingOffer ? 'تعديل العرض' : 'عرض جديد'}</span>
            </h2>

            <form onSubmit={handleSave} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 block">
                  <span className="text-xs font-extrabold text-slate-700">الاسم بالعربي</span>
                  <input type="text" placeholder="الجمعة البيضاء" value={formData.name_ar} onChange={(e) => setField('name_ar', e.target.value)} className={inputClass} />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-xs font-extrabold text-slate-700">الاسم بالإنجليزي *</span>
                  <input type="text" dir="ltr" placeholder="White Friday" value={formData.name} onChange={(e) => setField('name', e.target.value)} className={inputClass} />
                </label>
              </div>

              <fieldset className="space-y-1.5">
                <legend className="text-xs font-extrabold text-slate-700 mb-1.5">نوع العرض</legend>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setField('type', value)}
                      aria-pressed={formData.type === value}
                      className={`py-2.5 px-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        formData.type === value ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon size={15} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {formData.type === 'perk' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1.5 block">
                    <span className="text-xs font-extrabold text-slate-700">الميزة بالعربي *</span>
                    <input type="text" placeholder="تجربة مجانية" value={formData.perk_ar} onChange={(e) => setField('perk_ar', e.target.value)} className={inputClass} />
                  </label>
                  <label className="space-y-1.5 block">
                    <span className="text-xs font-extrabold text-slate-700">الميزة بالإنجليزي</span>
                    <input type="text" dir="ltr" placeholder="Free try-on" value={formData.perk} onChange={(e) => setField('perk', e.target.value)} className={inputClass} />
                  </label>
                </div>
              ) : (
                <label className="space-y-1.5 block sm:w-1/2">
                  <span className="text-xs font-extrabold text-slate-700">{formData.type === 'percentage' ? 'النسبة % *' : 'قيمة الخصم (ج) *'}</span>
                  <input type="number" min="1" max={formData.type === 'percentage' ? 100 : undefined} value={formData.value} onChange={(e) => setField('value', e.target.value)} className={inputClass} />
                </label>
              )}

              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1.5 block">
                  <span className="text-xs font-extrabold text-slate-700">من *</span>
                  <input type="date" value={formData.starts_at} onChange={(e) => setField('starts_at', e.target.value)} className={inputClass} />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-xs font-extrabold text-slate-700">إلى *</span>
                  <input type="date" min={formData.starts_at} value={formData.ends_at} onChange={(e) => setField('ends_at', e.target.value)} className={inputClass} />
                </label>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-xs font-extrabold text-slate-700 mb-1.5">الفساتين المشمولة</legend>
                <div className="flex flex-wrap gap-2">
                  {SCOPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, scope: value, scope_id: '' }))}
                      aria-pressed={formData.scope === value}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formData.scope === value ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {(formData.scope === 'category' || formData.scope === 'collection') && (
                  <select value={formData.scope_id} onChange={(e) => setField('scope_id', e.target.value)} className={inputClass} aria-label={formData.scope === 'category' ? 'الفئة' : 'التشكيلة'}>
                    <option value="">{formData.scope === 'category' ? 'اختاري الفئة' : 'اختاري التشكيلة'}</option>
                    {(formData.scope === 'category' ? categories : collections).map((c) => (
                      <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>
                    ))}
                  </select>
                )}

                {formData.scope === 'dresses' && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="relative border-b border-slate-200">
                      <input type="text" placeholder="بحث بالكود أو الاسم" value={dressSearch} onChange={(e) => setDressSearch(e.target.value)} className="w-full pr-10 pl-4 py-2.5 bg-white text-xs font-medium focus:outline-none text-slate-700" aria-label="بحث في الفساتين" />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {dresses === null ? (
                        <p className="p-4 text-center text-xs text-slate-400">جاري تحميل الفساتين...</p>
                      ) : filteredDresses.length === 0 ? (
                        <p className="p-4 text-center text-xs text-slate-400">لا توجد فساتين مطابقة</p>
                      ) : filteredDresses.map((d) => (
                        <label key={d.id} className="flex items-center gap-3 px-4 py-2 text-xs cursor-pointer hover:bg-slate-50">
                          <input type="checkbox" checked={formData.dress_ids.includes(d.id)} onChange={() => toggleDress(d.id)} className="accent-indigo-600" />
                          <span className="font-mono text-slate-400" dir="ltr">{d.code}</span>
                          <span className="font-semibold text-slate-700 truncate">{d.name_ar || d.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 border-t border-slate-200">تم اختيار {formData.dress_ids.length} فستان</p>
                  </div>
                )}
              </fieldset>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 block">
                  <span className="text-xs font-extrabold text-slate-700">نص الشريط بالعربي</span>
                  <input type="text" placeholder="الجمعة البيضاء: خصم 20% على فساتين الزفاف" value={formData.banner_text_ar} onChange={(e) => setField('banner_text_ar', e.target.value)} className={inputClass} />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-xs font-extrabold text-slate-700">نص الشريط بالإنجليزي</span>
                  <input type="text" dir="ltr" placeholder="White Friday: 20% off bridal dresses" value={formData.banner_text} onChange={(e) => setField('banner_text', e.target.value)} className={inputClass} />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 -mt-3">لو سبتي نص الشريط فاضي، الموقع هيعرض اسم العرض.</p>

              <button
                type="button"
                onClick={() => setField('is_active', !formData.is_active)}
                aria-pressed={formData.is_active}
                className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  formData.is_active ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-100 border-slate-300 text-slate-500'
                }`}
              >
                {formData.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                <span>{formData.is_active ? 'مفعّل: يظهر على الموقع في الموعد ويختفي بعده' : 'متوقف: مش هيظهر على الموقع'}</span>
              </button>

              {formError && (
                <p role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </p>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                  <span>{editingOffer ? 'حفظ التعديلات' : 'حفظ العرض'}</span>
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all text-xs font-bold cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
