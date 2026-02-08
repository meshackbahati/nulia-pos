/**
 * Set a cookie with a specific name, value, and expiration in days
 */
export const setCookie = (name: string, value: string, days: number) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "; expires=" + date.toUTCString();
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax; Secure";
};

/**
 * Get a cookie value by name
 */
export const getCookie = (name: string) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};

/**
 * Erase a cookie by name
 */
export const eraseCookie = (name: string) => {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};

/**
 * Store user and token in both localStorage and cookies for 7-day persistence
 */
export const persistSession = (token: string, user: any) => {
    // Store in localStorage for immediate access
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    // Store in cookies for long-term/cross-environment persistence (7 days)
    setCookie('token', token, 7);
    setCookie('user', JSON.stringify(user), 7);
};

/**
 * Clear session from both localStorage and cookies
 */
export const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    eraseCookie('token');
    eraseCookie('user');
};
