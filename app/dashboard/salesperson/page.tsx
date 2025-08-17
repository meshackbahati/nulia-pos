import { createClient } from "@/lib/supabase/server"
import { validateSalespersonSession } from "@/lib/auth-utils"
import SalespersonDashboard from "@/components/salesperson-dashboard"
import RoleGuard from "@/components/role-guard"

export default async function SalespersonDashboardPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  try {
    // Validate the custom salesperson session from URL params
    const user = await validateSalespersonSession(searchParams)

    const supabase = createClient()

    // Get products for POS with better filtering
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .gt("quantity", 0)
      .eq("is_active", true)
      .order("name")

    if (productsError) {
      console.error("[v0] Products fetch error:", productsError)
    }

    // Get today's sales for this salesperson with UGX currency
    const today = new Date().toISOString().split("T")[0]
    const { data: todaySales, error: salesError } = await supabase
      .from("sales")
      .select(`
        *,
        sale_items(*)
      `)
      .eq("salesperson_id", user.id)
      .gte("created_at", `${today}T00:00:00`)
      .order("created_at", { ascending: false })

    if (salesError) {
      console.error("[v0] Sales fetch error:", salesError)
    }

    // Calculate today's total sales in UGX
    const todayTotal = todaySales?.reduce((sum, sale) => sum + Number.parseFloat(sale.total_amount || "0"), 0) || 0

    return (
      <RoleGuard requiredRole="salesperson">
        <SalespersonDashboard
          user={user}
          products={products || []}
          todaySales={todaySales || []}
          todayTotal={todayTotal}
        />
      </RoleGuard>
    )
  } catch (error) {
    console.error("[v0] Salesperson dashboard error:", error)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Error</h1>
          <p className="text-gray-600">Unable to load salesperson dashboard. Please try again.</p>
        </div>
      </div>
    )
  }
}
