import invoiceService from './backend/services/invoiceService.js';
import fs from 'fs';
import path from 'path';

async function test() {
  console.log('Starting PDF generation test...');
  const invoiceData = {
    month: 'June 2026',
    recipientName: 'Test User',
    amount: 12.55
  };

  try {
    const filePath = await invoiceService.generateHostingInvoicePDF(invoiceData);
    console.log('✅ PDF generated successfully at:', filePath);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log('📄 File size:', stats.size, 'bytes');
    } else {
      console.error('❌ PDF file not found at:', filePath);
    }

    // Cleanup
    //await invoiceService.cleanup(filePath);
    console.log('🧹 Cleanup completed.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
