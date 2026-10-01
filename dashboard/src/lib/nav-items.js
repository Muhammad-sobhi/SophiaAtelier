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
{ icon: HelpCircle, label: 'الأسئلة الشائعة', shortLabel: 'الأسئلة', path: '/dashboard/faqs' }];


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
