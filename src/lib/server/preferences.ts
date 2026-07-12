// src/lib/server/preferences.ts
import { getPrismaClient } from '$lib/server/db/index.js'

export type ViewMode = 'grid' | 'list' | 'card';

export interface ResultsPagePreferences {
	resultsViewMode?: ViewMode;
	transcriptViewMode?: ViewMode;
}

export interface StaffPreferences {
	resultsViewMode?: ViewMode;
	examDashboardViewMode?: ViewMode;
	defaultExamFilter?: string;
}

// ─── Student Preferences ────────────────────────────────────────────────

/**
 * Loads a student's stored preferences. Returns an empty object (not null)
 * when no row exists yet, so callers can always safely spread/read from it
 * without a null check — a student's first visit just gets defaults.
 */
export async function getStudentPreferences(
	studentId: string,
): Promise<ResultsPagePreferences> {
    const prisma = await getPrismaClient();
	const row = await prisma.studentPreference.findUnique({
		where: { studentId },
		select: { data: true },
	});
	return (row?.data as ResultsPagePreferences) ?? {};
}

/**
 * Merges the given partial preferences into the student's stored JSON blob.
 * Upserts so the first save creates the row. A shallow merge is enough
 * since every preference we store today is a top-level primitive; if a
 * nested preference is added later, merge that nested object explicitly
 * where it's set instead of switching this function to deep-merge blindly.
 */
export async function updateStudentPreferences(
	studentId: string,
	patch: Partial<ResultsPagePreferences>,
): Promise<ResultsPagePreferences> {
	const prisma = await getPrismaClient();
	const existing = await getStudentPreferences(studentId);
	const merged = { ...existing, ...patch };

	await prisma.studentPreference.upsert({
		where: { studentId },
		create: { studentId, data: merged },
		update: { data: merged },
	});

	return merged;
}

// ─── Staff Preferences ──────────────────────────────────────────────────

/**
 * Loads a staff member's stored preferences. Returns an empty object (not null)
 * when no row exists yet, so callers can always safely spread/read from it.
 */
export async function getStaffPreferences(
	staffId: string,
): Promise<StaffPreferences> {
	const prisma = await getPrismaClient();
	const row = await prisma.staffPreference.findUnique({
		where: { staffId },
		select: { data: true },
	});
	return (row?.data as StaffPreferences) ?? {};
}

/**
 * Merges the given partial preferences into the staff member's stored JSON blob.
 * Upserts so the first save creates the row.
 */
export async function updateStaffPreferences(
	staffId: string,
	patch: Partial<StaffPreferences>,
): Promise<StaffPreferences> {
	const prisma = await getPrismaClient();
	const existing = await getStaffPreferences(staffId);
	const merged = { ...existing, ...patch };

	await prisma.staffPreference.upsert({
		where: { staffId },
		create: { staffId, data: merged },
		update: { data: merged },
	});

	return merged;
}

// ─── Generic/Utility Functions ─────────────────────────────────────────

/**
 * Get preferences for either student or staff based on role
 */
export async function getPreferences(
	userId: string,
	role: 'student' | 'staff'
): Promise<ResultsPagePreferences | StaffPreferences> {
	if (role === 'student') {
		return getStudentPreferences(userId);
	} else {
		return getStaffPreferences(userId);
	}
}

/**
 * Update preferences for either student or staff based on role
 */
export async function updatePreferences(
	userId: string,
	role: 'student' | 'staff',
	patch: Partial<ResultsPagePreferences | StaffPreferences>
): Promise<ResultsPagePreferences | StaffPreferences> {
	if (role === 'student') {
		return updateStudentPreferences(userId, patch);
	} else {
		return updateStaffPreferences(userId, patch);
	}
}