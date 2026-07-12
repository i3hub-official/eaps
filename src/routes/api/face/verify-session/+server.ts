// src/routes/api/face/verify-session/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { audit } from '$lib/server/audit.js';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
    const student = await requireStudent(locals.user);
    const { verified, similarityScore, antispoofScore, livenessScore, examId } = await request.json();

    if (!verified) {
        return json({ success: false, message: 'Biometric thresholds not met.' });
    }

    // Zero-DB Hardening: Cache validation state flags into local session context
    if (locals.session) {
        locals.session.faceVerified = true;
        locals.session.faceVerifiedAt = new Date().toISOString();
        locals.session.verifiedExamId = examId;
    }

    // Fire-and-forget logging audit remains decoupled from the immediate database check loop
    audit.student(student.id, 'FACE_VERIFIED', 'FaceDescriptor', {
        entityId: student.id,
        afterData: { similarityScore, antispoofScore, livenessScore, examId },
        ipAddress: getClientAddress(),
    }).catch(err => console.error('Audit sync error:', err));

    return json({ success: true });
};