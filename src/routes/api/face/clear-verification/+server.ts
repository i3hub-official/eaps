// src/routes/api/face/clear-verification/+server.ts
//
// Clears the face-verification session cookies so the student must
// re-verify before re-entering a kiosk.
//
// IMPORTANT — verification logs are NOT modified here.
//   FaceVerificationLog rows are an immutable audit trail. A successful
//   verification that happened is a fact that must stay in the record.
//   Cookie state and audit state are separate concerns:
//     • Cookies  → "is this browser session currently verified?"
//     • Audit log → "did this student pass face verification at time T?"
//   Never retroactively flip audit rows to false — it corrupts integrity.

import { json }             from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent }   from '$lib/server/auth/guards.js';

export const POST: RequestHandler = async ({ locals, cookies }) => {
  requireStudent(locals.user);

  const cookieOpts = { path: '/' };

  cookies.delete('face_verified',         cookieOpts);
  cookies.delete('face_verified_at',      cookieOpts);
  cookies.delete('face_similarity_score', cookieOpts);

  return json({ success: true, cleared: true });
};