import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ExternalLink, Globe, LogOut, Moon, Sun, Check, RotateCcw } from 'lucide-react';
import { apiClient, clearAuth } from '@/lib/api-client';
import { getAllowedMenuItems } from '@/lib/nav-items';
import {
  DEFAULT_MOBILE_TABS,
  MAX_MOBILE_TABS,
  setMobileTabs,
  setTheme,
  useMobileTabs,
  useTheme } from '@/lib/app-preferences';
import { toast } from '@/components/ui/Toast';

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://sophiadresses.cloud';

const ICON_COLORS = ['bg-indigo-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-orange-500', 'bg-teal-500'];

function readCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('atelier_current_employee'));
  } catch {
    return null;
  }
}

function Section({ title, footer, children }) {
  return (
    <section className="mb-6">
      {title && <h2 className="px-4 mb-1.5 text-[11px] font-semibold text-slate-500">{title}</h2>}
      <div className="bg-white rounded-2xl overflow-hidden divide-y divide-slate-100">{children}</div>
      {footer && <p className="px-4 mt-1.5 text-[11px] text-slate-400 leading-relaxed">{footer}</p>}
    </section>);

}

function RowIcon({ icon: Icon, color }) {
  return (
    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${color}`}>
      <Icon size={16} />
    </span>);

}

const rowClass = 'w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-medium active:bg-slate-100 transition-colors';

export default function MorePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(readCurrentUser);
  const theme = useTheme();
  const tabPaths = useMobileTabs();

  useEffect(() => {
    const sync = () => setCurrentUser(readCurrentUser());
    window.addEventListener('auth-change', sync);
    return () => window.removeEventListener('auth-change', sync);
  }, []);

  const allowed = getAllowedMenuItems(currentUser);
  const tabItems = tabPaths.filter((path) => allowed.some((item) => item.path === path));
  const otherItems = allowed.filter((item) => !tabItems.includes(item.path));

  const toggleTab = (path) => {
    if (tabItems.includes(path)) {
      if (tabItems.length === 1) {
        toast.error('يجب أن يبقى قسم واحد على الأقل في الشريط');
        return;
      }
      setMobileTabs(tabItems.filter((p) => p !== path));
      return;
    }
    if (tabItems.length >= MAX_MOBILE_TABS) {
      toast.error(`الحد الأقصى ${MAX_MOBILE_TABS} أقسام، أزل قسماً أولاً`);
      return;
    }
    setMobileTabs([...tabItems, path]);
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // If backend is unreachable, still clear local auth
    }
    clearAuth();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-full bg-slate-100 dark:bg-black px-4 pt-4 pb-8 text-right" dir="rtl">
      <h1 className="text-3xl font-bold text-slate-900 px-1 mb-5">المزيد</h1>

      {currentUser &&
      <Section>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold flex-shrink-0">
              {currentUser.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
            </div>
          </div>
        </Section>
      }

      {otherItems.length > 0 &&
      <Section title="الأقسام">
          {otherItems.map((item, i) =>
        <Link key={item.path} to={item.path} className={`${rowClass} text-slate-800`}>
              <RowIcon icon={item.icon} color={ICON_COLORS[i % ICON_COLORS.length]} />
              <span className="flex-1 truncate">{item.label}</span>
              <ChevronLeft size={18} className="text-slate-300" />
            </Link>
        )}
        </Section>
      }

      <Section>
        <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className={`${rowClass} text-slate-800`}>
          <RowIcon icon={Globe} color="bg-slate-900" />
          <span className="flex-1 text-indigo-600">فتح الموقع</span>
          <ExternalLink size={16} className="text-indigo-600" />
        </a>
      </Section>

      <Section title="المظهر">
        <div className="p-2">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl" role="radiogroup" aria-label="المظهر">
            {[
            { value: 'light', label: 'فاتح', icon: Sun },
            { value: 'dark', label: 'داكن', icon: Moon }].
            map(({ value, label, icon: Icon }) =>
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => setTheme(value)}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              theme === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`
              }>
                <Icon size={16} />
                {label}
              </button>
            )}
          </div>
        </div>
      </Section>

      <Section
        title={`الشريط السفلي (${tabItems.length}/${MAX_MOBILE_TABS})`}
        footer="اختر حتى 4 أقسام تظهر في الشريط السفلي بالترتيب الذي تختاره. باقي الأقسام تظهر هنا في صفحة المزيد.">
        {allowed.map((item) => {
          const position = tabItems.indexOf(item.path);
          const selected = position !== -1;
          return (
            <button key={item.path} type="button" onClick={() => toggleTab(item.path)} className={`${rowClass} cursor-pointer text-slate-800`} aria-pressed={selected}>
              <item.icon size={18} className={selected ? 'text-indigo-600' : 'text-slate-400'} />
              <span className="flex-1 truncate">{item.label}</span>
              {selected ?
              <span className="flex items-center gap-1.5 text-indigo-600">
                  <span className="text-[11px] font-bold">{position + 1}</span>
                  <Check size={18} />
                </span> :

              <span className="w-[18px]" />
              }
            </button>);

        })}
        <button type="button" onClick={() => setMobileTabs(DEFAULT_MOBILE_TABS)} className={`${rowClass} cursor-pointer text-indigo-600`}>
          <RotateCcw size={18} />
          <span className="flex-1">استعادة الترتيب الافتراضي</span>
        </button>
      </Section>

      <Section>
        <button type="button" onClick={handleLogout} className={`${rowClass} cursor-pointer text-rose-600 justify-center`}>
          <LogOut size={18} />
          <span>تسجيل الخروج</span>
        </button>
      </Section>
    </div>);

}
