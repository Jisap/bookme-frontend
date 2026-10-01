import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import AdminDashboardPage from "./admin/AdminDashboard"
import AdminLoginPage from "./admin/AdminLoginPage"
import AuthPage from "./pages/AuthPage"
import DashboardPage from "./pages/DashboardPage"

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const hasToken = Boolean(localStorage.getItem("token"));

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const hasToken = Boolean(localStorage.getItem("token"));

  if (hasToken) {
    return <Navigate to="/" replace />
  }

  return children;
}


const AdminProtectedRoute = ({ children }) => {
  const hasAdminToken = Boolean(localStorage.getItem("adminToken"));

  if (!hasAdminToken) {
    return <Navigate to={"admin/login"} replace />
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

      <Route path="/admin/login" element={<AdminLoginPage />} />

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

    </Routes>
  )
}

export default App