// src/lib/server/profile.ts
//
// Every function here takes an already-fetched PrismaClient rather than
// calling getPrismaClient() itself — the caller (a +page.server.ts loader
// or an api/+server.ts handler) fetches the client once via the
// requireStudent/requireStaff guard pattern and passes it down, matching
// how the rest of this codebase wires db access.

import type { PrismaClient } from '@prisma/client';
import { audit } from '$lib/server/audit.js';
import { hashPassword, verifyPassword } from '$lib/server/auth/index.js';
import { revealPhone, protectPhone } from '$lib/security/dataProtection.js';
import { STAFF_ROLE_LABELS } from '$lib/utils/staffRoleLabels.js';
import type { AuthenticatedStaff, AuthenticatedStudent } from '$lib/server/auth/types';

export interface ProfileData {
	kind: 'student' | 'staff';
	id: string;
	fullName: string;
	initials: string;
	email: string;
	phone: string | null;
	gender: string | null;
	identifier: string;
	identifierLabel: string;
	primaryRoleLabel: string | null;
	capabilityRoles: string[];
	college: string | null;
	department: string | null;
	programme: string | null;
	currentLevel: string | null;
	faceEnrolledAt: string | null;
	mustChangePassword: boolean;
}

export async function loadProfile(
	user: AuthenticatedStudent | AuthenticatedStaff,
	prisma: PrismaClient,
): Promise<ProfileData> {
	if (user.type === 'student') {
		const record = await prisma.student.findUniqueOrThrow({
			where: { id: user.id },
			include: {
				department: { include: { college: true } },
				programme: true,
				currentLevel: true,
			},
		});

		const fullName = [user.lastName, user.firstName, user.otherNames].filter(Boolean).join(' ');

		return {
			kind: 'student',
			id: record.id,
			fullName,
			initials: `${user.lastName?.[0] ?? ''}${user.firstName?.[0] ?? ''}`.toUpperCase(),
			email: user.email,
			phone: record.phone ? revealPhone(record.phone) : null,
			gender: record.gender ?? null,
			identifier: record.matricNumber,
			identifierLabel: 'Matric Number',
			primaryRoleLabel: null,
			capabilityRoles: [],
			college: record.department?.college?.name ?? null,
			department: record.department?.name ?? null,
			programme: record.programme?.name ?? null,
			currentLevel: record.currentLevel?.label ?? null,
			faceEnrolledAt: record.faceEnrolledAt?.toISOString() ?? null,
			mustChangePassword: record.mustChangePassword,
		};
	}

	const record = await prisma.staff.findUniqueOrThrow({
		where: { id: user.id },
		include: {
			college: true,
			department: true,
			roleAssignments: { where: { isActive: true }, include: { role: true } },
		},
	});

	const fullName = [user.lastName, user.firstName, record.otherNames].filter(Boolean).join(' ');
	const capabilityRoles = Array.from(new Set(record.roleAssignments.map((ra) => ra.role.displayName)));

	return {
		kind: 'staff',
		id: record.id,
		fullName,
		initials: `${user.lastName?.[0] ?? ''}${user.firstName?.[0] ?? ''}`.toUpperCase(),
		email: user.email,
		phone: record.phone ? revealPhone(record.phone) : null,
		gender: record.gender ?? null,
		identifier: record.staffNumber,
		identifierLabel: 'Staff Number',
		primaryRoleLabel: STAFF_ROLE_LABELS[record.primaryRole] ?? record.primaryRole,
		capabilityRoles,
		college: record.college?.name ?? null,
		department: record.department?.name ?? null,
		programme: null,
		currentLevel: null,
		faceEnrolledAt: null,
		mustChangePassword: record.mustChangePassword,
	};
}

export async function updatePhone(
	kind: 'student' | 'staff',
	id: string,
	phone: string,
	prisma: PrismaClient,
) {
	// protectPhone normalizes (Nigerian-format-aware), encrypts, and hashes
	// in one pass — returns both the ciphertext for the `phone` column and
	// the search hash for the paired `phoneHash` column, so there's no
	// separate hashing call needed here.
	const { encrypted, searchHash } = await protectPhone(phone);

	const model = kind === 'student' ? prisma.student : prisma.staff;
	await model.update({ where: { id }, data: { phone: encrypted, phoneHash: searchHash } });

	await audit[kind === 'student' ? 'student' : 'staff'](id, 'PROFILE_PHONE_UPDATED', 'Profile', {
		entityId: id,
	});
}

export async function updateGender(
	kind: 'student' | 'staff',
	id: string,
	gender: string,
	prisma: PrismaClient,
) {
	const model = kind === 'student' ? prisma.student : prisma.staff;
	await model.update({ where: { id }, data: { gender: gender as any } });
}

export async function changePassword(
	kind: 'student' | 'staff',
	id: string,
	currentPassword: string,
	newPassword: string,
	prisma: PrismaClient,
): Promise<{ ok: boolean; message?: string }> {
	const model = kind === 'student' ? prisma.student : prisma.staff;

	const record = await model.findUnique({ where: { id }, select: { passwordHash: true } });
	if (!record) return { ok: false, message: 'Account not found.' };

	const valid = await verifyPassword(currentPassword, record.passwordHash);
	if (!valid) return { ok: false, message: 'Current password is incorrect.' };

	if (newPassword.length < 8) {
		return { ok: false, message: 'New password must be at least 8 characters.' };
	}

	const passwordHash = await hashPassword(newPassword);
	await model.update({ where: { id }, data: { passwordHash, mustChangePassword: false } });

	await audit[kind === 'student' ? 'student' : 'staff'](id, 'PASSWORD_CHANGED', 'Profile', {
		entityId: id,
	});

	return { ok: true };
}