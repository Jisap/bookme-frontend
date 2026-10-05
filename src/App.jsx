import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import AdminDashboardPage from "./admin/AdminDashboard"
import AdminLoginPage from "./admin/AdminLoginPage"
import AuthPage from "./pages/AuthPage"
import DashboardPage from "./pages/DashboardPage"
import ProfilePage from "./pages/ProfilePage"
import BookingsPage from "./pages/BookingPage"
import PublicBookingPage from "./pages/PublicBookingPage"
import BookingSuccessPage from "./pages/BookingSuccessPage"
import BookingCancelledPage from "./pages/BookingCancelledPage"
import PaymentsPage from "./pages/PaymentsPage"
import ServicesPage from "./pages/ServicesPage"
import AvailabilityPage from "./pages/AvailabilityPage"
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage"
import TermsOfServicePage from "./pages/TermsOfServicePage"

export const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const hasToken = Boolean(localStorage.getItem("token"));

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export const PublicOnlyRoute = ({ children }) => {
  const hasToken = Boolean(localStorage.getItem("token"));

  if (hasToken) {
    return <Navigate to="/" replace />
  }

  return children;
}


export const AdminProtectedRoute = ({ children }) => {
  const hasAdminToken = Boolean(localStorage.getItem("adminToken"));

  if (!hasAdminToken) {
    return <Navigate to="/admin/login" replace />
  }
  return children;
}

export const AdminPublicOnlyRoute = ({ children }) => {
  const hasAdminToken = Boolean(localStorage.getItem("adminToken"));

  if (hasAdminToken) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return children;
}

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicOnlyRoute>
          <AuthPage />
        </PublicOnlyRoute>
      }

      />

      <Route path="/admin/login" element={
        <AdminPublicOnlyRoute>
          <AdminLoginPage />
        </AdminPublicOnlyRoute>
      } />

      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      <Route path="/admin/dashboard" element={
        <AdminProtectedRoute>
          <AdminDashboardPage />
        </AdminProtectedRoute>
      } />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <BookingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="/book/:slug" element={<PublicBookingPage />} />

      <Route path="/booking/success" element={<BookingSuccessPage />} />
      <Route path="/booking/cancelled" element={<BookingCancelledPage />} />

      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <PaymentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/services"
        element={
          <ProtectedRoute>
            <ServicesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/availability"
        element={
          <ProtectedRoute>
            <AvailabilityPage />
          </ProtectedRoute>
        }
      />

      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />

      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  )
}

export default App
