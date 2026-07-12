// src/lib/server/preferences.ts
import { getPrismaClient, prisma } from '$lib/server/db/index.js'

export type ViewMode = 'grid' | 'list' | 'card';

export interface ResultsPagePreferences {
	resultsViewMode?: ViewMode;
	transcriptViewMode?: ViewMode;
}

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
	const existing = await getStudentPreferences(studentId);
	const merged = { ...existing, ...patch };

	await prisma.studentPreference.upsert({
		where: { studentId },
		create: { studentId, data: merged },
		update: { data: merged },
	});

	return merged;
}