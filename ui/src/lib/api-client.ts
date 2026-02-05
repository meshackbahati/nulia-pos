import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to inject auth token and branch ID
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        const branchId = localStorage.getItem('selectedBranchId');
        if (branchId) {
            config.headers['X-Branch-ID'] = branchId;
            config.params = { ...config.params, branchId }; // Also add as query param for easier backend access if needed
        }

        return config;
    },
    (error) => {
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
    listUsers: (params?: any) => apiClient.get('/users/list', { params }),

    // Products
    createProduct: (data: any) => apiClient.post('/products/create', data),
    listProducts: (params?: any) => apiClient.get('/products/list', { params }),
    updateProduct: (id: string, data: any) => apiClient.put(`/products/update/${id}`, data),
    deleteProduct: (id: string) => apiClient.delete(`/products/delete/${id}`),
    getByBarcode: (barcode: string) => apiClient.get(`/products/barcode/${barcode}`),
    getLowStock: (threshold?: number) =>
        apiClient.get('/products/low-stock', { params: { threshold } }),

    // Inventory
    restockInventory: (data: { items: { productId: string, variantId?: string, quantity: number }[], branchId?: string, reason?: string }) =>
        apiClient.post('/inventory/restock', data),

    // Sales
    createSale: (data: any) => apiClient.post('/sales/create', data),

    // M-Pesa
    checkMpesaStatus: (checkoutRequestId: string) =>
        apiClient.get('/mpesa/status', { params: { checkoutRequestId } }),
    listSales: (params?: any) => apiClient.get('/sales/list', { params }),

    // Analytics
    getDashboardStats: () => apiClient.get('/analytics/dashboard'),
    getLeaderboard: (period?: string) =>
        apiClient.get('/analytics/leaderboard', { params: { period } }),
    getTopProducts: (period?: string, limit?: number) =>
        apiClient.get('/analytics/top-products', { params: { period, limit } }),
    getTrends: (period?: string) =>
        apiClient.get('/analytics/trends', { params: { period } }),

    // Branches
    getBranches: () => apiClient.get('/branches/list'),
    createBranch: (data: any) => apiClient.post('/branches/create', data),
    updateBranch: (data: any) => apiClient.post('/branches/update', data),

    // Settings
    getSettings: () => apiClient.get('/settings/get'), // Updated to use apiClient
    updateSettings: (data: any) => apiClient.post('/settings/update', data), // Updated to use apiClient and 'data' param

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

    // Generic
    get: (url: string, params?: any) => apiClient.get(url, { params }),
    post: (url: string, data?: any) => apiClient.post(url, data),

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
