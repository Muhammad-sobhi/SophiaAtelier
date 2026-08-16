import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Gem,
  Calendar,
  Ruler,
  CheckSquare,
  DollarSign,
  UserCheck,
  BarChart3,
  LogOut,
  X,
  MessageSquare,
  Mail,
  Clock,
  Star,
  HelpCircle,
  Layers,
  Image as ImageIcon } from
'lucide-react';

const menuItems = [
{ icon: LayoutDashboard, label: 'لوحة التحكم', path: '/dashboard' },
{ icon: Users, label: 'العرائس', path: '/dashboard/brides' },
{ icon: Gem, label: 'الفساتين', path: '/dashboard/dresses' },
{ icon: Layers, label: 'التشكيلات', path: '/dashboard/collections' },
{ icon: ImageIcon, label: 'معرض العملاء', path: '/dashboard/client-gallery' },
{ icon: Calendar, label: 'المواعيد', path: '/dashboard/appointments' },
{ icon: Ruler, label: 'القياسات', path: '/dashboard/fittings' },
{ icon: CheckSquare, label: 'المهام', path: '/dashboard/tasks' },
{ icon: DollarSign, label: 'المالية', path: '/dashboard/finance' },
{ icon: UserCheck, label: 'الموظفين', path: '/dashboard/employees' },
{ icon: Clock, label: 'الحضور والرواتب', path: '/dashboard/attendance' },
{ icon: BarChart3, label: 'التقارير', path: '/dashboard/reports' },
{ icon: MessageSquare, label: 'قوالب الرسائل', path: '/dashboard/whatsapp-templates' },
{ icon: Mail, label: 'رسائل تواصل معنا', path: '/dashboard/contact-messages' },
{ icon: Star, label: 'آراء العملاء', path: '/dashboard/reviews' },
{ icon: HelpCircle, label: 'الأسئلة الشائعة', path: '/dashboard/faqs' }];


export function Sidebar({ onClose }) {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('atelier_current_employee');
      if (userStr) {
        try {
          setCurrentUser(JSON.parse(userStr));
        } catch (e) {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    };

    checkAuth();
    window.addEventListener('auth-change', checkAuth);
    return () => {
      window.removeEventListener('auth-change', checkAuth);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const { apiClient } = await import('@/lib/api-client');
      await apiClient.post('/auth/logout', {});
    } catch (e) {

      // If backend is unreachable, still clear local auth
    }localStorage.removeItem('atelier_current_employee');
    localStorage.removeItem('atelier_auth_token');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/dashboard');
  };

  // Filter menu items by permissions
  const filteredMenuItems = menuItems.filter((item) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.permissions?.includes('*')) {
      return true;
    }
    if (item.path === '/dashboard' || item.path === '/dashboard/faqs') {
      return true;
    }
    return currentUser.permissions?.includes(item.path);
  });

  return (
    <div className="w-64 bg-white flex flex-col h-full border-l border-slate-100 text-right overflow-hidden select-none" dir="rtl">
      {/* Logo */}
      <div className="p-4 flex items-center justify-between border-b border-slate-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200">
            <span className="text-white font-extrabold text-lg">S</span>
          </div>
          <div>
            <h1 className="text-[#1e293b] font-extrabold text-base leading-tight">Sophia Dresses OS</h1>
            <p className="text-slate-400 text-xs font-semibold">نظام إدارة فساتين صوفيا</p>
          </div>
        </div>
        {onClose &&
        <button
          onClick={onClose}
          className="md:hidden p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
          
            <X size={18} />
          </button>
        }
      </div>

      {/* Navigation - Vertical scroll enabled when items exceed height */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto min-h-0">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || item.path !== '/dashboard' && pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => onClose && onClose()}
                  className={`relative flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all duration-200 text-xs font-bold ${
                  isActive ?
                  'bg-indigo-50/90 text-indigo-600 shadow-xs' :
                  'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`
                  }>
                  <span className={`absolute right-0 top-1/4 bottom-1/4 w-1 bg-indigo-600 rounded-l-md transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                  <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>);

          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-3.5 border-t border-slate-50 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 rounded-xl transition-all duration-200 text-xs font-bold cursor-pointer">
          
          <LogOut size={18} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>);

}