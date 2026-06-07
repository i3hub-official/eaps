// src/routes/(auth)/register/+page.server.ts
// MOUAU eTEST — student self-registration
//
// Flow: student enters matric → scans/pastes receipt ref → server fetches
// MOUAU printable-receipt API → returns parsed data + masked preview →
// student confirms on step 2 → creates account on step 3.

import type { Actions, PageServerLoad } from './$types';
import { parseReceiptHtml, maskValue, extractRefFromUrl } from '$lib/universities/receipt';
import { getUniConfig }             from '$lib/universities/registry';
import { hashPassword }             from '$lib/server/auth/password';
import { createSession, setSessionCookie } from '$lib/server/auth/session';
import { createUser, emailExists, matricExists } from '$lib/server/db/users';
import { prisma }                   from '$lib/server/db/index';

// ─── MOUAU config (resolved once — both optional fields get typed defaults) ──
const MOUAU           = getUniConfig('MOUAU')!;
const RECEIPT_CFG     = MOUAU.receipt!;
const REF_FIELD_NAME    = RECEIPT_CFG.refFieldName    ?? 'ref';
const REF_EXTRACT_PARAM = RECEIPT_CFG.refExtractParam ?? 'transaction_ref';

// ─── Shared HTML fetch ────────────────────────────────────────────────────────
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(10_000),
  });
  const html = await res.text();
  // MOUAU API returns a JSON error body on bad refs e.g. {"message":"Invalid ref"}
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

  // ── fetchReceipt ──────────────────────────────────────────────────────────
  //
  // Called by the frontend when the student pastes or scans their MOUAU
  // school-fee receipt ref. Returns:
  //   data   — raw fields for client-side prefill (names, matric, college …)
  //   preview — masked version shown in the receipt card before the student
  //             proceeds to step 2
  //
  // The client posts the field under REF_FIELD_NAME ('ref' for MOUAU) after
  // running extractRefFromUrl on whatever the QR encoded. The server runs
  // extractRefFromUrl again as a safety net in case the client sent a raw URL.
  fetchReceipt: async ({ request }) => {
    const form = await request.formData();

    // extractRefFromUrl handles all four cases:
    //   1. full URL with ?transaction_ref=xxx
    //   2. path segment /transaction_ref/xxx
    //   3. bare query string transaction_ref=xxx
    //   4. raw value (most common — student pastes the number directly)
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

      // Both name and matric absent → the page parsed but held no receipt data
      if (!get('name') && !get('matric no')) {
        return {
          success: false,
          error: 'Could not read receipt. Check the ref number and try again.',
        };
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

      // Build the masked preview from the registry field list — stays in sync
      // automatically when fields are added to the MOUAU registry entry.
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

  // ── signup ─────────────────────────────────────────────────────────────────
  //
  // Creates a User (role: student) and an AuthSession, then sets the session
  // cookie. All academic data comes from what the client pre-filled in steps
  // 1–2 (sourced from the verified receipt).
  //
  // Schema notes (from prisma/schema.prisma):
  //   User.fullName     — single field, format "SURNAME FIRSTNAME [OTHERNAME]"
  //   User.email        — lowercased, unique
  //   User.matricNumber — uppercased, unique
  //   User.jambRegNo    — unique, optional
  //   User.collegeId    — Int FK to College (resolved by name match)
  //   User.departmentId — String UUID FK to Department (resolved by name match)
  //   User.receiptNo / receiptRef / receiptSource — audit trail
  //   AuthSession.token — set as cookie via setSessionCookie()
  signup: async ({ request, cookies, getClientAddress }) => {
    const form = await request.formData();
    const g    = (k: string) => form.get(k)?.toString().trim() ?? '';

    // ── Inputs ──────────────────────────────────────────────────────────────
    const firstName     = g('firstName');
    const otherName     = g('otherName');
    const surname       = g('surname');
    const email         = g('email').toLowerCase();
    const phone         = g('phone')        || null;
    const password      = g('password');
    const matricNumber  = g('matricNumber') || null;
    const jambRegNo     = g('jambRegNo')    || null;
    const collegeStr    = g('college')      || null;   // from receipt; used to resolve collegeId
    const departmentStr = g('department')   || null;
    const levelStr      = g('level')        || null;
    const session       = g('session')      || null;
    const receiptNo     = g('receiptNo')    || null;
    const receiptRef    = g('receiptRef')   || null;

    // MOUAU convention: names are returned uppercase from the receipt
    const fullName = [surname, firstName, otherName]
      .map(s => s.toUpperCase().trim())
      .filter(Boolean)
      .join(' ');

    // Returned to the client on validation errors so the form re-populates
    const values = { firstName, otherName, surname, email, phone,
                     matricNumber, college: collegeStr, department: departmentStr, level: levelStr };

    // ── Server-side validation ───────────────────────────────────────────────
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
      // ── Duplicate checks (parallel) ────────────────────────────────────────
      const [dupEmail, dupMatric] = await Promise.all([
        emailExists(email),
        matricExists(matricNumber),
      ]);
      if (dupEmail)  return { success: false, error: 'An account with this email already exists.',        values };
      if (dupMatric) return { success: false, error: 'An account with this matric number already exists.', values };

      // ── Resolve College (Int PK) ────────────────────────────────────────────
      // MOUAU receipt returns e.g. "College of Natural Sciences".
      // Partial case-insensitive match — if not found, collegeId stays null
      // and the student can be assigned by an admin later.
      let collegeId: number | undefined;
      if (collegeStr) {
        const col = await prisma.college.findFirst({
          where: { name: { contains: collegeStr, mode: 'insensitive' } },
          select: { id: true },
        });
        if (col) collegeId = col.id;
      }

      // ── Resolve Department (UUID String PK) ────────────────────────────────
      // Prefer a department inside the resolved college, fall back to any
      // department with that name if college wasn't found.
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

      // ── Hash password ───────────────────────────────────────────────────────
      const passwordHash = await hashPassword(password);

      // ── Create User ─────────────────────────────────────────────────────────
      // createUser() from $lib/server/db/users normalises email (.toLowerCase())
      // and matricNumber (.toUpperCase()) internally. Extra fields not in the
      // helper's input type (jambRegNo, phone, receiptNo …) are written via a
      // follow-up update so we don't have to fork the helper.
     const user = await createUser({
  email,
  fullName,
  passwordHash,
  role:         'student',
  matricNumber: matricNumber ?? undefined,
  departmentId: departmentId,
  level:        levelStr ? parseInt(levelStr, 10) : undefined,  // 100, 200, 300...
});

      // ── Write extra fields not in createUser() helper ──────────────────────
      // jambRegNo, phone, collegeId, and receipt audit fields are all in the
      // schema but the helper's input type doesn't expose them. A single update
      // is cheaper than forking the helper.
      const extras: Record<string, unknown> = {};
      if (jambRegNo)   extras.jambRegNo    = jambRegNo;
      if (phone)       extras.phone        = phone;
      if (collegeId)   extras.collegeId    = collegeId;
      if (receiptNo)   extras.receiptNo    = receiptNo;
      if (receiptRef)  extras.receiptRef   = receiptRef;
      if (session)     extras.session      = session;
      extras.receiptSource = 'MOUAU';

      if (Object.keys(extras).length > 0) {
        await prisma.user.update({ where: { id: user.id }, data: extras });
      }

      // ── Create session & set cookie ─────────────────────────────────────────
      // createSession(userId, ipAddress?, userAgent?) returns a token string.
      // setSessionCookie() writes it as an httpOnly cookie.
      const ip        = getClientAddress();
      const userAgent = request.headers.get('user-agent') ?? undefined;
      const token     = await createSession(user.id, ip, userAgent);
      setSessionCookie(cookies, token);

      return { success: true };

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[register/signup]', message);

      // Prisma unique constraint — race condition after our duplicate checks
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