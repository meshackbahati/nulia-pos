import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { SalesChart } from './components/SalesChart';
import { TopProductsChart } from './components/TopProductsChart';
import { SalesTable } from './components/SalesTable';

export const metadata: Metadata = {
  title: 'Sales Dashboard',
  description: 'View and analyze sales performance',
};

export const dynamic = 'force-dynamic';

export default async function SalesDashboardPage() {
  await requireManager();
  const supabase = createClient();
  
  // Get current date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const dateRange = {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };
  
  // Fetch sales summary data
  const { data: summaryData } = await supabase
    .rpc('get_sales_summary', {
      p_start_date: dateRange.start,
      p_end_date: dateRange.end,
    });
    
  const summary = summaryData ? summaryData[0] : {
    total_sales: 0,
    total_orders: 0,
    avg_order_value: 0,
    total_items_sold: 0,
    total_tax: 0,
    total_discount: 0,
  };
  
  // Fetch recent sales
  const { data: recentSales } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  // Fetch top products
  const { data: topProducts } = await supabase
    .from('sales_by_product')
    .select('*')
    .order('total_quantity', { ascending: false })
    .limit(5);
  
  // Fetch sales performance by day for the chart
  const { data: dailySales } = await supabase
    .from('daily_sales')
    .select('*')
    .gte('sale_date', dateRange.start)
    .lte('sale_date', dateRange.end)
    .order('sale_date', { ascending: true });

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your sales performance
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="hidden sm:flex">
              <Icons.download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button asChild>
              <a href="/dashboard/manager/sales/pos">
                <Icons.shoppingCart className="mr-2 h-4 w-4" />
                New Sale
              </a>
            </Button>
          </div>
        </div>
        
        {/* Date Range Picker - Simplified for now */}
        <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
          <div className="text-sm text-muted-foreground">
            Showing data from {formatDate(dateRange.start, 'PP')} to {formatDate(dateRange.end, 'PP')}
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Icons.calendar className="mr-2 h-4 w-4" />
            Change Date Range
          </Button>
        </div>
        
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Sales
              </CardTitle>
              <Icons.dollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.total_sales || 0, 'UGX')}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.total_orders || 0} orders
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Order Value
              </CardTitle>
              <Icons.creditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.avg_order_value || 0, 'UGX')}
              </div>
              <p className="text-xs text-muted-foreground">
                per order
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Items Sold
              </CardTitle>
              <Icons.package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summary.total_items_sold || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                units sold
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tax & Discounts
              </CardTitle>
              <Icons.receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>{formatCurrency(summary.total_tax || 0, 'UGX')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discounts:</span>
                  <span className="text-red-500">-{formatCurrency(summary.total_discount || 0, 'UGX')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Sales Overview</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <SalesChart data={dailySales || []} />
                </CardContent>
              </Card>
              
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Top Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <TopProductsChart products={topProducts || []} />
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <SalesTable sales={recentSales || []} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>All Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <SalesTable 
                  sales={[]} 
                  showPagination={true} 
                  pageSize={10}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Product performance analytics coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Sales Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Custom sales reports coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
