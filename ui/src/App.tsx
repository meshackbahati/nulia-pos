import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ModalProvider } from './contexts/ModalContext';
import { HardwareProvider } from './contexts/HardwareContext';
import { Toaster, toast } from 'react-hot-toast';
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
import InventoryTransferPage from './pages/InventoryTransferPage';
import HeadOfSalesDashboard from './pages/HeadOfSalesDashboard';
import SalesHistoryPage from './pages/SalesHistoryPage';
import IntegrationsPage from './pages/IntegrationsPage';
import CustomersPage from './pages/CustomersPage';
import ReturnsPage from './pages/ReturnsPage';
import CashManagementPage from './pages/CashManagementPage';
import ExpensesPage from './pages/ExpensesPage';
import WastePage from './pages/WastePage';
import WarehousesPage from './pages/WarehousesPage';
import SerialsPage from './pages/SerialsPage';

function RootRedirect({ needsSetup }: { needsSetup: boolean }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return null;
  if (needsSetup) return <Navigate to="/install" replace />;
  
  if (user) {
    if (user.role === 'salesperson') return <Navigate to="/sales-dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to="/auth/login" replace />;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  async function checkSetup() {
    // Check if user is already logged in (local session)
    const hasToken = !!localStorage.getItem('token') || document.cookie.includes('token=');

    const primaryApi = import.meta.env.VITE_API_URL || 'https://retailpro-api.vercel.app/api';

    const tryFetch = async (url: string) => {
      const response = await fetch(`${url}/install/check`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Backend error');
      return response.json();
    };

    try {
      let data;
      data = await tryFetch(primaryApi);
      
      setNeedsSetup(data.needsSetup || false);
      
      if (hasToken) {
        toast.success('System Online. Syncing...', { id: 'sync-status', duration: 3000 });
      }
    } catch (error) {
      console.error('Error checking setup:', error);
      
      // Always let the app load — login page should be accessible even when backend is down.
      // The user will see connection errors when they try to authenticate.
      if (hasToken) {
        toast('Offline mode. Data will sync when back online.', { 
          icon: '⚠️', 
          duration: 6000,
          id: 'sync-status' 
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkSetup();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4 border-primary"></div>
          <p className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">Initializing RetailPro Core...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <ModalProvider>
            <HardwareProvider>
              <Routes>
              <Route path="/" element={<RootRedirect needsSetup={needsSetup} />} />
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
                <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales', 'salesperson']}>
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

              <Route path="/manager/inventory-transfer" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                  <Layout><InventoryTransferPage /></Layout>
                </ProtectedRoute>
              } />

              <Route path="/sales-history" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales', 'salesperson']}>
                  <Layout><SalesHistoryPage /></Layout>
                </ProtectedRoute>
              } />

              {/* Sales Person Routes */}
              <Route path="/sales-dashboard" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'salesperson']}>
                  <SalesDashboard />
                </ProtectedRoute>
              } />

              {/* New Feature Routes */}
              <Route path="/customers" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales', 'salesperson']}>
                  <Layout><CustomersPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/returns" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                  <Layout><ReturnsPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/expenses" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                  <Layout><ExpensesPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/waste" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                  <Layout><WastePage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/cash" element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Layout><CashManagementPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/serials" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                  <Layout><SerialsPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/warehouses" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales']}>
                  <Layout><WarehousesPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/integrations" element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Layout><IntegrationsPage /></Layout>
                </ProtectedRoute>
              } />

              {/* Shared Routes */}
              <Route path="/pos" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales', 'salesperson']}>
                  <Layout noScroll><POSPage /></Layout>
                </ProtectedRoute>
              } />

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </HardwareProvider>
            <Toaster position="top-right" />
          </ModalProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
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
