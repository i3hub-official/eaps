// src/routes/api/face/descriptor/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getFaceDescriptor } from '$lib/server/db/faces.js';

// GET — retrieve stored descriptor for face verification during exam
export const GET: RequestHandler = async ({ locals }) => {
  try {
    // Await the Promise from requireStudent
    const user = await requireStudent(locals.user);
    
    // Convert ID to string if it's a number
    const studentId = String(user.id);
    
    const descriptor = await getFaceDescriptor(studentId);
    
    if (!descriptor) {
      error(404, 'No face descriptor found — please enroll first');
    }
    
    return json({ descriptor });
    
  } catch (err) {
    console.error('Get face descriptor error:', err);
    if (err?.status === 404) throw err;
    error(500, err instanceof Error ? err.message : 'Failed to retrieve face descriptor');
  }
};