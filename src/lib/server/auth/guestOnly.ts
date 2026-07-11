// src/lib/server/auth/guestOnly.ts
import { redirect } from '@sveltejs/kit';
import { staffRoleHome } from './roleHome.js';
import type { User } from './types.js';

/**
 * Routes that only make sense for a logged-OUT visitor. If locals.user is
 * already populated (staff or student), hitting any of these should just
 * bounce them straight to their dashboard instead of showing a login form
 * they don't need, or a landing page meant for anonymous visitors.
 *
 * Kept as a Set of exact pathnames rather than a prefix match — "/" must
 * stay exact (it should not swallow every route), and "/login"/
 * "/forgot-password" are single pages, not route groups.
 */
const GUEST_ONLY_PATHS = new Set(['/', '/login', '/forgot-password']);

/**
 * Resolves where an already-authenticated user should land instead.
 * Staff go to their role-specific home (never a shared dashboard — see
 * roleHome.ts); students go to /student, matching the redirect already
 * used at the end of a successful student login.
 */
function homeFor(user: User): string {
	if (user.type === 'staff') {
		return staffRoleHome(user.primaryRole);
	}
	return '/student';
}

/**
 * Called from hooks.server.ts on every request, after locals.user has
 * been populated by loadSessionFromCookies(). No-ops for logged-out
 * visitors (user === null) and for any path outside GUEST_ONLY_PATHS —
 * only redirects when both conditions hold: the user is authenticated
 * AND they're on a guest-only route.
 *
 * Takes `user: User | null` directly rather than the whole `locals`
 * object, so this has no dependency on App.Locals' ambient typing and
 * works regardless of whether locals.session or other fields exist.
 */
export function enforceGuestOnly(pathname: string, user: User | null): void {
	if (!GUEST_ONLY_PATHS.has(pathname)) return;
	if (!user) return;

	throw redirect(303, homeFor(user));
}