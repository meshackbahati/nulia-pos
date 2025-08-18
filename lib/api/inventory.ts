import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];
type InventoryTransaction = Database['public']['Tables']['inventory_transactions']['Row'];
type BarcodeFormat = Database['public']['Tables']['barcode_formats']['Row'];

export async function getProducts() {
  const supabase = createClient();
  return await supabase
    .from('products')
    .select('*')
    .order('name');
}

export async function getProductById(id: string) {
  const supabase = createClient();
  return await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
}

export async function createProduct(product: Omit<Partial<Product>, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient();
  return await supabase
    .from('products')
    .insert([product])
    .select()
    .single();
}

export async function updateProduct(id: string, updates: Partial<Product>) {
  const supabase = createClient();
  return await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

export async function deleteProduct(id: string) {
  const supabase = createClient();
  return await supabase
    .from('products')
    .delete()
    .eq('id', id);
}

export async function getInventoryTransactions(productId?: string) {
  const supabase = createClient();
  let query = supabase
    .from('inventory_transactions')
    .select('*, products(name, barcode_data)')
    .order('created_at', { ascending: false });

  if (productId) {
    query = query.eq('product_id', productId);
  }

  return await query;
}

export async function createInventoryTransaction(transaction: Omit<InventoryTransaction, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient();
  return await supabase
    .from('inventory_transactions')
    .insert([transaction])
    .select()
    .single();
}

export async function getBarcodeFormats() {
  const supabase = createClient();
  return await supabase
    .from('barcode_formats')
    .select('*')
    .order('name');
}

export async function generateBarcode(productId: string, formatId: number) {
  const supabase = createClient();
  return await supabase.rpc('generate_barcode_data', {
    p_product_id: productId,
    format_id: formatId
  });
}

export async function getCurrentStockLevels() {
  const supabase = createClient();
  return await supabase
    .from('current_stock_levels')
    .select('*')
    .order('product_name');
}

export async function getLowStockProducts(threshold?: number) {
  const supabase = createClient();
  const query = supabase
    .from('current_stock_levels')
    .select('*')
    .lte('calculated_quantity', threshold || 10)
    .order('calculated_quantity');
    
  return await query;
}
