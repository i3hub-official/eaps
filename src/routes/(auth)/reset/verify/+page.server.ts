// src/routes/(auth)/reset/verify/+page.server.ts
// User arrives from email link: /reset/verify?token=ABC123
import type { PageServerLoad } from './$types';
import { verifyResetToken } from '$lib/server/auth/reset.js';

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token')?.toUpperCase().trim() ?? '';
  if (!token) return { valid: false, token: null, error: 'No token provided.' };

  const result = await verifyResetToken(token);
  return {
    valid:  result.valid,
    token:  result.valid ? token : null,
    error:  result.error ?? null,
  };
};