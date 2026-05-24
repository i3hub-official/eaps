// src/routes/(auth)/register/+page.server.ts

import type { Actions, PageServerLoad }              from './$types';
import { parseReceiptHtml, maskValue, extractRefFromUrl } from '$lib/universities/receipt';
import { getUniConfig }                              from '$lib/universities/registry';
import { hashPassword }                              from '$lib/server/auth/password';
import { createSession, setSessionCookie }           from '$lib/server/auth/session';
import { createUser, emailExists, matricExists }     from '$lib/server/db/users';
import { prisma }                                    from '$lib/server/db/index';

// ─── MOUAU registry config ────────────────────────────────────────
const MOUAU       = getUniConfig('MOUAU')!;
const RECEIPT_CFG = MOUAU.receipt!;

// ─── Shared HTML fetch ────────────────────────────────────────────
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(10_000),
  });
  const html = await res.text();
  // MOUAU API returns JSON error payloads on bad refs
  if (html.trimStart().startsWith('{')) {
    const json = JSON.parse(html) as { message?: string };
    throw new Error(json.message ?? 'Invalid reference number');
  }
  return html;
}

// ─── Load ─────────────────────────────────────────────────────────
export const load: PageServerLoad = async () => ({});

// ─── Actions ──────────────────────────────────────────────────────
export const actions: Actions = {

  // ── fetchReceipt ─────────────────────────────────────────────────
  // Hits the MOUAU printable-receipt endpoint and returns structured
  // data + a masked preview for the student to confirm before step 2.
  fetchReceipt: async ({ request }) => {
    const form = await request.formData();

    // QR code may encode a full URL; extractRefFromUrl pulls the bare ref
    const raw = form.get(RECEIPT_CFG.refFieldName)?.toString().trim() ?? '';
    const ref = extractRefFromUrl(raw, RECEIPT_CFG.refExtractParam);

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

      // Build masked preview from registry field definitions
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

  // ── signup ────────────────────────────────────────────────────────
  // Creates a User row (role: student), writes an AuthSession, and
  // sets the session cookie. Uses the real schema:
  //   User.fullName   — "SURNAME FIRSTNAME OTHERNAME"
  //   User.email      — lowercased unique
  //   User.matricNumber — uppercased unique
  //   User.departmentId — FK to Department (UUID)
  //   AuthSession     — token stored in DB, cookie set client-side
  signup: async ({ request, cookies, getClientAddress }) => {
    const form = await request.formData();
    const g    = (k: string) => form.get(k)?.toString().trim() ?? '';

    // ── Inputs ────────────────────────────────────────────────────
    const firstName    = g('firstName');
    const otherName    = g('otherName');
    const surname      = g('surname');
    const email        = g('email').toLowerCase();
    const phone        = g('phone')        || null;   // not in schema — ignored below
    const password     = g('password');
    const matricNumber = g('matricNumber') || null;
    const jambRegNo    = g('jambRegNo')    || null;   // stored nowhere in schema — future use
    const departmentStr = g('department')  || null;
    const levelStr     = g('level')        || null;
    const receiptRef   = g('receiptRef')   || null;   // stored nowhere — future audit use

    // fullName follows MOUAU convention: "SURNAME FIRSTNAME [OTHERNAME]"
    const fullName = [surname, firstName, otherName]
      .map(s => s.toUpperCase().trim())
      .filter(Boolean)
      .join(' ');

    const values = {
      firstName, otherName, surname, email,
      matricNumber, department: departmentStr, level: levelStr,
    };

    // ── Server-side validation ───────────────────────────────────
    if (!email)       return { success: false, error: 'Email is required.',        values };
    if (!firstName)   return { success: false, error: 'First name is required.',   values };
    if (!surname)     return { success: false, error: 'Surname is required.',      values };
    if (!matricNumber) return { success: false, error: 'Matric number is required.', values };
    if (!departmentStr) return { success: false, error: 'Department is required.', values };
    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.', values };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Enter a valid email address.', values };
    }

    try {
      // ── Duplicate checks (parallel) ──────────────────────────
      const [dupEmail, dupMatric] = await Promise.all([
        emailExists(email),
        matricExists(matricNumber),
      ]);
      if (dupEmail)  return { success: false, error: 'An account with this email already exists.',        values };
      if (dupMatric) return { success: false, error: 'An account with this matric number already exists.', values };

      // ── Resolve Department UUID ──────────────────────────────
      // Match by partial name — MOUAU receipt returns e.g. "Computer Science"
      const departmentId: string | undefined;
      const dept = await prisma.department.findFirst({
        where: { name: { contains: departmentStr, mode: 'insensitive' } },
        select: { id: true },
      });
      departmentId = dept?.id;

      // ── Hash password ────────────────────────────────────────
      const passwordHash = await hashPassword(password);

      // ── Create User (role: student) ──────────────────────────
      // createUser() normalises email/matricNumber casing internally
      const user = await createUser({
        email,
        fullName,
        passwordHash,
        role:         'student',
        matricNumber: matricNumber ?? undefined,
        departmentId: departmentId,
        level:        levelStr ? parseInt(levelStr, 10) : undefined,
      });

      // ── Create session & set cookie ──────────────────────────
      // createSession(userId, ipAddress?, userAgent?) → token string
      const ip        = getClientAddress();
      const userAgent = request.headers.get('user-agent') ?? undefined;
      const token     = await createSession(user.id, ip, userAgent);
      setSessionCookie(cookies, token);

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