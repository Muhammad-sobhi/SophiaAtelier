import React, { useState, useEffect } from 'react';
import { apiClient, getStorageUrl } from '@/lib/api-client';
import { Search, Plus, X, Trash2, Edit3, Image as ImageIcon, Eye, EyeOff, Film, Play, Maximize2 } from 'lucide-react';

export default function ClientGalleryPage() {
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  // Form states
  const [clientName, setClientName] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const fetchGallery = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/client-gallery');
      const data = Array.isArray(res) ? res : res.data || [];
      setGalleryItems(data);
    } catch (e) {
      console.error('Failed to fetch client gallery:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const resetForm = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setClientName('');
    setIsPublished(true);
    setSortOrder(0);
    setImageFile(null);
    setImagePreview('');
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setEditingItem(item);
    setClientName(item.client_name || '');
    setIsPublished(item.is_published ?? true);
    setSortOrder(item.sort_order || 0);
    setImageFile(null);
    setImagePreview(item.image_path ? `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${item.image_path}` : '');
    setIsModalOpen(true);
  };

  const handleTogglePublish = async (item) => {
    try {
      await apiClient.put(`/client-gallery/${item.id}`, {
        is_published: !item.is_published,
      });
      fetchGallery();
    } catch (e) {
      console.error('Failed to toggle publication state:', e);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    try {
      const formData = new FormData();
      formData.append('client_name', clientName);
      formData.append('is_published', isPublished ? '1' : '0');
      formData.append('sort_order', sortOrder.toString());
      if (imageFile) formData.append('image', imageFile);

      if (editingItem) {
        formData.append('_method', 'PUT');
        await apiClient.postFormData(`/client-gallery/${editingItem.id}`, formData);
      } else {
        if (!imageFile) {
          alert('يرجى اختيار صورة أو مقطع فيديو');
          return;
        }
        await apiClient.postFormData('/client-gallery', formData);
      }

      fetchGallery();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save client gallery item:', err);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteConfirm) return;
    try {
      await apiClient.delete(`/client-gallery/${deleteConfirm.id}`);
      fetchGallery();
    } catch (e) {
      console.error('Failed to delete gallery item:', e);
    }
    setDeleteConfirm(null);
  };

  const filteredItems = galleryItems.filter((i) =>
    i.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex flex-col min-h-full overflow-y-auto bg-slate-50/50 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-800">معرض وسائط العملاء (Real Brides)</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">إدارة الصور ومقاطع الفيديو المعروضة في قسم &quot;Real Love Stories&quot; على الموقع</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="بحث باسم العروس..."
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
            <span>إضافة صورة أو فيديو عروس</span>
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 bg-white rounded-3xl p-5 border border-slate-100 flex flex-col overflow-hidden shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-xs font-extrabold text-slate-600">الوسائط المتاحة المعروضة وغير المعروضة ({filteredItems.length})</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 text-xs font-semibold">جاري التحميل...</div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-2">
            <ImageIcon size={32} />
            <p className="text-xs font-semibold">لا توجد صور أو فيديوهات بالمعرض حتى الآن</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto p-1">
            {filteredItems.map((item) => {
              const mediaUrl = getStorageUrl(item.image_path);
              const isVideo = item.image_path && /\.(mp4|mov|webm|avi|m4v|3gp)$/i.test(item.image_path);
              return (
                <div key={item.id} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all relative group/card">
                  <div>
                    <div className="relative group aspect-[3/4] rounded-xl overflow-hidden mb-3 border border-slate-200 bg-slate-100">
                      {mediaUrl ? (
                        isVideo ? (
                          <video src={mediaUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                        ) : (
                          <img src={mediaUrl} alt={item.client_name} className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon size={32} />
                        </div>
                      )}

                      {/* Video Type Badge */}
                      {isVideo && (
                        <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-lg bg-slate-900/80 text-white backdrop-blur-md border border-white/10 z-10 pointer-events-none">
                          <Film size={11} className="text-amber-400" />
                          <span>فيديو</span>
                        </div>
                      )}

                      {/* Publish Toggle Button */}
                      <button
                        onClick={() => handleTogglePublish(item)}
                        className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-md transition-all cursor-pointer z-10 ${
                          item.is_published ? 'bg-emerald-500 text-white' : 'bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        {item.is_published ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>{item.is_published ? 'معروض بالموقع' : 'مخفي'}</span>
                      </button>

                      {/* Hover Overlay with Preview/Play button */}
                      {mediaUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewItem({ item, mediaUrl, isVideo })}
                          className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-[5]"
                          title={isVideo ? 'تشغيل الفيديو بالصوت' : 'معاينة الصورة بالحجم الكامل'}
                        >
                          <div className="w-12 h-12 rounded-full bg-white/95 text-slate-900 shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                            {isVideo ? <Play size={20} className="fill-slate-900 translate-x-[-1px]" /> : <Maximize2 size={18} />}
                          </div>
                        </button>
                      )}
                    </div>

                    <h3 className="font-black text-slate-800 text-sm">{item.client_name}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">ترتيب العرض: {item.sort_order}</p>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/60">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={12} />
                      <span>تعديل</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item)}
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

      {/* Lightbox / Video Player Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[10000] flex items-center justify-center p-4 sm:p-6 text-right"
          dir="rtl"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div className="flex items-center gap-2">
                {previewItem.isVideo ? <Film size={18} className="text-amber-400" /> : <ImageIcon size={18} className="text-indigo-400" />}
                <span className="font-bold text-sm">{previewItem.item.client_name}</span>
                <span className="text-xs text-white/60">({previewItem.isVideo ? 'فيديو' : 'صورة'})</span>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="w-full max-h-[80vh] rounded-3xl overflow-hidden bg-black flex items-center justify-center shadow-2xl border border-white/10">
              {previewItem.isVideo ? (
                <video
                  src={previewItem.mediaUrl}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[80vh] w-auto max-w-full object-contain"
                />
              ) : (
                <img
                  src={previewItem.mediaUrl}
                  alt={previewItem.item.client_name}
                  className="max-h-[80vh] w-auto max-w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">
                {editingItem ? 'تعديل وسائط العروس (صورة / فيديو)' : 'إضافة وسائط عروس جديدة (صورة / فيديو)'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto text-right">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اسم العروسين / العروس (مثال: Sarah & James)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: Sarah & James"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">ترتيب العرض</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-200 rounded-md focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="is_published" className="text-xs font-black text-slate-700 cursor-pointer">
                    نشر الوسائط فوراً بالموقع
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-600 block">صورة أو فيديو الفستان / العروس (حتى 50MB)</label>
                {imagePreview && (
                  <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 mb-2 relative bg-slate-900 flex items-center justify-center">
                    {(imageFile?.type?.startsWith('video/') || (editingItem?.image_path && /\.(mp4|mov|webm|avi|m4v|3gp)$/i.test(editingItem.image_path))) ? (
                      <video src={imagePreview} className="w-full h-full object-cover" controls autoPlay muted />
                    ) : (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      if (imagePreview && imagePreview.startsWith('blob:')) {
                        URL.revokeObjectURL(imagePreview);
                      }
                      const file = e.target.files[0];
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                />
                <p className="text-[11px] text-slate-400 font-medium">يدعم صيغ الصور (JPG, PNG, WebP) والفيديوهات (MP4, MOV, WebM, M4V) حتى 50MB.</p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all">
                  {editingItem ? 'حفظ التعديلات' : 'حفظ الوسائط'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all"
                >
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
            <h3 className="text-sm font-extrabold text-slate-800 text-center">حذف وسائط العروس</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed text-center">
              هل أنتِ متأكدة من حذف وسائط &quot;{deleteConfirm.client_name}&quot; من المعرض؟
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
