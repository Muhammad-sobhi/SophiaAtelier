import React, { useState } from 'react';
import { LogIn, Lock, Mail, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('البريد الإلكتروني وكلمة المرور مطلوبان');
      return;
    }

    try {
      const res = await apiClient.post('/auth/login', {
        email: cleanEmail,
        password
      });

      localStorage.setItem('atelier_auth_token', res.token);
      const userObj = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role || 'staff',
        permissions: res.user.role === 'admin' ? ['*'] : ['/dashboard', ...(res.user.permissions || [])]
      };
      localStorage.setItem('atelier_current_employee', JSON.stringify(userObj));
      onLogin(userObj);
    } catch (err) {
      setError(err.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#dbe2ff] via-[#e0e7ff] to-[#eef2ff] flex items-center justify-center p-4 md:p-6 font-sans text-right" dir="rtl">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(79,70,229,0.15)] border border-white p-8 md:p-10 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-extrabold text-2xl">S</span>
          </div>
          <div>
            <h1 className="text-[#1e293b] font-extrabold text-xl leading-tight flex items-center gap-1.5 justify-center">
              Sophia Dresses OS <Sparkles className="text-indigo-500" size={18} />
            </h1>
            <p className="text-slate-400 text-xs font-bold mt-1">نظام إدارة فساتين صوفيا - تسجيل الدخول</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-600">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="example@atelier.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-white/60 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 transition-all"
              />
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-600">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-white/60 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 transition-all"
              />
              <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all duration-300 text-xs font-bold shadow-md shadow-indigo-600/10 active:scale-95 cursor-pointer mt-2"
          >
            <LogIn size={16} />
            <span>دخول النظام</span>
          </button>
        </form>

        <div className="text-[10px] text-slate-400 font-bold text-center border-t border-slate-100/80 pt-4">
          <span className="block">تواصل مع مدير النظام للحصول على بيانات الدخول</span>
        </div>
      </div>
    </div>
  );
}