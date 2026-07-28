import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Ruler,
  Scissors,
  Calendar as CalendarIcon,

  Plus,
  X,
  Info,
  Save,
  Printer,
  Trash2,
  Check,
  AlertCircle } from
'lucide-react';



















































const defaultMeasurements = {
  chest: '88',
  waist: '68',
  hips: '96',
  shoulder: '39',
  chestLength: '34',
  backLength: '40',
  sleeveLength: '58',
  armCircumference: '28',
  height: '165',
  trainLength: '180',
  heelHeight: '7',
  weight: '57'
};

const defaultAlterations = {
  waistTighter: false,
  chestTighterSides: false,
  trainShorter: false,
  sleevesAdjust: false,
  addLining: false,
  addBackZipper: false,
  fixCorset: false,
  other: false
};

const statusStyles = {
  'مجدول': { dot: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50' },
  'تم التنفيذ': { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  'ملغى': { dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' }
};

const alterationLabels = {
  waistTighter: 'تضييق الوسط',
  chestTighterSides: 'تضييق الصدر من الجانبين',
  trainShorter: 'تقصير الذيل',
  sleevesAdjust: 'تعديل الأكمام',
  addLining: 'إضافة بطانة',
  addBackZipper: 'إضافة سوستة خلفية',
  fixCorset: 'تثبيت الكورسيه',
  other: 'أخرى'
};

const formatFittingDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} t ${hours}.${minutes}`;
  } catch (e) {
    return dateStr;
  }
};

export default function FittingsPage() {
  const [fittingsList, setFittingsList] = useState([]);
  const [selectedFitting, setSelectedFitting] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [alertMessage, setAlertMessage] = useState(




    null);

  // Dropdown lists from database
  const [bookingsObjects, setBookingsObjects] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);

  // New fitting scheduler states
  const [newBookingId, setNewBookingId] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('05:00 م');
  const [newType, setNewType] = useState('بروفة أولى');
  const [newSalesperson, setNewSalesperson] = useState('منة سامي');
  const [newTailorId, setNewTailorId] = useState('');
  const [newSalesNotes, setNewSalesNotes] = useState('');
  const [modalTab, setModalTab] = useState('measurements');

  const [newMeasurements, setNewMeasurements] = useState({ ...defaultMeasurements });
  const [newAlterations, setNewAlterations] = useState({ ...defaultAlterations });

  const fetchFittings = () => {
    apiClient.get('/fittings').then((res) => {
      const data = res.data || res || [];
      const list = Array.isArray(data) ? data : data.data || [];
      const mapped = list.map((f) => ({
        id: f.id,
        booking_id: f.booking_id,
        client: f.booking?.client?.name || f.client_name || '-',
        dress: f.booking?.dress?.name || f.dress_name || '-',
        dress_id: f.booking?.dress_id,
        dress_2_id: f.booking?.dress_2_id,
        dress_2_name: f.booking?.dress_2?.name,
        dress_3_id: f.booking?.dress_3_id,
        dress_3_name: f.booking?.dress_3?.name,
        booking: f.booking,
        tailor: f.tailor?.name || 'خياطة رئيسية',
        tailor_id: f.tailor_id || null,
        date: f.fitting_date || f.date || '',
        time: f.fitting_time || f.time || '12:00 م',
        type: f.type || 'بروفة أولى',
        status: f.status === 'completed' ? 'تم التنفيذ' : f.status === 'rescheduled' ? 'ملغى' : 'مجدول',
        salesNotes: f.alterations_notes || '',
        additionalNotes: f.additional_notes || '',
        measurements: f.measurements || { ...defaultMeasurements },
        alterations: f.alterations || { ...defaultAlterations }
      }));
      setFittingsList(mapped);
      if (mapped.length > 0) {
        setSelectedFitting(mapped[0]);
      } else {
        setSelectedFitting(null);
      }
    }).catch((err) => console.error('Failed to load fittings:', err));
  };

  const loadDependencies = () => {
    // Bookings
    apiClient.get('/bookings').then((res) => {
      const list = res.data || [];
      setBookingsObjects(list);
      if (list.length > 0) setNewBookingId(list[0].id.toString());
    }).catch(() => {});

    // Employees (tailors)
    apiClient.get('/employees').then((res) => {
      const list = Array.isArray(res) ? res : res.data || [];
      setEmployeesList(list);
      if (list.length > 0) setNewTailorId(list[0].id.toString());
    }).catch(() => {});
  };

  useEffect(() => {
    fetchFittings();
    loadDependencies();
  }, []);

  const handleSelectFitting = (fitting) => {
    setSelectedFitting(fitting);
  };

  const handleAlterationToggle = async (field) => {
    if (!selectedFitting) return;
    const updatedAlterations = {
      ...selectedFitting.alterations,
      [field]: !selectedFitting.alterations[field]
    };
    const updatedFitting = {
      ...selectedFitting,
      alterations: updatedAlterations
    };
    setSelectedFitting(updatedFitting);
    setFittingsList((prev) => prev.map((f) => f.id === selectedFitting.id ? updatedFitting : f));

    try {
      await apiClient.put(`/fittings/${selectedFitting.id}`, {
        alterations: updatedAlterations
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMeasurementChange = async (field, value) => {
    if (!selectedFitting) return;
    const updatedMeasurements = {
      ...selectedFitting.measurements,
      [field]: value
    };
    const updatedFitting = {
      ...selectedFitting,
      measurements: updatedMeasurements
    };
    setSelectedFitting(updatedFitting);
    setFittingsList((prev) => prev.map((f) => f.id === selectedFitting.id ? updatedFitting : f));

    try {
      await apiClient.put(`/fittings/${selectedFitting.id}`, {
        measurements: updatedMeasurements
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedFitting) return;
    try {
      await apiClient.put(`/fittings/${selectedFitting.id}`, {
        additional_notes: selectedFitting.additionalNotes
      });
      setAlertMessage({
        isOpen: true,
        title: 'حفظ الملاحظات والبيانات',
        message: 'تم حفظ الملاحظات والبيانات بالكامل في قاعدة البيانات بنجاح!',
        type: 'success'
      });
    } catch (e) {
      console.error(e);
      setAlertMessage({
        isOpen: true,
        title: 'خطأ في الحفظ',
        message: 'حدث خطأ أثناء محاولة حفظ البيانات.',
        type: 'error'
      });
    }
  };

  const handleDeleteFitting = async () => {
    if (!deleteConfirm) return;
    try {
      await apiClient.delete(`/fittings/${deleteConfirm.id}`);
      fetchFittings();
    } catch (e) {
      console.error(e);
    }
    setDeleteConfirm(null);
  };

  const handleNewFittingSubmit = async (e) => {
    e.preventDefault();
    if (!newBookingId) return;

    try {
      await apiClient.post('/fittings', {
        booking_id: parseInt(newBookingId),
        fitting_date: newDate,
        fitting_time: newTime,
        type: newType,
        measurements: newMeasurements,
        alterations: newAlterations,
        sales_associate: newSalesperson,
        alterations_notes: newSalesNotes,
        additional_notes: 'تضييق وتثبيت الأكتاف وتطريز إضافي بملاحظات العروسة.',
        tailor_id: newTailorId ? parseInt(newTailorId) : null,
        status: 'scheduled'
      });
      fetchFittings();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to schedule fitting:', err);
    }
  };

  const handleBookFittingDress = async (bookingId, newDressId) => {
    try {
      await apiClient.put(`/bookings/${bookingId}`, {
        dress_id: newDressId
      });
      fetchFittings();
      setAlertMessage({
        isOpen: true,
        title: 'تأكيد الحجز',
        message: 'تم تأكيد وحجز هذا الفستان للعروس بنجاح.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      setAlertMessage({
        isOpen: true,
        title: 'فشل حجز الفستان',
        message: err?.message || 'تعذر حجز هذا الفستان. ربما يكون غير متاح في تاريخ المناسبة.',
        type: 'error'
      });
    }
  };

  const resetForm = () => {
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewTime('05:00 م');
    setNewSalesNotes('');
    setNewMeasurements({ ...defaultMeasurements });
    setNewAlterations({ ...defaultAlterations });
  };

  const handlePrintCard = () => {
    if (!selectedFitting) return;

    const activeAlterations = Object.keys(selectedFitting.alterations).
    filter((key) => selectedFitting.alterations[key]).
    map((key) => alterationLabels[key]);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>كارت بروفة - ${selectedFitting.client}</title>
          <style>
            body { font-family: 'Arial', sans-serif; direction: rtl; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 5px 0; font-size: 20px; }
            .info-table, .measurements-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td, .measurements-table td, .measurements-table th { border: 1px solid #ddd; padding: 8px; text-align: right; }
            .section-title { font-weight: bold; margin-top: 15px; border-bottom: 1px solid #333; padding-bottom: 5px; }
            .notes { background: #f9f9f9; padding: 10px; border: 1px dashed #ccc; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>فساتين صوفيا - كارت خياطة ومقاسات</h1>
            <p>نوع البروفة: ${selectedFitting.type}</p>
          </div>

          <table class="info-table">
            <tr>
              <td><strong>العميلة:</strong> ${selectedFitting.client}</td>
              <td><strong>الفستان المختار:</strong> ${selectedFitting.dress}</td>
            </tr>
            <tr>
              <td><strong>تاريخ الموعد:</strong> ${formatFittingDate(selectedFitting.date)}</td>
              <td><strong>الخياط المسؤول:</strong> ${selectedFitting.tailor}</td>
            </tr>
          </table>

          <div class="section-title">جدول المقاسات الفعلي</div>
          <table class="measurements-table">
            <tr>
              <td>الصدر: ${selectedFitting.measurements.chest} سم</td>
              <td>الوسط: ${selectedFitting.measurements.waist} سم</td>
              <td>الأرداف: ${selectedFitting.measurements.hips} سم</td>
            </tr>
            <tr>
              <td>الكتف: ${selectedFitting.measurements.shoulder} سم</td>
              <td>طول الصدر: ${selectedFitting.measurements.chestLength}</td>
              <td>طول الظهر: ${selectedFitting.measurements.backLength}</td>
            </tr>
            <tr>
              <td>طول الكم: ${selectedFitting.measurements.sleeveLength}</td>
              <td>محيط الذراع: ${selectedFitting.measurements.armCircumference}</td>
              <td>الطول الكلي: ${selectedFitting.measurements.height}</td>
            </tr>
            <tr>
              <td>طول الذيل: ${selectedFitting.measurements.trainLength}</td>
              <td>ارتفاع الكعب: ${selectedFitting.measurements.heelHeight}</td>
              <td>الوزن التقريبي: ${selectedFitting.measurements.weight} كجم</td>
            </tr>
          </table>

          <div class="section-title">التعديلات المطلوبة للبدء فوراً</div>
          <ul>
            ${activeAlterations.map((alt) => `<li><strong>${alt}</strong></li>`).join('')}
          </ul>

          <div class="section-title">ملاحظات إضافية وتوجيهات الخياطة</div>
          <div class="notes">
            ${selectedFitting.additionalNotes || 'لا توجد ملاحظات إضافية.'}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="h-full p-6 md:p-8 space-y-4 bg-slate-50/30 text-right overflow-hidden flex flex-col" dir="rtl">
      
      {/* Page Title & Selection Sidebar wrapper */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
        
        {/* Sidebar: Fittings List (NARROWER w-64) */}
        <div className="w-full lg:w-64 bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col space-y-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-800">قائمة البروفات المجدولة</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors cursor-pointer">
              
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto flex-grow scrollbar-thin">
            {fittingsList.map((f) => {
              const isSelected = selectedFitting?.id === f.id;
              const s = statusStyles[f.status] || statusStyles['مجدول'];
              return (
                <div
                  key={f.id}
                  onClick={() => handleSelectFitting(f)}
                  className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  isSelected ?
                  'border-indigo-600 bg-indigo-50/30 shadow-sm' :
                  'border-slate-50 hover:border-slate-150 bg-white hover:shadow-xs'}`
                  }>
                  
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-black text-slate-800">{f.client}</span>
                    <span className={`text-[7.5px] font-extrabold px-1.5 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                      {f.status}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-semibold mb-1 truncate">{f.dress}</div>
                  <div className="flex items-center justify-between text-[8.5px] text-slate-400 font-bold">
                    <span className="flex items-center gap-1 font-mono">
                      <CalendarIcon size={9} />
                      {formatFittingDate(f.date)}
                    </span>
                  </div>
                </div>);

            })}
          </div>
        </div>

        {/* Detail Panel Area (WIDER) */}
        {selectedFitting ?
        <div className="flex-1 flex flex-col space-y-4 overflow-y-auto pr-1">
            
            {/* Header detail controls */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-3 flex-grow">
                <div className="p-2.5 bg-violet-50 text-violet-600 rounded-2xl border border-violet-100">
                  <Ruler size={18} />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold text-slate-800">
                    {selectedFitting.type} - للعروسة: <span className="text-indigo-650 font-black">{selectedFitting.client}</span> | الفستان: <span className="text-indigo-650 font-black">{selectedFitting.dress}</span>
                  </h1>
                  <p className="text-[10px] text-slate-450 font-bold mt-0.5">موعد البروفة: {formatFittingDate(selectedFitting.date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                onClick={() => setDeleteConfirm({ isOpen: true, id: selectedFitting.id, title: selectedFitting.client })}
                className="p-2 bg-rose-50 text-rose-550 border border-rose-100 hover:bg-rose-100 rounded-xl transition-all cursor-pointer"
                title="حذف">
                
                  <Trash2 size={14} />
                </button>

                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${statusStyles[selectedFitting.status]?.bg} ${statusStyles[selectedFitting.status]?.text}`}>
                  {selectedFitting.status}
                </span>
              </div>
            </div>

            {/* Grid Sections - No inner scrollbars inside tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
              
              {/* Left Column: Alteration Notes & status */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-5">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2 mb-4">
                    <Scissors size={14} className="text-indigo-600" />
                    <span>ملاحظات التعديل والصيانة</span>
                  </h3>

                  <div className="space-y-1.5">
                    {Object.keys(selectedFitting.alterations).map((field) =>
                  <label
                    key={field}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                    
                        <span className="text-xs font-bold text-slate-700">{alterationLabels[field]}</span>
                        <input
                      type="checkbox"
                      checked={selectedFitting.alterations[field]}
                      onChange={() => handleAlterationToggle(field)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded-sm focus:ring-indigo-500/20" />
                    
                      </label>
                  )}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <h4 className="text-[11px] font-extrabold text-slate-800">ملاحظات إضافية وتفصيلية</h4>
                  <textarea
                  value={selectedFitting.additionalNotes}
                  onChange={(e) => {
                    const updated = { ...selectedFitting, additionalNotes: e.target.value };
                    setSelectedFitting(updated);
                  }}
                  onBlur={handleSaveNotes}
                  placeholder="اكتب تفاصيل الصيانة والتطريز الإضافي..."
                  className="w-full min-h-[80px] p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="text-[11px] font-extrabold text-slate-800 block">حالة البروفة الحالية</label>
                  <select
                  value={selectedFitting.status}
                  onChange={async (e) => {
                    const val = e.target.value;
                    const updated = { ...selectedFitting, status: val };
                    setSelectedFitting(updated);
                    try {
                      await apiClient.put(`/fittings/${selectedFitting.id}`, {
                        status: val === 'تم التنفيذ' ? 'completed' : val === 'ملغى' ? 'rescheduled' : 'scheduled'
                      });
                      fetchFittings();
                    } catch (err) {}
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                  
                    <option value="مجدول">مجدول</option>
                    <option value="تم التنفيذ">تم التنفيذ (مكتمل)</option>
                    <option value="ملغى">ملغى</option>
                  </select>
                </div>
              </div>

              {/* Middle Column: Measurements list (NO Inner Scrollbar) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-5">
                <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2 mb-2">
                  <Ruler size={14} className="text-indigo-600" />
                  <span>جدول المقاسات للعروسة</span>
                </h3>

                <div className="space-y-2">
                  {[
                { label: 'الصدر', field: 'chest', unit: 'سم' },
                { label: 'الوسط', field: 'waist', unit: 'سم' },
                { label: 'الأرداف', field: 'hips', unit: 'سم' },
                { label: 'الكتف', field: 'shoulder', unit: 'سم' },
                { label: 'طول الصدر', field: 'chestLength', unit: 'سم' },
                { label: 'طول الظهر', field: 'backLength', unit: 'سم' },
                { label: 'طول الكم', field: 'sleeveLength', unit: 'سم' },
                { label: 'محيط الذراع', field: 'armCircumference', unit: 'سم' },
                { label: 'الطول (الكتف للأرض)', field: 'height', unit: 'سم' },
                { label: 'طول الذيل', field: 'trainLength', unit: 'سم' },
                { label: 'ارتفاع الكعب المتوقع', field: 'heelHeight', unit: 'سم' },
                { label: 'الوزن التقريبي', field: 'weight', unit: 'كجم' }].
                map((item) =>
                <div key={item.field} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                      <span className="text-xs text-slate-500 font-bold">{item.label}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                      type="text"
                      value={selectedFitting.measurements[item.field]}
                      onChange={(e) => handleMeasurementChange(item.field, e.target.value)}
                      className="w-16 px-2 py-1 text-center bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white" />
                    
                        <span className="text-[10px] text-slate-400 font-extrabold">{item.unit}</span>
                      </div>
                    </div>
                )}
                </div>

                <div className="text-[10px] text-slate-400 font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 flex items-start gap-1.5">
                  <Info size={12} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span>تحديث وحفظ التعديلات في الجدول مباشر وتلقائي.</span>
                </div>
              </div>

              {/* Right Column: Fitting metadata, Sales notes & photos */}
              <div className="space-y-6">
                {/* Fitting Data Info */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800">بيانات البروفة وتعيين الأدوار</h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold py-1 border-b border-slate-50">
                      <span className="text-slate-400">تاريخ البروفة</span>
                      <span className="text-slate-700 font-bold font-mono">{formatFittingDate(selectedFitting.date)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold py-1 border-b border-slate-50">
                      <span className="text-slate-400">السيلز المسؤولة</span>
                      <span className="text-slate-700 font-bold">{selectedFitting.salesperson}</span>
                    </div>
                    
                    {/* Worker Selector Dropdown from Employees table */}
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-50">
                      <label className="text-slate-400 font-extrabold text-[10px]">الترزي / الخياط المسؤول عن الصيانة</label>
                      <select
                      value={selectedFitting.tailor_id || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        const empId = val ? parseInt(val) : null;
                        const updated = { ...selectedFitting, tailor_id: empId };
                        setSelectedFitting(updated);
                        try {
                          await apiClient.put(`/fittings/${selectedFitting.id}`, {
                            tailor_id: empId
                          });
                          fetchFittings();
                        } catch (err) {}
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-750">
                      
                        <option value="">خياطة رئيسية</option>
                        {employeesList.map((emp) =>
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.position || 'ترزي'})</option>
                      )}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2 pt-3 mt-1.5 border-t border-slate-50">
                      <span className="text-slate-400 font-extrabold text-[10px] mb-1">الفساتين المتاحة للعروسة (تأكيد حجز خيار واحد فقط):</span>
                      
                      {/* Gown Option 1 */}
                      <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                    selectedFitting.dress_id === selectedFitting.booking?.dress_id ?
                    'border-emerald-500 bg-emerald-50/30' :
                    'border-slate-100 bg-slate-50'}`
                    }>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">1. {selectedFitting.dress || 'فستان غير محدد'}</span>
                          <span className="text-[8px] font-bold text-slate-400">(الرئيسي)</span>
                        </div>
                        {selectedFitting.booking_id && selectedFitting.dress_id &&
                      <button
                        type="button"
                        onClick={() => handleBookFittingDress(selectedFitting.booking_id, selectedFitting.dress_id)}
                        disabled={selectedFitting.dress_id === selectedFitting.booking?.dress_id}
                        className={`w-full py-1.5 rounded-lg text-[9px] font-extrabold transition-all text-center ${
                        selectedFitting.dress_id === selectedFitting.booking?.dress_id ?
                        'bg-emerald-600 text-white cursor-default' :
                        'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'}`
                        }>
                        
                            {selectedFitting.dress_id === selectedFitting.booking?.dress_id ? '✓ الفستان المؤكد حالياً' : 'تأكيد وحجز هذا الفستان'}
                          </button>
                      }
                      </div>

                      {/* Gown Option 2 */}
                      {selectedFitting.dress_2_name &&
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                    selectedFitting.dress_2_id === selectedFitting.booking?.dress_id ?
                    'border-emerald-500 bg-emerald-50/30' :
                    'border-slate-100 bg-slate-50'}`
                    }>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700">2. {selectedFitting.dress_2_name}</span>
                            <span className="text-[8px] font-bold text-slate-400">(خيار ثانٍ)</span>
                          </div>
                          {selectedFitting.booking_id && selectedFitting.dress_2_id &&
                      <button
                        type="button"
                        onClick={() => handleBookFittingDress(selectedFitting.booking_id, selectedFitting.dress_2_id)}
                        disabled={selectedFitting.dress_2_id === selectedFitting.booking?.dress_id}
                        className={`w-full py-1.5 rounded-lg text-[9px] font-extrabold transition-all text-center ${
                        selectedFitting.dress_2_id === selectedFitting.booking?.dress_id ?
                        'bg-emerald-600 text-white cursor-default' :
                        'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'}`
                        }>
                        
                              {selectedFitting.dress_2_id === selectedFitting.booking?.dress_id ? '✓ الفستان المؤكد حالياً' : 'تأكيد وحجز هذا الفستان'}
                            </button>
                      }
                        </div>
                    }

                      {/* Gown Option 3 */}
                      {selectedFitting.dress_3_name &&
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                    selectedFitting.dress_3_id === selectedFitting.booking?.dress_id ?
                    'border-emerald-500 bg-emerald-50/30' :
                    'border-slate-100 bg-slate-50'}`
                    }>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700">3. {selectedFitting.dress_3_name}</span>
                            <span className="text-[8px] font-bold text-slate-400">(خيار ثالث)</span>
                          </div>
                          {selectedFitting.booking_id && selectedFitting.dress_3_id &&
                      <button
                        type="button"
                        onClick={() => handleBookFittingDress(selectedFitting.booking_id, selectedFitting.dress_3_id)}
                        disabled={selectedFitting.dress_3_id === selectedFitting.booking?.dress_id}
                        className={`w-full py-1.5 rounded-lg text-[9px] font-extrabold transition-all text-center ${
                        selectedFitting.dress_3_id === selectedFitting.booking?.dress_id ?
                        'bg-emerald-600 text-white cursor-default' :
                        'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'}`
                        }>
                        
                              {selectedFitting.dress_3_id === selectedFitting.booking?.dress_id ? '✓ الفستان المؤكد حالياً' : 'تأكيد وحجز هذا الفستان'}
                            </button>
                      }
                        </div>
                    }
                    </div>
                  </div>
                </div>

                {/* Salesperson directives */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800">توجيهات السيلز وملاحظات المبيعات</h4>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/50 text-xs font-semibold text-slate-650 leading-relaxed min-h-[50px]">
                    {selectedFitting.salesNotes || 'لا توجد توجيهات مبيعات حالياً.'}
                  </div>
                </div>

                {/* Print and Save buttons */}
                <div className="flex gap-3">
                  <button
                  onClick={handleSaveNotes}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold transition-all cursor-pointer shadow-sm shadow-indigo-600/10 active:scale-95">
                  
                    <Save size={14} />
                    <span>حفظ الملاحظات</span>
                  </button>
                  <button
                  onClick={handlePrintCard}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-extrabold transition-all cursor-pointer active:scale-95">
                  
                    <Printer size={14} />
                    <span>طباعة كارت العمل</span>
                  </button>
                </div>
              </div>

            </div>

          </div> :

        <div className="flex-1 bg-white rounded-3xl border border-slate-100 flex items-center justify-center p-10 text-slate-350 font-bold text-xs">
            لا توجد بروفات مجدولة مسجلة في قاعدة البيانات حالياً.
          </div>
        }
      </div>

      {/* Add Fitting Modal */}
      {isModalOpen &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">جدولة موعد بروفة جديدة</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleNewFittingSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              {/* Booking Selection */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اختر حجز العروسة وفستانها المختار</label>
                <select
                value={newBookingId}
                onChange={(e) => setNewBookingId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                
                  {bookingsObjects.map((b) =>
                <option key={b.id} value={b.id}>{b.client?.name} - {b.dress?.name} (حجز #{b.id})</option>
                )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ البروفة</label>
                  <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">الوقت</label>
                  <input
                  type="text"
                  required
                  placeholder="مثال: 05:00 م"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Worker selection */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">الترزي المسؤول</label>
                  <select
                  value={newTailorId}
                  onChange={(e) => setNewTailorId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                  
                    {employeesList.map((emp) =>
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                  )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">نوع البروفة</label>
                  <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                  
                    <option value="بروفة أولى">بروفة أولى</option>
                    <option value="بروفة ثانية">بروفة ثانية</option>
                    <option value="بروفة نهائية">بروفة نهائية</option>
                    <option value="تعديل">تعديل</option>
                    <option value="قياس">قياس</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">السيلز المسؤولة</label>
                  <input
                  type="text"
                  required
                  value={newSalesperson}
                  onChange={(e) => setNewSalesperson(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">ملاحظات مسؤولة المبيعات</label>
                  <input
                  type="text"
                  placeholder="مثال: الصدر مشدود..."
                  value={newSalesNotes}
                  onChange={(e) => setNewSalesNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  جدولة الموعد
                </button>
                <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Delete Confirmation Modal */}
      {deleteConfirm &&
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-xl space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 size={20} className="animate-pulse" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 text-center">حذف موعد البروفة</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed text-center">
              هل أنتِ متأكدة من رغبتكِ في حذف موعد بروفة العميلة "{deleteConfirm.title}" نهائياً من قاعدة البيانات؟
            </p>
            <div className="flex items-center gap-3">
              <button
              onClick={handleDeleteFitting}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95">
              
                تأكيد الحذف
              </button>
              <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer">
              
                إلغاء
              </button>
            </div>
          </div>
        </div>
      }
      {/* Custom Alert Message Modal */}
      {alertMessage && alertMessage.isOpen &&
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4 text-center transform scale-100 transition-all duration-300">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${
          alertMessage.type === 'success' ?
          'bg-emerald-50 text-emerald-500 border-emerald-100' :
          'bg-rose-50 text-rose-500 border-rose-100'}`
          }>
              {alertMessage.type === 'success' ?
            <Check size={22} className="animate-bounce" /> :

            <AlertCircle size={22} className="animate-pulse" />
            }
            </div>
            <h3 className="text-sm font-extrabold text-slate-800">{alertMessage.title}</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed">{alertMessage.message}</p>
            <div className="pt-2">
              <button
              onClick={() => setAlertMessage(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95 text-center">
              
                موافق
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}