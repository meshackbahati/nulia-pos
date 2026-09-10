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
import LandingPage from './pages/LandingPage';
import AppLandingPage from './pages/AppLandingPage';
import SignupPage from './pages/SignupPage';
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
import HelpPage from './pages/HelpPage';
import WalletPage from './pages/WalletPage';
import ContactPage from './pages/ContactPage';
import SupportPage from './pages/SupportPage';

function isNativeApp() {
  try {
    // @ts-ignore
    if (window.Capacitor?.isNativePlatform?.()) return true;
    // @ts-ignore
    if (window.electron || navigator.userAgent.includes('Electron')) return true;
    // Electron via userAgent
    if (navigator.userAgent.includes('Electron')) return true;
  } catch {}
  return false;
}

function RootRedirect(_props?: { needsSetup?: boolean }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) {
    if (user.role === 'salesperson') return <Navigate to="/sales-dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  // Not authenticated: show landing - apps get totally different landing from website
  if (isNativeApp()) return <AppLandingPage />;
  return <LandingPage />;
}

function GoogleTranslate() {
  const [lang, setLang] = useState<'en' | 'sw'>(() => {
    const m = document.cookie.match(/googtrans=\/en\/(en|sw)/);
    return (m?.[1] as 'en' | 'sw') || 'en';
  });
  useEffect(() => {
    const id = 'google-translate-script';
    if (!document.getElementById(id)) {
      (window as any).googleTranslateElementInit = () => {
        // @ts-ignore
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: 'en', includedLanguages: 'en,sw', autoDisplay: false },
          'google_translate_element_hidden'
        );
      };
      const s = document.createElement('script');
      s.id = id;
      s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);
  const switchLang = (next: 'en' | 'sw') => {
    setLang(next);
    document.cookie = `googtrans=/en/${next}; path=/`;
    document.cookie = `googtrans=/en/${next}; domain=${window.location.hostname}; path=/`;
    window.location.reload();
  };
  return (
    <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-full p-1 shadow-sm">
      <button onClick={() => switchLang('en')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${lang === 'en' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>
        <span className="text-[11px]">🇬🇧</span> EN
      </button>
      <button onClick={() => switchLang('sw')} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${lang === 'sw' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>
        <span className="text-[11px]">🇰🇪</span> SW
      </button>
      <div id="google_translate_element_hidden" className="hidden" />
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(true);
  const [_needsSetup, setNeedsSetup] = useState(false);
  void _needsSetup;

  async function checkSetup() {
    // Check if user is already logged in (local session)
    const hasToken = !!localStorage.getItem('token') || document.cookie.includes('token=');

    const primaryApi = import.meta.env.VITE_API_URL || 'https://api-nulia-prop.vercel.app/api';

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
      
      // Always let the app load - login page should be accessible even when backend is down.
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
      <div className="flex items-center justify-center min-h-screen bg-[#fdfbf7] dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-end gap-1.5 h-12">
            <div className="w-2.5 bg-zinc-900 dark:bg-white rounded-full animate-[graph_0.9s_ease-in-out_infinite]" style={{ height: '18px', animationDelay: '0ms' }}></div>
            <div className="w-2.5 bg-emerald-600 rounded-full animate-[graph_0.9s_ease-in-out_infinite]" style={{ height: '32px', animationDelay: '120ms' }}></div>
            <div className="w-2.5 bg-zinc-900 dark:bg-white rounded-full animate-[graph_0.9s_ease-in-out_infinite]" style={{ height: '24px', animationDelay: '240ms' }}></div>
            <div className="w-2.5 bg-emerald-600 rounded-full animate-[graph_0.9s_ease-in-out_infinite]" style={{ height: '38px', animationDelay: '360ms' }}></div>
          </div>
          <style>{`@keyframes graph { 0%,100% { transform: scaleY(0.6); opacity: 0.9 } 50% { transform: scaleY(1); opacity: 1 } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="fixed bottom-3 right-3 z-[100]">
        <GoogleTranslate />
      </div>
      <ThemeProvider>
        <AuthProvider>
          <ModalProvider>
            <HardwareProvider>
              <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/install" element={<InstallPage />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/support" element={<SupportPage />} />
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
                <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales', 'salesperson']}>
                  <Layout><SettingsPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'head_of_sales', 'salesperson']}>
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
              <Route path="/wallet" element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Layout><WalletPage /></Layout>
                </ProtectedRoute>
              } />
              {/* Help Guide — public, no auth required; app opens external browser via HelpPage itself */}
              <Route path="/help" element={<HelpPageWrapper />} />
              {/* Nulia Ops is now separate subdirectory at project root: nulia-ops/ (same backend, super_admin only) — not merged into ui */}

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

function HelpPageWrapper(){
  const { user } = useAuth();
  if(user) return <Layout><HelpPage /></Layout>;
  return <HelpPage />;
}

export default App;
