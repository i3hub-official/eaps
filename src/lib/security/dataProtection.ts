// src/lib/security/dataProtection.ts
import {
  encryptSearchable,
  decryptSearchable,
  encryptField,
  decryptField,
  encryptSecure,
  decryptSecure,
  generateSearchHash,
  type SearchableField,
} from '$lib/security/encryption';

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────
const normalize = {
  email: (s: string): string =>
    s.trim().toLowerCase().replace(/\s+/g, ''),

  phone: (s: string): string => {
    const digits = s.replace(/[^0-9+]/g, '');
    if (digits.startsWith('234')  && digits.length === 13) return digits;
    if (digits.startsWith('0')    && digits.length === 11) return '234' + digits.slice(1);
    if (digits.startsWith('+234') && digits.length === 14) return digits.slice(1);
    return digits;
  },

  username: (s: string): string =>
    s.trim().toLowerCase().replace(/\s+/g, ''),

  name: (s: string): string =>
    s.trim().replace(/\s+/g, ' ').replace(/\w\S*/g, w =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ),
  
  nin: (s: string): string =>
    s.trim().replace(/[^0-9]/g, ''),
  
  bvn: (s: string): string =>
    s.trim().replace(/[^0-9]/g, ''),
};

// ─────────────────────────────────────────────────────────────────────────────
// PROTECT — Encrypt on write
// ─────────────────────────────────────────────────────────────────────────────

/** Email: searchable (deterministic) + search hash for login resolver */
export async function protectEmail(raw: string) {
  const normal = normalize.email(raw);
  return {
    encrypted:  encryptSearchable(normal, 'email'),
    searchHash: await generateSearchHash(normal, 'email'),
  };
}

/** Phone: searchable (deterministic) + search hash */
export async function protectPhone(raw: string) {
  const normal = normalize.phone(raw);
  return {
    encrypted:  encryptSearchable(normal, 'phone'),
    searchHash: await generateSearchHash(normal, 'phone'),
  };
}

/** Username: searchable (deterministic) + search hash */
export async function protectUsername(raw: string) {
  const normal = normalize.username(raw);
  return {
    encrypted:  encryptSearchable(normal, 'username'),
    searchHash: await generateSearchHash(normal, 'username'),
  };
}

/** NIN: searchable (deterministic) for verification */
export async function protectNIN(raw: string) {
  const normal = normalize.nin(raw);
  return {
    encrypted:  encryptSearchable(normal, 'nin'),
    searchHash: await generateSearchHash(normal, 'nin'),
  };
}

/** BVN: searchable (deterministic) for verification */
export async function protectBVN(raw: string) {
  const normal = normalize.bvn(raw);
  return {
    encrypted:  encryptSearchable(normal, 'bvn'),
    searchHash: await generateSearchHash(normal, 'bvn'),
  };
}

/** Name / firstName / lastName: random-IV, not searchable */
export function protectName(raw: string): string {
  return encryptField(normalize.name(raw));
}

/** Address, city, country, bio: random-IV */
export function protectText(raw: string): string {
  return encryptField(raw.trim());
}

/** kycData jsonb blob: GCM authenticated encryption */
export function protectKycData(raw: object): string {
  return encryptSecure(JSON.stringify(raw));
}

// ─────────────────────────────────────────────────────────────────────────────
// UNPROTECT — Decrypt on read
// ─────────────────────────────────────────────────────────────────────────────

export function revealEmail(encrypted: string): string {
  return decryptSearchable(encrypted, 'email');
}

export function revealPhone(encrypted: string): string {
  return decryptSearchable(encrypted, 'phone');
}

export function revealUsername(encrypted: string): string {
  return decryptSearchable(encrypted, 'username');
}

export function revealNIN(encrypted: string): string {
  return decryptSearchable(encrypted, 'nin');
}

export function revealBVN(encrypted: string): string {
  return decryptSearchable(encrypted, 'bvn');
}

export function revealName(encrypted: string): string {
  return decryptField(encrypted);
}

export function revealText(encrypted: string): string {
  return decryptField(encrypted);
}

export function revealKycData<T = object>(encrypted: string): T {
  return JSON.parse(decryptSecure(encrypted)) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH HASH LOOKUP — Used in login resolver
// ─────────────────────────────────────────────────────────────────────────────
export async function searchHashFor(
  input: string,
  field: SearchableField
): Promise<string> {
  const normalizers: Record<SearchableField, (s: string) => string> = {
    email:    normalize.email,
    phone:    normalize.phone,
    username: normalize.username,
  };
  return generateSearchHash(normalizers[field](input), field);
}