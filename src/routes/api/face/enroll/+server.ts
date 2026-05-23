// src/routes/api/face/enroll/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { saveFaceDescriptor } from '$lib/server/db/faces.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireStudent(locals.user);

  const { descriptor } = await request.json();

  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    error(400, 'Invalid descriptor — must be a 128-float array');
  }

  await saveFaceDescriptor(user.id, descriptor);
  return json({ ok: true });
};