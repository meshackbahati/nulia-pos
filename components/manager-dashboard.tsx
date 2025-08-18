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
import { getAllUsers } from "@/lib/user-actions"
import Link from "next/link"
import { LowStockProducts } from "@/components/inventory/LowStockProducts"
import { formatCurrency } from "@/lib/utils/currency"

interface ManagerDashboardProps {
  user: {
    id: string
    full_name: string
    role: string
  }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {user.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/manager/reports">
                <Button variant="outline" className="bg-blue-50 hover:bg-blue-100">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Reports & Analytics
                </Button>
              </Link>
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Low Stock Alerts */}
        {lowStockCount > 0 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>{lowStockCount} products</strong> are running low on stock and need restocking.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
              <div className="text-2xl font-bold">
                {formatCurrency(totalValue)}
              </div>
              <p className="text-xs text-muted-foreground">Total stock value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
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

        {/* Main Content Tabs */}
        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">Inventory Management</TabsTrigger>
            <TabsTrigger value="sales">Recent Sales</TabsTrigger>
            <TabsTrigger value="users" onClick={loadUsers}>
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Product Inventory</CardTitle>
                    <CardDescription>Manage your product catalog and stock levels</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddProduct(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products by name or barcode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <ProductsTable products={filteredProducts} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <div className="grid gap-6">
              <LowStockProducts />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>Latest transactions and sales activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentSales.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No recent sales found</p>
                  ) : (
                    recentSales.map((sale) => (
                      <div key={sale.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Receipt #{sale.receipt_number}</p>
                          <p className="text-sm text-gray-600">
                            {sale.users?.full_name} • {new Date(sale.transaction_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {new Intl.NumberFormat("en-UG", {
                              style: "currency",
                              currency: sale.currency || "UGX",
                              minimumFractionDigits: 0,
                            }).format(sale.total_amount)}
                          </p>
                          <Badge variant="outline">{sale.payment_method}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {loadingUsers ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-gray-500">Loading users...</p>
                </CardContent>
              </Card>
            ) : (
              <UserManagement users={users} currentUser={user} />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Product Dialog */}
      <AddProductDialog open={showAddProduct} onOpenChange={setShowAddProduct} />
    </div>
  )
}
