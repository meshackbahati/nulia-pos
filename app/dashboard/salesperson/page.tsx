import { createClient } from "@/lib/supabase/server"
import { validateSalespersonSession } from "@/lib/auth-utils"
import SalespersonDashboard from "@/components/salesperson-dashboard"
import { redirect } from "next/navigation"

export default async function SalespersonDashboardPage({ 
  searchParams 
}: { 
  searchParams: { [key: string]: string | string[] | undefined } 
}) {
  try {
    // Validate the custom salesperson session from URL params
    const user = await validateSalespersonSession(searchParams)
    
    // If we get here, we have a valid user
    const supabase = createClient()

    // Get products for POS with better error handling
    let products = []
    let productsError = null
    
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .gt("quantity", 0)
        .eq("is_active", true)
        .order("name")
      
      if (error) throw error
      products = data || []
    } catch (err) {
      console.error("[ATHENA] Products fetch error:", err)
      productsError = err
      // We'll continue with an empty products array rather than failing
    }

    // Get today's sales for this salesperson
    const today = new Date().toISOString().split("T")[0]
    let todaySales = []
    let todayTotal = 0
    let salesError = null
    
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items(*)
        `)
        .eq("salesperson_id", user.id)
        .gte("created_at", `${today}T00:00:00`)
        .order("created_at", { ascending: false })
      
      if (error) throw error
      
      todaySales = data || [];
      todayTotal = todaySales.reduce((sum: number, sale: { total_amount?: string | number | null }) => {
        try {
          const amount = sale.total_amount === null || sale.total_amount === undefined 
            ? 0 
            : typeof sale.total_amount === 'string' 
              ? parseFloat(sale.total_amount) || 0 
              : sale.total_amount;
          return sum + amount;
        } catch (e) {
          console.error("Error parsing sale amount:", sale.total_amount, e);
          return sum;
        }
      }, 0);
    } catch (err) {
      console.error("[ATHENA] Sales fetch error:", err)
      salesError = err
      // Continue with empty sales data
    }

    // If we have any critical errors, show an error page
    if (productsError && salesError) {
      throw new Error("Failed to load dashboard data")
    }

    return (
      <SalespersonDashboard
        user={user}
        products={products}
        todaySales={todaySales}
        todayTotal={todayTotal}
        error={productsError || salesError ? "Some data may be incomplete" : undefined}
      />
    )
  } catch (error) {
    console.error("[ATHENA] Salesperson dashboard error:", error)
    
    // If this is a redirect (from validateSalespersonSession), let it happen
    if (error instanceof Error && error.message.includes('Redirecting to login')) {
      return null
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-6 max-w-md mx-auto bg-card rounded-lg shadow-lg border">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Error</h1>
          <p className="text-muted-foreground mb-4">Unable to load salesperson dashboard. Please try again.</p>
          <p className="text-sm text-muted-foreground">
            If the problem persists, please contact support with error details.
          </p>
        </div>
      </div>
    )
  }
}
