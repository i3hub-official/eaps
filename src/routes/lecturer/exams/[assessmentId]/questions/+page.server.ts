// src/routes/lecturer/exams/[assessmentId]/questions/+page.server.ts

import { error, fail } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { requireLecturer } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { z } from 'zod'

export const load: PageServerLoad = async (event) => {
  const { staff } = await requireLecturer(event)
  const { assessmentId } = event.params

  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      course: { select: { code: true, title: true } },
      questions: {
        orderBy: { order: 'asc' },
        include: {
          question: {
            include: {
              options: { orderBy: { order: 'asc' } },
              matchPairs: { orderBy: { order: 'asc' } },
              tags: { include: { tag: true } },
            },
          },
        },
      },
    },
  })

  if (!assessment) throw error(404, 'Assessment not found')

  // Ownership guard — only the creator or admin can edit
  if (assessment.createdById !== staff.id) {
    const adminRoles = ['SUPER_ADMIN', 'DEPARTMENT_EXAM_OFFICER', 'UNIVERSITY_EXAM_OFFICER']
    if (!adminRoles.includes(staff.primaryRole)) {
      throw error(403, 'You do not have permission to edit this assessment')
    }
  }

  if (assessment.status === 'ACTIVE' || assessment.status === 'ENDED') {
    throw error(403, 'Cannot edit questions for an active or completed assessment')
  }

  return {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      type: assessment.type,
      status: assessment.status,
      questionCount: assessment.questionCount,
      totalMarks: Number(assessment.totalMarks),
      course: assessment.course,
    },
    questions: assessment.questions.map(aq => ({
      assessmentQuestionId: aq.id,
      order: aq.order,
      marksOverride: aq.marksOverride ? Number(aq.marksOverride) : null,
      question: {
        id: aq.question.id,
        type: aq.question.type,
        body: aq.question.body,
        difficulty: aq.question.difficulty,
        marks: Number(aq.question.marks),
        imageUrl: aq.question.imageUrl,
        explanation: aq.question.explanation,
        options: aq.question.options,
        matchPairs: aq.question.matchPairs,
        tags: aq.question.tags.map(t => t.tag.name),
      },
    })),
  }
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const OptionSchema = z.object({
  id: z.string().optional(),
  body: z.string().min(1),
  imageUrl: z.string().optional().nullable(),
  isCorrect: z.boolean().default(false),
  order: z.number().int().default(0),
})

const QuestionSchema = z.object({
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'ESSAY', 'MATCHING', 'ORDERING']),
  body: z.string().min(1, 'Question body is required'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).default('MEDIUM'),
  marks: z.number().positive().default(1),
  explanation: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  options: z.array(OptionSchema).default([]),
  tags: z.array(z.string()).default([]),
})

export const actions: Actions = {
  // ─── Create question ──────────────────────────────────────────────────
  create: async (event) => {
    const { staff } = await requireLecturer(event)
    const { assessmentId } = event.params

    const assessment = await db.assessment.findUnique({ where: { id: assessmentId } })
    if (!assessment) return fail(404, { error: 'Assessment not found' })
    if (assessment.createdById !== staff.id) return fail(403, { error: 'Forbidden' })

    const raw = await event.request.json()
    const parsed = QuestionSchema.safeParse(raw)

    if (!parsed.success) {
      return fail(400, { error: parsed.error.issues[0].message })
    }

    const data = parsed.data

    // Validate option correctness rules
    if (data.type === 'SINGLE_CHOICE' || data.type === 'TRUE_FALSE') {
      const correctCount = data.options.filter(o => o.isCorrect).length
      if (correctCount !== 1) return fail(400, { error: 'Exactly one correct answer required' })
    }

    if (data.type === 'MULTIPLE_CHOICE') {
      const correctCount = data.options.filter(o => o.isCorrect).length
      if (correctCount < 2) return fail(400, { error: 'At least two correct answers required' })
    }

    // Get current max order
    const lastAq = await db.assessmentQuestion.findFirst({
      where: { assessmentId },
      orderBy: { order: 'desc' },
    })
    const nextOrder = (lastAq?.order ?? 0) + 1

    // Create question and link to assessment in a transaction
    const question = await db.$transaction(async tx => {
      const q = await tx.question.create({
        data: {
          createdById: staff.id,
          courseId: assessment.courseId,
          type: data.type,
          body: data.body,
          difficulty: data.difficulty,
          marks: data.marks,
          explanation: data.explanation,
          imageUrl: data.imageUrl,
          options: {
            create: data.options.map((o, i) => ({
              body: o.body,
              imageUrl: o.imageUrl,
              isCorrect: o.isCorrect,
              order: i,
            })),
          },
        },
      })

      // Handle tags
      for (const tagName of data.tags) {
        const tag = await tx.questionTag.upsert({
          where: { name: tagName.toLowerCase() },
          create: { name: tagName.toLowerCase() },
          update: {},
        })
        await tx.questionTagMap.create({ data: { questionId: q.id, tagId: tag.id } })
      }

      // Link to assessment
      await tx.assessmentQuestion.create({
        data: { assessmentId, questionId: q.id, order: nextOrder },
      })

      return q
    })

    return { success: true, questionId: question.id }
  },

  // ─── Update question ──────────────────────────────────────────────────
  update: async (event) => {
    const { staff } = await requireLecturer(event)
    const raw = await event.request.json()
    const { questionId, ...rest } = raw

    const question = await db.question.findUnique({ where: { id: questionId } })
    if (!question) return fail(404, { error: 'Question not found' })
    if (question.createdById !== staff.id) return fail(403, { error: 'Forbidden' })

    const parsed = QuestionSchema.safeParse(rest)
    if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message })

    const data = parsed.data

    await db.$transaction(async tx => {
      // Delete old options and recreate (simplest approach for full replace)
      await tx.questionOption.deleteMany({ where: { questionId } })
      await tx.questionTagMap.deleteMany({ where: { questionId } })

      await tx.question.update({
        where: { id: questionId },
        data: {
          type: data.type,
          body: data.body,
          difficulty: data.difficulty,
          marks: data.marks,
          explanation: data.explanation,
          imageUrl: data.imageUrl,
          version: { increment: 1 },
          options: {
            create: data.options.map((o, i) => ({
              body: o.body,
              imageUrl: o.imageUrl,
              isCorrect: o.isCorrect,
              order: i,
            })),
          },
        },
      })

      for (const tagName of data.tags) {
        const tag = await tx.questionTag.upsert({
          where: { name: tagName.toLowerCase() },
          create: { name: tagName.toLowerCase() },
          update: {},
        })
        await tx.questionTagMap.create({ data: { questionId, tagId: tag.id } })
      }
    })

    return { success: true }
  },

  // ─── Delete question from pool ────────────────────────────────────────
  remove: async (event) => {
    const { staff } = await requireLecturer(event)
    const raw = await event.request.json()
    const { assessmentQuestionId } = raw

    const aq = await db.assessmentQuestion.findUnique({
      where: { id: assessmentQuestionId },
      include: { assessment: true },
    })

    if (!aq) return fail(404, { error: 'Not found' })
    if (aq.assessment.createdById !== staff.id) return fail(403, { error: 'Forbidden' })

    await db.assessmentQuestion.delete({ where: { id: assessmentQuestionId } })

    return { success: true }
  },

  // ─── Reorder questions ────────────────────────────────────────────────
  reorder: async (event) => {
    const { staff } = await requireLecturer(event)
    const raw = await event.request.json()
    // raw.order: [{ assessmentQuestionId, order }]
    const { assessmentId, order } = raw

    const assessment = await db.assessment.findUnique({ where: { id: assessmentId } })
    if (!assessment || assessment.createdById !== staff.id) return fail(403, { error: 'Forbidden' })

    await db.$transaction(
      order.map(({ assessmentQuestionId, order: o }: { assessmentQuestionId: string; order: number }) =>
        db.assessmentQuestion.update({
          where: { id: assessmentQuestionId },
          data: { order: o },
        })
      )
    )

    return { success: true }
  },

  // ─── Bulk import (JSON) ────────────────────────────────────────────────
  import: async (event) => {
    const { staff } = await requireLecturer(event)
    const { assessmentId } = event.params
    const raw = await event.request.json()
    // raw.questions: QuestionSchema[]

    const assessment = await db.assessment.findUnique({ where: { id: assessmentId } })
    if (!assessment || assessment.createdById !== staff.id) return fail(403, { error: 'Forbidden' })

    const results = { created: 0, failed: 0, errors: [] as string[] }

    const lastAq = await db.assessmentQuestion.findFirst({
      where: { assessmentId },
      orderBy: { order: 'desc' },
    })
    let nextOrder = (lastAq?.order ?? 0) + 1

    for (const rawQ of raw.questions) {
      const parsed = QuestionSchema.safeParse(rawQ)
      if (!parsed.success) {
        results.failed++
        results.errors.push(parsed.error.issues[0].message)
        continue
      }

      const data = parsed.data
      try {
        await db.$transaction(async tx => {
          const q = await tx.question.create({
            data: {
              createdById: staff.id,
              courseId: assessment.courseId,
              type: data.type,
              body: data.body,
              difficulty: data.difficulty,
              marks: data.marks,
              explanation: data.explanation,
              options: {
                create: data.options.map((o, i) => ({
                  body: o.body,
                  isCorrect: o.isCorrect,
                  order: i,
                })),
              },
            },
          })

          for (const tagName of data.tags) {
            const tag = await tx.questionTag.upsert({
              where: { name: tagName.toLowerCase() },
              create: { name: tagName.toLowerCase() },
              update: {},
            })
            await tx.questionTagMap.create({ data: { questionId: q.id, tagId: tag.id } })
          }

          await tx.assessmentQuestion.create({
            data: { assessmentId, questionId: q.id, order: nextOrder++ },
          })
        })
        results.created++
      } catch {
        results.failed++
      }
    }

    return { success: true, ...results }
  },
}