"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  Users,
  BarChart3,
  Plus,
  LogOut,
  Search,
  Filter,
  TrendingUp,
} from "lucide-react"
import { signOut } from "@/lib/actions"
import ProductsTable from "@/components/products-table"
import AddProductDialog from "@/components/add-product-dialog"
import UserManagement from "@/components/user-management"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAllUsers } from "@/lib/user-actions"
import Link from "next/link"
import { LowStockProducts } from "@/components/inventory/LowStockProducts"
import BulkProductManager from "@/components/bulk-product-manager"
import BarcodeGenerator from "@/components/barcode-generator"
import { formatCurrency, formatDate } from "@/lib/utils"

interface User {
  id: string
  email: string
  full_name: string
  role: "manager" | "salesperson"
  created_at: string
  updated_at: string
}

interface ManagerDashboardProps {
  user: User
  products: any[]
  lowStockProducts: any[]
  recentSales: any[]
}

export default function ManagerDashboard({ user, products, lowStockProducts, recentSales }: ManagerDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Calculate dashboard stats
  const totalProducts = products.length
  const totalValue = products.reduce((sum, product) => sum + (product.price || 0) * (product.quantity || 0), 0)
  const lowStockCount = lowStockProducts.length
  const categories = [...new Set(products.map((p) => p.category))]

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.barcode.includes(searchTerm)
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Load users when users tab is selected
  const loadUsers = async () => {
    if (users.length > 0) return // Already loaded

    setLoadingUsers(true)
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers)
    } catch (error) {
      console.error("Failed to load users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex items-center gap-4">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user.full_name}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard/manager/reports">
            <Button variant="outline" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Reports & Analytics
            </Button>
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        {lowStockCount > 0 && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{lowStockCount} products</strong> are running low on stock and need restocking.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">Active inventory items</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
              <p className="text-xs text-muted-foreground">Total stock value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{lowStockCount}</div>
              <p className="text-xs text-muted-foreground">Need restocking</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-muted-foreground">Product categories</p>
            </CardContent>
          </Card>
        </div>
        <Tabs defaultValue="inventory" className="mt-4">
          <TabsList>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="sales">Recent Sales</TabsTrigger>
            <TabsTrigger value="users" onClick={loadUsers}>Users</TabsTrigger>
          </TabsList>
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Product Inventory</CardTitle>
                        <CardDescription>Manage your product catalog and stock levels.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <BulkProductManager onProductsUpdated={() => window.location.reload()} />
                        <BarcodeGenerator />
                        <Button onClick={() => setShowAddProduct(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Product
                        </Button>
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ProductsTable products={filteredProducts} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>A log of the most recent sales.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentSales.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No recent sales.</p>
                  ) : (
                    recentSales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">#{sale.receipt_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {sale.users?.full_name} &bull; {format(new Date(sale.created_at), "PPP")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(sale.total_amount, sale.currency)}</p>
                          <Badge variant="secondary">{sale.payment_method}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="users">
            {loadingUsers ? (
                <p className="text-muted-foreground text-center py-8">Loading users...</p>
            ) : (
              <UserManagement users={users} currentUser={user} />
            )}
          </TabsContent>
        </Tabs>
      </main>
      <AddProductDialog open={showAddProduct} onOpenChange={setShowAddProduct} />
    </div>
  )
}
