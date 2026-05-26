import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { DATABASE_URL } from '$env/static/private';

// ─── Prisma singleton ─────────────────────────────────────────────────────────
//
// Prisma manages its own pg pool internally. Pool behaviour is controlled via
// DATABASE_URL query params — no adapter needed, one fewer abstraction layer.
//
// Stored on globalThis in dev so HMR doesn't spin up a new pool on every
// hot reload. In production there is only one module instance so globalThis
// is a no-op, but it's harmless.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ─── Raw pg pool (complex queries / transactions only) ────────────────────────
//
// Kept separate from Prisma so raw SQL and ORM queries don't compete for
// connections. Capped at 5 — combined with Prisma's own pool (also 5 via
// DATABASE_URL) this stays well under typical hosted-DB limits (25–30).
//
// The 'error' listener MUST be attached before any connection is attempted.
// Without it, a dropped idle connection emits an uncaught 'error' event and
// Node's default handler calls process.exit().

let _rawPool: pg.Pool | null = null;

function getRawPool(): pg.Pool {
  if (_rawPool) return _rawPool;

  _rawPool = new pg.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  // Must be attached immediately — same reason as above.
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