"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, DollarSign, Receipt, LogOut, Clock, AlertCircle } from "lucide-react"
import { signOut } from "@/lib/actions"
import POSInterface from "@/components/pos-interface"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatCurrency } from "@/lib/utils/currency"

interface UserProfile {
  id: string
  full_name: string
  role: string
  email: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SaleItem {
  id: string
  product_id: string
  quantity: number
  price: number
  total: number
}

interface Sale {
  id: string
  total_amount: string | number
  created_at: string
  receipt_number?: string
  transaction_date?: string
  payment_method?: string
  sale_items?: SaleItem[]
}

interface Product {
  id: string
  name: string
  price: number
  quantity: number
  barcode: string
  category: string
  is_active: boolean
}

interface SalespersonDashboardProps {
  user: UserProfile
  products: Product[]
  todaySales: Sale[]
  todayTotal?: number
  error?: string
}

export default function SalespersonDashboard({ 
  user, 
  products = [], 
  todaySales = [], 
  todayTotal: propTodayTotal = 0,
  error 
}: SalespersonDashboardProps) {
  // Calculate today's stats from todaySales if not provided
  const calculatedTodayTotal = todaySales.reduce((sum: number, sale: Sale) => {
    const amount = typeof sale.total_amount === 'string' 
      ? parseFloat(sale.total_amount) 
      : sale.total_amount || 0;
    return sum + amount;
  }, 0);
  
  // Use the passed todayTotal prop if available, otherwise calculate it
  const todayTotal = propTodayTotal > 0 ? propTodayTotal : calculatedTodayTotal;
  const todayTransactions = todaySales.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <ShoppingCart className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sales Terminal</h1>
                <p className="text-sm text-gray-600">Welcome, {user.full_name}</p>
              </div>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Today's Sales</CardTitle>
              <div className="rounded-full bg-primary/10 p-2">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(Number(todayTotal))}</div>
              <p className="text-xs text-muted-foreground">Total revenue today</p>
            </CardContent>
          </Card>

          <Card className="border border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-secondary-foreground">Transactions</CardTitle>
              <div className="rounded-full bg-secondary/10 p-2">
                <Receipt className="h-4 w-4 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary-foreground">{todayTransactions}</div>
              <p className="text-xs text-muted-foreground">Completed today</p>
            </CardContent>
          </Card>

          <Card className="border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-accent-foreground">Average Sale</CardTitle>
              <div className="rounded-full bg-accent/10 p-2">
                <Clock className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-foreground">
                {todayTransactions > 0 ? formatCurrency(Number(todayTotal) / todayTransactions) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="pos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pos">Point of Sale</TabsTrigger>
            <TabsTrigger value="sales">Today's Sales</TabsTrigger>
          </TabsList>

          <TabsContent value="pos" className="space-y-6">
            <POSInterface products={products} salespersonId={user.id} />
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Today's Sales History</CardTitle>
                <CardDescription>Your completed transactions for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todaySales.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No sales recorded today</p>
                  ) : (
                    todaySales.map((sale) => {
                      const saleDate = sale.transaction_date || sale.created_at;
                      const formattedAmount = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'UGX',
                      }).format(Number(sale.total_amount) || 0);
                      
                      return (
                        <div key={sale.id} className="border-b py-3 last:border-0">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">
                                Receipt #{sale.receipt_number || `SALE-${sale.id.slice(0, 6).toUpperCase()}`}
                              </p>
                              <p className="text-sm text-gray-500">
                                {saleDate ? new Date(saleDate).toLocaleTimeString() : '--:--'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {formattedAmount}
                              </p>
                              <p className="text-sm text-gray-500 capitalize">
                                {sale.payment_method || 'cash'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
