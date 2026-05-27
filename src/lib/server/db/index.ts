// src/lib/server/db/index.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { DATABASE_URL } from '$env/static/private';

// ─── Prisma pool ──────────────────────────────────────────────────────────────
//
// The pool MUST have an 'error' listener attached before any connection is
// attempted. Without it, a broken idle connection emits an uncaught 'error'
// event and Node's default handler calls process.exit().
//
// We create the pool once, attach the listener immediately, then pass it to
// Prisma. The listener only logs — it never rethrows — so a lost DB connection
// is visible in logs but never kills the server.

const prismaPool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// ⚠️  This MUST be registered before any query is made.
// pg emits 'error' on the pool when a client encounters a network drop,
// auth failure, or unexpected server termination while idle. Without a
// listener, Node treats it as an uncaught exception → process crash.
prismaPool.on('error', (err) => {
  // Log but never throw — the next query will reconnect automatically.
  console.error('[DB:prisma-pool] Idle client error (non-fatal):', err.message);
});

const adapter = new PrismaPg(prismaPool);

// ─── Prisma singleton ─────────────────────────────────────────────────────────
//
// Stored on globalThis in dev so HMR doesn't create a new client (and new
// connection pool) on every hot reload. In production there is only one
// module instance so globalThis is not needed, but it's harmless.

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

// ─── Raw pg pool (complex queries / transactions only) ────────────────────────
//
// Separate pool from the Prisma one so raw SQL and ORM queries don't compete
// for the same connections. Same error-listener discipline as above.

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
    // Log the query prefix for debugging, then re-throw so the caller
    // (a SvelteKit action or load fn) can return an appropriate HTTP response
    // rather than leaving the request hanging.
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
    // ROLLBACK is best-effort — if the connection is already dead this will
    // also throw, but that's fine: we still re-throw the original error below.
    await client.query('ROLLBACK').catch((rbErr) => {
      console.error('[DB] ROLLBACK failed:', rbErr.message);
    });
    throw err;
  } finally {
    // Always release so the connection returns to the pool.
    client.release();
  }
}