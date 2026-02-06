import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';
import api from '../lib/api-client';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'salesperson' | 'head_of_sales';
    branchId?: string;
    permissions?: any;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string, userData: User) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const userData = await SecureStore.getItemAsync('user');

            if (token && userData) {
                setUser(JSON.parse(userData));
                // Optionally verify token with backend here
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const login = async (token: string, userData: User) => {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(userData));
        if (userData.branchId) {
            await SecureStore.setItemAsync('selectedBranchId', userData.branchId);
        }
        setUser(userData);
        router.replace('/(tabs)/dashboard');
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        await SecureStore.deleteItemAsync('selectedBranchId');
        setUser(null);
        router.replace('/');
    };

    // Auth protection
    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(tabs)';

        if (!user && inAuthGroup) {
            router.replace('/');
        } else if (user && !inAuthGroup) {
            router.replace('/(tabs)/dashboard');
        }
    }, [user, loading, segments]);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
