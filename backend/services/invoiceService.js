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

      // Header
      doc.fontSize(25).text('RetailPro POS', { align: 'center' });
      doc.fontSize(14).text('Monthly Platform Hosting Invoice', { align: 'center' });
      doc.moveDown();
      doc.path('M 50 120 L 550 120').stroke(); // Horizontal line
      doc.moveDown();

      // Invoice Info
      doc.fontSize(12).text(`Invoice Period: ${invoiceData.month}`, { align: 'left' });
      doc.text(`Recipient: ${invoiceData.recipientName || 'Valued Customer'}`, { align: 'left' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
      doc.moveDown();

      // Amount Box
      doc.rect(50, doc.y, 500, 60).fill('#f8f9fa');
      doc.fillColor('#000').fontSize(16).text('Total Amount Due:', 70, doc.y + 15);
      doc.fontSize(24).text(`$${invoiceData.amount.toFixed(2)}`, 70, doc.y + 35);
      doc.moveDown(4);

      // Footer
      doc.fontSize(10).text('Thank you for choosing RetailPro!', { align: 'center' });
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
