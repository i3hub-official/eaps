import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  const user = await requireStudent(locals.user);
  const { verified, similarityScore } = await request.json();
  
  if (verified) {
    // Set HTTP-only cookie (can't be accessed by JavaScript - more secure)
    cookies.set('face_verified', 'true', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5 // 5 minutes
    });
    
    cookies.set('face_verified_at', Date.now().toString(), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5
    });
    
    cookies.set('face_similarity_score', (similarityScore || 0).toString(), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5
    });
    
    return json({ success: true });
  }
  
  return json({ error: 'Invalid verification' }, { status: 400 });
};