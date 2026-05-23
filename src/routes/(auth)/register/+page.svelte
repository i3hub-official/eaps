// src/routes/(auth)/register/+page.server.ts

import type { Actions, PageServerLoad } from './$types';
import { fail }                          from '@sveltejs/kit';
import { nanoid }                        from 'nanoid';
import { prisma }                        from '$lib/server/prisma';
import { hashPassword, createSession }   from '$lib/server/auth';
import { parseReceiptHtml, maskValue }   from '$lib/universities/receipt';

// ─── Shared fetch helper ──────────────────────────────────────────
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(10_000),
  });
  const html = await res.text();
  if (html.trimStart().startsWith('{')) {
    const json = JSON.parse(html);
    throw new Error(json.message ?? 'Invalid reference');
  }
  return html;
}

// ─── Load ─────────────────────────────────────────────────────────
export const load: PageServerLoad = async () => {
  // Departments are auto-filled from receipt; nothing to pre-load.
  return {};
};

// ─── Actions ──────────────────────────────────────────────────────
export const actions: Actions = {

  // ── Fetch MOUAU school-fee receipt by transaction ref ─────────────
  fetchReceipt: async ({ request }) => {
    const form = await request.formData();
    const ref  = form.get('ref')?.toString().trim();

    if (!ref) return fail(400, { success: false, error: 'Missing ref' });

    try {
      const html = await fetchHtml(
        `https://apis.backend.mouau.edu.ng/api/printable-receipt?transaction_ref=${encodeURIComponent(ref)}`
      );

      const map = parseReceiptHtml(html);
      const get = (k: string) => map[k.toLowerCase()] ?? '';

      if (!get('name') && !get('matric no')) {
        return fail(422, { success: false, error: 'Could not parse receipt. Check the ref and try again.' });
      }

      const data = {
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

      return {
        success: true,
        data: {
          ...data,
          preview: {
            Name:        data.name,
            College:     data.college,
            Department:  data.department,
            'Matric No': data.matricNo,
            'JAMB Reg':  maskValue(data.jambregNo, 4, 3),
            'Receipt No': maskValue(data.receiptNo, 2, 2),
          },
        },
      };
    } catch (err: unknown) {
      return fail(500, {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  // ── Student signup ─────────────────────────────────────────────────
  signup: async (event) => {
    const form = await event.request.formData();
    const g    = (k: string) => form.get(k)?.toString().trim() ?? '';

    // ── Input ─────────────────────────────────────────────────────
    const firstName    = g('firstName');
    const otherName    = g('otherName') || null;
    const surname      = g('surname');
    const email        = g('email');
    const phone        = g('phone')    || null;
    const password     = g('password');
    const matricNumber = g('matricNumber') || null;
    const jambRegNo    = g('jambRegNo')    || null;
    const collegeStr   = g('college')      || null;
    const departmentStr = g('department')  || null;
    const levelStr     = g('level')        || null;
    const session      = g('session')      || null;
    const receiptNo    = g('receiptNo')    || null;
    const receiptRef   = g('receiptRef')   || null;

    const values = { firstName, otherName, surname, email, phone, matricNumber, jambRegNo,
                     college: collegeStr, department: departmentStr, level: levelStr };

    // ── Validation ────────────────────────────────────────────────
    if (!email)     return fail(400, { success: false, error: 'Email is required.',      values });
    if (!firstName) return fail(400, { success: false, error: 'First name is required.', values });
    if (!surname)   return fail(400, { success: false, error: 'Surname is required.',    values });
    if (!matricNumber) return fail(400, { success: false, error: 'Matric number is required.', values });
    if (!departmentStr) return fail(400, { success: false, error: 'Department is required.',   values });
    if (!password || password.length < 8) {
      return fail(400, { success: false, error: 'Password must be at least 8 characters.', values });
    }

    try {
      const passwordHash = await hashPassword(password);

      // ── Check duplicates ──────────────────────────────────────
      const existingEmail = await prisma.student.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      });
      if (existingEmail) {
        return fail(409, { success: false, error: 'An account with this email already exists.', values });
      }

      if (matricNumber) {
        const existingMatric = await prisma.student.findUnique({
          where: { matricNumber },
          select: { id: true },
        });
        if (existingMatric) {
          return fail(409, {
            success: false,
            error: 'An account with this matric number already exists.',
            values,
          });
        }
      }

      // ── Resolve MOUAU university ──────────────────────────────
      const university = await prisma.university.findFirst({
        where: {
          OR: [
            { slug: 'mouau' },
            { name: { contains: 'Michael Okpara', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });

      // ── Resolve department ────────────────────────────────────
      let departmentId: number | null = null;
      if (departmentStr && university) {
        const dept = await prisma.department.findFirst({
          where: {
            name: { contains: departmentStr, mode: 'insensitive' },
            college: { universityId: university.id },
          },
          select: { id: true },
        });
        departmentId = dept?.id ?? null;
      }

      // ── Resolve college ───────────────────────────────────────
      let collegeId: number | null = null;
      if (collegeStr && university) {
        const col = await prisma.college.findFirst({
          where: {
            name: { contains: collegeStr, mode: 'insensitive' },
            universityId: university.id,
          },
          select: { id: true },
        });
        collegeId = col?.id ?? null;
      }

      // ── Create student account ────────────────────────────────
      const studentId = nanoid();

      const student = await prisma.student.create({
        data: {
          id:           studentId,
          firstName:    firstName.toUpperCase(),
          otherName:    otherName?.toUpperCase() ?? null,
          surname:      surname.toUpperCase(),
          email:        email.toLowerCase(),
          phone:        phone ?? null,
          passwordHash,
          matricNumber: matricNumber ?? null,
          jambRegNo:    jambRegNo   ?? null,
          level:        levelStr    ? parseInt(levelStr) : null,
          session:      session     ?? null,
          receiptNo:    receiptNo   ?? null,
          receiptRef:   receiptRef  ?? null,
          isVerified:   false,
          universityId: university?.id  ?? null,
          collegeId:    collegeId       ?? null,
          departmentId: departmentId    ?? null,
        },
        select: {
          id: true,
          firstName: true,
          otherName: true,
          surname: true,
          email: true,
          matricNumber: true,
          isVerified: true,
          universityId: true,
          collegeId: true,
          departmentId: true,
        },
      });

      // ── Create session ────────────────────────────────────────
      await createSession(event, {
        id:           student.id,
        email,
        firstName:    student.firstName,
        otherName:    student.otherName,
        surname:      student.surname,
        matricNumber: student.matricNumber,
        isVerified:   student.isVerified,
        universityId: student.universityId,
        collegeId:    student.collegeId,
        departmentId: student.departmentId,
        role:         'student',
      });

      return { success: true };

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[register] error:', message);

      if (message.includes('Unique constraint') || message.includes('unique')) {
        return fail(409, {
          success: false,
          error: 'An account with this email or matric number already exists.',
          values,
        });
      }

      return fail(500, {
        success: false,
        error: 'Unable to create account. Please try again.',
        values,
      });
    }
  },
};