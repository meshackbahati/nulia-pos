import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/auth-utils';
import { formatCurrency, formatDate } from '@/lib/utils';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  return {
    title: product ? `${product.name} | Product Details` : 'Product Not Found',
  };
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  await requireManager();
  const supabase = createClient();
  
  // Fetch product details
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !product) {
    notFound();
  }

  // Fetch inventory transactions for this product
  const { data: transactions } = await supabase
    .from('inventory_transactions')
    .select('*, profiles(full_name)')
    .eq('product_id', params.id)
    .order('created_at', { ascending: false });

  // Calculate stock statistics
  const totalIn = transactions
    ?.filter(t => ['purchase', 'return', 'transfer_in'].includes(t.transaction_type))
    .reduce((sum, t) => sum + t.quantity, 0) || 0;

  const totalOut = transactions
    ?.filter(t => ['sale', 'adjustment', 'transfer_out'].includes(t.transaction_type))
    .reduce((sum, t) => sum + t.quantity, 0) || 0;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-6">
        {/* Header with back button and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/manager/inventory">
                <Icons.chevronLeft className="h-5 w-5" />
                <span className="sr-only">Back</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
              <p className="text-muted-foreground">
                SKU: {product.sku || 'N/A'} | Barcode: {product.barcode_data || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/manager/inventory/${product.id}/edit`}>
                <Icons.edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/manager/inventory/${product.id}/stock`}>
                <Icons.plusCircle className="mr-2 h-4 w-4" />
                Update Stock
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Product details */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{product.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{product.category || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">SKU</p>
                    <p className="font-mono">{product.sku || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Barcode</p>
                    <p className="font-mono">{product.barcode_data || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex items-center">
                      <Badge variant={product.is_active ? 'default' : 'outline'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  {product.expiry_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Expiry Date</p>
                      <p className="font-medium">
                        {formatDate(product.expiry_date)}
                        {new Date(product.expiry_date) < new Date() && (
                          <span className="ml-2 text-sm text-red-500">(Expired)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                
                {product.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="whitespace-pre-line">{product.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Selling Price</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(product.price, product.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cost Price</p>
                    <p className="text-lg">
                      {product.cost 
                        ? formatCurrency(product.cost, product.currency)
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Profit Margin</p>
                    <p className="text-lg">
                      {product.cost 
                        ? `${Math.round(((product.price - product.cost) / product.price) * 100)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock information */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Stock Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Current Stock</span>
                      <span className="font-medium">
                        {product.quantity} {product.quantity === 1 ? 'unit' : 'units'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          product.quantity <= 0 
                            ? 'bg-red-500' 
                            : product.quantity <= (product.low_stock_threshold || 0)
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (product.quantity / (product.low_stock_threshold * 2 || 20)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Low Stock Level</p>
                      <p className="font-medium">
                        {product.low_stock_threshold} units
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reorder Point</p>
                      <p className="font-medium">
                        {product.reorder_point} units
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-2">Stock Status</p>
                    <div className="flex items-center">
                      {product.quantity <= 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <Icons.xCircle className="h-3 w-3" />
                          Out of Stock
                        </Badge>
                      ) : product.quantity <= (product.low_stock_threshold || 0) ? (
                        <Badge variant="warning" className="gap-1">
                          <Icons.alertTriangle className="h-3 w-3" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="success" className="gap-1">
                          <Icons.checkCircle2 className="h-3 w-3" />
                          In Stock
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Stock Movement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total In</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        +{totalIn} units
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Out</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        -{totalOut} units
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-2">Last Updated</p>
                    <p className="font-medium">
                      {formatDate(product.updated_at, 'PPpp')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transactions history */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions && transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Unit Cost
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Total Cost
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(transaction.created_at, 'PPpp')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={
                              ['purchase', 'return', 'transfer_in'].includes(transaction.transaction_type)
                                ? 'success'
                                : 'destructive'
                            }
                            className="capitalize"
                          >
                            {transaction.transaction_type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {['purchase', 'return', 'transfer_in'].includes(transaction.transaction_type) ? '+' : '-'}
                          {transaction.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                          {transaction.unit_cost 
                            ? formatCurrency(transaction.unit_cost, product.currency)
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {transaction.total_cost 
                            ? formatCurrency(transaction.total_cost, product.currency)
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {transaction.profiles?.full_name || 'System'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {transaction.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Icons.packageOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium">No inventory history</h3>
                <p className="mt-1 text-sm">Stock movements will appear here when they occur.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
