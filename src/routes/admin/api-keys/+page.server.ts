// src/routes/admin/api-keys/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { createApiKey, listApiKeys, revokeApiKey, deleteApiKey, updateApiKey, getApiKeyStats } from '$lib/server/db/api-keys.ts';
import type { ApiScope } from '@prisma/client';

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals.user);

  const [{ keys, total }, stats] = await Promise.all([
    listApiKeys(),
    getApiKeyStats(),
  ]);

  return { keys, total, stats };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403, { error: 'Forbidden' });

    const fd = await request.formData();
    const name = String(fd.get('name') ?? '').trim();
    const scopes = fd.getAll('scopes') as ApiScope[];
    const expiresIn = fd.get('expiresIn') ? Number(fd.get('expiresIn')) : null;
    const ipWhitelist = String(fd.get('ipWhitelist') ?? '')
      .split(',').map(s => s.trim()).filter(Boolean);

    if (!name) return fail(400, { error: 'Name is required' });
    if (!scopes.length) return fail(400, { error: 'Select at least one scope' });

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
      : null;

    const { key, rawKey } = await createApiKey({
      name, scopes, createdById: locals.user.id, expiresAt, ipWhitelist,
    });

    // rawKey returned only once — pass via form result so page can display it
    return { success: true, rawKey, keyId: key.id };
  },

  revoke: async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403, { error: 'Forbidden' });
    const fd = await request.formData();
    const id = String(fd.get('id') ?? '');
    if (!id) return fail(400, { error: 'Missing id' });
    await revokeApiKey(id, locals.user.id);
    return { success: true };
  },

  delete: async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403, { error: 'Forbidden' });
    const fd = await request.formData();
    const id = String(fd.get('id') ?? '');
    if (!id) return fail(400, { error: 'Missing id' });
    await deleteApiKey(id);
    return { success: true };
  },

  update: async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'admin') return fail(403, { error: 'Forbidden' });
    const fd = await request.formData();
    const id = String(fd.get('id') ?? '');
    const name = String(fd.get('name') ?? '').trim();
    const scopes = fd.getAll('scopes') as ApiScope[];
    const ipWhitelist = String(fd.get('ipWhitelist') ?? '')
      .split(',').map(s => s.trim()).filter(Boolean);

    if (!id) return fail(400, { error: 'Missing id' });
    await updateApiKey(id, { name: name || undefined, scopes: scopes.length ? scopes : undefined, ipWhitelist });
    return { success: true };
  },
};