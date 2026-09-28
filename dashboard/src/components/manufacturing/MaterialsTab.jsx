import React, { useState } from 'react';
import { Edit3, Trash2, AlertTriangle, History, Scale, Search } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import {
  Modal, Field, SubmitRow, EmptyState, PrimaryButton, inputClass, money, qty, todayStr, errorMessage,
} from './shared';

const MOVEMENT_LABELS = { purchase: 'شراء', manufacturing: 'تصنيع', maintenance: 'صيانة فستان', adjustment: 'تسوية جرد' };

export default function MaterialsTab({ materials, meta, suppliers, reload }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState(null); // {} = new
  const [adjusting, setAdjusting] = useState(null);
  const [history, setHistory] = useState(null);

  const list = materials.filter((m) =>
    (!category || m.category === category) &&
    (!search.trim() || m.name.toLowerCase().includes(search.trim().toLowerCase()))
  );

  const handleDelete = async (m) => {
    if (!window.confirm(`حذف الخامة "${m.name}"؟`)) return;
    try {
      await apiClient.delete(`/materials/${m.id}`);
      toast.success('تم حذف الخامة');
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const lowCount = materials.filter((m) => m.is_low_stock).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-100 rounded-2xl p-3.5">
          <span className="text-[10px] font-extrabold text-slate-400 block">عدد الخامات</span>
          <span className="text-lg font-black text-slate-800">{materials.length}</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-3.5">
          <span className="text-[10px] font-extrabold text-slate-400 block">قيمة المخزن الحالية</span>
          <span className="text-lg font-black text-indigo-700">{money(meta.stock_value)}</span>
        </div>
        <div className={`border rounded-2xl p-3.5 col-span-2 sm:col-span-1 ${lowCount ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
          <span className="text-[10px] font-extrabold text-slate-400 block">خامات قاربت على النفاد</span>
          <span className={`text-lg font-black ${lowCount ? 'text-amber-700' : 'text-slate-800'}`}>{lowCount}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-2xl px-3">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحثي باسم الخامة..." className="w-full bg-transparent text-xs font-bold px-2 py-2.5 focus:outline-none" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-600" aria-label="تصفية حسب النوع">
          <option value="">كل الأنواع</option>
          {Object.entries(meta.categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <PrimaryButton onClick={() => setEditing({})}>خامة جديدة</PrimaryButton>
      </div>

      {list.length === 0 ? (
        <EmptyState>لا توجد خامات. أضيفي الخامات أولاً ثم سجلي فواتير الشراء لتدخل المخزن.</EmptyState>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-x-auto">
          <table className="w-full text-right text-xs min-w-[640px]">
            <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3">الخامة</th>
                <th className="p-3">النوع</th>
                <th className="p-3">الكمية المتاحة</th>
                <th className="p-3">متوسط التكلفة</th>
                <th className="p-3">القيمة</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="p-3">
                    <div className="font-black text-slate-800">{m.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold">
                      {[m.color, m.supplier?.name].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </td>
                  <td className="p-3 text-slate-600 font-bold">{meta.categories[m.category] || m.category}</td>
                  <td className="p-3">
                    <span className={`font-black ${m.is_low_stock ? 'text-amber-700' : 'text-slate-800'}`}>
                      {qty(m.quantity)} {m.unit_label}
                    </span>
                    {m.is_low_stock && (
                      <span className="mr-1.5 inline-flex items-center gap-0.5 text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                        <AlertTriangle size={9} /> قارب على النفاد
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600 font-bold">{money(m.avg_cost)}</td>
                  <td className="p-3 text-slate-800 font-black">{money(m.quantity * m.avg_cost)}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <IconBtn title="سجل الحركات" onClick={() => setHistory(m)}><History size={13} /></IconBtn>
                      <IconBtn title="جرد / تسوية الكمية" onClick={() => setAdjusting(m)}><Scale size={13} /></IconBtn>
                      <IconBtn title="تعديل" onClick={() => setEditing(m)}><Edit3 size={13} /></IconBtn>
                      <IconBtn title="حذف" danger onClick={() => handleDelete(m)}><Trash2 size={13} /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <MaterialForm material={editing} meta={meta} suppliers={suppliers} onClose={() => setEditing(null)} onSaved={reload} />}
      {adjusting && <AdjustForm material={adjusting} onClose={() => setAdjusting(null)} onSaved={reload} />}
      {history && <MovementsModal material={history} onClose={() => setHistory(null)} onChanged={reload} />}
    </div>
  );
}

export function IconBtn({ title, onClick, danger, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${danger ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
    >
      {children}
    </button>
  );
}

function MaterialForm({ material, meta, suppliers, onClose, onSaved }) {
  const isNew = !material.id;
  const [form, setForm] = useState({
    name: material.name || '',
    category: material.category || 'fabric',
    unit: material.unit || 'meter',
    color: material.color || '',
    min_quantity: material.min_quantity ?? '',
    supplier_id: material.supplier_id || '',
    notes: material.notes || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...form, supplier_id: form.supplier_id || null, min_quantity: form.min_quantity || 0 };
      if (isNew) await apiClient.post('/materials', payload);
      else await apiClient.put(`/materials/${material.id}`, payload);
      toast.success('تم حفظ الخامة');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={isNew ? 'إضافة خامة جديدة' : `تعديل ${material.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="اسم الخامة *"><input className={inputClass} required value={form.name} onChange={set('name')} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="النوع">
            <select className={inputClass} value={form.category} onChange={set('category')}>
              {Object.entries(meta.categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="وحدة القياس">
            <select className={inputClass} value={form.unit} onChange={set('unit')}>
              {Object.entries(meta.units).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="اللون"><input className={inputClass} value={form.color} onChange={set('color')} /></Field>
          <Field label="تنبيه عند وصول الكمية إلى">
            <input type="number" min="0" step="0.01" className={inputClass} value={form.min_quantity} onChange={set('min_quantity')} />
          </Field>
        </div>
        <Field label="المورد المعتاد">
          <select className={inputClass} value={form.supplier_id} onChange={set('supplier_id')}>
            <option value="">—</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="ملاحظات"><textarea className={`${inputClass} h-16`} value={form.notes} onChange={set('notes')} /></Field>
        {isNew && <p className="text-[10px] font-bold text-slate-400">الكمية تدخل المخزن من خلال تسجيل فاتورة شراء.</p>}
        <SubmitRow onCancel={onClose} isSubmitting={isSubmitting} />
      </form>
    </Modal>
  );
}

function AdjustForm({ material, onClose, onSaved }) {
  const [counted, setCounted] = useState(String(parseFloat(material.quantity)));
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post(`/materials/${material.id}/adjust`, { counted_quantity: counted, movement_date: date, notes: notes || null });
      toast.success('تم تحديث الكمية');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={`جرد: ${material.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs font-bold text-slate-500">الكمية في النظام: {qty(material.quantity)} {material.unit_label}</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="الكمية الفعلية بعد العد *">
            <input type="number" min="0" step="0.01" required className={inputClass} value={counted} onChange={(e) => setCounted(e.target.value)} />
          </Field>
          <Field label="تاريخ الجرد"><input type="date" required className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Field label="السبب (تالف، فاقد، خطأ تسجيل...)"><input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <SubmitRow onCancel={onClose} isSubmitting={isSubmitting} />
      </form>
    </Modal>
  );
}

function MovementsModal({ material, onClose, onChanged }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);

  const load = React.useCallback(() => {
    setError(false);
    apiClient.get('/materials/movements', { params: { material_id: material.id, per_page: 100 } })
      .then((res) => setRows(res.data || []))
      .catch(() => setError(true));
  }, [material.id]);

  React.useEffect(() => { load(); }, [load]);

  const undo = async (mv) => {
    if (!window.confirm('التراجع عن هذه الحركة وإرجاع الكمية للمخزن؟')) return;
    try {
      await apiClient.delete(`/materials/movements/${mv.id}`);
      toast.success('تم التراجع عن الحركة');
      load();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Modal title={`سجل حركات: ${material.name}`} onClose={onClose} wide>
      {error ? (
        <p className="text-xs text-rose-600 font-bold text-center py-4">تعذر تحميل السجل</p>
      ) : !rows ? (
        <p className="text-xs text-slate-400 font-bold text-center py-4">جاري التحميل...</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-slate-400 font-bold text-center py-4">لا توجد حركات بعد</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-xs">
          {rows.map((mv) => {
            const q = parseFloat(mv.quantity);
            return (
              <li key={mv.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black text-slate-700">
                    {MOVEMENT_LABELS[mv.type] || mv.type}
                    {mv.dress && <span className="text-slate-500 font-bold"> · فستان {mv.dress.code || mv.dress.name}</span>}
                    {mv.manufacturing_order && <span className="text-slate-500 font-bold"> · {mv.manufacturing_order.title}</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold truncate">
                    {formatDate(mv.movement_date)}{mv.user ? ` · ${mv.user.name}` : ''}{mv.notes ? ` · ${mv.notes}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`font-black ${q < 0 ? 'text-rose-600' : 'text-emerald-600'}`} dir="ltr">
                    {q > 0 ? '+' : ''}{qty(q)} {material.unit_label}
                  </span>
                  {mv.type !== 'purchase' && (
                    <button type="button" onClick={() => undo(mv)} className="text-[10px] font-bold text-slate-400 hover:text-rose-600 underline cursor-pointer">تراجع</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
