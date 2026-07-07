// src/routes/(auth)/forgot/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { findAccountByEmail, createPasswordReset } from '$lib/server/auth/reset.js';
import { sendMail, buildResetEmail } from '$lib/server/auth/email.js';
import { getStaffUser, getStudentUser } from '$lib/server/auth/guards.js';

export const load: PageServerLoad = async (event) => {
  const [staff, student] = await Promise.all([getStaffUser(event), getStudentUser(event)]);
  if (staff || student) return { alreadyAuthed: true };
  return {};
};

export const actions: Actions = {
  default: async ({ request, url }) => {
    const d     = await request.formData();
    const email = String(d.get('email') ?? '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return fail(400, { error: 'Please enter a valid email address.' });
    }

    // Always return success — never reveal whether the email exists
    const account = await findAccountByEmail(email);
    if (!account || account.user.status !== 'ACTIVE') return { success: true };

    try {
      const token = await createPasswordReset(account);
      const fullName = `${account.user.firstName} ${account.user.lastName}`;
      const { html, text } = buildResetEmail(fullName, token, url.origin);
      await sendMail({ to: email, subject: 'Your MOUAU eTest password reset code', html, text });
    } catch (e) {
      console.error('[Forgot] Failed to send reset email:', e);
    }

    return { success: true };
  },
};