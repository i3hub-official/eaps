import { randomBytes } from 'crypto';
import { LRUCache } from 'lru-cache';
import { prisma } from '$lib/server/db/index.js';
import type { Cookies } from '@sveltejs/kit';
import type { User } from '@prisma/client';

const SESSION_COOKIE = 'etest_session';
const SESSION_TTL_DAYS = 7;
const VALIDATE_TIMEOUT_MS = 4_000;

// ─── Session cache ────────────────────────────────────────────────────────────
//
// Caches validated sessions for 30 s so repeated requests within a page
// navigation don't each hit the DB. The cache is keyed by token (already
// a 32-byte random hex string, so no extra hashing needed).
//
// destroySession() deletes from the cache so logout takes effect immediately.

type CachedUser = Pick<
  User,
  | 'id'
  | 'email'
  | 'fullName'
  | 'role'
  | 'isActive'
  | 'isSuspended'
  | 'collegeId'
  | 'departmentId'
  | 'photoUrl'
  | 'matricNumber'
>;

const sessionCache = new LRUCache<string, CachedUser | null>({
  max: 1_000,
  ttl: 30_000, // 30 seconds
});

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);

  await prisma.authSession.create({
    data: { userId, token, ipAddress, userAgent, expiresAt },
  });

  return token;
}

// ─── Validate ─────────────────────────────────────────────────────────────────

export async function validateSession(token: string): Promise<CachedUser | null> {
  // Serve from cache if available — avoids a DB round-trip on every request.
  if (sessionCache.has(token)) return sessionCache.get(token) ?? null;

  let session: {
    expiresAt: Date;
    user: CachedUser | null;
  } | null = null;

  try {
    session = await Promise.race([
      prisma.authSession.findUnique({
        where: { token },
        select: {
          expiresAt: true,
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              isActive: true,
              isSuspended: true,
              collegeId: true,
              departmentId: true,
              photoUrl: true,
              matricNumber: true,
            },
          },
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('validateSession timed out')),
          VALIDATE_TIMEOUT_MS
        )
      ),
    ]);
  } catch (err) {
    console.error('[Auth] validateSession failed:', (err as Error).message);
    // Do not cache — let the next request retry.
    return null;
  }

  if (!session?.user) {
    sessionCache.set(token, null);
    return null;
  }

  if (session.expiresAt < new Date()) {
    // Expired — delete asynchronously so we don't block the response.
    prisma.authSession.delete({ where: { token } }).catch(() => {});
    sessionCache.set(token, null);
    return null;
  }

  if (!session.user.isActive || session.user.isSuspended) {
    sessionCache.set(token, null);
    return null;
  }

  sessionCache.set(token, session.user);
  return session.user;
}

// ─── Destroy ──────────────────────────────────────────────────────────────────

export async function destroySession(token: string): Promise<void> {
  sessionCache.delete(token); // invalidate immediately
  await prisma.authSession.deleteMany({ where: { token } });
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  // Can't efficiently invalidate by userId from the cache (it's keyed by
  // token), so we clear the whole cache. Acceptable — this is a rare op
  // (password change, admin suspension) and the cache refills in 30 s.
  sessionCache.clear();
  await prisma.authSession.deleteMany({ where: { userId } });
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function setSessionCookie(cookies: Cookies, token: string): void {
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_DAYS * 86_400,
  });
}

export function clearSessionCookie(cookies: Cookies): void {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function getSessionToken(cookies: Cookies): string | null {
  return cookies.get(SESSION_COOKIE) ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  await destroySession(token);
}

// ─── Cleanup job ──────────────────────────────────────────────────────────────

export async function purgeExpiredSessions(): Promise<number> {
  const { count } = await prisma.authSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}