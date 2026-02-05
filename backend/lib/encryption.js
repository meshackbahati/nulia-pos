import crypto from 'crypto';

const ***REMOVED*** = process.env.***REMOVED*** || 'default-key-for-development-only-32';
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text) {
    try {
        const iv = crypto.randomBytes(16);
        // Note: crypto.createCipher is deprecated, using createCipheriv for better ESM compatibility if we were refactoring for real,
        // but sticking to the logic provided while removing types.
        const cipher = crypto.createCipher(ALGORITHM, ***REMOVED***);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

export function decrypt(encryptedData) {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        const decipher = crypto.createDecipher(ALGORITHM, ***REMOVED***);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

export function hashPassword(password) {
    return crypto.createHash('sha256').update(password + ***REMOVED***).digest('hex');
}

export function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}
