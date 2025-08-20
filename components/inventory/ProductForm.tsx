"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Icons } from '@/components/icons';
import { formatCurrency } from '@/lib/utils';

type BarcodeFormat = {
  id: number;
  name: string;
  description: string | null;
};

const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().optional(),
  barcode_format_id: z.number().optional(),
  barcode_data: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  cost: z.coerce.number().min(0, 'Cost must be a positive number').optional(),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative'),
  low_stock_threshold: z.coerce.number().min(0, 'Threshold cannot be negative'),
  reorder_point: z.coerce.number().min(0, 'Reorder point cannot be negative'),
  currency: z.string().default('UGX'),
  is_active: z.boolean().default(true),
  supplier_id: z.string().optional(),
  expiry_date: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  initialData?: any;
  onSuccess?: () => void;
  barcodeFormats: BarcodeFormat[];
}

export function ProductForm({ initialData, onSuccess, barcodeFormats }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const isEditMode = !!initialData?.id;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialData || {
      quantity: 0,
      price: 0,
      cost: 0,
      low_stock_threshold: 10,
      reorder_point: 5,
      currency: 'UGX',
      is_active: true,
    },
  });

  const barcodeFormatId = watch('barcode_format_id');
  const barcodeData = watch('barcode_data');

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const generateBarcode = async () => {
    if (!barcodeFormatId) {
      toast({
        title: 'Error',
        description: 'Please select a barcode format first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGeneratingBarcode(true);
      const response = await fetch('/api/barcodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: initialData?.id,
          formatId: barcodeFormatId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate barcode');
      }

      setValue('barcode_data', data.barcode);
      toast({
        title: 'Success',
        description: 'Barcode generated successfully',
      });
    } catch (error) {
      console.error('Error generating barcode:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate barcode',
        variant: 'destructive',
      });
    } finally {
      setGeneratingBarcode(false);
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    try {
      setLoading(true);
      const url = isEditMode 
        ? `/api/products/${initialData.id}`
        : '/api/products';
      
      const method = isEditMode ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to save product');
      }

      toast({
        title: 'Success',
        description: isEditMode 
          ? 'Product updated successfully' 
          : 'Product created successfully',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/manager/inventory');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save product',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              placeholder="Enter product name"
              {...register('name')}
              error={errors.name?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter product description"
              {...register('description')}
              error={errors.description?.message}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              placeholder="e.g., Electronics, Grocery"
              {...register('category')}
              error={errors.category?.message}
            />
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Pricing & Inventory</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Selling Price *</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">
                    {watch('currency')}
                  </span>
                </div>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  className="pl-12"
                  {...register('price')}
                  error={errors.price?.message}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Cost Price</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">
                    {watch('currency')}
                  </span>
                </div>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  className="pl-12"
                  {...register('cost')}
                  error={errors.cost?.message}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Current Stock</Label>
              <Input
                id="quantity"
                type="number"
                {...register('quantity')}
                error={errors.quantity?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
              <Input
                id="low_stock_threshold"
                type="number"
                {...register('low_stock_threshold')}
                error={errors.low_stock_threshold?.message}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reorder_point">Reorder Point</Label>
            <Input
              id="reorder_point"
              type="number"
              {...register('reorder_point')}
              error={errors.reorder_point?.message}
            />
            <p className="text-xs text-muted-foreground">
              When stock reaches this level, you'll be notified to reorder.
            </p>
          </div>
        </div>

        {/* Barcode Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Barcode</h3>
          
          <div className="space-y-2">
            <Label htmlFor="barcode_format_id">Barcode Format</Label>
            <Select
              onValueChange={(value) => setValue('barcode_format_id', parseInt(value))}
              value={barcodeFormatId?.toString() || ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select barcode format" />
              </SelectTrigger>
              <SelectContent>
                {barcodeFormats.map((format) => (
                  <SelectItem key={format.id} value={format.id.toString()}>
                    {format.name} - {format.description || 'No description'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode_data">Barcode Data</Label>
            <div className="flex space-x-2">
              <Input
                id="barcode_data"
                placeholder="Barcode will be generated"
                value={barcodeData || ''}
                readOnly
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateBarcode}
                disabled={!barcodeFormatId || generatingBarcode}
              >
                {generatingBarcode ? (
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                  <Icons.barcode className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>
            </div>
            {barcodeData && (
              <div className="mt-2 p-2 border rounded-md bg-muted/50">
                <p className="text-xs font-mono">{barcodeData}</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Additional Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
            <Input
              id="sku"
              placeholder="e.g., PRD-001"
              {...register('sku')}
              error={errors.sku?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry_date">Expiry Date (if applicable)</Label>
            <Input
              id="expiry_date"
              type="date"
              {...register('expiry_date')}
              error={errors.expiry_date?.message}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
