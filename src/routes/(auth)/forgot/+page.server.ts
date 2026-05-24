// src/routes/(auth)/forgot/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { findUserByEmail } from '$lib/server/db/users';
import { createPasswordReset } from '$lib/server/auth/reset';
import { sendMail, buildResetEmail } from '$lib/server/auth/email';

export const load: PageServerLoad = async ({ locals }) => {
  // Already logged in — no need to reset
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

    // Always return success — don't reveal if email exists (security)
    const user = await findUserByEmail(email);
    if (!user || !user.isActive) {
      return { success: true }; // silent — no enumeration
    }

    const token = await createPasswordReset(user.id);
    const { html, text } = buildResetEmail(user.fullName, token, url.origin);

    await sendMail({
      to:      email,
      subject: 'Your MOUAU eTest password reset code',
      html,
      text,
    });

    return { success: true };
  },
};