// src/routes/api/face/enroll/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { saveFaceDescriptor, isFaceEnrolled } from '$lib/server/db/faces.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Await the Promise from requireStudent
    const user = await requireStudent(locals.user);
    
    // Convert ID to string if it's a number
    const studentId = String(user.id);
    
    // Check if already enrolled (optional but good practice)
    const alreadyEnrolled = await isFaceEnrolled(studentId);
    if (alreadyEnrolled) {
      return json({ ok: true, message: 'Face already enrolled' });
    }
    
    const { descriptor } = await request.json();
    
    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      error(400, 'Invalid descriptor — must be a 128-float array');
    }
    
    // Validate descriptor values are numbers
    const isValid = descriptor.every(v => typeof v === 'number' && !isNaN(v));
    if (!isValid) {
      error(400, 'Invalid descriptor — all values must be valid numbers');
    }
    
    await saveFaceDescriptor(studentId, descriptor);
    return json({ ok: true, message: 'Face enrolled successfully' });
    
  } catch (err) {
    console.error('Face enrollment error:', err);
    error(500, err instanceof Error ? err.message : 'Enrollment failed');
  }
};