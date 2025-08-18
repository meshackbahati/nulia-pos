"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Smartphone, Banknote } from "lucide-react"
import { SalesService } from "@/lib/services/sales-service"
import EnhancedReceiptDialog from "@/components/enhanced-receipt-dialog"
import ProductSuggestionDialog from "@/components/product-suggestion-dialog"

interface Product {
  id: string
  name: string
  category: string
  price: number
  quantity: number
  barcode: string
}

interface CartItem extends Product {
  cartQuantity: number
}

interface POSInterfaceProps {
  products: Product[]
  salespersonId: string
}

export default function POSInterface({ products, salespersonId }: POSInterfaceProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mobile_money">("cash")
  const [processing, setProcessing] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<any>(null)
  const [showReceipt, setShowReceipt] = useState(false)

  const handleBarcodeScanned = async (barcode: string) => {
    // First try to find product by barcode
    const product = await SalesService.findProductByBarcode(barcode)
    
    if (product) {
      addToCart(product)
    } else {
      // If not found, show AI suggestions
      const suggestions = await SalesService.suggestProducts(barcode)
      
      if (suggestions.length > 0) {
        // Show suggestion dialog (implement this UI)
        const suggested = suggestions[0] // For now, just use first suggestion
        const confirmed = confirm(`Product not found for barcode: ${barcode}. Did you mean: ${suggested.name}?`)
        if (confirmed) {
          addToCart(suggested)
        }
      } else {
        alert(`Product not found for barcode: ${barcode}. No suggestions available.`)
      }
    }
  }

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id)
      if (existingItem) {
        if (existingItem.cartQuantity < product.quantity) {
          return prevCart.map((item) =>
            item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item,
          )
        } else {
          alert("Not enough stock available!")
          return prevCart
        }
      } else {
        return [...prevCart, { ...product, cartQuantity: 1 }]
      }
    })
  }

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    const product = products.find((p) => p.id === productId)
    if (product && newQuantity > product.quantity) {
      alert("Not enough stock available!")
      return
    }

    setCart((prevCart) =>
      prevCart.map((item) => (item.id === productId ? { ...item, cartQuantity: newQuantity } : item)),
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId))
  }

  const clearCart = () => {
    setCart([])
  }

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.cartQuantity, 0)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart is empty!")
      return
    }

    setProcessing(true)
    try {
      const saleData = {
        salesperson_id: salespersonId,
        total_amount: calculateTotal(),
        payment_method: paymentMethod,
        items: cart.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.cartQuantity,
          unit_price: item.price,
          subtotal: item.price * item.cartQuantity,
          barcode: item.barcode
        })),
      }

      const result = await SalesService.processSale(saleData)
      
      if (result.success) {
        setLastReceipt({
          ...result.receipt_data,
          items: cart,
          payment_method: paymentMethod
        })
        setShowReceipt(true)
        clearCart()
      } else {
        alert(`Failed to process sale: ${result.error}`)
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert("Failed to process sale. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Scanner and Product Selection */}
      <div className="lg:col-span-2 space-y-6">
        <BarcodeScanner onBarcodeScanned={handleBarcodeScanned} />

        {/* Product Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Add Products</CardTitle>
            <CardDescription>Click to add products to cart</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {products.slice(0, 12).map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  className="h-auto p-3 flex flex-col items-start text-left bg-transparent"
                  onClick={() => addToCart(product)}
                >
                  <div className="font-medium text-sm truncate w-full">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.category}</div>
                  <div className="font-bold text-green-600">${product.price.toFixed(2)}</div>
                  <Badge variant="secondary" className="text-xs">
                    Stock: {product.quantity}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shopping Cart */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Shopping Cart
              </span>
              {cart.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearCart}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Cart is empty</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.cartQuantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checkout */}
        {cart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span className="text-lg">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Card
                      </div>
                    </SelectItem>
                    <SelectItem value="mobile_money">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Mobile Money
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
              >
                {processing ? "Processing..." : `Complete Sale - $${calculateTotal().toFixed(2)}`}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Receipt Dialog */}
      <EnhancedReceiptDialog receipt={lastReceipt} open={showReceipt} onOpenChange={setShowReceipt} />
    </div>
  )
}
