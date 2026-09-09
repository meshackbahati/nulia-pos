import { NextResponse } from 'next/server';
import notificationService from '../../../../services/notificationService.js';

export const runtime = 'nodejs';

export async function GET(req) {
    const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await notificationService.sendWeeklySummary();
        return NextResponse.json({ success: true, message: 'Weekly summary sent' });
    } catch (error) {
        console.error('[Cron] weekly-summary failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
