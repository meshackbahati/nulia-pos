import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { ProductList } from '@/components/inventory/ProductList';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/auth-utils';
import { formatCurrency } from '@/lib/utils/currency';

export const metadata: Metadata = {
  title: 'Inventory Management',
  description: 'Manage your inventory and products',
};

export default async function InventoryPage() {
  await requireManager();
  const supabase = createClient();
  
  // Fetch barcode formats for the form
  const { data: barcodeFormats } = await supabase
    .from('barcode_formats')
    .select('*')
    .order('name');
  
  // Fetch initial products data
  const { data: initialProducts } = await supabase
    .from('products')
    .select('*')
    .order('name')
    .limit(10);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground">
              Manage your products and stock levels
            </p>
          </div>
          <div className="flex space-x-2">
            <Button asChild>
              <Link href="/dashboard/manager/inventory/new">
                <Icons.plus className="mr-2 h-4 w-4" />
                Add Product
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/manager/inventory/import">
                <Icons.upload className="mr-2 h-4 w-4" />
                Import
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                <h3 className="text-2xl font-bold">
                  {initialProducts?.length || 0}
                </h3>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <Icons.package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                <h3 className="text-2xl font-bold">
                  {initialProducts?.filter(p => p.quantity <= p.low_stock_threshold).length || 0}
                </h3>
              </div>
              <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/50">
                <Icons.alertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                <h3 className="text-2xl font-bold">
                  {initialProducts?.filter(p => p.quantity === 0).length || 0}
                </h3>
              </div>
              <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/50">
                <Icons.xCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Products</p>
                <h3 className="text-2xl font-bold">
                  {initialProducts?.filter(p => p.is_active).length || 0}
                </h3>
              </div>
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/50">
                <Icons.checkCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <h3 className="text-2xl font-bold">
                  {formatCurrency(
                    initialProducts?.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 0)), 0) || 0
                  )}
                </h3>
              </div>
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/50">
                <Icons.dollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          }>
            <ProductList 
              onEdit={(product) => {
                // This will be handled by the client-side navigation
              }}
              onView={(product) => {
                // This will be handled by the client-side navigation
              }}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
