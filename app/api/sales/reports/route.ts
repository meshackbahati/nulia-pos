import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/auth-utils';
import { salesService } from '@/lib/api/sales';

export async function GET(request: Request) {
  try {
    await requireManager();
    const { searchParams } = new URL(request.url);
    
    const reportType = searchParams.get('type') || 'summary';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const salespersonId = searchParams.get('salespersonId');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    let data;
    
    switch (reportType) {
      case 'summary':
        data = await salesService.getSalesSummary({
          startDate,
          endDate,
          salespersonId: salespersonId || undefined,
        });
        break;
        
      case 'by-product':
        data = await salesService.getSalesByProduct({
          startDate,
          endDate,
          limit,
        });
        break;
        
      case 'performance':
        data = await salesService.getSalesPerformance({
          startDate,
          endDate,
          limit,
        });
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error generating sales report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate sales report' },
      { status: 500 }
    );
  }
}
