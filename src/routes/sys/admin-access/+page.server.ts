// src/routes/sys/admin-access/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import {
    verifyPassword,
    createStaffSession,
    STAFF_COOKIE,
    cookieOptions,
} from '$lib/server/auth';
import { staffRoleHome } from '$lib/server/auth/roleHome';
import { searchHashFor, revealName } from '$lib/security/dataProtection';
import { sendLoginAlertEmail } from '$lib/server/auth/email';

// Must stay in sync with +layout.server.ts
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;

function safeDecrypt(fn: () => string, fallback: string): string {
    try {
        return fn();
    } catch {
        return fallback;
    }
}

export const load: PageServerLoad = async ({ locals }) => {
    // Already-authenticated admin goes straight to dashboard
    if (locals.user?.role && (ADMIN_ROLES as readonly string[]).includes(locals.user.role)) {
        redirect(302, '/admin');
    }
    return {};
};

export const actions: Actions = {
    default: async ({ request, cookies, getClientAddress }) => {
        const form       = await request.formData();
        const rawEmail   = String(form.get('identifier') ?? '').trim();
        const password   = String(form.get('password')   ?? '');

        if (!rawEmail || !password) {
            return fail(400, { error: 'Enter your email and password.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
            return fail(400, { error: 'Enter a valid email address.' });
        }

        const meta = {
            ipAddress: getClientAddress(),
            userAgent: request.headers.get('user-agent') ?? undefined,
        };

        const prisma    = await getPrismaClient();
        const emailHash = await searchHashFor(rawEmail, 'email');

        const staff = await prisma.staff.findUnique({ where: { emailHash } });

        // Vague error — don't reveal whether the URL, account, or password is wrong
        const denied = () => fail(401, { error: 'Invalid credentials.' });

        if (!staff) return denied();
        
        // Only allow SUPER_ADMIN and ADMIN roles
        if (!((ADMIN_ROLES as readonly string[]).includes(staff.primaryRole))) {
            return denied();
        }
        
        if (staff.status !== 'ACTIVE') return denied();

        const ok = await verifyPassword(password, staff.passwordHash);
        if (!ok) return denied();

        const { token } = await createStaffSession(staff.id, meta);
        cookies.set(STAFF_COOKIE, token, cookieOptions);

        const staffName = `${safeDecrypt(() => revealName(staff.firstName), '')} ${safeDecrypt(() => revealName(staff.lastName), '')}`.trim();
        sendLoginAlertEmail(rawEmail, staffName || 'there', new Date(), meta.ipAddress, meta.userAgent).catch((err) => {
            console.error('[admin-access] Failed to send login alert email:', err);
        });

        redirect(303, staffRoleHome(staff.primaryRole));
    }
};