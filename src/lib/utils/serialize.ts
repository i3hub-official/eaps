// src/lib/utils/serialize.ts

/**
 * Recursively serializes Prisma data to JSON-safe format.
 * Handles Decimal, BigInt, Date, Map, Set, and other non-serializable types.
 * Guards against circular references.
 */
export function serializePrismaData<T>(data: T, seen: WeakSet<object> = new WeakSet()): T {
  if (data === null || data === undefined) return data;

  const type = typeof data;

  // Primitives that need conversion
  if (type === 'bigint') {
    return Number(data) as unknown as T;
  }
  if (type !== 'object') {
    // string, number, boolean, function, symbol — return as-is
    return data;
  }

  // From here on, data is a non-null object
  const obj = data as unknown as object;

  // Decimal (Prisma's Decimal type) — duck-typed via constructor name
  // and presence of toNumber/toFixed, since constructor.name can be
  // mangled by some bundlers' minification.
  const ctorName = (obj as any).constructor?.name;
  if (ctorName === 'Decimal' || (typeof (obj as any).toNumber === 'function' && ctorName !== 'Object')) {
    try {
      return Number((obj as any).toString()) as unknown as T;
    } catch {
      return null as unknown as T;
    }
  }

  // Date
  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  // Circular reference guard
  if (seen.has(obj)) {
    return null as unknown as T;
  }
  seen.add(obj);

  // Array
  if (Array.isArray(obj)) {
    return obj.map(item => serializePrismaData(item, seen)) as unknown as T;
  }

  // Map -> plain object
  if (obj instanceof Map) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of obj.entries()) {
      result[String(k)] = serializePrismaData(v, seen);
    }
    return result as unknown as T;
  }

  // Set -> array
  if (obj instanceof Set) {
    return Array.from(obj).map(item => serializePrismaData(item, seen)) as unknown as T;
  }

  // Buffer / Uint8Array -> base64 string (common for Prisma Bytes fields)
  if (obj instanceof Uint8Array) {
    return Buffer.from(obj).toString('base64') as unknown as T;
  }

  // Plain object (and Prisma model instances, which are plain objects)
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    // Skip functions silently — they're not data
    if (typeof value === 'function') continue;
    try {
      result[key] = serializePrismaData(value, seen);
    } catch (err) {
      console.error(`[serializePrismaData] Failed to serialize key "${key}":`, err);
      result[key] = null;
    }
  }
  return result as unknown as T;
}