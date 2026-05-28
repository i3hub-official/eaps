// src/routes/api/face/descriptor/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getFaceDescriptorWithMeta } from '$lib/server/db/faces.js';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const user = await requireStudent(locals.user);
    const studentId = String(user.id);
    
    const faceData = await getFaceDescriptorWithMeta(studentId);
    
    if (!faceData) {
      throw error(404, 'No face descriptor found — please enroll first');
    }
    
    return json({ 
      descriptor: faceData.descriptor,
      enrolledAt: faceData.enrolledAt,
      updatedAt: faceData.updatedAt
    });
    
  } catch (err) {
    console.error('Get face descriptor error:', err);
    if (err?.status === 404) throw err;
    throw error(500, err instanceof Error ? err.message : 'Failed to retrieve face descriptor');
  }
};