// src/routes/admin/api-keys/playground/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db/index.js';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { randomBytes } from 'crypto';
import { hashPassword } from '$lib/server/auth/password.js';

const TEST_KEY_PREFIX = 'test_';
const TEST_KEY_EXPIRY_MINUTES = 60;

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);

  // Load ALL active test keys for this user (not just one)
  const testKeys = await prisma.apiKey.findMany({
    where: {
      createdById: locals.user.id,
      name: { startsWith: 'Test Key' },
      status: 'active',
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return { testKeys };
};

export const actions: Actions = {
  createTestKey: async ({ locals }) => {
    requireAdmin(locals.user);

    // Revoke any existing test keys for this user
    await prisma.apiKey.updateMany({
      where: {
        createdById: locals.user.id,
        name: { startsWith: 'Test Key' },
        status: 'active',
      },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedById: locals.user.id,
      },
    });

    // Generate raw key
    const rawKey = `${TEST_KEY_PREFIX}${randomBytes(32).toString('hex')}`;
    const keyHash = await hashPassword(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    // Create test key with read-only scopes
    const testKey = await prisma.apiKey.create({
      data: {
        name: `Test Key — ${new Date().toLocaleString('en-NG', { hour: '2-digit', minute: '2-digit' })}`,
        keyHash,
        keyPrefix,
        scopes: ['read_users', 'read_exams', 'read_results', 'read_reports', 'read_violations'],
        status: 'active',
        createdById: locals.user.id,
        expiresAt: new Date(Date.now() + TEST_KEY_EXPIRY_MINUTES * 60 * 1000),
      },
      select: {
        id: true,
        name: true,
      },
    });

    return {
      success: true,
      rawKey,
      keyId: testKey.id,
      keyName: testKey.name,
    };
  },

  revokeKey: async ({ request, locals }) => {
    requireAdmin(locals.user);

    const formData = await request.formData();
    const id = formData.get('id') as string;

    if (!id) {
      return { success: false, error: 'Key ID required' };
    }

    const key = await prisma.apiKey.findFirst({
      where: {
        id,
        createdById: locals.user.id,
        name: { startsWith: 'Test Key' },
        status: 'active',
      },
    });

    if (!key) {
      return { success: false, error: 'Test key not found or already revoked' };
    }

    await prisma.apiKey.update({
      where: { id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedById: locals.user.id,
      },
    });

    return { success: true };
  },
};