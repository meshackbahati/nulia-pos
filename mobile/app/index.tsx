import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api-client';
import { Lock, Mail, Store } from 'lucide-react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.login(email, password);
            if (data.token) {
                await login(data.token, data.user);
            } else {
                Alert.alert('Error', 'Login failed');
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert('Login Failed', error.response?.data?.error || 'Invalid credentials or server error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-background"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="p-6">
                <View className="items-center mb-10">
                    <View className="w-20 h-20 bg-primary/10 rounded-2xl items-center justify-center mb-4">
                        <Store color="#3b82f6" size={40} />
                    </View>
                    <Text className="text-3xl font-bold text-foreground">RetailPro POS</Text>
                    <Text className="text-muted-foreground mt-2">Mobile Terminal Access</Text>
                </View>

                <View className="space-y-4 w-full max-w-sm mx-auto">
                    <View className="space-y-2">
                        <Text className="text-sm font-medium text-foreground ml-1">Email Address</Text>
                        <View className="flex-row items-center bg-muted rounded-xl px-4 h-12 border border-border">
                            <Mail size={20} color="#64748b" />
                            <TextInput
                                className="flex-1 ml-3 text-foreground"
                                placeholder="name@company.com"
                                placeholderTextColor="#94a3b8"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View className="space-y-2">
                        <Text className="text-sm font-medium text-foreground ml-1">Password</Text>
                        <View className="flex-row items-center bg-muted rounded-xl px-4 h-12 border border-border">
                            <Lock size={20} color="#64748b" />
                            <TextInput
                                className="flex-1 ml-3 text-foreground"
                                placeholder="••••••••"
                                placeholderTextColor="#94a3b8"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={loading}
                        className={`bg-primary h-12 rounded-xl items-center justify-center mt-6 shadow-sm ${loading ? 'opacity-70' : ''}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
