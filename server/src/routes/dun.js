import express from 'express';
import models from '../models/index.js';
import emailService from '../lib/email.js';

const router = express.Router();

router.get('/yo-pay-up', async (req, res) => {
  try {
    const admins = await models.User.findAll({
      where: { role: 'admin', isActive: true },
      attributes: ['email', 'firstName', 'lastName'],
    });

    if (admins.length === 0) {
      return res.json({
        message: 'No admins found to remind.',
        sent: false,
      });
    }

    const adminEmails = admins.map(a => a.email).join(',');
    const adminNames = admins.map(a => `${a.firstName} ${a.lastName}`).join(', ');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Hosting Payment Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 20px; margin-bottom: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Hosting Payment Reminder</h1>
        </div>
        <p>Dear ${adminNames},</p>
        <p>This is a reminder that the hosting fees for the RetailPro system are due. Please ensure payment is made at your earliest convenience to avoid any interruption of services.</p>
        <p><strong>Services covered:</strong></p>
        <ul>
          <li>Database Server (PostgreSQL)</li>
          <li>Backend API Server</li>
          <li>WebSocket Server</li>
          <li>File Storage</li>
          <li>Email Delivery</li>
          <li>SSL Certificate & Domain Renewal</li>
        </ul>
        <p>Payment should be made via the usual platform channels.</p>
        <div class="footer">
          <p>RetailPro POS — Automated Billing Notice</p>
        </div>
      </body>
      </html>
    `;

    await emailService.sendEmail({
      to: adminEmails,
      subject: 'RetailPro Hosting Payment Reminder',
      html,
    });

    res.json({
      message: 'Professional reminder sent. They have been notified.',
      sent: true,
      adminsNotified: admins.length,
    });
  } catch (error) {
    console.error('[Dun] Error sending payment reminder:', error);
    res.status(500).json({
      message: 'Failed to send reminder.',
      error: error.message,
    });
  }
});

export default router;
