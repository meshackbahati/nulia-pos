import nodemailer from 'nodemailer';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface ReceiptEmailData {
  customerEmail: string;
  receiptId: string;
  branchName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  date: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SENDER_EMAIL,
        pass: process.env.***REMOVED***,
      },
    });
  }

  public async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      const mailOptions = {
        from: {
          name: process.env.BREVO_SENDER_NAME || 'RetailPro POS',
          address: process.env.BREVO_SENDER_EMAIL!,
        },
        to: template.to,
        subject: template.subject,
        html: template.html,
        attachments: template.attachments,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  public async sendReceiptEmail(data: ReceiptEmailData): Promise<boolean> {
    const html = this.generateReceiptHTML(data);
    
    return this.sendEmail({
      to: data.customerEmail,
      subject: `Receipt #${data.receiptId} - ${data.branchName}`,
      html,
    });
  }

  public async sendLowStockAlert(
    managerEmail: string,
    branchName: string,
    lowStockItems: Array<{ name: string; currentStock: number; minLevel: number }>
  ): Promise<boolean> {
    const html = this.generateLowStockAlertHTML(branchName, lowStockItems);
    
    return this.sendEmail({
      to: managerEmail,
      subject: `Low Stock Alert - ${branchName}`,
      html,
    });
  }

  public async sendDailyReport(
    managerEmail: string,
    branchName: string,
    reportData: {
      date: string;
      totalSales: number;
      totalRevenue: number;
      topProducts: Array<{ name: string; quantity: number; revenue: number }>;
    }
  ): Promise<boolean> {
    const html = this.generateDailyReportHTML(branchName, reportData);
    
    return this.sendEmail({
      to: managerEmail,
      subject: `Daily Report - ${branchName} - ${reportData.date}`,
      html,
    });
  }

  private generateReceiptHTML(data: ReceiptEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt #${data.receiptId}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .receipt-info { margin-bottom: 20px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th, .items-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .items-table th { background-color: #f5f5f5; }
          .totals { text-align: right; }
          .total-row { font-weight: bold; font-size: 1.2em; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.branchName}</h1>
          <p>Receipt #${data.receiptId}</p>
          <p>${data.date}</p>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${data.branchName.includes('KES') ? 'KES' : '$'} ${item.price.toFixed(2)}</td>
                <td>${data.branchName.includes('KES') ? 'KES' : '$'} ${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <p>Subtotal: ${data.branchName.includes('KES') ? 'KES' : '$'} ${data.subtotal.toFixed(2)}</p>
          <p>Tax: ${data.branchName.includes('KES') ? 'KES' : '$'} ${data.tax.toFixed(2)}</p>
          <p class="total-row">Total: ${data.branchName.includes('KES') ? 'KES' : '$'} ${data.total.toFixed(2)}</p>
          <p>Payment Method: ${data.paymentMethod.toUpperCase()}</p>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Powered by RetailPro POS</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateLowStockAlertHTML(branchName: string, items: Array<{ name: string; currentStock: number; minLevel: number }>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Low Stock Alert - ${branchName}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table th, .items-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .items-table th { background-color: #f5f5f5; }
          .low-stock { color: #d63031; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="alert">
          <h2>⚠️ Low Stock Alert</h2>
          <p><strong>Branch:</strong> ${branchName}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p>The following items are running low on stock:</p>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Current Stock</th>
              <th>Minimum Level</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="low-stock">${item.currentStock}</td>
                <td>${item.minLevel}</td>
                <td class="low-stock">RESTOCK NEEDED</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <p><strong>Action Required:</strong> Please restock these items to maintain adequate inventory levels.</p>
        
        <div style="margin-top: 30px; text-align: center; color: #666;">
          <p>Powered by RetailPro POS</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateDailyReportHTML(branchName: string, data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Daily Report - ${branchName}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
          .stat-box { text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
          .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table th, .items-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .items-table th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Daily Sales Report</h1>
          <p><strong>${branchName}</strong></p>
          <p>${data.date}</p>
        </div>
        
        <div class="stats">
          <div class="stat-box">
            <div class="stat-number">${data.totalSales}</div>
            <div>Total Sales</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">$${data.totalRevenue.toFixed(2)}</div>
            <div>Total Revenue</div>
          </div>
        </div>
        
        <h3>Top Selling Products</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${data.topProducts.map((product: any) => `
              <tr>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>$${product.revenue.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; text-align: center; color: #666;">
          <p>Powered by RetailPro POS</p>
        </div>
      </body>
      </html>
    `;
  }
}

export default EmailService;