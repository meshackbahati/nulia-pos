import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/auth-utils';
import { ProductForm } from '@/components/inventory/ProductForm';

export const metadata: Metadata = {
  title: 'Edit Product',
  description: 'Edit an existing product in your inventory',
};

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requireManager();
  const supabase = createClient();
  
  // Fetch the product data
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  // Fetch barcode formats for the form
  const { data: barcodeFormats } = await supabase
    .from('barcode_formats')
    .select('*')
    .order('name');

  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-muted-foreground">
              Update the details for {product.name}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <ProductForm 
            initialData={product} 
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
