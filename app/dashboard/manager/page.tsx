import { createClient } from "@/lib/supabase/server"
import { requireManager } from "@/lib/auth-utils"
import ManagerDashboard from "@/components/manager-dashboard"
import RoleGuard from "@/components/role-guard"

export default async function ManagerDashboardPage() {
  try {
    // Require manager role
    const user = await requireManager()

    const supabase = createClient()

    // Get inventory data with error handling
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })

    if (productsError) {
      console.error("[v0] Products fetch error:", productsError)
    }

    // Get low stock alerts
    const { data: lowStockProducts, error: lowStockError } = await supabase
      .from("products")
      .select("*")
      .lt("quantity", supabase.raw("low_stock_threshold"))

    if (lowStockError) {
      console.error("[v0] Low stock fetch error:", lowStockError)
    }

    // Get recent sales data with proper join
    const { data: recentSales, error: salesError } = await supabase
      .from("sales")
      .select(`
        *,
        users!sales_salesperson_id_fkey(full_name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(10)

    if (salesError) {
      console.error("[v0] Sales fetch error:", salesError)
    }

    return (
      <RoleGuard requiredRole="manager">
        <ManagerDashboard
          user={user}
          products={products || []}
          lowStockProducts={lowStockProducts || []}
          recentSales={recentSales || []}
        />
      </RoleGuard>
    )
  } catch (error) {
    console.error("[v0] Manager dashboard error:", error)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Error</h1>
          <p className="text-gray-600">Unable to load manager dashboard. Please try again.</p>
        </div>
      </div>
    )
  }
}
