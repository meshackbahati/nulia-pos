import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const getSocketURL = () => {
    const primary = import.meta.env.VITE_API_URL || 'https://retailpro-api.vercel.app';

    // In dev, use localhost if specified
    if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
        return 'http://localhost:5000';
    }

    // Remove /api suffix if present for socket connection
    return primary.replace(/\/api$/, '');
};

const getApiBase = () => {
    const primary = import.meta.env.VITE_API_URL || 'https://retailpro-api.vercel.app/api';
    return primary.replace(/\/$/, '');
};

const SOCKET_URL = getSocketURL();
const API_BASE = getApiBase();

export const useSocket = (events: { [key: string]: (data: any) => void }) => {
    const { user } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [usePolling, setUsePolling] = useState(false);
    const eventsRef = useRef(events);
    eventsRef.current = events;
    const lastEventIdRef = useRef(0);

    // Register event listeners once the socket connects
    const registerSocketListeners = (socket: Socket) => {
        Object.entries(eventsRef.current).forEach(([event, handler]) => {
            socket.off(event);
            socket.on(event, handler);
        });
    };

    // Polling fallback: fetch realtime events from the serverless backend
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
                setUsePolling(true);
                if (data.lastId > lastEventIdRef.current) {
                    lastEventIdRef.current = data.lastId;
                }
                (data.events || []).forEach((evt: any) => {
                    const handler = eventsRef.current[evt.type];
                    if (handler) handler(evt.payload || {});
                });
            } catch (error) {
                console.error('🔌 Realtime polling error:', (error as Error).message);
                setIsConnected(false);
            } finally {
                if (!stopped) {
                    timer = setTimeout(tick, 5000);
                }
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

        let stopPolling: (() => void) | null = null;
        let socket: Socket | null = null;
        let socketRetryTimer: ReturnType<typeof setTimeout> | null = null;

        // Primary: socket.io (works against the non-serverless backend).
        // Fallback: HTTP polling (works against the Vercel serverless backend).
        const trySocket = () => {
            const sock = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnectionAttempts: 0, // we manage reconnects ourselves via the fallback timer
                timeout: 10000,
            });

            socket = sock;
            socketRef.current = sock;
            registerSocketListeners(sock);

            sock.on('connect', () => {
                console.log('📡 Connected to Socket server:', sock.id);
                if (stopPolling) { stopPolling(); stopPolling = null; }
                setIsConnected(true);
                setUsePolling(sock.io.engine.transport.name === 'polling');

                if (user.branchId) {
                    sock.emit('join-branch', user.branchId);
                }
            });

            sock.on('connect_error', (error) => {
                console.error('🔌 Socket connection error:', error.message);
                setIsConnected(false);
                // Fall back to HTTP polling if the socket backend is unavailable
                if (!stopPolling) {
                    stopPolling = startPolling();
                }
            });

            sock.on('disconnect', (reason) => {
                console.log('🔌 Socket disconnected:', reason);
                setIsConnected(false);
                // Polling will pick up events missed while disconnected
                if (!stopPolling) {
                    stopPolling = startPolling();
                }
            });
        };

        trySocket();

        // Safety: if the socket backend is not reachable, start polling after a short grace period
        socketRetryTimer = setTimeout(() => {
            if (!isConnected && !stopPolling) {
                console.log('📴 Socket not connected after grace period, starting polling fallback');
                stopPolling = startPolling();
            }
        }, 15000);

        return () => {
            if (socketRetryTimer) clearTimeout(socketRetryTimer);
            if (stopPolling) stopPolling();
            if (socket) {
                socket.disconnect();
                socket.removeAllListeners();
            }
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, user?.branchId]);

    // Manual refresh fallback (polling if socket fails entirely)
    // This can be used as a last resort if both websocket and socket.io-polling fail
    const triggerManualRefresh = useCallback((callback: () => void) => {
        if (!isConnected) {
            console.log('📴 Socket disconnected, using manual polling fallback');
            callback();
        }
    }, [isConnected]);

    return {
        socket: socketRef.current,
        isConnected,
        usePolling,
        triggerManualRefresh
    };
};
