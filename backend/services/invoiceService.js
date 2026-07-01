import pdfkit from 'pdfkit';
import fs from 'fs';
import path from 'path';
import os from 'os';

class InvoiceService {
  /**
   * Generates a professional PDF invoice for hosting.
   */
  async generateHostingInvoicePDF(invoiceData) {
    const fileName = `Hosting_Invoice_${invoiceData.month.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, fileName);

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
