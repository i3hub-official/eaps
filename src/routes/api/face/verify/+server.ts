// src/routes/api/face/verify/+server.ts (or verify-session)
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { cosineSimilarity } from '$lib/server/face/utils.js';

// Lower thresholds for Human embeddings
const MATCH_THRESHOLD = 0.65; // Human typically needs lower threshold
const SOFT_THRESHOLD = 0.55;

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  const user = await requireStudent(locals.user);
  const body = await request.json().catch(() => ({}));
  const { descriptor, examId } = body;

  if (!Array.isArray(descriptor) || descriptor.length === 0) {
    throw error(400, 'Invalid descriptor: expected non-empty array');
  }

  console.log('Verification descriptor dimension:', descriptor.length);

  // Fetch enrolled descriptor
  const faceDescriptor = await prisma.faceDescriptor.findUnique({
    where: { studentId: user.id },
  });

  if (!faceDescriptor) {
    throw error(403, 'Face not enrolled. Complete enrollment first.');
  }

  const enrolled = faceDescriptor.descriptor as number[];
  console.log('Enrolled descriptor dimension:', enrolled.length);

  // Handle different dimensions (Human produces 512, but we can still compare)
  let similarity: number;
  
  if (enrolled.length === descriptor.length) {
    // Same dimension, direct comparison
    similarity = cosineSimilarity(enrolled, descriptor);
  } else {
    // Different dimensions - need to adapt (trim or pad)
    console.warn(`Dimension mismatch: enrolled=${enrolled.length}, input=${descriptor.length}`);
    
    // Take the minimum length for comparison
   const minLength = Math.min(enrolled.length, descriptor.length);
  similarity = cosineSimilarity(
    enrolled.slice(0, minLength),
    descriptor.slice(0, minLength)
  );
  }

  console.log('Similarity score:', similarity);

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
      message: `Face verification failed (${Math.round(similarity * 100)}% match). Please ensure good lighting and try again.`,
    }, { status: 403 });
  }

  return json({
    success: true,
    similarity,
    threshold: MATCH_THRESHOLD,
    warning: softPass && !success 
      ? `Low confidence match (${Math.round(similarity * 100)}%). Ensure proper lighting and center your face.` 
      : undefined,
    examId,
  });
};