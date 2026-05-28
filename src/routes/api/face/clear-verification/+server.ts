// src/routes/api/face/clear-verification/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  // Clear face verification cookies
  cookies.delete('face_verified', { path: '/' });
  cookies.delete('face_verified_at', { path: '/' });
  cookies.delete('face_similarity_score', { path: '/' });
  
  return json({ success: true });
};