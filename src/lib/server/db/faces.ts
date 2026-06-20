// src/lib/server/db/faces.ts
//
// Works with @vladmandic/human descriptors.
// human's MobileFaceNet produces 512-d embeddings; the JSON column in
// face_descriptors stores them as a plain number[] so any descriptor
// size is handled transparently — no schema migration needed.

import { getPrismaClient } from './index.js';
// ─── Save / update ────────────────────────────────────────────────────────────

export async function saveFaceDescriptor(studentId: string, descriptor: number[], dimension: number) {
const prisma = await getPrismaClient();

  return prisma.faceDescriptor.upsert({
    where: { studentId },
    update: {
      descriptor,
      embedding_dimension: dimension,
      updatedAt: new Date(),
    },
    create: {
      studentId,
      descriptor,
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

  // Prisma returns Json — coerce safely
  return Array.isArray(row.descriptor)
    ? (row.descriptor as number[])
    : JSON.parse(row.descriptor as string);
}

export async function getFaceDescriptorWithMeta(studentId: string) {
  const prisma = await getPrismaClient();

  const result = await prisma.faceDescriptor.findUnique({
    where: { studentId },
  });

  if (!result) return null;

  return {
    descriptor:  result.descriptor as number[],
    dimension:   result.embedding_dimension,
    enrolledAt:  result.enrolledAt,
    updatedAt:   result.updatedAt,
  };
}

export async function isFaceEnrolled(studentId: string): Promise<boolean> {
  const prisma = await getPrismaClient();

  const count = await prisma.faceDescriptor.count({ where: { studentId } });
  return count > 0;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFaceDescriptor(studentId: string): Promise<void> {
  const prisma = await getPrismaClient();

  await prisma.faceDescriptor.delete({ where: { studentId } }).catch(() => {
    // Silently ignore "record not found" — idempotent delete
  });
}

// ─── Verification log ─────────────────────────────────────────────────────────
// Written after every verify attempt so admins can audit false-negatives.

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

/**
 * Returns all enrolled descriptors except the given student's own row.
 * Used by the enrollment endpoint for the cross-student uniqueness scan.
 */
export async function getAllDescriptorsExcept(
  excludeStudentId: string,
): Promise<Array<{ studentId: string; descriptor: number[] }>> {
  const prisma = await getPrismaClient();

  const rows = await prisma.faceDescriptor.findMany({
    where:  { studentId: { not: excludeStudentId } },
    select: { studentId: true, descriptor: true },
  });

  return rows.map(r => ({
    studentId:  r.studentId,
    descriptor: Array.isArray(r.descriptor)
      ? (r.descriptor as number[])
      : JSON.parse(r.descriptor as string),
  }));
}

/**
 * Admin utility: find all pairs of enrolled students whose face descriptors
 * are above the match threshold. Returns duplicate pairs so admins can
 * investigate and revoke one of the accounts.
 *
 * O(N²) — only call from an admin-authenticated endpoint, not hot paths.
 */
export async function findAllDuplicateEnrollments(): Promise<Array<{
  studentIdA:  string;
  studentIdB:  string;
  similarity:  number;
}>> {
  const prisma = await getPrismaClient();

  const rows = await prisma.faceDescriptor.findMany({
    select: { studentId: true, descriptor: true },
  });

  const parsed = rows.map(r => ({
    studentId:  r.studentId,
    descriptor: Array.isArray(r.descriptor)
      ? (r.descriptor as number[])
      : (JSON.parse(r.descriptor as string) as number[]),
  }));

  const duplicates: Array<{ studentIdA: string; studentIdB: string; similarity: number }> = [];

  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i];
      const b = parsed[j];
      if (a.descriptor.length !== b.descriptor.length) continue;
      const sim = cosineSimilarity(a.descriptor, b.descriptor);
      if (sim >= FACE_THRESHOLDS.match) {
        duplicates.push({ studentIdA: a.studentId, studentIdB: b.studentId, similarity: sim });
      }
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

// ─── Cosine similarity (server-side verify helper) ────────────────────────────

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

// Thresholds exported so API routes and FaceMonitor stay in sync
export const FACE_THRESHOLDS = {
  match: 0.72,   // cosine ≥ 0.72 → confident same person
  soft:  0.60,   // cosine < 0.60 → likely different person → flag
} as const;

