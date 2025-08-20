import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: sale, error } = await supabase
    .from('sales')
    .select(
      `
      *,
      items: sale_items(
        product_id,
        product_name,
        quantity,
        unit_price,
        total_price
      ),
      cashier:profiles!sales_cashier_id_fkey(
        full_name
      )
    `
    )
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(sale)
}
