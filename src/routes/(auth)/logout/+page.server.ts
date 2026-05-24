// src/routes/(auth)/logout/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { destroySession, clearSessionCookie, getSessionToken } from '$lib/server/auth/session.js';

export const actions: Actions = {
  default: async ({ cookies, request }) => {
    // Optional: Verify CSRF token for POST requests
    const formData = await request.formData();
    const csrfToken = formData.get('csrf_token');
    
    // Get CSRF token from cookie
    const storedToken = cookies.get('csrf_token');
    
    if (!csrfToken || csrfToken !== storedToken) {
      return fail(403, { message: 'Invalid CSRF token' });
    }
    
    const token = getSessionToken(cookies);
    if (token) {
      await destroySession(token);
    }
    
    clearSessionCookie(cookies);
    
    // Clear face verification cookies
    cookies.delete('face_verified', { path: '/' });
    cookies.delete('face_verified_at', { path: '/' });
    cookies.delete('face_similarity_score', { path: '/' });
    
    // Clear exam cookies
    cookies.delete('exam_session', { path: '/' });
    cookies.delete('current_exam', { path: '/' });
    
    // Clear CSRF token cookie
    cookies.delete('csrf_token', { path: '/' });
    
    redirect(302, '/login');
  },
};