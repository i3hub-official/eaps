// src/routes/api/admin/api-keys/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getApiKey, updateApiKey, revokeApiKey, deleteApiKey } from '$lib/server/db/api-keys.js';
import type { ApiScope } from '@prisma/client';

export const GET: RequestHandler = async ({ locals, params }) => {
  if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
  const key = await getApiKey(params.id);
  if (!key) error(404, 'Key not found');
  return json(key);
};

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
  if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');

  const body = await request.json().catch(() => null);
  if (!body) error(400, 'Invalid JSON');

  const { name, scopes, ipWhitelist } = body as {
    name?: string;
    scopes?: ApiScope[];
    ipWhitelist?: string[];
  };

  const key = await updateApiKey(params.id, { name, scopes, ipWhitelist });
  return json(key);
};

export const DELETE: RequestHandler = async ({ locals, params, url }) => {
  if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');

  const revoke = url.searchParams.get('revoke') === 'true';
  if (revoke) {
    const key = await revokeApiKey(params.id, locals.user.id);
    return json(key);
  }

  await deleteApiKey(params.id);
  return new Response(null, { status: 204 });
};