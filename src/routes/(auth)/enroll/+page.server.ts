// src/routes/api/face/enroll/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { saveFaceDescriptor } from '$lib/server/db/faces.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireStudent(locals.user);

  const body = await request.json().catch(() => null);
  if (!body?.descriptor || !Array.isArray(body.descriptor) || body.descriptor.length !== 128) {
    error(400, { message: 'Invalid descriptor — expected a 128-element float array.' });
  }

  await saveFaceDescriptor(user.id, body.descriptor);
  return json({ ok: true });
};