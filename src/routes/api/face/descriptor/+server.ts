// src/routes/api/face/descriptor/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getFaceDescriptor } from '$lib/server/db/faces.js';

// GET — retrieve stored descriptor for face verification during exam
export const GET: RequestHandler = async ({ locals }) => {
  const user = requireStudent(locals.user);
  const descriptor = await getFaceDescriptor(user.id);
  if (!descriptor) error(404, 'No face descriptor found — please enroll first');
  return json({ descriptor });
};