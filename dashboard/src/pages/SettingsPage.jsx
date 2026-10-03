import React, { useEffect, useState } from 'react';
import { Settings, Save, MessageCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getPhoneWarning } from '@/lib/phone';
import { toast } from '@/components/ui/Toast';

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
          <p className="text-xs text-slate-400 font-bold mt-0.5">رقم الواتساب المستخدم على الموقع.</p>
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
    </div>);

}
