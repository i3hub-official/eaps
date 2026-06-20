// src/lib/security/encryption.ts

import { env } from '$env/dynamic/private';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// ENV VALIDATION — Fail fast (clear + strict)
// ─────────────────────────────────────────────────────────────────────────────
function mustHexEnv(name: string, raw: string | undefined, bytes: number): Buffer {
  if (!raw) throw new Error(`${name} is missing`);

  if (raw.length !== bytes * 2) {
    throw new Error(`${name} must be ${bytes * 2} hex chars (${bytes} bytes)`);
  }

  if (!/^[0-9a-fA-F]+$/.test(raw)) {
    throw new Error(`${name} must be valid hex`);
  }

  const buf = Buffer.from(raw, 'hex');

  if (buf.length !== bytes) {
    throw new Error(`${name} decoded length mismatch`);
  }

  return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYS (validated at startup)
// ─────────────────────────────────────────────────────────────────────────────
const ENCRYPTION_KEY = mustHexEnv('ENCRYPTION_KEY', env.ENCRYPTION_KEY, 32);

const FIXED_IV = {
  email:    mustHexEnv('FIXED_IV_EMAIL',    env.FIXED_IV_EMAIL,    16),
  phone:    mustHexEnv('FIXED_IV_PHONE',    env.FIXED_IV_PHONE,    16),
  username: mustHexEnv('FIXED_IV_USERNAME', env.FIXED_IV_USERNAME, 16),
  nin:      mustHexEnv('FIXED_IV_NIN',      env.FIXED_IV_NIN,      16),
  bvn:      mustHexEnv('FIXED_IV_BVN',      env.FIXED_IV_BVN,      16),
};

const SEARCH_HASH_PEPPER = (() => {
  const val = env.SEARCH_HASH_PEPPER;
  if (!val || val.length < 32) {
    throw new Error('SEARCH_HASH_PEPPER must be ≥ 32 characters');
  }
  return val;
})();

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
function assertValidHex(str: string, field: string): void {
  if (!str || str.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(str)) {
    throw new Error(
      `Corrupted encrypted data [${field}] — expected valid hex, got "${str?.slice(0, 50)}..." (len: ${str?.length || 0})`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: Searchable Deterministic Encryption (AES-256-CBC + Fixed IV)
// ─────────────────────────────────────────────────────────────────────────────
export type SearchableField = 'email' | 'phone' | 'username' | 'nin' | 'bvn';

export function encryptSearchable(data: string, field: SearchableField): string {
  if (!data) throw new Error(`Cannot encrypt empty ${field}`);

  const iv = FIXED_IV[field];

  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(data.trim(), 'utf8'),
    cipher.final()
  ]);

  return encrypted.toString('hex');
}

export function decryptSearchable(encryptedData: string, field: SearchableField): string {
  assertValidHex(encryptedData, field);

  const iv = FIXED_IV[field];

  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

  return (
    decipher.update(Buffer.from(encryptedData, 'hex'), undefined, 'utf8') +
    decipher.final('utf8')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: Random-IV Encryption (AES-256-CBC)
// ─────────────────────────────────────────────────────────────────────────────
export function encryptField(data: string): string {
  if (!data) throw new Error('Cannot encrypt empty field');

  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(data, 'utf8'),
    cipher.final()
  ]);

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptField(encryptedData: string): string {
  const sep = encryptedData.indexOf(':');

  if (sep === -1) {
    throw new Error('Invalid encrypted field format (missing colon)');
  }

  const ivHex  = encryptedData.slice(0, sep);
  const encHex = encryptedData.slice(sep + 1);

  assertValidHex(ivHex,  'IV');
  assertValidHex(encHex, 'Encrypted');

  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    ENCRYPTION_KEY,
    Buffer.from(ivHex, 'hex')
  );

  return (
    decipher.update(Buffer.from(encHex, 'hex'), undefined, 'utf8') +
    decipher.final('utf8')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3: AES-256-GCM — Authenticated Encryption
// ─────────────────────────────────────────────────────────────────────────────
export function encryptSecure(data: string): string {
  if (!data) throw new Error('Cannot encrypt empty secure payload');

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(data, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecure(encryptedData: string): string {
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid GCM format: expected iv:authTag:encrypted');
  }

  const [ivHex, authTagHex, encHex] = parts;

  assertValidHex(ivHex,       'GCM IV');
  assertValidHex(authTagHex,  'GCM AuthTag');
  assertValidHex(encHex,      'GCM Encrypted');

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  return (
    decipher.update(Buffer.from(encHex, 'hex'), undefined, 'utf8') +
    decipher.final('utf8')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCHABLE HASH (SHA-512 + pepper)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateSearchHash(
  input: string,
  context: SearchableField
): Promise<string> {
  if (!input) throw new Error('Cannot hash empty input');

  const encoder = new TextEncoder();

  const data = encoder.encode(
    `${context.toLowerCase()}::${input.trim()}::${SEARCH_HASH_PEPPER}`
  );

  const hashBuffer = await crypto.subtle.digest('SHA-512', data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
