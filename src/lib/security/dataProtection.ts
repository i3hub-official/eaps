// src/lib/security/dataProtection.ts
//
// High-level API over encryption.ts.
// Consumers (DB write paths, login resolver) import from here — never from
// encryption.ts directly. This keeps the tier selection in one place.
//
// ── Lookup pattern for searchable fields (email, phone, username, NIN, BVN) ──
//
//   WRITE  → store both `encrypted` (for decryption on read) and
//             `searchHash` (for DB index lookup — goes in a separate column).
//
//   LOOKUP → hash the incoming value with searchHashFor(), query the DB
//             by the hash column, then decrypt the matched row for display.
//             NEVER query by the encrypted column — two rows with identical
//             plaintext share the same ciphertext (fixed-IV by design) but
//             the hash is what the index is built on.
//
//   Example (login resolver in users.ts):
//     const hash = await searchHashFor(email, 'email');
//     const user = await prisma.user.findUnique({ where: { emailHash: hash } });
//     const plainEmail = revealEmail(user.email);

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
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    ),

  nin: (s: string): string => s.trim().replace(/[^0-9]/g, ''),
  bvn: (s: string): string => s.trim().replace(/[^0-9]/g, ''),
};

// ─────────────────────────────────────────────────────────────────────────────
// PROTECT — Encrypt on write
// ─────────────────────────────────────────────────────────────────────────────

/** Email: deterministic ciphertext + SHA-512 search hash for login resolver */
export async function protectEmail(raw: string) {
  const normal = normalize.email(raw);
  return {
    encrypted:  encryptSearchable(normal, 'email'),
    searchHash: await generateSearchHash(normal, 'email'),
  };
}

/** Phone: deterministic ciphertext + SHA-512 search hash */
export async function protectPhone(raw: string) {
  const normal = normalize.phone(raw);
  return {
    encrypted:  encryptSearchable(normal, 'phone'),
    searchHash: await generateSearchHash(normal, 'phone'),
  };
}

/** Username: deterministic ciphertext + SHA-512 search hash */
export async function protectUsername(raw: string) {
  const normal = normalize.username(raw);
  return {
    encrypted:  encryptSearchable(normal, 'username'),
    searchHash: await generateSearchHash(normal, 'username'),
  };
}

/** NIN: deterministic ciphertext + SHA-512 search hash */
export async function protectNIN(raw: string) {
  const normal = normalize.nin(raw);
  return {
    encrypted:  encryptSearchable(normal, 'nin'),
    searchHash: await generateSearchHash(normal, 'nin'),
  };
}

/** BVN: deterministic ciphertext + SHA-512 search hash */
export async function protectBVN(raw: string) {
  const normal = normalize.bvn(raw);
  return {
    encrypted:  encryptSearchable(normal, 'bvn'),
    searchHash: await generateSearchHash(normal, 'bvn'),
  };
}

/** Name / fullName: deterministic ciphertext + SHA-512 search hash */
export async function protectName(raw: string) {
  const normal = normalize.name(raw);
  return {
    encrypted:  encryptSearchable(normal, 'name'),
    searchHash: await generateSearchHash(normal, 'name'),
  };
}

/** Address, city, country, bio: random-IV CBC */
export function protectText(raw: string): string {
  return encryptField(raw.trim());
}

/** kycData jsonb blob: AES-256-GCM authenticated encryption */
export function protectKycData(raw: object): string {
  return encryptSecure(JSON.stringify(raw));
}

// ─────────────────────────────────────────────────────────────────────────────
// UNPROTECT — Decrypt on read
// ─────────────────────────────────────────────────────────────────────────────

export function revealEmail(encrypted: string):    string { return decryptSearchable(encrypted, 'email'); }
export function revealPhone(encrypted: string):    string { return decryptSearchable(encrypted, 'phone'); }
export function revealUsername(encrypted: string): string { return decryptSearchable(encrypted, 'username'); }
export function revealNIN(encrypted: string):      string { return decryptSearchable(encrypted, 'nin'); }
export function revealBVN(encrypted: string):      string { return decryptSearchable(encrypted, 'bvn'); }
export function revealName(encrypted: string):     string { return decryptSearchable(encrypted, 'name'); }
export function revealText(encrypted: string):     string { return decryptField(encrypted); }

export function revealKycData<T = object>(encrypted: string): T {
  return JSON.parse(decryptSecure(encrypted)) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH HASH — Used by login resolver and other lookup paths
// ─────────────────────────────────────────────────────────────────────────────
//
// Always normalise the input before hashing — the same normalisation that
// was applied at write time — so the hash matches.

export async function searchHashFor(
  input: string,
  field: SearchableField,
): Promise<string> {
  const normalizers: Record<SearchableField, (s: string) => string> = {
    email:    normalize.email,
    phone:    normalize.phone,
    username: normalize.username,
    nin:      normalize.nin,
    bvn:      normalize.bvn,
    name:     normalize.name,
  };
  return generateSearchHash(normalizers[field](input), field);
}