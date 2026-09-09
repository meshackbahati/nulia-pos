import { NextResponse } from 'next/server';
import notificationService from '../../../../services/notificationService.js';

export const runtime = 'nodejs';

export async function GET(req) {
    const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const version = searchParams.get('version') || undefined;
        const title = searchParams.get('title') || undefined;
        const releaseNotes = searchParams.get('releaseNotes') || undefined;

        const sent = await notificationService.notifyServerUpdate({ version, title, releaseNotes });
        return NextResponse.json({ success: sent, message: sent ? 'Server update notification sent' : 'No recipients or emailing disabled' });
    } catch (error) {
        console.error('[Cron] server-update failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const sent = await notificationService.notifyServerUpdate(body);
        return NextResponse.json({ success: sent, message: sent ? 'Server update notification sent' : 'No recipients or emailing disabled' });
    } catch (error) {
        console.error('[Cron] server-update POST failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
