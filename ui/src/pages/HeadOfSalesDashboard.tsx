'use client';

import { useState, useEffect } from 'react';
import api from '../lib/api-client';
import { useCurrency } from '../hooks/useCurrency';
import {
    Users,
    TrendingUp,
    Award,
    Trophy,
    DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TeamStats {
    totalSales: number;
    totalRevenue: number;
    averageSale: number;
    topSeller: string;
}

interface LeaderboardEntry {
    rank: number;
    user: {
        id: string;
        firstName: string;
        lastName: string;
    };
    salesCount: number;
    totalRevenue: number;
}

export default function HeadOfSalesDashboard() {
    const { formatPrice } = useCurrency();
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, leaderboardRes] = await Promise.all([
                api.getDashboardStats(),
                api.getLeaderboard('week')
            ]);

            const dashboardData = statsRes.data.stats;
            // Map backend 'today' stats to our state
            setStats({
                totalSales: dashboardData.todaySales || 0,
                totalRevenue: dashboardData.todayRevenue || 0,
                averageSale: dashboardData.todaySales ? dashboardData.todayRevenue / dashboardData.todaySales : 0,
                topSeller: leaderboardRes.data.leaderboard[0]?.name || 'N/A' // Use name from leaderboard entry
            });

            setLeaderboard(leaderboardRes.data.leaderboard);
        } catch (error) {
            console.error('Error fetching head of sales data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Team Performance</h1>
                    <p className="text-muted-foreground">Head of Sales • Branch Overview</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPrice(stats?.totalRevenue || 0)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Today's total revenue</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily Sales</CardTitle>
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalSales}</div>
                        <p className="text-xs text-muted-foreground mt-1">Transactions today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Ticket Value</CardTitle>
                        <Award className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPrice(stats?.averageSale || 0)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Per transaction average</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                        <Trophy className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{stats?.topSeller}</div>
                        <p className="text-xs text-muted-foreground mt-1">Highest revenue generator</p>
                    </CardContent>
                </Card>
            </div>

            {/* Sales Leaderboard */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Sales Agent Standings
                    </CardTitle>
                    <CardDescription>Performance rankings for the current period</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {leaderboard.map((entry) => (
                            <div key={entry.user.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-secondary/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${entry.rank === 1 ? 'bg-amber-100 text-amber-600 shadow-sm' : 'bg-muted text-muted-foreground'
                                        }`}>
                                        {entry.rank}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">
                                            {/* API returns 'name' directly for leaderboard entries */}
                                            {(entry as any).name || `${entry.user?.firstName} ${entry.user?.lastName}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{entry.salesCount || (entry as any).count} transactions</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-primary">{formatPrice(entry.totalRevenue || (entry as any).revenue || 0)}</p>
                                    <Badge variant="secondary" className="text-[10px] h-4">
                                        {leaderboard.reduce((acc, curr) => acc + (curr.totalRevenue || (curr as any).revenue || 0), 0) > 0
                                            ? Math.round(((entry.totalRevenue || (entry as any).revenue || 0) / leaderboard.reduce((acc, curr) => acc + (curr.totalRevenue || (curr as any).revenue || 0), 0)) * 100)
                                            : 0}% of total
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
