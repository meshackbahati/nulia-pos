import { createClient } from "@/lib/supabase/server"
import { requireManager } from "@/lib/auth-utils"
import ReportsAnalyticsDashboard from "@/components/reports-analytics-dashboard"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorBoundary } from "@/components/error-boundary"

// Loading component for Suspense fallback
function ReportsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-1/2" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  )
}

async function ReportsContent() {
  // This will throw and be caught by the error boundary if user is not authorized
  const user = await requireManager()
  
  const supabase = createClient()
  
  // Get date range for reports (last 30 days by default)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)

  // Get sales data with detailed information
  const { data: salesData, error: salesError } = await supabase
    .from("sales")
    .select(`
      id,
      total_amount,
      payment_method,
      created_at,
      status,
      currency,
      salesperson_id,
      users!sales_salesperson_id_fkey(full_name, email),
      sale_items(
        id,
        quantity,
        unit_price,
        total_price,
        products(id, name, category, barcode)
      )
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .neq('status', 'voided')
    .order('created_at', { ascending: false })

  // Get products data for inventory analysis
  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)

  // Get all users for performance analysis
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("*")
    .eq("role", "salesperson")
    .eq("is_active", true)

  // Get low stock products
  const lowStockProducts = productsData?.filter(product => 
    product.quantity <= (product.low_stock_threshold || 10)
  ) || []

  // Log any errors but don't fail the entire page
  if (salesError) console.error("[v0] Sales fetch error:", salesError)
  if (productsError) console.error("[v0] Products fetch error:", productsError)
  if (usersError) console.error("[v0] Users fetch error:", usersError)
  
  return (
    <ReportsAnalyticsDashboard
      user={user}
      salesData={salesData || []}
      productsData={productsData || []}
      usersData={usersData || []}
      lowStockProducts={lowStockProducts}
      startDate={startDate}
      endDate={endDate}
    />
  )
}

export default function ReportsPage() {
  return (
    <ErrorBoundary 
      fallback={
        <div className="p-6">
          <h1 className="text-2xl font-bold text-destructive">Error Loading Reports</h1>
          <p className="mt-2 text-muted-foreground">
            We couldn't load the reports dashboard. Please try refreshing the page or contact support if the issue persists.
          </p>
        </div>
      }
    >
      <Suspense fallback={<ReportsLoading />}>
        <ReportsContent />
      </Suspense>
    </ErrorBoundary>
  )
}