"use client"

import { useCart, useCartSummary } from "@/contexts/CartContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils/currency"
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react"

interface CartSidebarProps {
    onCheckout: () => void;
}

export default function CartSidebar({ onCheckout }: CartSidebarProps) {
  const { state, updateQuantity, removeItem, clearCart } = useCart()
  const { subtotal, tax, total, itemCount, isEmpty } = useCartSummary()

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span>Cart ({itemCount})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mb-4" />
            <p>Your cart is empty.</p>
            <p className="text-sm">Add products by clicking on them or scanning a barcode.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {state.items.map((item) => (
              <div key={item.product.id} className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.product.price)} x {item.quantity}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                    <p className="font-semibold">{formatCurrency(item.product.price * item.quantity)}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                            <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeItem(item.product.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {!isEmpty && (
        <CardFooter className="flex flex-col gap-4 mt-auto p-4 border-t">
          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (16%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          <div className="w-full grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={clearCart}>Clear Cart</Button>
            <Button onClick={onCheckout}>Checkout</Button>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
