import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Plus, Trash2, Edit3, X } from 'lucide-react';














const initialTasks = [
{
  id: 1,
  task: 'تأكيد موعد قياس سارة أحمد',
  type: 'تجهيز',
  assignee: 'سارة',
  status: 'جاري',
  due: '2026-07-14',
  bride: 'سارة أحمد',
  priority: 'عالي',
  details: 'التواصل هاتفياً لتأكيد حضور القياس الأول المقرر في 15 أغسطس والتأكد من توافر التعديلات المطلوبة في الأتيليه.'
},
{
  id: 2,
  task: 'تعديل فستان المطرز - وسط',
  type: 'تعديل',
  assignee: 'فاطمة',
  status: 'جاري',
  due: '2026-07-15',
  bride: 'منة سامي',
  priority: 'جاري',
  details: 'تضييق الصدر والخصر لملائمة فستان العروس الجديد وتثبيت الكورسيه الخلفي.'
},
{
  id: 3,
  task: 'تنظيف فستان الطرحة الطويل',
  type: 'تنظيف',
  assignee: 'نورة',
  status: 'معلق',
  due: '2026-07-13',
  bride: 'مريم خالد',
  priority: 'منخفض',
  details: 'إرسال الفستان للمغسلة والقيام بالتنظيف الجاف والتعقيم بالكامل.'
},
{
  id: 4,
  task: 'صيانة سحاب فستان الناعم وردي',
  type: 'صيانة',
  assignee: 'خديجة',
  status: 'متأخر',
  due: '2026-07-10',
  bride: 'نورة محمد',
  priority: 'عالي',
  details: 'تغيير السحاب بالكامل ومراجعة كفاءة الشد على المانيكان.'
},
{
  id: 5,
  task: 'متابعة عميلة مريم خالد',
  type: 'متابعة',
  assignee: 'سارة',
  status: 'جاري',
  due: '2026-07-16',
  bride: 'مريم خالد',
  priority: 'منخفض',
  details: 'التواصل وتأكيد موعد الزيارة لمناقشة القياسات وكتالوج فساتين سهرة 2026.'
},
{
  id: 6,
  task: 'تجهيز فستان السهرة للحجز',
  type: 'تجهيز',
  assignee: 'فاطمة',
  status: 'معلق',
  due: '2026-07-17',
  bride: 'فاطمة العلي',
  priority: 'عالي',
  details: 'كي الفستان بالبخار والتحقق من الملحقات المرفقة قبل التسليم.'
},
{
  id: 7,
  task: 'تنظيف فستان الزفاف الأبيض',
  type: 'تنظيف',
  assignee: 'نورة',
  status: 'جاري',
  due: '2026-07-18',
  bride: 'ندى علي',
  priority: 'عالي',
  details: 'تنظيف الذيل الطويل وإزالة البقع وتغليف الفستان بالكامل.'
}];


const statusStyles = {
  'جاري': { dot: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50' },
  'معلق': { dot: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' },
  'متأخر': { dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' },
  'مكتمل': { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-100' }
};

const typeStyles = {
  'تجهيز': { text: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100/50' },
  'تعديل': { text: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-100/50' },
  'تنظيف': { text: 'text-sky-600', bg: 'bg-sky-50/50', border: 'border-sky-100/50' },
  'صيانة': { text: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100/50' },
  'متابعة': { text: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100/50' }
};

const EMPLOYEES = ['سارة', 'فاطمة', 'نورة', 'خديجة', 'ليلى'];

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split('T')[0];
  } catch (e) {
    return dateStr;
  }
};

import { apiClient } from '@/lib/api-client';

export default function TasksPage() {
  const [tasksList, setTasksList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Edit Task States
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editType, setEditType] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editDetails, setEditDetails] = useState('');

  // Create Task States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newType, setNewType] = useState('تجهيز');
  const [newDue, setNewDue] = useState('');
  const [newPriority, setNewPriority] = useState('متوسط');
  const [newDetails, setNewDetails] = useState('');

  const fetchTasks = async () => {
    try {
      const response = await apiClient.get('/tasks');
      const data = response.data || [];
      const mapped = data.map((t) => ({
        id: t.id,
        task: t.title || t.task || '',
        type: t.type === 'alteration' ? 'تعديل' : t.type === 'cleaning' ? 'تنظيف' : t.type === 'maintenance' ? 'صيانة' : t.type === 'followup' ? 'متابعة' : 'تجهيز',
        assignee: t.assigned_to || '',
        status: t.status === 'completed' ? 'مكتمل' : t.status === 'in_progress' ? 'جاري' : 'معلق',
        due: formatDate(t.due_date),
        bride: t.booking?.client?.name || '-',
        details: t.description || '',
        priority: 'متوسط'
      }));
      setTasksList(mapped);
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    }
  };

  useEffect(() => {
    const active = localStorage.getItem('atelier_current_employee');
    if (active) {
      try {
        const emp = JSON.parse(active);
        setIsAdmin(emp.role === 'admin' || emp.email === 'admin@atelier.test');
      } catch (e) {}
    }

    fetchTasks();
  }, []);

  const handleEditTaskClick = (t) => {
    setEditingTask(t);
    setEditTaskName(t.task || '');
    setEditAssignee(t.assignee || '');
    setEditType(t.type || 'تجهيز وصيانة');
    setEditDue(t.due || '');
    setEditPriority(t.priority || 'متوسط');
    setEditDetails(t.details || '');
  };

  const handleEditTaskSubmit = async (e) => {
    e.preventDefault();
    if (!editingTask) return;

    const mappedType = editType === 'تعديل' ? 'alteration' : editType === 'تنظيف' ? 'cleaning' : editType === 'صيانة' ? 'maintenance' : editType === 'متابعة' ? 'followup' : 'preparation';
    const mappedStatus = editingTask.status === 'مكتمل' ? 'completed' : editingTask.status === 'جاري' ? 'in_progress' : 'pending';

    try {
      await apiClient.put(`/tasks/${editingTask.id}`, {
        title: editTaskName,
        assigned_to: editAssignee,
        type: mappedType,
        due_date: editDue || null,
        description: editDetails,
        status: mappedStatus
      });
      fetchTasks();
      setEditingTask(null);
    } catch (e) {
      console.error('Failed to update task:', e);
    }
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    const mappedType = newType === 'تعديل' ? 'alteration' : newType === 'تنظيف' ? 'cleaning' : newType === 'صيانة' ? 'maintenance' : newType === 'متابعة' ? 'followup' : 'preparation';
    try {
      await apiClient.post('/tasks', {
        title: newTaskName,
        assigned_to: newAssignee,
        type: mappedType,
        due_date: newDue || null,
        description: newDetails,
        status: 'pending'
      });
      fetchTasks();
      setShowCreateModal(false);
      // Reset fields
      setNewTaskName('');
      setNewAssignee('');
      setNewType('تجهيز');
      setNewDue('');
      setNewDetails('');
    } catch (e) {
      console.error('Failed to create task:', e);
    }
  };

  const toggleTaskStatus = async (id) => {
    const task = tasksList.find((t) => t.id === id);
    if (!task) return;
    const current = task.status || 'جاري';
    const nextStatus = current === 'مكتمل' ? 'pending' : 'completed';

    try {
      await apiClient.put(`/tasks/${id}`, {
        title: task.task,
        status: nextStatus
      });
      fetchTasks();
    } catch (e) {
      console.error('Failed to toggle task:', e);
    }
  };

  const handleUpdateAssignee = async (id, assignee) => {
    const task = tasksList.find((t) => t.id === id);
    if (!task) return;

    try {
      await apiClient.put(`/tasks/${id}`, {
        title: task.task,
        assigned_to: assignee
      });
      fetchTasks();
    } catch (e) {
      console.error('Failed to update assignee:', e);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    const task = tasksList.find((t) => t.id === id);
    if (!task) return;

    const mappedStatus = status === 'مكتمل' ? 'completed' : status === 'جاري' ? 'in_progress' : 'pending';

    try {
      await apiClient.put(`/tasks/${id}`, {
        title: task.task,
        status: mappedStatus
      });
      fetchTasks();
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const handleDeleteTask = (id) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'تأكيد حذف المهمة',
      message: 'هل أنتِ متأكدة من رغبتكِ في حذف هذه المهمة نهائياً من جدول العمل؟',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/tasks/${id}`);
          fetchTasks();
        } catch (e) {
          console.error('Failed to delete task:', e);
        }
      }
    });
  };

  const filteredTasks = tasksList.filter((t) => {
    const taskName = t ? t.task || '' : '';
    const assigneeName = t ? t.assignee || '' : '';
    const taskType = t ? t.type || '' : '';
    const query = searchQuery.toLowerCase();
    return taskName.toLowerCase().includes(query) ||
    assigneeName.toLowerCase().includes(query) ||
    taskType.toLowerCase().includes(query);
  });

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 space-y-6 animate-fade-in text-right" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <span>قائمة المهام والمتابعة اليومية</span>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">تحليل العمل</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-1">تتبع مهام الخياطة، التنظيف، والتحضير الفوري المتولدة من مواعيد البروفات والزيارات والمبيعات.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="بحث في المهام والمسؤولين..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-white border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700 shadow-sm" />
            
          </div>
          {isAdmin &&
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95 whitespace-nowrap">
            
              <Plus size={14} />
              <span>إضافة مهمة</span>
            </button>
          }
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-50 overflow-hidden pb-8">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100/70">
              <th className="px-6 py-4 text-xs font-extrabold text-slate-400 w-12"></th>
              <th className="px-6 py-4 text-xs font-extrabold text-slate-400">المهمة</th>
              <th className="px-6 py-4 text-xs font-extrabold text-slate-400">النوع</th>
              <th className="px-6 py-4 text-xs font-extrabold text-slate-400">المسؤول</th>
              <th className="px-6 py-4 text-xs font-extrabold text-slate-400">الحالة</th>
              <th className="px-6 py-4 text-xs font-extrabold text-slate-400">تاريخ الاستحقاق</th>
              <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-400">
                <SlidersHorizontal size={14} className="text-slate-400 inline-block" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ?
            <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-slate-400 font-bold">
                  لا توجد مهام مطابقة للبحث حالياً.
                </td>
              </tr> :

            filteredTasks.map((t) => {
              const normalizedStatus = t.status || 'جاري';
              const sc = statusStyles[normalizedStatus] || statusStyles['جاري'];
              return (
                <React.Fragment key={t.id}>
                    <tr
                    onMouseEnter={() => setHoveredRowId(t.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    className={`border-b border-slate-50 hover:bg-slate-50/50 transition-all duration-300 ${
                    hoveredRowId === t.id ? 'bg-indigo-50/10' : ''}`
                    }>
                    
                      <td className="px-6 py-4">
                        <input
                        type="checkbox"
                        checked={normalizedStatus === 'مكتمل'}
                        onChange={() => toggleTaskStatus(t.id)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500/20 cursor-pointer accent-indigo-600" />
                      
                      </td>
                      <td className={`px-6 py-4 text-xs font-bold ${normalizedStatus === 'مكتمل' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {t.task}
                      </td>
                      <td className="px-6 py-4 text-xs font-extrabold">
                        {(() => {
                        const style = typeStyles[t.type] || typeStyles['تجهيز'];
                        return (
                          <span className={`px-2 py-0.5 rounded-lg border text-[10px] ${style.bg} ${style.text} ${style.border}`}>
                              {t.type || 'تجهيز'}
                            </span>);

                      })()}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-semibold">
                        <select
                        value={t.assignee || ''}
                        onChange={(e) => handleUpdateAssignee(t.id, e.target.value)}
                        className="bg-transparent border-0 font-semibold text-xs focus:ring-0 focus:outline-none p-0 text-slate-700 hover:bg-slate-100/30 rounded text-right cursor-pointer">
                        
                          <option value="">غير محدد</option>
                          {EMPLOYEES.map((emp) =>
                        <option key={emp} value={emp}>{emp}</option>
                        )}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select
                        value={normalizedStatus}
                        onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                        className="bg-transparent border-0 font-bold text-xs focus:ring-0 focus:outline-none cursor-pointer p-0 text-slate-700"
                        style={{ color: sc.text.replace('text-', '') }}>
                        
                          <option value="جاري">جاري</option>
                          <option value="معلق">معلق</option>
                          <option value="متأخر">متأخر</option>
                          <option value="مكتمل">مكتمل</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-semibold">{t.due || '-'}</td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin &&
                        <button
                          type="button"
                          onClick={() => handleEditTaskClick(t)}
                          className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all cursor-pointer"
                          title="تعديل المهمة">
                          
                              <Edit3 size={12} />
                            </button>
                        }
                          <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline cursor-pointer">
                          
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Collapsible Details Row on Hover */}
                    {hoveredRowId === t.id &&
                  <tr
                    onMouseEnter={() => setHoveredRowId(t.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    className="bg-indigo-50/10 border-b border-slate-50 text-right animate-fade-in">
                    
                        <td colSpan={7} className="px-6 py-3 text-xs text-slate-600 font-semibold">
                          <div className="flex gap-6 items-center">
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold block">العميلة المرتبطة:</span>
                              <span className="text-slate-700 font-bold">{t.bride || t.client || '-'}</span>
                            </div>
                            <div className="border-r border-slate-200 h-6"></div>
                            <div className="flex-1">
                              <span className="text-[10px] text-slate-400 font-extrabold block">تفاصيل المهمة:</span>
                              <p className="text-slate-600 mt-0.5">{t.details || 'تعديل وتجهيز الفساتين ومتابعة متطلبات العميلة بالأوقات المحددة.'}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                  }
                  </React.Fragment>);

            })
            }
          </tbody>
        </table>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirm?.isOpen &&
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-right" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 size={20} className="animate-pulse" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 text-center">{deleteConfirm.title}</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed text-center whitespace-pre-line">{deleteConfirm.message}</p>
            <div className="flex items-center gap-3">
              <button
              onClick={() => {
                deleteConfirm.onConfirm();
                setDeleteConfirm(null);
              }}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-600/10 active:scale-95 animate-fade-in">
              
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

      {/* Edit Task Modal */}
      {editingTask &&
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4 text-right text-slate-700" dir="rtl">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">تعديل بيانات المهمة</h3>
              <button
              onClick={() => setEditingTask(null)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditTaskSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اسم المهمة</label>
                <input
                type="text"
                required
                placeholder="اسم المهمة..."
                value={editTaskName}
                onChange={(e) => setEditTaskName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">المسؤول عن المهمة</label>
                  <input
                  type="text"
                  required
                  placeholder="اسم المسؤول..."
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">نوع المهمة</label>
                  <input
                  type="text"
                  required
                  placeholder="مثال: تعديل، تنظيف، صيانة"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ الاستحقاق</label>
                  <input
                  type="text"
                  required
                  placeholder="مثال: 2026-07-15 أو 05:30 م"
                  value={editDue}
                  onChange={(e) => setEditDue(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">الأولوية</label>
                  <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                  
                    <option value="عالي">عالي</option>
                    <option value="متوسط">متوسط</option>
                    <option value="منخفض">منخفض</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">تفاصيل وتوجيهات إضافية</label>
                <textarea
                value={editDetails}
                onChange={(e) => setEditDetails(e.target.value)}
                placeholder="ملاحظات تفصيلية..."
                className="w-full min-h-[100px] p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center shadow-sm">
                
                  حفظ التعديلات
                </button>
                <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Create Task Modal */}
      {showCreateModal &&
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4 text-right text-slate-700" dir="rtl">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">إضافة مهمة جديدة</h3>
              <button
              onClick={() => setShowCreateModal(false)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">اسم المهمة</label>
                <input
                type="text"
                required
                placeholder="مثال: تجهيز فستان الطرحة، تعديل مقاس الوسط..."
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">المسؤول عن المهمة</label>
                  <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                  
                    <option value="">غير محدد</option>
                    {EMPLOYEES.map((emp) =>
                  <option key={emp} value={emp}>{emp}</option>
                  )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">نوع المهمة</label>
                  <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                  
                    <option value="تجهيز">تجهيز</option>
                    <option value="تعديل">تعديل</option>
                    <option value="تنظيف">تنظيف</option>
                    <option value="صيانة">صيانة</option>
                    <option value="متابعة">متابعة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">تاريخ الاستحقاق</label>
                  <input
                  type="date"
                  required
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">الأولوية</label>
                  <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                  
                    <option value="عالي">عالي</option>
                    <option value="متوسط">متوسط</option>
                    <option value="منخفض">منخفض</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">تفاصيل وتوجيهات إضافية</label>
                <textarea
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                placeholder="ملاحظات تفصيلية..."
                className="w-full min-h-[100px] p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center shadow-sm">
                
                  إضافة المهمة
                </button>
                <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center">
                
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);

}