import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Bell, Clock, Check, AlertCircle, Menu, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";

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
    time: n.created_at ? new Date(n.created_at).toLocaleDateString('ar-EG') : 'الآن',
    read: n.is_read === true || n.is_read === 1,
    type: n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'info',
    originalType: n.type || 'info',
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

export function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const notifRef = useRef(null);
  const searchRef = useRef(null);
  const searchTimerRef = useRef(undefined);

  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('atelier_current_employee');
      if (userStr) {
        try {setCurrentUser(JSON.parse(userStr));}
        catch {setCurrentUser(null);}
      } else {setCurrentUser(null);}
    };

    checkAuth();
    window.addEventListener('auth-change', checkAuth);
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('auth-change', checkAuth);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications');
      const data = res.data || [];
      setNotifications(data.map(mapApiNotification));
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchNotifications]);

  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [clientsRes, dressesRes] = await Promise.allSettled([
        apiClient.get('/clients'),
        apiClient.get('/dresses')]
        );

        const results = [];

        if (clientsRes.status === 'fulfilled') {
          const clients = clientsRes.value.data || [];
          const filtered = clients.filter((c) =>
          c.name?.toLowerCase().includes(query.toLowerCase())
          );
          filtered.forEach((c) => {
            results.push({ id: c.id, label: c.name, type: 'client', path: '/dashboard/brides' });
          });
        }

        if (dressesRes.status === 'fulfilled') {
          const dresses = dressesRes.value.data || [];
          const filtered = dresses.filter((d) =>
          d.name?.toLowerCase().includes(query.toLowerCase())
          );
          filtered.forEach((d) => {
            results.push({ id: d.id, label: d.name, type: 'dress', path: '/dashboard/dresses' });
          });
        }

        setSearchResults(results);
        setShowSearchResults(results.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch {





      // If backend is unreachable, still clear local auth
    }localStorage.removeItem('atelier_current_employee');localStorage.removeItem('atelier_auth_token');window.dispatchEvent(new Event('auth-change'));navigate('/dashboard');};

  const filteredNotifications = notifications.filter((notif) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.permissions?.includes('*')) return true;
    return currentUser.permissions?.includes(notif.page);
  });

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

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
    if (!window.confirm('هل أنت تأكد من حذف جميع التنبيهات؟')) return;
    try {
      await apiClient.delete('/notifications/delete-all');
      setNotifications([]);
    } catch {
      setNotifications([]);
    }
  };

  const sendWhatsAppReminder = async (e, notif) => {
    e.stopPropagation();

    let clientName = '';
    let weddingDate = '';
    let pickupDate = '';
    let phone = '';

    // 1. Fetch fresh booking info if notification is linked to a booking ID
    if (notif.related_id && (notif.related_type === 'booking' || notif.originalType === 'pickup_reminder')) {
      try {
        const booking = await apiClient.get(`/bookings/${notif.related_id}`);
        if (booking) {
          if (booking.client) {
            clientName = booking.client.name || '';
            phone = (booking.client.phone || '').replace(/[^\d]/g, '');
          }
          if (booking.event_date) {
            weddingDate = booking.event_date.split(' ')[0].split('T')[0];

            const city = booking.client?.city || 'القاهرة';
            const isCairo = city.includes('القاهرة') || city.toLowerCase().includes('cairo');
            const daysBefore = isCairo ? 1 : 2;

            const evDt = new Date(weddingDate);
            evDt.setDate(evDt.getDate() - daysBefore);
            pickupDate = evDt.toISOString().split('T')[0];
          }
        }
      } catch (err) {
        console.warn('Could not fetch booking for notification:', err);
      }
    }

    // 2. Fallbacks from regex parsing
    if (!phone) {
      const phoneMatch = notif.desc.match(/رقم الهاتف:\s*([^\s)|]+)/);
      if (phoneMatch) phone = phoneMatch[1].replace(/[^\d]/g, '');
    }

    if (!clientName) {
      const clientNameMatch = notif.title.match(/تذكير بموعد استلام فستان (?:👗:?\s*)?(.*)/) || notif.title.match(/:\s*(.+)/);
      const rawName = clientNameMatch ? clientNameMatch[1].trim() : '';
      clientName = rawName && rawName !== '👗' ? rawName.replace(/^👗:?\s*/, '') : 'عروسنا الجميلة';
    }

    if (!weddingDate || weddingDate === 'غير محدد') {
      const weddingDateMatch = notif.desc.match(/تاريخ الفرح:\s*(\d{4}-\d{2}-\d{2})/);
      weddingDate = weddingDateMatch ? weddingDateMatch[1] : 'غير محدد';
    }

    if (!pickupDate) {
      const pickupDateMatch = notif.desc.match(/تاريخ الاستلام(?: المقترح)?:\s*(\d{4}-\d{2}-\d{2})/) || notif.desc.match(/\((\d{4}-\d{2}-\d{2})\)/);
      pickupDate = pickupDateMatch ? pickupDateMatch[1] : weddingDate;
    }

    let message = `✨ *فساتين صوفيا | Sophia Dresses* ✨\n\nمرحباً يا جميلتنا *${clientName}* 🤍،\nنود تذكيركِ بموعد استلام فستان زفافكِ 👗\n\n📅 *تفاصيل الاستلام:*\n• *تاريخ الزفاف:* ${weddingDate}\n• *تاريخ الاستلام المقترح:* ${pickupDate} (خلال أوقات العمل من ١:٠٠ م إلى ٨:٣٠ م)\n\n📍 *موقع فساتين صوفيا:* القاهرة، مصر | https://maps.google.com\n\nيسعدنا تشريفكِ لتستلمي فستان أحلامكِ ✨🎀`;

    try {
      const templates = await apiClient.get('/whatsapp-templates');
      const t = Array.isArray(templates) ? templates.find((x) => x.key === 'pickup_reminder') : null;
      if (t) {
        message = t.body.
        replace(/\{\{client_name\}\}/g, clientName).
        replace(/\{\{wedding_date\}\}/g, weddingDate).
        replace(/\{\{pickup_date\}\}/g, pickupDate);
      }
    } catch (err) {
      console.error('Failed to load WhatsApp template, using fallback:', err);
    }

    if (phone) {
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const toggleNotifStatus = async (id) => {
    const notif = notifications.find((n) => n.id === id);
    if (!notif) return;
    try {
      await apiClient.post(`/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: !n.read } : n));
    } catch {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: !n.read } : n));
    }
  };

  return (/*#__PURE__*/
    _jsxDEV("div", { className: "flex items-center justify-between py-3 px-3 sm:px-6 bg-white border-b border-slate-100 flex-shrink-0 select-none text-right", dir: "rtl", children: [/*#__PURE__*/

      _jsxDEV("div", { className: "flex items-center gap-2 sm:gap-3", children: [
        onMenuClick && /*#__PURE__*/
        _jsxDEV("button", {
          onClick: onMenuClick,
          className: "md:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-colors cursor-pointer", children: /*#__PURE__*/

          _jsxDEV(Menu, { size: 20 }, void 0, false) }, void 0, false
        ), /*#__PURE__*/



        _jsxDEV("div", { className: "w-32 xs:w-48 sm:w-80 relative", ref: searchRef, children: [/*#__PURE__*/
          _jsxDEV("input", {
            type: "text",
            placeholder: "ابحث عن عروس أو فستان...",
            value: searchQuery,
            onChange: (e) => handleSearch(e.target.value),
            onFocus: () => searchResults.length > 0 && setShowSearchResults(true),
            className: "w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700 shadow-sm" }, void 0, false
          ), /*#__PURE__*/
          _jsxDEV(Search, { className: "absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400", size: 16 }, void 0, false),
          showSearchResults && /*#__PURE__*/
          _jsxDEV("div", { className: "absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 py-2 max-h-60 overflow-y-auto", children:
            searchResults.map((result) => /*#__PURE__*/
            _jsxDEV("button", {

              onClick: () => {
                navigate(result.path);
                setShowSearchResults(false);
                setSearchQuery('');
              },
              className: "w-full px-4 py-2.5 text-right hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer", children: [/*#__PURE__*/

              _jsxDEV("span", { className: `text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                result.type === 'client' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`, children:

                result.type === 'client' ? 'عروس' : 'فستان' }, void 0, false
              ), /*#__PURE__*/
              _jsxDEV("span", { className: "text-xs font-semibold text-slate-700", children: result.label }, void 0, false)] }, `${result.type}-${result.id}`, true
            )
            ) }, void 0, false
          ),

          isSearching && /*#__PURE__*/
          _jsxDEV("div", { className: "absolute left-3 top-1/2 -translate-y-1/2", children: /*#__PURE__*/
            _jsxDEV("div", { className: "w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" }, void 0, false) }, void 0, false
          )] }, void 0, true

        )] }, void 0, true

      ), /*#__PURE__*/


      _jsxDEV("div", { className: "flex items-center gap-4", children: [/*#__PURE__*/

        _jsxDEV("div", { className: "relative", ref: notifRef, children: [/*#__PURE__*/
          _jsxDEV("button", {
            onClick: () => setIsNotifOpen(!isNotifOpen),
            className: "w-10 h-10 rounded-2xl border border-slate-100/80 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all cursor-pointer relative active:scale-95", children: [/*#__PURE__*/

            _jsxDEV(Bell, { size: 18 }, void 0, false),
            unreadCount > 0 && /*#__PURE__*/
            _jsxDEV("span", { className: "absolute -top-1 -left-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-white animate-bounce", children:
              unreadCount }, void 0, false
            )] }, void 0, true

          ),


          isNotifOpen && (
            <div className="absolute left-0 mt-2.5 w-84 bg-white rounded-3xl border border-slate-100 shadow-xl z-50 overflow-hidden py-1 animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                <span className="text-xs font-extrabold text-slate-800">
                  التنبيهات ({unreadCount})
                </span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-indigo-600 hover:text-indigo-700 font-extrabold cursor-pointer"
                    >
                      قراءة الكل
                    </button>
                  )}
                  {filteredNotifications.length > 0 && (
                    <button
                      onClick={deleteAllNotifications}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-extrabold cursor-pointer flex items-center gap-0.5"
                    >
                      <Trash2 size={11} />
                      مسح الكل
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-50 scrollbar-thin">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notif) => {
                    const ts = typeStyles[notif.type] || typeStyles['info'];
                    const IconComponent = ts.icon;
                    return (
                      <div
                        key={notif.id}
                        onClick={async () => {
                          if (!notif.read) {
                            await toggleNotifStatus(notif.id);
                          }
                          if (notif.page) {
                            navigate(notif.page);
                          }
                          setIsNotifOpen(false);
                        }}
                        className={`p-3.5 flex items-start gap-3 hover:bg-slate-50/50 transition-colors cursor-pointer relative group ${
                          notif.read ? 'opacity-60' : 'bg-indigo-50/5'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ts.bg} ${ts.color}`}>
                          <IconComponent size={14} />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-extrabold text-slate-700 truncate">{notif.title}</p>
                            <div className="flex items-center gap-1.5">
                              {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0"></span>}
                              <button
                                onClick={(e) => deleteNotification(e, notif.id)}
                                className="text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-rose-50"
                                title="حذف الإشعار"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed truncate">{notif.desc}</p>
                          {notif.originalType === 'pickup_reminder' && (
                            <button
                              onClick={(e) => sendWhatsAppReminder(e, notif)}
                              className="mt-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start"
                            >
                              <span>إرسال تذكير واتساب</span>
                            </button>
                          )}
                          <span className="text-[8px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                            <Clock size={10} /> {notif.time}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 text-[11px] font-bold">
                    لا توجد تنبيهات جديدة حالياً
                  </div>
                )}
              </div>
            </div>
          )] }, void 0, true

        ),


        currentUser && /*#__PURE__*/
        _jsxDEV("div", { className: "flex items-center gap-3 border-r border-slate-100 pr-4", children: [/*#__PURE__*/
          _jsxDEV("div", { className: "text-right", children: [/*#__PURE__*/
            _jsxDEV("h4", { className: "text-xs font-extrabold text-slate-800 leading-tight", children: currentUser.name }, void 0, false), /*#__PURE__*/
            _jsxDEV("span", { className: "text-[9px] font-bold text-slate-400", children:
              currentUser.role === 'admin' ? 'مدير النظام' : currentUser.role }, void 0, false
            )] }, void 0, true
          ), /*#__PURE__*/
          _jsxDEV("div", { className: "w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-xs shadow-sm", children:
            currentUser.name?.charAt(0) || 'A' }, void 0, false
          )] }, void 0, true
        )] }, void 0, true

      )] }, void 0, true
    ));

}