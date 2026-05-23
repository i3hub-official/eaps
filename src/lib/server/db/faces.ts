// src/lib/server/db/faces.ts

import { sql } from './index.js';

// face_descriptors table is NOT in the Prisma schema (raw pgvector-style storage)
// so we use raw SQL for everything here

export async function saveFaceDescriptor(
  studentId: string,
  descriptor: number[]
): Promise<void> {
  await sql(
    `INSERT INTO face_descriptors (student_id, descriptor, enrolled_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (student_id) DO UPDATE
       SET descriptor  = EXCLUDED.descriptor,
           enrolled_at = now()`,
    [studentId, JSON.stringify(descriptor)]
  );
}

export async function getFaceDescriptor(studentId: string): Promise<number[] | null> {
  const rows = await sql<{ descriptor: string }>(
    `SELECT descriptor FROM face_descriptors WHERE student_id = $1`,
    [studentId]
  );
  if (!rows[0]) return null;
  // descriptor stored as jsonb — pg returns it already parsed
  return typeof rows[0].descriptor === 'string'
    ? JSON.parse(rows[0].descriptor)
    : (rows[0].descriptor as unknown as number[]);
}

export async function isFaceEnrolled(studentId: string): Promise<boolean> {
  const rows = await sql<{ count: string }>(
    `SELECT COUNT(*) AS count FROM face_descriptors WHERE student_id = $1`,
    [studentId]
  );
  return parseInt(rows[0]?.count ?? '0', 10) > 0;
}

export async function deleteFaceDescriptor(studentId: string): Promise<void> {
  await sql(`DELETE FROM face_descriptors WHERE student_id = $1`, [studentId]);
}
