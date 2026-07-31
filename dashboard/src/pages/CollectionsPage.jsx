import React, { useState, useEffect } from 'react';
import { apiClient, getStorageUrl } from '@/lib/api-client';
import { autoTranslateText } from '@/lib/auto-translate';
import { Search, Plus, X, Trash2, Edit3, Layers, Image as ImageIcon, Languages } from 'lucide-react';

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [tagline, setTagline] = useState('');
  const [taglineAr, setTaglineAr] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/collections');
      const data = Array.isArray(res) ? res : res.data || [];
      setCollections(data);
    } catch (e) {
      console.error('Failed to fetch collections:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const resetForm = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setName('');
    setNameAr('');
    setTagline('');
    setTaglineAr('');
    setDescription('');
    setImageFile(null);
    setImagePreview('');
  };

  const handleOpenAddModal = () => {
    setEditingCollection(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (col) => {
    setEditingCollection(col);
    setName(col.name || '');
    setNameAr(col.name_ar || '');
    setTagline(col.tagline || '');
    setTaglineAr(col.tagline_ar || '');
    setDescription(col.description || '');
    setImageFile(null);
    setImagePreview(col.image ? getStorageUrl(col.image) : '');
    setIsModalOpen(true);
  };

  const handleAutoTranslate = async () => {
    if (name.trim()) {
      setIsTranslating(true);
      const translatedName = await autoTranslateText(name, 'en', 'ar');
      setNameAr(translatedName);
      if (tagline.trim()) {
        const translatedTagline = await autoTranslateText(tagline, 'en', 'ar');
        setTaglineAr(translatedTagline);
      }
      setIsTranslating(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const formData = new FormData();
      formData.append('name', name);
      if (nameAr) formData.append('name_ar', nameAr);
      if (tagline) formData.append('tagline', tagline);
      if (taglineAr) formData.append('tagline_ar', taglineAr);
      if (description) formData.append('description', description);
      if (imageFile) formData.append('image', imageFile);

      if (editingCollection) {
        formData.append('_method', 'PUT');
        await apiClient.postFormData(`/collections/${editingCollection.id}`, formData);
      } else {
        await apiClient.postFormData('/collections', formData);
      }

      fetchCollections();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save collection:', err);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteConfirm) return;
    try {
      await apiClient.delete(`/collections/${deleteConfirm.id}`);
      fetchCollections();
    } catch (e) {
      console.error('Failed to delete collection:', e);
    }
    setDeleteConfirm(null);
  };

  const filteredCollections = collections.filter((c) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name_ar?.includes(searchQuery)
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex flex-col min-h-full overflow-y-auto bg-slate-50/50 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-800">إدارة التشكيلات (Collections)</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">إدارة تشكيلات الفساتين المعروضة على الموقع الإلكتروني</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="بحث في التشكيلات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-white border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700 shadow-sm"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          </div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-md shadow-indigo-600/10 active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Plus size={16} />
            <span>إضافة تشكيلة جديدة</span>
          </button>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="flex-1 bg-white rounded-3xl p-5 border border-slate-100 flex flex-col overflow-hidden shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-xs font-extrabold text-slate-600">التشكيلات المتاحة ({filteredCollections.length})</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 text-xs font-semibold">جاري التحميل...</div>
        ) : filteredCollections.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-2">
            <Layers size={32} />
            <p className="text-xs font-semibold">لا توجد تشكيلات حتى الآن</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto p-1">
            {filteredCollections.map((col) => {
              const imageUrl = col.image ? getStorageUrl(col.image) : null;
              return (
                <div key={col.id} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    {imageUrl ? (
                      <img src={imageUrl} alt={col.name} className="w-full h-40 object-cover rounded-xl mb-3 border border-slate-200" />
                    ) : (
                      <div className="w-full h-40 bg-slate-100 rounded-xl mb-3 flex items-center justify-center text-slate-300">
                        <ImageIcon size={32} />
                      </div>
                    )}
                    <h3 className="font-black text-slate-800 text-sm">{col.name}</h3>
                    {col.name_ar && <p className="text-xs font-semibold text-slate-500">{col.name_ar}</p>}
                    {col.tagline && <p className="text-[11px] text-indigo-600 font-bold mt-1">{col.tagline}</p>}
                    <p className="text-[10px] text-slate-400 font-semibold mt-2 line-clamp-2">{col.description || 'لا يوجد وصف'}</p>
                    <span className="inline-block mt-2 bg-indigo-50 text-indigo-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      عدد الفساتين: {col.dresses_count || 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/60">
                    <button
                      onClick={() => handleOpenEditModal(col)}
                      className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={12} />
                      <span>تعديل</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(col)}
                      className="p-1.5 bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">
                {editingCollection ? 'تعديل التشكيلة' : 'إضافة تشكيلة جديدة'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto text-right">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-600">اسم التشكيلة (English)</label>
                  <button type="button" onClick={handleAutoTranslate} disabled={isTranslating} className="text-[10px] text-indigo-600 font-extrabold flex items-center gap-1 hover:underline">
                    <Languages size={12} />
                    <span>{isTranslating ? 'جاري الترجمة...' : 'ترجمة تلقائية ⚡'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Classic, Royal, Boho"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اسم التشكيلة (بالعربية)</label>
                <input
                  type="text"
                  placeholder="مثال: التشكيلة الكلاسيكية"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">Tagline (EN)</label>
                  <input
                    type="text"
                    placeholder="e.g. Timeless & Elegant"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">الشعار البارز (AR)</label>
                  <input
                    type="text"
                    placeholder="مثال: أناقة خالدة"
                    value={taglineAr}
                    onChange={(e) => setTaglineAr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">وصف التشكيلة</label>
                <textarea
                  rows={3}
                  placeholder="وصف مختصر للتشكيلة..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-600 block">صورة غلاف التشكيلة</label>
                {imagePreview && (
                  <div className="w-full h-36 rounded-2xl overflow-hidden border border-slate-200 mb-2 relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setImageFile(e.target.files[0]);
                      setImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all">
                  حفظ التشكيلة
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-xl space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 size={20} />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 text-center">حذف التشكيلة</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed text-center">
              هل أنتِ متأكدة من حذف تشكيلة &quot;{deleteConfirm.name}&quot;؟
            </p>
            <div className="flex items-center gap-3">
              <button onClick={handleDeleteSubmit} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all">
                تأكيد الحذف
              </button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
