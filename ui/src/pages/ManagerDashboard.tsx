'use client';

import { useState, useEffect } from 'react';
import api from '../lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  Plus,
  BarChart3,
  Scan
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../hooks/useCurrency';
import { useSocket } from '../hooks/useSocket';

interface BranchStats {
  todaySales: number;
  todayRevenue: number;
  totalProducts: number;
  lowStockItems: number;
  activeUsers: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentSales: Array<{
    id: string;
    receiptId: string;
    totalAmount: number;
    customer?: string;
    timestamp: string;
  }>;
  branches?: Array<{
    id: string;
    name: string;
    revenue: number;
    salesCount: number;
  }>;
  supplierStats?: Array<{
    supplier: { name: string };
    orderCount: number;
    totalSpent: number;
  }>;
}

export function ManagerDashboard() {
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const userRole = user?.role || '';

  useEffect(() => {
    fetchBranchStats();
  }, []);

  useSocket({
    'inventory-update': () => {
      console.log('🔄 Dashboard: Inventory update received');
      fetchBranchStats();
    },
    'new-sale': (data) => {
      console.log('💰 Dashboard: New sale recorded', data);
      fetchBranchStats();
    },
    'product-update': () => {
      console.log('📦 Dashboard: Product updated');
      fetchBranchStats();
    }
  });

  const fetchBranchStats = async () => {
    try {
      setIsLoading(true);

      // For admin: use scope=all if no active branch (viewing all branches)
      const params: any = {};
      if (user?.role === 'admin' && !user?.branch) {
        params.scope = 'all';
      }

      const [statsRes, branchRes, supplierRes] = await Promise.all([
        api.getDashboardStats(),
        user?.role === 'admin' ? api.get('/analytics/branch-comparison') : Promise.resolve({ data: { branches: [] } }),
        (user?.role === 'admin' || user?.role === 'manager') ? api.getAnalyticsSummary(params) : Promise.resolve({ data: { stats: [] } })
      ]);

      const dashboardData = statsRes.data.stats;
      setStats({
        todaySales: dashboardData.todaySales || 0,
        todayRevenue: dashboardData.todayRevenue || 0,
        totalProducts: dashboardData.totalProducts || 0,
        lowStockItems: dashboardData.lowStockItems || 0,
        activeUsers: dashboardData.activeUsers || 0,
        topProducts: (dashboardData.topProducts || []).map((p: any) => ({
          name: p.product?.name || 'Unknown Product',
          quantity: parseInt(p.quantity),
          revenue: parseFloat(p.revenue)
        })),
        recentSales: (dashboardData.recentSales || []).map((s: any) => ({
          id: s.id,
          receiptId: s.receiptId,
          totalAmount: parseFloat(s.totalAmount),
          timestamp: new Date(s.createdAt).toLocaleTimeString()
        })),
        branches: branchRes.data.branches || [],
        supplierStats: supplierRes.data.stats || []
      });
    } catch (error) {
      console.error('Failed to fetch branch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
            {userRole === 'admin' && !user?.branch
              ? 'System Overview (All Branches)'
              : (user?.branch?.name || 'Branch Dashboard')}
          </h1>
          {user?.branch && (
            <p className="text-muted-foreground">
              {user.branch.name} - {user.branch.currencySymbol} {user.branch.currency}
            </p>
          )}
        </div>
        <div className="flex gap-2">
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-300 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{stats?.todaySales || 0}</div>
            <p className="text-xs text-muted-foreground">
              Transactions today
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-primary">
              {formatPrice(stats?.todayRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue today
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active products
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 hover:border-destructive/40 bg-destructive/5 dark:bg-destructive/10 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-destructive">{stats?.lowStockItems || 0}</div>
            <p className="text-xs text-destructive/80 font-medium">
              Items need restocking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common management tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => navigate('/products')}
              className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-md shadow-primary/10"
              variant="default"
            >
              <Plus className="w-6 h-6" />
              Add Product
            </Button>
            <Button
              onClick={() => navigate('/pos')}
              variant="secondary"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <Scan className="w-6 h-6" />
              Open POS
            </Button>
            <Button
              onClick={() => navigate('/manager/inventory-transfer')}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-secondary"
            >
               <Truck className="w-6 h-6" />
              Inventory Transfer
            </Button>
            <Button
              onClick={() => navigate('/analytics')}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-secondary"
            >
              <BarChart3 className="w-6 h-6" />
              View Reports
            </Button>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Top Products Today</CardTitle>
            <CardDescription>Best performing products</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.topProducts && stats.topProducts.length > 0 ? (
              <div className="space-y-4">
                {stats.topProducts.slice(0, 5).map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold font-mono">
                      {formatPrice(product.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 flex flex-col items-center justify-center text-muted-foreground">
                <Package className="w-12 h-12 mb-4 opacity-20" />
                <p>No sales data yet</p>
                <p className="text-xs mt-1">Start making sales to see top products</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Branch & Supplier Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(userRole === 'admin' || userRole === 'manager') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Branch Comparison
              </CardTitle>
              <CardDescription>Performance across locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.branches && stats.branches.length > 0 ? (
                  stats.branches.map((branch) => (
                    <div key={branch.id} className="flex justify-between items-center p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
                      <span className="text-sm font-medium">{branch.name}</span>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{formatPrice(branch.revenue)}</p>
                        <p className="text-[10px] text-muted-foreground">{branch.salesCount} sales</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-xs text-muted-foreground">No branch data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {(userRole === 'admin' || userRole === 'manager') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Supplier Performance
              </CardTitle>
              <CardDescription>Supply frequency and volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                {stats?.supplierStats && stats.supplierStats.length > 0 ? (
                  stats.supplierStats.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{item.supplier.name}</span>
                      <div className="text-right">
                        <p className="font-bold">{item.orderCount} Orders</p>
                        <p className="text-[10px] text-muted-foreground">{formatPrice(item.totalSpent)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-xs text-muted-foreground">No supplier data available</p>
                )}
                <button
                  onClick={() => navigate('/manager/suppliers')}
                  className="w-full mt-2 text-xs text-primary font-bold hover:underline"
                >
                  View Full Supplier Analytics →
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Latest transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentSales && stats.recentSales.length > 0 ? (
            <div className="space-y-1">
              {stats.recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-3 border-b last:border-0 border-border hover:bg-secondary/20 px-2 -mx-2 rounded-lg transition-colors">
                  <div>
                    <p className="text-sm font-bold font-mono">#{sale.receiptId}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {sale.customer || 'Walk-in customer'}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-border"></span>
                      <p className="text-xs text-muted-foreground">{sale.timestamp}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="text-sm font-bold">
                      {formatPrice(sale.totalAmount)}
                    </span>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">
                      Completed
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 flex flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
              <p>No recent sales</p>
              <p className="text-xs mt-1">Sales will appear here once transactions are made</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} export default ManagerDashboard;
