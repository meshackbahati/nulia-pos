import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api-client';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface CurrencyRow {
    currency: string;
    symbol: string;
    saleCount: number;
    baseTotal: number;
    displayTotal: number;
    percentageOfTotal: number;
}

interface BreakdownData {
    currencies: CurrencyRow[];
    totalSales: number;
    totalBaseRevenue: number;
    totalSymbol: string;
}

export default function CurrencyBreakdownWidget() {
    const { user } = useAuth();
    const [data, setData] = useState<BreakdownData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');

    useEffect(() => {
        loadData();
    }, [period]);

    const loadData = async () => {
        try {
            setLoading(true);
            const params: any = { period };
            if (user?.role !== 'admin') params.scope = 'branch';
            const res = await api.get('/analytics/currency-breakdown', { params });
            setData(res.data);
        } catch (err) {
            console.error('Currency breakdown load error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-8 bg-muted rounded w-2/3" />
                    <div className="h-8 bg-muted rounded w-1/2" />
                </div>
            </div>
        );
    }

    if (!data || data.currencies.length === 0) {
        return (
            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                <p className="text-sm text-muted-foreground">No sales data yet</p>
            </div>
        );
    }

    const hasMultipleCurrencies = data.currencies.length > 1;

    return (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Currency Performance
                </h3>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="text-xs border border-input rounded-md bg-background px-2 py-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                </select>
            </div>

            {/* Grand total */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                    <p className="text-xs text-muted-foreground">Total Revenue (KES base)</p>
                    <p className="text-lg font-bold text-foreground">
                        KSh {data.totalBaseRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{data.totalSales} sales</p>
                </div>
            </div>

            {/* Per-currency breakdown */}
            <div className="space-y-3">
                {data.currencies.map((c) => (
                    <div key={c.currency} className="p-3 rounded-lg bg-card border border-border/40">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">{c.symbol}</span>
                                <span className="text-xs text-muted-foreground">{c.currency}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{c.saleCount} sale{c.saleCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold text-foreground">
                                {c.symbol}{c.symbol.length > 1 ? ' ' : ''}{c.displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {hasMultipleCurrencies && (
                                <span className="text-xs text-muted-foreground">
                                    KSh {c.baseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} base
                                    <span className="ml-1 text-primary">({c.percentageOfTotal}%)</span>
                                </span>
                            )}
                        </div>
                        {hasMultipleCurrencies && (
                            <div className="mt-2 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${c.percentageOfTotal}%` }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
