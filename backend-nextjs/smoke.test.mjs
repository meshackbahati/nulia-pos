// In-process smoke test for the ported Express app via the Next bridge.
// No HTTP server is started — exercises the exact production code path.
import { runExpressToResult } from './src/lib/express-bridge.js';
import app from './src/lib/app.js';

function makeRequest(path, { method = 'GET', headers = {}, body } = {}) {
    const h = { 'content-type': 'application/json', ...headers };
    const url = new URL(path, 'http://localhost:3000');
    const req = {
        url: url.toString(),
        method,
        headers: h,
        arrayBuffer: async () => Buffer.from(body !== undefined ? JSON.stringify(body) : ''),
    };
    return runExpressToResult(req, app);
}

const cases = [
    { name: 'GET /', path: '/' },
    { name: 'GET /health', path: '/health' },
    { name: 'GET /api/install/check', path: '/api/install/check' },
    { name: 'POST /api/auth/login (empty)', path: '/api/auth/login', method: 'POST', body: {} },
    { name: 'GET /api/nonexistent', path: '/api/nonexistent' },
];

for (const c of cases) {
    try {
        const r = await makeRequest(c.path, c);
        console.log(`${c.name}: ${r.status}`);
        if (c.name === 'GET /api/install/check' || r.status >= 500) {
            console.log('   BODY:', String(r.body).slice(0, 500));
        }
    } catch (e) {
        console.log(`${c.name}: THREW ${e.message}`);
        console.log(e.stack ? e.stack.split('\n').slice(0, 5).join('\n') : '');
    }
}
process.exit(0);
