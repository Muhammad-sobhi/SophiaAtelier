import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Star, Plus, Edit3, Trash2, Check, X, Search,
  CheckCircle, AlertCircle, RefreshCw, Eye, EyeOff, MessageSquare } from
'lucide-react';












export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  // Form State
  const [formData, setFormData] = useState(





    {
      client_name: '',
      rating: 5,
      review_text: '',
      status: 'published',
      sort_order: 0
    });

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reviews');
      setReviews(res);
      notifyReviewsChanged(res);
      setErrorMessage('');
    } catch (e) {
      setErrorMessage(e.message || 'فشل تحميل آراء العملاء من السيرفر');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const openAddModal = () => {
    setEditingReview(null);
    setFormData({
      client_name: '',
      rating: 5,
      review_text: '',
      status: 'published',
      sort_order: 0
    });
    setSuccessMessage('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (review) => {
    setEditingReview(review);
    setFormData({
      client_name: review.client_name,
      rating: review.rating,
      review_text: review.review_text || '',
      status: review.status,
      sort_order: review.sort_order || 0
    });
    setSuccessMessage('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const notifyReviewsChanged = (updatedList) => {
    if (typeof window !== 'undefined') {
      const listToSave = updatedList || reviews;
      try {
        localStorage.setItem('atelier_shared_reviews', JSON.stringify(listToSave));
        localStorage.setItem('atelier_reviews_updated', Date.now().toString());
      } catch (e) {}
      try {
        const channel = new BroadcastChannel('atelier_reviews_channel');
        channel.postMessage({ type: 'REVIEWS_UPDATED', reviews: listToSave });
        channel.close();
      } catch (e) {}
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.client_name.trim()) {
      setErrorMessage('يرجى كتابة اسم العميلة');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');

      let nextReviews = [];
      if (editingReview) {
        // Update
        const updated = await apiClient.put(`/reviews/${editingReview.id}`, formData);
        nextReviews = reviews.map((r) => r.id === updated.id ? updated : r);
        setReviews(nextReviews);
        setSuccessMessage('تم تحديث الرأي بنجاح');
      } else {
        // Create
        const created = await apiClient.post('/reviews', formData);
        nextReviews = [created, ...reviews];
        setReviews(nextReviews);
        setSuccessMessage('تم إضافة الرأي بنجاح');
      }

      notifyReviewsChanged(nextReviews);
      setIsModalOpen(false);
    } catch (err) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ الرأي');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (review) => {
    const newStatus = review.status === 'published' ? 'draft' : 'published';
    const nextReviews = reviews.map((r) => r.id === review.id ? { ...r, status: newStatus } : r);
    try {
      // Optimistic UI update
      setReviews(nextReviews);
      notifyReviewsChanged(nextReviews);
      await apiClient.put(`/reviews/${review.id}`, { status: newStatus });
      setSuccessMessage(`تم تغيير حالة الرأي إلى (${newStatus === 'published' ? 'منشور' : 'مسودة'})`);
    } catch (err) {
      // Rollback on error
      setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, status: review.status } : r));
      setErrorMessage(err.message || 'فشل تحديث الحالة');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت تأكد من رغبتك في حذف هذا الرأي؟')) return;

    const nextReviews = reviews.filter((r) => r.id !== id);
    try {
      setDeletingId(id);
      setReviews(nextReviews);
      notifyReviewsChanged(nextReviews);
      await apiClient.delete(`/reviews/${id}`);
      setSuccessMessage('تم حذف الرأي بنجاح');
    } catch (err) {
      fetchReviews();
      setErrorMessage(err.message || 'فشل حذف الرأي');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered reviews
  const filteredReviews = reviews.filter((r) => {
    const matchesSearch = r.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.review_text && r.review_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // KPI Statistics
  const totalCount = reviews.length;
  const publishedCount = reviews.filter((r) => r.status === 'published').length;
  const draftCount = reviews.filter((r) => r.status === 'draft').length;
  const avgRating = totalCount > 0 ?
  (reviews.reduce((acc, r) => acc + r.rating, 0) / totalCount).toFixed(1) :
  '0.0';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-sans text-right" dir="rtl">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Star className="fill-amber-400 text-amber-500" size={24} />
            </div>
            <span>آراء العملاء</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
            التحكم في تقييمات وآراء العملاء المعروضة في الموقع الرئيسي (إضافة، تعديل، نشر وتعيين كمسودة)
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer">
          
          <Plus size={18} />
          <span>إضافة رأي جديد</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage &&
      <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700">
            <X size={16} />
          </button>
        </div>
      }

      {errorMessage &&
      <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-700">
            <X size={16} />
          </button>
        </div>
      }

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">إجمالي الآراء</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-extrabold text-slate-800">{totalCount}</span>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">رأي</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">الآراء المنشورة</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-extrabold text-emerald-600">{publishedCount}</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">في الموقع</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">المسودات</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-extrabold text-amber-600">{draftCount}</span>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">غير معروض</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400">متوسط التقييم</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-extrabold text-amber-500 flex items-center gap-1">
              {avgRating} <Star className="fill-amber-400 text-amber-400" size={18} />
            </span>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">نجوم</span>
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
            filterStatus === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`
            }>
            
            الكل ({totalCount})
          </button>
          <button
            onClick={() => setFilterStatus('published')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            filterStatus === 'published' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`
            }>
            
            المنشورة ({publishedCount})
          </button>
          <button
            onClick={() => setFilterStatus('draft')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            filterStatus === 'draft' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`
            }>
            
            المسودات ({draftCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="بحث باسم العميلة أو نص الرأي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 transition-all" />
          
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        </div>
      </div>

      {/* Reviews Table / Grid */}
      {loading ?
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 font-bold text-xs">
          <RefreshCw className="animate-spin mx-auto mb-2 text-indigo-600" size={24} />
          جاري تحميل آراء العملاء...
        </div> :
      filteredReviews.length === 0 ?
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 font-bold text-xs">
          <MessageSquare className="mx-auto mb-2 text-slate-300" size={32} />
          لا توجد آراء مطابقة للبحث أو الفلتر المحدد
        </div> :

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReviews.map((review) =>
        <div
          key={review.id}
          className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-md ${
          review.status === 'published' ? 'border-slate-100' : 'border-amber-200/80 bg-amber-50/20'}`
          }>
          
              <div>
                {/* Card Top: Client Name & Status Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base leading-snug">
                      {review.client_name}
                    </h3>
                    {/* Stars */}
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) =>
                  <Star
                    key={star}
                    size={14}
                    className={
                    star <= review.rating ?
                    'fill-amber-400 text-amber-400' :
                    'text-slate-200 fill-slate-100'
                    } />

                  )}
                      <span className="text-[10px] font-bold text-slate-400 mr-1.5">
                        ({review.rating}/5)
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <button
                onClick={() => handleToggleStatus(review)}
                title="انقر لتغيير حالة النشر"
                className={`px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                review.status === 'published' ?
                'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/60' :
                'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200/60'}`
                }>
                
                    {review.status === 'published' ?
                <>
                        <Eye size={12} />
                        <span>منشور</span>
                      </> :

                <>
                        <EyeOff size={12} />
                        <span>مسودة</span>
                      </>
                }
                  </button>
                </div>

                {/* Review Text */}
                <div className="my-4 p-3.5 bg-slate-50 rounded-xl border border-slate-100 min-h-[70px]">
                  {review.review_text ?
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      "{review.review_text}"
                    </p> :

              <p className="text-xs text-slate-400 italic font-normal">
                      لا يوجد نص للرأي (تقييم بالنجوم فقط)
                    </p>
              }
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400">
                  {review.created_at ? new Date(review.created_at).toLocaleDateString('ar-EG') : ''}
                </span>

                <div className="flex items-center gap-2">
                  <button
                onClick={() => openEditModal(review)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                title="تعديل الرأي">
                
                    <Edit3 size={16} />
                  </button>
                  <button
                onClick={() => handleDelete(review.id)}
                disabled={deletingId === review.id}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                title="حذف الرأي">
                
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
        )}
        </div>
      }

      {/* Add / Edit Modal */}
      {isModalOpen &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 relative text-right animate-in fade-in zoom-in duration-200">
            <button
            onClick={() => setIsModalOpen(false)}
            className="absolute left-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            
              <X size={18} />
            </button>

            <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <Star className="text-amber-500 fill-amber-400" size={20} />
              <span>{editingReview ? 'تعديل رأي العميلة' : 'إضافة رأي جديد'}</span>
            </h2>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Client Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">اسم العميلة *</label>
                <input
                type="text"
                required
                placeholder="مثال: سارة محمد"
                value={formData.client_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, client_name: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all" />
              
              </div>

              {/* Star Rating Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">التقييم (عدد النجوم) *</label>
                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  {[1, 2, 3, 4, 5].map((star) =>
                <button
                  type="button"
                  key={star}
                  onClick={() => setFormData((prev) => ({ ...prev, rating: star }))}
                  className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer">
                  
                      <Star
                    size={24}
                    className={
                    star <= formData.rating ?
                    'fill-amber-400 text-amber-400' :
                    'text-slate-300 fill-slate-100'
                    } />
                  
                    </button>
                )}
                  <span className="text-xs font-bold text-slate-600 mr-2">
                    {formData.rating} من 5 نجوم
                  </span>
                </div>
              </div>

              {/* Review Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">نص الرأي (اختياري)</label>
                <textarea
                rows={4}
                placeholder="اكتبي نص رأي أو تقييم العميلة هنا..."
                value={formData.review_text}
                onChange={(e) => setFormData((prev) => ({ ...prev, review_text: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all resize-none" />
              
              </div>

              {/* Status Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">حالة النشر *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, status: 'published' }))}
                  className={`py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  formData.status === 'published' ?
                  'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' :
                  'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`
                  }>
                  
                    <Eye size={16} />
                    <span>منشور في الموقع</span>
                  </button>

                  <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, status: 'draft' }))}
                  className={`py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  formData.status === 'draft' ?
                  'bg-amber-50 border-amber-500 text-amber-700 shadow-sm' :
                  'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`
                  }>
                  
                    <EyeOff size={16} />
                    <span>مسودة (مخفي)</span>
                  </button>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer disabled:opacity-50">
                
                  {saving ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                  <span>{editingReview ? 'حفظ التعديلات' : 'إضافة الرأي'}</span>
                </button>
                
                <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all text-xs font-bold cursor-pointer">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

}