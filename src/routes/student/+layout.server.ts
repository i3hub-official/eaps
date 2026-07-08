import type { LayoutServerLoad } from './$types';
import { STUDENT_COOKIE, getStudentByToken, cookieOptions } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { revealName } from '$lib/security/dataProtection';

function safeDecrypt<T>(decryptFn: () => T, fallback: T): T {
	try {
		return decryptFn();
	} catch {
		return fallback;
	}
}

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = cookies.get(STUDENT_COOKIE);
	if (!token) {
		throw redirect(303, '/login');
	}

	const result = await getStudentByToken(token);
	if (!result) {
		cookies.delete(STUDENT_COOKIE, cookieOptions);
		throw redirect(303, '/login');
	}

	const { student } = result;

	const firstName = safeDecrypt(() => revealName(student.firstName), student.firstName);
	const lastName = safeDecrypt(() => revealName(student.lastName), student.lastName);

	return {
		user: {
			name: `${firstName} ${lastName}`.trim(),
			initials: `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?',
		},
	};
};