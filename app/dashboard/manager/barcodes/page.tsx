export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Barcode Management',
  description: 'Generate and manage barcodes for your products',
};

type BarcodeFormat = {
  id: number;
  name: string;
  description: string | null;
};

type ProductWithBarcode = {
  id: string;
  name: string;
  sku: string | null;
  barcode_data: string | null;
  barcode_format: string | null;
  quantity: number;
  updated_at: string;
};

export default async function BarcodeManagementPage() {
  await requireManager();
  const supabase = createClient();
  
  // Fetch barcode formats
  const { data: barcodeFormats } = await supabase
    .from('barcode_formats')
    .select('*')
    .order('name');

  // Fetch products with barcode information
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      sku,
      barcode_data,
      barcode_formats(name),
      quantity,
      updated_at
    `)
    .order('name');

  // Handle barcode generation
  async function generateBarcodes(formData: FormData) {
    'use server';
    
    const productIds = formData.getAll('product_ids');
    const formatId = formData.get('format_id');
    
    if (!formatId) {
      return { error: 'Please select a barcode format' };
    }
    
    if (productIds.length === 0) {
      return { error: 'Please select at least one product' };
    }
    
    try {
      // In a real implementation, we would generate barcodes here
      // This is a simplified example that would be replaced with actual barcode generation
      for (const productId of productIds) {
        // Generate a random barcode for demonstration
        const barcodeData = `BC${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        
        // Update the product with the new barcode
        const { error } = await supabase
          .from('products')
          .update({ 
            barcode_data: barcodeData,
            barcode_format_id: Number(formatId),
            updated_at: new Date().toISOString()
          })
          .eq('id', productId);
          
        if (error) throw error;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error generating barcodes:', error);
      return { error: 'Failed to generate barcodes' };
    }
  }

  // Handle barcode printing
  async function printBarcodes(printType: 'selected' | 'all' = 'selected', productIds?: string[]) {
    'use server';
    
    try {
      // In a real implementation, this would generate a PDF or open a print dialog
      // For now, we'll just log the action
      console.log(`Printing ${printType} barcodes`, productIds);
      return { success: true };
    } catch (error) {
      console.error('Error printing barcodes:', error);
      return { error: 'Failed to print barcodes' };
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Barcode Management</h1>
            <p className="text-muted-foreground">
              Generate and manage barcodes for your products
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:space-y-0 sm:space-x-2">
            <form action={printBarcodes} className="w-full sm:w-auto">
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                <Icons.printer className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Print All Barcodes</span>
                <span className="sm:hidden">Print All</span>
              </Button>
            </form>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6 space-y-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-end sm:space-x-4 sm:space-y-0">
            <div className="flex-1 space-y-2">
              <Label htmlFor="format_id">Barcode Format</Label>
              <Select name="format_id" defaultValue={barcodeFormats?.[0]?.id?.toString()}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a format" />
                </SelectTrigger>
                <SelectContent>
                  {barcodeFormats?.map((format) => (
                    <SelectItem key={format.id} value={format.id.toString()}>
                      {format.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row sm:space-x-2">
                <form action={generateBarcodes} className="flex space-x-2">
                <Button type="submit" variant="default" className="w-full sm:w-auto">
                    <Icons.barcode className="mr-2 h-4 w-4" />
                    Generate Barcodes
                </Button>
                </form>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="hidden sm:table-cell">Format</TableHead>
                  <TableHead className="hidden sm:table-cell">Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <input 
                        type="checkbox" 
                        name="product_ids" 
                        value={product.id}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="font-mono hidden sm:table-cell">{product.sku || 'N/A'}</TableCell>
                    <TableCell className="font-mono">
                      {product.barcode_data || (
                        <span className="text-muted-foreground">No barcode</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {product.barcode_formats?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatDate(product.updated_at, 'PP')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button variant="ghost" size="icon" asChild>
                          <a 
                            href={`/dashboard/manager/inventory/${product.id}`}
                            title="View Product"
                          >
                            <Icons.eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </a>
                        </Button>
                        <form action={printBarcodes}>
                          <input type="hidden" name="product_ids" value={product.id} />
                          <Button 
                            type="submit" 
                            variant="ghost" 
                            size="icon"
                            disabled={!product.barcode_data}
                            title="Print Barcode"
                          >
                            <Icons.printer className="h-4 w-4" />
                            <span className="sr-only">Print</span>
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {products?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Icons.packageOpen className="mx-auto h-8 w-8 mb-2" />
                      <p>No products found.</p>
                      <p className="text-sm">Add products to your inventory to generate barcodes.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
