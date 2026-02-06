import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Auto-detect URL based on platform
// Android Emulator uses 10.0.2.2 to access host localhost
const DEV_API_URL = Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/api'
    : 'http://localhost:3000/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL || DEV_API_URL;

// Create axios instance
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to inject auth token
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await SecureStore.getItemAsync('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            const branchId = await SecureStore.getItemAsync('selectedBranchId');
            if (branchId) {
                config.headers['X-Branch-ID'] = branchId;
                // Add as query param too just in case
                config.params = { ...config.params, branchId };
            }
        } catch (error) {
            console.error('Error reading token', error);
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
            // Emulate an event or handle logout via a global navigation ref or context
            // For now, we'll let the caller handle it or use a global event emitter
            console.log('Unauthorized access - potential logout trigger');
        }
        return Promise.reject(error);
    }
);

export const api = {
    // Auth
    login: (email: string, password: string) =>
        apiClient.post('/auth/login', { email, password }),

    // Users
    getProfile: () => apiClient.get('/auth/profile'),

    // Dashboard
    getDashboardStats: () => apiClient.get('/analytics/dashboard'),

    // Products
    listProducts: (params?: any) => apiClient.get('/products/list', { params }),
    getByBarcode: (barcode: string) => apiClient.get(`/products/barcode/${barcode}`),

    // Sales
    createSale: (data: any) => apiClient.post('/sales/create', data),

    // Purchase Orders
    listPurchaseOrders: () => apiClient.get('/purchase-orders/list'),

    // Generic
    get: (url: string, params?: any) => apiClient.get(url, { params }),
    post: (url: string, data?: any) => apiClient.post(url, data),
};

export default api;
