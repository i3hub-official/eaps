// src/routes/api/face/verify-session/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { cosineSimilarity } from '$lib/server/face/utils.js';

const MATCH_THRESHOLD = 0.82;
const SOFT_THRESHOLD = 0.70;

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  const user = await requireStudent(locals.user);
  const body = await request.json().catch(() => ({}));
  const { descriptor, examId } = body;

  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    throw error(400, 'Invalid descriptor: expected 128-element array');
  }

  // Fetch enrolled descriptor
  const faceDescriptor = await prisma.faceDescriptor.findUnique({
    where: { studentId: user.id },
  });

  if (!faceDescriptor) {
    throw error(403, 'Face not enrolled. Complete enrollment first.');
  }

  const enrolled = faceDescriptor.descriptor as number[];
  const similarity = cosineSimilarity(enrolled, descriptor);

  const success = similarity >= MATCH_THRESHOLD;
  const softPass = similarity >= SOFT_THRESHOLD;

  // Log verification attempt
  await prisma.faceVerificationLog.create({
    data: {
      studentId: user.id,
      examId: examId || null,
      similarityScore: similarity,
      success,
      ipAddress: getClientAddress(),
      userAgent: request.headers.get('user-agent') ?? undefined,
    },
  });

  if (!success && !softPass) {
    return json({
      success: false,
      similarity,
      threshold: MATCH_THRESHOLD,
      message: 'Face verification failed. Please ensure good lighting and try again.',
    }, { status: 403 });
  }

  return json({
    success: true,
    similarity,
    threshold: MATCH_THRESHOLD,
    warning: softPass && !success 
      ? 'Low confidence match. Ensure proper lighting and center your face.' 
      : undefined,
    examId,
  });
};