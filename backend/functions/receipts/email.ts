import { Handler } from '@netlify/functions';
import { sendEmail, generateReceiptHTML } from '../../lib/brevo';
import models from '../../models';
import { requireAuth } from '../../middleware/auth';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const user = await requireAuth(event);
        const { saleId, email } = JSON.parse(event.body || '{}');

        if (!saleId || !email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Sale ID and email are required' }),
            };
        }

        // Fetch sale with items
        const sale: any = await models.Sale.findByPk(saleId, {
            include: [
                {
                    model: models.SaleItem,
                    as: 'items',
                    include: [
                        {
                            model: models.Product,
                            as: 'product',
                        },
                    ],
                },
                {
                    model: models.Branch,
                    as: 'branch',
                },
            ],
        });

        if (!sale) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Sale not found' }),
            };
        }

        // Get Brevo settings from branch or use defaults
        const branchSettings = await sale.branch.getSettings();
        const brevoApiKey = branchSettings?.brevo?.apiKey || process.env.***REMOVED***;
        const senderEmail = branchSettings?.brevo?.senderEmail || process.env.BREVO_SENDER_EMAIL || 'noreply@bordershop.com';
        const senderName = branchSettings?.brevo?.senderName || 'BorderShop POS';
        const companyName = branchSettings?.company?.name || 'BorderShop POS';

        if (!brevoApiKey) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Brevo API key not configured' }),
            };
        }

        // Format items for receipt
        const items = sale.items.map((item: any) => ({
            name: item.product.name,
            quantity: item.quantity,
            price: parseFloat(item.price),
        }));

        // Generate HTML receipt
        const htmlContent = generateReceiptHTML({
            receiptId: sale.receiptId,
            companyName,
            companyEmail: branchSettings?.company?.email,
            companyPhone: branchSettings?.company?.phone,
            companyAddress: branchSettings?.company?.address,
            items,
            subtotal: parseFloat(sale.subtotal),
            tax: parseFloat(sale.taxAmount),
            total: parseFloat(sale.totalAmount),
            paymentMethod: sale.paymentMethod,
            date: new Date(sale.createdAt).toLocaleString(),
        });

        // Send email
        const success = await sendEmail({
            apiKey: brevoApiKey,
            to: email,
            subject: `Receipt ${sale.receiptId} - ${companyName}`,
            htmlContent,
            senderEmail,
            senderName,
        });

        if (!success) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to send email' }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Receipt emailed successfully',
                receiptId: sale.receiptId,
            }),
        };
    } catch (error) {
        console.error('Email receipt error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server error' }),
        };
    }
};
