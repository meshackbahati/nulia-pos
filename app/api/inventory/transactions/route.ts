import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/database.types';

type InventoryTransaction = Database['public']['Tables']['inventory_transactions']['Row'];

// GET /api/inventory/transactions - Get all inventory transactions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const type = searchParams.get('type');

    const supabase = createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Base query with joins to get related data
    let query = supabase
      .from('inventory_transactions')
      .select(`
        *,
        products(name, barcode_data, sku),
        profiles!inventory_transactions_created_by_fkey(full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (productId) {
      query = query.eq('product_id', productId);
    }
    
    if (type) {
      query = query.eq('transaction_type', type);
    }
    
    if (fromDate) {
      query = query.gte('created_at', `${fromDate}T00:00:00.000Z`);
    }
    
    if (toDate) {
      query = query.lte('created_at', `${toDate}T23:59:59.999Z`);
    }
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, count, error } = await query.range(from, to);
    
    if (error) {
      console.error('Error fetching inventory transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch inventory transactions' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/inventory/transactions - Create a new inventory transaction
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();
      
    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const transactionData = await request.json();
    
    // Basic validation
    if (!transactionData.product_id || !transactionData.transaction_type || !transactionData.quantity) {
      return NextResponse.json(
        { error: 'Product ID, transaction type, and quantity are required' },
        { status: 400 }
      );
    }
    
    // Validate quantity is positive
    if (transactionData.quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }
    
    // For sales/outgoing transactions, check stock level
    if (['sale', 'adjustment', 'transfer_out', 'damaged', 'expired', 'lost'].includes(transactionData.transaction_type)) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', transactionData.product_id)
        .single();
        
      if (productError || !product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      
      // For non-managers, enforce stock check
      if (userData.role !== 'manager' && product.quantity < transactionData.quantity) {
        return NextResponse.json(
          { 
            error: 'Insufficient stock',
            available: product.quantity,
            requested: transactionData.quantity
          },
          { status: 400 }
        );
      }
    }
    
    // Create the transaction
    const newTransaction = {
      ...transactionData,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Ensure unit_cost is properly formatted
      unit_cost: transactionData.unit_cost ? Number(transactionData.unit_cost) : null,
      // Calculate total cost if unit_cost is provided
      total_cost: transactionData.unit_cost 
        ? Number(transactionData.unit_cost) * transactionData.quantity 
        : null
    };
    
    const { data: transaction, error } = await supabase
      .from('inventory_transactions')
      .insert([newTransaction])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating inventory transaction:', error);
      return NextResponse.json(
        { error: 'Failed to create inventory transaction' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(transaction, { status: 201 });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
