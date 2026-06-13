// src/routes/api/face/verify/+server.ts (or verify-session)

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { cosineSimilarity, FACE_THRESHOLDS, logVerification } from '$lib/server/db/faces.js';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  
  const user = await requireStudent(locals.user);
            const prisma = await getPrismaClient();

  const body = await request.json().catch(() => ({}));
  const { descriptor, examId } = body;

  if (!Array.isArray(descriptor) || descriptor.length === 0) {
    throw error(400, 'Invalid descriptor: expected non-empty array');
  }

  const faceDescriptor = await prisma.faceDescriptor.findUnique({
    where: { studentId: user.id },
  });

  if (!faceDescriptor) {
    throw error(403, 'Face not enrolled. Complete enrollment first.');
  }

  const enrolled = faceDescriptor.descriptor as number[];

  let similarity: number;
  if (enrolled.length === descriptor.length) {
    similarity = cosineSimilarity(enrolled, descriptor);
  } else {
    const minLength = Math.min(enrolled.length, descriptor.length);
    similarity = cosineSimilarity(
      enrolled.slice(0, minLength),
      descriptor.slice(0, minLength)
    );
  }

  const success = similarity >= FACE_THRESHOLDS.match;
  const softPass = similarity >= FACE_THRESHOLDS.soft;

  // Log with verifiedAt so requireFaceVerified can find it
  await logVerification({
    studentId: user.id,
    examId: examId || null,
    similarityScore: similarity,
    success: success || softPass,  // log soft passes too
    ipAddress: getClientAddress(),
    userAgent: request.headers.get('user-agent'),
  });

  if (!success && !softPass) {
    return json({
      success: false,
      similarity,
      threshold: FACE_THRESHOLDS.match,
      message: `Face verification failed (${Math.round(similarity * 100)}% match). Please ensure good lighting and try again.`,
    }, { status: 403 });
  }

  return json({
    success: true,
    similarity,
    threshold: FACE_THRESHOLDS.match,
    warning: softPass && !success
      ? `Low confidence match (${Math.round(similarity * 100)}%). Ensure proper lighting and center your face.`
      : undefined,
    examId,
  });
};