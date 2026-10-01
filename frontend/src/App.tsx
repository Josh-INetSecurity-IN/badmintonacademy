import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/useAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:id" element={<StudentDetailPage />} />
        <Route path="coaching-batches" element={<CoachingBatchesPage />} />
        <Route path="coaching-batches/:id" element={<BatchDetailPage />} />
        <Route path="regular-batches" element={<RegularBatchesPage />} />
        <Route path="regular-players" element={<RegularPlayersPage />} />
        <Route path="regular-players/:id" element={<RegularPlayerDetailPage />} />
        <Route path="guest-players" element={<GuestBookingsPage />} />
        <Route path="courts" element={<CourtsPage />} />
        <Route path="batch-calendar" element={<BatchCalendarPage />} />
        <Route path="court-schedule" element={<CourtSchedulePage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="tournaments" element={<TournamentsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="website" element={<WebsiteContentPage />} />
        <Route path="enquiries" element={<EnquiriesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

import LoginPage from '@/pages/auth/LoginPage';
import AdminLayout from '@/layouts/AdminLayout';
import DashboardPage from '@/pages/admin/DashboardPage';
import StudentsPage from '@/pages/admin/StudentsPage';
import StudentDetailPage from '@/pages/admin/StudentDetailPage';
import CoachingBatchesPage from '@/pages/admin/CoachingBatchesPage';
import BatchDetailPage from '@/pages/admin/BatchDetailPage';
import RegularBatchesPage from '@/pages/admin/RegularBatchesPage';
import RegularPlayersPage from '@/pages/admin/RegularPlayersPage';
import RegularPlayerDetailPage from '@/pages/admin/RegularPlayerDetailPage';
import GuestBookingsPage from '@/pages/admin/GuestBookingsPage';
import CourtsPage from '@/pages/admin/CourtsPage';
import BatchCalendarPage from '@/pages/admin/BatchCalendarPage';
import CourtSchedulePage from '@/pages/admin/CourtSchedulePage';
import AttendancePage from '@/pages/admin/AttendancePage';
import FeesPage from '@/pages/admin/FeesPage';
import PaymentsPage from '@/pages/admin/PaymentsPage';
import SubscriptionsPage from '@/pages/admin/SubscriptionsPage';
import SalesPage from '@/pages/admin/SalesPage';
import ProductsPage from '@/pages/admin/ProductsPage';
import TournamentsPage from '@/pages/admin/TournamentsPage';
import ReportsPage from '@/pages/admin/ReportsPage';
import WebsiteContentPage from '@/pages/admin/WebsiteContentPage';
import EnquiriesPage from '@/pages/admin/EnquiriesPage';
import UsersPage from '@/pages/admin/UsersPage';
import NotificationsPage from '@/pages/admin/NotificationsPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import LandingPage from '@/pages/public/LandingPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}