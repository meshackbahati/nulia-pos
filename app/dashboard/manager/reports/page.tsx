import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ReportsAnalyticsDashboard from "@/components/reports-analytics-dashboard"

export default async function ReportsPage() {
  const supabase = createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verify manager role
  const { data: profile } = await supabase.from("users").select("role, full_name").eq("email", user.email).single()

  if (!profile || profile.role !== "manager") {
    redirect("/auth/login")
  }

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

  // Low stock products
  const { data: lowStockProducts } = await supabase
    .from("products")
    .select("*")
    .lt("quantity", supabase.raw("low_stock_threshold"))

  return (
    <ReportsAnalyticsDashboard
      user={profile}
      salesData={salesData || []}
      productPerformance={productPerformance || []}
      inventoryData={inventoryData || []}
      lowStockProducts={lowStockProducts || []}
    />
  )
}
