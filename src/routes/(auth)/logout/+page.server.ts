// src/routes/(auth)/logout/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { destroySession, clearSessionCookie, getSessionToken } from '$lib/server/auth/session.js';

export const actions: Actions = {
  default: async ({ cookies }) => {
    // Get and destroy the main session
    const token = getSessionToken(cookies);
    if (token) {
      await destroySession(token);
    }
    
    // Clear main session cookie
    clearSessionCookie(cookies);
    
    // Clear face verification cookies
    cookies.delete('face_verified', { path: '/' });
    cookies.delete('face_verified_at', { path: '/' });
    cookies.delete('face_similarity_score', { path: '/' });
    
    // Clear exam cookies
    cookies.delete('exam_session', { path: '/' });
    cookies.delete('current_exam', { path: '/' });
    
    // Redirect to login page
    redirect(302, '/login');
  },
};

// Also handle GET requests (direct navigation to /logout)
export const load = async ({ cookies }) => {
  const token = getSessionToken(cookies);
  if (token) {
    await destroySession(token);
  }
  
  clearSessionCookie(cookies);
  
  cookies.delete('face_verified', { path: '/' });
  cookies.delete('face_verified_at', { path: '/' });
  cookies.delete('face_similarity_score', { path: '/' });
  cookies.delete('exam_session', { path: '/' });
  cookies.delete('current_exam', { path: '/' });
  
  redirect(302, '/login');
};