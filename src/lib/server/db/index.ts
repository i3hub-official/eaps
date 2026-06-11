// src/lib/server/db/index.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { DATABASE_URL, DATABASE_URL_UNPOOLED } from '$env/static/private';

// ─── Prisma pool ──────────────────────────────────────────────────────────────
// @prisma/adapter-pg requires a DIRECT (unpooled) connection.
// Prisma's managed pool (pooled.db.prisma.io) is for Prisma Accelerate only;
// using it with adapter-pg causes the "timeout exceeded" errors you're seeing.

const prismaPool = new pg.Pool({
  connectionString: DATABASE_URL_UNPOOLED,   // ← direct Neon connection
  ssl: { rejectUnauthorized: false },        // required for Neon SSL
  max: 5,                                    // keep low — Neon free tier limit
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 30_000,           // Neon cold-start can take ~3-5 s

});

prismaPool.on('error', (err) => {
  console.error('[DB:prisma-pool] idle client error:', err.message);
});

const adapter = new PrismaPg(prismaPool);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ─── Neon keepalive ───────────────────────────────────────────────────────────
// Neon free tier suspends after ~5 min inactivity. Ping every 4 min via the
// RAW pool (not prismaPool) to avoid inflating Prisma's connection count.
// Only runs in long-lived server processes (dev), not in serverless.

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    getRawPool()
      .query('SELECT 1')
      .catch((err) => console.warn('[DB:keepalive] ping failed:', err.message));
  }, 4 * 60 * 1000);
}

// ─── Raw pg pool ──────────────────────────────────────────────────────────────
// Uses the POOLED URL for raw SQL — Neon's pgBouncer handles connection
// multiplexing so many concurrent requests share fewer backend connections.

let _rawPool: pg.Pool | null = null;

function getRawPool(): pg.Pool {
  if (_rawPool) return _rawPool;

  _rawPool = new pg.Pool({
    connectionString: DATABASE_URL,   // ← pooled URL fine for raw queries
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 30_000,
  });

  _rawPool.on('error', (err) => {
    console.error('[DB:raw-pool] idle client error:', err.message);
  });

  return _rawPool;
}

// ─── Raw SQL helper ───────────────────────────────────────────────────────────

export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const result = await getRawPool().query<T>(text, params);
    const ms = Date.now() - start;
    if (ms > 500) console.warn(`[DB] slow query (${ms}ms):`, text.slice(0, 120));
    return result.rows;
  } catch (err) {
    console.error('[DB] query error:', text.slice(0, 120), err);
    throw err;
  }
}

// ─── Transaction wrapper ──────────────────────────────────────────────────────

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getRawPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch((e) =>
      console.error('[DB] ROLLBACK failed:', e.message)
    );
    throw err;
  } finally {
    client.release();
  }
}