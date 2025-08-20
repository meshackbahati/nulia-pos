export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/auth-utils';
import { ProductForm } from '@/components/inventory/ProductForm';

export const metadata: Metadata = {
  title: 'Add New Product',
  description: 'Add a new product to your inventory',
};

export default async function NewProductPage() {
  await requireManager();
  const supabase = createClient();
  
  // Fetch barcode formats for the form
  const { data: barcodeFormats } = await supabase
    .from('barcode_formats')
    .select('*')
    .order('name');

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Add New Product</h1>
          <p className="text-muted-foreground">
            Fill in the details below to add a new product to your inventory
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <ProductForm 
            barcodeFormats={barcodeFormats || []}
            onSuccess={() => {
              // This will be handled by the client-side navigation
            }}
          />
        </div>
      </div>
    </div>
  );
}
