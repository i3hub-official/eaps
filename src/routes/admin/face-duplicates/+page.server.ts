// src/routes/admin/face-duplicates/+page.server.ts
import type { Actions, PageServerLoad } from './$types'
import { requireAdmin } from '$lib/server/auth/guards.js'
import { getPrismaClient } from '$lib/server/db/index.js'
import { findAllDuplicateEnrollments } from '$lib/server/face/crypto.js'
import { revealName, revealMatricNumber } from '$lib/security/dataProtection'

function safeDecrypt<T>(decryptFn: () => T, fallback: T): T {
  try {
    return decryptFn()
  } catch {
    return fallback
  }
}

type EnrichedPair = {
  similarity: number
  studentA: { id: string; matricNumber: string; name: string }
  studentB: { id: string; matricNumber: string; name: string }
}

async function enrichPairs(
  pairs: { studentA: string; studentB: string; similarity: number }[],
): Promise<EnrichedPair[]> {
  if (pairs.length === 0) return []

  const prisma = await getPrismaClient()
  const ids = Array.from(new Set(pairs.flatMap((p) => [p.studentA, p.studentB])))

  const students = await prisma.student.findMany({
    where: { id: { in: ids } },
    select: { id: true, matricNumber: true, firstName: true, lastName: true },
  })

  const byId = new Map(
    students.map((s) => [
      s.id,
      {
        id: s.id,
        matricNumber: safeDecrypt(() => revealMatricNumber(s.matricNumber), s.matricNumber),
        name: `${safeDecrypt(() => revealName(s.firstName), s.firstName)} ${safeDecrypt(
          () => revealName(s.lastName),
          s.lastName,
        )}`.trim(),
      },
    ]),
  )

  return pairs
    .map((p) => ({
      similarity: p.similarity,
      studentA: byId.get(p.studentA) ?? { id: p.studentA, matricNumber: 'Unknown', name: 'Unknown student' },
      studentB: byId.get(p.studentB) ?? { id: p.studentB, matricNumber: 'Unknown', name: 'Unknown student' },
    }))
    .sort((a, b) => b.similarity - a.similarity)
}

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals.user)
  // Scan is deliberately not run on every load — it's an O(n²) pairwise
  // decrypt-and-compare across every enrolled face, which can get slow at
  // scale. Admins trigger it explicitly via the "scan" action below.
  return {}
}

export const actions: Actions = {
  scan: async ({ locals }) => {
    await requireAdmin(locals.user)

    const startedAt = Date.now()
    const rawPairs = await findAllDuplicateEnrollments()
    const durationMs = Date.now() - startedAt

    const pairs = await enrichPairs(rawPairs)

    return {
      scanned: true,
      pairs,
      count: pairs.length,
      durationMs,
    }
  },
}