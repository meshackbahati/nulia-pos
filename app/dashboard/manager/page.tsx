import { createClient } from "@/lib/supabase/server"
import { requireManager } from "@/lib/auth-utils"
import ManagerDashboard from "@/components/manager-dashboard"

export default async function ManagerDashboardPage() {
  // Require manager role
  const user = await requireManager()

  const supabase = createClient()

  // Get inventory data
  const { data: products } = await supabase.from("products").select("*").order("created_at", { ascending: false })

  // Get low stock alerts
  const { data: lowStockProducts } = await supabase
    .from("products")
    .select("*")
    .lt("quantity", supabase.raw("low_stock_threshold"))

  // Get recent sales data
  const { data: recentSales } = await supabase
    .from("sales")
    .select(`
      *,
      users!sales_salesperson_id_fkey(full_name)
    `)
    .order("transaction_date", { ascending: false })
    .limit(10)

  return (
    <ManagerDashboard
      user={user}
      products={products || []}
      lowStockProducts={lowStockProducts || []}
      recentSales={recentSales || []}
    />
  )
}
