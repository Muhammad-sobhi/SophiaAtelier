import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { autoTranslateText } from '@/lib/auto-translate';
import { Search, Plus, X, Trash2, Edit3, Sparkles, Ruler, DollarSign, Languages } from 'lucide-react';

const DRESS_STAGES = [
{ id: 'ready', label: 'جاهز', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
{ id: 'booked', label: 'محجوز', color: 'text-blue-600 bg-blue-50 border-blue-100' },
{ id: 'dry_clean', label: 'دراي كلين', color: 'text-purple-600 bg-purple-50 border-purple-100' }];


export default function DressesPage() {
  const [dressesList, setDressesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form states for new/edit dress
  const [editingDress, setEditingDress] = useState(null);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDescriptionAr, setNewDescriptionAr] = useState('');
  const [newFabric, setNewFabric] = useState('');
  const [newFabricAr, setNewFabricAr] = useState('');
  const [newDesigner, setNewDesigner] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [newRentalCost, setNewRentalCost] = useState('');
  const [newTryingFee, setNewTryingFee] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newWeightFrom, setNewWeightFrom] = useState('');
  const [newWeightTo, setNewWeightTo] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newNewCollection, setNewNewCollection] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Category & Collection selection options
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImageFile, setNewCategoryImageFile] = useState(null);
  const [newCategoryImagePreview, setNewCategoryImagePreview] = useState('');

  const resetForm = () => {
    setNewCode('');
    setNewName('');
    setNewNameAr('');
    setNewDescription('');
    setNewDescriptionAr('');
    setNewFabric('');
    setNewFabricAr('');
    setNewDesigner('');
    setNewPurchasePrice('');
    setNewRentalCost('');
    setNewTryingFee('');
    setNewSize('');
    setNewWeightFrom('');
    setNewWeightTo('');
    setNewColor('');
    setNewNewCollection(false);
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    setNewCategoryImageFile(null);
    setNewCategoryImagePreview('');
    setDressImages([]);
    setImagePreviewUrls([]);
    setAccessories(['']);
  };

  const handleDeleteCategory = async (catId) => {
    const targetCat = categories.find((c) => c.id.toString() === catId.toString());
    if (!targetCat) return;
    if (!window.confirm(`هل أنت تأكد من حذف التصنيف "${targetCat.name}"؟`)) return;

    try {
      await apiClient.delete(`/categories/${catId}`);
      loadDependencies();
    } catch (err) {
      console.error('Failed to delete category:', err);
      alert('تعذر حذف التصنيف لوجود عناصر مرتبطة به أو حدث خطأ أثناء الحذف.');
    }
  };

  // Image upload states
  const [dressImages, setDressImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);

  // Accessories list states
  const [accessories, setAccessories] = useState(['']);

  const fetchDresses = async () => {
    try {
      const response = await apiClient.get('/dresses');
      const data = response.data || [];
      setDressesList(data);
    } catch (e) {
      console.error('Failed to fetch dresses:', e);
    }
  };

  const loadDependencies = () => {
    apiClient.get('/categories').then((res) => {
      const list = Array.isArray(res) ? res : res.data || [];
      setCategories(list);
      if (list.length > 0) setSelectedCategoryId(list[0].id.toString());
    }).catch(() => {});

    apiClient.get('/collections').then((res) => {
      const list = Array.isArray(res) ? res : res.data || [];
      setCollections(list);
    }).catch(() => {});

    apiClient.get('/designers').then((res) => {
      setDesigners(Array.isArray(res) ? res : res.data || []);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchDresses();
    loadDependencies();
  }, []);

  const handleAddDressSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // 1. Resolve or Create Designer
    let designerId = null;
    const matchedDesigner = designers.find((d) => d.name?.toLowerCase() === newDesigner.trim().toLowerCase());
    if (matchedDesigner) {
      designerId = matchedDesigner.id;
    } else if (newDesigner.trim()) {
      try {
        const desRes = await apiClient.post('/designers', {
          name: newDesigner.trim(),
          phone: '000',
          email: `${newDesigner.trim().replace(/\s+/g, '').toLowerCase()}@atelier-designer.com`
        });
        designerId = desRes.id || desRes.data?.id;
      } catch (err) {
        console.error('Failed to create designer:', err);
      }
    }
    if (!designerId) designerId = designers[0]?.id || 1;

    // 2. Resolve or Create Category
    let categoryId = null;
    if (isAddingNewCategory && newCategoryName.trim()) {
      try {
        const catFd = new FormData();
        catFd.append('name', newCategoryName.trim());
        catFd.append('description', `تصنيف تم إنشاؤه تلقائياً: ${newCategoryName.trim()}`);
        if (newCategoryImageFile) {
          catFd.append('image', newCategoryImageFile);
        }
        const catRes = await apiClient.postFormData('/categories', catFd);
        categoryId = catRes.id || catRes.data?.id;
      } catch (err) {
        console.error('Failed to create category:', err);
      }
    } else {
      categoryId = parseInt(selectedCategoryId);
    }
    if (!categoryId) categoryId = categories[0]?.id || 1;

    const priceNum = parseFloat(newPurchasePrice.toString().replace(/[^\d]/g, '')) || 0;
    const rentalNum = parseFloat(newRentalCost.toString().replace(/[^\d]/g, '')) || 0;
    const tryingNum = newTryingFee ? parseFloat(newTryingFee.toString().replace(/[^\d]/g, '')) : 0;

    const wFrom = newWeightFrom ? parseInt(newWeightFrom) : null;
    const wTo = newWeightTo ? parseInt(newWeightTo) : null;
    const sizeStr = wFrom || wTo ? `${wFrom || 0}kg up to ${wTo || 0}kg` : newSize;

    // Filter valid accessories
    const validAccs = accessories.map((a) => a.trim()).filter((a) => a.length > 0);

    try {
      let dressId = null;
      const dressPayload = {
        code: newCode.trim() || null,
        name: newName,
        name_ar: newNameAr || newName,
        description: newDescription,
        description_ar: newDescriptionAr || newDescription,
        fabric: newFabric,
        fabric_ar: newFabricAr || newFabric,
        category_id: categoryId,
        collection_id: selectedCollectionId ? parseInt(selectedCollectionId) : null,
        designer_id: designerId,
        purchase_price: priceNum,
        rental_price: rentalNum,
        trying_fee: tryingNum,
        size: sizeStr,
        weight_from: wFrom,
        weight_to: wTo,
        color: newColor,
        accessories: validAccs,
        new_collection: newNewCollection ? 1 : 0
      };

      if (editingDress) {
        const res = await apiClient.put(`/dresses/${editingDress.id}`, dressPayload);
        dressId = editingDress.id;
      } else {
        const res = await apiClient.post('/dresses', {
          ...dressPayload,
          status: 'available'
        });
        dressId = res.data?.id || res.id;
      }

      // Upload images if any are selected
      if (dressImages.length > 0 && dressId) {
        const fd = new FormData();
        dressImages.forEach((img) => fd.append('images[]', img));
        try {
          await apiClient.postFormData(`/dresses/${dressId}/images`, fd);
        } catch (imgErr) {
          console.error('Failed to upload images:', imgErr);
        }
      }

      fetchDresses();
      loadDependencies();
    } catch (err) {
      console.error('Failed to save dress:', err);
    }

    setIsModalOpen(false);
    setEditingDress(null);
    resetForm();
  };

  const handleEditClick = (dress) => {
    setEditingDress(dress);
    setNewCode(dress.code || '');
    setNewName(dress.name);
    setNewNameAr(dress.name_ar || dress.name || '');
    setNewDescription(dress.description || '');
    setNewDescriptionAr(dress.description_ar || dress.description || '');
    setNewFabric(dress.fabric || 'Satin');
    setNewFabricAr(dress.fabric_ar || 'ساتان');
    setNewDesigner(typeof dress.designer === 'object' ? dress.designer?.name || '' : dress.designer || '');
    setNewPurchasePrice(dress.purchase_price ? dress.purchase_price.toString() : '');
    setNewRentalCost(dress.rental_price ? dress.rental_price.toString() : '');
    setNewTryingFee(dress.trying_fee ? dress.trying_fee.toString() : '');
    setNewSize(dress.size || '');
    setNewWeightFrom(dress.weight_from !== null && dress.weight_from !== undefined ? dress.weight_from.toString() : '');
    setNewWeightTo(dress.weight_to !== null && dress.weight_to !== undefined ? dress.weight_to.toString() : '');
    setNewColor(dress.color || 'White');
    setNewNewCollection(dress.new_collection === true || dress.new_collection === 1 || dress.new_collection === '1');
    setSelectedCategoryId(dress.category_id ? dress.category_id.toString() : '');
    setSelectedCollectionId(dress.collection_id ? dress.collection_id.toString() : '');
    setIsAddingNewCategory(false);
    setNewCategoryName('');

    if (dress.accessories && dress.accessories.length > 0) {
      setAccessories(dress.accessories.map((a) => a.name));
    } else {
      setAccessories(['']);
    }

    // Prepopulate images
    if (dress.images && dress.images.length > 0) {
      setImagePreviewUrls(dress.images.map((img) =>
      `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${img.image_path}`
      ));
    } else {
      setImagePreviewUrls([]);
    }
    setDressImages([]);

    setIsModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!deleteConfirm) return;
    try {
      await apiClient.delete(`/dresses/${deleteConfirm.id}`);
      fetchDresses();
    } catch (e) {
      console.error('Failed to delete dress:', e);
    }
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    imagePreviewUrls.forEach((url) => {
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    if (newCategoryImagePreview && newCategoryImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(newCategoryImagePreview);
    }
    setNewName('');
    setNewNameAr('');
    setNewDescription('');
    setNewDescriptionAr('');
    setNewFabric('');
    setNewFabricAr('');
    setNewDesigner('');
    setNewPurchasePrice('');
    setNewRentalCost('');
    setNewTryingFee('');
    setNewSize('');
    setNewColor('');
    setNewNewCollection(false);
    setSelectedCollectionId('');
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    setNewCategoryImageFile(null);
    setNewCategoryImagePreview('');
    setDressImages([]);
    setImagePreviewUrls([]);
    setAccessories(['']);
  };

  const handleAutoTranslateName = async () => {
    if (newName.trim()) {
      setIsTranslating(true);
      const translated = await autoTranslateText(newName, 'en', 'ar');
      setNewNameAr(translated);
      setIsTranslating(false);
    } else if (newNameAr.trim()) {
      setIsTranslating(true);
      const translated = await autoTranslateText(newNameAr, 'ar', 'en');
      setNewName(translated);
      setIsTranslating(false);
    }
  };

  const handleAutoTranslateDesc = async () => {
    if (newDescription.trim()) {
      setIsTranslating(true);
      const translated = await autoTranslateText(newDescription, 'en', 'ar');
      setNewDescriptionAr(translated);
      setIsTranslating(false);
    } else if (newDescriptionAr.trim()) {
      setIsTranslating(true);
      const translated = await autoTranslateText(newDescriptionAr, 'ar', 'en');
      setNewDescription(translated);
      setIsTranslating(false);
    }
  };

  const handleStageAction = async (dressId, action) => {
    try {
      await apiClient.put(`/dresses/${dressId}/stage-action`, { action });
      fetchDresses();
    } catch (e) {
      console.error('Failed dress stage action:', e);
    }
  };

  const getActionsForDress = (dress) => {
    switch (dress.current_stage) {
      case 'ready':
        return [
        { label: 'حجز الفستان', action: 'mark_booked', color: 'bg-blue-600 hover:bg-blue-700' }];

      case 'booked':
        if (dress.status === 'out') {
          return [
          { label: 'إرجاع ودراي كلين', action: 'mark_dry_clean', color: 'bg-purple-600 hover:bg-purple-700' }];

        }
        return [
        { label: 'تسليم للعميلة', action: 'mark_out', color: 'bg-amber-600 hover:bg-amber-700' },
        { label: 'إلغاء الحجز', action: 'cancel_booking', color: 'bg-slate-500 hover:bg-slate-600' }];

      case 'dry_clean':
        return [
        { label: 'إنهاء التنظيف', action: 'mark_ready', color: 'bg-emerald-600 hover:bg-emerald-700' }];

      default:
        return [];
    }
  };

  const filteredDresses = dressesList.filter((d) => {
    const designerName = typeof d.designer === 'object' ? d.designer?.name : d.designer;
    return d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    designerName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStageLabel = (stage) => {
    return DRESS_STAGES.find((s) => s.id === stage)?.label || stage;
  };

  const getStageColor = (stage) => {
    return DRESS_STAGES.find((s) => s.id === stage)?.color || 'text-slate-500 bg-slate-50 border-slate-100';
  };

  // Image Upload Field Change
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = 4 - dressImages.length;
    const toAdd = files.slice(0, remaining);
    setDressImages((prev) => [...prev, ...toAdd]);
    setImagePreviewUrls((prev) => [
    ...prev,
    ...toAdd.map((f) => URL.createObjectURL(f))]
    );
  };

  const handleRemoveImage = (idx) => {
    setDressImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // Accessories Helpers
  const handleAddAccessory = () => setAccessories([...accessories, '']);
  const handleRemoveAccessory = (idx) => setAccessories(accessories.filter((_, i) => i !== idx));
  const handleAccessoryChange = (idx, val) => {
    setAccessories(accessories.map((item, i) => i === idx ? val : item));
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex flex-col min-h-full overflow-y-auto bg-slate-50/50 text-right" dir="rtl">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-800">إدارة كتالوج الفساتين</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">تتبع الفساتين، فترات حجزها، وصيانتها وحالتها التشغيلية</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="بحث في الكتالوج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-white border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700 shadow-sm" />
            
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          </div>
          <button
            onClick={() => {resetForm();setEditingDress(null);setIsModalOpen(true);}}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-md shadow-indigo-600/10 active:scale-95 cursor-pointer w-full sm:w-auto">
            
            <Plus size={16} />
            <span>إضافة فستان جديد</span>
          </button>
        </div>
      </div>

      {/* Dresses Grid */}
      <div className="flex-1 bg-white rounded-3xl p-5 border border-slate-100 flex flex-col overflow-hidden shadow-sm">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h2 className="text-xs font-extrabold text-slate-600">كتالوج الفساتين المتاحة ({filteredDresses.length})</h2>
        </div>

        <div className="flex-grow overflow-y-auto pr-1 scrollbar-thin select-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-1 animate-fade-in">
            {filteredDresses.map((dress) => {
              const actions = getActionsForDress(dress);
              const imageUrl = dress.images?.[0]?.image_path ?
              `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${dress.images[0].image_path}` :
              null;

              return (
                <div
                  key={dress.id}
                  className="bg-white rounded-2xl border border-slate-150 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-all relative group text-right">
                  
                  <div>
                    {/* Image with Trying Fee Badge */}
                    <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 mb-3 flex-shrink-0">
                      {imageUrl ?
                      <img src={imageUrl} alt={dress.name} className="w-full h-full object-cover" /> :

                      <div className="w-full h-full flex items-center justify-center">
                          <Sparkles size={24} className="text-slate-300" />
                        </div>
                      }
                      {/* Trying Fee Overlay */}
                      {dress.trying_fee > 0 &&
                      <div className="absolute top-2 right-2 bg-rose-600/90 text-white text-[8.5px] font-black px-2 py-0.5 rounded-full shadow-xs">
                          رسوم قياس: {dress.trying_fee.toLocaleString()} ج.م
                        </div>
                      }
                      {/* New Collection Badge */}
                      {(dress.new_collection === true || dress.new_collection === 1 || dress.new_collection === '1') &&
                      <div className="absolute bottom-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">
                          ✨ تشكيلة جديدة
                        </div>
                      }
                      {/* Edit/Delete Overlay */}
                      <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(dress)}
                          className="p-1.5 bg-white/90 text-indigo-600 hover:bg-white rounded-lg transition-all shadow-xs cursor-pointer"
                          title="تعديل">
                          
                          <Edit3 size={11} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, id: dress.id, title: dress.name })}
                          className="p-1.5 bg-white/90 text-rose-500 hover:bg-white rounded-lg transition-all shadow-xs cursor-pointer"
                          title="حذف">
                          
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Stage status & Code Badge */}
                    <div className="flex items-center justify-between mb-2 gap-1">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-[10px] font-black text-slate-800 truncate">{dress.name}</span>
                        {dress.code && (
                          <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md flex-shrink-0">
                            #{dress.code}
                          </span>
                        )}
                      </div>
                      <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border flex-shrink-0 ${getStageColor(dress.current_stage)}`}>
                        {getStageLabel(dress.current_stage)}
                      </span>
                    </div>

                    {/* Details Info */}
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-extrabold text-slate-500 mb-3.5">
                      <div className="flex items-center gap-1 col-span-2 text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded-lg border border-indigo-100/50">
                        <Ruler size={11} className="text-indigo-500" />
                        <span>
                          الوزن: {dress.weight_from || dress.weight_to ? `${dress.weight_from || 0}kg up to ${dress.weight_to || 0}kg (من ${dress.weight_from || 0} كجم إلى ${dress.weight_to || 0} كجم)` : (dress.size || '—')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign size={10} className="text-slate-400" />
                        <span>إيجار: {dress.rental_price ? dress.rental_price.toLocaleString() : 0} ج.م</span>
                      </div>
                      {dress.designer &&
                      <div className="text-[8.5px] text-slate-400 font-bold truncate">
                          المصمم: {typeof dress.designer === 'object' ? dress.designer.name : dress.designer}
                        </div>
                      }
                    </div>
                  </div>

                  {/* Stage Action Buttons */}
                  {actions.length > 0 &&
                  <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-100">
                      {actions.map((act) =>
                    <button
                      key={act.action}
                      onClick={() => handleStageAction(dress.id, act.action)}
                      className={`w-full py-2 text-white rounded-xl text-[9px] font-black transition-all duration-300 active:scale-95 cursor-pointer shadow-xs ${act.color}`}>
                      
                          {act.label}
                        </button>
                    )}
                    </div>
                  }
                </div>);

            })}
          </div>
        </div>
      </div>

      {/* Add/Edit Dress Modal */}
      {isModalOpen &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">
                {editingDress ? 'تعديل بيانات الفستان بالكتالوج' : 'إضافة فستان زفاف جديد للكتالوج'}
              </h3>
              <button
              onClick={() => {setIsModalOpen(false);setEditingDress(null);}}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-655 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddDressSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              {/* Dress Code + Category & Collection Selector */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600 block">كود الفستان (Dress Code)</label>
                  <input
                    type="text"
                    placeholder="مثال: DR-101 أو SOPHIA-01"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600 block">التصنيف</label>
                    <div className="flex items-center gap-2">
                      {!isAddingNewCategory ? (
                        <>
                          <select
                            value={selectedCategoryId}
                            onChange={(e) => setSelectedCategoryId(e.target.value)}
                            className="flex-grow px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.name} {c.name_ar ? `(${c.name_ar})` : ''}</option>
                            ))}
                          </select>
                          {selectedCategoryId && categories.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(selectedCategoryId)}
                              className="p-2.5 bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 rounded-2xl transition-all cursor-pointer flex-shrink-0"
                              title="حذف هذا التصنيف"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsAddingNewCategory(true)}
                            className="px-3 py-2.5 bg-indigo-50 border border-indigo-150 text-indigo-600 rounded-2xl text-[10px] font-bold hover:bg-indigo-100/50 transition-all flex-shrink-0 cursor-pointer"
                          >
                            جديد+
                          </button>
                        </>
                      ) : (
                        <div className="w-full space-y-2 bg-indigo-50/40 p-2.5 rounded-2xl border border-indigo-100/70">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              required
                              placeholder="اسم التصنيف الجديد"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              className="flex-grow px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                            />
                            <button
                              type="button"
                              onClick={() => { setIsAddingNewCategory(false); setNewCategoryName(''); setNewCategoryImageFile(null); setNewCategoryImagePreview(''); }}
                              className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-50 transition-all flex-shrink-0 cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            {newCategoryImagePreview && (
                              <img src={newCategoryImagePreview} alt="Category preview" className="w-9 h-9 rounded-lg object-cover border border-indigo-200 flex-shrink-0" />
                            )}
                            <label className="text-[10px] font-extrabold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all">
                              📷 {newCategoryImageFile ? 'تغيير صورة التصنيف' : 'اختيار صورة للتصنيف'}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    setNewCategoryImageFile(e.target.files[0]);
                                    setNewCategoryImagePreview(URL.createObjectURL(e.target.files[0]));
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600 block">التشكيلة (Collection)</label>
                    <select
                      value={selectedCollectionId}
                      onChange={(e) => setSelectedCollectionId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    >
                      <option value="">بدون تشكيلة</option>
                      {collections.map((col) => (
                        <option key={col.id} value={col.id}>{col.name} {col.name_ar ? `(${col.name_ar})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dress Name Fields (EN & AR) + Auto-Translate */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-3 rounded-2xl border border-slate-100 relative">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold text-slate-600">Dress Name (English)</label>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Celestial Rose"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold text-slate-600">اسم الفستان (بالعربية)</label>
                    <button
                      type="button"
                      onClick={handleAutoTranslateName}
                      disabled={isTranslating}
                      className="text-[10px] text-indigo-600 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Languages size={12} />
                      <span>{isTranslating ? 'جاري الترجمة...' : 'ترجمة تلقائية ⚡'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="مثال: سليستيال روز"
                    value={newNameAr}
                    onChange={(e) => setNewNameAr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>
              </div>

              {/* Description Fields (EN & AR) */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">Description (English)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. A-line wedding gown with rose gold embroidery"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold text-slate-600">الوصف (بالعربية)</label>
                    <button
                      type="button"
                      onClick={handleAutoTranslateDesc}
                      disabled={isTranslating}
                      className="text-[10px] text-indigo-600 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Languages size={12} />
                      <span>{isTranslating ? 'جاري الترجمة...' : 'ترجمة تلقائية ⚡'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="مثال: فستان بقصة A وتطريز ذهبي وردي فاخر"
                    value={newDescriptionAr}
                    onChange={(e) => setNewDescriptionAr(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 resize-none"
                  />
                </div>
              </div>

              {/* Designer, Weight Range (Weight from / up to Weight), Color */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">الديزاينر / المصمم</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: زهير مراد"
                    value={newDesigner}
                    onChange={(e) => setNewDesigner(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600 block">الوزن المناسب للفستان</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="الوزن من (كجم)"
                      value={newWeightFrom}
                      onChange={(e) => setNewWeightFrom(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    />
                    <input
                      type="number"
                      placeholder="إلى وزن (كجم)"
                      value={newWeightTo}
                      onChange={(e) => setNewWeightTo(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">اللون</label>
                  <input
                    type="text"
                    required
                    placeholder="أبيض / Ivory"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700"
                  />
                </div>
              </div>

              {/* Fabric Fields (EN & AR) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">Fabric (English)</label>
                  <input
                  type="text"
                  placeholder="e.g. Satin, Tulle, Silk"
                  value={newFabric}
                  onChange={(e) => setNewFabric(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">القماش (بالعربية)</label>
                  <input
                  type="text"
                  placeholder="مثال: ساتان، تول، حرير"
                  value={newFabricAr}
                  onChange={(e) => setNewFabricAr(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تكلفة الشراء</label>
                  <input
                  type="text"
                  required
                  placeholder="15000"
                  value={newPurchasePrice}
                  onChange={(e) => setNewPurchasePrice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تكلفة الإيجار</label>
                  <input
                  type="text"
                  required
                  placeholder="3500"
                  value={newRentalCost}
                  onChange={(e) => setNewRentalCost(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">رسوم التجربة</label>
                  <input
                  type="text"
                  placeholder="500"
                  value={newTryingFee}
                  onChange={(e) => setNewTryingFee(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
              </div>

              {/* New Collection Checkbox */}
              <div className="flex items-center gap-2 py-1 text-right">
                <input
                type="checkbox"
                id="new_collection"
                checked={newNewCollection}
                onChange={(e) => setNewNewCollection(e.target.checked)}
                className="w-4 h-4 text-indigo-650 border-slate-200 rounded-md focus:ring-indigo-500 cursor-pointer" />
              
                <label htmlFor="new_collection" className="text-xs font-black text-slate-700 cursor-pointer select-none">
                  ✨ هذا الفستان جزء من التشكيلة الجديدة (New Collection)
                </label>
              </div>

              {/* Dynamic Accessories Section */}
              <div className="space-y-2 text-right">
                <label className="text-xs font-extrabold text-slate-600 block">الإكسسوارات والملحقات</label>
                <div className="space-y-2">
                  {accessories.map((acc, idx) =>
                <div key={idx} className="flex items-center gap-2">
                      <input
                    type="text"
                    placeholder="مثال: طرحة طويلة مطرزة"
                    value={acc}
                    onChange={(e) => handleAccessoryChange(idx, e.target.value)}
                    className="flex-grow px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                  
                      {accessories.length > 1 &&
                  <button
                    type="button"
                    onClick={() => handleRemoveAccessory(idx)}
                    className="p-2.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl hover:bg-rose-100/60 transition-all cursor-pointer">
                    
                          <Trash2 size={14} />
                        </button>
                  }
                    </div>
                )}
                </div>
                <button
                type="button"
                onClick={handleAddAccessory}
                className="mt-1 flex items-center gap-1 px-3 py-1.5 border border-indigo-150 hover:bg-indigo-50/50 text-indigo-600 rounded-xl text-[10px] font-bold transition-all cursor-pointer">
                
                  <Plus size={10} />
                  <span>إضافة إكسسوار+</span>
                </button>
              </div>

              {/* Image Zone (up to 4 images) */}
              <div className="space-y-2 text-right">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-600">صور الفستان (حتى 4 صور)</label>
                  <span className="text-[10px] font-semibold text-slate-400">{imagePreviewUrls.length}/4</span>
                </div>
                {imagePreviewUrls.length > 0 &&
              <div className="grid grid-cols-4 gap-2">
                    {imagePreviewUrls.map((url, idx) =>
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                        <img src={url} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 &&
                  <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full">رئيسية</span>
                  }
                        <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer">
                    
                          <X size={10} />
                        </button>
                      </div>
                )}
                  </div>
              }
                {imagePreviewUrls.length < 4 &&
              <label className="flex flex-col items-center justify-center gap-1.5 w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all">
                    <Plus size={16} className="text-indigo-500" />
                    <span className="text-[10px] font-bold text-slate-500">اضغط لرفع صور الفستان</span>
                    <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect} />
                
                  </label>
              }
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  حفظ الفستان بالكتالوج
                </button>
                <button
                type="button"
                onClick={() => {setIsModalOpen(false);setEditingDress(null);}}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Delete Confirmation Modal */}
      {deleteConfirm?.isOpen &&
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-xl space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 size={20} className="animate-pulse" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 text-center">حذف الفستان نهائياً</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed text-center">
              هل أنتِ متأكدة من رغبتكِ في حذف فستان "{deleteConfirm.title}" من الكتالوج نهائياً؟
            </p>
            <div className="flex items-center gap-3">
              <button
              onClick={handleDeleteSubmit}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95">
              
                تأكيد الحذف
              </button>
              <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-2xl text-xs font-bold transition-all cursor-pointer">
              
                إلغاء
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}