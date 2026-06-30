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

    // 1. Daily Inventory Check (e.g., at 08:00 AM every day)
    cron.schedule('0 8 * * *', async () => {
      console.log('[Scheduler] Running daily inventory scan...');
      try {
        const branches = await models.Branch.findAll({ where: { isActive: true } });
        for (const branch of branches) {
          await notificationService.scanAndNotifyInventory(branch.id);
        }
        console.log('[Scheduler] Daily inventory scan completed.');
      } catch (error) {
        console.error('[Scheduler] Error during daily inventory scan:', error);
      }
    });

    // 2. Monthly Hosting Invoice (e.g., at 00:00 AM on the 1st of every month)
    cron.schedule('0 0 1 * *', async () => {
      console.log('[Scheduler] Running monthly hosting invoice generation...');
      try {
        await this.runMonthlyHostingInvoicing();
        console.log('[Scheduler] Monthly hosting invoicing completed.');
      } catch (error) {
        console.error('[Scheduler] Error during monthly hosting invoicing:', error);
      }
    });

    console.log('[Scheduler] All cron jobs scheduled.');
  }

  /**
   * Logic for monthly hosting invoicing.
   */
  async runMonthlyHostingInvoicing() {
    // Configuration from Env
    const hostingFee = parseFloat(process.env.HOSTING_FEE_AMOUNT || '12.55');
    const invoiceRecipient = process.env.HOSTING_INVOICE_RECIPIENT;

    if (!invoiceRecipient) {
      console.error('[Scheduler] Skipping monthly hosting invoice: HOSTING_INVOICE_RECIPIENT not set.');
      return;
    }

    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // In a real system, we might want to iterate through all branches or customers.
    // For this implementation, we'll send one master invoice to the configured recipient.
    const invoiceData = {
      month: currentMonth,
      recipientName: 'BorderShop Platform Administrator'
    };

    let pdfPath = null;
    try {
      pdfPath = await invoiceService.generateHostingInvoicePDF({
        ...invoiceData,
        amount: hostingFee
      });

      await emailService.sendHostingInvoice(
        invoiceRecipient,
        hostingFee,
        invoiceData,
        pdfPath
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
