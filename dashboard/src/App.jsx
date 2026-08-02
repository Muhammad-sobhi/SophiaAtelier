import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DirectionProvider } from './providers';

import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './pages/DashboardHome';

const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const BridesPage = lazy(() => import('./pages/BridesPage'));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'));
const ClientGalleryPage = lazy(() => import('./pages/ClientGalleryPage'));
const ContactMessagesPage = lazy(() => import('./pages/ContactMessagesPage'));
const DressesPage = lazy(() => import('./pages/DressesPage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const FittingsPage = lazy(() => import('./pages/FittingsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const FaqsPage = lazy(() => import('./pages/FaqsPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const VisitsPage = lazy(() => import('./pages/VisitsPage'));
const WhatsappTemplatesPage = lazy(() => import('./pages/WhatsappTemplatesPage'));

const PageFallback = () => (
  <div className="flex items-center justify-center p-12 text-slate-400 text-xs font-semibold" dir="rtl">
    جاري تحميل الصفحة...
  </div>
);

export default function App() {
  return (
    <DirectionProvider>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="brides" element={<BridesPage />} />
            <Route path="collections" element={<CollectionsPage />} />
            <Route path="client-gallery" element={<ClientGalleryPage />} />
            <Route path="contact-messages" element={<ContactMessagesPage />} />
            <Route path="dresses" element={<DressesPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="fittings" element={<FittingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="faqs" element={<FaqsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="visits" element={<VisitsPage />} />
            <Route path="whatsapp-templates" element={<WhatsappTemplatesPage />} />
          </Route>
        </Routes>
      </Suspense>
    </DirectionProvider>
  );
}