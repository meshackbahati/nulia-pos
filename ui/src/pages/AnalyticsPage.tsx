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

export default function AnalyticsPage() {
    const [period, setPeriod] = useState<'week' | 'month'>('week');
    const [stats, setStats] = useState<any>(null);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [paymentData, setPaymentData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm font-medium">Generating Report...</p>
                </div>
            </div>
        );
    }

    const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
            {/* Minimal Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                                Analytics <span className="text-blue-600">Reporting</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => setPeriod('week')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${period === 'week' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Week
                            </button>
                            <button
                                onClick={() => setPeriod('month')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${period === 'month' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Month
                            </button>
                        </div>
                        <ThemeToggle />
                        <button
                            onClick={handleExportPDF}
                            className="modern-button bg-blue-600 text-white flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden md:inline uppercase text-xs font-bold">Export Report</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 animate-in">
                {/* Metrics Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Revenue', value: `$${stats[period].revenue.toFixed(2)}`, icon: DollarSign, color: 'blue' },
                        { label: 'Sales Count', value: stats[period].salesCount, icon: ShoppingCart, color: 'green' },
                        { label: 'Average Order', value: `$${stats[period].salesCount > 0 ? (stats[period].revenue / stats[period].salesCount).toFixed(2) : '0.00'}`, icon: TrendingUp, color: 'orange' },
                        { label: 'Period', value: period === 'week' ? 'This Week' : 'This Month', icon: Calendar, color: 'purple' }
                    ].map((item, i) => (
                        <div key={i} className="modern-card p-6 flex items-center gap-4">
                            <div className={`w-12 h-12 bg-${item.color}-50 dark:bg-${item.color}-900/20 rounded-lg flex items-center justify-center text-${item.color}-600`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        {/* Revenue Chart */}
                        <div className="modern-card p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                Revenue Growth
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue ($)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Volume Chart */}
                        <div className="modern-card p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <BarIcon className="w-5 h-5 text-green-600" />
                                Sales Volume
                            </h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Sales" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-8">
                        {/* Payment Split */}
                        <div className="modern-card p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <PieIcon className="w-5 h-5 text-orange-600" />
                                Payment Methods
                            </h3>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                                            {paymentData.map((_entry, index) => <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {paymentData.map((entry, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: chartColors[idx % chartColors.length] }}></div>
                                        <span className="text-[10px] font-medium text-slate-500 truncate uppercase">{entry.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Products */}
                        <div className="modern-card p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 text-sm uppercase">Top Products</h3>
                            <div className="space-y-4">
                                {topProducts.slice(0, 5).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded flex items-center justify-center font-bold text-slate-400 text-xs">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white text-xs truncate uppercase tracking-tight">{item.product.name}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">${item.revenue.toFixed(2)} revenue</p>
                                        </div>
                                        <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded text-[10px] font-black italic">
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
