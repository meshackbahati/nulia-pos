import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api-client';

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
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Check for existing session
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await api.login(email, password);
            const { token: newToken, user: newUser } = response.data;

            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(newUser));

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

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        navigate('/auth/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
