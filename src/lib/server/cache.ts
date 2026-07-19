// src/lib/server/cache.ts

// src/lib/server/cache.ts
// Redis-backed cache, shared across all app instances. Replaces the old
// per-process in-memory cache — necessary once you run more than one
// server instance behind a load balancer, since an in-memory cache on
// instance A is invisible to a request that lands on instance B.
//
// Requires REDIS_URL in your environment and the `redis` package installed
// (`pnpm add redis`).

// import { createClient } from 'redis'
// import { env } from '$env/dynamic/private'

// const redis = createClient({ url: env.REDIS_URL })

// redis.on('error', (err) => {
// 	console.error('[cache] Redis client error:', err)
// })

// let connectPromise: Promise<void> | null = null

// async function ensureConnected(): Promise<boolean> {
// 	if (redis.isOpen) return true
// 	try {
// 		if (!connectPromise) {
// 			connectPromise = redis.connect().then(() => undefined)
// 		}
// 		await connectPromise
// 		return true
// 	} catch (err) {
// 		console.error('[cache] Redis connection failed:', err)
// 		connectPromise = null
// 		return false
// 	}
// }

// export const serverCache = {
// 	/**
// 	 * Returns the cached value, or null on a miss OR on any Redis failure.
// 	 * Callers should always treat null as "go fetch from the source of
// 	 * truth" — this cache fails open, never fails the request.
// 	 */
// 	async get<T>(key: string): Promise<T | null> {
// 		const ok = await ensureConnected()
// 		if (!ok) return null
// 		try {
// 			const raw = await redis.get(key)
// 			return raw ? (JSON.parse(raw) as T) : null
// 		} catch (err) {
// 			console.error(`[cache] get(${key}) failed:`, err)
// 			return null
// 		}
// 	},

// 	/**
// 	 * Best-effort write. A failed cache write must never fail the request
// 	 * that triggered it — the caller already has the fresh value; the
// 	 * cache is purely an optimization for subsequent reads.
// 	 */
// 	async set(key: string, value: unknown, ttlMs: number): Promise<void> {
// 		const ok = await ensureConnected()
// 		if (!ok) return
// 		try {
// 			await redis.set(key, JSON.stringify(value), { PX: ttlMs })
// 		} catch (err) {
// 			console.error(`[cache] set(${key}) failed:`, err)
// 		}
// 	},

// 	/** Explicit invalidation — call this whenever the cached data changes
// 	 * at the source (e.g. session status transitions) before its TTL
// 	 * would naturally expire. */
// 	async del(key: string): Promise<void> {
// 		const ok = await ensureConnected()
// 		if (!ok) return
// 		try {
// 			await redis.del(key)
// 		} catch (err) {
// 			console.error(`[cache] del(${key}) failed:`, err)
// 		}
// 	},
// }




type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key); // Evict expired data
      return null;
    }

    return entry.value as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  // Alias for invalidate() — some call sites (and the commented-out Redis
  // implementation above, which uses .del()) expect a `delete` method.
  // Keeping this as a thin alias rather than renaming invalidate() avoids
  // having to touch every existing caller right now.
  delete(key: string): void {
    this.invalidate(key);
  }
}

export const serverCache = new MemoryCache();

