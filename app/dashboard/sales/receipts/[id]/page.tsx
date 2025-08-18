import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { formatCurrency } from '@/lib/utils';

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: sale, error } = await supabase
    .from('sales')
    .select(`
      *,
      items: sale_items(
        product_id,
        product_name,
        quantity,
        unit_price,
        total_price
      ),
      cashier:profiles!sales_cashier_id_fkey(
        full_name
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !sale) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <Icons.receiptX className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Receipt Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The requested receipt could not be found or you don't have permission to view it.
        </p>
        <Button onClick={() => window.history.back()}>
          <Icons.arrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  // Format date and time
  const saleDate = new Date(sale.created_at);
  const formattedDate = format(saleDate, 'PPP');
  const formattedTime = format(saleDate, 'p');

  // Calculate change if payment was made with cash
  const change = sale.payment_method === 'cash' && sale.amount_tendered
    ? sale.amount_tendered - sale.total
    : 0;

  // Print receipt when component mounts
  const printReceipt = `
    window.onload = function() {
      window.print();
      // Return to POS after a short delay if opened in a new tab
      setTimeout(() => {
        if (window.opener) {
          window.close();
        }
      }, 1000);
    };
  `;

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            color: #000;
            background: #fff;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
          .receipt {
            width: 80mm;
            margin: 0 auto;
            padding: 10px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          .items-table th, .items-table td {
            padding: 3px 0;
            text-align: left;
            border-bottom: 1px dashed #ddd;
          }
          .items-table th:last-child, .items-table td:last-child {
            text-align: right;
          }
          .text-right {
            text-align: right;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .text-center {
            text-align: center;
          }
          .text-uppercase {
            text-transform: uppercase;
          }
          .text-bold {
            font-weight: bold;
          }
          .mt-2 {
            margin-top: 8px;
          }
          .mt-4 {
            margin-top: 16px;
          }
          .py-2 {
            padding-top: 8px;
            padding-bottom: 8px;
          }
        }
      `}</style>
      
      <div className="no-print flex justify-between items-center p-4 border-b">
        <h1 className="text-xl font-semibold">Receipt #{sale.invoice_number}</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Icons.printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.close()}>
            <Icons.x className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>
      </div>
      
      <div className="p-4 max-w-md mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold">BORDER SHOP</h2>
            <p className="text-sm text-gray-600">123 Main Street, City</p>
            <p className="text-sm text-gray-600">Phone: +256 700 123456</p>
          </div>
          
          <div className="text-center text-sm mb-4">
            <p>TAX INVOICE</p>
            <p className="text-gray-600">{sale.invoice_number}</p>
          </div>
          
          <div className="flex justify-between text-sm mb-4">
            <div>
              <p className="font-semibold">Date:</p>
              <p>{formattedDate}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">Time:</p>
              <p>{formattedTime}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="font-semibold">Cashier:</p>
            <p>{sale.cashier?.full_name || 'System'}</p>
          </div>
          
          <div className="border-t border-b border-gray-200 py-2 my-4">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-semibold">
                  <th className="pb-1">Item</th>
                  <th className="text-right pb-1">Qty</th>
                  <th className="text-right pb-1">Price</th>
                  <th className="text-right pb-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item: any) => (
                  <tr key={item.product_id} className="text-sm">
                    <td className="py-1">{item.product_name}</td>
                    <td className="text-right py-1">{item.quantity}</td>
                    <td className="text-right py-1">{formatCurrency(item.unit_price, 'UGX')}</td>
                    <td className="text-right py-1">{formatCurrency(item.total_price, 'UGX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="text-right space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal, 'UGX')}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (18%):</span>
              <span>{formatCurrency(sale.tax_amount, 'UGX')}</span>
            </div>
            {sale.discount_amount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount_amount, 'UGX')}</span>
              </div>
            )}
            <div className="border-t border-gray-200 mt-2 pt-2 font-bold">
              <div className="flex justify-between">
                <span>TOTAL:</span>
                <span>{formatCurrency(sale.total, 'UGX')}</span>
              </div>
            </div>
            
            {sale.payment_method === 'cash' && (
              <>
                <div className="flex justify-between mt-2">
                  <span>Cash:</span>
                  <span>{formatCurrency(sale.amount_tendered || sale.total, 'UGX')}</span>
                </div>
                {change > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Change:</span>
                    <span>{formatCurrency(change, 'UGX')}</span>
                  </div>
                )}
              </>
            )}
            
            {sale.payment_method === 'card' && (
              <div className="mt-2">
                <div className="flex justify-between">
                  <span>Paid with:</span>
                  <span>Card</span>
                </div>
                {sale.transaction_id && (
                  <div className="text-xs text-gray-500 text-right">
                    Ref: {sale.transaction_id}
                  </div>
                )}
              </div>
            )}
            
            {sale.payment_method === 'mobile_money' && (
              <div className="mt-2">
                <div className="flex justify-between">
                  <span>Paid with:</span>
                  <span>Mobile Money</span>
                </div>
                {sale.transaction_id && (
                  <div className="text-xs text-gray-500 text-right">
                    Ref: {sale.transaction_id}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-600">
            <p>Thank you for shopping with us!</p>
            <p className="mt-1">Goods sold are not returnable</p>
            <p className="mt-2">For inquiries: +256 700 123456</p>
            <p className="mt-4 text-[10px]">
              {sale.id}
            </p>
          </div>
        </div>
      </div>
      
      <script dangerouslySetInnerHTML={{ __html: printReceipt }} />
    </>
  );
}
