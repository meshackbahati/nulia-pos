"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

interface SaleItem {
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface SaleData {
  salesperson_id: string
  total_amount: number
  payment_method: "cash" | "card" | "mobile_money"
  items: SaleItem[]
}

export async function processSale(saleData: SaleData) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  // Generate receipt number
  const receiptNumber = `RCP${Date.now()}`

  try {
    // Start transaction
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        salesperson_id: saleData.salesperson_id,
        total_amount: saleData.total_amount,
        payment_method: saleData.payment_method,
        receipt_number: receiptNumber,
        transaction_date: new Date().toISOString(),
      })
      .select()
      .single()

    if (saleError) {
      throw new Error(`Failed to create sale: ${saleError.message}`)
    }

    // Insert sale items
    const saleItems = saleData.items.map((item) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }))

    const { error: itemsError } = await supabase.from("sale_items").insert(saleItems)

    if (itemsError) {
      throw new Error(`Failed to create sale items: ${itemsError.message}`)
    }

    // Update product quantities
    for (const item of saleData.items) {
      const { error: updateError } = await supabase.rpc("update_product_quantity", {
        product_id: item.product_id,
        quantity_sold: item.quantity,
      })

      if (updateError) {
        console.error(`Failed to update quantity for product ${item.product_id}:`, updateError)
        // Continue with other products even if one fails
      }
    }

    // Create audit log
    await supabase.from("audit_logs").insert({
      user_id: saleData.salesperson_id,
      action: "SALE_COMPLETED",
      table_name: "sales",
      record_id: sale.id,
      new_values: {
        receipt_number: receiptNumber,
        total_amount: saleData.total_amount,
        payment_method: saleData.payment_method,
        items_count: saleData.items.length,
      },
    })

    revalidatePath("/dashboard/salesperson")

    return {
      id: sale.id,
      receipt_number: receiptNumber,
      total_amount: saleData.total_amount,
      transaction_date: sale.transaction_date,
    }
  } catch (error) {
    console.error("Sale processing error:", error)
    throw error
  }
}
