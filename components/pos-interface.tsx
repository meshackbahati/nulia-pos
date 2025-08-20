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
import { useCart } from "@/contexts/CartContext"
import { findProductByBarcode, suggestProducts, processSale } from "@/lib/services/sales-service"
import EnhancedReceiptDialog from "@/components/enhanced-receipt-dialog"
import BarcodeScanner from "@/components/barcode-scanner"
import ProductSuggestionDialog from "@/components/product-suggestion-dialog"
import CartSidebar from "./cart-sidebar"
import CheckoutDialog from "./checkout-dialog"

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
  const { state, addItem, updateQuantity, removeItem, clearCart, getSubtotal, getTax, getTotal } = useCart()
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mobile_money">("cash")
  const [processing, setProcessing] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestedProducts, setSuggestedProducts] = useState<ProductUI[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showCheckout, setShowCheckout] = useState(false)

  const handleBarcodeScanned = async (barcode: string) => {
    // This is now handled by the CartContext
  }

  const handleSuggestionSearch = async (search: string) => {
    setSearchTerm(search)
    if (search.trim().length > 2) {
      const suggestions = await suggestProducts(search)
      setSuggestedProducts(suggestions)
    } else {
      setSuggestedProducts([])
    }
  }

  const handleCheckout = () => {
    if (state.items.length === 0) {
      alert("Your cart is empty!")
      return
    }
    setShowCheckout(true)
  }

  const handleSaleSuccess = (receiptData: ReceiptData) => {
    setLastReceipt(receiptData);
    setShowReceipt(true);
    clearCart();
  };

  return (
    <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Product Selection */}
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
                    onClick={() => addItem(product)}
                    >
                    <div className="font-medium text-sm truncate w-full">{product.name}</div>
                    <div className="text-xs text-muted-foreground">{product.category}</div>
                    <div className="font-bold text-primary">{formatCurrency(product.price)}</div>
                    <Badge variant="secondary" className="text-xs">
                        Stock: {product.quantity}
                    </Badge>
                    </Button>
                ))}
                </div>
            </CardContent>
            </Card>
        </div>

        {/* Right side - Cart */}
        <div className="flex-1">
            <CartSidebar onCheckout={handleCheckout} />
        </div>

        <EnhancedReceiptDialog receipt={lastReceipt} open={showReceipt} onOpenChange={setShowReceipt} />

        {/* Product Suggestion Dialog */}
        <ProductSuggestionDialog
            open={showSuggestions}
            onOpenChange={setShowSuggestions}
            searchTerm={searchTerm}
            suggestions={suggestedProducts}
            onSelectProduct={addItem}
            onSearchChange={handleSuggestionSearch}
        />
        </div>
        <CheckoutDialog
            open={showCheckout}
            onOpenChange={setShowCheckout}
            salespersonId={salespersonId}
            onSaleSuccess={handleSaleSuccess}
        />
    </>
  )
}
