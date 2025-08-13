"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Receipt, Printer } from "lucide-react"

interface ReceiptDialogProps {
  receipt: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ReceiptDialog({ receipt, open, onOpenChange }: ReceiptDialogProps) {
  if (!receipt) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Receipt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 font-mono text-sm">
          {/* Header */}
          <div className="text-center">
            <h3 className="font-bold text-lg">SuperMarket Pro</h3>
            <p className="text-xs text-gray-600">Your Neighborhood Store</p>
            <p className="text-xs text-gray-600">Thank you for shopping with us!</p>
          </div>

          <Separator />

          {/* Receipt Details */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span>{receipt.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(receipt.transaction_date).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="capitalize">{receipt.payment_method.replace("_", " ")}</span>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-2">
            {receipt.items.map((item: any, index: number) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between">
                  <span className="truncate pr-2">{item.name}</span>
                  <span>${(item.price * item.cartQuantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 pl-2">
                  <span>
                    {item.cartQuantity} x ${item.price.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Total */}
          <div className="space-y-1">
            <div className="flex justify-between font-bold">
              <span>TOTAL:</span>
              <span>${receipt.total_amount.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          <div className="text-center text-xs text-gray-600">
            <p>Have a great day!</p>
            <p>Visit us again soon</p>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handlePrint} className="flex-1 bg-transparent">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
