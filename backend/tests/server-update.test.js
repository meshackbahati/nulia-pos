import { jest } from '@jest/globals';
import EmailServiceInstance from '../lib/email.js';

describe('Server Update Emailing and Notifications', () => {
  test('generateServerUpdateHTML formats version, title, release notes correctly', () => {
    const updateData = {
      version: '1.12.0',
      title: 'Infrastructure Maintenance & Optimization',
      releaseNotes: '1. Added Next.js server update routes.\n2. Improved email notifications.',
      date: '2026-08-20',
    };

    const html = EmailServiceInstance.generateServerUpdateHTML(updateData);
    expect(html).toContain('SERVER UPDATE v1.12.0');
    expect(html).toContain('Infrastructure Maintenance & Optimization');
    expect(html).toContain('2026-08-20');
    expect(html).toContain('1. Added Next.js server update routes.');
  });

  test('sendServerUpdateNotification respects ENABLE_EMAILING=false', async () => {
    process.env.ENABLE_EMAILING = 'false';
    const result = await EmailServiceInstance.sendServerUpdateNotification('test@example.com', {
      version: '1.12.0',
      title: 'Test Update',
    });
    expect(result).toBe(false);
  });
});
