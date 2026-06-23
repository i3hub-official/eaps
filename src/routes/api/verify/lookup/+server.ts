// src/routes/api/verify/lookup/+server.ts
//
// GET ?q=<matric|resultId>&exam=<courseCode|title>   (exam param optional)
//
// Public endpoint — no auth required.
// Returns { resultId } on success, { error } on failure.
// Deliberately returns minimal data — the full result is only shown
// after navigating to /verify/[resultId].

import { json }            from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';

export const GET: RequestHandler = async ({ url }) => {
  const q    = url.searchParams.get('q')?.trim()   ?? '';
  const exam = url.searchParams.get('exam')?.trim() ?? '';

  if (!q) {
    return json({ error: 'Query parameter `q` is required.' }, { status: 400 });
  }

  const prisma = await getPrismaClient();

  // ── 1. Try as a direct result UUID ───────────────────────────────────────
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (UUID_RE.test(q)) {
    const result = await prisma.examResult.findUnique({
      where:  { id: q },
      select: { id: true },
    });
    if (result) return json({ resultId: result.id });
  }

  // ── 2. Look up by matric number ───────────────────────────────────────────
  const student = await prisma.user.findUnique({
    where:  { matricNumber: q },
    select: { id: true },
  });

  if (!student) {
    return json({ error: 'No student found with that matric number.' }, { status: 404 });
  }

  // Build the query — optionally filter by course code or exam title
  const examResults = await prisma.examResult.findMany({
    where: {
      studentId: student.id,
      ...(exam
        ? {
            exam: {
              OR: [
                { title:  { contains: exam, mode: 'insensitive' } },
                { course: { code:  { contains: exam, mode: 'insensitive' } } },
                { course: { title: { contains: exam, mode: 'insensitive' } } },
              ],
            },
          }
        : {}),
    },
    orderBy: { generatedAt: 'desc' },
    select:  { id: true },
    take: 10,
  });

  if (examResults.length === 0) {
    return json(
      { error: exam
          ? `No result found for matric "${q}" matching exam/course "${exam}".`
          : 'No exam results found for that matric number.' },
      { status: 404 }
    );
  }

  // If there's exactly one result, navigate directly to it.
  // If there are multiple, return them all so the client can show a picker.
  if (examResults.length === 1) {
    return json({ resultId: examResults[0].id });
  }

  return json({ resultId: examResults[0].id, multiple: true, count: examResults.length });
};