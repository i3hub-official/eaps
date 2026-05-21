import { randomBytes } from 'crypto';
import { prisma } from '$lib/server/db/index.js';
import type { Cookies } from '@sveltejs/kit';
import type { User } from '@prisma/client';

const SESSION_COOKIE = 'etest_session';
const SESSION_TTL_DAYS = 7;

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

export async function validateSession(token: string): Promise<User | null> {
  const session = await prisma.authSession.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Expired — clean it up
    await prisma.authSession.delete({ where: { token } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;

  return session.user;
}

// ─── Destroy ──────────────────────────────────────────────────────────────────

export async function destroySession(token: string): Promise<void> {
  await prisma.authSession.deleteMany({ where: { token } });
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
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

// ─── Cleanup job (call on a schedule or at startup) ───────────────────────────

export async function purgeExpiredSessions(): Promise<number> {
  const { count } = await prisma.authSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}