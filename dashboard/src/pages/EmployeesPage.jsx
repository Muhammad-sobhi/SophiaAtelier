import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Plus, Phone, DollarSign, Mail, Lock, MapPin, CreditCard, Image, X, Trash2, Eye, EyeOff, Edit3 } from 'lucide-react';















const AVAILABLE_PAGES = [
{ path: '/dashboard/brides', label: 'العرائس' },
{ path: '/dashboard/dresses', label: 'الفساتين' },
{ path: '/dashboard/collections', label: 'التشكيلات' },
{ path: '/dashboard/client-gallery', label: 'معرض العملاء' },
{ path: '/dashboard/visits', label: 'الزيارات' },
{ path: '/dashboard/bookings', label: 'الحجوزات' },
{ path: '/dashboard/fittings', label: 'القياسات' },
{ path: '/dashboard/tasks', label: 'المهام' },
{ path: '/dashboard/finance', label: 'المالية' },
{ path: '/dashboard/employees', label: 'الموظفين' },
{ path: '/dashboard/attendance', label: 'الحضور والرواتب' },
{ path: '/dashboard/reports', label: 'التقارير' },
{ path: '/dashboard/whatsapp-templates', label: 'قوالب الرسائل' },
{ path: '/dashboard/contact-messages', label: 'رسائل تواصل معنا' },
{ path: '/dashboard/reviews', label: 'آراء العملاء' },
{ path: '/dashboard/faqs', label: 'الأسئلة الشائعة' }];


export default function EmployeesPage() {
  const [employeesList, setEmployeesList] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  // Form fields
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idImage, setIdImage] = useState('');
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

    // Load employees from API
    apiClient.get('/employees').then((res) => {
      const data = Array.isArray(res) ? res : res.data || [];
      setEmployeesList(data.map((emp) => ({
        id: emp.id,
        name: emp.name || '',
        position: emp.position || emp.role || 'موظف',
        phone: emp.phone || '',
        salary: emp.salary ? `${parseFloat(emp.salary).toLocaleString()} ج.م` : '0 ج.م',
        email: emp.email || '',
        password: emp.password || '',
        address: emp.address || '',
        idNumber: emp.id_number || '',
        idImage: emp.id_image || '',
        permissions: emp.permissions || ['/dashboard']
      })));
    }).catch((err) => console.error('Failed to load employees:', err));
  }, []);

  const saveEmployees = (updated) => {
    setEmployeesList(updated);
    // Mutations go through API
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditEmployeeClick = (emp) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setPosition(emp.position);
    setPhone(emp.phone);
    setSalary(emp.salary.replace(' ج.م', '').replace(/,/g, ''));
    setEmail(emp.email);
    setPassword(emp.password || '');
    setAddress(emp.address || '');
    setIdNumber(emp.idNumber || '');
    setIdImage(emp.idImage || '');
    setPermissions(emp.permissions.filter((p) => p !== '/dashboard'));
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setName('');
    setPosition('');
    setPhone('');
    setSalary('');
    setEmail('');
    setPassword('');
    setAddress('');
    setIdNumber('');
    setIdImage('');
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
    if (!name.trim() || !email.trim()) return;
    if (!editingEmployee && !password.trim()) return;

    try {
      if (editingEmployee) {
        await apiClient.put(`/employees/${editingEmployee.id}`, {
          name,
          position: position || 'موظف',
          phone,
          salary: parseFloat(salary.replace(/,/g, '')) || 0,
          email,
          password: password || undefined,
          address,
          id_number: idNumber,
          id_image: idImage,
          permissions: ['/dashboard', ...permissions]
        });
        setEmployeesList((prev) => prev.map((emp) => emp.id === editingEmployee.id ? {
          ...emp,
          name,
          position: position || 'موظف',
          phone,
          salary: salary ? `${parseFloat(salary.replace(/,/g, '')).toLocaleString()} ج.م` : '0 ج.م',
          email,
          password: password || emp.password,
          address,
          idNumber,
          idImage,
          permissions: ['/dashboard', ...permissions]
        } : emp));
      } else {
        const res = await apiClient.post('/employees', {
          name,
          position: position || 'موظف',
          phone,
          salary: parseFloat(salary.replace(/,/g, '')) || 0,
          email,
          password,
          address,
          id_number: idNumber,
          id_image: idImage,
          permissions: ['/dashboard', ...permissions]
        });
        const newEmp = {
          id: res.data?.id || Date.now(),
          name,
          position: position || 'موظف',
          phone,
          salary: salary ? `${parseFloat(salary.replace(/,/g, '')).toLocaleString()} ج.م` : '0 ج.م',
          email,
          password,
          address,
          idNumber,
          idImage,
          permissions: ['/dashboard', ...permissions]
        };
        setEmployeesList((prev) => [...prev, newEmp]);
      }
    } catch (err) {
      console.error('Failed to save employee:', err);
    }

    setIsModalOpen(false);
    setName('');
    setPosition('');
    setPhone('');
    setSalary('');
    setEmail('');
    setPassword('');
    setAddress('');
    setIdNumber('');
    setIdImage('');
    setPermissions([]);
    setEditingEmployee(null);
  };

  const handleDeleteEmployee = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
      try {
        await apiClient.delete(`/employees/${id}`);
        setEmployeesList((prev) => prev.filter((emp) => emp.id !== id));
      } catch (err) {
        console.error('Failed to delete employee:', err);
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
                      <span className="inline-block text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-150/40 px-2 py-0.5 rounded-md font-bold mt-0.5">{emp.position}</span>
                    </div>
                  </div>

                  {isAdmin &&
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
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

                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-extrabold">
                    <DollarSign size={13} className="text-emerald-400" />
                    <span>الراتب: {emp.salary}</span>
                  </div>
                </div>

                {/* Permissions Badges */}
                <div className="mt-4 border-t border-slate-50 pt-3">
                  <span className="text-[9px] font-extrabold text-slate-400 block mb-1.5">الصفحات المسموح بها:</span>
                  <div className="flex flex-wrap gap-1">
                    {emp.permissions.filter((p) => p !== '/dashboard').map((path) => {
                    const pageLabel = AVAILABLE_PAGES.find((ap) => ap.path === path)?.label || path;
                    return (
                      <span key={path} className="text-[8px] font-bold bg-slate-100/80 text-slate-600 px-2 py-1 rounded-md border border-slate-150/40">
                          {pageLabel}
                        </span>);

                  })}
                  </div>
                </div>
              </div>

              {/* ID Image Preview */}
              {emp.idImage &&
            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[9px] font-extrabold text-slate-400">صورة الهوية الوطنية</span>
                  <button
                onClick={() => setSelectedIdImage(emp.idImage)}
                className="flex items-center gap-1.5 text-[9px] text-indigo-600 hover:text-indigo-700 font-bold border border-indigo-150/40 hover:bg-indigo-50/30 px-2.5 py-1 rounded-xl transition-all cursor-pointer">
                
                    <Image size={10} />
                    <span>عرض الصورة</span>
                  </button>
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
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
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
                  <label className="text-xs font-extrabold text-slate-600">الراتب الشهري</label>
                  <input
                  type="text"
                  placeholder="مثال: 6,000 ج.م"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">البريد الإلكتروني للولوج</label>
                  <input
                  type="email"
                  required
                  placeholder="employee@atelier.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700" />
                
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">
                    كلمة المرور {editingEmployee && '(اتركيها فارغة لعدم التغيير)'}
                  </label>
                  <input
                  type="password"
                  required={!editingEmployee}
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

              {/* Upload ID Image */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-600 block">رفع صورة الهوية الوطنية (اختياري)</label>
                <div className="flex items-center gap-3">
                  <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="id-image-uploader" />
                
                  <label
                  htmlFor="id-image-uploader"
                  className="px-4 py-2 bg-slate-50 border border-slate-200 border-dashed rounded-2xl text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-all flex items-center gap-2">
                  
                    <Image size={14} />
                    <span>اختر ملف صورة</span>
                  </label>
                  {idImage &&
                <div className="relative w-12 h-12 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <img src={idImage} alt="National ID" className="w-full h-full object-cover" />
                      <button
                    type="button"
                    onClick={() => setIdImage('')}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white cursor-pointer">
                    
                        <X size={10} />
                      </button>
                    </div>
                }
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-extrabold text-slate-600 block">صلاحيات رؤية صفحات النظام</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100">
                  {AVAILABLE_PAGES.map((page) =>
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
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center shadow-sm">
                
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
            <h4 className="text-xs font-extrabold text-slate-800 text-right pr-6">عرض صورة الهوية الوطنية</h4>
            <div className="border border-slate-100 rounded-2xl overflow-hidden mt-2 max-h-[60vh]">
              <img src={selectedIdImage} alt="National ID card" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      }
    </div>);

}