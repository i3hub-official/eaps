// src/routes/(auth)/register/+page.server.ts
// MOUAU eTEST — student self-registration
//
// Student.programmeId / currentLevelId are optional in this schema —
// self-registration can't reliably resolve a programme from the receipt,
// so it's left for an admin to backfill if unresolved.

import type { Actions, PageServerLoad } from './$types';
import { parseReceiptHtml, maskValue, extractRefFromUrl } from '$lib/universities/receipt';
import { getUniConfig } from '$lib/universities/registry';
import { hashPassword, createStudentSession, STUDENT_COOKIE, cookieOptions } from '$lib/server/auth/index.js';
import { createStudent, emailExists, matricExists } from '$lib/server/db/accounts.js';
import { getPrismaClient } from '$lib/server/db/index.js';

const MOUAU = getUniConfig('MOUAU')!;
const RECEIPT_CFG = MOUAU.receipt!;
const REF_FIELD_NAME    = RECEIPT_CFG.refFieldName    ?? 'ref';
const REF_EXTRACT_PARAM = RECEIPT_CFG.refExtractParam ?? 'transaction_ref';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(10_000),
  });
  const html = await res.text();
  if (html.trimStart().startsWith('{')) {
    const json = JSON.parse(html) as { message?: string };
    throw new Error(json.message ?? 'Invalid reference number');
  }
  return html;
}

export const load: PageServerLoad = async () => ({});

export const actions: Actions = {

  fetchReceipt: async ({ request }) => {
    const form = await request.formData();
    const raw = form.get(REF_FIELD_NAME)?.toString().trim() ?? '';
    const ref = extractRefFromUrl(raw, REF_EXTRACT_PARAM);

    if (!ref) {
      return { success: false, error: `Missing ${RECEIPT_CFG.refLabel}.` };
    }

    try {
      const html = await fetchHtml(
        `https://apis.backend.mouau.edu.ng/api/printable-receipt?transaction_ref=${encodeURIComponent(ref)}`
      );
      const map = parseReceiptHtml(html);
      const get = (k: string) => map[k.toLowerCase()] ?? '';

      if (!get('name') && !get('matric no')) {
        return { success: false, error: 'Could not read receipt. Check the ref number and try again.' };
      }

      const data: Record<string, string> = {
        name:       get('name'),
        college:    get('college'),
        department: get('department'),
        matricNo:   get('matric no'),
        jambregNo:  get('reg. no'),
        level:      get('level'),
        session:    get('session'),
        receiptNo:  get('portal issued receipt number'),
        rrrCode:    get('rrr code'),
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
      return { success: false, error: message };
    }
  },

  signup: async ({ request, cookies, getClientAddress }) => {
    const prisma = await getPrismaClient();
    const form = await request.formData();
    const g = (k: string) => form.get(k)?.toString().trim() ?? '';

    const firstName     = g('firstName');
    const otherNames    = g('otherName') || null;
    const surname       = g('surname');
    const email         = g('email').toLowerCase();
    const phone         = g('phone')        || null;
    const password      = g('password');
    const matricNumber  = g('matricNumber') || null;
    const jambRegNo     = g('jambRegNo')    || null;
    const collegeStr    = g('college')      || null;
    const departmentStr = g('department')   || null;
    const levelStr      = g('level')        || null;
    const sessionStr    = g('session')      || null;
    const receiptNo     = g('receiptNo')    || null;
    const receiptRef    = g('receiptRef')   || null;

    const values = { firstName, otherName: otherNames, surname, email, phone,
                     matricNumber, college: collegeStr, department: departmentStr, level: levelStr };

    if (!email)         return { success: false, error: 'Email is required.',         values };
    if (!firstName)     return { success: false, error: 'First name is required.',    values };
    if (!surname)       return { success: false, error: 'Surname is required.',       values };
    if (!matricNumber)  return { success: false, error: 'Matric number is required.', values };
    if (!departmentStr) return { success: false, error: 'Department is required.',    values };
    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.', values };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Enter a valid email address.', values };
    }

    try {
      const [dupEmail, dupMatric] = await Promise.all([
        emailExists(email),
        matricExists(matricNumber),
      ]);
      if (dupEmail)  return { success: false, error: 'An account with this email already exists.',        values };
      if (dupMatric) return { success: false, error: 'An account with this matric number already exists.', values };

      // ── Resolve College (String cuid, not Int — differs from the original assumption) ──
      let collegeId: string | undefined;
      if (collegeStr) {
        const col = await prisma.college.findFirst({
          where: { name: { contains: collegeStr, mode: 'insensitive' } },
          select: { id: true },
        });
        if (col) collegeId = col.id;
      }

      // ── Resolve Department ──────────────────────────────────────────────────
      let departmentId: string | undefined;
      if (departmentStr) {
        const dept = await prisma.department.findFirst({
          where: {
            name: { contains: departmentStr, mode: 'insensitive' },
            ...(collegeId ? { collegeId } : {}),
          },
          select: { id: true },
        });
        if (dept) departmentId = dept.id;
      }

      if (!departmentId) {
        return {
          success: false,
          error: `Could not match department "${departmentStr}" to a known department. Contact the registrar.`,
          values,
        };
      }

      // ── Resolve Level — best effort, nullable if unresolved ──────────────────
      let currentLevelId: string | undefined;
      if (levelStr) {
        const levelNum = parseInt(levelStr.replace(/\D/g, ''), 10);
        if (!isNaN(levelNum)) {
          const level = await prisma.level.findUnique({ where: { name: levelNum } });
          if (level) currentLevelId = level.id;
        }
      }

      // ── Programme — no name comes off this receipt flow, left for admin to assign ──
      const programmeId: string | undefined = undefined;

      const entryYear = sessionStr ? parseInt(sessionStr.slice(0, 4), 10) : new Date().getFullYear();

      const passwordHash = await hashPassword(password);

      const student = await createStudent({
        email,
        firstName,
        lastName: surname,
        otherNames,
        phone,
        passwordHash,
        matricNumber: matricNumber!,
        departmentId,
        programmeId,
        currentLevelId,
        entryYear,
      });

      const extras: Record<string, unknown> = {};
      if (jambRegNo)  extras.jambRegNo           = jambRegNo;
      if (receiptNo)  extras.receiptNo           = receiptNo;
      if (receiptRef) extras.receiptRef          = receiptRef;
      if (sessionStr) extras.registrationSession = sessionStr;
      extras.receiptSource = 'MOUAU';

      if (Object.keys(extras).length > 0) {
        await prisma.student.update({ where: { id: student.id }, data: extras });
      }

      const { token } = await createStudentSession(student.id, {
        ipAddress: getClientAddress(),
        userAgent: request.headers.get('user-agent') ?? undefined,
      });
      cookies.set(STUDENT_COOKIE, token, cookieOptions);

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[register/signup]', message);

      if (message.includes('Unique constraint') || message.includes('unique')) {
        return {
          success: false,
          error: 'An account with this email or matric number already exists.',
          values,
        };
      }

      return { success: false, error: 'Unable to create account. Please try again.', values };
    }
  },
};