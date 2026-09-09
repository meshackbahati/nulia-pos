import pdfkit from 'pdfkit';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Use the OS temp dir (e.g. /tmp on Vercel serverless) — the project dir is read-only
const TMP_DIR = path.join(os.tmpdir(), 'bordershop-invoices');

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

class InvoiceService {
  /**
   * Generates a professional PDF invoice for hosting.
   */
  async generateHostingInvoicePDF(invoiceData) {
    const fileName = `Hosting_Invoice_${invoiceData.month.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(TMP_DIR, fileName);

    return new Promise((resolve, reject) => {
      const doc = new pdfkit({
        size: 'A4',
        margin: 50,
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const pageWidth = 525;
      const marginLeft = 50;
      const marginRight = pageWidth - marginLeft;

      // Header
      doc.fontSize(25).text('RetailPro POS', { align: 'center' });
      doc.fontSize(14).text('Monthly Platform Hosting Invoice', { align: 'center' });
      doc.moveDown();
      doc.path(`M ${marginLeft} 120 L ${marginRight} 120`).stroke();
      doc.moveDown();

      // Invoice Info
      doc.fontSize(12).text(`Invoice Period: ${invoiceData.month}`, { align: 'left' });
      doc.text(`Recipient: ${invoiceData.recipientName || 'Valued Customer'}`, { align: 'left' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
      doc.moveDown();

      // Services Breakdown Table
      if (invoiceData.services && invoiceData.services.length > 0) {
        doc.fontSize(14).text('Service Breakdown', { align: 'left' });
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const col1X = marginLeft;
        const col2X = 400;
        const col3X = 480;
        const rowHeight = 20;

        // Table header
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Service', col1X, tableTop);
        doc.text('Amount', col3X - 40, tableTop, { width: 60, align: 'right' });
        doc.moveDown(0.3);
        doc.path(`M ${marginLeft} ${doc.y} L ${marginRight} ${doc.y}`).stroke();
        doc.moveDown(0.3);

        let currentY = doc.y;
        doc.font('Helvetica');
        for (const service of invoiceData.services) {
          doc.text(service.name, col1X, currentY);
          doc.text(`$${service.amount.toFixed(2)}`, col3X - 40, currentY, { width: 60, align: 'right' });
          currentY += rowHeight;
        }

        // Total row
        doc.moveDown(0.5);
        doc.path(`M ${marginLeft} ${currentY - 5} L ${marginRight} ${currentY - 5}`).stroke();
        doc.font('Helvetica-Bold').fontSize(11);
        doc.text('Total', col1X, currentY + 2);
        doc.text(`$${invoiceData.amount.toFixed(2)}`, col3X - 40, currentY + 2, { width: 60, align: 'right' });

        doc.moveDown(2);
      } else {
        // Fallback: simple amount box
        const y = doc.y;
        doc.rect(marginLeft, y, 500, 60).fill('#f8f9fa');
        doc.fillColor('#000').fontSize(16).text('Total Amount Due:', 70, y + 15);
        doc.fontSize(24).text(`$${invoiceData.amount.toFixed(2)}`, 70, y + 35);
        doc.moveDown(4);
        doc.fillColor('#000');
      }

      // Footer
      doc.fontSize(10).text('Thank you for choosing RetailPro!', { align: 'center' });
      doc.text('Payment should be made via the usual platform channels.', { align: 'center' });
      doc.text('If you have any questions, please contact support.', { align: 'center' });
      doc.text('Powered by RetailPro POS', { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });
      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Generates a PDF receipt for the given sale data.
   */
  async generateReceiptPDF(saleData) {
    const fileName = `Receipt_${saleData.receiptId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(TMP_DIR, fileName);

    return new Promise((resolve, reject) => {
      const doc = new pdfkit({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const ml = 50;
      const mr = 525;

      // Header
      doc.fontSize(22).text('RetailPro POS', { align: 'center' });
      doc.fontSize(13).text(saleData.branchName, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Receipt #${saleData.receiptId}`, { align: 'center' });
      doc.text(saleData.date, { align: 'center' });
      doc.moveDown(0.5);
      doc.path(`M ${ml} ${doc.y} L ${mr} ${doc.y}`).stroke();
      doc.moveDown();

      // Items table header
      const colItem = ml;
      const colQty = 370;
      const colPrice = 430;
      const colTotal = 480;
      const rowH = 20;

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Item', colItem, doc.y);
      doc.text('Qty', colQty, doc.y);
      doc.text('Price', colPrice, doc.y, { width: 50, align: 'right' });
      doc.text('Total', colTotal, doc.y, { width: 50, align: 'right' });
      doc.moveDown(0.3);
      doc.path(`M ${ml} ${doc.y} L ${mr} ${doc.y}`).stroke();
      doc.moveDown(0.3);

      doc.font('Helvetica').fontSize(10);
      let y = doc.y;
      for (const item of saleData.items) {
        doc.text(item.name, colItem, y);
        doc.text(String(item.quantity), colQty, y);
        doc.text(saleData.formatFn(item.price), colPrice, y, { width: 50, align: 'right' });
        doc.text(saleData.formatFn(item.total), colTotal, y, { width: 50, align: 'right' });
        y += rowH;
      }

      doc.moveDown(0.5);
      doc.path(`M ${ml} ${y - 5} L ${mr} ${y - 5}`).stroke();

      // Totals
      doc.font('Helvetica').fontSize(11);
      doc.text(`Subtotal: ${saleData.formatFn(saleData.subtotal)}`, colPrice, y + 5, { width: 100, align: 'right' });
      doc.text(`Tax: ${saleData.formatFn(saleData.tax)}`, colPrice, y + 25, { width: 100, align: 'right' });

      doc.font('Helvetica-Bold').fontSize(13);
      doc.text(`Total: ${saleData.formatFn(saleData.total)}`, colPrice, y + 50, { width: 100, align: 'right' });

      doc.font('Helvetica').fontSize(11);
      doc.text(`Payment: ${saleData.paymentMethod}`, colPrice, y + 75, { width: 100, align: 'right' });

      // Footer
      doc.fontSize(10).text('Thank you for your business!', ml, doc.y + 50, { align: 'center' });
      doc.text('Powered by RetailPro POS', { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Cleans up the temporary PDF file.
   */
  async cleanup(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to cleanup PDF file:', error);
    }
  }
}

export default new InvoiceService();
