import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Mail, Trash2, CheckCircle2, Circle, Search,
  RefreshCw, Phone, User, MessageSquare, AlertCircle, Clock
} from 'lucide-react';

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRead, setFilterRead] = useState('all');

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/contact-messages');
      const data = res.data || res || [];
      setMessages(Array.isArray(data) ? data : []);
      setErrorMessage('');
    } catch (e) {
      setErrorMessage(e.message || 'فشل تحميل رسائل تواصل معنا');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleToggleRead = async (msg) => {
    try {
      const newStatus = !msg.is_read;
      await apiClient.post(`/contact-messages/${msg.id}/read`, { is_read: newStatus });
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_read: newStatus } : m))
      );
      if (selectedMessage && selectedMessage.id === msg.id) {
        setSelectedMessage((prev) => ({ ...prev, is_read: newStatus }));
      }
    } catch (e) {
      alert('فشل تحديث حالة الرسالة');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت تأكد من حذف هذه الرسالة؟')) return;
    try {
      await apiClient.delete(`/contact-messages/${id}`);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(null);
      }
    } catch (e) {
      alert('فشل حذف الرسالة');
    }
  };

  const filteredMessages = messages.filter((m) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (m.name || '').toLowerCase().includes(query) ||
      (m.email || '').toLowerCase().includes(query) ||
      (m.phone || '').toLowerCase().includes(query) ||
      (m.subject || '').toLowerCase().includes(query) ||
      (m.message || '').toLowerCase().includes(query);

    if (filterRead === 'read') return matchesSearch && m.is_read;
    if (filterRead === 'unread') return matchesSearch && !m.is_read;
    return matchesSearch;
  });

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="p-6 md:p-8 text-right font-sans max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-extrabold text-slate-800">رسائل تواصل معنا</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-extrabold">
                {unreadCount} غير مقروءة
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-400">
            إدارة واستعراض الرسائل والطلبات المستلمة من صفحة (Contact Us) على الموقع الإلكتروني
          </p>
        </div>

        <button
          onClick={fetchMessages}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>تحديث</span>
        </button>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="بحث بالاسم، الإيميل، الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          />
          <Search size={16} className="absolute right-3.5 top-3 text-slate-400" />
        </div>

        {/* Read Status Filter */}
        <div className="flex items-center gap-1.5 bg-white p-1 border border-slate-200 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setFilterRead('all')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              filterRead === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            الكل ({messages.length})
          </button>
          <button
            onClick={() => setFilterRead('unread')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              filterRead === 'unread' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            غير مقروء ({unreadCount})
          </button>
          <button
            onClick={() => setFilterRead('read')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              filterRead === 'read' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            تمت القراءة ({messages.length - unreadCount})
          </button>
        </div>
      </div>

      {/* Main Grid: Messages List + Detailed View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Messages List Column */}
        <div className={`space-y-3 ${selectedMessage ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          {loading ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center text-slate-400 text-xs font-bold animate-pulse">
              جاري تحميل الرسائل...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center text-slate-400 text-xs font-bold">
              لا يوجد رسائل مطابقة للبحث
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isSelected = selectedMessage?.id === msg.id;
              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (!msg.is_read) handleToggleRead(msg);
                  }}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                      : msg.is_read
                      ? 'bg-white border-slate-100 hover:border-slate-200'
                      : 'bg-amber-50/40 border-amber-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${msg.is_read ? 'bg-slate-300' : 'bg-amber-500 animate-pulse'}`} />
                      <h3 className="text-xs font-black text-slate-800">{msg.name}</h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={10} />
                      {msg.created_at ? msg.created_at.split('T')[0] : ''}
                    </span>
                  </div>

                  <div className="text-[11px] font-bold text-indigo-600 mb-1">
                    {msg.subject || 'استفسار عام'}
                  </div>

                  <p className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-relaxed mb-3">
                    {msg.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1 font-mono">
                      <Mail size={10} /> {msg.email}
                    </span>
                    {msg.phone && (
                      <span className="flex items-center gap-1 font-mono text-slate-500">
                        <Phone size={10} /> {msg.phone}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detailed Message Modal View */}
        {selectedMessage && (
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col h-fit sticky top-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-sm">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800">{selectedMessage.name}</h2>
                  <p className="text-[10px] font-bold text-slate-400">
                    تاريخ الإرسال: {selectedMessage.created_at ? selectedMessage.created_at.split('T')[0] : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleRead(selectedMessage)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    selectedMessage.is_read
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {selectedMessage.is_read ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                  <span>{selectedMessage.is_read ? 'تحديد كـ غير مقروء' : 'تحديد كـ مقروء'}</span>
                </button>

                <button
                  onClick={() => handleDelete(selectedMessage.id)}
                  className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all cursor-pointer"
                  title="حذف الرسالة"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Sender Meta Box */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 text-xs font-bold text-slate-700">
              <div>
                <span className="text-[9px] text-slate-400 block mb-0.5">البريد الإلكتروني:</span>
                <a href={`mailto:${selectedMessage.email}`} className="text-indigo-600 hover:underline font-mono">
                  {selectedMessage.email}
                </a>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block mb-0.5">رقم الهاتف:</span>
                {selectedMessage.phone ? (
                  <a href={`tel:${selectedMessage.phone}`} className="text-emerald-600 hover:underline font-mono">
                    {selectedMessage.phone}
                  </a>
                ) : (
                  '—'
                )}
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200/60">
                <span className="text-[9px] text-slate-400 block mb-0.5">موضوع الرسالة:</span>
                <span className="text-slate-900 font-extrabold">{selectedMessage.subject || 'استفسار عام'}</span>
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-2 mb-6">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">محتوى الرسالة:</span>
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[140px]">
                {selectedMessage.message}
              </div>
            </div>

            {/* Direct Quick Response Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              {selectedMessage.phone && (
                <a
                  href={`https://wa.me/${selectedMessage.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                    `مرحباً ${selectedMessage.name} 🌸\nشكراً لتواصلكِ مع فساتين صوفيا (Sophia Dresses).\nبخصوص استفساركِ:`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold text-center transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <MessageSquare size={14} />
                  <span>الرد عبر واتساب</span>
                </a>
              )}
              <a
                href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(
                  `رد على: ${selectedMessage.subject || 'استفسار فساتين صوفيا'}`
                )}`}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold text-center transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <Mail size={14} />
                <span>الرد عبر البريد</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
