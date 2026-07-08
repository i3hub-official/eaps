// src/routes/(auth)/register/+page.server.ts
// MOUAU eTEST — student self-registration (students only; staff accounts
// are provisioned separately, not via self-service signup)
//
// Flow: student enters matric → scans/pastes receipt ref → server fetches
// MOUAU printable-receipt API → returns parsed data + masked preview →
// student confirms on step 2 → creates account on step 3.

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseReceiptHtml, maskValue, extractRefFromUrl } from '$lib/universities/receipt';
import { getUniConfig } from '$lib/universities/registry';
import { getPrismaClient } from '$lib/server/db/index.js';
import {
	hashPassword,
	validatePasswordStrength,
	createStudentSession,
	STUDENT_COOKIE,
	cookieOptions,
} from '$lib/server/auth';
import { protectStudentRegistration } from '$lib/security/dataProtection';

// ─── MOUAU config (resolved once — both optional fields get typed defaults) ──
const MOUAU = getUniConfig('MOUAU')!;
const RECEIPT_CFG = MOUAU.receipt!;
const REF_FIELD_NAME = RECEIPT_CFG.refFieldName ?? 'ref';
const REF_EXTRACT_PARAM = RECEIPT_CFG.refExtractParam ?? 'transaction_ref';

// ─── Shared HTML fetch ────────────────────────────────────────────────────────
async function fetchHtml(url: string): Promise<string> {
	const res = await fetch(url, {
		headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
		signal: AbortSignal.timeout(10_000)
	});
	const html = await res.text();
	if (html.trimStart().startsWith('{')) {
		const json = JSON.parse(html) as { message?: string };
		throw new Error(json.message ?? 'Invalid reference number');
	}
	return html;
}

// ─── Load ─────────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async () => ({});

// ─── Actions ──────────────────────────────────────────────────────────────────
export const actions: Actions = {
	fetchReceipt: async ({ request }) => {
		const form = await request.formData();

		const raw = form.get(REF_FIELD_NAME)?.toString().trim() ?? '';
		const ref = extractRefFromUrl(raw, REF_EXTRACT_PARAM);

		if (!ref) {
			return fail(400, { error: `Missing ${RECEIPT_CFG.refLabel}.` });
		}

		try {
			const html = await fetchHtml(
				`https://apis.backend.mouau.edu.ng/api/printable-receipt?transaction_ref=${encodeURIComponent(ref)}`
			);

			const map = parseReceiptHtml(html);
			const get = (k: string) => map[k.toLowerCase()] ?? '';

			if (!get('name') && !get('matric no')) {
				return fail(400, { error: 'Could not read receipt. Check the ref number and try again.' });
			}

			const data: Record<string, string> = {
				name: get('name'),
				college: get('college'),
				department: get('department'),
				matricNo: get('matric no'),
				jambregNo: get('reg. no'),
				level: get('level'),
				session: get('session'),
				receiptNo: get('portal issued receipt number'),
				rrrCode: get('rrr code')
			};

			const preview: Record<string, string> = {};
			for (const field of RECEIPT_CFG.fields) {
				const value = (data[field.key] ?? '').trim();
				if (!value) continue;
				preview[field.label] = field.mask
					? maskValue(value, field.maskStart ?? 2, field.maskEnd ?? 2)
					: value;
			}

			return { success: true, data: { ...data, preview } };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			console.error('[fetchReceipt]', message);
			return fail(400, { error: message });
		}
	},

signup: async ({ request, cookies, getClientAddress }) => {
    const form = await request.formData();
    const g = (k: string) => form.get(k)?.toString().trim() ?? '';

    const firstName = g('firstName');
    const otherName = g('otherName');
    const surname = g('surname');
    const email = g('email').toLowerCase();
    const phone = g('phone') || null;
    const password = g('password');
    const matricNumber = g('matricNumber');
    const jambRegNo = g('jambRegNo');
    const departmentStr = g('department');
    const levelStr = g('level');
    const session = g('session') || null;
    const receiptNo = g('receiptNo') || null;
    const receiptRef = g('receiptRef') || null;
    const programmeType = g('programmeType') || 'UNDERGRADUATE';

    const values = { 
        firstName, 
        otherName, 
        surname, 
        email, 
        phone, 
        matricNumber, 
        department: departmentStr, 
        level: levelStr,
        jambRegNo,
    };

    if (!email) return fail(400, { error: 'Email is required.', values });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return fail(400, { error: 'Enter a valid email address.', values });
    }
    if (!firstName) return fail(400, { error: 'First name is required.', values });
    if (!surname) return fail(400, { error: 'Surname is required.', values });
    if (!matricNumber) return fail(400, { error: 'Matric number is required.', values });
    if (!jambRegNo) return fail(400, { error: 'JAMB registration number is required.', values });
    if (!departmentStr) return fail(400, { error: 'Department is required.', values });
    if (!levelStr) return fail(400, { error: 'Level is required.', values });

    const pwErr = validatePasswordStrength(password);
    if (pwErr) return fail(400, { error: pwErr, values });

    const prisma = await getPrismaClient();

    // Find department with college
    const dept = await prisma.department.findFirst({
        where: { name: { contains: departmentStr, mode: 'insensitive' } },
        include: { college: true },
    });
    if (!dept) {
        return {
            success: false,
            error: `Could not match department "${departmentStr}" to a known department. Contact the registrar.`,
            values,
        };
    }

    // Try multiple strategies to find a programme
    let programme = null;

    programme = await prisma.programme.findFirst({
        where: {
            departmentId: dept.id,
            type: programmeType as any,
            shortName: { contains: 'Regular', mode: 'insensitive' },
            isActive: true,
        },
    });

    if (!programme) {
        programme = await prisma.programme.findFirst({
            where: {
                departmentId: dept.id,
                type: programmeType as any,
                isActive: true,
            },
        });
    }

    if (!programme) {
        programme = await prisma.programme.findFirst({
            where: {
                departmentId: dept.id,
                isActive: true,
            },
        });
    }

    if (!programme) {
        return {
            success: false,
            error: `No active programme is configured for ${dept.name}. Contact the registrar.`,
            values,
        };
    }

    const levelNum = parseInt(levelStr, 10);
    if (Number.isNaN(levelNum)) {
        return { success: false, error: `Could not read level "${levelStr}".`, values };
    }
    const level = await prisma.level.findUnique({ where: { name: levelNum } });
    if (!level) {
        return {
            success: false,
            error: `Level ${levelNum} is not configured in the system. Contact the registrar.`,
            values,
        };
    }

    const protectedData = await protectStudentRegistration({
        email,
        phone,
        firstName,
        lastName: surname,
        otherNames: otherName || null,
        matricNumber,
        jambRegNo,
        receiptNo,
        receiptRef,
    });

    const [dupEmail, dupMatric, dupJamb, dupPhone] = await Promise.all([
        prisma.student.findUnique({ where: { emailHash: protectedData.emailHash } }),
        prisma.student.findUnique({ where: { matricNumber: protectedData.matricNumber } }),
        prisma.student.findUnique({ where: { jambRegNo: protectedData.jambRegNo } }),
        protectedData.phoneHash 
            ? prisma.student.findUnique({ where: { phoneHash: protectedData.phoneHash } })
            : Promise.resolve(null),
    ]);

    if (dupEmail) {
        return fail(400, { error: 'An account with this email already exists.', values });
    }
    if (dupMatric) {
        return fail(400, { error: 'An account with this matric number already exists.', values });
    }
    if (dupJamb) {
        return fail(400, { error: 'An account with this JAMB registration number already exists.', values });
    }
    if (dupPhone) {
        return fail(400, { error: 'An account with this phone number already exists.', values });
    }

    const passwordHash = await hashPassword(password);

    const entryYear =
        session && /^\d{4}/.test(session) ? parseInt(session.slice(0, 4), 10) : new Date().getFullYear();

    let student;
    try {
        student = await prisma.student.create({
            data: {
                matricNumber: protectedData.matricNumber,
                jambRegNo: protectedData.jambRegNo,
                receiptNo: protectedData.receiptNo,
                receiptRef: protectedData.receiptRef,
                receiptSource: 'MOUAU',
                registrationSession: session,
                email: protectedData.email,
                emailHash: protectedData.emailHash,
                passwordHash,
                firstName: protectedData.firstName,
                lastName: protectedData.lastName,
                otherNames: protectedData.otherNames,
                phone: protectedData.phone,
                phoneHash: protectedData.phoneHash,
                departmentId: dept.id,
                programmeId: programme.id,
                currentLevelId: level.id,
                entryYear,
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[register/signup]', message);

        if (message.toLowerCase().includes('unique constraint')) {
            return fail(400, {
                error: 'An account with this email, matric number, JAMB number, or phone number already exists.',
                values,
            });
        }
        return fail(400, { error: 'Unable to create account. Please try again.', values });
    }

    const ip = getClientAddress();
    const userAgent = request.headers.get('user-agent') ?? undefined;
    const { token } = await createStudentSession(student.id, { ipAddress: ip, userAgent });
    cookies.set(STUDENT_COOKIE, token, cookieOptions);

    // throw redirect(303, '/student');
	return { success: true };

},
};