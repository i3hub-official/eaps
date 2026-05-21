// src/lib/server/db/faces.ts
// Prisma for simple ops, raw pg for bulk descriptor queries

import { db } from './index.js';         // pg pool
import { prisma } from './index.js';        // prisma client

// Store a student's face descriptor (128-float array from face-api.js)
export async function saveFaceDescriptor(
  student_id: string,
  descriptor: number[]
): Promise<void> {
  // Use raw SQL — pgvector-style float array storage
  await db.query(
    `INSERT INTO face_descriptors (student_id, descriptor, enrolled_at)
     VALUES ($1, $2, now())
     ON CONFLICT (student_id) DO UPDATE
       SET descriptor = EXCLUDED.descriptor,
           enrolled_at = now()`,
    [student_id, JSON.stringify(descriptor)]
  );
}

// Get a student's stored descriptor
export async function getFaceDescriptor(
  student_id: string
): Promise<number[] | null> {
  const { rows } = await db.query<{ descriptor: string }>(
    `SELECT descriptor FROM face_descriptors WHERE student_id = $1`,
    [student_id]
  );
  if (!rows[0]) return null;
  return JSON.parse(rows[0].descriptor);
}

// Check if student is enrolled
export async function isFaceEnrolled(student_id: string): Promise<boolean> {
  const { rows } = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM face_descriptors WHERE student_id = $1`,
    [student_id]
  );
  return parseInt(rows[0].count) > 0;
}