import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api-client';
import {
    DollarSign,
    TrendingUp,
    Users,
    Package,
    AlertTriangle,
    ShoppingCart,
    Truck,
    ClipboardList
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import BranchSelector from '../components/BranchSelector';

interface DashboardStats {
    today: { salesCount: number; revenue: number };
    week: { salesCount: number; revenue: number };
    month: { salesCount: number; revenue: number };
    lowStockCount: number;
}

interface TopProduct {
    rank: number;
    product: {
        id: string;
        name: string;
        imageUrl?: string;
        category: string;
    };
    quantitySold: number;
    revenue: number;
}

interface LeaderboardEntry {
    rank: number;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    salesCount: number;
    totalRevenue: number;
}

export default function ManagerDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('[Dashboard] Period changed, fetching data...', period);
        fetchDashboardData();
    }, [period]);

    const fetchDashboardData = async () => {
        try {
            console.log('[Dashboard] Fetching dashboard data for period:', period);
            setLoading(true);
            const [statsRes, productsRes, leaderboardRes] = await Promise.all([
                api.getDashboardStats(),
                api.getTopProducts(period, 5),
                api.getLeaderboard(period),
            ]);

            console.log('[Dashboard] Data received:', {
                stats: statsRes.data,
                topProducts: productsRes.data.topProducts.length,
                leaderboard: leaderboardRes.data.leaderboard.length
            });

            setStats(statsRes.data);
            setTopProducts(productsRes.data.topProducts);
            setLeaderboard(leaderboardRes.data.leaderboard);
        } catch (error) {
            console.error('[Dashboard] Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center min-h-screen gradient-bg">
                <div className="warm-card p-12 flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
                    <p className="text-display text-foreground uppercase tracking-widest text-sm">Loading Intelligence</p>
                </div>
            </div>
        );
    }

    const currentStats = stats[period];

    return (
        <div className="min-h-screen" style={{
            background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <style>{`
                .dark {
                    background: linear-gradient(135deg, #111827 0%, #1f2937 100%) !important;
                }
            `}</style>
            {/* Mobile Responsiveness Fixes */}
            <style>{`
                @media (max-width: 640px) {
                    .stat-card { padding: 1rem; }
                    .stat-card__value { font-size: 2rem; }
                    .warm-card { padding: 1rem; margin: 0.5rem; }
                    header { margin: 0.5rem; padding: 1rem; }
                }
                @media (max-width: 768px) {
                    .grid { gap: 1rem; }
                    .text-responsive-display { font-size: 1.5rem; }
                }
            `}</style>
            {/* Header */}
            <header className="sticky top-0 z-50 mx-6 mt-4 mb-8 px-6 py-4 animate-in" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(229, 231, 235, 0.5)',
                borderRadius: '1rem',
                boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
            }}>
                <div className="dark" style={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9) !important',
                    border: '1px solid rgba(31, 41, 55, 0.5) !important'
                }}>
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{
                            backgroundColor: 'hsl(25, 85%, 55%)',
                            color: 'white'
                        }}>
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 style={{
                                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                                fontWeight: 800,
                                color: 'hsl(222.2, 84%, 4.9%)'
                            }}>
                                Manager <span style={{color: 'hsl(25, 85%, 55%)'}}>Dashboard</span>
                            </h1>
                            <p style={{
                                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                                color: 'hsl(215.4, 16.3%, 46.9%)',
                                marginTop: '0.25rem'
                            }}>
                                System Overview & Intelligence • {user?.firstName}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-1 rounded-xl p-1" style={{
                            backgroundColor: 'hsl(210, 40%, 96.1%)'
                        }}>
                            {(['today', 'week', 'month'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => {
                                        console.log('[Dashboard] Period changed to:', p);
                                        setPeriod(p);
                                    }}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                                    style={period === p ? {
                                        backgroundColor: 'hsl(25, 85%, 55%)',
                                        color: 'white',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    } : {
                                        color: 'hsl(215.4, 16.3%, 46.9%)'
                                    }}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <div className="h-8 w-px bg-border mx-2 hidden md:block"></div>
                        <ThemeToggle />
                        <BranchSelector />
                    </div>
                </div>
            </div>
            </header>
            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 pb-12 w-full space-y-10 animate-in">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Revenue', value: `${currentStats.revenue.toFixed(2)}`, icon: DollarSign, color: '#e86741' },
                        { label: 'Total Sales', value: currentStats.salesCount, icon: ShoppingCart, color: '#93b892' },
                        { label: 'Top Sellers', value: leaderboard.length, icon: Users, color: '#f59e0b' },
                        { label: 'Low Stock', value: stats.lowStockCount, icon: AlertTriangle, color: '#ef4444' }
                    ].map((stat, i) => (
                        <div key={i} className="group" style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(229, 231, 235, 0.5)',
                            borderRadius: '1rem',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 300ms',
                            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                        }}>
                            <div className="dark" style={{
                                backgroundColor: 'rgba(17, 24, 39, 0.9) !important',
                                border: '1px solid rgba(31, 41, 55, 0.5) !important'
                            }}>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-3">
                                        <p style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.1em',
                                            color: 'hsl(215.4, 16.3%, 46.9%)',
                                            marginTop: '0.5rem'
                                        }}>{stat.label}</p>
                                        <h3 style={{
                                            fontSize: '1.875rem',
                                            fontWeight: 900,
                                            letterSpacing: '-0.025em',
                                            color: 'hsl(222.2, 84%, 4.9%)'
                                        }}>
                                            {typeof stat.value === 'string' && stat.label.includes('Revenue') ? '$' : ''}{stat.value}
                                        </h3>
                                    </div>
                                    <div style={{
                                        padding: '1rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        border: '1px solid rgba(229, 231, 235, 0.5)',
                                        borderRadius: '1rem',
                                        color: stat.color,
                                        transition: 'all 300ms'
                                    }} className="group-hover:bg-secondary">
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: 'hsl(215.4, 16.3%, 46.9%)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>Live Feed</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Intelligence Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Products */}
                    <div className="warm-card flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <h3 className="text-display text-foreground">Top Products</h3>
                            </div>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-secondary px-3 py-1 rounded-full">Sales Mix</span>
                        </div>

                        <div className="space-y-4 flex-1">
                            {topProducts.map((item, i) => (
                                <div
                                    key={item.product.id}
                                    className="warm-card group p-4 flex items-center gap-4 hover-lift active-press"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 bg-secondary rounded-xl flex items-center justify-center font-black text-primary text-sm">
                                        #{i + 1}
                                    </div>
                                    <div className="flex-shrink-0 w-12 h-12 bg-secondary rounded-xl overflow-hidden p-1">
                                        {item.product.imageUrl ? (
                                            <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-secondary rounded-lg">
                                                <Package className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-foreground text-sm truncate">
                                            {item.product.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.product.category}</span>
                                            <span className="w-1 h-1 rounded-full bg-border"></span>
                                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{item.quantitySold} units</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-display text-foreground">
                                            ${item.revenue.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="warm-card flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600">
                                    <Users className="w-5 h-5" />
                                </div>
                                <h3 className="text-display text-foreground">Top Performers</h3>
                            </div>
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-secondary px-3 py-1 rounded-full">Individual Stats</span>
                        </div>

                        <div className="space-y-4 flex-1">
                            {leaderboard.slice(0, 5).map((entry, i) => (
                                <div
                                    key={entry.user.id}
                                    className="warm-card group p-4 flex items-center gap-4 hover-lift active-press"
                                >
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-black ${i === 0 ? 'bg-amber-500' :
                                        i === 1 ? 'bg-stone-400' :
                                            i === 2 ? 'bg-amber-400' : 'bg-primary'
                                        }`}>
                                        #{entry.rank}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-foreground text-sm">
                                            {entry.user.firstName} {entry.user.lastName}
                                        </p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                            {entry.salesCount} SUCCESSFUL Sales
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-display text-amber-600">
                                            ${entry.totalRevenue.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Advanced Quick Actions */}
                <div className="warm-card bg-secondary/30">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-sage-500/10 rounded-2xl text-sage-600">
                            <Package className="w-5 h-5" />
                        </div>
                        <h3 className="text-display text-foreground">System Navigation</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[
                            { label: 'Register', icon: ShoppingCart, color: 'text-terracotta-500', path: '/pos' },
                            { label: 'Catalog', icon: Package, color: 'text-sage-500', path: '/manager/products' },
                            { label: 'Supply', icon: Truck, color: 'text-amber-500', path: '/manager/suppliers' },
                            { label: 'Restock', icon: ClipboardList, color: 'text-info', path: '/manager/purchase-orders' },
                            { label: 'Admin', icon: Users, color: 'text-success', path: '/manager/users' },
                            { label: 'Global', icon: TrendingUp, color: 'text-amber-500', path: '/manager/analytics' }
                        ].map((action, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    console.log('[Dashboard] Navigating to:', action.path);
                                    window.location.href = action.path;
                                }}
                                className="group warm-card p-5 flex flex-col items-center justify-center gap-3 text-center hover-lift active-press"
                            >
                                <div className={`p-3 warm-card rounded-2xl ${action.color} group-hover:bg-secondary transition-all group-hover:scale-110 duration-300`}>
                                    <action.icon className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
