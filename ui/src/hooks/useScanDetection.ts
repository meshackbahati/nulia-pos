import { useEffect, useRef } from 'react';

interface UseScanDetectionOptions {
    onScan: (barcode: string) => void;
    minLength?: number;
    timeLimit?: number; // Time in ms to wait for next character
}

/**
 * Hook to detect barcode scanner input (keyboard wedge).
 * Scanners typically simulate rapid keystrokes followed by Enter.
 */
export default function useScanDetection({ onScan, minLength = 3, timeLimit = 50 }: UseScanDetectionOptions) {
    const buffer = useRef<string>('');
    // Use 'any' or ReturnType<typeof setTimeout> to avoid NodeJS namespace issues in browser
    const timer = useRef<any>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in a normal input? 
            // In POS context, we often want global scan. 
            // But if we want to avoid double input when an input is focused:
            // const target = e.target as HTMLElement; // unused

            if (e.key === 'Enter') {
                if (buffer.current.length >= minLength) {
                    onScan(buffer.current);
                    buffer.current = '';
                    if (timer.current) clearTimeout(timer.current);
                } else {
                    buffer.current = '';
                }
                return;
            }

            // Ignore special keys (ctrl, alt, shift, etc are implicitly handled as they don't produce char usually, but we check length)
            if (e.key.length !== 1) return;

            // Clear buffer if too slow (manual typing)
            if (timer.current) clearTimeout(timer.current);

            // Start/Reset timer
            timer.current = setTimeout(() => {
                buffer.current = '';
            }, timeLimit);

            buffer.current += e.key;
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (timer.current) clearTimeout(timer.current);
        };
    }, [onScan, minLength, timeLimit]);
}
