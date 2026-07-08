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
    if (digits.startsWith('234') && digits.length === 13) return digits;
    if (digits.startsWith('0') && digits.length === 11) return '234' + digits.slice(1);
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
  
  // Academic IDs
  matricNumber: (s: string): string => s.trim().toUpperCase().replace(/\s+/g, ''),
  studentNumber: (s: string): string => s.trim().toUpperCase().replace(/\s+/g, ''),
  staffNumber: (s: string): string => s.trim().toUpperCase().replace(/\s+/g, ''),
  jambRegNo: (s: string): string => s.trim().toUpperCase().replace(/\s+/g, ''),
  
  // Government IDs
  passportNo: (s: string): string => s.trim().toUpperCase().replace(/\s+/g, ''),
  driverLicense: (s: string): string => s.trim().toUpperCase().replace(/\s+/g, ''),
  voterId: (s: string): string => s.trim().toUpperCase().replace(/\s+/g, ''),
  
  // References
  receiptNo: (s: string): string => s.trim().toUpperCase().replace(/\s+/g, ''),
  receiptRef: (s: string): string => s.trim().toUpperCase().replace(/\s+/g, ''),
  transactionRef: (s: string): string => s.trim().toUpperCase().replace(/\s+/g, ''),
  applicationRef: (s: string): string => s.trim().toUpperCase().replace(/\s+/g, ''),
};

// ─────────────────────────────────────────────────────────────────────────────
// PROTECT — Encrypt on write
// ─────────────────────────────────────────────────────────────────────────────

/** Email: deterministic ciphertext + SHA-512 search hash for login resolver */
export async function protectEmail(raw: string) {
  const normal = normalize.email(raw);
  return {
    encrypted: encryptSearchable(normal, 'email'),
    searchHash: await generateSearchHash(normal, 'email'),
  };
}

/** Phone: deterministic ciphertext + SHA-512 search hash */
export async function protectPhone(raw: string) {
  const normal = normalize.phone(raw);
  return {
    encrypted: encryptSearchable(normal, 'phone'),
    searchHash: await generateSearchHash(normal, 'phone'),
  };
}

/** Username: deterministic ciphertext + SHA-512 search hash */
export async function protectUsername(raw: string) {
  const normal = normalize.username(raw);
  return {
    encrypted: encryptSearchable(normal, 'username'),
    searchHash: await generateSearchHash(normal, 'username'),
  };
}

/** NIN: deterministic ciphertext + SHA-512 search hash */
export async function protectNIN(raw: string) {
  const normal = normalize.nin(raw);
  return {
    encrypted: encryptSearchable(normal, 'nin'),
    searchHash: await generateSearchHash(normal, 'nin'),
  };
}

/** BVN: deterministic ciphertext + SHA-512 search hash */
export async function protectBVN(raw: string) {
  const normal = normalize.bvn(raw);
  return {
    encrypted: encryptSearchable(normal, 'bvn'),
    searchHash: await generateSearchHash(normal, 'bvn'),
  };
}

/** Name / fullName: deterministic ciphertext + SHA-512 search hash */
export async function protectName(raw: string) {
  const normal = normalize.name(raw);
  return {
    encrypted: encryptSearchable(normal, 'name'),
    searchHash: await generateSearchHash(normal, 'name'),
  };
}

/** Matric Number: deterministic ciphertext + SHA-512 search hash */
export async function protectMatricNumber(raw: string) {
  const normal = normalize.matricNumber(raw);
  return {
    encrypted: encryptSearchable(normal, 'matricNo'),
    searchHash: await generateSearchHash(normal, 'matricNo'),
  };
}

/** Student Number: deterministic ciphertext + SHA-512 search hash */
export async function protectStudentNumber(raw: string) {
  const normal = normalize.studentNumber(raw);
  return {
    encrypted: encryptSearchable(normal, 'studentNo'),
    searchHash: await generateSearchHash(normal, 'studentNo'),
  };
}

/** Staff Number: deterministic ciphertext + SHA-512 search hash */
export async function protectStaffNumber(raw: string) {
  const normal = normalize.staffNumber(raw);
  return {
    encrypted: encryptSearchable(normal, 'staffNo'),
    searchHash: await generateSearchHash(normal, 'staffNo'),
  };
}

/** JAMB Registration Number: deterministic ciphertext + SHA-512 search hash */
export async function protectJambRegNo(raw: string) {
  const normal = normalize.jambRegNo(raw);
  return {
    encrypted: encryptSearchable(normal, 'username'),
    searchHash: await generateSearchHash(normal, 'username'),
  };
}

/** Passport Number: deterministic ciphertext + SHA-512 search hash */
export async function protectPassportNo(raw: string) {
  const normal = normalize.passportNo(raw);
  return {
    encrypted: encryptSearchable(normal, 'passportNo'),
    searchHash: await generateSearchHash(normal, 'passportNo'),
  };
}

/** Driver License: deterministic ciphertext + SHA-512 search hash */
export async function protectDriverLicense(raw: string) {
  const normal = normalize.driverLicense(raw);
  return {
    encrypted: encryptSearchable(normal, 'driverLicense'),
    searchHash: await generateSearchHash(normal, 'driverLicense'),
  };
}

/** Voter ID: deterministic ciphertext + SHA-512 search hash */
export async function protectVoterId(raw: string) {
  const normal = normalize.voterId(raw);
  return {
    encrypted: encryptSearchable(normal, 'voterId'),
    searchHash: await generateSearchHash(normal, 'voterId'),
  };
}

/** Receipt Number: deterministic ciphertext + SHA-512 search hash */
export async function protectReceiptNo(raw: string) {
  const normal = normalize.receiptNo(raw);
  return {
    encrypted: encryptSearchable(normal, 'username'),
    searchHash: await generateSearchHash(normal, 'username'),
  };
}

/** Receipt Reference: deterministic ciphertext + SHA-512 search hash */
export async function protectReceiptRef(raw: string) {
  const normal = normalize.receiptRef(raw);
  return {
    encrypted: encryptSearchable(normal, 'receiptRef'),
    searchHash: await generateSearchHash(normal, 'receiptRef'),
  };
}

/** Transaction Reference: deterministic ciphertext + SHA-512 search hash */
export async function protectTransactionRef(raw: string) {
  const normal = normalize.transactionRef(raw);
  return {
    encrypted: encryptSearchable(normal, 'transactionRef'),
    searchHash: await generateSearchHash(normal, 'transactionRef'),
  };
}

/** Application Reference: deterministic ciphertext + SHA-512 search hash */
export async function protectApplicationRef(raw: string) {
  const normal = normalize.applicationRef(raw);
  return {
    encrypted: encryptSearchable(normal, 'applicationRef'),
    searchHash: await generateSearchHash(normal, 'applicationRef'),
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
  return decryptSearchable(encrypted, 'name');
}
export function revealText(encrypted: string): string {
  return decryptField(encrypted);
}
export function revealMatricNumber(encrypted: string): string {
  return decryptSearchable(encrypted, 'matricNo');
}
export function revealStudentNumber(encrypted: string): string {
  return decryptSearchable(encrypted, 'studentNo');
}
export function revealStaffNumber(encrypted: string): string {
  return decryptSearchable(encrypted, 'staffNo');
}
export function revealJambRegNo(encrypted: string): string {
  return decryptSearchable(encrypted, 'username');
}
export function revealPassportNo(encrypted: string): string {
  return decryptSearchable(encrypted, 'passportNo');
}
export function revealDriverLicense(encrypted: string): string {
  return decryptSearchable(encrypted, 'driverLicense');
}
export function revealVoterId(encrypted: string): string {
  return decryptSearchable(encrypted, 'voterId');
}
export function revealReceiptNo(encrypted: string): string {
  return decryptSearchable(encrypted, 'username');
}
export function revealReceiptRef(encrypted: string): string {
  return decryptSearchable(encrypted, 'receiptRef');
}
export function revealTransactionRef(encrypted: string): string {
  return decryptSearchable(encrypted, 'transactionRef');
}
export function revealApplicationRef(encrypted: string): string {
  return decryptSearchable(encrypted, 'applicationRef');
}

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
    // Identity & Contact
    email: normalize.email,
    phone: normalize.phone,
    username: normalize.username,
    
    // Government IDs
    nin: normalize.nin,
    bvn: normalize.bvn,
    passportNo: normalize.passportNo,
    driverLicense: normalize.driverLicense,
    voterId: normalize.voterId,
    
    // Academic IDs
    matricNo: normalize.matricNumber,
    staffNo: normalize.staffNumber,
    studentNo: normalize.studentNumber,
    
    // References
    receiptRef: normalize.receiptRef,
    transactionRef: normalize.transactionRef,
    applicationRef: normalize.applicationRef,
    
    // Personal
    name: normalize.name,
    maidenName: normalize.name,
  };
  return generateSearchHash(normalizers[field](input), field);
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT REGISTRATION HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Protect all student data for registration
 * Returns encrypted fields and search hashes for all student fields
 */
export async function protectStudentRegistration(data: {
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  matricNumber: string;
  jambRegNo: string;
  receiptNo?: string | null;
  receiptRef?: string | null;
}) {
  const [
    email,
    phone,
    firstName,
    lastName,
    otherNames,
    matricNumber,
    jambRegNo,
    receiptNo,
    receiptRef,
  ] = await Promise.all([
    protectEmail(data.email),
    data.phone ? protectPhone(data.phone) : Promise.resolve({ encrypted: null, searchHash: null }),
    protectName(data.firstName),
    protectName(data.lastName),
    data.otherNames ? protectName(data.otherNames) : Promise.resolve({ encrypted: null, searchHash: null }),
    protectMatricNumber(data.matricNumber),
    protectJambRegNo(data.jambRegNo),
    data.receiptNo ? protectReceiptNo(data.receiptNo) : Promise.resolve({ encrypted: null, searchHash: null }),
    data.receiptRef ? protectReceiptRef(data.receiptRef) : Promise.resolve({ encrypted: null, searchHash: null }),
  ]);

  return {
    email: email.encrypted,
    emailHash: email.searchHash,
    phone: phone?.encrypted || null,
    phoneHash: phone?.searchHash || null,
    firstName: firstName.encrypted,
    firstNameHash: firstName.searchHash,
    lastName: lastName.encrypted,
    lastNameHash: lastName.searchHash,
    otherNames: otherNames?.encrypted || null,
    otherNamesHash: otherNames?.searchHash || null,
    matricNumber: matricNumber.encrypted,
    matricNumberHash: matricNumber.searchHash,
    jambRegNo: jambRegNo.encrypted,
    jambRegNoHash: jambRegNo.searchHash,
    receiptNo: receiptNo?.encrypted || null,
    receiptNoHash: receiptNo?.searchHash || null,
    receiptRef: receiptRef?.encrypted || null,
    receiptRefHash: receiptRef?.searchHash || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF REGISTRATION HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Protect all staff data for registration
 * Returns encrypted fields and search hashes for all staff fields
 */
export async function protectStaffRegistration(data: {
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  staffNumber: string;
}) {
  const [
    email,
    phone,
    firstName,
    lastName,
    otherNames,
    staffNumber,
  ] = await Promise.all([
    protectEmail(data.email),
    data.phone ? protectPhone(data.phone) : Promise.resolve({ encrypted: null, searchHash: null }),
    protectName(data.firstName),
    protectName(data.lastName),
    data.otherNames ? protectName(data.otherNames) : Promise.resolve({ encrypted: null, searchHash: null }),
    protectStaffNumber(data.staffNumber),
  ]);

  return {
    email: email.encrypted,
    emailHash: email.searchHash,
    phone: phone?.encrypted || null,
    phoneHash: phone?.searchHash || null,
    firstName: firstName.encrypted,
    firstNameHash: firstName.searchHash,
    lastName: lastName.encrypted,
    lastNameHash: lastName.searchHash,
    otherNames: otherNames?.encrypted || null,
    otherNamesHash: otherNames?.searchHash || null,
    staffNumber: staffNumber.encrypted,
    staffNumberHash: staffNumber.searchHash,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED STUDENT DATA PROTECTION (Legacy - kept for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export async function protectStudentData(data: {
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  matricNumber: string;
  jambRegNo: string;
  receiptNo?: string | null;
  receiptRef?: string | null;
}) {
  return protectStudentRegistration(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED STAFF DATA PROTECTION (Legacy - kept for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export async function protectStaffData(data: {
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  staffNumber: string;
}) {
  return protectStaffRegistration(data);
}