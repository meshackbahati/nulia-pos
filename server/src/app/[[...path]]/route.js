import app from '../../lib/app.js';
import { runExpress } from '../../lib/express-bridge.js';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
    return runExpress(req, app);
}

export async function POST(req, { params }) {
    return runExpress(req, app);
}

export async function PUT(req, { params }) {
    return runExpress(req, app);
}

export async function PATCH(req, { params }) {
    return runExpress(req, app);
}

export async function DELETE(req, { params }) {
    return runExpress(req, app);
}

export async function OPTIONS(req, { params }) {
    return runExpress(req, app);
}
