import { useCallback, useRef, useState } from 'react';

/** Prevents an async function from running again until it completes.
 *  Returns [lockedFn, isLocked] — use isLocked as the button's disabled prop. */
export function useLock<T extends (...args: any[]) => Promise<any>>(fn: T): [T, boolean] {
    const busy = useRef(false);
    const [locked, setLocked] = useState(false);

    const lockedFn = useCallback(async (...args: any[]) => {
        if (busy.current) return;
        busy.current = true;
        setLocked(true);
        try {
            return await fn(...args);
        } finally {
            busy.current = false;
            setLocked(false);
        }
    }, [fn]) as unknown as T;

    return [lockedFn, locked];
}
