"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, AlertTriangle, Printer } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import EditProductDialog from "@/components/edit-product-dialog"
import BarcodeDisplay from "@/components/barcode-display"
import { deleteProduct } from "@/lib/product-actions"
import { formatPrice, formatInventoryValue } from "@/lib/utils/currency"

interface Product {
  id: string
  name: string
  category: string
  price: number
  quantity: number
  barcode: string
  expiry_date: string
  low_stock_threshold: number
}

interface ProductsTableProps {
  products: Product[]
}

export default function ProductsTable({ products }: ProductsTableProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [printingProduct, setPrintingProduct] = useState<Product | null>(null)

  const handleDelete = async (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await deleteProduct(productId)
      window.location.reload()
    }
  }

  const isLowStock = (product: Product) => product.quantity <= product.low_stock_threshold
  const isExpiringSoon = (product: Product) => {
    if (!product.expiry_date) return false
    const expiryDate = new Date(product.expiry_date)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.category}</Badge>
                  </TableCell>
                  <TableCell>{formatPrice(product.price)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={isLowStock(product) ? "text-orange-600 font-medium" : ""}>
                        {product.quantity.toLocaleString()}
                      </span>
                      {isLowStock(product) && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatInventoryValue(product.price * product.quantity)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.barcode}</TableCell>
                  <TableCell>
                    {product.expiry_date ? (
                      <span className={isExpiringSoon(product) ? "text-red-600 font-medium" : ""}>
                        {new Date(product.expiry_date).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {isLowStock(product) && <Badge variant="destructive">Low Stock</Badge>}
                      {isExpiringSoon(product) && <Badge variant="destructive">Expiring</Badge>}
                      {!isLowStock(product) && !isExpiringSoon(product) && <Badge variant="default">Good</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPrintingProduct(product)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingProduct(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Product Dialog */}
      <EditProductDialog
        product={editingProduct}
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
      />

      {/* Print Barcode Dialog */}
      <Dialog open={!!printingProduct} onOpenChange={(open) => !open && setPrintingProduct(null)}>
        <DialogContent className="max-w-4xl">
          {printingProduct && <BarcodeDisplay product={printingProduct} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
