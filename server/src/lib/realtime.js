import models from '../models/index.js';

let syncPromise = null;

async function ensureTable() {
    if (!syncPromise) {
        syncPromise = models.RealtimeEvent.sync();
    }
    return syncPromise;
}

/**
 * Writes a realtime event to the DB event log. This is the serverless
 * replacement for socket.io: routes keep calling io.to(...).emit(...) /
 * io.emit(...) unchanged, and the events are persisted so clients can
 * pick them up via polling (see GET /api/realtime/events).
 */
export async function emitRealtimeEvent(type, payload, branchId = null) {
    try {
        await ensureTable();
        await models.RealtimeEvent.create({
            type,
            payload,
            branchId: branchId || null,
        });
    } catch (error) {
        console.error('[realtime] Failed to persist event', type, error.message);
    }
}

const to = (branchId) => ({
    emit: (event, payload) => emitRealtimeEvent(event, payload, branchId),
});

export const realtimeIo = {
    emit: (event, payload) => emitRealtimeEvent(event, payload, null),
    to,
    // kept for API compatibility with socket.io server usage
    of: () => realtimeIo,
    on: () => realtimeIo,
    use: () => realtimeIo,
};

export default realtimeIo;
