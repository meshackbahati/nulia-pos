import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/auth-utils';
import { salesService } from '@/lib/api/sales';

export async function POST(request: Request) {
  try {
    const user = await requireManager();
    const saleData = await request.json();
    
    // Add salesperson ID from the authenticated user
    const saleWithSalesperson = {
      ...saleData,
      salesperson_id: user.id,
    };
    
    const result = await salesService.createSale(saleWithSalesperson);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create sale' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await requireManager();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const salespersonId = searchParams.get('salespersonId');
    
    const { data, count } = await salesService.listSales({
      startDate,
      endDate,
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      salespersonId: salespersonId || undefined,
      page,
      pageSize,
    });
    
    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}
