import { createClient } from "@/lib/supabase/server"
import { requireManager } from "@/lib/auth-utils"
import ReportsAnalyticsDashboard from "@/components/reports-analytics-dashboard"

export default async function ReportsPage() {
  // Use the standard manager authentication utility
  const user = await requireManager()
  const supabase = createClient()

  // Get analytics data
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Sales data
  const { data: salesData } = await supabase
    .from("sales")
    .select(`
      *,
      users!sales_salesperson_id_fkey(full_name),
      sale_items(*, products(name, category))
    `)
    .gte("transaction_date", thirtyDaysAgo.toISOString())
    .order("transaction_date", { ascending: false })

  // Product performance
  const { data: productPerformance } = await supabase
    .from("sale_items")
    .select(`
      quantity,
      subtotal,
      products(id, name, category, price),
      sales!inner(transaction_date)
    `)
    .gte("sales.transaction_date", thirtyDaysAgo.toISOString())

  // Inventory data
  const { data: inventoryData } = await supabase.from("products").select("*").order("quantity", { ascending: true })

  // Low stock products - fetch all and filter in JavaScript for complex conditions
  const { data: allProducts } = await supabase.from("products").select("*")
  
  // Filter for low stock products (quantity > 0 and quantity <= low_stock_threshold)
  const lowStockProducts = allProducts?.filter(product => {
    const threshold = product.low_stock_threshold ?? 5 // Default threshold of 5 if not set
    return product.quantity > 0 && product.quantity <= threshold
  }) || []

  return (
    <ReportsAnalyticsDashboard
      user={user}
      salesData={salesData || []}
      productPerformance={productPerformance || []}
      inventoryData={inventoryData || []}
      lowStockProducts={lowStockProducts || []}
    />
  )
}
