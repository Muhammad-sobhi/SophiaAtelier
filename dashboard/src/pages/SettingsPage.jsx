import React, { useEffect, useState } from 'react';
import { Settings, Save, MessageCircle, CalendarOff, Trash2, Plus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getPhoneWarning } from '@/lib/phone';
import { toast } from '@/components/ui/Toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';

export default function SettingsPage() {
  const [whatsapp, setWhatsapp] = useState('');
  const [savedWhatsapp, setSavedWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/settings').
    then((res) => {
      setWhatsapp(res.whatsapp_number || '');
      setSavedWhatsapp(res.whatsapp_number || '');
    }).
    catch((e) => toast.error(e.message || 'فشل تحميل الإعدادات'));
  }, []);

  const phoneWarning = getPhoneWarning(whatsapp);

  const save = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await apiClient.put('/settings', { whatsapp_number: whatsapp });
      setWhatsapp(res.whatsapp_number);
      setSavedWhatsapp(res.whatsapp_number);
      toast.success('تم حفظ رقم الواتساب');
    } catch (err) {
      toast.error(err.message || 'فشل حفظ الرقم');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 text-right pb-12 max-w-4xl" dir="rtl">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-white">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">إعدادات النظام</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">رقم الواتساب المستخدم على الموقع وأيام إغلاق الزيارات.</p>
        </div>
      </div>

      <section className="bg-white rounded-3xl border border-slate-100 p-5 md:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-white flex-shrink-0 bg-emerald-500">
            <MessageCircle size={18} />
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-800">رقم واتساب النظام</h2>
            <p className="text-xs text-slate-400 font-bold mt-0.5 leading-relaxed">
              الرقم الذي يظهر للعرائس على الموقع (زر الواتساب ورقم التواصل).
            </p>
          </div>
        </div>
        <form onSubmit={save} className="flex flex-col sm:flex-row gap-3 sm:items-start">
          <div className="flex-1">
            <input
              type="tel"
              dir="ltr"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="01012345678"
              aria-label="رقم الواتساب"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-left focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            {phoneWarning && <p className="text-[11px] font-bold text-amber-600 mt-1.5">{phoneWarning}</p>}
          </div>
          <button
            type="submit"
            disabled={saving || !whatsapp.trim() || whatsapp === savedWhatsapp}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer">
            <Save size={14} />
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </form>
      </section>

      <ClosedDaysSection />
    </div>);

}

/** Days the website does not accept visit requests (staff can still register a visit on them) */
function ClosedDaysSection() {
  const [days, setDays] = useState([]);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/closed-days').
    then((res) => setDays(Array.isArray(res) ? res : [])).
    catch((e) => toast.error(e.message || 'فشل تحميل أيام الإغلاق'));
  }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const day = await apiClient.post('/closed-days', { date, reason: reason.trim() || null });
      setDays((prev) => [...prev, day].sort((a, b) => a.date.localeCompare(b.date)));
      setDate('');
      setReason('');
      toast.success(`تم إغلاق يوم ${day.date} للزيارات من الموقع`);
      if (day.visits_count > 0) {
        toast.warning(`يوجد ${day.visits_count} زيارة محجوزة بالفعل يوم ${day.date}، يرجى التواصل مع العرائس`, 8000);
      }
    } catch (err) {
      toast.error(err.message || 'فشل إغلاق اليوم');
    } finally {
      setSaving(false);
    }
  };

  const reopen = async (day) => {
    if (!(await confirmDialog(`إعادة فتح يوم ${day.date} لحجز الزيارات من الموقع؟`, { confirmLabel: 'إعادة الفتح' }))) return;
    try {
      await apiClient.delete(`/closed-days/${day.id}`);
      setDays((prev) => prev.filter((d) => d.id !== day.id));
      toast.success(`تم فتح يوم ${day.date} للزيارات`);
    } catch (err) {
      toast.error(err.message || 'فشل فتح اليوم');
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-100 p-5 md:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-white flex-shrink-0 bg-rose-500">
          <CalendarOff size={18} />
        </span>
        <div>
          <h2 className="text-sm font-black text-slate-800">أيام إغلاق الزيارات</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5 leading-relaxed">
            لن تتمكن العرائس من حجز زيارة من الموقع في هذه الأيام. الموظفون ما زالوا يستطيعون تسجيل زيارة من الداشبورد.
          </p>
        </div>
      </div>

      <form onSubmit={add} className="flex flex-col sm:flex-row gap-3 sm:items-start">
        <input
          type="date"
          value={date}
          min={new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })}
          onChange={(e) => setDate(e.target.value)}
          aria-label="تاريخ الإغلاق"
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-200" />
        <input
          type="text"
          value={reason}
          maxLength={255}
          onChange={(e) => setReason(e.target.value)}
          placeholder="السبب (اختياري) مثال: إجازة"
          aria-label="سبب الإغلاق"
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-200" />
        <button
          type="submit"
          disabled={saving || !date}
          className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer">
          <Plus size={14} />
          {saving ? 'جاري الحفظ...' : 'إغلاق اليوم'}
        </button>
      </form>

      {days.length === 0 ?
      <p className="text-xs text-slate-400 font-bold">لا توجد أيام مغلقة قادمة.</p> :

      <ul className="divide-y divide-slate-100 border border-slate-100 rounded-2xl">
          {days.map((day) =>
        <li key={day.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800" dir="ltr">{day.date}</p>
                {day.reason && <p className="text-xs text-slate-500 font-bold truncate">{day.reason}</p>}
                {day.visits_count > 0 &&
            <p className="text-[11px] text-amber-600 font-bold">يوجد {day.visits_count} زيارة محجوزة في هذا اليوم</p>
            }
              </div>
              <button
            type="button"
            onClick={() => reopen(day)}
            aria-label={`إعادة فتح يوم ${day.date}`}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                <Trash2 size={16} />
              </button>
            </li>
        )}
        </ul>
      }
    </section>);

}
