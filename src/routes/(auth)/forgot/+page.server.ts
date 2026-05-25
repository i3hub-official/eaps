// src/routes/(auth)/forgot/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { findUserByEmail } from '$lib/server/db/users.js';
import { createPasswordReset } from '$lib/server/auth/reset.js';
import { sendMail, buildResetEmail } from '$lib/server/auth/email.js';

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) return { alreadyAuthed: true };
  return {};
};

export const actions: Actions = {
  default: async ({ request, url }) => {
    const d     = await request.formData();
    const email = String(d.get('email') ?? '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return fail(400, { error: 'Please enter a valid email address.' });
    }

    // Always return success — never reveal whether email exists
    const user = await findUserByEmail(email);
    if (!user || !user.isActive) return { success: true };

    try {
      const token = await createPasswordReset(user.id);
      const { html, text } = buildResetEmail(user.fullName, token, url.origin);
      await sendMail({ to: email, subject: 'Your MOUAU eTest password reset code', html, text });
    } catch (e) {
      console.error('[Forgot] Failed to send reset email:', e);
      // Don't expose the error to the user
    }

    return { success: true };
  },
};