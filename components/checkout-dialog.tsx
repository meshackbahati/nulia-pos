"use client"

import { useState } from "react"
import { useCart, useCartSummary } from "@/contexts/CartContext"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Banknote, Smartphone, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { processSale } from "@/lib/services/sales-service"
import { mpesaService } from "@/lib/payment/mpesa"

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  salespersonId: string
}

export default function CheckoutDialog({ open, onOpenChange, salespersonId }: CheckoutDialogProps) {
  const { state, clearCart } = useCart()
  const { total } = useCartSummary()
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mpesa-stk" | "mpesa-c2b">("cash")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePayment = async () => {
    setProcessing(true)
    setError(null)

    try {
      if (paymentMethod === "cash") {
        await handleCashPayment()
      } else if (paymentMethod === "mpesa-stk") {
        await handleMpesaStkPush()
      } else if (paymentMethod === "mpesa-c2b") {
        // C2B logic will be implemented later
        alert("Mpesa C2B is not yet implemented.")
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.")
    } finally {
      setProcessing(false)
    }
  }

  const handleCashPayment = async () => {
    const saleData = {
      salesperson_id: salespersonId,
      total_amount: total,
      payment_method: "cash" as const,
      items: state.items.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity,
        barcode: item.product.barcode || undefined
      }))
    }
    const result = await processSale(saleData)
    if (result.success) {
      clearCart()
      // We can show a success message or receipt here
    } else {
      throw new Error(result.error || "Failed to process cash sale.")
    }
  }

  const handleMpesaStkPush = async () => {
    const reference = `SALE${Date.now()}`
    const description = `Payment for goods worth ${formatCurrency(total)}`

    // This should call our API route, not the service directly from the client
    const response = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phoneNumber,
            amount: Math.ceil(total), // Mpesa only accepts integers
            reference,
            description,
        }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate M-Pesa payment.');
    }

    // Here you would typically show a waiting modal for the user to enter their PIN
    // and for the callback to be received by your server.
    // For now, we'll assume the payment is successful if the request is.

    const saleData = {
        salesperson_id: salespersonId,
        total_amount: total,
        payment_method: "mobile_money" as const,
        customer_phone: phoneNumber,
        items: state.items.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          subtotal: item.product.price * item.quantity,
          barcode: item.product.barcode || undefined
        }))
      }
    const saleResult = await processSale(saleData)
    if (saleResult.success) {
      clearCart()
    } else {
      throw new Error(saleResult.error || "Failed to process M-Pesa sale.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Complete Checkout</DialogTitle>
          <DialogDescription>
            Total Amount: <span className="font-bold text-lg text-primary">{formatCurrency(total)}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cash"><Banknote className="h-4 w-4 mr-2" />Cash</TabsTrigger>
            <TabsTrigger value="mpesa-stk"><Smartphone className="h-4 w-4 mr-2" />M-Pesa STK</TabsTrigger>
            <TabsTrigger value="mpesa-c2b" disabled>Paybill</TabsTrigger>
          </TabsList>

          <TabsContent value="cash" className="py-4">
            <p className="text-center text-muted-foreground">Confirm cash payment from customer.</p>
          </TabsContent>

          <TabsContent value="mpesa-stk" className="py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Customer Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g., 0712345678"
                required
              />
              <p className="text-xs text-muted-foreground">
                An STK push will be sent to the customer to complete the payment.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="mpesa-c2b">
            {/* C2B UI will go here */}
          </TabsContent>
        </Tabs>

        {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={processing || (paymentMethod === 'mpesa-stk' && !phoneNumber)}>
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
