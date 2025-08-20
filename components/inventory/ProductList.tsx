"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { getProducts, deleteProduct } from '@/lib/api/inventory';
import { Product } from '@/lib/database.types';
import { useDebounce } from '@/hooks/use-debounce';

interface ProductListProps {
  onEdit: (product: Product) => void;
  onView: (product: Product) => void;
}

export function ProductList({ onEdit, onView }: ProductListProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchProducts = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
      });

      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }

      setProducts(data.data);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1, debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete product');
      }

      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });

      // Refresh the product list
      fetchProducts(pagination.page, debouncedSearchTerm);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchProducts(newPage, debouncedSearchTerm);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button onClick={() => router.push('/dashboard/manager/products/new')}>
          <Icons.plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Add Product</span>
        </Button>
      </div>

      <div className="md:hidden">
        {products.map((product) => (
          <div key={product.id} className="mb-4 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{product.name}</div>
              <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                <Button variant="ghost" size="sm" onClick={() => onView(product)}>
                  <Icons.eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(product)}>
                  <Icons.edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} className="text-destructive hover:text-destructive">
                  <Icons.trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">{product.category}</div>
            <div className="mt-2 flex justify-between">
              <div>
                <div className="text-sm">Price</div>
                <div>{formatCurrency(product.price, product.currency)}</div>
              </div>
              <div>
                <div className="text-sm">Stock</div>
                <div className="flex items-center space-x-2">
                  <span>{product.quantity}</span>
                  {product.quantity <= (product.low_stock_threshold || 0) && (
                    <Icons.alertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm">Status</div>
                <Badge variant={product.quantity > 0 ? 'default' : 'destructive'} className="capitalize">
                  {product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No products match your search' : 'No products found'}
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span>{product.name}</span>
                      {!product.is_active && (
                        <Badge variant="outline" className="border-dashed">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{product.sku || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">{product.barcode_data || '-'}</TableCell>
                  <TableCell>{product.category || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span>{product.quantity}</span>
                      {product.quantity <= (product.low_stock_threshold || 0) && (
                        <Icons.alertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(product.price, product.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={product.quantity > 0 ? 'default' : 'destructive'} className="capitalize">
                      {product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => onView(product)}>
                        <Icons.eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(product)}>
                        <Icons.edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} className="text-destructive hover:text-destructive">
                        <Icons.trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-medium">{pagination.total}</span> products
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
