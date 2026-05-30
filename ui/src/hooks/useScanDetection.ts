import { useEffect, useRef } from 'react';

interface UseScanDetectionOptions {
    onScan: (barcode: string) => void;
    minLength?: number;
    timeLimit?: number; // Time in ms between characters
}

/**
 * Enhanced Hook to detect HID Barcode Scanner input.
 * High-speed scanners simulate a keyboard but at speeds much faster than human typing.
 * This implementation prevents "ghost" keystrokes from entering focused inputs by 
 * capturing rapid sequences and stopping event propagation when a scan is detected.
 * 
 * Updated: timeLimit increased to 150ms to support slower USB barcode scanners
 * that may have delays up to 100-150ms between characters.
 */
export default function useScanDetection({ onScan, minLength = 3, timeLimit = 150 }: UseScanDetectionOptions) {
    const buffer = useRef<string>('');
    const lastKeyTime = useRef<number>(0);
    const timer = useRef<any>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now();
            const timeDiff = currentTime - lastKeyTime.current;
            lastKeyTime.current = currentTime;

            // 1. Handle Enter (Suffix for most scanners)
            if (e.key === 'Enter') {
                if (buffer.current.length >= minLength) {
                    // It was a valid scan!
                    onScan(buffer.current);
                    
                    // CRITICAL: Stop propagation to prevent 'Enter' from submitting forms or triggering UI
                    e.preventDefault();
                    e.stopPropagation();
                    
                    buffer.current = '';
                    if (timer.current) clearTimeout(timer.current);
                    return;
                } else {
                    // Not enough chars, likely a manual Enter keypress
                    buffer.current = '';
                    return;
                }
            }

            // 2. Character Accumulation
            // Only process single characters (ignore Shift, Alt, etc.)
            if (e.key.length !== 1) return;

            // 3. Human vs Machine Detection
            // If time between keys is too long, it's a human typing. 
            // Reset buffer if this char took too long to arrive.
            if (timeDiff > timeLimit && buffer.current.length > 0) {
                // Too slow! This is likely human typing.
                buffer.current = ''; 
            }

            buffer.current += e.key;

            // 4. Ghost Keystroke Prevention
            // If we are accumulating rapid characters (Machine speed), 
            // we prevent them from appearing in the focused input field.
            // Scanners typically send chars < 20ms apart. Humans > 80ms.
            if (timeDiff <= timeLimit && buffer.current.length >= 2) {
                // If an input is focused, we don't want these rapid chars leaking in.
                const target = e.target as HTMLElement;
                if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                    // Only prevent default if it's rapid enough to be a scanner
                    // This is the "Bridge" logic: Machine keys don't enter fields.
                    e.preventDefault();
                    e.stopPropagation();
                }
            }

            // 5. Safety Timer
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => {
                buffer.current = '';
            }, timeLimit * 2);
        };

        // Use capture phase to intercept before React or other listeners
        window.addEventListener('keydown', handleKeyDown, true);

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            if (timer.current) clearTimeout(timer.current);
        };
    }, [onScan, minLength, timeLimit]);
}
