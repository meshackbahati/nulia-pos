"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  QrCode, 
  Printer, 
  Download, 
  Copy, 
  RefreshCw, 
  BarChart3,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import JsBarcode from 'jsbarcode'

interface BarcodeGeneratorProps {
  productId?: string
  productName?: string
  onBarcodeGenerated?: (barcode: string) => void
}

interface BarcodeFormat {
  id: string
  name: string
  description: string
  pattern: RegExp
  example: string
}

const barcodeFormats: BarcodeFormat[] = [
  {
    id: 'EAN13',
    name: 'EAN-13',
    description: 'European Article Number (13 digits)',
    pattern: /^[0-9]{13}$/,
    example: '1234567890123'
  },
  {
    id: 'EAN8',
    name: 'EAN-8',
    description: 'European Article Number (8 digits)',
    pattern: /^[0-9]{8}$/,
    example: '12345670'
  },
  {
    id: 'UPC',
    name: 'UPC-A',
    description: 'Universal Product Code (12 digits)',
    pattern: /^[0-9]{12}$/,
    example: '123456789012'
  },
  {
    id: 'CODE128',
    name: 'Code 128',
    description: 'High-density linear barcode',
    pattern: /^[\x20-\x7E]+$/,
    example: 'PROD123456'
  },
  {
    id: 'CODE39',
    name: 'Code 39',
    description: 'Variable length, alphanumeric',
    pattern: /^[A-Z0-9\-\.\$\/\+\%\*\s]+$/,
    example: 'PROD-123'
  }
]

export default function BarcodeGenerator({ productId, productName, onBarcodeGenerated }: BarcodeGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState('EAN13')
  const [barcodeValue, setBarcodeValue] = useState('')
  const [generatedBarcode, setGeneratedBarcode] = useState('')
  const [isValid, setIsValid] = useState(false)
  const [validationError, setValidationError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const printCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (barcodeValue && isValid && canvasRef.current) {
      try {
        JsBarcode(canvasRef.current, barcodeValue, {
          format: selectedFormat,
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 14,
          margin: 10
        })
        setGeneratedBarcode(barcodeValue)
      } catch (error) {
        console.error('Barcode generation error:', error)
      }
    }
  }, [barcodeValue, selectedFormat, isValid])

  const validateBarcode = (value: string, format: string) => {
    const formatConfig = barcodeFormats.find(f => f.id === format)
    if (!formatConfig) {
      setValidationError('Invalid format selected')
      return false
    }

    if (!value) {
      setValidationError('Barcode value is required')
      return false
    }

    if (!formatConfig.pattern.test(value)) {
      setValidationError(`Invalid format. Expected: ${formatConfig.description} (e.g., ${formatConfig.example})`)
      return false
    }

    // EAN-13 checksum validation
    if (format === 'EAN13') {
      const checksum = calculateEAN13Checksum(value.slice(0, 12))
      if (parseInt(value[12]) !== checksum) {
        setValidationError('Invalid EAN-13 checksum. Use "Generate" to create a valid barcode.')
        return false
      }
    }

    // UPC-A checksum validation
    if (format === 'UPC') {
      const checksum = calculateUPCAChecksum(value.slice(0, 11))
      if (parseInt(value[11]) !== checksum) {
        setValidationError('Invalid UPC-A checksum. Use "Generate" to create a valid barcode.')
        return false
      }
    }

    setValidationError('')
    return true
  }

  const calculateEAN13Checksum = (barcode: string): number => {
    let sum = 0
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(barcode[i])
      sum += i % 2 === 0 ? digit : digit * 3
    }
    return (10 - (sum % 10)) % 10
  }

  const calculateUPCAChecksum = (barcode: string): number => {
    let sum = 0
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(barcode[i])
      sum += i % 2 === 0 ? digit * 3 : digit
    }
    return (10 - (sum % 10)) % 10
  }

  const generateRandomBarcode = () => {
    let generated = ''
    
    switch (selectedFormat) {
      case 'EAN13':
        // Generate 12 random digits
        const ean12 = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')
        const eanChecksum = calculateEAN13Checksum(ean12)
        generated = ean12 + eanChecksum
        break
        
      case 'EAN8':
        // Generate 7 random digits + checksum
        const ean7 = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
        let ean8Sum = 0
        for (let i = 0; i < 7; i++) {
          ean8Sum += parseInt(ean7[i]) * (i % 2 === 0 ? 3 : 1)
        }
        const ean8Checksum = (10 - (ean8Sum % 10)) % 10
        generated = ean7 + ean8Checksum
        break
        
      case 'UPC':
        // Generate 11 random digits
        const upc11 = Math.floor(Math.random() * 100000000000).toString().padStart(11, '0')
        const upcChecksum = calculateUPCAChecksum(upc11)
        generated = upc11 + upcChecksum
        break
        
      case 'CODE128':
        // Generate alphanumeric code
        if (productId) {
          generated = `PRD${productId.slice(0, 8).toUpperCase()}`
        } else {
          generated = `PRD${Date.now().toString().slice(-8)}`
        }
        break
        
      case 'CODE39':
        // Generate CODE39 compatible string
        const code39Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        generated = 'PROD'
        for (let i = 0; i < 6; i++) {
          generated += code39Chars[Math.floor(Math.random() * code39Chars.length)]
        }
        break
        
      default:
        generated = Date.now().toString()
    }
    
    setBarcodeValue(generated)
  }

  const handleValueChange = (value: string) => {
    setBarcodeValue(value.toUpperCase())
    const valid = validateBarcode(value.toUpperCase(), selectedFormat)
    setIsValid(valid)
  }

  const handleFormatChange = (format: string) => {
    setSelectedFormat(format)
    setBarcodeValue('')
    setIsValid(false)
    setGeneratedBarcode('')
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedBarcode)
    // Could add toast notification here
  }

  const downloadBarcode = () => {
    if (!canvasRef.current) return
    
    const link = document.createElement('a')
    link.download = `barcode_${generatedBarcode}.png`
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  const printBarcode = () => {
    if (!canvasRef.current || !printCanvasRef.current) return

    // Create larger barcode for printing
    JsBarcode(printCanvasRef.current, generatedBarcode, {
      format: selectedFormat,
      width: 3,
      height: 150,
      displayValue: true,
      fontSize: 18,
      margin: 20
    })

    // Create print content
    const printContent = `
      <html>
        <head>
          <title>Barcode: ${generatedBarcode}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              margin: 20px;
            }
            .barcode-container {
              border: 2px dashed #ccc;
              padding: 20px;
              margin: 20px auto;
              max-width: 400px;
            }
            .product-info {
              margin-bottom: 20px;
              font-size: 14px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            ${productName ? `<div class="product-info"><strong>${productName}</strong></div>` : ''}
            <img src="${printCanvasRef.current.toDataURL()}" alt="Barcode: ${generatedBarcode}" />
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
              ${selectedFormat} - ${generatedBarcode}
            </div>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleSaveBarcode = () => {
    if (generatedBarcode && onBarcodeGenerated) {
      onBarcodeGenerated(generatedBarcode)
      setIsOpen(false)
    }
  }

  const currentFormat = barcodeFormats.find(f => f.id === selectedFormat)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          Generate Barcode
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Barcode Generator
            {productName && <Badge variant="outline">{productName}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Barcode Format</Label>
              <Select value={selectedFormat} onValueChange={handleFormatChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {barcodeFormats.map(format => (
                    <SelectItem key={format.id} value={format.id}>
                      <div>
                        <div className="font-medium">{format.name}</div>
                        <div className="text-xs text-gray-500">{format.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={generateRandomBarcode} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Random
              </Button>
            </div>
          </div>

          {/* Current Format Info */}
          {currentFormat && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{currentFormat.name}:</strong> {currentFormat.description}
                <br />
                <span className="text-xs text-gray-600">Example: {currentFormat.example}</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Manual Entry */}
          <div>
            <Label htmlFor="barcode-value">Barcode Value</Label>
            <Input
              id="barcode-value"
              value={barcodeValue}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={currentFormat?.example}
              className={`mt-2 ${isValid ? 'border-green-500' : validationError ? 'border-red-500' : ''}`}
            />
            
            {validationError && (
              <p className="text-sm text-red-600 mt-1">{validationError}</p>
            )}
            
            {isValid && (
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Valid {currentFormat?.name} barcode
              </p>
            )}
          </div>

          {/* Generated Barcode Display */}
          {generatedBarcode && (
            <div className="space-y-4">
              <div className="border rounded-lg p-6 bg-white text-center">
                <canvas ref={canvasRef} />
                <div className="mt-2 text-sm text-gray-600">
                  {selectedFormat} - {generatedBarcode}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={copyToClipboard} className="flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Copy Code
                </Button>
                
                <Button variant="outline" onClick={downloadBarcode} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download PNG
                </Button>
                
                <Button variant="outline" onClick={printBarcode} className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Print Label
                </Button>

                {onBarcodeGenerated && (
                  <Button onClick={handleSaveBarcode} className="flex items-center gap-2 ml-auto">
                    <CheckCircle className="h-4 w-4" />
                    Use This Barcode
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Hidden canvas for printing */}
          <canvas ref={printCanvasRef} style={{ display: 'none' }} />
        </div>
      </DialogContent>
    </Dialog>
  )
}