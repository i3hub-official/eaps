// src/routes/student/exams/kiosk/+layout.server.ts
// No auth redirect here — the page.server.ts handles that itself.
// This file exists only to prevent the student +layout.server.ts from running.
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async () => ({});