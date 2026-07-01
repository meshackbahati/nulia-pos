/**
 * Send email via Brevo API
 */
export async function sendEmail(options) {
    try {
        const payload = {
            sender: {
                name: options.senderName,
                email: options.senderEmail,
            },
            to: [
                {
                    email: options.to,
                },
            ],
            subject: options.subject,
            htmlContent: options.htmlContent,
        };

        if (options.attachments && options.attachments.length > 0) {
            payload.attachment = options.attachments.map(a => ({
                content: a.content.toString('base64'),
                name: a.filename,
            }));
        }

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'api-key': options.apiKey,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('[Brevo] API error:', response.status, errBody);
        }

        return response.ok;
    } catch (error) {
        console.error('Failed to send email via Brevo:', error);
        return false;
    }
}

/**
 * Generate HTML receipt template
 */
export function generateReceiptHTML(data) {
    const itemsHTML = data.items
        .map(
            (item) => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `
        )
        .join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt ${data.receiptId}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to right, #3b82f6, #8b5cf6); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 32px;">${data.companyName}</h1>
        ${data.companyEmail ? `<p style="color: white; margin: 5px 0;">${data.companyEmail}</p>` : ''}
        ${data.companyPhone ? `<p style="color: white; margin: 5px 0;">${data.companyPhone}</p>` : ''}
    </div>
    
    <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0; color: #1f2937;">Receipt</h2>
            <p style="color: #6b7280; margin: 5px 0;">Receipt #${data.receiptId}</p>
            <p style="color: #6b7280; margin: 5px 0;">${data.date}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background: #f3f4f6;">
                    <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
                    <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                    <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                    <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>

        <div style="border-top: 2px solid #e5e7eb; padding-top: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Subtotal:</span>
                <span>$${data.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Tax:</span>
                <span>$${data.tax.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #e5e7eb; font-size: 18px; font-weight: bold;">
                <span>Total:</span>
                <span style="color: #3b82f6;">$${data.total.toFixed(2)}</span>
            </div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Payment Method:</span>
                    <span style="font-weight: bold; text-transform: uppercase;">${data.paymentMethod}</span>
                </div>
            </div>
        </div>

        ${data.companyAddress ? `<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;"><p>${data.companyAddress}</p></div>` : ''}
        
        <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>Thank you for your business!</p>
        </div>
    </div>
</body>
</html>
    `.trim();
}
