import 'dotenv/config'; // Load environment variables
import models, { sequelize } from './models/index.js';
import emailService from './lib/email.js';
import invoiceService from './services/invoiceService.js';

async function runTests() {
    console.log('=== Starting Email System Integration Tests ===');

    const testEmail = 'bahatikylemeshack@gmail.com';

    try {
        // 1. Verify Database Connection
        await sequelize.authenticate();
        console.log('✅ Database connection successful.');

        // 2. Fetch a Branch
        const branch = await models.Branch.findOne();
        const branchName = branch ? branch.name : 'Test Branch';
        console.log(`ℹ Using Branch: ${branchName}`);

        // 3. Test Out of Stock Alert
        console.log('\n--- Test 1: Out of Stock Alert ---');
        const outOfStockItems = [
            { name: 'Ultra-Premium Coffee Beans (Dark Roast)', currentStock: 0 },
        ];
        console.log(`Sending Out of Stock alert to ${testEmail}...`);
        const outOfStockResult = await emailService.sendOutOfStockAlert(
            testEmail,
            branchName,
            outOfStockItems
        );
        console.log(`Result: ${outOfStockResult ? '✅ SENT SUCCESSFULLY' : '❌ FAILED'}`);

        // 4. Test Low Stock Alert
        console.log('\n--- Test 2: Low Stock Alert ---');
        const lowStockItems = [
            { name: 'Organic Almond Milk 1L', currentStock: 2, minLevel: 10 },
        ];
        console.log(`Sending Low Stock alert to ${testEmail}...`);
        const lowStockResult = await emailService.sendLowStockAlert(
            testEmail,
            branchName,
            lowStockItems
        );
        console.log(`Result: ${lowStockResult ? '✅ SENT SUCCESSFULLY' : '❌ FAILED'}`);

        // 5. Test Monthly Hosting Invoice with PDF
        console.log('\n--- Test 3: Monthly Hosting Invoice (with PDF) ---');
        const invoiceData = {
            month: 'July 2026',
            recipientName: 'Kyle Meshack Bahati',
        };
        const hostingFee = 12.55;

        console.log('Generating PDF invoice...');
        const pdfPath = await invoiceService.generateHostingInvoicePDF({
            ...invoiceData,
            amount: hostingFee,
        });
        console.log(`PDF created at: ${pdfPath}`);

        console.log(`Sending Hosting Invoice to ${testEmail}...`);
        const invoiceResult = await emailService.sendHostingInvoice(
            testEmail,
            hostingFee,
            invoiceData,
            pdfPath
        );
        console.log(`Result: ${invoiceResult ? '✅ SENT SUCCESSFULLY' : '❌ FAILED'}`);

        // Cleanup the generated PDF
        console.log('Cleaning up PDF...');
        await invoiceService.cleanup(pdfPath);
        console.log('Cleanup done.');

    } catch (error) {
        console.error('❌ Error running email tests:', error);
    } finally {
        await sequelize.close();
        console.log('\n=== Email System Tests Completed ===');
    }
}

runTests();
