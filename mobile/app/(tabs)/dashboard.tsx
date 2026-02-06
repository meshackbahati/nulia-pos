import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api-client';
import { DollarSign, ShoppingBag, Package, TrendingUp } from 'lucide-react-native';
import { formatCurrency } from '../../lib/utils'; // We need to duplicate formatCredits logic or similar

// Simple formatter for now since utils.ts might not have it
const formatMoney = (amount: number, currency = 'KES') => {
    return `${currency} ${amount.toLocaleString()}`;
};

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const { data } = await api.getDashboardStats();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    return (
        <SafeAreaView className="flex-1 bg-muted">
            <View className="p-6 bg-background pb-4 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">Overview</Text>
                <Text className="text-muted-foreground">Welcome back, {user?.name}</Text>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" />
                ) : (
                    <View className="gap-4">
                        <View className="flex-row flex-wrap gap-4">
                            {/* Revenue Card */}
                            <View className="flex-1 min-w-[150px] bg-background p-4 rounded-xl shadow-sm border border-border">
                                <View className="w-10 h-10 bg-green-100 items-center justify-center rounded-lg mb-2">
                                    <DollarSign size={20} color="#16a34a" />
                                </View>
                                <Text className="text-muted-foreground text-xs font-bold uppercase">Revenue (Today)</Text>
                                <Text className="text-xl font-bold text-foreground mt-1">
                                    {formatMoney(stats?.revenue || 0)}
                                </Text>
                            </View>

                            {/* Sales Count */}
                            <View className="flex-1 min-w-[150px] bg-background p-4 rounded-xl shadow-sm border border-border">
                                <View className="w-10 h-10 bg-blue-100 items-center justify-center rounded-lg mb-2">
                                    <ShoppingBag size={20} color="#2563eb" />
                                </View>
                                <Text className="text-muted-foreground text-xs font-bold uppercase">Sales (Today)</Text>
                                <Text className="text-xl font-bold text-foreground mt-1">
                                    {stats?.count || 0}
                                </Text>
                            </View>
                        </View>

                        {/* Other Role Specific Stats could go here */}
                        <View className="bg-background p-4 rounded-xl shadow-sm border border-border">
                            <View className="flex-row items-center gap-3 mb-4">
                                <TrendingUp size={20} color="#64748b" />
                                <Text className="font-bold text-foreground">Recent Activity</Text>
                            </View>
                            <Text className="text-muted-foreground text-sm italic">
                                Integration of recent transactions list coming soon...
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
