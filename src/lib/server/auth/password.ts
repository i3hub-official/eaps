// src/lib/server/auth/password.ts
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const KEYLEN = 64;

/**
 * Hash a plain-text password.
 * Format: <salt_hex>:<hash_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

/**
 * Verify a plain-text password against a stored hash.
 * Timing-safe — safe against timing attacks.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [salt, hashHex] = stored.split(':');
    if (!salt || !hashHex) return false;
    const storedBuf = Buffer.from(hashHex, 'hex');
    const inputBuf = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
    return timingSafeEqual(storedBuf, inputBuf);
  } catch {
    return false;
  }
}