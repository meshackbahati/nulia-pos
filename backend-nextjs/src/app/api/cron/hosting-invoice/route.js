import { NextResponse } from 'next/server';
import invoiceService from '../../../../services/invoiceService.js';
import emailService from '../../../../lib/email.js';

export const runtime = 'nodejs';

export async function GET(req) {
    const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoiceRecipient = process.env.HOSTING_INVOICE_RECIPIENT;
    if (!invoiceRecipient) {
        return NextResponse.json({ success: false, error: 'HOSTING_INVOICE_RECIPIENT not set' }, { status: 500 });
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
        pdfPath = await invoiceService.generateHostingInvoicePDF({ ...invoiceData, amount: hostingFee });
        await emailService.sendHostingInvoice(invoiceRecipient, hostingFee, invoiceData, pdfPath);
        return NextResponse.json({ success: true, message: `Hosting invoice sent to ${invoiceRecipient} for ${currentMonth}` });
    } catch (error) {
        console.error('[Cron] hosting-invoice failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        if (pdfPath) {
            await invoiceService.cleanup(pdfPath);
        }
    }
}
