"use client"

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { PrinterIcon, Download, Mail, MessageSquare } from "lucide-react"

export interface ReceiptItem {
  product_id: string
  product_name?: string
  name?: string
  quantity: number
  unit_price: number
  subtotal: number
  barcode?: string
}

export interface ReceiptData {
  // Core receipt information
  receipt_number: string
  sale_id: string
  timestamp: string
  
  // Salesperson information
  salesperson_id: string
  cashier_name?: string
  
  // Items in the sale
  items: ReceiptItem[]
  
  // Financial details
  subtotal: number
  tax?: number
  discount?: number
  total: number
  payment_method: string
  amount_tendered?: number
  change_due?: number
  
  // Customer information
  customer_phone?: string
  
  // Business information
  business_name?: string
  business_address?: string
  business_phone?: string
  
  // Additional metadata
  [key: string]: any
}

interface EnhancedReceiptDialogProps {
  receipt: ReceiptData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function EnhancedReceiptDialog({ receipt, open, onOpenChange }: EnhancedReceiptDialogProps) {
  if (!receipt) return null;
  
  // Ensure we have valid receipt data
  const safeReceipt = {
    ...receipt,
    receipt_number: receipt.receipt_number || 'N/A',
    timestamp: receipt.timestamp || new Date().toISOString(),
    payment_method: receipt.payment_method || 'cash',
    items: receipt.items || [],
    subtotal: receipt.subtotal || 0,
    total: receipt.total || 0,
    tax: receipt.tax || 0,
    discount: receipt.discount || 0,
    tax_rate: 0, // Default tax rate if not provided
    amount_tendered: receipt.amount_tendered || 0,
    change_due: receipt.change_due || 0
  };

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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <PrinterIcon className="h-5 w-5" />
            Sale Receipt
          </DialogTitle>
        </DialogHeader>

        <div id="receipt-content" className="space-y-4 p-4 bg-white dark:bg-gray-900">
          {/* Receipt Header */}
          <div className="text-center border-b-2 border-gray-300 dark:border-gray-700 pb-4">
            <div className="text-xl font-bold text-gray-900 dark:text-white">BORDERSHOP</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Point of Sale System</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Thank you for your business!</p>
          </div>

          {/* Receipt Info */}
          <div className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span className="font-mono">{safeReceipt.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDateTime(safeReceipt.timestamp)}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="capitalize">{(safeReceipt.payment_method || '').replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{safeReceipt.cashier_name || (safeReceipt.salesperson_id ? `#${String(safeReceipt.salesperson_id).slice(-4)}` : 'N/A')}</span>
            </div>
            {safeReceipt.customer_phone && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{safeReceipt.customer_phone}</span>
              </div>
            )}
          </div>

          <Separator className="my-2" />

          {/* Items Table */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">Items Purchased:</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left pb-2 text-gray-900 dark:text-gray-100">Item</th>
                    <th className="text-right pb-2 text-gray-900 dark:text-gray-100">Qty</th>
                    <th className="text-right pb-2 text-gray-900 dark:text-gray-100">Price</th>
                    <th className="text-right pb-2 text-gray-900 dark:text-gray-100">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {safeReceipt.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2">
                        <div className="font-medium text-gray-900 dark:text-white">{item.name || item.product_name || 'Unnamed Item'}</div>
                        {item.barcode && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">#{item.barcode}</div>
                        )}
                      </td>
                      <td className="text-right text-gray-900 dark:text-gray-100">{item.quantity}</td>
                      <td className="text-right text-gray-900 dark:text-gray-100">{formatCurrency(item.unit_price)}</td>
                      <td className="text-right font-medium text-gray-900 dark:text-white">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Totals Section */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Subtotal:</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(safeReceipt.subtotal || 0)}</span>
            </div>
            
            {(safeReceipt.tax || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Tax ({(safeReceipt.tax_rate || 0)}%):</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(safeReceipt.tax || 0)}</span>
              </div>
            )}
            
            {(safeReceipt.discount || 0) > 0 && (
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>Discount:</span>
                <span>-{formatCurrency(safeReceipt.discount || 0)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-lg border-t border-gray-300 dark:border-gray-700 pt-2 mt-2">
              <span className="text-gray-900 dark:text-white">Total:</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(safeReceipt.total || 0)}</span>
            </div>
            
            {(safeReceipt.amount_tendered || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Amount Tendered:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(safeReceipt.amount_tendered || 0)}</span>
              </div>
            )}
            
            {(safeReceipt.change_due || 0) > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                <span>Change Due:</span>
                <span>{formatCurrency(safeReceipt.change_due || 0)}</span>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
            <p className="mb-1">Thank you for shopping with us!</p>
            <p className="mb-1">This receipt serves as your official invoice</p>
            <p>For inquiries, please call {safeReceipt.business_phone || 'our customer service'}</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex flex-wrap justify-end gap-2 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" size="sm" onClick={handlePrint} className="bg-white dark:bg-gray-800">
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="bg-white dark:bg-gray-800">
            <Download className="h-4 w-4 mr-2" />
            Save as PDF
          </Button>
          {safeReceipt.customer_phone && (
            <>
              <Button variant="outline" size="sm" onClick={handleSendEmail} className="bg-white dark:bg-gray-800">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendSMS} className="bg-white dark:bg-gray-800">
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}