"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function addProduct(productData: {
  name: string
  category: string
  price: number
  quantity: number
  barcode: string
  expiry_date?: string
  low_stock_threshold: number
}) {
  const supabase = createClient()

  const { error } = await supabase.from("products").insert({
    ...productData,
    expiry_date: productData.expiry_date || null,
    currency: "UGX", // Set default currency to UGX
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/manager")
}

export async function updateProduct(
  productId: string,
  productData: {
    name: string
    category: string
    price: number
    quantity: number
    expiry_date?: string
    low_stock_threshold: number
  },
) {
  const supabase = createClient()

  const { error } = await supabase
    .from("products")
    .update({
      ...productData,
      expiry_date: productData.expiry_date || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/manager")
}

export async function deleteProduct(productId: string) {
  const supabase = createClient()

  const { error } = await supabase.from("products").delete().eq("id", productId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/manager")
}
