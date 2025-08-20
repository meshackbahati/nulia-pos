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
import { CartProvider } from "@/contexts/CartContext"

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
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex items-center gap-4">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sales Terminal</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user.full_name}</p>
          </div>
        </div>
        <div className="ml-auto">
            <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </form>
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(Number(todayTotal))}</div>
              <p className="text-xs text-muted-foreground">Total revenue today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayTransactions}</div>
              <p className="text-xs text-muted-foreground">Completed today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todayTransactions > 0 ? formatCurrency(Number(todayTotal) / todayTransactions) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>
        </div>
        <Tabs defaultValue="pos" className="mt-4">
          <TabsList>
            <TabsTrigger value="pos">Point of Sale</TabsTrigger>
            <TabsTrigger value="sales">Today's Sales</TabsTrigger>
          </TabsList>
          <TabsContent value="pos">
            <CartProvider>
              <POSInterface products={products} salespersonId={user.id} />
            </CartProvider>
          </TabsContent>
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Today's Sales History</CardTitle>
                <CardDescription>Your completed transactions for today.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {todaySales.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No sales recorded today.</p>
                  ) : (
                    todaySales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">#{sale.receipt_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(sale.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(sale.total_amount)}</p>
                          <Badge variant="secondary">{sale.payment_method}</Badge>
                        </div>
                      </div>
                    ))
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
