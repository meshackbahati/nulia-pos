"use server"

import { createClient } from "@/lib/supabase/server"
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
  const supabase = createClient()

  // Generate receipt number
  const receiptNumber = `BS-${Date.now()}`

  try {
    // Start transaction
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        salesperson_id: saleData.salesperson_id,
        total_amount: saleData.total_amount,
        currency: "UGX", // Set currency to UGX
        payment_method: saleData.payment_method,
        receipt_number: receiptNumber,
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
      total_price: item.subtotal, // Use total_price instead of subtotal
    }))

    const { error: itemsError } = await supabase.from("sale_items").insert(saleItems)

    if (itemsError) {
      throw new Error(`Failed to create sale items: ${itemsError.message}`)
    }

    // Update product quantities manually since the trigger should handle this
    for (const item of saleData.items) {
      const { error: updateError } = await supabase
        .from("products")
        .update({
          quantity: supabase.raw(`quantity - ${item.quantity}`),
        })
        .eq("id", item.product_id)

      if (updateError) {
        console.error(`Failed to update quantity for product ${item.product_id}:`, updateError)
      }
    }

    revalidatePath("/dashboard/salesperson")

    // Return receipt data in the format expected by EnhancedReceiptDialog
    return {
      success: true,
      receipt_data: {
        receipt_number: receiptNumber,
        sale_id: sale.id,
        timestamp: new Date().toISOString(),
        salesperson_id: saleData.salesperson_id,
        items: saleData.items.map(item => ({
          product_id: item.product_id,
          name: '', // This will be filled in by the POS interface
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal
        })),
        subtotal: saleData.total_amount,
        total: saleData.total_amount,
        payment_method: saleData.payment_method,
        transaction_date: sale.created_at
      },
      id: sale.id
    }
  } catch (error) {
    console.error("Sale processing error:", error)
    throw error
  }
}
