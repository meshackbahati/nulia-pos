export function formatCurrency(amount, currency = 'KES', symbol = '$') {
    return `${symbol}${amount.toFixed(2)}`;
}

export function formatPhoneNumber(phone) {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Format for different regions
    if (cleaned.startsWith('254')) {
        // Kenya format
        return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
        // Local format, assume Kenya
        return `+254${cleaned.substring(1)}`;
    } else if (cleaned.length === 10) {
        // US format
        return `+1${cleaned}`;
    }

    return `+${cleaned}`;
}

export function generateSKU(name, category) {
    const nameCode = name.substring(0, 3).toUpperCase();
    const categoryCode = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();

    return `${categoryCode}-${nameCode}-${timestamp}`;
}

export function generateBarcode() {
    // Generate a simple 13-digit barcode (EAN-13 format)
    const prefix = '200'; // Internal use prefix
    const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    const code = prefix + random;

    // Calculate check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(code[i]);
        sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    return code + checkDigit;
}

export function validateBarcode(barcode) {
    if (!/^\d{13}$/.test(barcode)) {
        return false;
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(barcode[i]);
        sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    return checkDigit === parseInt(barcode[12]);
}

export function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
