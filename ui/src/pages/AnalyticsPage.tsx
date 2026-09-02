import { useState, useEffect } from 'react';
import api from '../lib/api-client';
import { DollarSign, ShoppingCart, Download, Activity, Store, Package, ArrowUpRight, Search, FileText, Filter } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../hooks/useCurrency';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all' | 'custom'>('week');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [scope, setScope] = useState<'my' | 'all'>(user?.role === 'admin' ? 'all' : 'my');
    const [view, setView] = useState<'overview' | 'ledger' | 'leaderboard'>('overview');
    const [stats, setStats] = useState<any>(null);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [paymentData, setPaymentData] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [branchStats, setBranchStats] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [branch, setBranch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { theme } = useTheme();
    const { formatPrice } = useCurrency();

    useEffect(() => { fetchAnalytics(); }, [period, view, scope, customFrom, customTo]);

    const isAllBranches = user?.role === 'admin' && scope === 'all';
    const dateParams = period === 'custom' && customFrom && customTo ? { from: customFrom, to: customTo } : {};
    const effectivePeriod = period === 'custom' ? 'all' : period;

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            // Single source for top/trends/leaderboard — respect isAllBranches
            const summaryP = isAllBranches ? api.getAnalyticsSummary({ period: effectivePeriod, scope: 'all', ...dateParams }) : api.getAnalyticsSummary({ period: effectivePeriod, ...dateParams });
            const topP = isAllBranches ? api.get('/analytics/top-products', { period: effectivePeriod, scope: 'all', limit: 10, ...dateParams }) : api.getTopProducts(effectivePeriod, 10);
            const trendsP = isAllBranches ? api.get('/analytics/trends', { period: effectivePeriod, scope: 'all', ...dateParams }) : api.getTrends(effectivePeriod);
            const leaderboardP = (view === 'leaderboard' || view === 'overview') ? (isAllBranches ? api.get('/analytics/leaderboard', { period: effectivePeriod, scope: 'all', global: 'true', ...dateParams }) : api.getLeaderboard(effectivePeriod)) : null;
            const branchLeaderP = ((view === 'leaderboard' || view === 'overview') && isAllBranches) ? api.getBranchLeaderboard({ period: effectivePeriod, ...dateParams }) : null;
            const salesP = view === 'ledger' ? api.get('/sales/list', { limit: 100, ...(isAllBranches ? { scope: 'all', ...dateParams } : dateParams) }) : null;
            const branchP = api.get('/branches/me').catch(()=> null);
            const allBranchesP = isAllBranches ? api.getBranches({ includeInactive: false }).catch(()=> null) : null;

            const results = await Promise.allSettled([
                summaryP.catch(()=> null),
                topP.catch(()=> null),
                trendsP.catch(()=> null),
                leaderboardP ? leaderboardP.catch(()=> null) : Promise.resolve(null),
                branchLeaderP ? branchLeaderP.catch(e=> { console.warn('branchLeaderboard', e?.response?.status); return null; }) : Promise.resolve(null),
                salesP ? salesP.catch(()=> null) : Promise.resolve(null),
                branchP,
                allBranchesP || Promise.resolve(null),
            ]);
            const getVal = (i:number) => results[i].status==='fulfilled' ? (results[i] as any).value : null;
            const summaryR = getVal(0), topR = getVal(1), trendsR = getVal(2), leaderboardR = getVal(3), branchLeaderR = getVal(4), salesR = getVal(5), branchR = getVal(6), allBranchesR = getVal(7);

            if (summaryR?.data) setStats(summaryR.data); else toast.error('Summary failed — showing partial data');
            setTopProducts(topR?.data?.topProducts || []);
            setTrendData(trendsR?.data?.revenueTrend || []);
            setPaymentData(trendsR?.data?.paymentMethods || []);
            if (leaderboardR?.data?.leaderboard) setLeaderboard(leaderboardR.data.leaderboard);
            else setLeaderboard([]);
            if (branchLeaderR?.data?.leaderboard) setBranchStats(branchLeaderR.data.leaderboard);
            else setBranchStats([]);
            if (salesR?.data?.sales) setSales(salesR.data.sales); else if (view==='ledger') setSales([]);
            if (branchR?.data?.branch) setBranch(branchR.data.branch);
            if (isAllBranches && allBranchesR?.data?.branches) (window as any).__allBranches = allBranchesR.data.branches;
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to sync intelligence data');
        } finally { setLoading(false); }
    };

    const handleExportPDF = () => {
        try {
            if (!stats) { toast.error('No data to export — wait for load'); return; }
            if (period === 'custom' && (!customFrom || !customTo)) { toast.error('Pick From and To dates for custom export'); return; }
            const doc = new jsPDF('p', 'mm', 'a4');
            const timestamp = new Date().toLocaleString();
            const periodLabel = period.toUpperCase();
            const isAll = user?.role === 'admin' && scope === 'all';
            const rawBranchName = isAll ? 'All Branches (Network)' : (branch?.name || user?.branch?.name || 'Branch');
            const branchName = rawBranchName.replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,40) || 'Branch';
            const dateRange = (() => {
                if (period === 'custom' && customFrom && customTo) return `${new Date(customFrom).toLocaleDateString()} — ${new Date(customTo).toLocaleDateString()}`;
                if (period === 'all') return `All time — ${new Date().toLocaleDateString()}`;
                const end = new Date();
                const start = new Date();
                if (period === 'week') start.setDate(end.getDate() - 7);
                else if (period === 'month') start.setMonth(end.getMonth() - 1);
                else start.setFullYear(end.getFullYear() - 1);
                return `${start.toLocaleDateString()} — ${end.toLocaleDateString()}`;
            })();

            // Brand header — clay-inspired
            doc.setFillColor(124, 58, 237);
            doc.rect(0, 0, 210, 22, 'F');
            doc.setTextColor(255,255,255);
            doc.setFontSize(13);
            doc.setFont('helvetica','bold');
            doc.text('RETAILPRO  •  BRANCH INTELLIGENCE REPORT', 10, 10);
            doc.setFontSize(7);
            doc.setFont('helvetica','normal');
            doc.text(`${branchName}  •  ${periodLabel}  •  ${dateRange}`, 10, 16);
            doc.text(`Generated ${timestamp}  •  ${user?.firstName || ''} ${user?.lastName || ''}`.trim(), 210-10, 16, {align:'right'});

            // Subheader strip — shows scope + date
            doc.setFillColor(255, 247, 237);
            doc.rect(0, 22, 210, 10, 'F');
            doc.setTextColor(100,116,139);
            doc.setFontSize(6);
            const scopeLabel = isAll ? 'Scope: ALL BRANCHES' : `Scope: ${branchName}`;
            doc.text(`${scopeLabel}  |  Currency: ${branch?.currency || 'KES'}${branch?.secondaryCurrency ? ' / '+branch.secondaryCurrency : ''}  |  View: ${view}  |  Period: ${periodLabel}  |  Range: ${dateRange}  |  Records: ${stats?.salesCount || 0} sales`, 10, 28);
            if (!isAll && branch?.address) doc.text(String(branch.address).slice(0,80), 10, 31);

            let y = 36;

            // Executive summary
            doc.setTextColor(15,23,42);
            doc.setFontSize(9);
            doc.setFont('helvetica','bold');
            doc.text('Executive Summary', 10, y); y+=4;
            autoTable(doc, {
                startY: y,
                head: [['Metric', 'Value', 'Note']],
                body: [
                    ['Gross Revenue', formatPrice(stats?.revenue || 0), periodLabel + ' total'],
                    ['Sales Count', String(stats?.salesCount || 0), 'Transactions'],
                    ['Total Stock Qty', String(stats?.totalStock || 0), 'Across inventory'],
                    ['Active Branches', String(stats?.branchCount || 1), user?.role==='admin' ? 'Network' : 'This hub'],
                ],
                theme: 'grid',
                headStyles: { fillColor: [124,58,237], textColor: 255, fontSize: 7 },
                bodyStyles: { fontSize: 7 },
                styles: { cellPadding: 2 },
                columnStyles: { 1: { fontStyle: 'bold' } }
            });
            y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 30;

        // Revenue trend — show even if empty (with placeholder)
        doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.text('Revenue Trajectory — ' + periodLabel, 10, y); y+=4;
        if (trendData.length) {
            autoTable(doc, {
                startY: y,
                head: [['Period', 'Revenue', 'Orders']],
                body: trendData.map((t:any)=> [t.day, formatPrice(t.revenue), String(t.sales)]),
                theme: 'striped',
                headStyles: { fillColor: [16,185,129], fontSize: 7 },
                bodyStyles: { fontSize: 7 },
                styles: { cellPadding: 2 }
            });
            y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 20;
        } else {
            doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(100,116,139);
            doc.text('No trend data for this period — try a longer range or check sales', 10, y); y+=8;
            doc.setTextColor(15,23,42);
        }

        // Top products — detailed, no dashes, respects period
        if (y > 250) { doc.addPage(); y=14; }
        doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.text(`Top Products — ${periodLabel} by quantity sold`, 10, y); y+=4;
        if (topProducts.length) {
            autoTable(doc, {
                startY: y,
                head: [['#','Product','SKU','Qty Sold','Revenue']],
                body: topProducts.slice(0,10).map((p:any,i:number)=> [String(i+1), String(p.product?.name || 'Unknown').slice(0,24), p.product?.sku || 'N/A', String(p.quantitySold ?? p.totalQty ?? 0), formatPrice(p.revenue ?? p.totalRevenue ?? 0)]),
                theme: 'grid',
                headStyles: { fillColor: [245,158,11], fontSize: 7 },
                bodyStyles: { fontSize: 7 },
                styles: { cellPadding: 2 }
            });
            y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 20;
            // Add note about period
            doc.setFontSize(6); doc.setFont('helvetica','italic'); doc.setTextColor(100,116,139);
            doc.text(`Showing top ${Math.min(10, topProducts.length)} products for ${periodLabel} • ${dateRange}`, 10, y); y+=4;
            doc.setTextColor(15,23,42);
        } else {
            doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(100,116,139);
            doc.text(`No product sales for ${periodLabel} — try ${period==='all' ? 'a different filter' : 'All Time or Custom'}`, 10, y); y+=8;
            doc.setTextColor(15,23,42);
        }

        // Revenue chart — draw simple line graph in PDF (no dashes)
        if (trendData.length > 1) {
            if (y > 220) { doc.addPage(); y=14; }
            doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(15,23,42);
            doc.text('Revenue Chart', 10, y); y+=2;
            const chartX = 10, chartY = y, chartW = 190, chartH = 28;
            doc.setDrawColor(226,232,240); doc.setLineWidth(0.2);
            doc.rect(chartX, chartY, chartW, chartH);
            // grid lines
            for (let i=1;i<4;i++) { doc.setDrawColor(241,245,249); doc.line(chartX, chartY + (chartH/4)*i, chartX+chartW, chartY + (chartH/4)*i); }
            const maxRev = Math.max(...trendData.map((t:any)=> t.revenue), 1);
            const stepX = chartW / Math.max(trendData.length - 1, 1);
            doc.setDrawColor(16,185,129); doc.setLineWidth(0.6);
            let prevX=0, prevY=0;
            trendData.forEach((t:any, idx:number) => {
                const x = chartX + idx * stepX;
                const yPos = chartY + chartH - (t.revenue / maxRev) * (chartH - 4) - 2;
                if (idx>0) doc.line(prevX, prevY, x, yPos);
                doc.setFillColor(16,185,129); doc.circle(x, yPos, 1, 'F');
                prevX=x; prevY=yPos;
            });
            doc.setFontSize(5); doc.setTextColor(100,116,139);
            trendData.forEach((t:any, idx:number) => {
                if (idx % Math.ceil(trendData.length/7) === 0) doc.text(String(t.day).slice(0,3), chartX + idx*stepX - 3, chartY + chartH + 4);
            });
            y = chartY + chartH + 8;
        }

        // Payment methods — no dashes
        if (y > 250) { doc.addPage(); y=14; }
        doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(15,23,42); doc.text('Payment Method Breakdown', 10, y); y+=4;
        if (paymentData.length) {
            autoTable(doc, {
                startY: y,
                head: [['Method','Share (value)']],
                body: paymentData.map((p:any)=> [String(p.name||'Unknown').toUpperCase(), formatPrice(p.value)]),
                theme: 'striped',
                headStyles: { fillColor: [59,130,246], fontSize: 7 },
                bodyStyles: { fontSize: 7 },
                styles: { cellPadding: 2 }
            });
            y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 20;
        } else {
            doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(100,116,139);
            doc.text('No payment data for this period', 10, y); y+=8;
            doc.setTextColor(15,23,42);
        }

        // Branch performance — detailed per branch when All Branches
        if (isAll && branchStats.length) {
            if (y > 230) { doc.addPage(); y=14; }
            doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(15,23,42); doc.text(`Branch Performance — ${periodLabel} (All Branches Detailed)`, 10, y); y+=4;
            // Summary for each branch
            autoTable(doc, {
                startY: y,
                head: [['Rank','Branch','Location','Orders','Revenue','Avg Order']],
                body: branchStats.map((b:any,i:number)=> {
                    const avg = b.count ? (b.revenue / b.count) : 0;
                    return [String(i+1), String(b.name).slice(0,18), String(b.location || 'N/A').slice(0,14), String(b.count), formatPrice(b.revenue), formatPrice(avg)];
                }),
                theme: 'grid',
                headStyles: { fillColor: [16,185,129], fontSize: 7 },
                bodyStyles: { fontSize: 7 },
                styles: { cellPadding: 2 }
            });
            y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 20;
            // Add per-branch insight: top branch highlight
            if (branchStats[0]) {
                doc.setFontSize(7); doc.setFont('helvetica','italic'); doc.setTextColor(100,116,139);
                doc.text(`Top performer: ${branchStats[0].name} with ${formatPrice(branchStats[0].revenue)} across ${branchStats[0].count} orders`, 10, y); y+=6;
                doc.setTextColor(15,23,42);
            }
        } else if (branchStats.length) {
            if (y > 230) { doc.addPage(); y=14; }
            doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.text('Branch Performance — ' + periodLabel, 10, y); y+=4;
            autoTable(doc, {
                startY: y,
                head: [['Rank','Branch','Location','Orders','Revenue']],
                body: branchStats.slice(0,10).map((b:any,i:number)=> [String(i+1), String(b.name).slice(0,20), String(b.location || 'N/A').slice(0,15), String(b.count), formatPrice(b.revenue)]),
                theme: 'grid',
                headStyles: { fillColor: [16,185,129], fontSize: 7 },
                bodyStyles: { fontSize: 7 },
                styles: { cellPadding: 2 }
            });
            y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 20;
        }

        // Personnel — detailed, no dashes, show all contributors
        if (y > 230) { doc.addPage(); y=14; }
        doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(15,23,42); doc.text(`Personnel Efficiency — ${periodLabel} (All Contributors)`, 10, y); y+=4;
        if (leaderboard.length) {
            // Sort by revenue desc already, show top 20 with contribution %
            const totalRev = leaderboard.reduce((s:any, l:any)=> s + (l.revenue||0), 0) || 1;
            autoTable(doc, {
                startY: y,
                head: [['Rank','Name','Branch','Role','Orders','Revenue','Share']],
                body: leaderboard.slice(0,20).map((l:any)=> {
                    const share = ((l.revenue/totalRev)*100).toFixed(1)+'%';
                    return [String(l.rank), String(l.name).slice(0,16), String(l.branch||'Unknown').slice(0,12), String(l.role||'staff').toUpperCase().slice(0,10), String(l.count), formatPrice(l.revenue), share];
                }),
                theme: 'grid',
                headStyles: { fillColor: [124,58,237], fontSize: 6 },
                bodyStyles: { fontSize: 6 },
                styles: { cellPadding: 1.5 },
                columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' } }
            });
            y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 20;
            doc.setFontSize(6); doc.setFont('helvetica','italic'); doc.setTextColor(100,116,139);
            doc.text(`Total contributors: ${leaderboard.length} users • Combined revenue: ${formatPrice(totalRev)}`, 10, y); y+=5;
            doc.setTextColor(15,23,42);
        } else {
            doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(100,116,139);
            doc.text('No personnel sales for this period — check branch activity', 10, y); y+=8;
            doc.setTextColor(15,23,42);
        }

        // Detailed ledger — per branch when All, no dashes, full info
        if (y > 200) { doc.addPage(); y=14; }
        doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(15,23,42); doc.text(`Detailed Transactions — ${isAll ? 'All Branches' : branchName} • ${periodLabel}`, 10, y); y+=4;
        const ledgerSales = sales.length ? sales.slice(0,40) : [];
        if (ledgerSales.length) {
            autoTable(doc, {
                startY: y,
                head: [['Receipt','Date','Cashier','Branch','Method','Total']],
                body: ledgerSales.map((s:any)=> [
                    String(s.receiptId||'N/A').slice(0,14),
                    s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A',
                    `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim().slice(0,16) || 'Unknown',
                    String(s.branch?.name || branchName).slice(0,14),
                    String(s.paymentMethod||'cash').toUpperCase().slice(0,10),
                    formatPrice(s.totalAmount)
                ]),
                theme: 'striped',
                headStyles: { fillColor: [71,149,88], fontSize: 6 },
                bodyStyles: { fontSize: 6 },
                styles: { cellPadding: 1.5 },
                columnStyles: { 0: { cellWidth: 28 }, 5: { halign: 'right' } }
            });
            y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 20;
            if (sales.length > 40) {
                doc.setFontSize(6); doc.setFont('helvetica','italic'); doc.setTextColor(100,116,139);
                doc.text(`Showing 40 of ${sales.length} transactions for ${periodLabel} — export CSV for full ledger`, 10, y); y+=6;
                doc.setTextColor(15,23,42);
            }
        } else {
            autoTable(doc, {
                startY: y,
                head: [['Receipt','Date','Cashier','Branch','Method','Total']],
                body: [['No data','No data','No data','No data','No data','No transactions in this period — try All Time or Custom']],
                theme: 'striped',
                headStyles: { fillColor: [71,149,88], fontSize: 6 },
                bodyStyles: { fontSize: 6, halign: 'center' },
                styles: { cellPadding: 2 }
            });
            y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 20;
        }

        // Footer page numbers + note — ensure visible on every page
        const pages = (doc as any).internal.getNumberOfPages();
        for (let i=1;i<=pages;i++) {
            doc.setPage(i);
            doc.setFontSize(6); doc.setTextColor(100,116,139);
            doc.text(`RetailPro • ${branchName} • ${periodLabel} • Page ${i}/${pages} • ${timestamp}`, 10, 292);
            doc.text('Confidential — internal use', 200, 292, {align:'right'});
        }

        const safeBranch = (isAll ? 'ALL_BRANCHES' : branchName).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,30) || 'Branch';
        const safePeriod = period === 'custom' ? `custom_${customFrom}_to_${customTo}` : period;
        doc.save(`RetailPro-${safeBranch}-${safePeriod}-${new Date().toISOString().slice(0,10)}.pdf`);
        toast.success(`${isAll ? 'Network' : 'Branch'} report exported — ${periodLabel} • ${dateRange} — check downloads`);
        } catch (err:any) {
            console.error('PDF export failed', err);
            toast.error('Export failed: ' + (err?.message || 'unknown'));
        }
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
            <header className="bg-background/60 backdrop-blur-xl border-b border-white/5 px-3 sm:px-8 py-4 sm:py-6 sticky top-0 z-[100]">
                <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-8">
                    <div className="flex items-center gap-6 w-full lg:w-auto">
                        <div className="w-14 h-14 bg-violet-500 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-violet-500/30 border-2 border-violet-600">
                            <Activity className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase">
                                Intelligence <span className="text-violet-600 italic">Node</span>
                            </h1>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] mt-1">
                                {isAllBranches ? `Network • All Branches • ${period.toUpperCase()} • ${period==='custom' && customFrom && customTo ? `${customFrom} → ${customTo}` : period==='all' ? 'All Time' : period}` : (branch?.name ? `${branch.name} • ${branch.currency} • ${period.toUpperCase()}` : (user?.role === 'admin' ? 'Cross-Branch Performance Ledger' : 'Branch Performance Ledger'))}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full lg:w-auto justify-start lg:justify-end">
                        {/* Scope — admin: My Branch vs All Branches */}
                        {user?.role === 'admin' && (
                            <div className="flex p-1 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                                {(['my','all'] as const).map(s => (
                                    <button key={s} onClick={()=> setScope(s)} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest min-h-[32px] ${scope===s ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-muted-foreground'}`}>{s==='all' ? 'All Branches' : 'My Branch'}</button>
                                ))}
                            </div>
                        )}
                        <div className="flex p-1 sm:p-1.5 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                            {(['overview', 'ledger', 'leaderboard'] as const).map(v => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={`px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest transition-all min-h-[36px] ${view === v ? 'bg-violet-500 text-white shadow-md border border-violet-600' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>

                        <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 hidden xl:block" />

                        <div className="flex flex-wrap items-center gap-1 p-1 sm:p-1.5 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                            {(['week','month','year','all','custom'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest transition-all min-h-[36px] ${period === p ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        {period==='custom' && (
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                                <input type="date" value={customFrom} onChange={e=> setCustomFrom(e.target.value)} className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" />
                                <span className="text-[10px] font-black">—</span>
                                <input type="date" value={customTo} onChange={e=> setCustomTo(e.target.value)} className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" />
                            </div>
                        )}

                        <button
                            onClick={handleExportPDF}
                            className="h-11 sm:h-14 px-4 sm:px-8 bg-violet-600 hover:bg-violet-700 text-white rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 shadow-lg shadow-violet-500/20 border-2 border-violet-700 flex-1 sm:flex-none min-h-[44px]"
                        >
                            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                            Export PDF
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto w-full px-3 sm:px-8 py-6 sm:py-12 space-y-8 sm:space-y-12 animate-in fade-in duration-700 overflow-x-hidden">
                {view === 'overview' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                            {[
                                { label: 'Gross Yield', value: formatPrice(stats.revenue || 0), icon: DollarSign, color: 'emerald', bg: 'bg-emerald-500' },
                                { label: 'Node Traffic', value: stats.salesCount || 0, icon: ShoppingCart, color: 'sky', bg: 'bg-sky-500' },
                                { label: 'Inventory Load', value: stats.totalStock || 0, icon: Package, color: 'amber', bg: 'bg-amber-500' },
                                { label: 'Active Nodes', value: stats.branchCount || 0, icon: Store, color: 'violet', bg: 'bg-violet-500' }
                            ].map((item, i) => (
                                <div key={i} className="clay-card p-6 sm:p-8 group relative overflow-hidden text-left">
                                    <div className={`absolute top-0 right-0 w-32 h-32 ${item.bg}/10 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:scale-110`} />
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white shadow-md border-2 ${item.bg} border-white/20`}>
                                            <item.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                                        </div>
                                        <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${item.color==='emerald' ? 'text-emerald-600' : item.color==='sky' ? 'text-sky-600' : item.color==='amber' ? 'text-amber-600' : 'text-violet-600'}`}>
                                            <ArrowUpRight className="w-3 h-3" /> Live
                                        </div>
                                    </div>
                                    <div className="mt-6 sm:mt-8 relative z-10">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{item.label}</p>
                                        <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">{item.value}</p>
                                        <p className="text-[9px] text-muted-foreground mt-1">{branch?.name || 'All branches'} • {period}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-12">
                            <div className="xl:col-span-8 space-y-6 sm:space-y-12">
                                <div className="clay-card p-6 sm:p-10 relative overflow-hidden min-w-0">
                                    <div className="flex items-center justify-between mb-8 sm:mb-12">
                                        <div className="text-left">
                                            <h3 className="text-base sm:text-lg font-black text-foreground uppercase tracking-tight">Revenue Trajectory</h3>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Real-time data flow analysis — {period}</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-emerald-500/20 shrink-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                        </div>
                                    </div>
                                    <div className="h-[300px] sm:h-[400px] w-full min-w-0" style={{ minWidth: 0 }}>
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                            <AreaChart data={trendData}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="10 10" vertical={false} stroke={gridColor} />
                                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: textColor, fontWeight: 900 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: textColor, fontWeight: 900 }} />
                                                <Tooltip
                                                    cursor={{ stroke: '#10B981', strokeWidth: 2 }}
                                                    contentStyle={{
                                                        borderRadius: '16px',
                                                        border: '2px solid #e2e8f0',
                                                        backgroundColor: '#ffffff',
                                                        color: '#0f172a',
                                                        padding: '12px'
                                                    }}
                                                />
                                                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="xl:col-span-4 space-y-6 sm:space-y-12">
                                <div className="clay-card p-6 sm:p-8 text-left">
                                    <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em] mb-6 sm:mb-8 border-l-4 border-amber-500 pl-4">Critical Vectors (Top Products)</h3>
                                    <div className="space-y-4 sm:space-y-6">
                                        {topProducts.slice(0, 6).map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-3 sm:gap-4 group">
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center font-black text-[10px] shadow-md border-2 border-amber-600 shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-foreground text-[10px] sm:text-xs uppercase truncate tracking-tight">{item.product.name}</p>
                                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-200 dark:border-slate-700">
                                                        <div 
                                                            className="bg-amber-500 h-full rounded-full transition-all duration-1000" 
                                                            style={{ width: `${(item.quantitySold / (topProducts[0]?.quantitySold || 1)) * 100}%` }} 
                                                        />
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[10px] sm:text-xs font-black text-amber-600">{item.quantitySold}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {topProducts.length===0 && <p className="text-xs text-muted-foreground text-center py-8">No product data for this period</p>}
                                    </div>
                                </div>
                                
                                <div className="clay-card p-6 sm:p-8 text-left min-w-0">
                                    <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em] mb-6 sm:mb-8 border-l-4 border-sky-500 pl-4">Method Distribution</h3>
                                    <div className="h-[180px] sm:h-[200px] w-full min-w-0" style={{ minWidth: 0 }}>
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                            <PieChart>
                                                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none">
                                                    {paymentData.map((_, index) => <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />)}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-6 sm:mt-8 text-left">
                                        {paymentData.map((entry, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: chartColors[idx % chartColors.length] }}></div>
                                                <span className="text-[9px] font-black text-muted-foreground uppercase truncate">{entry.name}</span>
                                            </div>
                                        ))}
                                        {paymentData.length===0 && <p className="col-span-2 text-xs text-muted-foreground text-center py-4">No payment data</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {view === 'ledger' && (
                    <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-8 duration-700 text-left">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm w-full sm:max-w-xl">
                                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
                                <input 
                                    type="text" 
                                    placeholder="SEARCH LEDGER BY RECEIPT OR NODE..." 
                                    className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase w-full tracking-widest outline-none placeholder:text-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button className="p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-violet-400 shadow-sm text-muted-foreground hover:text-violet-600 transition-all">
                                    <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="clay-card overflow-hidden p-0">
                            <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[720px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-200 dark:border-slate-700">
                                        {['Receipt ID', 'Node Name', 'Cashier', 'Method', 'Timestamp', 'Value'].map(h => (
                                            <th key={h} className="px-6 sm:px-8 py-4 sm:py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {sales.filter(s => !searchTerm || s.receiptId.toLowerCase().includes(searchTerm.toLowerCase()) || s.branch?.name.toLowerCase().includes(searchTerm.toLowerCase())).map((sale) => (
                                        <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-6 sm:px-8 py-4 sm:py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-violet-500 text-white flex items-center justify-center border-2 border-violet-600 shadow-sm">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[11px] font-black tracking-tighter text-foreground uppercase">{sale.receiptId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 sm:px-8 py-4 sm:py-6 text-[10px] font-bold text-muted-foreground uppercase">{sale.branch?.name || '—'}</td>
                                            <td className="px-6 sm:px-8 py-4 sm:py-6 text-left">
                                                <div className="flex flex-col text-left">
                                                    <span className="text-[11px] font-black uppercase text-foreground">{sale.user?.firstName} {sale.user?.lastName}</span>
                                                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Terminal Op</span>
                                                </div>
                                            </td>
                                            <td className="px-6 sm:px-8 py-4 sm:py-6">
                                                <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-[9px] font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-700">{sale.paymentMethod}</span>
                                            </td>
                                            <td className="px-6 sm:px-8 py-4 sm:py-6 text-[10px] font-bold text-muted-foreground">
                                                {new Date(sale.createdAt).toLocaleDateString()}
                                                <span className="block text-[8px] opacity-50">{new Date(sale.createdAt).toLocaleTimeString()}</span>
                                            </td>
                                            <td className="px-6 sm:px-8 py-4 sm:py-6">
                                                <span className="text-sm font-black text-emerald-600 tracking-tighter">{formatPrice(sale.totalAmount)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {sales.length===0 && <tr><td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No sales for this period</td></tr>}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'leaderboard' && (
                    <div className="space-y-8 sm:space-y-12 animate-in slide-in-from-bottom-8 duration-700 text-left">
                        {user?.role === 'admin' && (
                              <section className="space-y-6 sm:space-y-8">
                                <h2 className="text-xs font-black text-foreground uppercase tracking-[0.3em] flex items-center gap-3 border-l-4 border-emerald-500 pl-4">Node Performance Ranking</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                                    {branchStats.map((b, idx) => (
                                        <div key={idx} className="clay-card p-6 sm:p-8 group hover:border-emerald-500/30 transition-all duration-500 text-left">
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center border-2 border-emerald-600 shadow-md">
                                                    {idx === 0 ? <Store className="w-6 h-6" /> : <span className="font-black text-sm">{idx + 1}</span>}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{b.location}</p>
                                                </div>
                                            </div>
                                            <h3 className="text-sm font-black text-foreground uppercase tracking-tight mb-6 sm:mb-8 truncate">{b.name}</h3>
                                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                <div className="p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border-2 border-emerald-200 dark:border-emerald-800/30">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Value</p>
                                                    <p className="text-base sm:text-lg font-black text-emerald-600 tracking-tighter">{formatPrice(b.revenue)}</p>
                                                </div>
                                                <div className="p-3 sm:p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Traffic</p>
                                                    <p className="text-base sm:text-lg font-black text-foreground tracking-tighter">{b.count}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {branchStats.length===0 && <p className="text-sm text-muted-foreground">No branch data for this period</p>}
                                </div>
                             </section>
                        )}

                        <section className="space-y-6 sm:space-y-8">
                            <h2 className="text-xs font-black text-foreground uppercase tracking-[0.3em] flex items-center gap-3 border-l-4 border-sky-500 pl-4">Personnel Efficiency Leaderboard</h2>
                            <div className="clay-card overflow-hidden p-0">
                                <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[640px]">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-200 dark:border-slate-700">
                                            {['Rank', 'Personnel', 'Node', 'Efficiency', 'Gross Value'].map(h => (
                                                <th key={h} className="px-6 sm:px-8 py-4 sm:py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {leaderboard.map((item) => (
                                            <tr key={item.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                                <td className="px-6 sm:px-8 py-4 sm:py-6">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[11px] border-2 ${item.rank === 1 ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-white dark:bg-slate-700 text-muted-foreground border-slate-200 dark:border-slate-600'}`}>
                                                        {item.rank}
                                                    </div>
                                                </td>
                                                <td className="px-6 sm:px-8 py-4 sm:py-6 text-left">
                                                    <div className="flex items-center gap-4 text-left">
                                                        <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black text-xs border-2 border-sky-600 shadow-sm uppercase shrink-0">
                                                            {item.name[0]}
                                                        </div>
                                                        <div className="text-left min-w-0">
                                                            <p className="text-[11px] font-black uppercase text-foreground text-left truncate">{item.name}</p>
                                                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-left">{item.role}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 sm:px-8 py-4 sm:py-6 text-[10px] font-bold text-muted-foreground uppercase truncate">{item.branch}</td>
                                                <td className="px-6 sm:px-8 py-4 sm:py-6">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-foreground shrink-0">{item.count} <span className="text-muted-foreground font-medium">Ops</span></span>
                                                        <div className="flex-1 max-w-[100px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                                                            <div className="h-full bg-sky-500" style={{ width: `${(item.count / (leaderboard[0]?.count || 1)) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 sm:px-8 py-4 sm:py-6">
                                                    <span className="text-sm font-black text-emerald-600 tracking-tighter">{formatPrice(item.revenue)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {leaderboard.length===0 && <tr><td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">No personnel data</td></tr>}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
