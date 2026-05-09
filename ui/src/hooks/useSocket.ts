import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const getSocketURL = () => {
    const primary = import.meta.env.VITE_API_URL || 'https://api2.g24sec.space';
    const fallback = 'https://api2.g24sec.com';

    // In dev, use localhost if specified
    if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
        return 'http://localhost:5000';
    }

    // Remove /api suffix if present for socket connection
    return primary.replace(/\/api$/, '');
};

const SOCKET_URL = getSocketURL();

export const useSocket = (events: { [key: string]: (data: any) => void }) => {
    const { user } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [usePolling, setUsePolling] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Initialize socket with both websocket and polling transports
        // Socket.io automatically fallbacks to polling if websocket is not available
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('📡 Connected to Socket server:', socket.id);
            setIsConnected(true);
            setUsePolling(socket.io.engine.transport.name === 'polling');
            
            // Join branch room
            if (user.branchId) {
                socket.emit('join-branch', user.branchId);
            }
        });

        socket.on('connect_error', (error) => {
            console.error('🔌 Socket connection error:', error.message);
            setIsConnected(false);
        });

        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
            setIsConnected(false);
        });

        // Register event listeners
        Object.entries(events).forEach(([event, handler]) => {
            socket.on(event, handler);
        });

        return () => {
            socket.disconnect();
        };
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
