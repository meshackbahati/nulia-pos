import { useState, useEffect } from 'react';
import api from '../lib/api-client';
import ThemeToggle from '../components/ThemeToggle';
import { TrendingUp, DollarSign, ShoppingCart, Calendar, Download, PieChart as PieIcon, BarChart as BarIcon, Activity } from 'lucide-react';
import {
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';
import jsPDF from 'jspdf';
import { useTheme } from '../contexts/ThemeContext';

export default function AnalyticsPage() {
    const [period, setPeriod] = useState<'week' | 'month'>('week');
    const [stats, setStats] = useState<any>(null);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [paymentData, setPaymentData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const [statsRes, productsRes, , trendsRes] = await Promise.all([
                api.getDashboardStats(),
                api.getTopProducts(period, 10),
                api.getLeaderboard(period),
                api.getTrends(period),
            ]);

            setStats(statsRes.data);
            setTopProducts(productsRes.data.topProducts);
            setTrendData(trendsRes.data.revenueTrend);
            setPaymentData(trendsRes.data.paymentMethods);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text('BorderShop Business Report', 20, 20);
        doc.text(`Period: ${period.toUpperCase()}`, 20, 30);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 40);
        doc.save(`report-${period}-${Date.now()}.pdf`);
    };

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground text-sm font-medium">Generating Report...</p>
                </div>
            </div>
        );
    }

    const chartColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6']; // Amber, Emerald, Blue, Red, Violet
    const isDark = theme === 'dark';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300">
            {/* Minimal Header */}
            <header className="bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm ring-1 ring-inset ring-primary/20">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">
                                Analytics <span className="text-primary">Reporting</span>
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium">Business intelligence and performance</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-muted p-1 rounded-lg">
                            <button
                                onClick={() => setPeriod('week')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${period === 'week' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Week
                            </button>
                            <button
                                onClick={() => setPeriod('month')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${period === 'month' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Month
                            </button>
                        </div>
                        <ThemeToggle />
                        <button
                            onClick={handleExportPDF}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-sm active:scale-[0.98]"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden md:inline">Export Report</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                {/* Metrics Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Revenue', value: `$${stats[period].revenue.toFixed(2)}`, icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        { label: 'Sales Count', value: stats[period].salesCount, icon: ShoppingCart, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { label: 'Average Order', value: `$${stats[period].salesCount > 0 ? (stats[period].revenue / stats[period].salesCount).toFixed(2) : '0.00'}`, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { label: 'Period', value: period === 'week' ? 'This Week' : 'This Month', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500/10' }
                    ].map((item, i) => (
                        <div key={i} className="rounded-xl border border-border/50 bg-card p-6 flex items-center gap-4 shadow-sm hover:border-primary/20 transition-colors">
                            <div className={`w-12 h-12 ${item.bg} rounded-lg flex items-center justify-center ${item.color}`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.label}</p>
                                <p className="text-xl font-bold text-foreground">{item.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        {/* Revenue Chart */}
                        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                            <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Revenue Growth
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: textColor }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: textColor }} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                backgroundColor: 'var(--card)',
                                                color: 'var(--foreground)',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                        />
                                        <Area type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue ($)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Volume Chart */}
                        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                            <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
                                <BarIcon className="w-5 h-5 text-emerald-500" />
                                Sales Volume
                            </h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: textColor }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: textColor }} />
                                        <Tooltip
                                            cursor={{ fill: 'var(--muted)' }}
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                backgroundColor: 'var(--card)',
                                                color: 'var(--foreground)',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                        />
                                        <Bar dataKey="sales" fill="#10B981" radius={[4, 4, 0, 0]} name="Sales" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-8">
                        {/* Payment Split */}
                        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                            <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
                                <PieIcon className="w-5 h-5 text-blue-500" />
                                Payment Methods
                            </h3>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                                            {paymentData.map((_entry, index) => <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />)}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: '1px solid var(--border)',
                                                backgroundColor: 'var(--card)',
                                                color: 'var(--foreground)',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {paymentData.map((entry, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: chartColors[idx % chartColors.length] }}></div>
                                        <span className="text-[10px] font-medium text-muted-foreground truncate uppercase">{entry.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Products */}
                        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                            <h3 className="font-bold text-foreground mb-6 flex items-center gap-2 text-sm uppercase">Top Products</h3>
                            <div className="space-y-4">
                                {topProducts.slice(0, 5).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
                                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center font-bold text-muted-foreground text-xs">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-foreground text-xs truncate uppercase tracking-tight">{item.product.name}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium">${item.revenue.toFixed(2)} revenue</p>
                                        </div>
                                        <div className="px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-black italic">
                                            {item.quantitySold} sold
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
