// src/routes/api/face/descriptor/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFaceDescriptor, isFaceEnrolled } from '$lib/server/db/faces.js';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) error(401, 'Unauthorized');

  const enrolled = await isFaceEnrolled(locals.user.id);
  if (!enrolled) {
    return json({ enrolled: false, descriptor: null });
  }

  const descriptor = await getFaceDescriptor(locals.user.id);
  return json({ enrolled: true, descriptor });
};