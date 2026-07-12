// src/routes/api/preferences/+server.ts
//
// One shared endpoint for the whole app. Any page saves its own
// dot-namespaced key here instead of each feature needing its own route.
import { json, error } from '@sveltejs/kit';
import { updateStudentPreferences, updateStaffPreferences } from '$lib/server/preferences';
import type { RequestHandler } from './$types';

const VALID_VIEW_MODES = new Set(['grid', 'list', 'card']);

// Whitelist of known preference keys and how to validate each one's value.
// Add a line here whenever a new page starts persisting a preference —
// this table is the only thing standing between the client and writing
// arbitrary data into the JSON blob, so every key must be listed
// explicitly with its own validator.
const PREFERENCE_VALIDATORS: Record<string, (value: unknown) => boolean> = {
	'results.assessmentsView': (v) => typeof v === 'string' && VALID_VIEW_MODES.has(v),
	'results.transcriptView': (v) => typeof v === 'string' && VALID_VIEW_MODES.has(v),
	// 'questionBank.view': (v) => typeof v === 'string' && VALID_VIEW_MODES.has(v),
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const studentId = locals.student?.id; // adjust to your actual session shape
	const staffId = locals.staff?.id; // adjust to your actual session shape

	if (!studentId && !staffId) {
		throw error(401, 'Not authenticated');
	}

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		throw error(400, 'Invalid request body');
	}

	const patch: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(body)) {
		const validate = PREFERENCE_VALIDATORS[key];
		if (validate && validate(value)) {
			patch[key] = value;
		}
	}

	if (Object.keys(patch).length === 0) {
		throw error(400, 'No valid preference fields provided');
	}

	const updated = studentId
		? await updateStudentPreferences(studentId, patch)
		: await updateStaffPreferences(staffId!, patch);

	return json(updated);
};