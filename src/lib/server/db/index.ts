import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { DATABASE_URL } from '$env/static/private';


// ─── Prisma singleton ─────────────────────────────────────────────────────────
// Prevents multiple instances in SvelteKit dev (HMR re-imports)
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);

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

// ─── Raw pg pool (complex queries only) ──────────────────────────────────────

const { Pool } = pg;

function parseConnectionUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || '5432', 10),
    user: u.username,
    password: u.password,
    database: u.pathname.replace(/^\//, ''),
  };
}

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (_pool) return _pool;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('[DB] DATABASE_URL is not set');

  _pool = new Pool({
    ...parseConnectionUrl(url),
    ssl: false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  _pool.on('error', (err) => console.error('[DB] Pool error:', err));
  return _pool;
}

/** Raw SQL query — use for complex joins, aggregates, DB functions */
export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const result = await getPool().query<T>(text, params);
    const ms = Date.now() - start;
    if (ms > 500) console.warn(`[DB] Slow query (${ms}ms):`, text.slice(0, 120));
    return result.rows;
  } catch (err) {
    console.error('[DB] Raw query error:', text.slice(0, 120));
    throw err;
  }
}

/** Transaction wrapper for raw SQL */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
