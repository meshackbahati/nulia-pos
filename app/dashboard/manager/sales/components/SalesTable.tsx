'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { formatCurrency } from '@/lib/utils';

interface Sale {
  id: string;
  invoice_number: string;
  customer_name?: string | null;
  total_amount: number;
  payment_status: 'pending' | 'completed' | 'refunded' | 'partially_refunded';
  status: 'draft' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface SalesTableProps {
  sales: Sale[];
  showPagination?: boolean;
  pageSize?: number;
}

const paymentStatusMap = {
  pending: 'Pending',
  completed: 'Paid',
  refunded: 'Refunded',
  partially_refunded: 'Partial Refund',
};

const statusMap = {
  draft: 'Draft',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusVariantMap = {
  draft: 'outline',
  completed: 'default',
  cancelled: 'destructive',
} as const;

const paymentStatusVariantMap = {
  pending: 'outline',
  completed: 'success',
  refunded: 'destructive',
  partially_refunded: 'warning',
} as const;

export function SalesTable({ sales = [], showPagination = false, pageSize = 5 }: SalesTableProps) {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Toggle row selection
  const toggleRow = (saleId: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(saleId)) {
      newSelection.delete(saleId);
    } else {
      newSelection.add(saleId);
    }
    setSelectedRows(newSelection);
  };
  
  // Toggle all rows
  const toggleAllRows = () => {
    if (selectedRows.size === sales.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sales.map(sale => sale.id)));
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPp');
  };
  
  // Handle view action
  const handleView = (saleId: string) => {
    router.push(`/dashboard/manager/sales/${saleId}`);
  };
  
  // Handle print action
  const handlePrint = (saleId: string) => {
    window.open(`/dashboard/manager/sales/${saleId}/receipt`, '_blank');
  };
  
  // Handle refund action
  const handleRefund = (saleId: string) => {
    // Implementation for refund would go here
    console.log('Processing refund for sale:', saleId);
  };
  
  // If no sales, show empty state
  if (sales.length === 0) {
    return (
      <div className="text-center py-12">
        <Icons.receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No sales found</h3>
        <p className="text-muted-foreground">
          {showPagination ? 'Try adjusting your filters' : 'Sales will appear here when they are created'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={selectedRows.size === sales.length && sales.length > 0}
                  onCheckedChange={toggleAllRows}
                  aria-label="Select all"
                  className="translate-y-0.5"
                />
              </TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id} className="group">
                <TableCell>
                  <Checkbox
                    checked={selectedRows.has(sale.id)}
                    onCheckedChange={() => toggleRow(sale.id)}
                    aria-label="Select row"
                    className="translate-y-0.5"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <button 
                    onClick={() => handleView(sale.id)}
                    className="text-primary hover:underline hover:text-primary/80 transition-colors"
                  >
                    {sale.invoice_number || `#${sale.id.slice(0, 8)}`}
                  </button>
                </TableCell>
                <TableCell>{formatDate(sale.created_at)}</TableCell>
                <TableCell>{sale.customer_name || 'Walk-in Customer'}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(sale.total_amount, 'UGX')}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariantMap[sale.status] || 'outline'}>
                    {statusMap[sale.status] || sale.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={paymentStatusVariantMap[sale.payment_status] || 'outline'}>
                    {paymentStatusMap[sale.payment_status] || sale.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleView(sale.id)}>
                        <Icons.eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrint(sale.id)}>
                        <Icons.printer className="mr-2 h-4 w-4" />
                        Print Receipt
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {sale.status === 'completed' && sale.payment_status !== 'refunded' && (
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleRefund(sale.id)}
                        >
                          <Icons.undo className="mr-2 h-4 w-4" />
                          Process Refund
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {showPagination && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {selectedRows.size} of {sales.length} row(s) selected.
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled={true}>
              <Icons.chevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={sales.length < pageSize}>
              Next
              <Icons.chevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
