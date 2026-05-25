// src/lib/server/db/faces.ts
import { prisma } from './index.js';

export async function saveFaceDescriptor(
  studentId: string,
  descriptor: number[]
): Promise<void> {
  await prisma.faceDescriptor.upsert({
    where:  { studentId },
    update: { descriptor, updatedAt: new Date() },
    create: { studentId, descriptor },
  });
}

export async function getFaceDescriptor(studentId: string): Promise<number[] | null> {
  const row = await prisma.faceDescriptor.findUnique({
    where: { studentId },
  });
  if (!row) return null;
  // Prisma returns Json as unknown — the descriptor is a 128-float array
  return row.descriptor as number[];
}

export async function isFaceEnrolled(studentId: string): Promise<boolean> {
  const count = await prisma.faceDescriptor.count({
    where: { studentId },
  });
  return count > 0;
}

export async function deleteFaceDescriptor(studentId: string): Promise<void> {
  await prisma.faceDescriptor.delete({
    where: { studentId },
  }).catch(() => {
    // Silently ignore if no descriptor exists — delete is idempotent
  });
}