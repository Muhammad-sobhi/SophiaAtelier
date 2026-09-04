import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, Save, Undo2, RotateCcw, Calendar, Heart, Ruler, FileText, CreditCard } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export function BookingFinancesModal({ isOpen, onClose, client, booking, onUpdate }) {
  const [activeTab, setActiveTab] = useState(booking ? 'finances' : 'visits');
  const [isLoading, setIsLoading] = useState(false);
  const [dresses, setDresses] = useState([]);

  // Finances Tab State
  const [isEditingId, setIsEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Booking Tab State
  const [bookingForm, setBookingForm] = useState(null);

  // Visits & Fittings Tab State
  const [visitForm, setVisitForm] = useState(null);
  const [fittingForm, setFittingForm] = useState(null);

  useEffect(() => {
    if (isOpen) {
      apiClient.get('/dresses?per_page=1000').then(res => setDresses(res.data || res.dresses || []));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && client) {
      // Initialize Booking Form
      if (booking) {
        setBookingForm({
          dress_id: booking.dress_id || '',
          dress_2_id: booking.dress_2_id || '',
          event_date: booking.event_date ? String(booking.event_date).substring(0, 10) : '',
          total_amount: booking.total_amount || 0,
          deposit_amount: booking.deposit_amount || 0,
          insurance_amount: booking.insurance_amount || 0,
          notes: booking.notes || ''
        });
        setActiveTab('finances');
      } else {
        setActiveTab('visits');
      }

      // Initialize Visit Form (latest visit)
      const latestVisit = client?.visits?.length > 0 ? client.visits[0] : null;
      if (latestVisit) {
        setVisitForm({
          id: latestVisit.id,
          visit_date: latestVisit.visit_date ? String(latestVisit.visit_date).substring(0, 10) : '',
          time_slot: latestVisit.time_slot || '',
          notes: latestVisit.notes || ''
        });
      }

      // Initialize Fitting Form (latest fitting)
      const latestFitting = client?.fittings?.length > 0 ? client.fittings[0] : null;
      if (latestFitting) {
        setFittingForm({
          id: latestFitting.id,
          fitting_date: latestFitting.fitting_date ? String(latestFitting.fitting_date).substring(0, 10) : '',
          alterations_notes: latestFitting.alterations_notes || '',
          additional_notes: latestFitting.additional_notes || ''
        });
      }
    }
  }, [isOpen, client?.id]);

  if (!isOpen || !client) return null;

  // --- Finances Actions ---
  const handleEditClick = (rev) => {
    setIsEditingId(rev.id);
    setEditForm({
      amount: rev.amount,
      payment_method: rev.payment_method || 'cash',
      payment_date: rev.payment_date ? String(rev.payment_date).substring(0, 10) : '',
      notes: rev.notes || ''
    });
  };

  const handleSaveEdit = async (revId) => {
    try {
      setIsLoading(true);
      await apiClient.put(`/revenues/${revId}`, editForm);
      alert('تم تحديث المعاملة المالية');
      setIsEditingId(null);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('فشل تحديث المعاملة المالية');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (revId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المعاملة؟')) return;
    try {
      setIsLoading(true);
      await apiClient.delete(`/revenues/${revId}`);
      alert('تم الحذف');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('فشل الحذف');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertStage = async () => {
    if (!booking) return;
    const statusMap = {
      'returned': { label: 'مستلم', value: 'picked_up' },
      'picked_up': { label: 'مؤكد', value: 'confirmed' },
      'confirmed': { label: 'قيد الانتظار', value: 'pending' },
    };

    const target = statusMap[booking.status];
    if (!target) {
      alert('لا يمكن التراجع عن هذه الحالة');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من التراجع إلى (${target.label})؟`)) return;

    try {
      setIsLoading(true);
      await apiClient.put(`/bookings/${booking.id}/revert-stage`, { status: target.value });
      alert('تم استرجاع الحالة');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err?.response?.data?.message || 'فشل الاسترجاع');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Booking Update ---
  const handleSaveBooking = async () => {
    try {
      setIsLoading(true);
      await apiClient.put(`/bookings/${booking.id}`, {
        ...bookingForm,
        is_override: true, // Force override conflicts if any
      });
      alert('تم تحديث بيانات الحجز بنجاح. الرجاء مراجعة السجل المالي للتأكد من مطابقة المبالغ المدفوعة.');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err?.response?.data?.message || 'فشل تحديث بيانات الحجز');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Visit/Fitting Update ---
  const handleSaveVisit = async () => {
    try {
      setIsLoading(true);
      await apiClient.put(`/visits/${visitForm.id}`, {
        visit_date: visitForm.visit_date,
        time_slot: visitForm.time_slot,
        notes: visitForm.notes
      });
      alert('تم تحديث بيانات الزيارة');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('فشل تحديث الزيارة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFitting = async () => {
    try {
      setIsLoading(true);
      await apiClient.put(`/fittings/${fittingForm.id}`, fittingForm);
      alert('تم تحديث بيانات البروفة');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('فشل تحديث البروفة');
    } finally {
      setIsLoading(false);
    }
  };

  // Helpers
  const translateType = (type) => ({ deposit: 'عربون', balance: 'باقي الحساب', fitting_fee: 'رسوم بروفة', insurance: 'تأمين الفستان', other: 'أخرى' }[type] || type);
  const translateMethod = (method) => ({ cash: 'كاش', vodafone_cash: 'فودافون كاش', instapay: 'انستاباي', card: 'بطاقة' }[method] || method);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" dir="rtl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">سجل وتعديل بيانات العروس: {client.name}</h3>
            <p className="text-sm text-gray-500 mt-1">تعديل المراحل، الحجوزات، والسجل المالي</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 mt-2">
          {booking && (
            <button
              onClick={() => setActiveTab('finances')}
              className={`pb-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'finances' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <CreditCard className="w-4 h-4" />
              السجل المالي للحجز
            </button>
          )}
          {booking && (
            <button
              onClick={() => setActiveTab('booking')}
              className={`pb-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'booking' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Heart className="w-4 h-4" />
              بيانات الحجز (الأسعار والفستان)
            </button>
          )}
          {(visitForm || fittingForm) && (
            <button
              onClick={() => setActiveTab('visits')}
              className={`pb-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'visits' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Calendar className="w-4 h-4" />
              تعديل الزيارات والبروفات
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          
          {/* TAB: FINANCES */}
          {activeTab === 'finances' && booking && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4">
                <div className="bg-amber-100 text-amber-600 p-2 rounded-lg shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-900">حالة الحجز الحالية: {
                    booking.status === 'returned' ? 'مرتجع (منتهي)' : 
                    booking.status === 'picked_up' ? 'مستلم خارج الأتيليه' :
                    booking.status === 'confirmed' ? 'مؤكد' : booking.status
                  }</h4>
                  <p className="text-sm text-amber-700 mt-1 mb-3">
                    للتراجع عن الحالة خطوة للوراء، اضغط الزر أدناه. لتعديل المبالغ المدفوعة، استخدم الجدول.
                  </p>
                  <button 
                    onClick={handleRevertStage}
                    disabled={isLoading || ['pending', 'cancelled'].includes(booking.status)}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Undo2 className="w-4 h-4" />
                    تراجع عن الحالة لخطوة سابقة
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">التاريخ</th>
                      <th className="py-3 px-4">النوع</th>
                      <th className="py-3 px-4">المبلغ</th>
                      <th className="py-3 px-4">وسيلة الدفع</th>
                      <th className="py-3 px-4">ملاحظات</th>
                      <th className="py-3 px-4 w-24">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(!booking.revenues || booking.revenues.length === 0) && (
                      <tr><td colSpan="6" className="py-8 text-center text-gray-500">لا توجد معاملات مسجلة</td></tr>
                    )}
                    {booking.revenues?.map(rev => (
                      <tr key={rev.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          {isEditingId === rev.id ? (
                            <input type="date" className="w-full p-2 border rounded-lg" value={editForm.payment_date} onChange={e => setEditForm({...editForm, payment_date: e.target.value})} />
                          ) : rev.payment_date ? String(rev.payment_date).substring(0, 10) : ''}
                        </td>
                        <td className="py-3 px-4"><span className="inline-flex px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs">{translateType(rev.type)}</span></td>
                        <td className="py-3 px-4">
                          {isEditingId === rev.id ? (
                            <input type="number" className="w-full p-2 border rounded-lg" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} />
                          ) : <span className={`font-semibold ${parseFloat(rev.amount) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{parseFloat(rev.amount)} ج.م</span>}
                        </td>
                        <td className="py-3 px-4">
                          {isEditingId === rev.id ? (
                            <select className="w-full p-2 border rounded-lg" value={editForm.payment_method} onChange={e => setEditForm({...editForm, payment_method: e.target.value})}>
                              <option value="cash">كاش</option><option value="vodafone_cash">فودافون كاش</option><option value="instapay">انستاباي</option><option value="card">بطاقة</option>
                            </select>
                          ) : translateMethod(rev.payment_method)}
                        </td>
                        <td className="py-3 px-4">{isEditingId === rev.id ? <input type="text" className="w-full p-2 border rounded-lg" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} /> : rev.notes}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {isEditingId === rev.id ? (
                              <><button onClick={() => handleSaveEdit(rev.id)} disabled={isLoading} className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"><Save className="w-4 h-4"/></button>
                              <button onClick={() => setIsEditingId(null)} className="p-1.5 text-gray-500 bg-gray-100 rounded-lg"><X className="w-4 h-4"/></button></>
                            ) : (
                              <><button onClick={() => handleEditClick(rev)} className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"><Edit className="w-4 h-4"/></button>
                              <button onClick={() => handleDelete(rev.id)} disabled={isLoading} className="p-1.5 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100"><Trash2 className="w-4 h-4"/></button></>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: BOOKING DATA */}
          {activeTab === 'booking' && bookingForm && (
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ المناسبة</label>
                  <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg" value={bookingForm.event_date} onChange={e => setBookingForm({...bookingForm, event_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الفستان الأساسي</label>
                  <select className="w-full p-2.5 border border-gray-300 rounded-lg" value={bookingForm.dress_id} onChange={e => setBookingForm({...bookingForm, dress_id: e.target.value})}>
                    <option value="">-- اختر الفستان --</option>
                    {dresses.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">إجمالي مبلغ الإيجار (المطلوب)</label>
                  <input type="number" className="w-full p-2.5 border border-gray-300 rounded-lg" value={bookingForm.total_amount} onChange={e => setBookingForm({...bookingForm, total_amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ التأمين المطلوب</label>
                  <input type="number" className="w-full p-2.5 border border-gray-300 rounded-lg" value={bookingForm.insurance_amount} onChange={e => setBookingForm({...bookingForm, insurance_amount: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات الحجز</label>
                  <textarea className="w-full p-2.5 border border-gray-300 rounded-lg" rows="2" value={bookingForm.notes} onChange={e => setBookingForm({...bookingForm, notes: e.target.value})}></textarea>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={handleSaveBooking} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  حفظ تعديلات الحجز
                </button>
              </div>
            </div>
          )}

          {/* TAB: VISITS & FITTINGS */}
          {activeTab === 'visits' && (
            <div className="space-y-6">
              {visitForm && (
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /> تعديل بيانات الزيارة</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الزيارة</label>
                      <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg" value={visitForm.visit_date} onChange={e => setVisitForm({...visitForm, visit_date: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">وقت الزيارة</label>
                      <input type="time" className="w-full p-2.5 border border-gray-300 rounded-lg" value={visitForm.time_slot} onChange={e => setVisitForm({...visitForm, time_slot: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات الزيارة</label>
                      <textarea className="w-full p-2.5 border border-gray-300 rounded-lg" rows="2" value={visitForm.notes} onChange={e => setVisitForm({...visitForm, notes: e.target.value})}></textarea>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={handleSaveVisit} disabled={isLoading} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium">حفظ الزيارة</button>
                  </div>
                </div>
              )}

              {fittingForm && (
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2"><Ruler className="w-5 h-5 text-purple-600" /> تعديل بيانات البروفة</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البروفة</label>
                      <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg" value={fittingForm.fitting_date} onChange={e => setFittingForm({...fittingForm, fitting_date: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">تعديلات الفستان المطلوبة (Alterations)</label>
                      <textarea className="w-full p-2.5 border border-gray-300 rounded-lg" rows="2" value={fittingForm.alterations_notes} onChange={e => setFittingForm({...fittingForm, alterations_notes: e.target.value})}></textarea>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات إضافية للبروفة</label>
                      <textarea className="w-full p-2.5 border border-gray-300 rounded-lg" rows="2" value={fittingForm.additional_notes} onChange={e => setFittingForm({...fittingForm, additional_notes: e.target.value})}></textarea>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={handleSaveFitting} disabled={isLoading} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium">حفظ البروفة</button>
                  </div>
                </div>
              )}
              
              {!visitForm && !fittingForm && (
                <div className="text-center py-8 text-gray-500">لا يوجد بيانات زيارات أو بروفات مسجلة لهذه العروس.</div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
