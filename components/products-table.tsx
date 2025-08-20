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
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="hidden sm:table-cell">Price</TableHead>
              <TableHead className="hidden sm:table-cell">Quantity</TableHead>
              <TableHead className="hidden md:table-cell">Total Value</TableHead>
              <TableHead className="hidden md:table-cell">Barcode</TableHead>
              <TableHead className="hidden md:table-cell">Expiry</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatPrice(product.price)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <span className={isLowStock(product) ? "text-warning font-medium" : ""}>
                        {product.quantity.toLocaleString()}
                      </span>
                      {isLowStock(product) && <AlertTriangle className="h-4 w-4 text-warning" />}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatInventoryValue(product.price * product.quantity)}
                  </TableCell>
                  <TableCell className="font-mono text-sm hidden md:table-cell">{product.barcode}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {product.expiry_date ? (
                      <span className={isExpiringSoon(product) ? "text-destructive font-medium" : ""}>
                        {new Date(product.expiry_date).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex gap-1">
                      {isLowStock(product) && <Badge variant="warning">Low Stock</Badge>}
                      {isExpiringSoon(product) && <Badge variant="destructive">Expiring</Badge>}
                      {!isLowStock(product) && !isExpiringSoon(product) && <Badge variant="success">Good</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setPrintingProduct(product)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingProduct(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        className="text-destructive hover:text-destructive/90"
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
