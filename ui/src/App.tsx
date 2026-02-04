import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import './index.css';

// Pages
import LoginPage from './pages/LoginPage';
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
          <Routes>
            <Route path="/" element={needsSetup ? <Navigate to="/install" /> : <Navigate to="/auth/login" />} />
            <Route path="/install" element={<InstallPage />} />
            <Route path="/auth/login" element={<LoginPage />} />

            {/* Manager Routes */}
            <Route path="/dashboard" element={<ManagerDashboard />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/manager/settings" element={<SettingsPage />} />
            <Route path="/manager/analytics" element={<AnalyticsPage />} />
            <Route path="/manager/branches" element={<BranchesPage />} />
            <Route path="/manager/suppliers" element={<SuppliersPage />} />
            <Route path="/manager/purchase-orders" element={<PurchaseOrdersPage />} />

            {/* Sales Person Routes */}
            <Route path="/sales-dashboard" element={<SalesDashboard />} />

            {/* Shared Routes */}
            <Route path="/pos" element={<POSPage />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <Toaster position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
