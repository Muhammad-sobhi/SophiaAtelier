import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Plus, Phone, DollarSign, Mail, Lock, MapPin, CreditCard, Image, X, Trash2, Eye, EyeOff, Edit3, RefreshCw } from 'lucide-react';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { PERMISSION_PAGES, PERMISSION_ACTIONS } from '@/lib/nav-items';
import { cycleDays, cycleLabel, formatMoney, MONTH_DAYS } from '@/lib/payroll';

const permissionLabel = (key) =>
PERMISSION_PAGES.find((p) => p.path === key)?.label || PERMISSION_ACTIONS.find((a) => a.key === key)?.label || key;

// ID photos are stored as data URLs: downscale phone photos so the request stays small
const readIdImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    const img = new window.Image();
    img.onerror = reject;
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const ID_SIDES = [
{ key: 'front', label: 'الوجه الأمامي' },
{ key: 'back', label: 'الوجه الخلفي' }];


export default function EmployeesPage() {
  const [employeesList, setEmployeesList] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [payCycle, setPayCycle] = useState('monthly');
  const [payCycleDays, setPayCycleDays] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idImage, setIdImage] = useState('');
  const [idImageBack, setIdImageBack] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState([]);

  const [editingEmployee, setEditingEmployee] = useState(null);

  // Details Modal State
  const [selectedIdImage, setSelectedIdImage] = useState(null);

  useEffect(() => {
    // Check if current user is admin
    const checkRole = () => {
      const userStr = localStorage.getItem('atelier_current_employee');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setIsAdmin(user.role === 'admin');
        } catch (e) {
          setIsAdmin(false);
        }
      }
    };
    checkRole();
  }, []);

  // The API is the source of truth: reload after every change
  const loadEmployees = useCallback(() => {
    return apiClient.get('/employees').then((res) => {
      const data = Array.isArray(res) ? res : res.data || [];
      setEmployeesList(data.map((emp) => ({
        id: emp.id,
        name: emp.name || '',
        role: emp.role || emp.position || 'موظف',
        phone: emp.phone || '',
        dailyRate: parseFloat(emp.daily_rate) || 0,
        hireDate: emp.hire_date ? String(emp.hire_date).slice(0, 10) : '',
        payCycle: emp.pay_cycle || 'monthly',
        payCycleDays: emp.pay_cycle_days || '',
        email: emp.email || '',
        password: emp.password || '',
        address: emp.address || '',
        idNumber: emp.id_number || '',
        idImage: emp.id_image || '',
        idImageBack: emp.id_image_back || '',
        permissions: emp.permissions || ['/dashboard']
      })));
    }).catch((err) => {
      console.error('Failed to load employees:', err);
      toast.error('تعذر تحميل بيانات الموظفين');
    });
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const idImageSetters = { front: setIdImage, back: setIdImageBack };

  const handleImageUpload = async (e, side) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }
    try {
      idImageSetters[side](await readIdImage(file));
    } catch {
      toast.error('تعذر قراءة الصورة');
    }
  };

  const handleEditEmployeeClick = (emp) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setRole(emp.role || '');
    setPhone(emp.phone);
    setDailyRate(emp.dailyRate ? String(emp.dailyRate) : '');
    setHireDate(emp.hireDate || '');
    setPayCycle(emp.payCycle || 'monthly');
    setPayCycleDays(emp.payCycleDays || '');
    setEmail(emp.email);
    setPassword(emp.password || '');
    setAddress(emp.address || '');
    setIdNumber(emp.idNumber || '');
    setIdImage(emp.idImage || '');
    setIdImageBack(emp.idImageBack || '');
    setPermissions(emp.permissions.filter((p) => p !== '/dashboard'));
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setName('');
    setRole('');
    setPhone('');
    setDailyRate('');
    setHireDate('');
    setPayCycle('monthly');
    setPayCycleDays('');
    setEmail('');
    setPassword('');
    setAddress('');
    setIdNumber('');
    setIdImage('');
    setIdImageBack('');
    setPermissions([]);
    setIsModalOpen(true);
  };

  const togglePermission = (path) => {
    if (permissions.includes(path)) {
      setPermissions(permissions.filter((p) => p !== path));
    } else {
      setPermissions([...permissions, path]);
    }
  };

  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    const payload = {
      name,
      role: role || 'موظف',
      phone,
      daily_rate: parseFloat(dailyRate) || 0,
      hire_date: hireDate || null,
      pay_cycle: payCycle,
      pay_cycle_days: payCycle === 'custom' ? parseInt(payCycleDays) || null : null,
      email,
      password: password || undefined,
      address,
      id_number: idNumber,
      id_image: idImage,
      id_image_back: idImageBack,
      permissions: ['/dashboard', ...permissions]
    };

    setIsSaving(true);
    try {
      if (editingEmployee) {
        await apiClient.put(`/employees/${editingEmployee.id}`, payload);
      } else {
        await apiClient.post('/employees', payload);
      }
      await loadEmployees();
      toast.success(editingEmployee ? 'تم حفظ التعديلات' : 'تمت إضافة الموظف');
      setIsModalOpen(false);
      setEditingEmployee(null);
    } catch (err) {
      console.error('Failed to save employee:', err);
      toast.error(err.message || 'تعذر حفظ بيانات الموظف');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (await confirmDialog('هل أنت متأكد من حذف هذا الموظف؟')) {
      try {
        await apiClient.delete(`/employees/${id}`);
        setEmployeesList((prev) => prev.filter((emp) => emp.id !== id));
      } catch (err) {
        console.error('Failed to delete employee:', err);
        toast.error(err.message || 'تعذر حذف الموظف');
      }
    }
  };

  const togglePasswordVisibility = (id) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-6 md:p-8 space-y-6 flex flex-col h-full max-h-full overflow-hidden bg-slate-50/50 text-right" dir="rtl">
      {/* Header Row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">فريق العمل والموظفين</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">إدارة حسابات الموظفين، رواتبهم، وصلاحيات الوصول لصفحات النظام</p>
        </div>

        {isAdmin &&
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-md shadow-indigo-600/10 active:scale-95 cursor-pointer">
          
            <Plus size={16} />
            <span>إضافة موظف جديد</span>
          </button>
        }
      </div>

      {/* Grid List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin select-none">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {employeesList.map((emp) =>
          <div
            key={emp.id}
            className="bg-white rounded-3xl p-5 border border-slate-100/70 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between group">
            
              <div>
                {/* Profile Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-100 flex-shrink-0">
                      <span className="text-white font-extrabold text-sm">{emp.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-xs">{emp.name}</h3>
                      <span className="inline-block text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-150/40 px-2 py-0.5 rounded-md font-bold mt-0.5">{emp.role}</span>
                    </div>
                  </div>

                  {isAdmin &&
                <div className="flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                    onClick={() => handleEditEmployeeClick(emp)}
                    className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
                    title="تعديل بيانات الموظف">
                    
                        <Edit3 size={14} />
                      </button>
                      <button
                    onClick={() => handleDeleteEmployee(emp.id)}
                    className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                    title="حذف الموظف">
                    
                        <Trash2 size={14} />
                      </button>
                    </div>
                }
                </div>

                {/* Details Section */}
                <div className="space-y-2.5 border-t border-slate-50 pt-4">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                    <Phone size={12} className="text-slate-400" />
                    <span>الهاتف: {emp.phone || '-'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                    <Mail size={12} className="text-slate-400" />
                    <span>البريد: {emp.email}</span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Lock size={12} className="text-slate-400" />
                        <span>كلمة المرور:</span>
                        <span className="font-mono">{showPasswords[emp.id] ? emp.password : '••••••••'}</span>
                      </div>
                      <button
                      onClick={() => togglePasswordVisibility(emp.id)}
                      className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-md transition-colors">
                      
                        {showPasswords[emp.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  )}

                  {emp.address &&
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                      <MapPin size={12} className="text-slate-400" />
                      <span>العنوان: {emp.address}</span>
                    </div>
                }

                  {emp.idNumber &&
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                      <CreditCard size={12} className="text-slate-400" />
                      <span>رقم الهوية: {emp.idNumber}</span>
                    </div>
                }

                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2 space-y-0.5">
                    <div className="flex items-center gap-2 text-xs text-emerald-700 font-extrabold">
                      <DollarSign size={13} className="text-emerald-500" />
                      <span>الراتب {cycleLabel(emp.payCycle, emp.payCycleDays)}: {formatMoney(emp.dailyRate * cycleDays(emp.payCycle, emp.payCycleDays))}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 font-bold pr-5">
                      الأجر اليومي {formatMoney(emp.dailyRate)} × {cycleDays(emp.payCycle, emp.payCycleDays)} يوم
                    </p>
                  </div>
                </div>

                {/* Permissions Badges */}
                <div className="mt-4 border-t border-slate-50 pt-3">
                  <span className="text-[9px] font-extrabold text-slate-400 block mb-1.5">الصفحات المسموح بها:</span>
                  <div className="flex flex-wrap gap-1">
                    {emp.permissions.filter((p) => p !== '/dashboard').map((path) => {
                    const pageLabel = permissionLabel(path);
                    return (
                      <span key={path} className="text-[8px] font-bold bg-slate-100/80 text-slate-600 px-2 py-1 rounded-md border border-slate-150/40">
                          {pageLabel}
                        </span>);

                  })}
                  </div>
                </div>
              </div>

              {/* ID Image Preview */}
              {(emp.idImage || emp.idImageBack) &&
            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                  <span className="text-[9px] font-extrabold text-slate-400 whitespace-nowrap">صورة الهوية</span>
                  <div className="flex items-center gap-1.5">
                    {[{ src: emp.idImage, label: 'الأمامي' }, { src: emp.idImageBack, label: 'الخلفي' }].filter((side) => side.src).map((side) =>
                <button
                  key={side.label}
                  onClick={() => setSelectedIdImage({ src: side.src, label: side.label })}
                  className="flex items-center gap-1.5 text-[9px] text-indigo-600 hover:text-indigo-700 font-bold border border-indigo-150/40 hover:bg-indigo-50/30 px-2.5 py-1 rounded-xl transition-all cursor-pointer">
                        <Image size={10} />
                        <span>{side.label}</span>
                      </button>
                )}
                  </div>
                </div>
            }
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {isModalOpen &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in text-slate-700">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800">
                {editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد للأتيليه'}
              </h3>
              <button
              onClick={() => {
                setIsModalOpen(false);
                setEditingEmployee(null);
              }}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow text-right scrollbar-thin">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">اسم الموظف</label>
                  <input
                  type="text"
                  required
                  placeholder="مثال: منى أحمد"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">المسمى الوظيفي</label>
                  <input
                  type="text"
                  required
                  placeholder="مثال: خياطة أزياء"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">رقم الهاتف</label>
                  <input
                  type="text"
                  placeholder="مثال: 0501234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">الأجر اليومي (ج.م)</label>
                  <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="مثال: 200"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
              </div>

              <div className={`grid ${payCycle === 'custom' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">دورة صرف الراتب</label>
                  <select
                  value={payCycle}
                  onChange={(e) => setPayCycle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700">
                    <option value="monthly">شهري (كل شهر)</option>
                    <option value="weekly">أسبوعي (كل أسبوع)</option>
                    <option value="custom">مخصص (كل عدد أيام)</option>
                  </select>
                </div>

                {payCycle === 'custom' && (
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-600">عدد الأيام لكل دورة</label>
                    <input
                    type="number"
                    min="1"
                    max="30"
                    placeholder="مثال: 3 أو 5"
                    required
                    value={payCycleDays}
                    onChange={(e) => setPayCycleDays(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600">
                  تاريخ التعيين
                  <span className="text-[9px] font-bold text-slate-400 mr-1">
                    {payCycle === 'custom' ? '(تبدأ منه أول دورة صرف)' : '(اختياري)'}
                  </span>
                </label>
                <input
                type="date"
                required={payCycle === 'custom'}
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
              </div>

              {/* Live salary preview for the chosen cycle */}
              {(() => {
              const rate = parseFloat(dailyRate) || 0;
              const days = cycleDays(payCycle, payCycleDays);
              return (
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5 space-y-1" aria-live="polite">
                    <div className="flex items-center justify-between text-xs font-extrabold text-emerald-700">
                      <span>الراتب {cycleLabel(payCycle, payCycleDays)}</span>
                      <span className="text-sm">{formatMoney(rate * days)}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500">
                      {formatMoney(rate)} × {days} يوم
                      {payCycle === 'monthly' && ' (الشهر يُحسب 30 يوماً دائماً)'}
                      {payCycle === 'weekly' && ' — الأسبوع من السبت إلى الجمعة'}
                    </p>
                    {payCycle !== 'monthly' && rate > 0 &&
                  <p className="text-[10px] font-bold text-slate-400">ما يعادل شهرياً: {formatMoney(rate * MONTH_DAYS)}</p>
                  }
                  </div>);

            })()}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">
                    البريد الإلكتروني للولوج
                    <span className="text-[9px] font-bold text-slate-400 mr-1">(اختياري)</span>
                  </label>
                  <input
                  type="email"
                  placeholder="employee@atelier.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                  {!email && <p className="text-[9px] text-amber-500 font-bold mt-0.5">⚠️ بدون بريد إلكتروني لن يتمكن الموظف من الدخول للوحة التحكم</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">
                    كلمة المرور
                    <span className="text-[9px] font-bold text-slate-400 mr-1">
                      {editingEmployee ? '(اتركها فارغة لعدم التغيير)' : '(اختياري)'}
                    </span>
                  </label>
                  <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">العنوان الكامل</label>
                  <input
                  type="text"
                  placeholder="مثال: القاهرة، مصر"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">رقم الهوية (اختياري)</label>
                  <input
                  type="text"
                  placeholder="14 رقم"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
              </div>

              {/* Upload ID Images (front + back) */}
              <div className="space-y-1">
                <span className="text-xs font-extrabold text-slate-600 block">صور الهوية الوطنية (اختياري)</span>
                <div className="grid grid-cols-2 gap-3">
                  {ID_SIDES.map((side) => {
                  const src = side.key === 'front' ? idImage : idImageBack;
                  const inputId = `id-image-${side.key}`;
                  return (
                    <div key={side.key} className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">{side.label}</span>
                        <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, side.key)}
                        className="hidden"
                        id={inputId} />
                        {src ?
                      <div className="relative h-24 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                            <img src={src} alt={`National ID - ${side.label}`} className="w-full h-full object-contain" />
                            <div className="absolute top-1 left-1 flex gap-1">
                              <label htmlFor={inputId} className="p-1 bg-white/90 hover:bg-white rounded-lg text-slate-600 shadow-xs cursor-pointer" title="تغيير الصورة">
                                <Edit3 size={11} />
                              </label>
                              <button
                            type="button"
                            onClick={() => idImageSetters[side.key]('')}
                            className="p-1 bg-white/90 hover:bg-white rounded-lg text-rose-600 shadow-xs cursor-pointer"
                            title="حذف الصورة">
                                <X size={11} />
                              </button>
                            </div>
                          </div> :

                      <label
                        htmlFor={inputId}
                        className="h-24 bg-slate-50 border border-slate-200 border-dashed rounded-2xl text-[11px] font-bold text-slate-500 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-all flex flex-col items-center justify-center gap-1.5">
                            <Image size={16} />
                            <span>اختر صورة {side.label}</span>
                          </label>
                      }
                      </div>);

                })}
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-extrabold text-slate-600 block">صلاحيات رؤية صفحات النظام</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100">
                  {PERMISSION_PAGES.map((page) =>
                <label key={page.path} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                    type="checkbox"
                    checked={permissions.includes(page.path)}
                    onChange={() => togglePermission(page.path)}
                    className="w-4 h-4 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer accent-indigo-600 transition-all" />
                  
                      <span>{page.label}</span>
                    </label>
                )}
                </div>

                <label className="text-xs font-extrabold text-slate-600 block pt-2">صلاحيات إضافية</label>
                <div className="space-y-2 bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100">
                  {PERMISSION_ACTIONS.map((action) =>
                <label key={action.key} className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                    type="checkbox"
                    checked={permissions.includes(action.key)}
                    onChange={() => togglePermission(action.key)}
                    className="w-4 h-4 mt-0.5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer accent-indigo-600 transition-all" />
                      <span>
                        {action.label}
                        <span className="block text-[10px] text-slate-400 font-bold">{action.hint}</span>
                      </span>
                    </label>
                )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {isSaving && <RefreshCw size={12} className="animate-spin" />}
                  {editingEmployee ? 'حفظ التعديلات' : 'إضافة للفريق'}
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

      {/* Expanded ID Image Modal */}
      {selectedIdImage &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="bg-white rounded-3xl p-5 shadow-2xl max-w-2xl w-full border border-slate-150 flex flex-col gap-3 relative">
            <button
            onClick={() => setSelectedIdImage(null)}
            className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-700 cursor-pointer transition-colors">
            
              <X size={16} />
            </button>
            <h4 className="text-xs font-extrabold text-slate-800 text-right pr-6">صورة الهوية الوطنية — الوجه {selectedIdImage.label}</h4>
            <div className="border border-slate-100 rounded-2xl overflow-hidden mt-2 max-h-[60vh]">
              <img src={selectedIdImage.src} alt={`National ID - ${selectedIdImage.label}`} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      }
    </div>);

}