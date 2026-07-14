// src/lib/server/face/crypto.ts
// AES-256-GCM encryption for face descriptors + cross-student duplicate detection
// Key is loaded from environment — never hardcoded

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { getPrismaClient, prisma } from '$lib/server/db/index.js';
import { env }    from '$env/dynamic/private';


const ALGORITHM = 'aes-256-gcm'
const DUPLICATE_THRESHOLD = 0.72

// ─── Key loading ──────────────────────────────────────────────────────────────
// FACE_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)
// Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

function getKey(): Buffer {
  const hexKey = env.FACE_ENCRYPTION_KEY
  if (!hexKey || hexKey.length !== 64) {
    throw new Error('FACE_ENCRYPTION_KEY must be a 64-character hex string in .env')
  }
  return Buffer.from(hexKey, 'hex')
}

// ─── Encrypt ──────────────────────────────────────────────────────────────────

export async function encryptDescriptor(
  descriptor: number[]
): Promise<{ encryptedData: string; iv: string }> {
  const key = getKey()
  const iv = randomBytes(12) // 96-bit IV for GCM

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const json = JSON.stringify(descriptor)
  const encrypted = Buffer.concat([
    cipher.update(json, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // Store: base64(encrypted + tag)
  const combined = Buffer.concat([encrypted, tag])

  return {
    encryptedData: combined.toString('base64'),
    iv: iv.toString('hex'),
  }
}

// ─── Decrypt ──────────────────────────────────────────────────────────────────

export async function decryptDescriptor(
  encryptedData: string,
  ivHex: string
): Promise<number[]> {
  const key = getKey()
  const iv = Buffer.from(ivHex, 'hex')
  const combined = Buffer.from(encryptedData, 'base64')

  // Last 16 bytes are the auth tag
  const tag = combined.subarray(combined.length - 16)
  const data = combined.subarray(0, combined.length - 16)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(data),
    decipher.final(),
  ])

  return JSON.parse(decrypted.toString('utf8')) as number[]
}

// ─── Duplicate detection ───────────────────────────────────────────────────────
// Runs inline on the request thread. There's no worker_threads offload here:
// this function only ever runs inside a single-request serverless invocation
// (Vercel), so there is no concurrent-request main thread to protect, and a
// separately-spawned worker file cannot be reliably bundled/resolved at
// runtime in that environment anyway.

export async function findDuplicateEnrollment(
  newDescriptor: number[],
  excludeStudentId: string
): Promise<string | null> {
  const prisma = await getPrismaClient()
  const records = await prisma.faceDescriptor.findMany({
    where: { studentId: { not: excludeStudentId } },
    select: { studentId: true, encryptedData: true, iv: true },
  })

  // 1. Decrypt records in parallel to minimize database/runtime lockup
  const decryptionPromises = records.map(async (record) => {
    try {
      const descriptor = await decryptDescriptor(record.encryptedData, record.iv)
      return { studentId: record.studentId, descriptor }
    } catch {
      return null // Ignore corrupted records gracefully
    }
  })

  const results = await Promise.all(decryptionPromises)

  // 2. Compare inline — cheap enough (O(N) cosine similarity) that it doesn't
  //    need to be offloaded anywhere.
  for (const r of results) {
    if (!r) continue
    const similarity = cosineSimilarity(newDescriptor, r.descriptor)
    if (similarity >= DUPLICATE_THRESHOLD) {
      return r.studentId
    }
  }

  return null
}
// Admin utility — find all students sharing faces across the database
export async function findAllDuplicateEnrollments(): Promise<
  { studentA: string; studentB: string; similarity: number }[]
> {
  const prisma = await getPrismaClient()
  const records = await prisma.faceDescriptor.findMany({
    select: { studentId: true, encryptedData: true, iv: true },
  })

  const decryptionPromises = records.map(async (record) => {
    try {
      const descriptor = await decryptDescriptor(record.encryptedData, record.iv)
      return { studentId: record.studentId, descriptor }
    } catch {
      return null
    }
  })

  const results = await Promise.all(decryptionPromises)
  const descriptors: { studentId: string; descriptor: number[] }[] = []
  for (const r of results) {
    if (r) descriptors.push(r)
  }

  const duplicates: { studentA: string; studentB: string; similarity: number }[] = []

  for (let i = 0; i < descriptors.length; i++) {
    for (let j = i + 1; j < descriptors.length; j++) {
      const sim = cosineSimilarity(descriptors[i].descriptor, descriptors[j].descriptor)
      if (sim >= DUPLICATE_THRESHOLD) {
        duplicates.push({
          studentA: descriptors[i].studentId,
          studentB: descriptors[j].studentId,
          similarity: sim,
        })
      }
    }
  }

  return duplicates
}
// ─── Cosine similarity (server-side mirror of client-side check) ──────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    const valA = a[i];
    const valB = b[i];
    dot += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}