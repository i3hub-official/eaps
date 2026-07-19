// src/lib/server/face/cache-key.ts

// Single source of truth for the face-descriptor cache key. Import this
// wherever the key is built OR invalidated — a hardcoded string literal in
// two separate files is exactly how enroll's invalidation and descriptor's
// read silently drift apart (e.g. a typo, or one file adding a prefix and
// the other not).
export function faceDescriptorCacheKey(studentId: string): string {
    return `face_descriptor:${studentId}`;
}