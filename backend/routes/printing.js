import express from 'express';
import net from 'net';
import { authenticate } from '../lib/auth.js';

const router = express.Router();

router.post('/network', authenticate, async (req, res) => {
    const { ip, port = 9100, data } = req.body;

    if (!ip) {
        return res.status(400).json({ success: false, error: 'Printer IP is required' });
    }

    if (!data) {
        return res.status(400).json({ success: false, error: 'Print data is required' });
    }

    const buffer = Buffer.from(data, 'base64');

    new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(10000);

        socket.on('connect', () => {
            socket.write(buffer, (err) => {
                if (err) {
                    socket.destroy();
                    reject(err);
                    return;
                }
                socket.end();
            });
        });

        socket.on('data', () => {});

        socket.on('end', () => {
            res.json({ success: true });
            resolve();
        });

        socket.on('timeout', () => {
            socket.destroy();
            res.status(500).json({ success: false, error: 'Connection timed out' });
            resolve();
        });

        socket.on('error', (err) => {
            res.status(500).json({ success: false, error: err.message });
            resolve();
        });

        socket.connect(port, ip);
    });
});

export default router;
