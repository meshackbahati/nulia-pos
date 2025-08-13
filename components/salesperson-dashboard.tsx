"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, DollarSign, Receipt, LogOut, Clock } from "lucide-react"
import { signOut } from "@/lib/actions"
import POSInterface from "@/components/pos-interface"

interface SalespersonDashboardProps {
  user: {
    id: string
    full_name: string
    role: string
  }
  products: any[]
  todaySales: any[]
}

export default function SalespersonDashboard({ user, products, todaySales }: SalespersonDashboardProps) {
  // Calculate today's stats
  const todayTotal = todaySales.reduce((sum, sale) => sum + Number.parseFloat(sale.total_amount), 0)
  const todayTransactions = todaySales.length

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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${todayTotal.toFixed(2)}</div>
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
                ${todayTransactions > 0 ? (todayTotal / todayTransactions).toFixed(2) : "0.00"}
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
                    todaySales.map((sale) => (
                      <div key={sale.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Receipt #{sale.receipt_number}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(sale.transaction_date).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${Number.parseFloat(sale.total_amount).toFixed(2)}</p>
                          <Badge variant="outline" className="capitalize">
                            {sale.payment_method.replace("_", " ")}
                          </Badge>
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
