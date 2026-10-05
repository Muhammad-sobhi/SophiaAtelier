import {
  LayoutDashboard,
  Users,
  Gem,
  Ruler,
  CheckSquare,
  DollarSign,
  UserCheck,
  BarChart3,
  MessageSquare,
  Mail,
  Clock,
  Star,
  HelpCircle,
  Layers,
  ShieldCheck,
  Factory,
  Settings,
  Image as ImageIcon } from 'lucide-react';

export const menuItems = [
{ icon: LayoutDashboard, label: 'لوحة التحكم', shortLabel: 'الرئيسية', path: '/dashboard' },
{ icon: Users, label: 'العرائس', path: '/dashboard/brides' },
{ icon: Gem, label: 'الفساتين', path: '/dashboard/dresses' },
{ icon: Layers, label: 'التشكيلات', path: '/dashboard/collections' },
{ icon: ImageIcon, label: 'معرض العملاء', shortLabel: 'المعرض', path: '/dashboard/client-gallery' },
{ icon: Ruler, label: 'القياسات', path: '/dashboard/fittings' },
{ icon: CheckSquare, label: 'المهام', path: '/dashboard/tasks' },
{ icon: DollarSign, label: 'المالية', path: '/dashboard/finance' },
{ icon: Factory, label: 'التصنيع', path: '/dashboard/manufacturing' },
{ icon: UserCheck, label: 'الموظفين', path: '/dashboard/employees' },
{ icon: Clock, label: 'الحضور والرواتب', shortLabel: 'الحضور', path: '/dashboard/attendance' },
{ icon: BarChart3, label: 'التقارير', path: '/dashboard/reports' },
{ icon: ShieldCheck, label: 'سجل النشاطات', shortLabel: 'السجل', path: '/dashboard/logs', adminOnly: true },
{ icon: MessageSquare, label: 'قوالب الرسائل', shortLabel: 'القوالب', path: '/dashboard/whatsapp-templates' },
{ icon: Mail, label: 'رسائل تواصل معنا', shortLabel: 'الرسائل', path: '/dashboard/contact-messages' },
{ icon: Star, label: 'آراء العملاء', shortLabel: 'الآراء', path: '/dashboard/reviews' },
{ icon: HelpCircle, label: 'الأسئلة الشائعة', shortLabel: 'الأسئلة', path: '/dashboard/faqs' },
{ icon: Settings, label: 'إعدادات النظام', shortLabel: 'الإعدادات', path: '/dashboard/settings', adminOnly: true }];


// Pages an employee can be granted in the employees page (the dashboard home is always allowed).
// Visits and bookings have their own pages outside the menu.
export const PERMISSION_PAGES = [
...menuItems.filter((item) => item.path !== '/dashboard' && !item.adminOnly).map(({ path, label }) => ({ path, label })),
{ path: '/dashboard/visits', label: 'الزيارات' },
{ path: '/dashboard/bookings', label: 'الحجوزات' },
{ path: '/dashboard/shop', label: 'المحل 3D (اللعبة)' }];


// Actions beyond page access; the API enforces them too (admins always have them)
export const PERMISSION_ACTIONS = [
{ key: 'payroll.manage', label: 'صرف الرواتب وتسجيل السلف', hint: 'من صفحة الحضور والرواتب، ويُسجَّل الصرف في المالية' }];


const isFullAccess = (user) => user.role === 'admin' || user.role === 'owner' || user.permissions?.includes('*');

// Whether the user may open the given dashboard path (paths that are not grantable pages are open to all)
export function canAccessPath(currentUser, pathname) {
  if (!currentUser) return false;
  const page = PERMISSION_PAGES.find((p) => pathname === p.path || pathname.startsWith(`${p.path}/`));
  if (!page || isFullAccess(currentUser) || page.path === '/dashboard/faqs') return true;
  return Boolean(currentUser.permissions?.includes(page.path));
}

// Menu items the given user is allowed to open
export function getAllowedMenuItems(currentUser) {
  if (!currentUser) return [];
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'owner';
  return menuItems.filter((item) => {
    if (item.adminOnly) {
      return isAdmin;
    }
    if (isAdmin || currentUser.permissions?.includes('*')) {
      return true;
    }
    if (item.path === '/dashboard' || item.path === '/dashboard/faqs') {
      return true;
    }
    return currentUser.permissions?.includes(item.path);
  });
}

export function isMenuItemActive(item, pathname) {
  return pathname === item.path || item.path !== '/dashboard' && pathname.startsWith(item.path);
}
