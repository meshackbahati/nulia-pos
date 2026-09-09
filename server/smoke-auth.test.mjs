// Authenticated + multipart smoke tests via the bridge (no HTTP server).
import { runExpressToResult } from './src/lib/express-bridge.js';
import app from './src/lib/app.js';

function makeRequest(path, { method = 'GET', headers = {}, body, raw } = {}) {
    const h = { 'content-type': 'application/json', ...headers };
    const url = new URL(path, 'http://localhost:3000');
    const req = {
        url: url.toString(),
        method,
        headers: h,
        arrayBuffer: async () => (raw ? raw : Buffer.from(body !== undefined ? JSON.stringify(body) : '')),
    };
    return runExpressToResult(req, app);
}

// 1. Login with bad credentials -> expect 401 (validates DB query path + bcrypt)
const badLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'no-such-user@example.com', password: 'wrongpass' },
});
console.log(`POST /api/auth/login (bad creds): ${badLogin.status} -> ${String(badLogin.body).slice(0, 80)}`);

// 2. /api/auth/me without token -> expect 401
const me = await makeRequest('/api/auth/me');
console.log(`GET /api/auth/me (no token): ${me.status}`);

// 3. /api/products/list without token -> expect 401
const products = await makeRequest('/api/products/list');
console.log(`GET /api/products/list (no token): ${products.status}`);

// 4. Multipart upload without token -> expect 401 (validates multer stream path)
const boundary = '----testboundary123';
const mpBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="t.png"\r\nContent-Type: image/png\r\n\r\n`),
    Buffer.from('fake-png-bytes'),
    Buffer.from(`\r\n--${boundary}--\r\n`),
]);
const upload = await makeRequest('/api/products/upload-image', {
    method: 'POST',
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    raw: mpBody,
});
console.log(`POST /api/products/upload-image (multipart, no token): ${upload.status}`);

// 5. Analytics summary without token -> expect 401
const analytics = await makeRequest('/api/analytics/summary');
console.log(`GET /api/analytics/summary (no token): ${analytics.status}`);

// 6. Realtime events without token -> expect 401
const realtimeNoToken = await makeRequest('/api/realtime/events');
console.log(`GET /api/realtime/events (no token): ${realtimeNoToken.status}`);

process.exit(0);
