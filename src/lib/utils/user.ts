// src/lib/utils/user.ts
import type { User } from '$lib/server/auth/types';

export type NormalizedUser = {
	kind: 'student' | 'staff';
	id: string;
	name: string;
	initials: string;
};

export function normalizeUser(u: any): NormalizedUser | null {
	if (!u) return null;

	// Modern shape: locals.user passed through directly, always has `type`.
	if (u.type === 'student' || u.type === 'staff') {
		const name = `${u.lastName ?? ''} ${u.firstName ?? ''}`.trim() || (u.type === 'student' ? 'Student' : 'Staff');
		const initials = `${u.lastName?.[0] ?? ''}${u.firstName?.[0] ?? ''}`.toUpperCase() || '?';
		return { kind: u.type, id: u.id, name, initials };
	}

	// Legacy shape: student layout's own +layout.server.ts pre-shapes user to
	// { name, initials } with no `type` field — this is the ONLY portal that
	// does this, so absence of `type` (combined with presence of `name`)
	// safely implies student here. Remove this branch once the student
	// layout is updated to pass locals.user through unshaped.
	if (u.name || u.initials) {
		return {
			kind: 'student',
			id: u.id ?? '',
			name: u.name ?? 'Student',
			initials: u.initials ?? '?',
		};
	}

	// Fallback: raw staff-shaped object without a `type` tag.
	const name = `${u.lastName ?? ''} ${u.firstName ?? ''}`.trim() || 'Staff';
	const initials = `${u.lastName?.[0] ?? ''}${u.firstName?.[0] ?? ''}`.toUpperCase() || '?';
	return { kind: 'staff', id: u.id ?? '', name, initials };
}