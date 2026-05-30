import { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Download, FileText, Printer, X, Eye, User, Phone, Hash, DollarSign, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api-client';
import { useCurrency } from '../hooks/useCurrency';
import toast from 'react-hot-toast';
import ReceiptModal from '../components/ReceiptModal';

export default function SalesHistoryPage() {
    const { formatPrice } = useCurrency();
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [query, setQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Receipt modal
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [showReceipt, setShowReceipt] = useState(false);

    const limit = 50;

    const fetchSales = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page: currentPage, limit };
            if (query) params.query = query;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (minAmount) params.minAmount = Number(minAmount);
            if (maxAmount) params.maxAmount = Number(maxAmount);

            const response = await api.searchSales(params);
            setSales(response.data.sales || []);
            setTotalPages(response.data.totalPages || 0);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Error fetching sales:', error);
            toast.error('Failed to load sales history');
        } finally {
            setLoading(false);
        }
    }, [currentPage, query, startDate, endDate, minAmount, maxAmount]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchSales();
    };

    const clearFilters = () => {
        setQuery('');
        setStartDate('');
        setEndDate('');
        setMinAmount('');
        setMaxAmount('');
        setCurrentPage(1);
    };

    const viewSaleDetails = async (saleId: string) => {
        try {
            const response = await api.getSale(saleId);
            setSelectedSale(response.data.sale);
            setShowReceipt(true);
        } catch (error) {
            console.error('Error fetching sale:', error);
            toast.error('Failed to load sale details');
        }
    };

    const handleExportCSV = () => {
        if (sales.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['Receipt ID', 'Date', 'Cashier', 'Branch', 'Customer Phone', 'Payment Method', 'Subtotal', 'Tax', 'Discount', 'Total'];
        const rows = sales.map(s => [
            s.receiptId,
            new Date(s.createdAt).toLocaleString(),
            `${s.user?.firstName || ''} ${s.user?.lastName || ''}`,
            s.branch?.name || '',
            s.customerPhone || '',
            s.paymentMethod || '',
            s.subtotal || 0,
            s.taxAmount || 0,
            s.discountAmount || 0,
            s.totalAmount || 0
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sales-history-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exported');
    };

    return (
        <div className="min-h-screen bg-background font-body">
            {/* Header */}
            <div className="bg-card/60 backdrop-blur-md border-b border-border/50 px-6 lg:px-8 py-6">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl lg:text-2xl font-black text-foreground uppercase tracking-tight">Sales History</h1>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{total} transactions found</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-secondary/30 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-secondary/50 transition-all"
                        >
                            <Filter className="w-4 h-4" /> Filters
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-4">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by receipt ID, product, phone, notes..."
                            className="w-full h-12 bg-card border border-border rounded-xl pl-11 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="h-12 px-8 bg-primary text-primary-foreground rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        Search
                    </button>
                    {(query || startDate || endDate || minAmount || maxAmount) && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="h-12 px-4 bg-destructive/10 text-destructive rounded-xl font-black uppercase text-xs tracking-widest border border-destructive/20 hover:bg-destructive/20 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </form>

                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-card/50 rounded-xl border border-border animate-in slide-in-from-top-2">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Start Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="date"
                                    className="w-full h-10 bg-background border border-border rounded-lg pl-10 pr-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="date"
                                    className="w-full h-10 bg-background border border-border rounded-lg pl-10 pr-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Min Amount</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="number"
                                    className="w-full h-10 bg-background border border-border rounded-lg pl-10 pr-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    value={minAmount}
                                    onChange={(e) => setMinAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Max Amount</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="number"
                                    className="w-full h-10 bg-background border border-border rounded-lg pl-10 pr-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    value={maxAmount}
                                    onChange={(e) => setMaxAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sales Table */}
            <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-8">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Loading transactions...</p>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-8 glass-card">
                        <FileText className="w-16 h-16 mb-4 text-muted-foreground/20" />
                        <h3 className="text-base font-black text-foreground uppercase tracking-tighter">No transactions found</h3>
                        <p className="text-xs text-muted-foreground mt-2 font-bold">Try adjusting your search filters</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden lg:block glass-card overflow-hidden border border-border/50">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-secondary/50 border-b border-border/50">
                                        {['Receipt ID', 'Date', 'Cashier', 'Customer', 'Method', 'Items', 'Total', 'Actions'].map(h => (
                                            <th key={h} className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {sales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-secondary/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Hash className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-[11px] font-black text-foreground uppercase tracking-tighter">{sale.receiptId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[10px] font-bold text-foreground">{new Date(sale.createdAt).toLocaleDateString()}</p>
                                                <p className="text-[9px] text-muted-foreground">{new Date(sale.createdAt).toLocaleTimeString()}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span className="text-[11px] font-bold text-foreground">{sale.user?.firstName} {sale.user?.lastName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {sale.customerPhone ? (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-[11px] font-mono text-foreground">{sale.customerPhone}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 bg-secondary/50 rounded-lg text-[9px] font-black uppercase tracking-wider border border-border/50">{sale.paymentMethod}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[11px] font-bold text-foreground">{sale.items?.length || 0} item(s)</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-black text-primary tracking-tighter">{formatPrice(sale.totalAmount)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => viewSaleDetails(sale.id)}
                                                        className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                                                        title="View & Reprint"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => viewSaleDetails(sale.id)}
                                                        className="p-2 bg-secondary/30 text-foreground rounded-lg hover:bg-secondary/50 transition-all"
                                                        title="Print Receipt"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="lg:hidden space-y-3">
                            {sales.map((sale) => (
                                <div key={sale.id} className="glass-card p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Hash className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-[11px] font-black text-foreground uppercase">{sale.receiptId}</span>
                                        </div>
                                        <span className="text-sm font-black text-primary">{formatPrice(sale.totalAmount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString()}</span>
                                        <span className="px-2 py-0.5 bg-secondary/50 rounded text-[9px] font-black uppercase">{sale.paymentMethod}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-muted-foreground">{sale.user?.firstName} {sale.user?.lastName}</span>
                                        <span className="text-[10px] text-muted-foreground">{sale.items?.length || 0} item(s)</span>
                                    </div>
                                    <div className="flex gap-2 pt-2 border-t border-border/30">
                                        <button
                                            onClick={() => viewSaleDetails(sale.id)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase tracking-wider"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> View & Reprint
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 p-4 glass-card">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                                    Page {currentPage} of {totalPages}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 bg-secondary/30 rounded-lg hover:bg-secondary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 bg-secondary/30 rounded-lg hover:bg-secondary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Receipt Modal */}
            {showReceipt && selectedSale && (
                <ReceiptModal
                    sale={selectedSale}
                    companyName={selectedSale.branch?.name || 'RetailPro'}
                    autoPrint={false}
                    onClose={() => {
                        setShowReceipt(false);
                        setSelectedSale(null);
                    }}
                />
            )}
        </div>
    );
}
