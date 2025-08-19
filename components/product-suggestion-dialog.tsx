"use client"

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Package, Barcode, ShoppingCart } from "lucide-react"
import type { ProductUI } from "./pos-interface"

interface ProductSuggestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchTerm: string
  suggestions: ProductUI[]
  onSelectProduct: (product: ProductUI) => void
  onSearchChange: (search: string) => void
}

export default function ProductSuggestionDialog({
  open,
  onOpenChange,
  searchTerm,
  suggestions,
  onSelectProduct,
  onSearchChange
}: ProductSuggestionDialogProps) {
  
  const formatPrice = (amount: number, currency: string = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleProductSelect = (product: ProductUI) => {
    onSelectProduct(product)
    onOpenChange(false)
  }

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Out of Stock', color: 'destructive' }
    if (quantity <= 5) return { label: 'Low Stock', color: 'warning' }
    return { label: 'In Stock', color: 'success' }
  }

  const highlightMatch = (text: string, search: string) => {
    if (!search) return text
    
    const parts = text.split(new RegExp(`(${search})`, 'gi'))
    return parts.map((part, index) => 
      part.toLowerCase() === search.toLowerCase() 
        ? <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark>
        : part
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Product Not Found - Suggestions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Search Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <Barcode className="h-4 w-4" />
              <span className="text-sm">
                Barcode "<span className="font-mono font-bold">{searchTerm}</span>" not found in database
              </span>
            </div>
          </div>

          {/* Enhanced Search */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, category, or barcode..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            
            <div className="text-sm text-gray-600">
              Found {suggestions.length} similar products
            </div>
          </div>

          {/* Suggestions List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-96">
            {suggestions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm">Try a different search term or check the barcode</p>
              </div>
            ) : (
              suggestions.map((product) => {
                const stockStatus = getStockStatus(product.quantity)
                
                return (
                  <div
                    key={product.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-lg">
                            {highlightMatch(product.name, searchTerm)}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Barcode className="h-3 w-3" />
                              <span className="font-mono">{product.barcode}</span>
                            </span>
                            
                            <Badge 
                              variant={stockStatus.color === 'destructive' ? 'destructive' : 'outline'}
                              className={`text-xs ${
                                stockStatus.color === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                stockStatus.color === 'success' ? 'bg-green-100 text-green-800 border-green-300' : ''
                              }`}
                            >
                              {stockStatus.label}
                            </Badge>
                          </div>
                          
                          <div>Stock: {product.quantity} units available</div>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          {formatPrice(product.price, 'KES')}
                        </div>
                        
                        <Button 
                          size="sm" 
                          className="w-full"
                          disabled={product.quantity === 0}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      </div>
                    </div>

                    {/* Relevance indicators */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex gap-2 text-xs">
                        {product.name.toLowerCase().includes(searchTerm.toLowerCase()) && (
                          <Badge variant="secondary" className="text-xs">Name Match</Badge>
                        )}
                        {product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()) && (
                          <Badge variant="secondary" className="text-xs">Category Match</Badge>
                        )}
                        {product.barcode && product.barcode.includes(searchTerm) && (
                          <Badge variant="secondary" className="text-xs">Barcode Similar</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onSearchChange('')}
              className="flex-1"
            >
              Clear & Search Again
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}