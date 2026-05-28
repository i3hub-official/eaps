// src/lib/server/db/faces.ts
import { sql } from './index.js';

export async function saveFaceDescriptor(
  studentId: string,
  descriptor: number[]
): Promise<void> {
  try {
    await sql(
      `INSERT INTO face_descriptors (student_id, descriptor, enrolled_at, updated_at)
       VALUES ($1, $2::jsonb, NOW(), NOW())
       ON CONFLICT (student_id) DO UPDATE
         SET descriptor = EXCLUDED.descriptor,
             updated_at = NOW()`,
      [studentId, JSON.stringify(descriptor)]
    );
  } catch (error) {
    console.error('[saveFaceDescriptor] Error saving face descriptor:', error);
    throw new Error('Failed to save face descriptor');
  }
}

export async function getFaceDescriptor(studentId: string): Promise<number[] | null> {
  try {
    const rows = await sql<{ descriptor: string }>(
      `SELECT descriptor FROM face_descriptors WHERE student_id = $1`,
      [studentId]
    );
    
    if (!rows || rows.length === 0) return null;
    
    const descriptor = rows[0].descriptor;
    return typeof descriptor === 'string' 
      ? JSON.parse(descriptor) 
      : (descriptor as unknown as number[]);
      
  } catch (error) {
    console.error('[getFaceDescriptor] Error retrieving face descriptor:', error);
    return null;
  }
}

// OPTIMIZED: Uses EXISTS instead of COUNT(*) for better performance
export async function isFaceEnrolled(studentId: string): Promise<boolean> {
  try {
    const rows = await sql<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM face_descriptors WHERE student_id = $1
      ) AS exists`,
      [studentId]
    );
    
    return rows?.[0]?.exists ?? false;
    
  } catch (error) {
    console.error('[isFaceEnrolled] Error checking face enrollment:', error);
    return false;
  }
}

export async function deleteFaceDescriptor(studentId: string): Promise<void> {
  try {
    await sql(`DELETE FROM face_descriptors WHERE student_id = $1`, [studentId]);
  } catch (error) {
    console.error('[deleteFaceDescriptor] Error deleting face descriptor:', error);
    throw new Error('Failed to delete face descriptor');
  }
}

export async function getFaceDescriptorWithMeta(studentId: string) {
  try {
    const rows = await sql<{ 
      descriptor: string; 
      enrolled_at: Date;
      updated_at: Date;
    }>(
      `SELECT descriptor, enrolled_at, updated_at 
       FROM face_descriptors 
       WHERE student_id = $1`,
      [studentId]
    );
    
    if (!rows || rows.length === 0) return null;
    
    return {
      descriptor: typeof rows[0].descriptor === 'string' 
        ? JSON.parse(rows[0].descriptor) 
        : (rows[0].descriptor as unknown as number[]),
      enrolledAt: rows[0].enrolled_at,
      updatedAt: rows[0].updated_at
    };
    
  } catch (error) {
    console.error('[getFaceDescriptorWithMeta] Error:', error);
    return null;
  }
}