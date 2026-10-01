import { Link, useLocation } from 'react-router-dom';
import { Ellipsis } from 'lucide-react';
import { getAllowedMenuItems, isMenuItemActive } from '@/lib/nav-items';
import { useMobileTabs } from '@/lib/app-preferences';

export const MORE_PATH = '/dashboard/more';

// iOS-style bottom tab bar, shown on small screens only
export function MobileTabBar({ currentUser }) {
  const { pathname } = useLocation();
  const tabPaths = useMobileTabs();
  const allowed = getAllowedMenuItems(currentUser);
  const tabs = tabPaths.map((path) => allowed.find((item) => item.path === path)).filter(Boolean);
  const isTabActive = tabs.some((item) => isMenuItemActive(item, pathname)) && !pathname.startsWith(MORE_PATH);

  const renderTab = (to, Icon, label, active) => (
    <Link
      key={to}
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 pt-1.5 pb-1 text-[10px] font-semibold transition-colors ${
      active ? 'text-indigo-600' : 'text-slate-400'}`
      }>
      <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
      <span className="truncate max-w-full px-1">{label}</span>
    </Link>);

  return (
    <nav
      className="md:hidden flex-shrink-0 flex items-stretch bg-white/90 backdrop-blur-xl border-t border-slate-200/80 pb-[env(safe-area-inset-bottom)] select-none"
      dir="rtl"
      aria-label="التنقل الرئيسي">
      {tabs.map((item) => renderTab(item.path, item.icon, item.shortLabel || item.label, isMenuItemActive(item, pathname)))}
      {renderTab(MORE_PATH, Ellipsis, 'المزيد', pathname.startsWith(MORE_PATH) || !isTabActive)}
    </nav>);

}
