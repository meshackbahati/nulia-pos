import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/database.types';

type Sale = Database['public']['Tables']['sales']['Row'];
type SaleItem = Database['public']['Tables']['sale_items']['Row'];

export interface CreateSaleInput {
  customer_id?: string | null;
  payment_method: string;
  payment_status: 'pending' | 'completed' | 'refunded' | 'partially_refunded';
  status: 'draft' | 'completed' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  notes?: string | null;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    tax_amount?: number;
    total_price: number;
  }>;
}

export interface UpdateSaleInput {
  payment_status?: 'pending' | 'completed' | 'refunded' | 'partially_refunded';
  status?: 'draft' | 'completed' | 'cancelled';
  notes?: string | null;
}

export const salesService = {
  // Create a new sale
  async createSale(saleData: CreateSaleInput) {
    const supabase = createClient();
    
    // Start a transaction
    const { data, error } = await supabase.rpc('create_sale_transaction', {
      p_sale_data: {
        customer_id: saleData.customer_id,
        payment_method: saleData.payment_method,
        payment_status: saleData.payment_status,
        status: saleData.status,
        subtotal: saleData.subtotal,
        tax_amount: saleData.tax_amount,
        discount_amount: saleData.discount_amount,
        total: saleData.total,
        notes: saleData.notes,
      },
      p_items: saleData.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount || 0,
        tax_amount: item.tax_amount || 0,
        total_price: item.total_price,
      })),
    });

    if (error) throw error;
    return data;
  },

  // Update a sale
  async updateSale(saleId: string, updates: UpdateSaleInput) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sales')
      .update(updates)
      .eq('id', saleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get a sale by ID with items and product details
  async getSaleById(saleId: string) {
    const supabase = createClient();
    
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single();

    if (saleError) throw saleError;

    const { data: items, error: itemsError } = await supabase
      .from('sale_items')
      .select(`
        *,
        products (id, name, sku, barcode_data)
      `)
      .eq('sale_id', saleId);

    if (itemsError) throw itemsError;

    return { ...sale, items };
  },

  // List sales with filtering and pagination
  async listSales({
    startDate,
    endDate,
    status,
    paymentStatus,
    salespersonId,
    page = 1,
    pageSize = 20,
  }: {
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentStatus?: string;
    salespersonId?: string;
    page?: number;
    pageSize?: number;
  } = {}) {
    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('sales')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      // Add one day to include the end date
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query = query.lt('created_at', nextDay.toISOString().split('T')[0]);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }
    if (salespersonId) {
      query = query.eq('salesperson_id', salespersonId);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return { data, count: count || 0, page, pageSize };
  },

  // Get sales summary for dashboard
  async getSalesSummary({
    startDate,
    endDate,
    salespersonId,
  }: {
    startDate?: string;
    endDate?: string;
    salespersonId?: string;
  } = {}) {
    const supabase = createClient();
    
    let query = supabase.rpc('get_sales_summary', {
      p_start_date: startDate || new Date(0).toISOString(),
      p_end_date: endDate || new Date().toISOString(),
      p_salesperson_id: salespersonId || null,
    });

    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },

  // Get sales by product for reporting
  async getSalesByProduct({
    startDate,
    endDate,
    limit = 10,
  }: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}) {
    const supabase = createClient();
    
    let query = supabase
      .from('sales_by_product')
      .select('*')
      .order('total_quantity', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('sale_date', startDate);
    }
    if (endDate) {
      query = query.lte('sale_date', endDate);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },

  // Get sales performance by salesperson
  async getSalesPerformance({
    startDate,
    endDate,
    limit = 10,
  }: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}) {
    const supabase = createClient();
    
    let query = supabase
      .from('sales_performance')
      .select('*')
      .order('total_sales', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('sale_date', startDate);
    }
    if (endDate) {
      query = query.lte('sale_date', endDate);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },
};
