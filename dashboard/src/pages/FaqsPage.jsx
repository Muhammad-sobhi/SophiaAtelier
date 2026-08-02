import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  HelpCircle, Plus, Edit3, Trash2, Check, X, Search,
  CheckCircle, AlertCircle, RefreshCw, Eye, EyeOff, MessageSquareText, MoveUp, MoveDown
} from 'lucide-react';

export default function FaqsPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    question: '',
    question_ar: '',
    answer: '',
    answer_ar: '',
    sort_order: 1,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/faqs');
      setFaqs(res || []);
      setErrorMessage('');
    } catch (e) {
      setErrorMessage(e.message || 'فشل تحميل الأسئلة الشائعة من السيرفر');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const openAddModal = () => {
    setEditingFaq(null);
    setFormData({
      question: '',
      question_ar: '',
      answer: '',
      answer_ar: '',
      sort_order: faqs.length > 0 ? Math.max(...faqs.map((f) => f.sort_order || 0)) + 1 : 1,
      is_active: true,
    });
    setSuccessMessage('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (faq) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question || '',
      question_ar: faq.question_ar || '',
      answer: faq.answer || '',
      answer_ar: faq.answer_ar || '',
      sort_order: faq.sort_order || 1,
      is_active: faq.is_active ?? true,
    });
    setSuccessMessage('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.question.trim()) {
      setErrorMessage('يرجى كتابة السؤال باللغة الإنجليزية');
      return;
    }
    if (!formData.answer.trim()) {
      setErrorMessage('يرجى كتابة الإجابة باللغة الإنجليزية');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');

      if (editingFaq) {
        // Update
        const updated = await apiClient.put(`/faqs/${editingFaq.id}`, formData);
        setFaqs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        setSuccessMessage('تم تحديث السؤال بنجاح');
      } else {
        // Create
        const created = await apiClient.post('/faqs', formData);
        setFaqs((prev) => [...prev, created]);
        setSuccessMessage('تم إضافة السؤال بنجاح');
      }

      setIsModalOpen(false);
    } catch (err) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ السؤال');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (faq) => {
    const newActiveState = !faq.is_active;
    // Optimistic UI update
    setFaqs((prev) =>
      prev.map((f) => (f.id === faq.id ? { ...f, is_active: newActiveState } : f))
    );

    try {
      await apiClient.put(`/faqs/${faq.id}`, { is_active: newActiveState });
      setSuccessMessage(
        `تم تغيير حالة السؤال إلى (${newActiveState ? 'مفعل في الموقع' : 'معطل ومخفي'})`
      );
    } catch (err) {
      // Rollback
      setFaqs((prev) =>
        prev.map((f) => (f.id === faq.id ? { ...f, is_active: faq.is_active } : f))
      );
      setErrorMessage(err.message || 'فشل تحديث حالة السؤال');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت تأكد من رغبتك في حذف هذا السؤال؟')) return;

    const previousFaqs = [...faqs];
    setFaqs((prev) => prev.filter((f) => f.id !== id));

    try {
      setDeletingId(id);
      await apiClient.delete(`/faqs/${id}`);
      setSuccessMessage('تم حذف السؤال بنجاح');
    } catch (err) {
      setFaqs(previousFaqs);
      setErrorMessage(err.message || 'فشل حذف السؤال');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered FAQs
  const filteredFaqs = faqs.filter((f) => {
    const qEn = f.question || '';
    const qAr = f.question_ar || '';
    const aEn = f.answer || '';
    const aAr = f.answer_ar || '';
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      qEn.toLowerCase().includes(query) ||
      qAr.toLowerCase().includes(query) ||
      aEn.toLowerCase().includes(query) ||
      aAr.toLowerCase().includes(query);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && f.is_active) ||
      (filterStatus === 'inactive' && !f.is_active);

    return matchesSearch && matchesStatus;
  });

  // Sort by sort_order
  const sortedFaqs = [...filteredFaqs].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Statistics
  const totalCount = faqs.length;
  const activeCount = faqs.filter((f) => f.is_active).length;
  const inactiveCount = faqs.filter((f) => !f.is_active).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-sans text-right" dir="rtl">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <HelpCircle size={24} />
            </div>
            <span>الأسئلة الشائعة (FAQ)</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
            التحكم في الأسئلة الشائعة والإجابات المعروضة أسفل قسم التقييمات بالموقع (إضافة، تعديل، وترتيب)
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
        >
          <Plus size={18} />
          <span>إضافة سؤال جديد</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700">
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
          <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">إجمالي الأسئلة</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-extrabold text-slate-800">{totalCount}</span>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">سؤال</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">الأسئلة المعروضة</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-extrabold text-emerald-600">{activeCount}</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">نشط في الموقع</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">الأسئلة المخفية</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-extrabold text-slate-400">{inactiveCount}</span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">مخفي</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            الكل ({totalCount})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'active' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            النشطة ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'inactive' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            المخفية ({inactiveCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="بحث في السؤال أو الإجابة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 transition-all"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        </div>
      </div>

      {/* FAQs List Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 font-bold text-xs">
          <RefreshCw className="animate-spin mx-auto mb-2 text-indigo-600" size={24} />
          جاري تحميل الأسئلة الشائعة...
        </div>
      ) : sortedFaqs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 font-bold text-xs">
          <HelpCircle className="mx-auto mb-2 text-slate-300" size={32} />
          لا توجد أسئلة شائعة مطابقة للبحث أو الفلتر المحدد
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {sortedFaqs.map((faq, idx) => (
              <div
                key={faq.id}
                className={`p-5 md:p-6 transition-all hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !faq.is_active ? 'opacity-65 bg-slate-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 font-extrabold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-200">
                    {String(faq.sort_order || idx + 1).padStart(2, '0')}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Question EN & AR */}
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm leading-snug dir-ltr text-left font-serif">
                        {faq.question}
                      </h3>
                      {faq.question_ar && (
                        <p className="font-bold text-indigo-950 text-xs mt-0.5 leading-snug">
                          {faq.question_ar}
                        </p>
                      )}
                    </div>

                    {/* Answer EN & AR */}
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                      <p className="dir-ltr text-left text-slate-700 font-medium">
                        {faq.answer}
                      </p>
                      {faq.answer_ar && (
                        <p className="text-slate-600 font-normal border-t border-slate-200/50 pt-1 mt-1">
                          {faq.answer_ar}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions & Status */}
                <div className="flex items-center gap-3 justify-end flex-shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  {/* Status toggle badge */}
                  <button
                    onClick={() => handleToggleStatus(faq)}
                    title="انقر للتفعيل أو التعطيل"
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      faq.is_active
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {faq.is_active ? (
                      <>
                        <Eye size={14} />
                        <span>نشط</span>
                      </>
                    ) : (
                      <>
                        <EyeOff size={14} />
                        <span>مخفي</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => openEditModal(faq)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                    title="تعديل السؤال"
                  >
                    <Edit3 size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(faq.id)}
                    disabled={deletingId === faq.id}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    title="حذف السؤال"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 relative text-right max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute left-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <HelpCircle className="text-indigo-600" size={22} />
              <span>{editingFaq ? 'تعديل السؤال الشائع' : 'إضافة سؤال جديد'}</span>
            </h2>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Question EN */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                  <span>السؤال (باللغة الإنجليزية) *</span>
                  <span className="text-[10px] text-slate-400 font-mono">EN</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How do I book an appointment?"
                  value={formData.question}
                  onChange={(e) => setFormData((prev) => ({ ...prev, question: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all dir-ltr"
                />
              </div>

              {/* Question AR */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                  <span>السؤال (باللغة العربية)</span>
                  <span className="text-[10px] text-slate-400 font-mono">AR</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: كيف يمكنني حجز موعد زيارة؟"
                  value={formData.question_ar}
                  onChange={(e) => setFormData((prev) => ({ ...prev, question_ar: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all"
                />
              </div>

              {/* Answer EN */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                  <span>الإجابة (باللغة الإنجليزية) *</span>
                  <span className="text-[10px] text-slate-400 font-mono">EN</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Write the full answer in English..."
                  value={formData.answer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, answer: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all resize-none dir-ltr"
                />
              </div>

              {/* Answer AR */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                  <span>الإجابة (باللغة العربية)</span>
                  <span className="text-[10px] text-slate-400 font-mono">AR</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="اكتب الإجابة الكاملة باللغة العربية هنا..."
                  value={formData.answer_ar}
                  onChange={(e) => setFormData((prev) => ({ ...prev, answer_ar: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all resize-none"
                />
              </div>

              {/* Sort Order & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">ترتيب العرض (رقم التسلسل)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.sort_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">حالة العرض بالموقع</label>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))}
                      className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        formData.is_active
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-slate-100 border-slate-300 text-slate-500'
                      }`}
                    >
                      {formData.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                      <span>{formData.is_active ? 'نشط ومعروض' : 'مخفي'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                  <span>{editingFaq ? 'حفظ التعديلات' : 'إضافة السؤال'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all text-xs font-bold cursor-pointer"
                >
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
