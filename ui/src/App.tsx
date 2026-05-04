import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ModalProvider } from './contexts/ModalContext';
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
import HeadOfSalesDashboard from './pages/HeadOfSalesDashboard';

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
  const [connectionError, setConnectionError] = useState(false);

  async function checkSetup() {
    // Check if user is already logged in (local session)
    const hasToken = !!localStorage.getItem('token') || document.cookie.includes('token=');

    try {
      // Use the actual API URL
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api2.g24sec.space/api';
      const response = await fetch(`${apiUrl}/install/check`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Backend error');
      
      const data = await response.json();
      setNeedsSetup(data.needsSetup || false);
      
      if (hasToken) {
        toast.success('System Online. Syncing...', { id: 'sync-status', duration: 3000 });
      }
    } catch (error) {
      console.error('Error checking setup:', error);
      
      if (hasToken) {
        toast('Offline mode. Data will sync when back online.', { 
          icon: '⚠️', 
          duration: 6000,
          id: 'sync-status' 
        });
        setConnectionError(false);
      } else {
        setConnectionError(true);
        toast.error('Cannot reach server.', { duration: 5000 });
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

  if (connectionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center p-8 glass-card max-w-md mx-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Connection Error</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Unable to connect to the central server.
          </p>
          <button 
            onClick={checkSetup}
            className="w-full py-3 px-4 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-black uppercase text-xs tracking-widest"
          >
            Retry Connection
          </button>
        </div>
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <ModalProvider>
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
                <Layout noScroll><POSPage /></Layout>
              </ProtectedRoute>
            } />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
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
