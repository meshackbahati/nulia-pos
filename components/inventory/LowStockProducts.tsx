'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

type Product = {
  id: string;
  name: string;
  barcode: string;
  quantity: number;
  low_stock_threshold: number;
  price: number;
  currency: string;
  supplier_name?: string;
};

export function LowStockProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLowStockProducts() {
      try {
        setLoading(true);
        
        // First, get all products that are low on stock
        const { data: allProducts, error: fetchError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            barcode,
            quantity,
            low_stock_threshold,
            price,
            currency,
            suppliers ( name )
          `)
          .order('quantity', { ascending: true });

        if (fetchError) throw fetchError;

        // Filter in JavaScript for more complex conditions
        const lowStockProducts = (allProducts || []).filter(product => {
          const threshold = product.low_stock_threshold ?? 5; // Default threshold of 5 if not set
          return product.quantity > 0 && product.quantity <= threshold;
        }).slice(0, 10); // Limit to 10 items

        // Transform the data to include the supplier name
        const formattedProducts = lowStockProducts.map((product: any) => ({
          ...product,
          supplier_name: product.suppliers?.name
        }));

        setProducts(formattedProducts);
      } catch (error) {
        console.error('Error fetching low stock products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLowStockProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Icons.spinner className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Icons.packageSearch className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium">All products are well-stocked</h3>
        <p className="text-sm text-muted-foreground">No items are currently below their low stock threshold.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Low Stock Alert</CardTitle>
            <CardDescription>
              Products that need restocking (≤ {products[0]?.low_stock_threshold} units)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/manager/inventory">
              View All
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Product</TableHead>
              <TableHead className="hidden sm:table-cell">Barcode</TableHead>
              <TableHead className="hidden sm:table-cell">Supplier</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Price (KES)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <Link 
                    href={`/dashboard/manager/inventory/${product.id}`}
                    className="hover:underline"
                  >
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">
                  {product.barcode}
                </TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">
                  {product.supplier_name || 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <span className={product.quantity === 0 ? 'text-red-600 font-medium' : 'text-amber-600 font-medium'}>
                    {product.quantity} / {product.low_stock_threshold}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  KES {product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
