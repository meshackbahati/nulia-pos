import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

// GET /api/products/[id] - Get a single product
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      
      console.error('Error fetching product:', error);
      return NextResponse.json(
        { error: 'Failed to fetch product' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(product);
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PATCH /api/products/[id] - Update a product
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Verify user is authenticated and has manager role
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
      
    if (userError || !userData || userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Forbidden - Manager access required' },
        { status: 403 }
      );
    }
    
    const updates = await request.json();
    
    // Don't allow updating certain fields directly
    const { id, created_by, created_at, ...safeUpdates } = updates;
    
    const { data: product, error } = await supabase
      .from('products')
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(product);
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete a product
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Verify user is authenticated and has manager role
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
      
    if (userError || !userData || userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Forbidden - Manager access required' },
        { status: 403 }
      );
    }
    
    // First, check if there are any inventory transactions for this product
    const { count: transactionCount, error: countError } = await supabase
      .from('inventory_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', params.id);
    
    if (countError) {
      console.error('Error checking product transactions:', countError);
      return NextResponse.json(
        { error: 'Failed to check product transactions' },
        { status: 500 }
      );
    }
    
    if (transactionCount && transactionCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete product with existing inventory transactions. Please deactivate it instead.',
          code: 'PRODUCT_HAS_TRANSACTIONS'
        },
        { status: 400 }
      );
    }
    
    // If no transactions, safe to delete
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id);
    
    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      );
    }
    
    return new Response(null, { status: 204 });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
