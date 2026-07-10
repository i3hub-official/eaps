// src/lib/server/cache.ts
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
}

export const serverCache = new MemoryCache();