import { Readable } from 'stream';
import realtimeIo from './realtime.js';

/**
 * Builds a Next.js App Router Request into an Express-style req/res pair,
 * runs the Express app, and returns { status, headers, body }.
 *
 * The request body is exposed as a real Readable stream so that
 * express.json(), express.urlencoded() and multer (multipart) all work.
 */
export async function runExpressToResult(req, app) {
    const url = new URL(req.url);
    const method = req.method || 'GET';
    const rawHeaders = req.headers && typeof req.headers.entries === 'function'
        ? Object.fromEntries(req.headers.entries())
        : (req.headers || {});
    const headers = {};
    Object.keys(rawHeaders).forEach(k => { headers[k.toLowerCase()] = rawHeaders[k]; });
    let bodyBuffer = Buffer.alloc(0);

    if (!['GET', 'HEAD'].includes(method)) {
        try {
            bodyBuffer = Buffer.from(await req.arrayBuffer());
        } catch { }
    }

    const bodyStream = Readable.from(bodyBuffer);
    const headersObj = headers;
    if (bodyBuffer.length > 0 && !('content-length' in headersObj)) {
        headersObj['content-length'] = String(bodyBuffer.length);
    }

    const expressReq = Object.assign(bodyStream, {
        method,
        url: url.pathname + url.search,
        originalUrl: url.pathname + url.search,
        baseUrl: '',
        path: url.pathname,
        headers: headersObj,
        query: Object.fromEntries(url.searchParams.entries()),
        params: {},
        body: undefined,
        _body: undefined,
        rawBody: bodyBuffer,
        ip: headersObj['x-forwarded-for']?.split(',')[0]?.trim() || headersObj['x-real-ip'] || '127.0.0.1',
        socket: {
            remoteAddress: headersObj['x-forwarded-for']?.split(',')[0]?.trim() || '127.0.0.1',
            destroy: () => {},
        },
        connection: null,
        get: (name) => headersObj[name.toLowerCase()] || headers[name],
    });
    expressReq.connection = expressReq.socket;
    // Prevent _http_incoming._destroy from assuming a real network socket
    expressReq._destroy = function (err, cb) { cb(err); };
    expressReq.destroy = function () { return this; };
    expressReq.destroyed = false;

    let statusCode = 200;
    const resHeaders = {};
    let responseBody;
    let resEnded = false;

    const expressRes = {
        statusCode: 200,
        headersSent: false,
        _headerSent: false,
        _headers: {},
        app: { get: () => null },
        req: expressReq,
        status(code) {
            statusCode = code;
            this.statusCode = code;
            return this;
        },
        setHeader(name, value) {
            resHeaders[name] = value;
            this._headers[name] = value;
            return this;
        },
        getHeader(name) {
            return resHeaders[name];
        },
        getHeaders() {
            return { ...resHeaders };
        },
        set(name, value) {
            return this.setHeader(name, value);
        },
        removeHeader(name) {
            delete resHeaders[name];
            return this;
        },
        append(name, value) {
            const existing = resHeaders[name];
            resHeaders[name] = existing ? `${existing}, ${value}` : value;
            return this;
        },
        send(body) {
            responseBody = body;
            this.end();
            return this;
        },
        json(body) {
            this.setHeader('Content-Type', 'application/json');
            responseBody = JSON.stringify(body);
            this.end();
            return this;
        },
        sendStatus(code) {
            this.status(code);
            responseBody = '';
            this.end();
            return this;
        },
        sendFile() { this.end(); return this; },
        download() { this.end(); return this; },
        redirect(code, loc) {
            if (typeof code === 'string') { loc = code; code = 302; }
            this.status(code);
            this.setHeader('Location', loc);
            responseBody = '';
            this.end();
            return this;
        },
        end(body) {
            if (body !== undefined) responseBody = body;
            resEnded = true;
            this.headersSent = true;
            return this;
        },
        write(chunk) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
            responseBody = responseBody === undefined ? buf : Buffer.concat([Buffer.from(responseBody), buf]);
            return true;
        },
        writeHead(code, h) {
            this.status(code);
            if (h) Object.keys(h).forEach(k => this.setHeader(k, h[k]));
            return this;
        },
        get writableEnded() { return resEnded; },
        get finished() { return resEnded; },
        get destroyed() { return false; },
        flushHeaders() { return this; },
    };

    expressReq.app = { get: (key) => (key === 'io' ? realtimeIo : undefined) };

    await new Promise((resolve) => {
        const done = () => { if (!resEnded) resolve(); };
        app(expressReq, expressRes, done);
        const tick = setInterval(() => {
            if (resEnded) {
                clearInterval(tick);
                resolve();
            }
        }, 10);
        // safety timeout in case handler neither responds nor calls next
        setTimeout(() => {
            clearInterval(tick);
            if (!resEnded) {
                responseBody = JSON.stringify({ error: 'Handler timed out' });
                statusCode = 500;
                resEnded = true;
            }
            resolve();
        }, 30000);
    });

    if (responseBody === undefined) responseBody = '';

    const isBuffer = Buffer.isBuffer(responseBody);
    const body = isBuffer ? responseBody : String(responseBody);

    return {
        status: statusCode,
        headers: resHeaders,
        body,
    };
}

/**
 * Bridges a Next.js App Router Request into the ported Express app
 * and converts the Express response back into a NextResponse.
 */
export async function runExpress(req, app) {
    const { status, headers, body } = await runExpressToResult(req, app);
    const { NextResponse } = await import('next/server');
    return new NextResponse(body, {
        status,
        headers,
    });
}
