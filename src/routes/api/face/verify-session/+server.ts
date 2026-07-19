// src/routes/api/face/verify-session/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { audit } from '$lib/server/audit.js';

// GET — read-only status check. Never mutates session state. This is what
// ExamMonitor should call to find out whether the student is verified.
//
// Reads from the AssessmentSession row itself (source of truth), not the
// cookie session — locals.session is per-login, not per-exam-attempt, and
// won't distinguish between two different assessment attempts by the same
// student in the same login session.
export const GET: RequestHandler = async ({ locals, url }) => {
    const student = await requireStudent(locals.user);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
        throw error(400, 'sessionId query param is required.');
    }

    const prisma = await getPrismaClient();
    const assessmentSession = await prisma.assessmentSession.findUnique({
        where: { id: sessionId },
        select: { studentId: true, faceVerifiedAt: true, faceScore: true, assessmentId: true },
    });

    if (!assessmentSession || assessmentSession.studentId !== student.id) {
        throw error(404, 'Session not found.');
    }

    return json({
        success: assessmentSession.faceVerifiedAt !== null,
        verifiedAt: assessmentSession.faceVerifiedAt,
        examId: assessmentSession.assessmentId,
        faceScore: assessmentSession.faceScore,
    });
};

// POST — actually perform verification. Only FaceVerifyModal should call
// this, with real scores computed client-side from an actual capture.
//
// examId here is actually the AssessmentSession id (FaceVerifyModal passes
// its `sessionId` prop through as `examId` — kept the wire name for
// backwards compat, but treat it as the session identifier).
export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
    const student = await requireStudent(locals.user);
    const { verified, similarityScore, antispoofScore, livenessScore, examId } = await request.json();

    if (!examId) {
        throw error(400, 'examId (assessment session id) is required.');
    }

    const prisma = await getPrismaClient();

    // Confirm the session belongs to this student before writing anything.
    const assessmentSession = await prisma.assessmentSession.findUnique({
        where: { id: examId },
        select: { studentId: true },
    });

    if (!assessmentSession || assessmentSession.studentId !== student.id) {
        throw error(404, 'Session not found.');
    }

    if (!verified) {
        return json({ success: false, message: 'Biometric thresholds not met.' });
    }

    await prisma.assessmentSession.update({
        where: { id: examId },
        data: {
            faceVerifiedAt: new Date(),
            faceScore: typeof similarityScore === 'number' ? similarityScore : null,
        },
    });

    audit.student(student.id, 'FACE_VERIFIED', 'FaceDescriptor', {
        entityId: student.id,
        afterData: { similarityScore, antispoofScore, livenessScore, examId },
        ipAddress: getClientAddress(),
    }).catch(err => console.error('Audit sync error:', err));

    return json({ success: true });
};