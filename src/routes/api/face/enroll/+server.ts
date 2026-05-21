// src/routes/api/face/enroll/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveFaceDescriptor } from '$lib/server/db/faces.js';
import { prisma } from '$lib/server/db/db.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');
  if (locals.user.role !== 'student') error(403, 'Students only');

  const { descriptor, photo_data_url } = await request.json();

  if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
    error(400, 'Invalid face descriptor — must be 128-float array');
  }

  // Save descriptor
  await saveFaceDescriptor(locals.user.id, descriptor);

  // Optionally save photo URL for visual verification by admin
  if (photo_data_url) {
    await prisma.user.update({
      where: { id: locals.user.id },
      data: { photoUrl: photo_data_url },
    });
  }

  return json({ ok: true, enrolled: true });
};