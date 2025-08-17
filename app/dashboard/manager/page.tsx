import { createClient } from "@/lib/supabase/server"
import { requireManager } from "@/lib/auth-utils"
import ManagerDashboard from "@/components/manager-dashboard"
import RoleGuard from "@/components/role-guard"

export default async function ManagerDashboardPage() {
  let user, products, lowStockProducts, recentSales;

  try {
    // Step 1: Authenticate and get user
    console.log("Attempting to authenticate manager...");
    user = await requireManager();
    console.log("Manager authenticated successfully:", user.email);

    const supabase = createClient();

    // Step 2: Get inventory data
    console.log("Fetching products...");
    const productsQuery = supabase.from("products").select("*").order("created_at", { ascending: false });
    const { data: productsData, error: productsError } = await productsQuery;
    if (productsError) throw new Error(`Products fetch error: ${JSON.stringify(productsError)}`);
    products = productsData;
    console.log("Products fetched successfully.");

    // Step 3: Get low stock alerts
    console.log("Fetching low stock products...");
    const lowStockQuery = supabase.from("products").select("*").lt("quantity", supabase.raw("low_stock_threshold"));
    const { data: lowStockData, error: lowStockError } = await lowStockQuery;
    if (lowStockError) throw new Error(`Low stock fetch error: ${JSON.stringify(lowStockError)}`);
    lowStockProducts = lowStockData;
    console.log("Low stock products fetched successfully.");

    // Step 4: Get recent sales data
    console.log("Fetching recent sales...");
    const recentSalesQuery = supabase.from("sales").select(`*, users(full_name, email)`).order("created_at", { ascending: false }).limit(10);
    const { data: recentSalesData, error: salesError } = await recentSalesQuery;
    if (salesError) throw new Error(`Sales fetch error: ${JSON.stringify(salesError)}`);
    recentSales = recentSalesData;
    console.log("Recent sales fetched successfully.");

    return (
      <RoleGuard requiredRole="manager">
        <ManagerDashboard
          user={user}
          products={products || []}
          lowStockProducts={lowStockProducts || []}
          recentSales={recentSales || []}
        />
      </RoleGuard>
    );
  } catch (error: any) {
    console.error("!!! Critical error in ManagerDashboardPage !!!");
    console.error(`Error occurred: ${error.message}`);

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-4 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Error</h1>
          <p className="text-gray-600 mb-4">Unable to load manager dashboard. Please try again.</p>
          <div className="bg-red-50 text-red-700 p-3 rounded text-left text-sm">
            <p className="font-bold">Error Details:</p>
            <pre className="whitespace-pre-wrap break-all">{error.message}</pre>
          </div>
        </div>
      </div>
    );
  }
}
