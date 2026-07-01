import cron from 'node-cron';
import models from '../models/index.js';
import notificationService from './notificationService.js';
import invoiceService from './invoiceService.js';
import emailService from '../lib/email.js';

class Scheduler {
  /**
   * Initializes all cron jobs.
   */
  async init() {
    console.log('[Scheduler] Initializing cron jobs...');

    // 1. Weekly Summary Report (Monday at 08:00 AM)
    cron.schedule('0 8 * * 1', async () => {
      console.log('[Scheduler] Running weekly summary generation...');
      try {
        await notificationService.sendWeeklySummary();
        console.log('[Scheduler] Weekly summary generation completed.');
      } catch (error) {
        console.error('[Scheduler] Error during weekly summary generation:', error);
      }
    });

    // 2. Monthly Hosting Invoice (1st and 3rd of every month at 00:00 AM)
    for (const day of [1, 3]) {
      cron.schedule(`0 0 ${day} * *`, async () => {
        console.log(`[Scheduler] Running hosting invoice generation (day ${day})...`);
        try {
          await this.runMonthlyHostingInvoicing();
          console.log(`[Scheduler] Hosting invoice generation completed (day ${day}).`);
        } catch (error) {
          console.error(`[Scheduler] Error during hosting invoice generation (day ${day}):`, error);
        }
      });
    }

    console.log('[Scheduler] All cron jobs scheduled.');
  }

  /**
   * Logic for monthly hosting invoicing.
   */
  async runMonthlyHostingInvoicing() {
    const invoiceRecipient = process.env.HOSTING_INVOICE_RECIPIENT;

    if (!invoiceRecipient) {
      console.error('[Scheduler] Skipping monthly hosting invoice: HOSTING_INVOICE_RECIPIENT not set.');
      return;
    }

    const services = [
      { name: 'Database Server (PostgreSQL)', amount: parseFloat(process.env.HOSTING_FEE_DB || '3.00') },
      { name: 'Backend API Server', amount: parseFloat(process.env.HOSTING_FEE_BACKEND || '3.00') },
      { name: 'WebSocket Server', amount: parseFloat(process.env.HOSTING_FEE_SOCKETS || '2.00') },
      { name: 'File Storage (Cloudinary/CDN)', amount: parseFloat(process.env.HOSTING_FEE_STORAGE || '1.50') },
      { name: 'Email Delivery (Brevo)', amount: parseFloat(process.env.HOSTING_FEE_EMAIL || '1.00') },
      { name: 'SSL Certificate & Domain Renewal', amount: parseFloat(process.env.HOSTING_FEE_SSL || '2.05') },
    ];

    const hostingFee = parseFloat(process.env.HOSTING_FEE_AMOUNT) || services.reduce((sum, s) => sum + s.amount, 0);

    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    const invoiceData = {
      month: currentMonth,
      recipientName: 'BorderShop Platform Administrator',
      services,
    };

    let pdfPath = null;
    try {
      pdfPath = await invoiceService.generateHostingInvoicePDF({
        ...invoiceData,
        amount: hostingFee,
      });

      await emailService.sendHostingInvoice(
        invoiceRecipient,
        hostingFee,
        invoiceData,
        pdfPath,
      );
      
      console.log(`[Scheduler] Hosting invoice sent to ${invoiceRecipient} for ${currentMonth}`);
    } catch (error) {
      console.error('[Scheduler] Failed to process monthly hosting invoice:', error);
    } finally {
      if (pdfPath) {
        await invoiceService.cleanup(pdfPath);
      }
    }
  }
}

export default new Scheduler();
