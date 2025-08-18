"use client"

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { PrinterIcon, Download, Mail, MessageSquare } from "lucide-react"

interface ReceiptItem {
  product_id: string
  product_name?: string
  name?: string
  quantity: number
  unit_price: number
  subtotal: number
  barcode?: string
}

interface ReceiptData {
  receipt_number: string
  sale_id: string
  timestamp: string
  salesperson_id: string
  items: ReceiptItem[]
  subtotal: number
  tax?: number
  discount?: number
  total: number
  payment_method: string
  customer_phone?: string
  change_due?: number
  amount_tendered?: number
}

interface EnhancedReceiptDialogProps {
  receipt: ReceiptData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function EnhancedReceiptDialog({ receipt, open, onOpenChange }: EnhancedReceiptDialogProps) {
  if (!receipt) return null

  const handlePrint = () => {
    // Create print-friendly content
    const printContent = document.getElementById('receipt-content')?.innerHTML
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${receipt.receipt_number}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              line-height: 1.4;
              margin: 0;
              padding: 20px;
              max-width: 300px;
            }
            .receipt-header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .receipt-title { 
              font-size: 18px; 
              font-weight: bold; 
              margin-bottom: 5px;
            }
            .receipt-info { 
              margin-bottom: 15px; 
              font-size: 11px;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .items-table th,
            .items-table td { 
              text-align: left; 
              padding: 3px 0;
              font-size: 11px;
            }
            .item-line {
              border-bottom: 1px dotted #666;
              padding: 5px 0;
            }
            .totals-section { 
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 15px;
            }
            .total-line { 
              display: flex; 
              justify-content: space-between;
              margin: 3px 0;
            }
            .final-total { 
              font-weight: bold; 
              font-size: 14px;
              border-top: 1px solid #000;
              padding-top: 5px;
              margin-top: 5px;
            }
            .receipt-footer { 
              text-align: center; 
              margin-top: 20px;
              border-top: 1px solid #000;
              padding-top: 10px;
              font-size: 10px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.print()
    printWindow.close()
  }

  const handleDownloadPDF = () => {
    // This would integrate with a PDF generation library
    // For now, we'll use the browser's print-to-PDF functionality
    handlePrint()
  }

  const handleSendEmail = () => {
    // This would integrate with an email service
    alert('Email functionality would be implemented here')
  }

  const handleSendSMS = () => {
    // This would integrate with SMS service for digital receipts
    if (receipt.customer_phone) {
      alert(`SMS receipt would be sent to ${receipt.customer_phone}`)
    } else {
      alert('No customer phone number provided')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PrinterIcon className="h-5 w-5" />
            Sale Receipt
          </DialogTitle>
        </DialogHeader>

        <div id="receipt-content" className="space-y-4">
          {/* Receipt Header */}
          <div className="receipt-header text-center border-b-2 border-gray-900 pb-4">
            <div className="receipt-title text-xl font-bold">BORDERSHOP</div>
            <div className="text-sm text-gray-600">Point of Sale System</div>
            <div className="text-sm text-gray-600">Thank you for your business!</div>
          </div>

          {/* Receipt Info */}
          <div className="receipt-info space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span className="font-mono">{receipt.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDateTime(receipt.timestamp)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{receipt.salesperson_id}</span>
            </div>
            {receipt.customer_phone && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{receipt.customer_phone}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-3">
            <h4 className="font-semibold">Items Purchased:</h4>
            {receipt.items.map((item, index) => (
              <div key={index} className="item-line space-y-1 pb-2 border-b border-dotted border-gray-400">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {item.product_name || item.name}
                    </div>
                    {item.barcode && (
                      <div className="text-xs text-gray-500 font-mono">
                        {item.barcode}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                  <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="totals-section space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(receipt.subtotal)}</span>
            </div>
            
            {receipt.tax && receipt.tax > 0 && (
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(receipt.tax)}</span>
              </div>
            )}
            
            {receipt.discount && receipt.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-{formatCurrency(receipt.discount)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-lg final-total border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(receipt.total)}</span>
            </div>
          </div>

          <Separator />

          {/* Payment Info */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <Badge variant="outline" className="capitalize">
                {receipt.payment_method.replace('_', ' ')}
              </Badge>
            </div>
            
            {receipt.amount_tendered && (
              <>
                <div className="flex justify-between">
                  <span>Amount Tendered:</span>
                  <span>{formatCurrency(receipt.amount_tendered)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change Due:</span>
                  <span>{formatCurrency(receipt.change_due || 0)}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="receipt-footer text-center text-xs text-gray-600 border-t pt-4 space-y-1">
            <div>No returns without receipt</div>
            <div>Valid for 30 days</div>
            <div>Visit us again!</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <PrinterIcon className="h-4 w-4" />
            Print Receipt
          </Button>
          
          <Button variant="outline" onClick={handleDownloadPDF} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          
          <Button variant="outline" onClick={handleSendEmail} className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </Button>
          
          {receipt.customer_phone && (
            <Button variant="outline" onClick={handleSendSMS} className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}