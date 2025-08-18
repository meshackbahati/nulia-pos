import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { formatCurrency } from '@/lib/utils/currency';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ReceiptOptions {
  orderId: string;
  sendEmail?: boolean;
  sendSms?: boolean;
  email?: string;
  phoneNumber?: string;
}

export async function generateAndSendReceipt({
  orderId,
  sendEmail = false,
  sendSms = false,
  email,
  phoneNumber,
}: ReceiptOptions) {
  const supabase = createClient();
  
  try {
    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product:products(*)
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Generate receipt HTML
    const receiptHtml = generateReceiptHtml(order);
    const receiptText = generateReceiptText(order);
    const receiptPdf = await generatePdf(receiptHtml);

    // Save receipt to storage
    const receiptPath = `receipts/order_${order.order_number}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(receiptPath, receiptPdf, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading receipt:', uploadError);
    }

    // Send email if requested and email is provided
    if (sendEmail && email) {
      await sendReceiptEmail(email, {
        orderNumber: order.order_number,
        receiptHtml,
        receiptPdf,
        customerName: order.customer_name || 'Valued Customer',
      });
    }

    // Send SMS if requested and phone number is provided
    if (sendSms && phoneNumber) {
      await sendReceiptSms(phoneNumber, {
        orderNumber: order.order_number,
        amount: order.total_amount,
      });
    }

    // Update order with receipt path
    await supabase
      .from('orders')
      .update({ receipt_url: receiptPath })
      .eq('id', orderId);

    return {
      success: true,
      receiptPath,
    };
  } catch (error) {
    console.error('Error generating receipt:', error);
    throw error;
  }
}

async function generatePdf(html: string): Promise<Blob> {
  // In a real implementation, you would use a PDF generation service
  // For example: Puppeteer, PDFKit, or a third-party service
  // This is a placeholder implementation
  const response = await fetch('https://api.pdfgenerator.com/v1/documents/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PDF_GENERATOR_API_KEY}`,
    },
    body: JSON.stringify({
      template: {
        html,
        engine: 'handlebars',
      },
      format: 'pdf',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate PDF');
  }

  return await response.blob();
}

async function sendReceiptEmail(
  email: string,
  data: {
    orderNumber: string;
    receiptHtml: string;
    receiptPdf: Blob;
    customerName: string;
  }
) {
  try {
    await resend.emails.send({
      from: 'Bordershop <receipts@bordershop.com>',
      to: email,
      subject: `Your Order #${data.orderNumber} - Receipt`,
      html: data.receiptHtml,
      attachments: [
        {
          filename: `receipt-${data.orderNumber}.pdf`,
          content: Buffer.from(await data.receiptPdf.arrayBuffer()),
        },
      ],
    });
  } catch (error) {
    console.error('Error sending receipt email:', error);
    throw error;
  }
}

async function sendReceiptSms(
  phoneNumber: string,
  data: {
    orderNumber: string;
    amount: number;
  }
) {
  // In a real implementation, integrate with an SMS gateway like Twilio, Africa's Talking, etc.
  console.log(`SMS sent to ${phoneNumber}: Thank you for your order #${data.orderNumber}. Amount: KES ${formatCurrency(data.amount)}`);
  // Actual implementation would go here
}

function generateReceiptHtml(order: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt #${order.order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .receipt-info { margin-bottom: 20px; }
          .items { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .items th { background-color: #f5f5f5; }
          .total { font-weight: bold; text-align: right; margin-top: 20px; font-size: 1.2em; }
          .footer { margin-top: 40px; text-align: center; font-size: 0.9em; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Bordershop</h1>
          <p>Order Receipt</p>
        </div>
        
        <div class="receipt-info">
          <p><strong>Order #:</strong> ${order.order_number}</p>
          <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
          <p><strong>Customer:</strong> ${order.customer_name || 'Walk-in Customer'}</p>
        </div>
        
        <table class="items">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.order_items.map((item: any) => `
              <tr>
                <td>${item.product?.name || item.name}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${formatCurrency(item.price * item.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          <p>Total: ${formatCurrency(order.total_amount)}</p>
          <p>Payment Method: ${order.payment_method}</p>
          ${order.payment_reference ? `<p>Reference: ${order.payment_reference}</p>` : ''}
        </div>
        
        <div class="footer">
          <p>Thank you for shopping with Bordershop!</p>
          <p>For any inquiries, please contact support@bordershop.com</p>
        </div>
      </body>
    </html>
  `;
}

function generateReceiptText(order: any): string {
  let receipt = `BORDERSHOP - ORDER RECEIPT
`;
  receipt += `Order #: ${order.order_number}
`;
  receipt += `Date: ${new Date(order.created_at).toLocaleString()}
`;
  receipt += `Customer: ${order.customer_name || 'Walk-in Customer'}

`;
  receipt += `ITEMS:
`;
  receipt += `${'Item'.padEnd(30)} ${'Qty'.padEnd(5)} ${'Price'.padStart(10)} ${'Total'.padStart(12)}\n`;
  receipt += `${'-'.repeat(60)}\n`;
  
  order.order_items.forEach((item: any) => {
    receipt += `${(item.product?.name || item.name).substring(0, 29).padEnd(30)} `;
    receipt += `${item.quantity.toString().padEnd(5)} `;
    receipt += `${formatCurrency(item.price).padStart(10)} `;
    receipt += `${formatCurrency(item.price * item.quantity).padStart(12)}\n`;
  });
  
  receipt += `\nTOTAL: ${formatCurrency(order.total_amount).padStart(48)}\n`;
  receipt += `Payment Method: ${order.payment_method}\n`;
  if (order.payment_reference) {
    receipt += `Reference: ${order.payment_reference}\n`;
  }
  
  receipt += `\nThank you for shopping with Bordershop!\n`;
  receipt += `For any inquiries, please contact support@bordershop.com\n`;
  
  return receipt;
}
