// src/routes/api/face/enroll/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { encryptDescriptor, findDuplicateEnrollment } from '$lib/server/face/crypto.js';
import { audit } from '$lib/server/audit.js';

// Enforced floor to guarantee matching accuracy constraints
const MIN_DESCRIPTOR_LENGTH = 128;

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
    const student = await requireStudent(locals.user);

    const body = await request.json();
    const descriptor = body.descriptor as number[];

    // 1. Structural Sanity Verification
    const isValid =
        Array.isArray(descriptor) &&
        descriptor.length >= MIN_DESCRIPTOR_LENGTH &&
        descriptor.every((n) => typeof n === 'number' && Number.isFinite(n));

    if (!isValid) {
        throw error(400, 'Invalid face descriptor parameters.');
    }

    // 2. Multi-Account Cross Match Attack Protection
    const duplicate = await findDuplicateEnrollment(descriptor, student.id);
    if (duplicate) {
        throw error(409, 'This face layout is already registered to another student account.');
    }

    // 3. Cryptographic Tokenization & Write Isolation
    const { encryptedData, iv } = await encryptDescriptor(descriptor);
    const prisma = await getPrismaClient();
    const ip = getClientAddress();

    // Database transactional persistence orchestration
    await prisma.faceDescriptor.upsert({
        where: { studentId: student.id },
        create: { studentId: student.id, encryptedData, iv, enrolledIpAddress: ip },
        update: { encryptedData, iv, enrolledAt: new Date(), enrolledIpAddress: ip },
    });

    await prisma.student.update({
        where: { id: student.id },
        data: { faceEnrolledAt: new Date() },
    });

    // 4. Trace Log Tracking Event Registry
    await audit.student(student.id, 'FACE_ENROLLED', 'FaceDescriptor', { ipAddress: ip });

    return json({ enrolled: true });
};