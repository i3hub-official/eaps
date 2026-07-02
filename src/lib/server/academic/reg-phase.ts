// src/lib/server/academic/reg-phase.ts
//
// Single source of truth for the draft -> submitted -> locked registration
// state machine. Previously duplicated as private functions inside
// student/courses/register/+page.server.ts — extracted so admin unlock
// tooling reads/writes the exact same state instead of drifting out of sync.
//
// State stored in UserPreference.prefs JSON:
//   { regState: { "2025/2026_1": "draft" | "submitted" | "locked" } }

import { getPrismaClient } from '$lib/server/db/index.js';

export type RegPhase = 'draft' | 'submitted' | 'locked';

export function regPhaseKey(session: string, semester: number): string {
	return `${session}_${semester}`;
}

export async function getRegPhase(userId: string, key: string): Promise<RegPhase> {
	const prisma = await getPrismaClient();

	const pref = await prisma.userPreference.findUnique({
		where: { userId },
		select: { prefs: true }
	});
	const prefs = (pref?.prefs ?? {}) as Record<string, unknown>;
	const regState = (prefs.regState ?? {}) as Record<string, string>;
	return (regState[key] as RegPhase) ?? 'draft';
}

export async function setRegPhase(userId: string, key: string, phase: RegPhase) {
	const prisma = await getPrismaClient();

	const pref = await prisma.userPreference.findUnique({
		where: { userId },
		select: { prefs: true }
	});
	const prefs = (pref?.prefs ?? {}) as Record<string, unknown>;
	const regState = { ...((prefs.regState ?? {}) as Record<string, string>), [key]: phase };
	const newPrefs = { ...prefs, regState };
	await prisma.userPreference.upsert({
		where: { userId },
		update: { prefs: newPrefs },
		create: { userId, prefs: newPrefs }
	});
}