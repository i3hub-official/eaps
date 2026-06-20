// ═══════════════════════════════════════════════════════════════════════════════
// FILE 1 of 4
// src/lib/server/db/faces.ts  — REPLACE ENTIRE FILE
// ═══════════════════════════════════════════════════════════════════════════════
//
// Face descriptor protection model:
//
//   STORAGE  — AES-256-GCM (encryptSecure / decryptSecure)
//              Random IV per write. Authenticated — tamper-evident.
//              Stored as "iv:authTag:ciphertext" string in the DB column.
//
//   WHY NOT deterministic / searchable?
//     Two captures of the same face produce SIMILAR but NOT IDENTICAL float
//     arrays. Deterministic encryption would make them look completely
//     different. There is no way to compare encrypted embeddings without
//     decrypting first. We decrypt in the application layer, compare, discard.
 
import { getPrismaClient } from './index.js';
import { encryptSecure, decryptSecure } from '$lib/security/encryption.js';
 
// ─── Codec ────────────────────────────────────────────────────────────────────
 
function encryptDescriptor(descriptor: number[]): string {
  return encryptSecure(JSON.stringify(descriptor));
}
 
function decryptDescriptor(stored: string): number[] {
  return JSON.parse(decryptSecure(stored)) as number[];
}
 
/**
 * Handles both encrypted strings (post-migration) and raw JSON arrays
 * (pre-migration legacy rows). Once the migration script has run,
 * the raw-JSON branch can be removed.
 */
function safeDecrypt(stored: string | number[] | unknown): number[] {
  if (Array.isArray(stored)) return stored as number[];
  const s = stored as string;
  if (s.includes(':')) return decryptDescriptor(s);   // encrypted format
  return JSON.parse(s) as number[];                   // legacy raw JSON
}
 
// ─── Save / update ────────────────────────────────────────────────────────────
 
export async function saveFaceDescriptor(
  studentId:  string,
  descriptor: number[],
  dimension:  number,
) {
  const prisma    = await getPrismaClient();
  const encrypted = encryptDescriptor(descriptor);
 
  return prisma.faceDescriptor.upsert({
    where:  { studentId },
    update: {
      descriptor:          encrypted,
      embedding_dimension: dimension,
      updatedAt:           new Date(),
    },
    create: {
      studentId,
      descriptor:          encrypted,
      embedding_dimension: dimension,
    },
  });
}
 
// ─── Read ─────────────────────────────────────────────────────────────────────
 
export async function getFaceDescriptor(studentId: string): Promise<number[] | null> {
  const prisma = await getPrismaClient();
 
  const row = await prisma.faceDescriptor.findUnique({
    where:  { studentId },
    select: { descriptor: true },
  });
 
  if (!row) return null;
  return safeDecrypt(row.descriptor as string);
}
 
export async function getFaceDescriptorWithMeta(studentId: string) {
  const prisma  = await getPrismaClient();
  const result  = await prisma.faceDescriptor.findUnique({ where: { studentId } });
  if (!result) return null;
 
  return {
    descriptor: safeDecrypt(result.descriptor as string),
    dimension:  result.embedding_dimension,
    enrolledAt: result.enrolledAt,
    updatedAt:  result.updatedAt,
  };
}
 
export async function isFaceEnrolled(studentId: string): Promise<boolean> {
  const prisma = await getPrismaClient();
  const count  = await prisma.faceDescriptor.count({ where: { studentId } });
  return count > 0;
}
 
// ─── Cross-student duplicate check ────────────────────────────────────────────
 
export async function getAllDescriptorsExcept(
  excludeStudentId: string,
): Promise<Array<{ studentId: string; descriptor: number[] }>> {
  const prisma = await getPrismaClient();
 
  const rows = await prisma.faceDescriptor.findMany({
    where:  { studentId: { not: excludeStudentId } },
    select: { studentId: true, descriptor: true },
  });
 
  const result: Array<{ studentId: string; descriptor: number[] }> = [];
 
  for (const row of rows) {
    try {
      result.push({
        studentId:  row.studentId,
        descriptor: safeDecrypt(row.descriptor as string),
      });
    } catch {
      console.error(`[faces] Could not decrypt descriptor for student=${row.studentId}`);
    }
  }
 
  return result;
}
 
// ─── Delete ───────────────────────────────────────────────────────────────────
 
export async function deleteFaceDescriptor(studentId: string): Promise<void> {
  const prisma = await getPrismaClient();
  await prisma.faceDescriptor.delete({ where: { studentId } }).catch(() => {});
}
 
// ─── Verification log ─────────────────────────────────────────────────────────
 
export async function logVerification(opts: {
  studentId:       string;
  examId?:         string | null;
  similarityScore: number;
  success:         boolean;
  ipAddress?:      string | null;
  userAgent?:      string | null;
}): Promise<void> {
  const prisma = await getPrismaClient();
 
  await prisma.faceVerificationLog.create({
    data: {
      studentId:       opts.studentId,
      examId:          opts.examId ?? null,
      similarityScore: opts.similarityScore,
      distance:        null,
      success:         opts.success,
      ipAddress:       opts.ipAddress ?? null,
      userAgent:       opts.userAgent ?? null,
    },
  });
}
 
// ─── Math ─────────────────────────────────────────────────────────────────────
 
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}
 
export const FACE_THRESHOLDS = {
  match: 0.72,
  soft:  0.60,
} as const;
 
// ─── Admin: audit existing enrollments for duplicates ─────────────────────────
 
export async function findAllDuplicateEnrollments(): Promise<Array<{
  studentIdA: string;
  studentIdB: string;
  similarity: number;
}>> {
  const prisma = await getPrismaClient();
 
  const rows = await prisma.faceDescriptor.findMany({
    select: { studentId: true, descriptor: true },
  });
 
  const parsed: Array<{ studentId: string; descriptor: number[] }> = [];
 
  for (const row of rows) {
    try {
      parsed.push({
        studentId:  row.studentId,
        descriptor: safeDecrypt(row.descriptor as string),
      });
    } catch {
      console.error(`[faces] audit: could not decrypt student=${row.studentId}`);
    }
  }
 
  const duplicates: Array<{ studentIdA: string; studentIdB: string; similarity: number }> = [];
 
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i];
      const b = parsed[j];
      if (a.descriptor.length !== b.descriptor.length) continue;
      const sim = cosineSimilarity(a.descriptor, b.descriptor);
      if (sim >= FACE_THRESHOLDS.match) {
        duplicates.push({
          studentIdA: a.studentId,
          studentIdB: b.studentId,
          similarity: sim,
        });
      }
    }
  }
 
  return duplicates.sort((a, b) => b.similarity - a.similarity);
}