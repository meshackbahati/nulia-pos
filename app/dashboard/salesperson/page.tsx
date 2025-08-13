import { createClient } from "@/lib/supabase/server"
import { requireSalesperson } from "@/lib/auth-utils"
import SalespersonDashboard from "@/components/salesperson-dashboard"

export default async function SalespersonDashboardPage() {
  // Require salesperson role
  const user = await requireSalesperson()

  const supabase = createClient()

  // Get products for POS
  const { data: products } = await supabase.from("products").select("*").gt("quantity", 0).order("name")

  // Get today's sales for this salesperson
  const today = new Date().toISOString().split("T")[0]
  const { data: todaySales } = await supabase
    .from("sales")
    .select("*")
    .eq("salesperson_id", user.id)
    .gte("transaction_date", `${today}T00:00:00`)
    .order("transaction_date", { ascending: false })

  return <SalespersonDashboard user={user} products={products || []} todaySales={todaySales || []} />
}
