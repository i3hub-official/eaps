import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { listApiKeys, createApiKey, revokeApiKey } from '$lib/server/db/api-keys.js';
import type { ApiScope } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals.user);
  const { keys } = await listApiKeys();
  const activeKeys = keys.filter(k =>
    k.status === 'active' &&
    (!k.expiresAt || new Date(k.expiresAt) > new Date())
  );
  return { keys: activeKeys };
};

export const actions: Actions = {
  // Creates a short-lived test key for playground use
  createTestKey: async ({ locals }) => {
    await requireAdmin(locals.user);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const { key, rawKey } = await createApiKey({
      name: `Playground Test Key — ${new Date().toLocaleTimeString()}`,
      scopes: [
        'read_users',
        'read_exams',
        'read_results',
        'read_reports',
        'read_violations',
      ] as ApiScope[],
      createdById: locals.user!.id,
      expiresAt,
      ipWhitelist: [],
    });

    return { success: true, rawKey, keyId: key.id, keyName: key.name };
  },

  // Revoke a key (used when playground unloads or user manually revokes)
  revokeKey: async ({ request, locals }) => {
    await requireAdmin(locals.user);
    const fd = await request.formData();
    const id  = fd.get('id')?.toString() ?? '';
    if (!id) return fail(400, { error: 'Missing id' });
    await revokeApiKey(id, locals.user!.id);
    return { success: true };
  },
};