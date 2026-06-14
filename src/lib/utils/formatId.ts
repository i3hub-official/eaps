// src/lib/utils/formatId.ts

// Detects and formats UUID / CUID / GUID / numeric padded IDs
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID_RE  = /^c[a-z0-9]{20,}$/i;
const GUID_RE  = /^\{?[0-9a-f]{32}\}?$/i;
const SHORT_RE = /^[A-Z]{1,4}\d{3,6}$/i;   // AL001, V003, INC-001

export function isRawId(val: string): boolean {
  return UUID_RE.test(val) || CUID_RE.test(val) || GUID_RE.test(val);
}

export function isShortId(val: string): boolean {
  return SHORT_RE.test(val);
}

/** Format any ID for display — raw GUIDs get trimmed to first 8 chars uppercased */
export function formatId(val: string): string {
  if (UUID_RE.test(val)) return val.replace(/-/g, '').slice(0, 8).toUpperCase();
  if (CUID_RE.test(val)) return val.slice(0, 8).toUpperCase();
  if (GUID_RE.test(val)) return val.replace(/[{}]/g, '').slice(0, 8).toUpperCase();
  if (isShortId(val))    return val.toUpperCase();
  return val;
}

/** Returns true if a column key looks like an ID column */
export function isIdKey(key: string): boolean {
  return /^(id|uuid|guid|cuid|_id)$/i.test(key) ||
         key.endsWith('Id') || key.endsWith('_id');
}