import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/use-toast';
import { Icons } from '@/components/icons';
import { formatCurrency } from '@/lib/utils';

const transactionTypes = [
  { value: 'adjustment', label: 'Stock Adjustment', description: 'Update stock level to a specific amount' },
  { value: 'receive', label: 'Receive Stock', description: 'Add stock to inventory' },
  { value: 'return', label: 'Customer Return', description: 'Return items from a customer' },
  { value: 'damaged', label: 'Mark as Damaged', description: 'Remove damaged items from inventory' },
  { value: 'expired', label: 'Mark as Expired', description: 'Remove expired items from inventory' },
  { value: 'transfer_in', label: 'Transfer In', description: 'Receive items from another location' },
  { value: 'transfer_out', label: 'Transfer Out', description: 'Send items to another location' },
] as const;

const formSchema = z.object({
  transaction_type: z.enum(transactionTypes.map(t => t.value) as [string, ...string[]]),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  unit_cost: z.coerce.number().min(0, 'Cost must be 0 or greater').optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  location_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const metadata: Metadata = {
  title: 'Update Stock',
  description: 'Update stock levels for a product',
};

export default async function UpdateStockPage({ params }: { params: { id: string } }) {
  await requireManager();
  const supabase = createClient();
  
  // Fetch the product data
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!product) {
    notFound();
  }

  // Handle form submission
  async function handleSubmit(formData: FormData) {
    'use server';
    
    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = formSchema.safeParse({
      ...rawFormData,
      quantity: Number(rawFormData.quantity),
      unit_cost: rawFormData.unit_cost ? Number(rawFormData.unit_cost) : undefined,
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing or invalid fields. Please check your input.',
      };
    }

    const { transaction_type, quantity, unit_cost, reference, notes } = validatedFields.data;
    
    try {
      // Create the inventory transaction
      const { data: transaction, error } = await supabase
        .from('inventory_transactions')
        .insert([{
          product_id: product.id,
          transaction_type,
          quantity: ['adjustment', 'receive', 'return', 'transfer_in'].includes(transaction_type) 
            ? quantity 
            : -quantity, // Negative for outbound transactions
          unit_cost: unit_cost || product.cost || 0,
          total_cost: unit_cost ? unit_cost * quantity : (product.cost || 0) * quantity,
          reference,
          notes,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update the product quantity
      const newQuantity = transaction_type === 'adjustment'
        ? quantity
        : ['receive', 'return', 'transfer_in'].includes(transaction_type)
          ? (product.quantity || 0) + quantity
          : (product.quantity || 0) - quantity;

      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('id', product.id);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      console.error('Error updating stock:', error);
      return {
        message: 'Failed to update stock. Please try again.',
      };
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Update Stock</h1>
          <p className="text-muted-foreground">
            Update stock levels for <span className="font-medium">{product.name}</span>
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-bold">{product.quantity || 0} units</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">SKU</p>
              <p className="font-mono">{product.sku || 'N/A'}</p>
            </div>
          </div>

          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Transaction Type</h3>
              <RadioGroup 
                defaultValue="adjustment" 
                name="transaction_type"
                className="grid gap-4"
              >
                {transactionTypes.map((type) => (
                  <div key={type.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={type.value} id={type.value} />
                    <div className="flex-1">
                      <Label htmlFor={type.value} className="font-normal">
                        {type.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input 
                  id="quantity" 
                  name="quantity" 
                  type="number" 
                  min="1" 
                  required 
                  placeholder="Enter quantity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_cost">Unit Cost ({product.currency})</Label>
                <Input 
                  id="unit_cost" 
                  name="unit_cost" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  placeholder={product.cost ? product.cost.toString() : '0.00'}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use product cost: {formatCurrency(product.cost || 0, product.currency)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input 
                id="reference" 
                name="reference" 
                placeholder="e.g., PO #123, RMA #456" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea 
                id="notes" 
                name="notes" 
                placeholder="Add any additional notes about this transaction" 
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Button type="button" variant="outline" asChild>
                <a href={`/dashboard/manager/inventory/${product.id}`}>Cancel</a>
              </Button>
              <Button type="submit">
                <Icons.save className="mr-2 h-4 w-4" />
                Update Stock
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
