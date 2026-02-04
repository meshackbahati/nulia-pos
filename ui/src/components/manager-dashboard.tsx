'use client';

import { useState, useEffect } from 'react';
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
  Settings,
  Scan
} from 'lucide-react';

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
    total: number;
    customer?: string;
    timestamp: string;
  }>;
}

export function ManagerDashboard() {
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role);
    }

    fetchBranchStats();
  }, []);

  const fetchBranchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/manager/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setBranchName(data.branchName);
      }
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
      {/* Header - Already in Layout but we can keep page specific actions or title if needed, 
          but Layout usually handles the main header. 
          Given the Layout implementation, we can remove the duplicated header here 
          or just treat this as the content area. */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
            {userRole === 'admin' ? 'System Overview' : 'Branch Dashboard'}
          </h1>
          {branchName && (
            <p className="text-muted-foreground">{branchName}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
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
            <div className="text-2xl font-bold font-display text-primary">${stats?.todayRevenue?.toFixed(2) || '0.00'}</div>
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
            <Button className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-md shadow-primary/10" variant="default">
              <Plus className="w-6 h-6" />
              Add Product
            </Button>
            <Button variant="secondary" className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
              <Scan className="w-6 h-6" />
              Open POS
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-secondary">
              <Users className="w-6 h-6" />
              Manage Staff
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-secondary">
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
                    <span className="text-sm font-bold font-mono">${product.revenue.toFixed(2)}</span>
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
                    <span className="text-sm font-bold">${sale.total.toFixed(2)}</span>
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
}