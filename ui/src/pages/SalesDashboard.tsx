import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api-client';
import { DollarSign, TrendingUp, Trophy, Package, LayoutDashboard } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

interface DashboardStats {
    today: { salesCount: number; revenue: number };
    week: { salesCount: number; revenue: number };
    month: { salesCount: number; revenue: number };
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

export default function SalesDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [myPosition, setMyPosition] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, leaderboardRes] = await Promise.all([
                api.getDashboardStats(),
                api.getLeaderboard('month'),
            ]);

            setStats(statsRes.data);
            setLeaderboard(leaderboardRes.data.leaderboard);

            const position = leaderboardRes.data.leaderboard.findIndex(
                (entry: LeaderboardEntry) => entry.user.id === user?.id
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
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
            {/* Minimal Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <LayoutDashboard className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                                Sales <span className="text-blue-600">Dashboard</span>
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">
                                Agent {user?.firstName} • Store Terminal
                            </p>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 animate-in">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="modern-card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Revenue</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                                ${stats.today.revenue.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div className="modern-card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center text-green-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Weekly Sales</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                                {stats.week.salesCount} Units
                            </p>
                        </div>
                    </div>

                    <div className="modern-card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center text-purple-600">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Store Rank</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                                {myPosition ? `#${myPosition}` : '--'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Leaderboard Section */}
                    <div className="lg:col-span-8 flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-2">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                Sales Performance <span className="text-slate-400 text-xs font-normal">/ Monthly</span>
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {leaderboard.map((entry) => (
                                <div
                                    key={entry.user.id}
                                    className={`modern-card p-4 flex items-center gap-4 ${entry.user.id === user?.id ? 'ring-2 ring-blue-600 ring-inset bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400">
                                        {entry.rank}
                                    </div>

                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900 dark:text-white">
                                            {entry.user.firstName} {entry.user.lastName}
                                            {entry.user.id === user?.id && (
                                                <span className="ml-2 text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-full uppercase">You</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {entry.salesCount} sales completed
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="font-bold text-blue-600">
                                            ${entry.totalRevenue.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="modern-card p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => (window.location.href = '/pos')}
                                    className="w-full h-12 modern-button bg-blue-600 text-white hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2"
                                >
                                    <DollarSign className="w-4 h-4" />
                                    Launch POS Terminal
                                </button>

                                <button
                                    onClick={() => (window.location.href = '/inventory')}
                                    className="w-full h-12 modern-button bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Package className="w-4 h-4 text-blue-600" />
                                    Manage Inventory
                                </button>
                            </div>
                        </div>

                        <div className="modern-card p-6 border-l-4 border-green-500">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">System Health</h4>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Terminal Connected</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
