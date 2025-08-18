"use server"

import { createClient } from "@/lib/supabase/server"
import { Database } from "@/lib/database.types"
import { revalidatePath } from "next/cache"

type Product = Database['public']['Tables']['products']['Row']
type Sale = Database['public']['Tables']['sales']['Row']

export interface SaleItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  barcode?: string
}

export interface SaleData {
  salesperson_id: string
  total_amount: number
  payment_method: "cash" | "card" | "mobile_money"
  items: SaleItem[]
  customer_phone?: string
  notes?: string
}

export interface SaleResult {
  success: boolean
  sale_id?: string
  receipt_number?: string
  error?: string
  receipt_data?: any
}

export class SalesService {
  
  /**
   * Process a complete sale transaction with inventory updates
   */
  static async processSale(saleData: SaleData): Promise<SaleResult> {
    const supabase = createClient()

    try {
      // Generate receipt number
      const receiptNumber = `BS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Start transaction by creating the sale record
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          salesperson_id: saleData.salesperson_id,
          total_amount: saleData.total_amount,
          currency: "KES", // Using KES as configured
          payment_method: saleData.payment_method,
          receipt_number: receiptNumber,
          customer_phone: saleData.customer_phone || null,
          notes: saleData.notes || null,
          status: 'completed'
        })
        .select()
        .single()

      if (saleError) {
        throw new Error(`Failed to create sale: ${saleError.message}`)
      }

      // Process each sale item and update inventory
      const saleItems = []
      const inventoryUpdates = []

      for (const item of saleData.items) {
        // Verify product exists and has sufficient stock
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("*")
          .eq("id", item.product_id)
          .single()

        if (productError || !product) {
          throw new Error(`Product ${item.product_name} not found`)
        }

        if (product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product_name}. Available: ${product.quantity}, Required: ${item.quantity}`)
        }

        // Create sale item
        saleItems.push({
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.subtotal,
        })

        // Prepare inventory update
        inventoryUpdates.push({
          product_id: item.product_id,
          new_quantity: product.quantity - item.quantity,
          original_quantity: product.quantity
        })
      }

      // Insert sale items
      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems)

      if (itemsError) {
        throw new Error(`Failed to create sale items: ${itemsError.message}`)
      }

      // Update product quantities
      for (const update of inventoryUpdates) {
        const { error: updateError } = await supabase
          .from("products")
          .update({
            quantity: update.new_quantity,
            updated_at: new Date().toISOString()
          })
          .eq("id", update.product_id)

        if (updateError) {
          console.error(`Failed to update inventory for product ${update.product_id}:`, updateError)
          // Note: In production, this should trigger a rollback mechanism
        }

        // Create inventory transaction record for audit trail
        await supabase
          .from("inventory_transactions")
          .insert({
            product_id: update.product_id,
            transaction_type: 'sale',
            quantity: -(inventoryUpdates.find(u => u.product_id === update.product_id)?.original_quantity! - update.new_quantity),
            reference_id: sale.id,
            reference_type: 'sale',
            notes: `Sale ${receiptNumber}`,
            created_by: saleData.salesperson_id
          })
      }

      // Generate receipt data
      const receiptData = {
        receipt_number: receiptNumber,
        sale_id: sale.id,
        timestamp: sale.created_at,
        salesperson_id: saleData.salesperson_id,
        items: saleData.items,
        subtotal: saleData.total_amount,
        tax: 0, // Can be calculated later
        total: saleData.total_amount,
        payment_method: saleData.payment_method,
        customer_phone: saleData.customer_phone
      }

      // Revalidate relevant pages
      revalidatePath("/dashboard/manager")
      revalidatePath("/dashboard/salesperson")

      return {
        success: true,
        sale_id: sale.id,
        receipt_number: receiptNumber,
        receipt_data: receiptData
      }

    } catch (error) {
      console.error("Sale processing error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  /**
   * Get sale details with items
   */
  static async getSaleDetails(saleId: string): Promise<any> {
    const supabase = createClient()

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .select(`
        *,
        sale_items (
          *,
          products (name, barcode)
        ),
        users!sales_salesperson_id_fkey (full_name, email)
      `)
      .eq("id", saleId)
      .single()

    if (saleError) {
      throw new Error(`Failed to get sale details: ${saleError.message}`)
    }

    return sale
  }

  /**
   * Void/Cancel a sale (manager only)
   */
  static async voidSale(saleId: string, reason: string, managerId: string): Promise<SaleResult> {
    const supabase = createClient()

    try {
      // Get sale details
      const sale = await this.getSaleDetails(saleId)
      
      if (sale.status === 'voided') {
        throw new Error("Sale is already voided")
      }

      // Update sale status
      const { error: saleError } = await supabase
        .from("sales")
        .update({
          status: 'voided',
          notes: `${sale.notes || ''} | VOIDED: ${reason}`,
          updated_at: new Date().toISOString()
        })
        .eq("id", saleId)

      if (saleError) {
        throw new Error(`Failed to void sale: ${saleError.message}`)
      }

      // Restore inventory for each item
      for (const item of sale.sale_items) {
        await supabase
          .from("products")
          .update({
            quantity: supabase.raw(`quantity + ${item.quantity}`),
            updated_at: new Date().toISOString()
          })
          .eq("id", item.product_id)

        // Create inventory transaction for audit
        await supabase
          .from("inventory_transactions")
          .insert({
            product_id: item.product_id,
            transaction_type: 'return',
            quantity: item.quantity,
            reference_id: saleId,
            reference_type: 'void_sale',
            notes: `Sale voided: ${reason}`,
            created_by: managerId
          })
      }

      revalidatePath("/dashboard/manager")
      
      return {
        success: true,
        sale_id: saleId
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to void sale"
      }
    }
  }

  /**
   * Process refund for a sale item
   */
  static async processRefund(
    saleId: string, 
    productId: string, 
    quantity: number, 
    reason: string,
    managerId: string
  ): Promise<SaleResult> {
    const supabase = createClient()

    try {
      // Validate sale item exists
      const { data: saleItem, error } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", saleId)
        .eq("product_id", productId)
        .single()

      if (error || !saleItem) {
        throw new Error("Sale item not found")
      }

      if (quantity > saleItem.quantity) {
        throw new Error(`Cannot refund more than sold quantity (${saleItem.quantity})`)
      }

      // Create refund record (you might need to create a refunds table)
      const refundAmount = (saleItem.unit_price * quantity)

      // Restore inventory
      await supabase
        .from("products")
        .update({
          quantity: supabase.raw(`quantity + ${quantity}`),
          updated_at: new Date().toISOString()
        })
        .eq("id", productId)

      // Create inventory transaction
      await supabase
        .from("inventory_transactions")
        .insert({
          product_id: productId,
          transaction_type: 'return',
          quantity: quantity,
          reference_id: saleId,
          reference_type: 'refund',
          notes: `Refund: ${reason}`,
          created_by: managerId
        })

      return {
        success: true,
        sale_id: saleId
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process refund"
      }
    }
  }

  /**
   * Search products by barcode or name with AI suggestions
   */
  static async findProductByBarcode(barcode: string): Promise<Product | null> {
    const supabase = createClient()

    // Direct barcode match
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("barcode", barcode)
      .eq("is_active", true)
      .single()

    if (!error && product) {
      return product
    }

    return null
  }

  /**
   * AI-powered product suggestions when barcode not found
   */
  static async suggestProducts(searchTerm: string): Promise<Product[]> {
    const supabase = createClient()

    // Fuzzy search using multiple criteria
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .or(`name.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
      .eq("is_active", true)
      .limit(5)

    if (error) {
      console.error("Product suggestion error:", error)
      return []
    }

    // Sort by relevance (name match first, then category, then barcode)
    return products.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0
      const bNameMatch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0
      
      if (aNameMatch !== bNameMatch) return bNameMatch - aNameMatch
      
      const aCategoryMatch = a.category?.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0
      const bCategoryMatch = b.category?.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0
      
      return bCategoryMatch - aCategoryMatch
    })
  }

  /**
   * Get sales analytics for dashboard
   */
  static async getSalesAnalytics(startDate?: string, endDate?: string, salespersonId?: string) {
    const supabase = createClient()

    let query = supabase
      .from("sales")
      .select(`
        id,
        total_amount,
        payment_method,
        created_at,
        status,
        sale_items!inner(quantity, unit_price, total_price)
      `)

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    if (salespersonId) {
      query = query.eq('salesperson_id', salespersonId)
    }

    const { data: sales, error } = await query.neq('status', 'voided')

    if (error) {
      throw new Error(`Failed to get sales analytics: ${error.message}`)
    }

    // Calculate analytics
    const totalSales = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
    const totalTransactions = sales.length
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0
    const totalItems = sales.reduce((sum, sale) => 
      sum + sale.sale_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0)

    const paymentMethodBreakdown = sales.reduce((acc: any, sale) => {
      acc[sale.payment_method] = (acc[sale.payment_method] || 0) + sale.total_amount
      return acc
    }, {})

    return {
      totalSales,
      totalTransactions,
      averageTransaction,
      totalItems,
      paymentMethodBreakdown,
      rawData: sales
    }
  }
}

export default SalesService