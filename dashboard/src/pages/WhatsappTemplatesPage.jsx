import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  MessageSquare, Eye, Edit3, X, Save, Copy,
  HelpCircle, CheckCircle, RefreshCw } from
'lucide-react';










export default function WhatsappTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [expandedCards, setExpandedCards] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/whatsapp-templates');
      setTemplates(res);
    } catch (e) {
      setErrorMessage(e.message || 'فشل تحميل قوالب الرسائل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleEditClick = (template) => {
    setEditingTemplate(template);
    setEditTitle(template.title);
    setEditBody(template.body);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingTemplate) return;

    try {
      setSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      await apiClient.put(`/whatsapp-templates/${editingTemplate.key}`, {
        title: editTitle,
        body: editBody
      });

      setSuccessMessage('تم حفظ التغييرات بنجاح!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (e) {
      setErrorMessage(e.message || 'فشل حفظ القالب');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (key) => {
    setExpandedCards((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(`{{${text}}}`);
    alert(`تم نسخ المتغير: {{${text}}}`);
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  const getPlaceholderLabel = (placeholder) => {
    const labels = {
      client_name: 'اسم العروس',
      visit_date: 'تاريخ الزيارة',
      visit_time: 'وقت الزيارة',
      trying_fee: 'رسوم التجربة',
      dress_line: 'تفاصيل الفستان',
      wedding_date: 'تاريخ الزفاف',
      pickup_date: 'تاريخ الاستلام',
      paid_amount: 'المبلغ المدفوع',
      total_amount: 'المبلغ الإجمالي',
      remaining: 'المتبقي'
    };
    return labels[placeholder] || placeholder;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 text-right pb-12" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 text-white">
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">قوالب الرسائل</h1>
            <p className="text-xs text-slate-400 font-bold mt-0.5">إدارة رسائل واتساب المرسلة للعرائس لتسهيل التواصل ومتابعة المواعيد.</p>
          </div>
        </div>
        <button
          onClick={fetchTemplates}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold">
          
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>تحديث</span>
        </button>
      </div>

      {successMessage &&
      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMessage}</span>
        </div>
      }

      {errorMessage &&
      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold">
          {errorMessage}
        </div>
      }

      {loading ?
      <div className="min-h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-indigo-650 font-black text-sm">جاري تحميل قوالب الرسائل...</div>
        </div> :

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
          const isExpanded = expandedCards[template.key];
          const displayBody = isExpanded ? template.body : template.body.slice(0, 120) + (template.body.length > 120 ? '...' : '');

          return (
            <div
              key={template.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-[0_12px_45px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between overflow-hidden">
              
                <div className="p-6 space-y-4">
                  {/* Top Bar of Card */}
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                      <Eye size={14} />
                    </span>
                    <span className="text-[10px] font-black text-slate-450 uppercase bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                      {template.key.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">{template.title}</h3>

                  {/* Placeholders badging */}
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {template.placeholders?.map((p) =>
                  <span
                    key={p}
                    className="text-[9px] font-extrabold text-indigo-650 bg-indigo-50/70 px-2 py-0.5 rounded-full border border-indigo-100/50">
                    
                        {`{{${getPlaceholderLabel(p)}}}`}
                      </span>
                  )}
                  </div>

                  {/* Body Preview Box */}
                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 text-xs text-slate-600 font-semibold whitespace-pre-line leading-relaxed min-h-[120px] max-h-[220px] overflow-y-auto">
                    {displayBody}
                  </div>
                </div>

                {/* Bottom section of Card */}
                <div className="px-6 py-4 bg-slate-50/40 border-t border-slate-50 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <button
                    onClick={() => toggleExpand(template.key)}
                    className="text-[10px] font-extrabold text-slate-450 hover:text-slate-650 transition-colors cursor-pointer">
                    
                      {isExpanded ? 'عرض أقل ▴' : 'عرض كامل ▾'}
                    </button>
                    <span className="text-[9px] text-slate-450 font-bold">آخر تحديث: {formatDate(template.updated_at)}</span>
                  </div>

                  <button
                  onClick={() => handleEditClick(template)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-sm border border-slate-200/50 hover:border-indigo-600">
                  
                    <Edit3 size={13} />
                    <span>تعديل القالب</span>
                  </button>
                </div>
              </div>);

        })}
        </div>
      }

      {/* Edit Modal */}
      {editingTemplate &&
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-150 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Edit3 size={15} className="text-indigo-650 animate-pulse" />
                <span>تعديل قالب الرسالة</span>
              </h3>
              <button
              onClick={() => setEditingTemplate(null)}
              className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-grow text-right">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600">عنوان القالب</label>
                <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-705 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
              
              </div>

              {/* Placeholders Guidance Panel */}
              <div className="bg-indigo-50/40 border border-indigo-100/30 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-black text-indigo-650 flex items-center gap-1">
                  <HelpCircle size={12} />
                  <span>المتغيرات الديناميكية المتوفرة لهذا القالب (اضغط لنسخ الكود):</span>
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {editingTemplate.placeholders?.map((p) =>
                <button
                  key={p}
                  type="button"
                  onClick={() => copyToClipboard(p)}
                  className="text-[9.5px] font-extrabold text-indigo-700 bg-white border border-indigo-150 px-3 py-1.5 rounded-xl hover:bg-indigo-550 hover:text-white transition-all cursor-pointer flex items-center gap-1 active:scale-95">
                  
                      <Copy size={10} />
                      <span>{getPlaceholderLabel(p)}</span>
                      <span className="font-mono opacity-80">{`{{${p}}}`}</span>
                    </button>
                )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-600">نص الرسالة</label>
                <textarea
                required
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-707 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all h-60 font-sans leading-relaxed"
                placeholder="اكتب رسالة الواتساب هنا..." />
              
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 active:scale-95">
                
                  <Save size={14} />
                  <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                </button>
                <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center active:scale-95">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

}