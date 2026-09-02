import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Serverless-first: polling only, no socket.io
const getApiBase = () => {
    const primary = import.meta.env.VITE_API_URL || 'https://retailpro-api.vercel.app/api';
    return primary.replace(/\/$/, '');
};

const API_BASE = getApiBase();

export const useSocket = (events: { [key: string]: (data: any) => void }) => {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const eventsRef = useRef(events);
    eventsRef.current = events;
    const lastEventIdRef = useRef(0);

    const startPolling = useCallback(() => {
        let stopped = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const tick = async () => {
            if (stopped) return;
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/realtime/events?since=${lastEventIdRef.current}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });
                if (!res.ok) throw new Error(`polling failed: ${res.status}`);
                const data = await res.json();
                if (stopped) return;
                setIsConnected(true);
                if (data.lastId > lastEventIdRef.current) {
                    lastEventIdRef.current = data.lastId;
                }
                (data.events || []).forEach((evt: any) => {
                    const handler = eventsRef.current[evt.type];
                    if (handler) handler(evt.payload || {});
                });
            } catch {
                // Silent in serverless — polling will retry, no spam
                setIsConnected(false);
            } finally {
                if (!stopped) timer = setTimeout(tick, 5000);
            }
        };

        tick();
        return () => {
            stopped = true;
            if (timer) clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        if (!user) return;
        const stop = startPolling();
        return () => stop();
    }, [user?.id, user?.branchId, startPolling]);

    const triggerManualRefresh = useCallback((callback: () => void) => {
        if (!isConnected) callback();
    }, [isConnected]);

    return {
        socket: null,
        isConnected,
        usePolling: true,
        triggerManualRefresh
    };
};
