import { formatCurrency } from '../lib/utils.js';
import EmailServiceInstance from '../lib/email.js';

describe('Multi-currency Logic', () => {
  test('formatCurrency uses code from configuration', () => {
    const ugxSymbol = formatCurrency(1000, 'UGX');
    expect(ugxSymbol).toContain('UGX');

    const usdSymbol = formatCurrency(10, 'USD');
    expect(usdSymbol).toContain('USD');

    const kesSymbol = formatCurrency(100, 'KES');
    expect(kesSymbol).toContain('KES');
  });

  test('generateReceiptHTML includes transaction currency', () => {
    const saleData = {
      receiptId: 'TEST-123',
      total: 5000,
      subtotal: 5000,
      tax: 0,
      transactionCurrency: 'UGX',
      transactionCurrencySymbol: 'UGX',
      items: [{ name: 'Item 1', quantity: 1, price: 5000, total: 5000 }],
      paymentMethod: 'cash',
      branchName: 'Test Branch',
      date: new Date().toLocaleDateString()
    };

    const html = EmailServiceInstance.generateReceiptHTML(saleData);
    expect(html).toContain('UGX 5000.00');
  });
});
