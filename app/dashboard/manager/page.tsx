import { createClient } from "@/lib/supabase/server"
import { requireManager } from "@/lib/auth-utils"
import ManagerDashboard from "@/components/manager-dashboard"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorBoundary } from "@/components/error-boundary"

// Loading component for Suspense fallback
function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-1/3" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Skeleton className="col-span-4 h-80" />
        <Skeleton className="col-span-3 h-80" />
      </div>
    </div>
  )
}

async function DashboardContent() {
  // This will throw and be caught by the error boundary if user is not authorized
  const user = await requireManager()
  
  const supabase = createClient()
  
  // First, get all products to handle low stock filtering in-memory
  const { data: allProducts, error: productsError } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })

  // Get recent sales
  const { data: recentSales, error: salesError } = await supabase
    .from("sales")
    .select(`
      *,
      users(full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(10)

  // Filter for low stock products in-memory for better compatibility
  let lowStockProducts: typeof allProducts = []
  if (allProducts) {
    lowStockProducts = allProducts.filter((product: { low_stock_threshold?: number; quantity: number }) => {
      // If low_stock_threshold is set, use it, otherwise default to 5
      const threshold = product.low_stock_threshold ?? 5
      // Consider 0 or negative quantity as out of stock, not low stock
      if (product.quantity <= 0) return false
      // Product is low stock if quantity is less than or equal to threshold
      return product.quantity <= threshold
    }).sort((a: { quantity: number }, b: { quantity: number }) => a.quantity - b.quantity) // Sort by quantity ascending
  }
  
  // Log any errors but don't fail the entire page
  if (productsError) console.error("[ATHENA] Products fetch error:", productsError)
  if (salesError) console.error("[ATHENA] Sales fetch error:", salesError)
  
  return (
    <ManagerDashboard
      user={user}
      products={allProducts || []}
      lowStockProducts={lowStockProducts || []}
      recentSales={recentSales || []}
    />
  )
}

export default function ManagerDashboardPage() {
  return (
    <ErrorBoundary 
      fallback={
        <div className="p-6">
          <h1 className="text-2xl font-bold text-destructive">Error Loading Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            We couldn't load the manager dashboard. Please try refreshing the page or contact support if the issue persists.
          </p>
        </div>
      }
    >
      <Suspense fallback={<DashboardLoading />}>
        <DashboardContent />
      </Suspense>
    </ErrorBoundary>
  )
}
