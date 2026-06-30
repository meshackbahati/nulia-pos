import nodemailer from 'nodemailer';
import models from '../models/index.js';

class EmailService {
  async getTransporter() {
    if (process.env.ENABLE_EMAILING === 'false') {
      return {
        transporter: null,
        senderEmail: null,
        senderName: null
      };
    }
    try {
      const apiKeySetting = await models.Setting.findOne({ where: { category: 'brevo', key: 'apiKey' } });
      const senderEmailSetting = await models.Setting.findOne({ where: { category: 'brevo', key: 'senderEmail' } });

      const apiKey = apiKeySetting ? apiKeySetting.getDecryptedValue() : process.env.***REMOVED***;
      const senderEmail = senderEmailSetting ? senderEmailSetting.value : process.env.BREVO_SENDER_EMAIL;

      return {
        transporter: nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          auth: {
            user: senderEmail,
            pass: apiKey,
          },
        }),
        senderEmail,
        senderName: (await models.Setting.findOne({ where: { category: 'brevo', key: 'senderName' } }))?.value || process.env.BREVO_SENDER_NAME || 'BorderShop POS'
      };
    } catch (error) {
      console.error('Failed to initialize email transporter from DB:', error);
      // Fallback to env
      return {
        transporter: nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.BREVO_SENDER_EMAIL,
            pass: process.env.***REMOVED***,
          },
        }),
        senderEmail: process.env.BREVO_SENDER_EMAIL,
        senderName: process.env.BREVO_SENDER_NAME || 'BorderShop POS'
      };
    }
  }

  async sendEmail(template) {
    if (process.env.ENABLE_EMAILING === 'false') {
      console.log('[EmailService] Emailing is disabled via ENABLE_EMAILING env var.');
      return false;
    }
    try {
      const { transporter, senderEmail, senderName } = await this.getTransporter();

      if (!transporter) {
        console.error('[EmailService] Transporter not available (possibly disabled).');
        return false;
      }

      const mailOptions = {
        from: {
          name: senderName,
          address: senderEmail,
        },
        to: template.to,
        subject: template.subject,
        html: template.html,
        attachments: template.attachments,
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendReceiptEmail(data) {
    const html = this.generateReceiptHTML(data);

    return this.sendEmail({
      to: data.customerEmail,
      subject: `Receipt #${data.receiptId} - ${data.branchName}`,
      html,
    });
  }

  async sendLowStockAlert(managerEmail, branchName, lowStockItems) {
    const html = this.generateLowStockAlertHTML(branchName, lowStockItems);

    return this.sendEmail({
      to: managerEmail,
      subject: `Low Stock Alert - ${branchName}`,
      html,
    });
  }

  async sendOutOfStockAlert(managerEmail, branchName, items) {
    const html = this.generateOutOfStockAlertHTML(branchName, items);

    return this.sendEmail({
      to: managerEmail,
      subject: `OUT OF STOCK Alert - ${branchName}`,
      html,
    });
  }

  async sendDailyReport(managerEmail, branchName, reportData) {
    const html = this.generateDailyReportHTML(branchName, reportData);

    return this.sendEmail({
      to: managerEmail,
      subject: `Daily Report - ${branchName} - ${reportData.date}`,
      html,
    });
  }

  async sendSupportEmail(to, subject, html) {
    return this.sendEmail({
      to,
      subject,
      html,
    });
  }

  async sendHostingInvoice(recipientEmail, amount, invoiceData, attachmentPath) {
    const html = this.generateHostingInvoiceHTML({
      amount,
      ...invoiceData
    });

    return this.sendEmail({
      to: recipientEmail,
      subject: `RetailPro Hosting Invoice - ${invoiceData.month}`,
      html,
      attachments: attachmentPath ? [{
        filename: `Hosting_Invoice_${invoiceData.month.replace(/\s+/g, '_')}.pdf`,
        path: attachmentPath
      }] : []
    });
  }

  generateReceiptHTML(data) {
    const currency = data.transactionCurrency || (data.branchName.includes('KES') ? 'KES' : 'USD');
    const symbol = data.transactionCurrencySymbol || currency;
    const format = (amt) => {
        const separator = symbol.length > 1 ? ' ' : '';
        return `${symbol}${separator}${amt.toFixed(2)}`;
    };

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
                <td>${format(item.price)}</td>
                <td>${format(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <p>Subtotal: ${format(data.subtotal)}</p>
          <p>Tax: ${format(data.tax)}</p>
          <p class="total-row">Total: ${format(data.total)}</p>
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

  generateLowStockAlertHTML(branchName, items) {
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

  generateOutOfStockAlertHTML(branchName, items) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>OUT OF STOCK Alert - ${branchName}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table th, .items-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .items-table th { background-color: #f8d7da; }
          .out-of-stock { color: #721c24; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="alert">
          <h2>🚨 OUT OF STOCK Alert</h2>
          <p><strong>Branch:</strong> ${branchName}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p>The following items are completely OUT OF STOCK:</p>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Current Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="out-of-stock">0</td>
                <td class="out-of-stock">OUT OF STOCK</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <p><strong>Action Required:</strong> Immediate restocking is required to avoid lost sales.</p>
        
        <div style="margin-top: 30px; text-align: center; color: #666;">
          <p>Powered by RetailPro POS</p>
        </div>
      </body>
      </html>
    `;
  }

  generateDailyReportHTML(branchName, data) {
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
            <div class="stat-number">${data.totalRevenue.toFixed(2)}</div>
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
            ${data.topProducts.map((product) => `
              <tr>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>${product.revenue.toFixed(2)}</td>
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

  generateHostingInvoiceHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Hosting Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .invoice-details { margin-bottom: 30px; }
          .amount-box { background-color: #f8f9fa; border: 1px solid #e5e7eb; padding: 20px; text-align: center; margin-bottom: 30px; border-radius: 8px; }
          .amount { font-size: 24px; font-weight: bold; color: #3b82f6; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RetailPro Hosting</h1>
          <p>Monthly Platform Hosting Invoice</p>
        </div>

        <div class="invoice-details">
          <p><strong>Invoice Period:</strong> ${data.month}</p>
          <p><strong>Recipient:</strong> ${data.recipientName || 'Valued Customer'}</p>
        </div>

        <div class="amount-box">
          <p>Total Amount Due:</p>
          <div class="amount">$${data.amount.toFixed(2)}</div>
        </div>

        <p>Please find the detailed invoice attached as a PDF.</p>
        <p>Payment should be made via the usual platform channels.</p>

        <div class="footer">
          <p>Thank you for choosing RetailPro!</p>
          <p>If you have any questions, please contact support.</p>
        </div>
      </body>
      </html>
    `;
  }
}

export default new EmailService();
