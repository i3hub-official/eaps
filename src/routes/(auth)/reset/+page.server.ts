// src/routes/(auth)/reset/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyResetToken, consumeResetToken } from '$lib/server/auth/reset.js';
import { updatePasswordHash } from '$lib/server/db/accounts.js';
import { hashPassword, invalidateAllStaffSessions, invalidateAllStudentSessions } from '$lib/server/auth/index.js';

export const load: PageServerLoad = async () => ({});

export const actions: Actions = {
  verifyToken: async ({ request }) => {
    const d     = await request.formData();
    const token = String(d.get('token') ?? '').toUpperCase().trim();

    if (!token || token.length !== 6) {
      return fail(400, { step: 'verify', error: 'Please enter the 6-character code.' });
    }

    const result = await verifyResetToken(token);
    if (!result.valid) {
      return fail(400, { step: 'verify', error: result.error ?? 'Invalid code.' });
    }

    return { step: 'verified', token };
  },

  resetPassword: async ({ request }) => {
    const d        = await request.formData();
    const token    = String(d.get('token')    ?? '').toUpperCase().trim();
    const password = String(d.get('password') ?? '');
    const confirm  = String(d.get('confirm')  ?? '');

    if (!token) return fail(400, { step: 'reset', error: 'Missing token.' });

    if (password.length < 8) {
      return fail(400, { step: 'reset', error: 'Password must be at least 8 characters.', token });
    }
    if (password !== confirm) {
      return fail(400, { step: 'reset', error: 'Passwords do not match.', token });
    }

    const result = await verifyResetToken(token);
    if (!result.valid || !result.userType || !result.userId) {
      return fail(400, { step: 'reset', error: result.error ?? 'Token expired. Please start over.', token });
    }

    const passwordHash = await hashPassword(password);

    await Promise.all([
      updatePasswordHash(result.userType, result.userId, passwordHash),
      consumeResetToken(token),
      result.userType === 'staff'
        ? invalidateAllStaffSessions(result.userId)
        : invalidateAllStudentSessions(result.userId),
    ]);

    return { step: 'done' };
  },
};