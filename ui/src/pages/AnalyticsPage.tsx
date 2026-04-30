import { useState, useEffect } from 'react';
import api from '../lib/api-client';
import { 
    DollarSign, 
    ShoppingCart, 
    Download, 
    Activity,
    Store,
    Package,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    FileText,
    Filter
} from 'lucide-react';
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
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../hooks/useCurrency';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
    const [view, setView] = useState<'overview' | 'ledger' | 'leaderboard'>('overview');
    const [stats, setStats] = useState<any>(null);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [paymentData, setPaymentData] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [branchStats, setBranchStats] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { theme } = useTheme();
    const { formatPrice } = useCurrency();

    useEffect(() => {
        fetchAnalytics();
    }, [period, view]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const promises: Promise<any>[] = [
                api.getAnalyticsSummary({ period }),
                api.getTopProducts(period, 10),
                api.getTrends(period),
            ];

            if (view === 'leaderboard' || view === 'overview') {
                promises.push(api.getLeaderboard(period));
                if (user?.role === 'admin') {
                    promises.push(api.getBranchLeaderboard({ period }));
                }
            }

            if (view === 'ledger') {
                promises.push(api.get('/sales/list', { limit: 100 }));
            }

            const results = await Promise.all(promises);

            setStats(results[0].data);
            setTopProducts(results[1].data.topProducts);
            setTrendData(results[2].data.revenueTrend);
            setPaymentData(results[2].data.paymentMethods);

            if (view === 'leaderboard' || view === 'overview') {
                setLeaderboard(results[3].data.leaderboard || []);
                if (user?.role === 'admin' && results[4]) {
                    setBranchStats(results[4].data.leaderboard || []);
                }
            }

            if (view === 'ledger') {
                setSales(results[results.length - 1].data.sales || []);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to sync intelligence data');
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const timestamp = new Date().toLocaleString();
        
        doc.setFillColor(71, 149, 88);
        doc.rect(0, 0, 297, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text('RETAILPRO INTELLIGENCE REPORT', 14, 13);
        doc.setFontSize(8);
        doc.text(`Generated: ${timestamp} | Period: ${period.toUpperCase()}`, 230, 13);

        if (view === 'ledger') {
            autoTable(doc, {
                head: [['Receipt ID', 'Date', 'Cashier', 'Branch', 'Method', 'Total']],
                body: sales.map(s => [
                    s.receiptId,
                    new Date(s.createdAt).toLocaleDateString(),
                    `${s.user.firstName} ${s.user.lastName}`,
                    s.branch.name,
                    s.paymentMethod.toUpperCase(),
                    formatPrice(s.totalAmount)
                ]),
                startY: 30,
                theme: 'striped',
                headStyles: { fillColor: [71, 149, 88] }
            });
        } else if (view === 'leaderboard') {
             autoTable(doc, {
                head: [['Rank', 'Employee', 'Branch', 'Role', 'Sales Count', 'Total Revenue']],
                body: leaderboard.map(l => [
                    l.rank,
                    l.name,
                    l.branch,
                    l.role.toUpperCase(),
                    l.count,
                    formatPrice(l.revenue)
                ]),
                startY: 30,
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246] }
            });
        }

        doc.save(`retailpro-${view}-${Date.now()}.pdf`);
        toast.success('Document Generated');
    };

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.3em] animate-pulse">Accessing Intelligence Core...</p>
                </div>
            </div>
        );
    }

    const chartColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];
    const isDark = theme === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    return (
        <div className="min-h-screen bg-background flex flex-col font-body transition-colors duration-500 overflow-x-hidden">
            <header className="bg-background/60 backdrop-blur-xl border-b border-white/5 px-8 py-6 sticky top-0 z-[100]">
                <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6 w-full lg:w-auto">
                        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/30 border border-white/20">
                            <Activity className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase">
                                Intelligence <span className="text-primary italic">Node</span>
                            </h1>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] mt-1">
                                {user?.role === 'admin' ? 'Cross-Branch Performance Ledger' : 'Branch Performance Ledger'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-end">
                        <div className="flex p-1.5 bg-secondary/30 rounded-2xl border border-white/5">
                            {(['overview', 'ledger', 'leaderboard'] as const).map(v => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>

                        <div className="h-10 w-px bg-white/10 hidden xl:block" />

                        <div className="flex p-1.5 bg-secondary/30 rounded-2xl border border-white/5">
                            {(['week', 'month', 'year'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleExportPDF}
                            className="h-14 px-8 bg-foreground text-background rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 shadow-xl"
                        >
                            <Download className="w-5 h-5" />
                            Secure Export
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto w-full px-8 py-12 space-y-12 animate-in fade-in duration-700">
                {view === 'overview' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { label: 'Gross Yield', value: formatPrice(stats.revenue || 0), icon: DollarSign, color: 'text-primary', change: '+12.4%', up: true },
                                { label: 'Node Traffic', value: stats.salesCount || 0, icon: ShoppingCart, color: 'text-blue-500', change: '+5.2%', up: true },
                                { label: 'Inventory Load', value: stats.totalStock || 0, icon: Package, color: 'text-purple-500', change: '-2.1%', up: false },
                                { label: 'Active Nodes', value: stats.branchCount || 0, icon: Store, color: 'text-emerald-500', change: 'Stable', up: true }
                            ].map((item, i) => (
                                <div key={i} className="glass-card p-8 group relative overflow-hidden text-left">
                                    <div className={`absolute top-0 right-0 w-32 h-32 ${item.color.replace('text', 'bg')}/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:scale-150`} />
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className={`w-14 h-14 bg-secondary/50 rounded-2xl flex items-center justify-center ${item.color}`}>
                                            <item.icon className="w-7 h-7" />
                                        </div>
                                        <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${item.up ? 'text-emerald-500' : 'text-destructive'}`}>
                                            {item.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                            {item.change}
                                        </div>
                                    </div>
                                    <div className="mt-8 relative z-10">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{item.label}</p>
                                        <p className="text-3xl font-black text-foreground tracking-tighter">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                            <div className="xl:col-span-8 space-y-12">
                                <div className="glass-card p-10 relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-12">
                                        <div className="text-left">
                                            <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Revenue Trajectory</h3>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Real-time data flow analysis</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                        </div>
                                    </div>
                                    <div className="h-[400px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={trendData}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#479558" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#479558" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="10 10" vertical={false} stroke={gridColor} />
                                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: textColor, fontWeight: 900 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: textColor, fontWeight: 900 }} />
                                                <Tooltip
                                                    cursor={{ stroke: '#479558', strokeWidth: 2 }}
                                                    contentStyle={{
                                                        borderRadius: '20px',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        backgroundColor: 'rgba(15,23,42,0.9)',
                                                        backdropFilter: 'blur(10px)',
                                                        color: '#fff',
                                                        padding: '20px'
                                                    }}
                                                />
                                                <Area type="monotone" dataKey="revenue" stroke="#479558" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="xl:col-span-4 space-y-12">
                                <div className="glass-card p-8 text-left">
                                    <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em] mb-8 border-l-4 border-primary pl-4">Critical Vectors (Top Products)</h3>
                                    <div className="space-y-6">
                                        {topProducts.slice(0, 6).map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-4 group">
                                                <div className="w-10 h-10 bg-secondary/50 rounded-xl flex items-center justify-center font-black text-[10px] text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                                                    0{idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-foreground text-[10px] uppercase truncate tracking-tight">{item.product.name}</p>
                                                    <div className="w-full bg-secondary/30 h-1 rounded-full mt-2 overflow-hidden">
                                                        <div 
                                                            className="bg-primary h-full rounded-full transition-all duration-1000" 
                                                            style={{ width: `${(item.quantitySold / (topProducts[0]?.quantitySold || 1)) * 100}%` }} 
                                                        />
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-primary italic">{item.quantitySold}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="glass-card p-8 text-left">
                                    <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em] mb-8 border-l-4 border-blue-500 pl-4">Method Distribution</h3>
                                    <div className="h-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none">
                                                    {paymentData.map((_, index) => <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />)}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-8 text-left">
                                        {paymentData.map((entry, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-secondary/20 p-3 rounded-xl border border-white/5">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartColors[idx % chartColors.length] }}></div>
                                                <span className="text-[9px] font-black text-muted-foreground uppercase truncate">{entry.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {view === 'ledger' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 text-left">
                        <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-4 bg-secondary/30 px-6 py-4 rounded-2xl border border-white/5 w-full max-w-xl">
                                <Search className="w-5 h-5 text-muted-foreground" />
                                <input 
                                    type="text" 
                                    placeholder="SEARCH LEDGER BY RECEIPT OR NODE..." 
                                    className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase w-full tracking-widest outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-4">
                                <button className="p-4 bg-secondary/30 rounded-2xl border border-white/5 hover:bg-secondary/50 transition-all text-muted-foreground">
                                    <Filter className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="glass-card overflow-hidden border-white/5">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-secondary/50 border-b border-white/5">
                                        {['Receipt ID', 'Node Name', 'Cashier', 'Method', 'Timestamp', 'Value'].map(h => (
                                            <th key={h} className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {sales.filter(s => s.receiptId.includes(searchTerm) || s.branch.name.toLowerCase().includes(searchTerm.toLowerCase())).map((sale) => (
                                        <tr key={sale.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[11px] font-black tracking-tighter text-foreground uppercase">{sale.receiptId}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-[10px] font-bold text-muted-foreground uppercase">{sale.branch.name}</td>
                                            <td className="px-8 py-6 text-left">
                                                <div className="flex flex-col text-left">
                                                    <span className="text-[11px] font-black uppercase text-foreground">{sale.user.firstName} {sale.user.lastName}</span>
                                                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Terminal Op</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1 bg-secondary/50 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/5">{sale.paymentMethod}</span>
                                            </td>
                                            <td className="px-8 py-6 text-[10px] font-bold text-muted-foreground">
                                                {new Date(sale.createdAt).toLocaleDateString()}
                                                <span className="block text-[8px] opacity-50">{new Date(sale.createdAt).toLocaleTimeString()}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-sm font-black text-primary tracking-tighter">{formatPrice(sale.totalAmount)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {view === 'leaderboard' && (
                    <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700 text-left">
                        {user?.role === 'admin' && (
                             <section className="space-y-8">
                                <h2 className="text-xs font-black text-foreground uppercase tracking-[0.3em] flex items-center gap-3 border-l-4 border-emerald-500 pl-4">Node Performance Ranking</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {branchStats.map((b, idx) => (
                                        <div key={idx} className="glass-card p-8 group hover:border-emerald-500/30 transition-all duration-500 text-left">
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                                    {idx === 0 ? <Store className="w-6 h-6" /> : <span className="font-black text-sm">{idx + 1}</span>}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{b.location}</p>
                                                </div>
                                            </div>
                                            <h3 className="text-sm font-black text-foreground uppercase tracking-tight mb-8">{b.name}</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-secondary/30 rounded-xl">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Value</p>
                                                    <p className="text-lg font-black text-emerald-500 tracking-tighter">{formatPrice(b.revenue)}</p>
                                                </div>
                                                <div className="p-4 bg-secondary/30 rounded-xl">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Traffic</p>
                                                    <p className="text-lg font-black text-foreground tracking-tighter">{b.count}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="space-y-8">
                            <h2 className="text-xs font-black text-foreground uppercase tracking-[0.3em] flex items-center gap-3 border-l-4 border-blue-500 pl-4">Personnel Efficiency Leaderboard</h2>
                            <div className="glass-card overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-secondary/50 border-b border-white/5">
                                            {['Rank', 'Personnel', 'Node', 'Efficiency', 'Gross Value'].map(h => (
                                                <th key={h} className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {leaderboard.map((item) => (
                                            <tr key={item.userId} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[11px] ${item.rank === 1 ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-secondary text-muted-foreground'}`}>
                                                        {item.rank}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-left">
                                                    <div className="flex items-center gap-4 text-left">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-black text-xs border border-blue-500/20 uppercase">
                                                            {item.name[0]}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-[11px] font-black uppercase text-foreground text-left">{item.name}</p>
                                                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left">{item.role}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-[10px] font-bold text-muted-foreground uppercase">{item.branch}</td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[10px] font-black text-foreground">{item.count} <span className="text-muted-foreground font-medium">Ops</span></span>
                                                        <div className="flex-1 max-w-[100px] h-1 bg-secondary rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500" style={{ width: `${(item.count / (leaderboard[0]?.count || 1)) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-sm font-black text-primary tracking-tighter">{formatPrice(item.revenue)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
