"use client"

import { useState } from "react"
import type { ReceiptData } from "./enhanced-receipt-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/currency"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Smartphone, Banknote, Loader2 } from "lucide-react"
import { findProductByBarcode, suggestProducts, processSale } from "@/lib/services/sales-service"
import EnhancedReceiptDialog from "@/components/enhanced-receipt-dialog"
import BarcodeScanner from "@/components/barcode-scanner"
import ProductSuggestionDialog from "@/components/product-suggestion-dialog"

// Import the Product type from the database
import type { Database } from "@/lib/database.types"

// Base product type from database
type DatabaseProduct = Database['public']['Tables']['products']['Row']

// Minimal product interface for the UI
export interface ProductUI {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string | null;
  barcode: string | null;
  cartQuantity?: number;
  [key: string]: any; // For any other properties that might be needed
}

// Cart item type that extends the product with cart-specific properties
interface CartItem extends ProductUI {
  cartQuantity: number;
}

// Type guard to check if an object is a ProductUI
function isProductUI(product: any): product is ProductUI {
  return (
    product &&
    typeof product.id === 'string' &&
    typeof product.name === 'string' &&
    typeof product.price === 'number' &&
    typeof product.quantity === 'number' &&
    (product.category === null || typeof product.category === 'string') &&
    (product.barcode === null || typeof product.barcode === 'string')
  );
}

// Convert database product to UI product
function toUIProduct(dbProduct: DatabaseProduct): ProductUI {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    price: dbProduct.price,
    quantity: dbProduct.quantity,
    category: dbProduct.category,
    barcode: dbProduct.barcode,
    // Add any other necessary fields here
  };
}

interface POSInterfaceProps {
  products: DatabaseProduct[]
  salespersonId: string
}

export default function POSInterface({ products: dbProducts, salespersonId }: POSInterfaceProps) {
  // Convert database products to UI products
  const products = dbProducts.map(toUIProduct);
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mobile_money">("cash")
  const [processing, setProcessing] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestedProducts, setSuggestedProducts] = useState<ProductUI[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      // First try to find product by barcode
      const dbProduct = await findProductByBarcode(barcode)
      
      if (dbProduct) {
        const product = toUIProduct(dbProduct)
        addToCart(product)
      } else {
        // If not found, show AI suggestions
        const suggestions = await suggestProducts(barcode)
        
        if (suggestions && suggestions.length > 0) {
          setSearchTerm(barcode)
          setSuggestedProducts(suggestions)
          setShowSuggestions(true)
        } else {
          alert(`Product not found for barcode: ${barcode}. No suggestions available.`)
        }
      }
    } catch (error) {
      console.error('Error in handleBarcodeScanned:', error)
      alert('Error processing barcode. Please try again.')
    }
  }

  const handleSuggestionSearch = async (search: string) => {
    setSearchTerm(search)
    if (search.trim().length > 2) {
      const suggestions = await SalesService.suggestProducts(search)
      setSuggestedProducts(suggestions)
    } else {
      setSuggestedProducts([])
    }
  }

  const addToCart = (product: ProductUI) => {
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
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
    const tax = subtotal * 0.16; // 16% tax rate
    const total = subtotal + tax;
    return total;
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Your cart is empty!")
      return
    }

    setProcessing(true)
    try {
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
      const tax = subtotal * 0.16; // 16% tax rate
      const total = subtotal + tax;
      
      const saleData = {
        salesperson_id: salespersonId,
        total_amount: total,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.cartQuantity,
          unit_price: item.price,
          subtotal: item.price * item.cartQuantity,
          barcode: item.barcode || undefined
        }))
      }

      const result = await processSale(saleData)

      if (result.success) {
        // Format receipt data with enhanced details
        const currentDate = new Date();
        const formattedReceipt: ReceiptData = {
          receipt_number: result.receipt_number || `RCPT-${Date.now()}`,
          sale_id: result.sale_id || '',
          salesperson_id: salespersonId,
          cashier_name: `Cashier #${salespersonId.slice(-4)}`, // Simple cashier ID display
          items: cart.map(item => {
            const product = products.find(p => p.id === item.id);
            return {
              ...item,
              product_id: item.id,
              name: product?.name || 'Unknown Product',
              unit_price: item.price,
              subtotal: item.price * item.cartQuantity,
              quantity: item.cartQuantity,
              barcode: item.barcode || ''
            };
          }),
          payment_method: paymentMethod,
          timestamp: result.receipt_data?.timestamp || currentDate.toISOString(),
          subtotal: subtotal,
          total: total,
          tax: tax,
          discount: 0,
          amount_tendered: total, // Assuming full payment for now
          change_due: 0,
          // Add business information
          business_name: "Bordershop",
          business_address: "123 Business St, Nairobi, Kenya",
          business_phone: "+254 700 000000"
        };
        
        setLastReceipt(formattedReceipt);
        setShowReceipt(true);
        clearCart();
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
                  <div className="font-bold text-green-600">{formatCurrency(product.price)}</div>
                  <Badge variant="secondary" className="text-xs">
                    Stock: {product.quantity}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Checkout */}
      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span className="text-lg">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            <Button
              variant="default"
              size="lg"
              onClick={handleCheckout}
              disabled={processing}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {processing ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Processing...</span>
                </div>
              ) : (
                <span>Checkout</span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      <EnhancedReceiptDialog receipt={lastReceipt} open={showReceipt} onOpenChange={setShowReceipt} />
      
      {/* Product Suggestion Dialog */}
      <ProductSuggestionDialog 
        open={showSuggestions}
        onOpenChange={setShowSuggestions}
        searchTerm={searchTerm}
        suggestions={suggestedProducts}
        onSelectProduct={addToCart}
        onSearchChange={handleSuggestionSearch}
      />
    </div>
  )
}
