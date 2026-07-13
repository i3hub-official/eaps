// src/routes/api/face/verify-session/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { audit } from '$lib/server/audit.js';

// GET — read-only status check. Never mutates session state. This is what
// ExamMonitor should call to find out whether the student is verified;
// previously it was reusing POST (below) with a hardcoded verified:true,
// which meant "checking" status and "granting" verification were the same
// request — so every status check silently verified the session.
export const GET: RequestHandler = async ({ locals }) => {
    await requireStudent(locals.user);
    const verified = locals.session?.faceVerified === true;
    return json({
        success: verified,
        verifiedAt: locals.session?.faceVerifiedAt ?? null,
        examId: locals.session?.verifiedExamId ?? null,
    });
};

// POST — actually perform verification. Only FaceVerifyModal should call
// this, with real scores computed client-side from an actual capture.
export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
    const student = await requireStudent(locals.user);
    const { verified, similarityScore, antispoofScore, livenessScore, examId } = await request.json();

    if (!verified) {
        return json({ success: false, message: 'Biometric thresholds not met.' });
    }

    if (locals.session) {
        locals.session.faceVerified = true;
        locals.session.faceVerifiedAt = new Date().toISOString();
        locals.session.verifiedExamId = examId;
    }

    audit.student(student.id, 'FACE_VERIFIED', 'FaceDescriptor', {
        entityId: student.id,
        afterData: { similarityScore, antispoofScore, livenessScore, examId },
        ipAddress: getClientAddress(),
    }).catch(err => console.error('Audit sync error:', err));

    return json({ success: true });
};