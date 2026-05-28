// src/lib/server/db/index.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { DATABASE_URL } from '$env/static/private';

const prismaPool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

prismaPool.on('error', (err) => {
  console.error('[DB:prisma-pool] Idle client error (non-fatal):', err.message);
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
//
// Neon free tier suspends the DB after ~5 minutes of inactivity, causing
// 1–3 s cold-start delays on the next query. Pinging every 4 minutes keeps
// the compute awake without counting as meaningful load.
// Uses the raw pool directly so Prisma's connection state is unaffected.

setInterval(() => {
  prismaPool.query('SELECT 1').catch((err) => {
    console.warn('[DB:keepalive] Ping failed (non-fatal):', err.message);
  });
}, 3 * 60 * 1000);

// ─── Raw pg pool ──────────────────────────────────────────────────────────────

let _rawPool: pg.Pool | null = null;

function getRawPool(): pg.Pool {
  if (_rawPool) return _rawPool;

  _rawPool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  _rawPool.on('error', (err) => {
    console.error('[DB:raw-pool] Idle client error (non-fatal):', err.message);
  });

  return _rawPool;
}

// ─── Raw SQL helper ───────────────────────────────────────────────────────────

/** Raw SQL query — use for complex joins, aggregates, DB functions */
export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const result = await getRawPool().query<T>(text, params);
    const ms = Date.now() - start;
    if (ms > 500) console.warn(`[DB] Slow query (${ms}ms):`, text.slice(0, 120));
    return result.rows;
  } catch (err) {
    console.error('[DB] Raw query error:', text.slice(0, 120), err);
    throw err;
  }
}

// ─── Transaction wrapper ──────────────────────────────────────────────────────

/** Wraps a raw-SQL callback in BEGIN / COMMIT / ROLLBACK */
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
    await client.query('ROLLBACK').catch((rbErr) => {
      console.error('[DB] ROLLBACK failed:', rbErr.message);
    });
    throw err;
  } finally {
    client.release();
  }
}