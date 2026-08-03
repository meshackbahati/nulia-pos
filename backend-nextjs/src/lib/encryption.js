import crypto from 'crypto';

const ***REMOVED*** = process.env.***REMOVED*** || 'default-key-for-development-only-32';
const ALGORITHM = 'aes-256-gcm';

// Derive a fixed-length key (32 bytes for aes-256)
const KEY = crypto.scryptSync(***REMOVED***, 'salt', 32);

export function encrypt(text) {
    try {
        const iv = crypto.randomBytes(12); // Standard IV length for GCM
        const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

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

        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        // Handle specific decryption errors gracefully
        if (error.message.includes('Unsupported state or unable to authenticate data')) {
            console.error('Decryption failed: Key mismatch or tampered data (AuthTag mismatch)');
            return null;
        }
        if (error.message.includes('Invalid encrypted data format')) {
            console.error('Decryption failed: Invalid format');
            return null;
        }

        console.error('Unexpected decryption error:', error);
        return null;
    }
}

export function hashPassword(password) {
    return crypto.createHash('sha256').update(password + ***REMOVED***).digest('hex');
}

export function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}
