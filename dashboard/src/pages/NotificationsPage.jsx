import { Bell, Check, Clock, AlertCircle } from 'lucide-react';

const notifications = [
{ id: 1, title: 'زيارة جديدة مسجلة', desc: 'سارة أحمد سجلت زيارة استشارية للقياس', time: 'منذ 5 دقائق', read: false, type: 'info' },
{ id: 2, title: 'حجز فستان جديد', desc: 'نورة محمد حجزت فستان السهرة ذهبي', time: 'منذ 15 دقيقة', read: false, type: 'success' },
{ id: 3, title: 'مهام متأخرة', desc: '3 مهام تجاوزت تاريخ استحقاقها المحدد', time: 'منذ ساعة', read: false, type: 'warning' },
{ id: 4, title: 'دفعة مستلمة', desc: 'تم استلام دفعة من فاطمة العلي - 18,000 ج.م', time: 'منذ ساعتين', read: true, type: 'success' },
{ id: 5, title: 'بروفة قادمة', desc: 'بروفة مريم خالد غداً الساعة 2:00 م', time: 'منذ 3 ساعات', read: true, type: 'info' },
{ id: 6, title: 'تنبيه صيانة', desc: 'فستان الناعم وردي يحتاج صيانة عاجلة للبطانة', time: 'منذ يوم', read: true, type: 'warning' }];


const typeStyles = {
  info: { icon: Bell, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  success: { icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  warning: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' }
};

export default function NotificationsPage() {
  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      <h1 className="text-lg font-extrabold text-slate-800">التنبيهات والإشعارات</h1>

      <div className="space-y-4">
        {notifications.map((notif) => {
          const ts = typeStyles[notif.type] || typeStyles['info'];
          const Icon = ts.icon;
          return (
            <div
              key={notif.id}
              className={`bg-white rounded-3xl p-5 border transition-all duration-300 hover:shadow-md cursor-pointer ${
              notif.read ? 'border-slate-50' : 'border-indigo-100 bg-indigo-50/10'}`
              }>
              
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${ts.bg} ${ts.color} shadow-sm`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-extrabold text-xs ${notif.read ? 'text-slate-400' : 'text-slate-800'}`}>
                      {notif.title}
                    </h3>
                    {!notif.read && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></div>}
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1.5 leading-relaxed">{notif.desc}</p>
                  <div className="flex items-center gap-1 mt-3 text-[10px] text-slate-400 font-bold">
                    <Clock size={12} className="text-slate-300" /> <span>{notif.time}</span>
                  </div>
                </div>
              </div>
            </div>);

        })}
      </div>
    </div>);

}