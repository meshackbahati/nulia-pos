import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/barcodes/generate - Generate a barcode for a product
export async function POST(request: Request) {
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
    
    const { productId, formatId } = await request.json();
    
    if (!productId || !formatId) {
      return NextResponse.json(
        { error: 'Product ID and format ID are required' },
        { status: 400 }
      );
    }
    
    // Call the database function to generate barcode
    const { data: barcodeData, error } = await supabase
      .rpc('generate_barcode_data', {
        p_product_id: productId,
        format_id: formatId
      });
    
    if (error) {
      console.error('Error generating barcode:', error);
      return NextResponse.json(
        { error: 'Failed to generate barcode' },
        { status: 500 }
      );
    }
    
    // Update the product with the generated barcode
    const { error: updateError } = await supabase
      .from('products')
      .update({
        barcode_data: barcodeData,
        barcode_format_id: formatId,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);
    
    if (updateError) {
      console.error('Error updating product barcode:', updateError);
      return NextResponse.json(
        { error: 'Failed to update product with barcode' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      barcode: barcodeData,
      productId,
      formatId
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET /api/barcodes/formats - Get available barcode formats
export async function GET() {
  try {
    const supabase = createClient();
    
    const { data: formats, error } = await supabase
      .from('barcode_formats')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching barcode formats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch barcode formats' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(formats);
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
