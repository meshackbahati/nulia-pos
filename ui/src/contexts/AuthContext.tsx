import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api-client';
import { persistSession, clearSession, getCookie } from '../lib/cookie-utils';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'manager' | 'head_of_sales' | 'salesperson';
    branchId?: string;
    branch?: {
        id: string;
        name: string;
        currency: string;
        currencySymbol: string;
        exchangeRate?: number;
    };
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    switchBranch: (branchId: string) => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const initializeAuth = () => {
            // Check for existing session (localStorage first, then cookie fallback)
            let storedToken = localStorage.getItem('token');
            let storedUser = localStorage.getItem('user');

            // Fallback to cookies if localStorage is empty
            if (!storedToken || !storedUser) {
                const cookieToken = getCookie('token');
                const cookieUserString = getCookie('user');

                if (cookieToken && cookieUserString) {
                    storedToken = cookieToken;
                    storedUser = cookieUserString;

                    // Repopulate localStorage from cookies for consistency
                    localStorage.setItem('token', storedToken);
                    localStorage.setItem('user', storedUser);
                }
            }

            if (storedToken && storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setToken(storedToken);
                    setUser(parsedUser);
                } catch (e) {
                    console.error('Failed to parse stored user:', e);
                    clearSession();
                }
            }
            setIsLoading(false);
        };

        initializeAuth();

        // Listen for unauthorized events
        const handleUnauthorized = () => {
            logout();
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await api.login(email, password);
            const { token: newToken, user: newUser } = response.data;

            // Use the utility to persist session for 7 days
            persistSession(newToken, newUser);

            setToken(newToken);
            setUser(newUser);

            // Navigate based on role
            if (newUser.role === 'salesperson') {
                navigate('/sales-dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Login failed');
        }
    };

    const switchBranch = async (branchId: string) => {
        try {
            const response = await api.switchBranch(branchId);
            const { token: newToken, user: updatedUser } = response.data;

            // Persist new session
            persistSession(newToken, updatedUser);

            setToken(newToken);
            setUser(updatedUser);

            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('branchChanged', { detail: updatedUser.branch }));
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to switch branch');
        }
    };

    const logout = () => {
        clearSession();
        setToken(null);
        setUser(null);
        navigate('/auth/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, switchBranch, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Add Global Settings Context for currency and other app-wide configs
// Ideally this would be separate but for now we can piggyback or just allow useCurrency to fetch
export const useGlobalSettings = () => {
    // This is a placeholder. For now, useCurrency will implement the fallback logic.
    // Real implementation requires a strict Context.
};
