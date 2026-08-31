import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export function ProfileSettingsModal({ isOpen, onClose, currentUser }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    if (newPassword && !currentPassword) {
      setError('يرجى إدخال كلمة المرور الحالية لتغيير كلمة المرور');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name,
        email
      };

      if (newPassword) {
        payload.current_password = currentPassword;
        payload.password = newPassword;
        payload.password_confirmation = confirmPassword;
      }

      const res = await apiClient.put('/auth/profile', payload);

      // Update local storage
      const userObj = {
        id: res.id,
        name: res.name,
        email: res.email,
        role: res.role || 'staff',
        permissions: res.role === 'admin' ? ['*'] : ['/dashboard', ...(res.permissions || [])]
      };
      
      localStorage.setItem('atelier_current_employee', JSON.stringify(userObj));
      window.dispatchEvent(new Event('auth-change'));
      
      setSuccess('تم تحديث البيانات بنجاح');
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto close after 2 seconds on success
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error(err);
      
      // Try to parse Laravel validation errors
      let errorMessage = 'فشل تحديث البيانات. يرجى المحاولة مرة أخرى.';
      
      if (err.data && err.data.errors) {
        const errors = err.data.errors;
        if (errors.current_password) errorMessage = errors.current_password[0];
        else if (errors.email) errorMessage = errors.email[0];
        else if (errors.password) errorMessage = errors.password[0];
        else {
           errorMessage = Object.values(errors).flat()[0] || errorMessage;
        }
      } else if (err.message) {
         errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in text-slate-700 font-sans">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden flex flex-col" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-indigo-600" size={20} />
            <h3 className="text-sm font-extrabold text-slate-800">
              إعدادات الملف الشخصي
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-600">
              {success}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-600 block">الاسم</label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 transition-all"
              />
              <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-600 block">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 transition-all"
              />
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>

          <div className="pt-3 pb-1">
            <div className="h-px w-full bg-slate-100"></div>
          </div>
          
          <h4 className="text-xs font-extrabold text-slate-800">تغيير كلمة المرور</h4>
          <p className="text-[10px] text-slate-400 font-semibold mt-0">
            اترك هذه الحقول فارغة إذا كنت لا ترغب في تغيير كلمة المرور
          </p>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-600 block">كلمة المرور الحالية</label>
            <div className="relative">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 transition-all"
              />
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-600 block">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-600 block">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 transition-all"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer disabled:opacity-70"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
