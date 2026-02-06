import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import api from '../lib/api-client';
import { DollarSign, TrendingUp, Trophy, Package, LayoutDashboard } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

interface DashboardStats {
    todayRevenue: number;
    weekSales: number;
    monthSales: number;
}

interface LeaderboardEntry {
    rank: number;
    userId: string;
    name: string;
    revenue: number;
    count: number;
    branch: string;
}

export default function SalesDashboard() {
    const { user } = useAuth();
    const { formatPrice } = useCurrency();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [myPosition, setMyPosition] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch today's stats from general dashboard endpoint
            // Fetch weekly summary explicitly for "Weekly Sales"
            // Fetch leaderboard for "Store Rank"
            const [dashboardRes, weekSummaryRes, leaderboardRes] = await Promise.all([
                api.getDashboardStats(),
                api.getAnalyticsSummary({ period: 'week' }),
                api.getLeaderboard('month'),
            ]);

            setStats({
                todayRevenue: dashboardRes.data.stats.todayRevenue || 0,
                weekSales: weekSummaryRes.data.salesCount || 0,
                monthSales: 0 // Placeholder or fetch if needed
            });

            setLeaderboard(leaderboardRes.data.leaderboard || []);

            const position = leaderboardRes.data.leaderboard.findIndex(
                (entry: LeaderboardEntry) => entry.userId === user?.id
            );
            setMyPosition(position >= 0 ? position + 1 : null);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground text-sm font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300">
            {/* Minimal Header */}
            <header className="bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm ring-1 ring-inset ring-primary/20">
                            <LayoutDashboard className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">
                                Sales <span className="text-primary">Dashboard</span>
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium">
                                Agent {user?.firstName} • Store Terminal
                            </p>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Revenue</p>
                                <p className="text-2xl font-bold text-foreground mt-0.5">
                                    {formatPrice(stats.todayRevenue)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform duration-300">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weekly Sales</p>
                                <p className="text-2xl font-bold text-foreground mt-0.5">
                                    {stats.weekSales} Units
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform duration-300">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store Rank</p>
                                <p className="text-2xl font-bold text-foreground mt-0.5">
                                    {myPosition ? `#${myPosition}` : '--'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Leaderboard Section */}
                    <div className="lg:col-span-8 flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-2">
                            <h3 className="font-bold text-foreground flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                Sales Performance <span className="text-muted-foreground text-xs font-normal">/ Monthly</span>
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {leaderboard.map((entry) => (
                                <div
                                    key={entry.userId}
                                    className={`relative rounded-xl border p-4 flex items-center gap-4 transition-all duration-300 ${entry.userId === user?.id
                                        ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/20'
                                        : 'bg-card/30 border-border/40 hover:bg-card hover:border-border'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                                        {entry.rank}
                                    </div>

                                    <div className="flex-1">
                                        <p className="font-bold text-foreground flex items-center gap-2">
                                            {entry.name}
                                            {entry.userId === user?.id && (
                                                <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase border border-primary/20">You</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {entry.count} sales completed
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="font-bold text-primary">
                                            {formatPrice(entry.revenue)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                            <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => (window.location.href = '/pos')}
                                    className="w-full h-12 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <DollarSign className="w-4 h-4" />
                                    Launch POS Terminal
                                </button>

                                <button
                                    onClick={() => (window.location.href = '/inventory')}
                                    className="w-full h-12 rounded-lg bg-card border border-input text-foreground hover:bg-accent hover:text-accent-foreground font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Package className="w-4 h-4 text-primary" />
                                    Manage Inventory
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-border/50 bg-card p-6 border-l-4 border-l-emerald-500 shadow-sm">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">System Health</h4>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-sm font-medium text-foreground">Terminal Connected</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
