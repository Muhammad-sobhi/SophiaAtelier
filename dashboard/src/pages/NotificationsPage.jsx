import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, Clock, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useNavigate } from 'react-router-dom';

const typeStyles = {
  info: { icon: Bell, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  success: { icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  warning: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' }
};

function mapApiNotification(n) {
  return {
    id: n.id,
    title: n.title || 'إشعار جديد',
    desc: n.message || n.description || '',
    time: n.created_at ? new Date(n.created_at).toLocaleString('ar-EG') : 'الآن',
    read: n.is_read === true || n.is_read === 1,
    type: n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'info',
    related_type: n.related_type,
    related_id: n.related_id,
    page: n.type === 'new_appointment' || n.related_type === 'booking' ?
      `/dashboard/appointments?booking_id=${n.related_id}` :
      n.related_type === 'visit' ? '/dashboard/visits' :
      n.related_type === 'task' ? '/dashboard/tasks' :
      n.related_type === 'revenue' ? '/dashboard/finance' :
      n.related_type === 'fitting' ? '/dashboard/fittings' :
      n.related_type === 'dress' ? '/dashboard/dresses' : '/dashboard'
  };
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications');
      const data = res.data || [];
      setNotifications(data.map(mapApiNotification));
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await apiClient.post('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const deleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const deleteAllNotifications = async () => {
    if (!window.confirm('هل أنت متأكد من حذف جميع التنبيهات؟')) return;
    try {
      await apiClient.delete('/notifications/delete-all');
      setNotifications([]);
    } catch {
      setNotifications([]);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await apiClient.post(`/notifications/${notif.id}/read`, {});
      } catch {}
    }
    if (notif.page) {
      navigate(notif.page);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-lg font-extrabold text-slate-800">التنبيهات والإشعارات</h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            {unreadCount > 0 ? `لديك ${unreadCount} إشعار غير مقروء` : 'جميع الإشعارات مقروءة'}
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
            <button
              onClick={deleteAllNotifications}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 size={14} />
              <span>مسح جميع الإشعارات</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs font-bold">جاري تحميل الإشعارات...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <Bell size={20} />
          </div>
          <h3 className="text-xs font-black text-slate-700">لا توجد إشعارات حالياً</h3>
          <p className="text-[11px] text-slate-400 font-bold">سيتم تنبيهك فور وجود أي تحديثات جديدة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const ts = typeStyles[notif.type] || typeStyles['info'];
            const Icon = ts.icon;
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`bg-white rounded-3xl p-5 border transition-all duration-300 hover:shadow-md cursor-pointer relative group ${
                  notif.read ? 'border-slate-100 text-slate-600' : 'border-indigo-100 bg-indigo-50/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${ts.bg} ${ts.color} shadow-sm`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`font-extrabold text-xs truncate ${notif.read ? 'text-slate-600' : 'text-slate-800'}`}>
                        {notif.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notif.read && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></div>}
                        <button
                          onClick={(e) => deleteNotification(e, notif.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف الإشعار"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1.5 leading-relaxed break-words">{notif.desc}</p>
                    <div className="flex items-center gap-1 mt-3 text-[10px] text-slate-400 font-bold">
                      <Clock size={12} className="text-slate-300" /> <span>{notif.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}