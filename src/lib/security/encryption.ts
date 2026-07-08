// src/lib/security/encryption.ts

import { env }    from '$env/dynamic/private';
import crypto     from 'crypto';

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

// ── Fixed IVs for deterministic (searchable) encryption ──────────────────────
//
// INTENTIONALLY FIXED — do NOT replace these with random IVs.
//
// Tier-1 (encryptSearchable) uses a per-field fixed IV so that the same
// normalised input always produces the same ciphertext. This allows the DB
// to store the encrypted value and find a row by encrypting the login
// input and comparing — without decrypting every row.
//
// The trade-off (identical plaintext → identical ciphertext) is acceptable
// because:
//   a) The plaintext space is low-entropy by nature (emails, phone numbers).
//   b) Lookup is done via the separate SEARCH_HASH (SHA-512 + pepper), not
//      the ciphertext itself. The ciphertext is used for decryption only.
//   c) Each field uses a DIFFERENT fixed IV, so email ciphertext for "foo"
//      is different from phone ciphertext for "foo".
//
// NEVER use these IVs for Tier-2 (encryptField) or Tier-3 (encryptSecure).

const FIXED_IV = {
  email:    mustHexEnv('FIXED_IV_EMAIL',    env.FIXED_IV_EMAIL,    16),
  phone:    mustHexEnv('FIXED_IV_PHONE',    env.FIXED_IV_PHONE,    16),
  username: mustHexEnv('FIXED_IV_USERNAME', env.FIXED_IV_USERNAME, 16),
  nin:      mustHexEnv('FIXED_IV_NIN',      env.FIXED_IV_NIN,      16),
  bvn:      mustHexEnv('FIXED_IV_BVN',      env.FIXED_IV_BVN,      16),
  name:     mustHexEnv('FIXED_IV_NAME',     env.FIXED_IV_NAME,     16),
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
      `Corrupted encrypted data [${field}] — expected valid hex, ` +
      `got "${str?.slice(0, 50)}…" (len: ${str?.length ?? 0})`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: Searchable Deterministic Encryption (AES-256-CBC + Fixed IV)
// ─────────────────────────────────────────────────────────────────────────────
//
// USE FOR: email, phone, username, NIN, BVN — fields you need to look up.
// DO NOT USE FOR: anything that benefits from IND-CPA security (use Tier 2/3).
//
// Two users with the same email will produce the SAME ciphertext. This is
// intentional. The SEARCH_HASH (below) is what goes in the DB index for login
// resolution — the ciphertext is stored for decryption on read only.

export type SearchableField = 'email' | 'phone' | 'username' | 'nin' | 'bvn' | 'name';

export function encryptSearchable(data: string, field: SearchableField): string {
  if (!data) throw new Error(`Cannot encrypt empty ${field}`);

  const cipher    = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, FIXED_IV[field]);
  const encrypted = Buffer.concat([
    cipher.update(data.trim(), 'utf8'),
    cipher.final(),
  ]);

  return encrypted.toString('hex');
}

export function decryptSearchable(encryptedData: string, field: SearchableField): string {
  assertValidHex(encryptedData, field);

  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, FIXED_IV[field]);

  return (
    decipher.update(Buffer.from(encryptedData, 'hex'), undefined, 'utf8') +
    decipher.final('utf8')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2: Random-IV Encryption (AES-256-CBC)
// ─────────────────────────────────────────────────────────────────────────────
//
// USE FOR: names, addresses, bio, non-searchable PII.
// Stored as "iv_hex:ciphertext_hex".
// Each call produces a different ciphertext — IND-CPA secure.

export function encryptField(data: string): string {
  if (!data) throw new Error('Cannot encrypt empty field');

  const iv        = crypto.randomBytes(16);
  const cipher    = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptField(encryptedData: string): string {
  const sep = encryptedData.indexOf(':');

  if (sep === -1) {
    throw new Error('Invalid encrypted field format (missing colon separator)');
  }

  const ivHex  = encryptedData.slice(0, sep);
  const encHex = encryptedData.slice(sep + 1);

  assertValidHex(ivHex,  'IV');
  assertValidHex(encHex, 'Encrypted');

  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    ENCRYPTION_KEY,
    Buffer.from(ivHex, 'hex'),
  );

  return (
    decipher.update(Buffer.from(encHex, 'hex'), undefined, 'utf8') +
    decipher.final('utf8')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3: AES-256-GCM — Authenticated Encryption
// ─────────────────────────────────────────────────────────────────────────────
//
// USE FOR: face descriptors, KYC blobs, any payload where tamper-detection
// is critical in addition to confidentiality.
// Stored as "iv_hex:authTag_hex:ciphertext_hex".
// Decryption will throw if the ciphertext has been modified.

export function encryptSecure(data: string): string {
  if (!data) throw new Error('Cannot encrypt empty secure payload');

  const iv        = crypto.randomBytes(12);
  const cipher    = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const authTag   = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecure(encryptedData: string): string {
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid GCM format: expected "iv:authTag:encrypted"');
  }

  const [ivHex, authTagHex, encHex] = parts;

  assertValidHex(ivHex,      'GCM IV');
  assertValidHex(authTagHex, 'GCM AuthTag');
  assertValidHex(encHex,     'GCM Encrypted');

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(ivHex, 'hex'),
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  return (
    decipher.update(Buffer.from(encHex, 'hex'), undefined, 'utf8') +
    decipher.final('utf8')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH HASH (SHA-512 + pepper)
// ─────────────────────────────────────────────────────────────────────────────
//
// This is what gets stored in the DB index for login resolution.
// The ciphertext (Tier 1) is for decryption on read.
// The hash is for lookup without decrypting every row.
//
// Format: context::normalised_value::pepper  →  SHA-512  →  hex string
// The context prefix prevents cross-field hash collisions
// (same value in email vs phone produces different hashes).

export async function generateSearchHash(
  input:   string,
  context: SearchableField,
): Promise<string> {
  if (!input) throw new Error('Cannot hash empty input');

  const encoder = new TextEncoder();
  const data    = encoder.encode(
    `${context.toLowerCase()}::${input.trim()}::${SEARCH_HASH_PEPPER}`,
  );

  const hashBuffer = await crypto.subtle.digest('SHA-512', data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}