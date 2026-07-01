import fs from 'fs';
import models from '../models/index.js';
import { sendEmail as brevoSendEmail } from './brevo.js';

class EmailService {
  async getApiConfig() {
    if (process.env.ENABLE_EMAILING === 'false') {
      return { apiKey: null, senderEmail: null, senderName: null };
    }
    try {
      const apiKeySetting = await models.Setting.findOne({ where: { category: 'brevo', key: 'apiKey' } });
      const senderEmailSetting = await models.Setting.findOne({ where: { category: 'brevo', key: 'senderEmail' } });
      const senderNameSetting = await models.Setting.findOne({ where: { category: 'brevo', key: 'senderName' } });

      let apiKey = apiKeySetting ? apiKeySetting.getDecryptedValue() : null;
      if (!apiKey || apiKey === '[DECRYPTION_ERROR]') {
        apiKey = process.env.***REMOVED***;
        console.log('[EmailService] Using ***REMOVED*** from environment.');
      } else {
        console.log('[EmailService] Using ***REMOVED*** from database.');
      }

      let senderEmail = senderEmailSetting ? senderEmailSetting.value : null;
      if (!senderEmail) {
        senderEmail = process.env.BREVO_SENDER_EMAIL;
      }

      let senderName = senderNameSetting ? senderNameSetting.value : null;
      if (!senderName) {
        senderName = process.env.BREVO_SENDER_NAME || 'BorderShop POS';
      }

      return { apiKey, senderEmail, senderName };
    } catch (error) {
      console.error('[EmailService] Error reading config:', error);
      return {
        apiKey: process.env.***REMOVED***,
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
      const { apiKey, senderEmail, senderName } = await this.getApiConfig();

      if (!apiKey || !senderEmail) {
        console.error('[EmailService] Missing API key or sender email.');
        return false;
      }

      let attachments;
      if (template.attachments && template.attachments.length > 0) {
        attachments = await Promise.all(template.attachments.map(async (a) => {
          if (a.path) {
            const content = await fs.promises.readFile(a.path);
            return { filename: a.filename, content };
          }
          return a;
        }));
      }

      return await brevoSendEmail({
        apiKey,
        senderName,
        senderEmail,
        to: template.to,
        subject: template.subject,
        htmlContent: template.html,
        attachments,
      });
    } catch (error) {
      console.error('[EmailService] Error sending email:', {
        to: template.to,
        subject: template.subject,
        message: error.message
      });
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

  async sendNewProductAlert(recipients, branchName, productName) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Product Added</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #22c55e; padding-bottom: 20px; margin-bottom: 20px; }
          .badge { display: inline-block; background: #22c55e; color: #fff; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
          .detail { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="badge">NEW PRODUCT</div>
          <h2>${productName}</h2>
          <p>has been added to <strong>${branchName}</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated alert. No action required.</p>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({
      to: recipients,
      subject: `New Product Added - ${productName} - ${branchName}`,
      html,
    });
  }

  async sendProductRemovedAlert(recipients, branchName, productName) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Product Removed</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 20px; margin-bottom: 20px; }
          .badge { display: inline-block; background: #ef4444; color: #fff; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
          .detail { background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="badge">PRODUCT REMOVED</div>
          <h2>${productName}</h2>
          <p>has been deactivated in <strong>${branchName}</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated alert. No action required.</p>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({
      to: recipients,
      subject: `Product Removed - ${productName} - ${branchName}`,
      html,
    });
  }

  async sendStockAlert(recipients, branchName, itemName, type, available, minLevel) {
    const isOutOfStock = type === 'out_of_stock';
    const color = isOutOfStock ? '#ef4444' : '#f59e0b';
    const bgColor = isOutOfStock ? '#fef2f2' : '#fffbeb';
    const borderColor = isOutOfStock ? '#fecaca' : '#fde68a';
    const badge = isOutOfStock ? 'OUT OF STOCK' : 'LOW STOCK';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${badge} Alert</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid ${color}; padding-bottom: 20px; margin-bottom: 20px; }
          .badge { display: inline-block; background: ${color}; color: #fff; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
          .detail { background: ${bgColor}; border: 1px solid ${borderColor}; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="badge">${badge}</div>
          <h2>${itemName}</h2>
          <p>in <strong>${branchName}</strong></p>
        </div>
        <div class="detail">
          <p><strong>Current Stock:</strong> ${isOutOfStock ? '0' : available}</p>
          ${!isOutOfStock && minLevel ? `<p><strong>Minimum Level:</strong> ${minLevel}</p>` : ''}
        </div>
        <p>Please review inventory and restock as needed.</p>
        <div class="footer">
          <p>This is an automated real-time stock alert.</p>
        </div>
      </body>
      </html>
    `;
    return this.sendEmail({
      to: recipients,
      subject: `${badge} - ${itemName} - ${branchName}`,
      html,
    });
  }

  async sendWeeklySummary(recipients, branchName, reportData) {
    const html = this.generateWeeklySummaryHTML(branchName, reportData);
    return this.sendEmail({
      to: recipients,
      subject: `Weekly Summary Report - ${branchName} - ${reportData.weekLabel}`,
      html,
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
    const servicesRows = (data.services || []).map(s =>
      `<tr><td>${s.name}</td><td style="text-align:right;font-weight:500;">$${s.amount.toFixed(2)}</td></tr>`
    ).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Hosting Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .invoice-details { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f3f4f6; font-weight: 600; }
          .total-row td { border-top: 2px solid #333; font-weight: bold; font-size: 16px; }
          .amount-box { background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 16px; text-align: center; margin-bottom: 20px; border-radius: 8px; }
          .amount { font-size: 24px; font-weight: bold; color: #059669; }
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
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        ${servicesRows ? `
        <h3 style="margin-bottom:8px;">Service Breakdown</h3>
        <table>
          <thead><tr><th>Service</th><th style="text-align:right;">Amount</th></tr></thead>
          <tbody>
            ${servicesRows}
            <tr class="total-row"><td>Total</td><td style="text-align:right;">$${data.amount.toFixed(2)}</td></tr>
          </tbody>
        </table>` : ''}

        <div class="amount-box">
          <p style="margin:0;">Total Amount Due:</p>
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

  generateWeeklySummaryHTML(branchName, data) {
    const outOfStockRows = (data.outOfStockItems || []).map(item =>
      `<tr><td>${item.name}</td><td style="color:#ef4444;font-weight:bold;">Out of Stock</td></tr>`
    ).join('');

    const lowStockRows = (data.lowStockItems || []).map(item =>
      `<tr><td>${item.name}</td><td style="color:#f59e0b;">${item.currentStock} / ${item.minLevel}</td></tr>`
    ).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Weekly Summary - ${branchName}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px; }
          h2 { color: #1f2937; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f3f4f6; font-weight: 600; }
          .summary-card { background: #f0f9ff; border: 1px solid #bae6fd; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
          .sales-total { font-size: 24px; font-weight: bold; color: #059669; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .section-title { font-size: 16px; font-weight: bold; margin-top: 24px; margin-bottom: 8px; color: #374151; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Weekly Summary Report</h1>
          <p><strong>${branchName}</strong></p>
          <p>${data.weekLabel}</p>
        </div>

        <div class="summary-card">
          <p style="margin:0;"><strong>Total Sales this Week:</strong></p>
          <div class="sales-total">${data.totalSales !== undefined && data.totalSales !== null ? data.totalSales : 'N/A'}</div>
          ${data.saleCount !== undefined ? `<p style="margin:4px 0 0;color:#666;">${data.saleCount} transaction(s) completed</p>` : ''}
        </div>

        ${outOfStockRows ? `
        <div class="section-title">Out of Stock Items</div>
        <table>
          <thead><tr><th>Product</th><th>Status</th></tr></thead>
          <tbody>${outOfStockRows}</tbody>
        </table>` : '<p style="color:#059669;">No items are currently out of stock.</p>'}

        ${lowStockRows ? `
        <div class="section-title">Low Stock Items</div>
        <table>
          <thead><tr><th>Product</th><th>Stock / Min Level</th></tr></thead>
          <tbody>${lowStockRows}</tbody>
        </table>` : '<p style="color:#059669;">All items are adequately stocked.</p>'}

        <div class="footer">
          <p>This is your automated weekly summary from RetailPro.</p>
        </div>
      </body>
      </html>
    `;
  }
}

export default new EmailService();
