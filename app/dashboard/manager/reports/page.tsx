export const dynamic = 'force-dynamic';
import { createClient } from "@/lib/supabase/server"
import { requireManager } from "@/lib/auth-utils"
import ReportsAnalyticsDashboard from "@/components/reports-analytics-dashboard"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorBoundary } from "@/components/error-boundary"

// Type definitions for our data structures
interface Product {
  id: string
  name: string
  category: string
  price: number
  quantity: number
  low_stock_threshold?: number
  is_active: boolean
}

interface SaleItem {
  id: string
  quantity: number
  unit_price: number
  total_price: number
  products: {
    id: string
    name: string
    category: string
    barcode: string
  } | null
}

interface Sale {
  id: string
  total_amount: number
  payment_method: string
  created_at: string
  status: string
  currency: string
  salesperson_id: string
  users: {
    full_name: string
    email: string
  } | null
  sale_items: SaleItem[]
}

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
  let salesData = [];
  let salesError = null;
  let productPerformance = [];
  
  try {
    console.log('Fetching sales data with date range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    // First, verify the sales table exists and is accessible
    const { data: tableInfo, error: tableError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'sales');
    
    console.log('Table check result:', { tableInfo, tableError });
    
    // First, fetch all sale items with product information for the date range
    const { data: saleItemsData, error: saleItemsError } = await supabase
      .from('sale_items')
      .select(`
        id,
        quantity,
        unit_price,
        total_price,
        sale_id,
        product_id,
        products(id, name, category, barcode, price)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (saleItemsError) {
      console.error('Error fetching sale items:', saleItemsError);
      throw saleItemsError;
    }
    
    console.log(`Fetched ${saleItemsData?.length || 0} sale items`);
    
    // Store product performance data
    productPerformance = saleItemsData || [];
    
    // Now fetch the sales data
    const { data: salesResult, error: salesFetchError } = await supabase
      .from("sales")
      .select(`
        id,
        total_amount,
        payment_method,
        created_at,
        status,
        currency,
        salesperson_id,
        users!sales_salesperson_id_fkey(full_name, email)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .neq('status', 'voided')
      .order('created_at', { ascending: false })
      .limit(1000);
    
    if (salesFetchError) {
      console.error('Error fetching sales:', salesFetchError);
      throw salesFetchError;
    }
    
    // Combine sales data with their items
    salesData = (salesResult || []).map(sale => ({
      ...sale,
      sale_items: (saleItemsData || []).filter(item => item.sale_id === sale.id)
    }));
    
    console.log('Sales data fetch result:', {
      salesCount: salesData.length,
      saleItemsCount: saleItemsData?.length || 0,
      productPerformanceCount: productPerformance.length
    });
    
  } catch (error) {
    console.error('Error in reports page:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'UnknownError',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    salesError = error instanceof Error ? error : new Error(String(error));
  }

  // Get products data for inventory analysis
  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id, name, category, price, quantity, low_stock_threshold, barcode, is_active")
    .eq("is_active", true)

  if (productsError) {
    console.error('Error fetching products:', productsError);
  }

  // Get all users for performance analysis
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("*")
    .eq("role", "salesperson")
    .eq("is_active", true)

  // Get low stock products
  const lowStockProducts = (productsData || []).filter((product: Product) => 
    (product.quantity || 0) <= (product.low_stock_threshold || 10)
  )

  // Log any errors but don't fail the entire page
  if (salesError) {
    console.error("[ATHENA] Sales fetch error:", {
      message: salesError.message,
      name: salesError.name,
      stack: salesError.stack,
      code: (salesError as any).code,
      details: (salesError as any).details,
      hint: (salesError as any).hint
    });
  }
  if (productsError) console.error("[ATHENA] Products fetch error:", productsError);
  if (usersError) console.error("[ATHENA] Users fetch error:", usersError);
  
  // If we have a sales error but no data, show an error boundary
  if (salesError && (!salesData || salesData.length === 0)) {
    throw new Error(`Failed to load sales data: ${salesError.message}`);
  }
  
  // Transform sales data into product performance data
  const productPerformanceData = (salesData as Sale[]).flatMap((sale: Sale) => 
    (sale.sale_items || []).map((item: SaleItem) => ({
      id: item.products?.id || 'unknown',
      name: item.products?.name || 'Unknown Product',
      category: item.products?.category || 'Uncategorized',
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      products: item.products ? {
        id: item.products.id,
        name: item.products.name,
        category: item.products.category || 'Uncategorized',
        barcode: item.products.barcode || null,
        price: item.unit_price // Use unit price from the sale item
      } : null
    }))
  ) || [];

  // Cast products data to the correct type
  const inventoryData = (productsData as Product[] | null) || [];
  
  return (
    <ReportsAnalyticsDashboard
      user={user}
      salesData={salesData}
      productPerformance={productPerformanceData}
      inventoryData={productsData || []}
      lowStockProducts={lowStockProducts}
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