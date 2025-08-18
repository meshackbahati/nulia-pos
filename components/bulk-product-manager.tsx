"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  Package, 
  Loader2,
  FileText,
  Database
} from "lucide-react"

interface BulkProductManagerProps {
  onProductsUpdated: () => void
}

interface ProductImportResult {
  success: boolean
  processed: number
  errors: Array<{
    row: number
    error: string
    data: any
  }>
  created: number
  updated: number
}

export default function BulkProductManager({ onProductsUpdated }: BulkProductManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("import")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResult, setImportResult] = useState<ProductImportResult | null>(null)
  const [csvData, setCsvData] = useState("")

  const sampleCSVData = `name,category,price,quantity,barcode,currency,low_stock_threshold,reorder_point,supplier_name
"Coca Cola 500ml","Beverages",80,100,"1234567890123","KES",10,20,"Coca Cola Company"
"White Bread","Bakery",65,50,"2345678901234","KES",5,15,"Local Bakery"
"Fresh Milk 1L","Dairy",120,30,"3456789012345","KES",8,25,"Dairy Farm Ltd"`

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
      
      // Read file content for preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setCsvData(content)
      }
      reader.readAsText(file)
    }
  }

  const processImport = async () => {
    if (!importFile && !csvData) {
      alert('Please select a file or enter CSV data')
      return
    }

    setIsProcessing(true)
    setImportProgress(0)

    try {
      const dataToProcess = csvData || await importFile!.text()
      
      // Parse CSV data
      const lines = dataToProcess.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
      const rows = lines.slice(1)

      const results: ProductImportResult = {
        success: true,
        processed: 0,
        errors: [],
        created: 0,
        updated: 0
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row.trim()) continue

        try {
          // Parse CSV row (simple CSV parser)
          const values = row.split(',').map(v => v.replace(/"/g, '').trim())
          const product: any = {}
          
          headers.forEach((header, index) => {
            if (values[index] !== undefined) {
              product[header] = values[index]
            }
          })

          // Validate required fields
          if (!product.name || !product.price) {
            results.errors.push({
              row: i + 2,
              error: 'Missing required fields (name, price)',
              data: product
            })
            continue
          }

          // Convert numeric fields
          product.price = parseFloat(product.price) || 0
          product.quantity = parseInt(product.quantity) || 0
          product.low_stock_threshold = parseInt(product.low_stock_threshold) || 10
          product.reorder_point = parseInt(product.reorder_point) || 5

          // Generate barcode if not provided
          if (!product.barcode) {
            product.barcode = `AUTO-${Date.now()}-${i}`
          }

          // Set defaults
          product.currency = product.currency || 'KES'
          product.is_active = true

          // Send to API
          const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(product)
          })

          if (response.ok) {
            results.created++
          } else {
            const errorData = await response.json()
            results.errors.push({
              row: i + 2,
              error: errorData.error || 'Failed to create product',
              data: product
            })
          }

          results.processed++
          setImportProgress((results.processed / rows.length) * 100)
          
          // Add small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100))

        } catch (error) {
          results.errors.push({
            row: i + 2,
            error: `Parse error: ${error}`,
            data: row
          })
        }
      }

      setImportResult(results)
      onProductsUpdated()

    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed. Please check your data and try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = sampleCSVData
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'product_import_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=1000')
      const data = await response.json()
      
      if (data.data) {
        const products = data.data
        const headers = ['name', 'category', 'price', 'quantity', 'barcode', 'currency', 'low_stock_threshold', 'reorder_point']
        
        let csv = headers.join(',') + '\n'
        products.forEach((product: any) => {
          const row = headers.map(header => {
            const value = product[header] || ''
            return `"${value}"`
          }).join(',')
          csv += row + '\n'
        })

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          Bulk Operations
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk Product Management
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">Import Products</TabsTrigger>
            <TabsTrigger value="export">Export Products</TabsTrigger>
            <TabsTrigger value="template">CSV Template</TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="csv-file">Upload CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="mt-2"
                  />
                </div>
                <div className="text-center text-sm text-gray-500 px-4">OR</div>
                <Button onClick={downloadTemplate} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <div>
                <Label htmlFor="csv-data">Paste CSV Data</Label>
                <Textarea
                  id="csv-data"
                  placeholder="Paste your CSV data here..."
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  rows={8}
                  className="mt-2 font-mono text-sm"
                />
              </div>

              {csvData && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ready to import {csvData.split('\n').filter(l => l.trim()).length - 1} products
                  </AlertDescription>
                </Alert>
              )}

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing import... {Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} className="w-full" />
                </div>
              )}

              {importResult && (
                <div className="space-y-4">
                  <Alert className={importResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Import Complete!</strong>
                      <div className="mt-2 space-y-1">
                        <div>✅ Created: {importResult.created} products</div>
                        <div>📋 Processed: {importResult.processed} rows</div>
                        {importResult.errors.length > 0 && (
                          <div>❌ Errors: {importResult.errors.length} rows</div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>

                  {importResult.errors.length > 0 && (
                    <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                      <h4 className="font-medium mb-2">Import Errors:</h4>
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 mb-1">
                          Row {error.row}: {error.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={processImport} 
                disabled={(!importFile && !csvData) || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Products
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            <div className="text-center py-8">
              <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Export Product Database</h3>
              <p className="text-gray-600 mb-6">
                Download all products as a CSV file for backup or external processing
              </p>
              
              <Button onClick={exportProducts} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export All Products
              </Button>
            </div>
          </TabsContent>

          {/* Template Tab */}
          <TabsContent value="template" className="space-y-6">
            <div className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Use this CSV format for bulk importing products. Required fields are marked with *.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h4 className="font-medium">Required CSV Format:</h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Badge variant="outline" className="mb-2">Required Fields</Badge>
                    <ul className="space-y-1">
                      <li>• name* - Product name</li>
                      <li>• price* - Product price</li>
                      <li>• category - Product category</li>
                      <li>• quantity - Stock quantity</li>
                    </ul>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Optional Fields</Badge>
                    <ul className="space-y-1">
                      <li>• barcode - Product barcode</li>
                      <li>• currency - Price currency (default: KES)</li>
                      <li>• low_stock_threshold - Alert level</li>
                      <li>• reorder_point - Reorder level</li>
                    </ul>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-2">Sample CSV Content:</h4>
                  <pre className="text-xs overflow-x-auto">{sampleCSVData}</pre>
                </div>

                <Button onClick={downloadTemplate} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}