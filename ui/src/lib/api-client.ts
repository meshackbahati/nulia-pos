import axios from 'axios';

const getBaseURL = () => {
    // Production domain
    const PRIMARY_API = 'https://api2.g24sec.com/api';

    if (import.meta.env.DEV) {
        return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    }
    return PRIMARY_API;
};

const API_URL = getBaseURL();

// Create axios instance
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000, // 15s timeout
});

// Fallback Interceptor — removed silent retry to different domain.
// A failed request should surface to the user rather than silently
// retrying against a mirror endpoint, which doubles latency and
// produces confusing "Login Failed" errors on slow connections.

// Add a request interceptor to inject auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add Idempotency Key for mutating requests (POST, PUT, DELETE)
        if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
            config.headers['Idempotency-Key'] = crypto.randomUUID();
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// handle 401 globally
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            window.dispatchEvent(new Event('auth:unauthorized'));
        }
        return Promise.reject(error);
    }
);

// API Methods
export const api = {
    // Auth
    login: (email: string, password: string) =>
        apiClient.post('/auth/login', { email, password }),

    // Installation
    checkInstall: () => apiClient.get('/install/check'),
    setup: (data: any) => apiClient.post('/install/setup', data),
    setupInstall: (data: any) => apiClient.post('/install/setup', data),

    // Users
    createUser: (data: any) => apiClient.post('/users/create', data),
    updateUser: (id: string, data: any) => apiClient.put(`/users/update/${id}`, data),
    listUsers: (params?: any) => apiClient.get('/users/list', { params }),

    // Products
    createProduct: (data: any) => apiClient.post('/products/create', data),
    listProducts: (params?: any) => apiClient.get('/products/list', { params }),
    updateProduct: (id: string, data: any) => apiClient.put(`/products/update/${id}`, data),
    deleteProduct: (id: string) => apiClient.delete(`/products/delete/${id}`),
    getByBarcode: (barcode: string) => apiClient.get(`/products/barcode/${barcode}`),
    searchProduct: (query: string, branchId?: string) => 
        apiClient.get('/products/search', { params: { q: query, branchId } }),
    getLowStock: (threshold?: number) =>
        apiClient.get('/products/low-stock', { params: { threshold } }),
    getCategories: () => apiClient.get('/products/categories'),

    // Inventory
    restockInventory: (data: { items: { productId: string, variantId?: string, quantity: number }[], branchId?: string, reason?: string }) =>
        apiClient.post('/inventory/restock', data),
    adjustInventory: (data: { items: { productId: string, variantId?: string, quantity: number }[], branchId?: string, reason?: string }) =>
        apiClient.post('/inventory/adjust', data),

    // Sales
    createSale: (data: any) => apiClient.post('/sales/create', data),
    searchSales: (params?: any) => apiClient.get('/sales/search', { params }),
    getSale: (id: string) => apiClient.get(`/sales/${id}`),
    listSales: (params?: any) => apiClient.get('/sales/list', { params }),
    deleteSale: (id: string, reason?: string) => apiClient.delete(`/sales/${id}`, { data: { reason } }),
    updateSale: (id: string, data: any) => apiClient.put(`/sales/${id}`, data),

    // M-Pesa
    checkMpesaStatus: (checkoutRequestId: string) =>
        apiClient.get('/mpesa/status', { params: { checkoutRequestId } }),

    // Analytics
    getDashboardStats: () => apiClient.get('/analytics/dashboard'),
    getLeaderboard: (period?: string) =>
        apiClient.get('/analytics/leaderboard', { params: { period } }),
    getTopProducts: (period?: string, limit?: number) =>
        apiClient.get('/analytics/top-products', { params: { period, limit } }),
    getTrends: (period?: string) =>
        apiClient.get('/analytics/trends', { params: { period } }),

    // Branches
    getBranches: (params?: any) => apiClient.get('/branches/list', { params }),
    createBranch: (data: any) => apiClient.post('/branches/create', data),
    updateBranch: (data: any) => apiClient.post('/branches/update', data),
    switchBranch: (branchId: string) => apiClient.post('/auth/switch-branch', { branchId }),

    // Settings
    getSettings: () => apiClient.get('/settings/get'), // Updated to use apiClient
    updateSettings: (data: any) => apiClient.post('/settings/update', data), // Updated to use apiClient and 'data' param
    clearSales: () => apiClient.post('/settings/clear-sales'),
    clearProducts: () => apiClient.post('/settings/clear-products'),

    // Receipts
    emailReceipt: (saleId: string, email: string) => apiClient.post('/receipts/email', { saleId, email }),

    // Suppliers
    getSuppliers: () => apiClient.get('/suppliers/list'),
    createSupplier: (data: any) => apiClient.post('/suppliers/create', data),

    // Purchase Orders
    getPurchaseOrders: () => apiClient.get('/purchase-orders/list'),
    createPurchaseOrder: (data: any) => apiClient.post('/purchase-orders/create', data),
    receivePurchaseOrder: (purchaseOrderId: string) => apiClient.post('/purchase-orders/receive', { purchaseOrderId }),

    // Analytics
    getAnalyticsSummary: (params: any) => apiClient.get('/analytics/summary', { params }),
    getSalesLeaderboard: (params: any) => apiClient.get('/analytics/leaderboard', { params }),
    getBranchLeaderboard: (params: any) => apiClient.get('/analytics/branch-leaderboard', { params }),
    getSalesTrends: (params: any) => apiClient.get('/analytics/trends', { params }),
    getCurrencyBreakdown: (params?: any) => apiClient.get('/analytics/currency-breakdown', { params }),

    // Waste
    getWaste: (params?: any) => apiClient.get('/waste', { params }),
    createWaste: (data: any) => apiClient.post('/waste', data),
    getWasteSummary: () => apiClient.get('/waste/summary'),

    // Tax Rates
    getTaxRates: (params?: any) => apiClient.get('/tax-rates', { params }),
    createTaxRate: (data: any) => apiClient.post('/tax-rates', data),
    updateTaxRate: (id: string, data: any) => apiClient.put(`/tax-rates/${id}`, data),
    deleteTaxRate: (id: string) => apiClient.delete(`/tax-rates/${id}`),

    // Cash Management
    getCashRegisters: (params?: any) => apiClient.get('/cash/register', { params }),
    createCashRegister: (data: any) => apiClient.post('/cash/register', data),
    openCashSession: (data: any) => apiClient.post('/cash/session/open', data),
    closeCashSession: (data: any) => apiClient.post('/cash/session/close', data),
    getActiveSession: (params?: any) => apiClient.get('/cash/session/active', { params }),
    getCashSessions: () => apiClient.get('/cash/sessions'),
    createCashTransaction: (data: any) => apiClient.post('/cash/transaction', data),

    // Expenses
    getExpenses: (params?: any) => apiClient.get('/expenses', { params }),
    createExpense: (data: any) => apiClient.post('/expenses', data),
    approveExpense: (id: string) => apiClient.post(`/expenses/${id}/approve`),
    getExpenseSummary: () => apiClient.get('/expenses/summary'),

    // Customers
    getCustomers: (params?: any) => apiClient.get('/customers', { params }),
    getCustomer: (id: string) => apiClient.get(`/customers/${id}`),
    lookupCustomer: (phone: string) => apiClient.get('/customers/lookup', { params: { phone } }),
    createCustomer: (data: any) => apiClient.post('/customers', data),
    updateCustomer: (id: string, data: any) => apiClient.put(`/customers/${id}`, data),
    createCustomerDeposit: (id: string, data: any) => apiClient.post(`/customers/${id}/deposit`, data),
    getLayaways: (params?: any) => apiClient.get('/customers/layaways', { params }),
    createLayaway: (data: any) => apiClient.post('/customers/layaways', data),
    payLayaway: (id: string, data: any) => apiClient.post(`/customers/layaways/${id}/pay`, data),

    // Returns
    getReturns: (params?: any) => apiClient.get('/returns', { params }),
    getReturn: (id: string) => apiClient.get(`/returns/${id}`),
    createReturn: (data: any) => apiClient.post('/returns', data),
    approveReturn: (id: string, data: any) => apiClient.post(`/returns/${id}/approve`, data),

    // Webhooks
    getWebhooks: (params?: any) => apiClient.get('/webhooks', { params }),
    createWebhook: (data: any) => apiClient.post('/webhooks', data),
    updateWebhook: (id: string, data: any) => apiClient.put(`/webhooks/${id}`, data),
    deleteWebhook: (id: string) => apiClient.delete(`/webhooks/${id}`),
    testWebhook: (id: string) => apiClient.post(`/webhooks/${id}/test`),

    // Integrations
    getIntegrations: (params?: any) => apiClient.get('/integrations', { params }),
    createIntegration: (data: any) => apiClient.post('/integrations', data),
    updateIntegration: (id: string, data: any) => apiClient.put(`/integrations/${id}`, data),
    deleteIntegration: (id: string) => apiClient.delete(`/integrations/${id}`),
    syncIntegration: (id: string, data: any) => apiClient.post(`/integrations/${id}/sync`, data),
    getIntegrationProviders: () => apiClient.get('/integrations/providers'),

    // Bundles
    getBundles: (productId: string) => apiClient.get(`/bundles/${productId}`),
    createBundle: (data: any) => apiClient.post('/bundles', data),
    deleteBundle: (id: string) => apiClient.delete(`/bundles/${id}`),

    // Serial Numbers
    getSerials: (params?: any) => apiClient.get('/serials', { params }),
    createSerials: (data: any) => apiClient.post('/serials', data),
    lookupSerial: (serial: string) => apiClient.get('/serials/lookup', { params: { serial } }),
    getAvailableSerials: (params?: any) => apiClient.get('/serials/available', { params }),

    // Warehouses
    getWarehouses: (params?: any) => apiClient.get('/warehouses', { params }),
    createWarehouse: (data: any) => apiClient.post('/warehouses', data),
    updateWarehouse: (id: string, data: any) => apiClient.put(`/warehouses/${id}`, data),
    createWarehouseZone: (data: any) => apiClient.post('/warehouses/zones', data),
    deleteWarehouseZone: (id: string) => apiClient.delete(`/warehouses/zones/${id}`),
    getWarehouseInventory: (params?: any) => apiClient.get('/warehouses/inventory', { params }),

    // Export
    exportSales: (params?: any) => apiClient.get('/export/sales', { params, responseType: 'blob' }),
    exportInventory: (params?: any) => apiClient.get('/export/inventory', { params, responseType: 'blob' }),
    exportExpenses: (params?: any) => apiClient.get('/export/expenses', { params, responseType: 'blob' }),

    // Generic
    get: (url: string, params?: any) => apiClient.get(url, { params }),
    post: (url: string, data?: any) => apiClient.post(url, data),
    delete: (url: string) => apiClient.delete(url),

    // Upload
    uploadImage: (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        return apiClient.post('/products/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    importProducts: (file: File, branchId?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (branchId) formData.append('branchId', branchId);
        return apiClient.post('/products/import-csv', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
};

export default api;
