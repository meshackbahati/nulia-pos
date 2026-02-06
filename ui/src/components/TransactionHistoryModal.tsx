import { useState, useEffect } from 'react';
import { X, Search, Clock, CheckCircle2, AlertCircle, RefreshCw, FileText, Smartphone, Banknote, CreditCard as CardIcon } from 'lucide-react';
import api from '../lib/api-client';
import { useCurrency } from '../hooks/useCurrency';
import toast from 'react-hot-toast';

interface TransactionHistoryModalProps {
    onClose: () => void;
}

export default function TransactionHistoryModal({ onClose }: TransactionHistoryModalProps) {
    const { formatPrice } = useCurrency();
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            setLoading(true);
            const response = await api.listSales({ limit: 50 });
            setSales(response.data.sales || []);
        } catch (error) {
            console.error('Error fetching sales:', error);
            toast.error('Failed to load transaction history');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchSales();
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'pending':
                return <Clock className="w-4 h-4 text-amber-500 animate-pulse" />;
            case 'failed':
                return <AlertCircle className="w-4 h-4 text-destructive" />;
            default:
                return <Clock className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getPaymentMethodIcon = (method: string) => {
        switch (method.toLowerCase()) {
            case 'mpesa':
            case 'mpesa_stk':
            case 'mpesa_c2b':
                return <Smartphone className="w-4 h-4 text-emerald-600" />;
            case 'cash':
                return <Banknote className="w-4 h-4 text-amber-600" />;
            case 'card':
                return <CardIcon className="w-4 h-4 text-blue-600" />;
            default:
                return <FileText className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const filteredSales = sales.filter(sale =>
        sale.receiptId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.customerPhone && sale.customerPhone.includes(searchTerm))
    );

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full h-[80vh] flex flex-col border border-border ring-1 ring-border/50">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Transaction History</h2>
                            <p className="text-xs text-muted-foreground font-medium">View and track recent sales</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            className={`p-2 hover:bg-muted rounded-full transition-colors ${refreshing ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="p-4 bg-muted/30 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by Receipt ID or Phone..."
                            className="w-full h-10 bg-background border border-input rounded-lg pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading && !refreshing ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm font-bold text-muted-foreground">Fetching transactions...</p>
                        </div>
                    ) : filteredSales.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                            <FileText className="w-16 h-16 mb-4 text-muted-foreground/30" />
                            <p className="text-sm font-medium">No transactions found</p>
                            <p className="text-xs text-muted-foreground mt-1">Try a different search or refresh</p>
                        </div>
                    ) : (
                        filteredSales.map((sale) => (
                            <div key={sale.id} className="group p-4 rounded-xl bg-secondary/20 border border-transparent hover:border-border/50 hover:bg-secondary/40 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-foreground uppercase tracking-wider">{sale.receiptId}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground">
                                                {new Date(sale.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-background/50 rounded-full border border-border/50">
                                        {getStatusIcon(sale.paymentStatus)}
                                        <span className={`text-[10px] font-bold uppercase tracking-tight ${sale.paymentStatus === 'completed' ? 'text-emerald-500' :
                                                sale.paymentStatus === 'pending' ? 'text-amber-500' :
                                                    'text-destructive'
                                            }`}>
                                            {sale.paymentStatus}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-end justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase py-0.5">Method</span>
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-background rounded-lg border border-border/50">
                                                {getPaymentMethodIcon(sale.paymentMethod)}
                                                <span className="text-[10px] font-black uppercase">{sale.paymentMethod}</span>
                                            </div>
                                        </div>
                                        {sale.customerPhone && (
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase py-0.5">Customer</span>
                                                <span className="text-[10px] font-black font-mono">{sale.customerPhone}</span>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase py-0.5">Served By</span>
                                            <span className="text-[10px] font-black">{sale.user?.firstName} {sale.user?.lastName}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-muted-foreground block mb-0.5">Total Amount</span>
                                        <span className="text-xl font-black text-primary font-display">{formatPrice(sale.totalAmount)}</span>
                                    </div>
                                </div>

                                {/* Quick Payment Status for M-Pesa STK */}
                                {sale.paymentMethod === 'mpesa' && sale.paymentStatus === 'pending' && sale.payments?.[0]?.externalReference && (
                                    <div className="mt-4 pt-4 border-t border-border/10 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                            <span className="text-[10px] font-bold text-muted-foreground">Waiting for customer response...</span>
                                        </div>
                                        <button
                                            onClick={handleRefresh}
                                            className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                                        >
                                            Check Status
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
