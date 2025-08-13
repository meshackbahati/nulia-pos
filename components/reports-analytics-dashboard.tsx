"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { BarChart3, TrendingUp, DollarSign, Download, ArrowLeft, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

interface ReportsAnalyticsDashboardProps {
  user: {
    full_name: string
    role: string
  }
  salesData: any[]
  productPerformance: any[]
  inventoryData: any[]
  lowStockProducts: any[]
}

export default function ReportsAnalyticsDashboard({
  user,
  salesData,
  productPerformance,
  inventoryData,
  lowStockProducts,
}: ReportsAnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  const [selectedPeriod, setSelectedPeriod] = useState("30days")

  // Calculate analytics data
  const analytics = useMemo(() => {
    const filteredSales = salesData.filter((sale) => {
      const saleDate = new Date(sale.transaction_date)
      return saleDate >= dateRange.from && saleDate <= dateRange.to
    })

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + Number.parseFloat(sale.total_amount), 0)
    const totalTransactions = filteredSales.length
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // Daily sales data
    const dailySales = filteredSales.reduce(
      (acc, sale) => {
        const date = format(new Date(sale.transaction_date), "yyyy-MM-dd")
        if (!acc[date]) {
          acc[date] = { date, revenue: 0, transactions: 0 }
        }
        acc[date].revenue += Number.parseFloat(sale.total_amount)
        acc[date].transactions += 1
        return acc
      },
      {} as Record<string, any>,
    )

    const dailySalesArray = Object.values(dailySales).sort((a: any, b: any) => a.date.localeCompare(b.date))

    // Top products
    const productSales = productPerformance.reduce(
      (acc, item) => {
        const productId = item.products.id
        if (!acc[productId]) {
          acc[productId] = {
            id: productId,
            name: item.products.name,
            category: item.products.category,
            totalQuantity: 0,
            totalRevenue: 0,
            price: item.products.price,
          }
        }
        acc[productId].totalQuantity += item.quantity
        acc[productId].totalRevenue += Number.parseFloat(item.subtotal)
        return acc
      },
      {} as Record<string, any>,
    )

    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)

    // Category performance
    const categoryPerformance = productPerformance.reduce(
      (acc, item) => {
        const category = item.products.category
        if (!acc[category]) {
          acc[category] = { category, revenue: 0, quantity: 0 }
        }
        acc[category].revenue += Number.parseFloat(item.subtotal)
        acc[category].quantity += item.quantity
        return acc
      },
      {} as Record<string, any>,
    )

    const categoryData = Object.values(categoryPerformance).sort((a: any, b: any) => b.revenue - a.revenue)

    // Salesperson performance
    const salespersonPerformance = filteredSales.reduce(
      (acc, sale) => {
        const salesperson = sale.users?.full_name || "Unknown"
        if (!acc[salesperson]) {
          acc[salesperson] = { name: salesperson, revenue: 0, transactions: 0 }
        }
        acc[salesperson].revenue += Number.parseFloat(sale.total_amount)
        acc[salesperson].transactions += 1
        return acc
      },
      {} as Record<string, any>,
    )

    const salespersonData = Object.values(salespersonPerformance).sort((a: any, b: any) => b.revenue - a.revenue)

    return {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      dailySalesArray,
      topProducts,
      categoryData,
      salespersonData,
    }
  }, [salesData, productPerformance, dateRange])

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
    const now = new Date()
    let from: Date

    switch (period) {
      case "7days":
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30days":
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90days":
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    setDateRange({ from, to: now })
  }

  const exportReport = (type: string) => {
    // In production, this would generate and download actual reports
    alert(`Exporting ${type} report... (Feature would be implemented in production)`)
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF7C7C"]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/manager">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                <p className="text-sm text-gray-600">Comprehensive business insights and performance metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => exportReport("comprehensive")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${analytics.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">Total sales completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.averageOrderValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</div>
              <p className="text-xs text-muted-foreground">Need restocking</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
            <TabsTrigger value="products">Product Performance</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Reports</TabsTrigger>
            <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Sales Trend */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Daily Sales Trend</CardTitle>
                  <CardDescription>Revenue and transaction volume over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.dailySalesArray}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="transactions"
                        stroke="#82ca9d"
                        name="Transactions"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Category</CardTitle>
                  <CardDescription>Revenue distribution across product categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {analytics.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Distribution of payment types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["cash", "card", "mobile_money"].map((method) => {
                      const count = salesData.filter((sale) => sale.payment_method === method).length
                      const percentage = salesData.length > 0 ? (count / salesData.length) * 100 : 0
                      return (
                        <div key={method} className="flex items-center justify-between">
                          <span className="capitalize">{method.replace("_", " ")}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="text-sm text-gray-600">{percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Products</CardTitle>
                  <CardDescription>Best performing products by revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topProducts.slice(0, 8).map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-gray-600">{product.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${product.totalRevenue.toFixed(2)}</p>
                          <p className="text-xs text-gray-600">{product.totalQuantity} sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Product Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Performance</CardTitle>
                  <CardDescription>Top 10 products by quantity sold</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.topProducts.slice(0, 10)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="totalQuantity" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Stock Alert */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Low Stock Alert
                  </CardTitle>
                  <CardDescription>Products that need immediate restocking</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {lowStockProducts.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">All products are well stocked!</p>
                    ) : (
                      lowStockProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-gray-600">{product.category}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">{product.quantity} left</Badge>
                            <p className="text-xs text-gray-600">Min: {product.low_stock_threshold}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Inventory Value */}
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Overview</CardTitle>
                  <CardDescription>Current stock levels and values</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{inventoryData.length}</p>
                        <p className="text-sm text-gray-600">Total Products</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          ${inventoryData.reduce((sum, p) => sum + p.price * p.quantity, 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">Total Value</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Stock Status</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Well Stocked</span>
                          <Badge variant="default">
                            {inventoryData.filter((p) => p.quantity > p.low_stock_threshold).length}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Low Stock</span>
                          <Badge variant="destructive">{lowStockProducts.length}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Out of Stock</span>
                          <Badge variant="secondary">{inventoryData.filter((p) => p.quantity === 0).length}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Salesperson Performance</CardTitle>
                <CardDescription>Individual performance metrics and rankings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {analytics.salespersonData.map((person, index) => (
                      <div key={person.name} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <div>
                            <p className="font-medium">{person.name}</p>
                            <p className="text-sm text-gray-600">{person.transactions} transactions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${person.revenue.toFixed(2)}</p>
                          <p className="text-xs text-gray-600">
                            Avg: ${(person.revenue / person.transactions).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.salespersonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
