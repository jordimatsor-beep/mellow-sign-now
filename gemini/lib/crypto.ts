import crypto from 'crypto';

/**
 * Calculates the SHA-256 hash of a buffer.
 * @param buffer The file buffer to hash.
 * @returns The hex string representation of the hash.
 */
export function calculateSHA256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}
