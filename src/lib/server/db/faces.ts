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