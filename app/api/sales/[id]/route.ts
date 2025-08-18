import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/auth-utils';
import { salesService } from '@/lib/api/sales';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireManager();
    const sale = await salesService.getSaleById(params.id);
    return NextResponse.json(sale);
  } catch (error) {
    console.error(`Error fetching sale ${params.id}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sale' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireManager();
    const updates = await request.json();
    const updatedSale = await salesService.updateSale(params.id, updates);
    return NextResponse.json(updatedSale);
  } catch (error) {
    console.error(`Error updating sale ${params.id}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update sale' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireManager();
    const supabase = createClient();
    
    // First, check if the sale exists and is not already completed
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('status')
      .eq('id', params.id)
      .single();
      
    if (saleError) throw saleError;
    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }
    
    if (sale.status === 'completed') {
      return NextResponse.json(
        { error: 'Completed sales cannot be deleted' },
        { status: 400 }
      );
    }
    
    // Delete the sale and its items in a transaction
    const { error: deleteError } = await supabase.rpc('delete_sale_transaction', {
      p_sale_id: params.id,
    });
    
    if (deleteError) throw deleteError;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting sale ${params.id}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete sale' },
      { status: 500 }
    );
  }
}
