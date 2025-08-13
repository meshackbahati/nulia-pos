"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
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
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const { error } = await supabase.from("products").insert({
    ...productData,
    expiry_date: productData.expiry_date || null,
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
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

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
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const { error } = await supabase.from("products").delete().eq("id", productId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/manager")
}
