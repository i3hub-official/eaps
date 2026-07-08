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
  // Identity & Contact
  email:        mustHexEnv('FIXED_IV_EMAIL',        env.FIXED_IV_EMAIL,        16),
  phone:        mustHexEnv('FIXED_IV_PHONE',        env.FIXED_IV_PHONE,        16),
  username:     mustHexEnv('FIXED_IV_USERNAME',     env.FIXED_IV_USERNAME,     16),
  
  // Government IDs
  nin:          mustHexEnv('FIXED_IV_NIN',          env.FIXED_IV_NIN,          16),
  bvn:          mustHexEnv('FIXED_IV_BVN',          env.FIXED_IV_BVN,          16),
  passportNo:   mustHexEnv('FIXED_IV_PASSPORT',     env.FIXED_IV_PASSPORT,     16),
  driverLicense: mustHexEnv('FIXED_IV_DRIVER_LICENSE', env.FIXED_IV_DRIVER_LICENSE, 16),
  voterId:      mustHexEnv('FIXED_IV_VOTER_ID',     env.FIXED_IV_VOTER_ID,     16),
  
  // Academic IDs
  matricNo:     mustHexEnv('FIXED_IV_MATRIC',       env.FIXED_IV_MATRIC,       16),
  staffNo:      mustHexEnv('FIXED_IV_STAFF',        env.FIXED_IV_STAFF,        16),
  studentNo:    mustHexEnv('FIXED_IV_STUDENT',      env.FIXED_IV_STUDENT,      16),
  
  // Reference Numbers
  receiptRef:   mustHexEnv('FIXED_IV_RECEIPT_REF',  env.FIXED_IV_RECEIPT_REF,  16),
  transactionRef: mustHexEnv('FIXED_IV_TRANSACTION_REF', env.FIXED_IV_TRANSACTION_REF, 16),
  applicationRef: mustHexEnv('FIXED_IV_APPLICATION_REF', env.FIXED_IV_APPLICATION_REF, 16),
  
  // Personal Identifiers
  name:         mustHexEnv('FIXED_IV_NAME',         env.FIXED_IV_NAME,         16),
  maidenName:   mustHexEnv('FIXED_IV_MAIDEN_NAME',  env.FIXED_IV_MAIDEN_NAME,  16),
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

export type SearchableField = 
  // Identity & Contact
  | 'email' | 'phone' | 'username'
  // Government IDs
  | 'nin' | 'bvn' | 'passportNo' | 'driverLicense' | 'voterId'
  // Academic IDs
  | 'matricNo' | 'staffNo' | 'studentNo'
  // Reference Numbers
  | 'receiptRef' | 'transactionRef' | 'applicationRef'
  // Personal Identifiers
  | 'name' | 'maidenName';

export function encryptSearchable(data: string, field: SearchableField): string {
  if (!data) throw new Error(`Cannot encrypt empty ${field}`);
  if (!FIXED_IV[field]) throw new Error(`No FIXED_IV defined for field: ${field}`);

  const cipher    = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, FIXED_IV[field]);
  const encrypted = Buffer.concat([
    cipher.update(data.trim(), 'utf8'),
    cipher.final(),
  ]);

  return encrypted.toString('hex');
}

export function decryptSearchable(encryptedData: string, field: SearchableField): string {
  assertValidHex(encryptedData, field);
  if (!FIXED_IV[field]) throw new Error(`No FIXED_IV defined for field: ${field}`);

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
// TIER 4: Context-Aware Data Protection (HIGH-LEVEL API)
// ─────────────────────────────────────────────────────────────────────────────
//
// This is the recommended API for the rest of the application.
// It automatically selects the right encryption tier based on the data type
// and provides consistent interfaces for encryption + search hash generation.

export type DataCategory = 
  // PII - Personally Identifiable Information
  | 'email' | 'phone' | 'fullName' | 'firstName' | 'lastName' | 'maidenName'
  // Government IDs
  | 'nin' | 'bvn' | 'passportNo' | 'driverLicense' | 'voterId'
  // Academic IDs
  | 'matricNo' | 'staffNo' | 'studentNo' | 'jambRegNo'
  // References
  | 'receiptRef' | 'transactionRef' | 'applicationRef'
  // Address & Location
  | 'address' | 'city' | 'state' | 'country' | 'postalCode'
  // Financial
  | 'bankAccount' | 'bankCode' | 'accountNumber'
  // Authentication
  | 'username' | 'password' | 'securityQuestion' | 'securityAnswer'
  // Other
  | 'biometric' | 'faceDescriptor' | 'signature';

export interface ProtectedData {
  encrypted: string;      // Encrypted value (stored in DB)
  searchHash: string;     // Searchable hash (stored in DB index)
  searchable: boolean;    // Whether this field supports search
}

/**
 * Protect data with automatic tier selection based on category
 */
export async function protectData(
  data: string,
  category: DataCategory
): Promise<ProtectedData> {
  if (!data) {
    return {
      encrypted: '',
      searchHash: '',
      searchable: false
    };
  }

  // Determine if field should be searchable
  const searchableFields: DataCategory[] = [
    'email', 'phone', 'username', 'nin', 'bvn', 
    'matricNo', 'staffNo', 'studentNo', 'jambRegNo',
    'receiptRef', 'transactionRef', 'applicationRef',
    'passportNo', 'driverLicense', 'voterId',
    'firstName', 'lastName', 'fullName', 'maidenName'
  ];

  const isSearchable = searchableFields.includes(category);

  let encrypted: string;
  let searchHash: string = '';

  // Select encryption tier
  if (isSearchable) {
    // Tier 1: Searchable deterministic encryption
    const field = category as SearchableField;
    encrypted = encryptSearchable(data, field);
    searchHash = await generateSearchHash(data, field);
  } else if (category === 'biometric' || category === 'faceDescriptor' || category === 'signature') {
    // Tier 3: Authenticated encryption for biometrics
    encrypted = encryptSecure(data);
  } else {
    // Tier 2: Random IV encryption for everything else
    encrypted = encryptField(data);
  }

  return {
    encrypted,
    searchHash,
    searchable: isSearchable
  };
}

/**
 * Decrypt protected data
 */
export function decryptProtectedData(
  encryptedData: string,
  category: DataCategory
): string {
  if (!encryptedData) return '';

  // Check if it's encrypted with Tier 1 (searchable) - hex only
  if (/^[0-9a-fA-F]+$/.test(encryptedData) && !encryptedData.includes(':')) {
    const field = category as SearchableField;
    return decryptSearchable(encryptedData, field);
  }

  // Check if it's Tier 2 (random IV with colon)
  if (encryptedData.includes(':') && encryptedData.split(':').length === 2) {
    return decryptField(encryptedData);
  }

  // Check if it's Tier 3 (GCM with two colons)
  if (encryptedData.split(':').length === 3) {
    return decryptSecure(encryptedData);
  }

  throw new Error(`Unable to determine encryption tier for data: ${encryptedData.slice(0, 50)}...`);
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

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Protect email (alias for protectData with email category)
 */
export async function protectEmail(email: string): Promise<ProtectedData> {
  return protectData(email, 'email');
}

/**
 * Protect phone number (alias for protectData with phone category)
 */
export async function protectPhone(phone: string): Promise<ProtectedData> {
  return protectData(phone, 'phone');
}

/**
 * Protect NIN (alias for protectData with nin category)
 */
export async function protectNIN(nin: string): Promise<ProtectedData> {
  return protectData(nin, 'nin');
}

/**
 * Protect BVN (alias for protectData with bvn category)
 */
export async function protectBVN(bvn: string): Promise<ProtectedData> {
  return protectData(bvn, 'bvn');
}

/**
 * Protect matric number (alias for protectData with matricNo category)
 */
export async function protectMatricNo(matricNo: string): Promise<ProtectedData> {
  return protectData(matricNo, 'matricNo');
}

/**
 * Protect receipt reference (alias for protectData with receiptRef category)
 */
export async function protectReceiptRef(receiptRef: string): Promise<ProtectedData> {
  return protectData(receiptRef, 'receiptRef');
}

/**
 * Protect transaction reference (alias for protectData with transactionRef category)
 */
export async function protectTransactionRef(transactionRef: string): Promise<ProtectedData> {
  return protectData(transactionRef, 'transactionRef');
}

/**
 * Protect JAMB registration number (alias for protectData with jambRegNo category)
 */
export async function protectJambRegNo(jambRegNo: string): Promise<ProtectedData> {
  return protectData(jambRegNo, 'jambRegNo');
}