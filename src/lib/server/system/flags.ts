// src/lib/server/system/flags.ts
import { getPrismaClient } from '$lib/server/db/index.js';

const FLAGS_CACHE: Map<string, { value: string; expiresAt: number }> = new Map();
const CACHE_TTL_MS = 15 * 1000; // 15 seconds

/**
 * Get a system flag value from cache or DB.
 * Falls back to env var if set (env takes precedence).
 */
export async function getSystemFlag(
  key: 'maintenance' | 'shutdown',
): Promise<boolean> {
  // Env var overrides DB (hard override for emergencies)
  const envKey = key === 'maintenance' ? 'SYSTEM_MAINTENANCE' : 'SYSTEM_SHUTDOWN';
  if (process.env[envKey] === 'true') return true;
  if (process.env[envKey] === 'false') return false;

  // Check in-memory cache
  const now = Date.now();
  const cached = FLAGS_CACHE.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value === 'true';
  }

  // Query DB
  try {
    const prisma = await getPrismaClient();
    const flag = await prisma.systemFlag.findUnique({
      where: { key },
      select: { value: true },
    });

    const value = flag?.value ?? 'false';
    FLAGS_CACHE.set(key, { value, expiresAt: now + CACHE_TTL_MS });
    return value === 'true';
  } catch (error) {
    console.error(`[system-flags] Failed to fetch flag "${key}":`, error);
    // Safe default: assume maintenance required on DB error
    return true;
  }
}

/**
 * Set a system flag value in the DB and clear cache.
 * Use from admin routes only.
 */
export async function setSystemFlag(
  key: 'maintenance' | 'shutdown',
  value: boolean,
  updatedBy?: string,
): Promise<void> {
  try {
    const prisma = await getPrismaClient();
    await prisma.systemFlag.upsert({
      where: { key },
      update: {
        value: value ? 'true' : 'false',
        updatedBy,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: value ? 'true' : 'false',
        updatedBy,
      },
    });

    // Invalidate cache immediately
    FLAGS_CACHE.delete(key);

    console.log(`[system-flags] Set ${key}=${value} by ${updatedBy || 'system'}`);
  } catch (error) {
    console.error(`[system-flags] Failed to set flag "${key}":`, error);
    throw error;
  }
}

/**
 * Get both system flags at once.
 */
export async function getSystemFlags(): Promise<{
  maintenance: boolean;
  shutdown: boolean;
}> {
  const [maintenance, shutdown] = await Promise.all([
    getSystemFlag('maintenance'),
    getSystemFlag('shutdown'),
  ]);

  return { maintenance, shutdown };
}

/**
 * Clear the in-memory cache (useful after DB direct updates).
 */
export function clearFlagCache(): void {
  FLAGS_CACHE.clear();
}