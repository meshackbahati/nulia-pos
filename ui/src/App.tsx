import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ModalProvider } from './contexts/ModalContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

// Pages
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import InstallPage from './pages/InstallPage';
import ManagerDashboard from './pages/ManagerDashboard';
import SalesDashboard from './pages/SalesDashboard';
import POSPage from './pages/POSPage';
import ProductsPage from './pages/ProductsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import BranchesPage from './pages/BranchesPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import HeadOfSalesDashboard from './pages/HeadOfSalesDashboard';

function App() {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    // Check if system needs setup
    async function checkSetup() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/install/check`);
        const data = await response.json();
        setNeedsSetup(data.needsSetup || false);
      } catch (error) {
        console.error('Error checking setup:', error);
        setNeedsSetup(true); // Assume needs setup if backend is down
      } finally {
        setLoading(false);
      }
    }

    checkSetup();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ModalProvider>
            <Routes>
            <Route path="/" element={needsSetup ? <Navigate to="/install" /> : <Navigate to="/auth/login" />} />
            <Route path="/install" element={<InstallPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

            {/* Manager & Head of Sales Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                <Layout>
                  <DashboardSwitcher />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/products" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                <Layout><ProductsPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                <Layout><UsersPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/manager/settings" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                <Layout><SettingsPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                <Layout><AnalyticsPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/manager/branches" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout><BranchesPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/manager/suppliers" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                <Layout><SuppliersPage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/manager/purchase-orders" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                <Layout><PurchaseOrdersPage /></Layout>
              </ProtectedRoute>
            } />

            {/* Sales Person Routes */}
            <Route path="/sales-dashboard" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'salesperson']}>
                <SalesDashboard />
              </ProtectedRoute>
            } />

            {/* Shared Routes */}
            <Route path="/pos" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales', 'salesperson']}>
                <Layout><POSPage /></Layout>
              </ProtectedRoute>
            } />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            <Toaster position="top-right" />
          </ModalProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

function DashboardSwitcher() {
  const { user } = useAuth();
  const userRole = user?.role;

  if (userRole === 'head_of_sales') {
    return <HeadOfSalesDashboard />;
  }
  return <ManagerDashboard />;
}

export default App;
