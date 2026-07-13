// src/lib/server/assessments/engine.ts
// Core assessment engine: session creation, randomisation,
// answer saving, auto-grading, marks computation

import { getPrismaClient } from '$lib/server/db/index.js'
import { error } from '@sveltejs/kit'
import type {
  Assessment,
  AssessmentSession,
  Question,
  QuestionOption,
  StudentAnswer,
  GradeLabel,
} from '@prisma/client'
import { normalizeMarks, toPercentage } from './decimal'

// Sessions in any of these statuses are closed and count as a used attempt.
// Kept as a single shared constant so this file, student/tests/+page.server.ts,
// and [sessionId]/+page.server.ts can never drift out of sync on what
// counts as "terminal" — a prior mismatch here let DISQUALIFIED sessions
// escape the attempt count in checkStudentEligibility.
const TERMINAL_STATUSES = ['SUBMITTED', 'TIMED_OUT', 'DISQUALIFIED'] as const

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GradeResult {
  grade: GradeLabel
  gradePoints: number
  passed: boolean
}

// ─── Eligibility check ───────────────────────────────────────────────────────

export async function checkStudentEligibility(
  assessmentId: string,
  studentId: string
): Promise<{ eligible: boolean; reason?: string }> {
  const prisma = await getPrismaClient()
  const [assessment, student] = await Promise.all([
    prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        eligibility: true,
        course: true,
      },
    }),
    prisma.student.findUnique({
      where: { id: studentId },
      include: { faceDescriptor: true },
    }),
  ])

  if (!assessment) return { eligible: false, reason: 'Assessment not found' }
  if (!student) return { eligible: false, reason: 'Student not found' }

  if (assessment.status !== 'ACTIVE') {
    return { eligible: false, reason: 'This assessment is not currently active' }
  }

  const now = new Date()
  if (assessment.startTime && now < assessment.startTime) {
    return { eligible: false, reason: 'This assessment has not started yet' }
  }
  if (assessment.endTime && now > assessment.endTime) {
    return { eligible: false, reason: 'This assessment has ended' }
  }

  // face enrollment required for TEST and EXAMINATION
  if (
    (assessment.type === 'TEST' || assessment.type === 'EXAMINATION') &&
    !student.faceDescriptor
  ) {
    return { eligible: false, reason: 'Face enrollment required before you can take this assessment' }
  }

  // course registration check
  const registration = await prisma.courseRegistration.findFirst({
    where: {
      studentId,
      courseId: assessment.courseId,
      status: { notIn: ['REJECTED', 'CANCELLED'] },
    },
  })

  if (!registration) {
    return {
      eligible: false,
      reason: `You are not registered for ${assessment.course.code}. Please register the course first.`,
    }
  }

  // attempt count check — DISQUALIFIED counts as a used/closed attempt,
  // same as SUBMITTED/TIMED_OUT, so a disqualified session can't grant an
  // extra attempt beyond maxAttempts.
  const attempts = await prisma.assessmentSession.count({
    where: {
      assessmentId,
      studentId,
      status: { in: TERMINAL_STATUSES },
    },
  })

  if (assessment.maxAttempts > 0 && attempts >= assessment.maxAttempts) {
    return { eligible: false, reason: 'You have used all available attempts' }
  }

  // Retake gating — only applies once the student already has at least
  // one closed attempt. A first attempt is always allowed regardless of
  // allowRetakes/retakeDelayMinutes, since those settings only govern
  // whether/when a SECOND+ attempt is permitted.
  if (attempts > 0) {
    if (!assessment.allowRetakes) {
      return { eligible: false, reason: 'Retakes are not allowed for this assessment' }
    }

    if (assessment.retakeDelayMinutes > 0) {
      const lastAttempt = await prisma.assessmentSession.findFirst({
        where: { assessmentId, studentId, status: { in: TERMINAL_STATUSES } },
        orderBy: { submittedAt: 'desc' },
        select: { submittedAt: true },
      })

      if (lastAttempt?.submittedAt) {
        const elapsedMs = now.getTime() - lastAttempt.submittedAt.getTime()
        const delayMs = assessment.retakeDelayMinutes * 60 * 1000
        if (elapsedMs < delayMs) {
          const nextAttemptTime = new Date(lastAttempt.submittedAt.getTime() + delayMs)
          return {
            eligible: false,
            reason: `You must wait until ${nextAttemptTime.toLocaleTimeString()} before retaking this assessment`,
          }
        }
      }
    }
  }

  // check for active session (prevent double-entry)
  const activeSession = await prisma.assessmentSession.findFirst({
    where: {
      assessmentId,
      studentId,
      status: { in: ['PENDING', 'IN_PROGRESS', 'PAUSED'] },
    },
  })

  if (activeSession) {
    return { eligible: true, resumeSessionId: activeSession.id } as any
  }

  return { eligible: true }
}

// ─── Session creation + question randomisation ────────────────────────────────

export async function createSession(
  assessmentId: string,
  studentId: string,
  meta: { ipAddress?: string; deviceFingerprint?: string; userAgent?: string } = {}
): Promise<AssessmentSession> {
  const prisma = await getPrismaClient()
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      questions: {
        include: {
          question: {
            include: { options: true },
          },
        },
      },
    },
  })

  if (!assessment) throw error(404, 'Assessment not found')

  // Determine attempt number
  const lastAttempt = await prisma.assessmentSession.findFirst({
    where: { assessmentId, studentId },
    orderBy: { attemptNumber: 'desc' },
    select: { attemptNumber: true },
  })
  const attemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1

  // Full pool of questions linked to this assessment.
  let pool = assessment.questions.map(aq => aq.question)

  // ─── Paper variant assignment + partitioning ─────────────────────────
  // Round-robin assign this session to a variant label (A/B/C), THEN
  // partition the question pool so each variant draws from a distinct,
  // deterministic subset of the bank — sorted by question id so the
  // partition is stable across calls/sessions rather than re-randomised
  // each time. Previously `paperVariant` was stored purely as a label
  // with no effect on which questions were selected, so two students in
  // "different" variants could still receive the exact same paper.
  //
  // If a variant's partition doesn't contain enough questions to satisfy
  // assessment.questionCount, fall back to the full pool for that
  // session rather than failing — better to occasionally reuse questions
  // across variants than to be unable to start a session at all.
  let paperVariant: string | null = null
  if (assessment.paperVariants > 1) {
    const variants = ['A', 'B', 'C'].slice(0, assessment.paperVariants)
    const sessionCount = await prisma.assessmentSession.count({ where: { assessmentId } })
    paperVariant = variants[sessionCount % variants.length]

    const variantIndex = variants.indexOf(paperVariant)
    const sortedPool = [...pool].sort((a, b) => a.id.localeCompare(b.id))
    const variantPool = sortedPool.filter((_, idx) => idx % variants.length === variantIndex)

    if (variantPool.length >= assessment.questionCount) {
      pool = variantPool
    }
  }

  // Randomise question selection from the (possibly variant-partitioned) pool
  const selected = shuffle(pool).slice(0, assessment.questionCount)

  // Build shuffled question order with shuffled options per question
  const questionOrder = selected.map((q, idx) => {
    const optionOrder = assessment.shuffleOptions
      ? shuffle(q.options.map(o => o.id))
      : q.options.map(o => o.id)

    return {
      questionId: q.id,
      position: idx + 1,
      optionOrder,
    }
  })

  const now = new Date()
  const expiresAt = new Date(now.getTime() + assessment.durationMinutes * 60 * 1000)

  const session = await prisma.assessmentSession.create({
    data: {
      assessmentId,
      studentId,
      attemptNumber,
      paperVariant,
      status: 'PENDING',
      ipAddress: meta.ipAddress,
      deviceFingerprint: meta.deviceFingerprint,
      userAgent: meta.userAgent,
      expiresAt,
      timeRemainingSeconds: assessment.durationMinutes * 60,
      questionOrder: {
        create: questionOrder,
      },
    },
  })

  return session
}

export async function startSession(sessionId: string): Promise<AssessmentSession> {
  const prisma = await getPrismaClient()
  const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session) throw error(404, 'Session not found')
  if (session.status !== 'PENDING') throw error(400, 'Session already started')

  const now = new Date()
  const assessment = await prisma.assessment.findUnique({ where: { id: session.assessmentId } })
  if (!assessment) throw error(404)

  const expiresAt = new Date(now.getTime() + assessment.durationMinutes * 60 * 1000)

  return prisma.assessmentSession.update({
    where: { id: sessionId },
    data: {
      status: 'IN_PROGRESS',
      startedAt: now,
      expiresAt,
      timeRemainingSeconds: assessment.durationMinutes * 60,
    },
  })
}

// ─── Answer saving ────────────────────────────────────────────────────────────

export interface AnswerPayload {
  questionId: string
  selectedOptions?: string[]
  textAnswer?: string
  orderAnswer?: string[]
  matchAnswer?: Record<string, string>
}

export async function saveAnswer(sessionId: string, payload: AnswerPayload) {
  const prisma = await getPrismaClient()
  const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session) throw error(404, 'Session not found')
  if (session.status !== 'IN_PROGRESS') throw error(400, 'Session is not active')

  // check session hasn't expired
  if (session.expiresAt && new Date() > session.expiresAt) {
    await autoSubmit(sessionId, 'AUTO_TIME')
    throw error(400, 'Session has expired')
  }

  return prisma.studentAnswer.upsert({
    where: { sessionId_questionId: { sessionId, questionId: payload.questionId } },
    create: {
      sessionId,
      questionId: payload.questionId,
      selectedOptions: payload.selectedOptions ?? null,
      textAnswer: payload.textAnswer ?? null,
      orderAnswer: payload.orderAnswer ?? null,
      matchAnswer: payload.matchAnswer ?? null,
    },
    update: {
      selectedOptions: payload.selectedOptions ?? null,
      textAnswer: payload.textAnswer ?? null,
      orderAnswer: payload.orderAnswer ?? null,
      matchAnswer: payload.matchAnswer ?? null,
      answeredAt: new Date(),
    },
  })
}

// Sync remaining time from client. The SERVER'S clock and expiresAt are the
// only source of truth for what gets persisted — clientRemainingSeconds is
// never written anywhere. It's only used to detect drift: if the client
// claims meaningfully more time is left than the server calculates, that's
// consistent with a tampered client clock trying to extend the exam, so we
// log it as a violation rather than silently ignoring the mismatch.
const CLOCK_DRIFT_TOLERANCE_SECONDS = 15

export async function syncTimer(sessionId: string, clientRemainingSeconds: number) {
  const prisma = await getPrismaClient()
  const session = await prisma.assessmentSession.findUnique({ where: { id: sessionId } })
  if (!session || session.status !== 'IN_PROGRESS') return

  if (session.expiresAt && new Date() > session.expiresAt) {
    await autoSubmit(sessionId, 'AUTO_TIME')
    return { expired: true }
  }

  // Server time is always authoritative for what gets persisted.
  const serverRemaining = Math.max(
    0,
    Math.floor((session.expiresAt!.getTime() - Date.now()) / 1000)
  )

  const drift = clientRemainingSeconds - serverRemaining
  if (drift > CLOCK_DRIFT_TOLERANCE_SECONDS) {
    await prisma.violation.create({
      data: {
        sessionId,
        type: 'CLOCK_TAMPER',
        severity: 2,
        metadata: { clientRemainingSeconds, serverRemaining, driftSeconds: drift },
      },
    })
  }

  await prisma.assessmentSession.update({
    where: { id: sessionId },
    data: { timeRemainingSeconds: serverRemaining, lastSyncAt: new Date() },
  })

  return { serverRemainingSeconds: serverRemaining }
}

// ─── Submission ───────────────────────────────────────────────────────────────

export async function submitSession(
  sessionId: string,
  mode: 'MANUAL' | 'AUTO_TIME' | 'AUTO_VIOLATION' | 'FORCE' = 'MANUAL'
) {
  const prisma = await getPrismaClient()
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      answers: { include: { question: { include: { options: true, matchPairs: true } } } },
      questionOrder: true,
      assessment: true,
    },
  })

  if (!session) throw error(404, 'Session not found')
  if (TERMINAL_STATUSES.includes(session.status as (typeof TERMINAL_STATUSES)[number])) {
    throw error(400, 'Session already closed')
  }

  const submittedAt = new Date()
  const submissionStatus = mode === 'AUTO_TIME' ? 'TIMED_OUT' : 'SUBMITTED'

  // Auto-grade objective questions
  const gradedAnswers = gradeAnswers(session.answers)

  // Compute total marks
  const result = await computeResult(session, gradedAnswers)

  // Transactionally save everything
  await prisma.$transaction(async tx => {
    // Update all answers with grades
    for (const ga of gradedAnswers) {
      await tx.studentAnswer.update({
        where: { id: ga.id },
        data: {
          marksAwarded: ga.marksAwarded,
          isCorrect: ga.isCorrect,
        },
      })
    }

    // Close the session
    await tx.assessmentSession.update({
      where: { id: sessionId },
      data: {
        status: submissionStatus,
        submittedAt,
        submissionMode: mode,
      },
    })

    // Create result record
    await tx.assessmentResult.create({
      data: {
        sessionId,
        assessmentId: session.assessmentId,
        studentId: session.studentId,
        totalMarks: result.totalMarks,
        marksObtained: result.marksObtained,
        percentage: result.percentage,
        grade: result.grade,
        gradePoints: result.gradePoints,
        passed: result.passed,
        isReleased: session.assessment.showResultImmediately,
        releasedAt: session.assessment.showResultImmediately ? submittedAt : null,
      },
    })
  })

  return { ...result, isReleased: session.assessment.showResultImmediately }
}

async function autoSubmit(sessionId: string, mode: 'AUTO_TIME' | 'AUTO_VIOLATION') {
  return submitSession(sessionId, mode)
}

// ─── Grading ─────────────────────────────────────────────────────────────────

interface GradedAnswer {
  id: string
  marksAwarded: number
  isCorrect: boolean | null
}

function gradeAnswers(
  answers: (StudentAnswer & { question: Question & { options: QuestionOption[] } })[]
): GradedAnswer[] {
  return answers.map(answer => {
    const q = answer.question

    // Essay — mark for manual grading
    if (q.type === 'ESSAY') {
      return { id: answer.id, marksAwarded: 0, isCorrect: null }
    }

    if (q.type === 'SINGLE_CHOICE' || q.type === 'TRUE_FALSE') {
      const correct = q.options.find(o => o.isCorrect)
      const selected = (answer.selectedOptions as string[] | null)?.[0]
      const isCorrect = !!correct && selected === correct.id
      return {
        id: answer.id,
        marksAwarded: isCorrect ? Number(q.marks) : 0,
        isCorrect,
      }
    }

    if (q.type === 'MULTIPLE_CHOICE') {
      const correctIds = new Set(q.options.filter(o => o.isCorrect).map(o => o.id))
      const selectedIds = new Set((answer.selectedOptions as string[] | null) ?? [])
      const isCorrect =
        correctIds.size === selectedIds.size &&
        [...correctIds].every(id => selectedIds.has(id))
      return {
        id: answer.id,
        marksAwarded: isCorrect ? Number(q.marks) : 0,
        isCorrect,
      }
    }

    if (q.type === 'FILL_BLANK') {
      // case-insensitive exact match; could be enhanced with fuzzy matching
      const expected = q.options[0]?.body?.trim().toLowerCase()
      const given = answer.textAnswer?.trim().toLowerCase()
      const isCorrect = !!expected && given === expected
      return {
        id: answer.id,
        marksAwarded: isCorrect ? Number(q.marks) : 0,
        isCorrect,
      }
    }

    // ORDERING, MATCHING — basic exact match
    if (q.type === 'ORDERING') {
      const correctOrder = q.options.sort((a, b) => a.order - b.order).map(o => o.id)
      const studentOrder = (answer.orderAnswer as string[] | null) ?? []
      const isCorrect = JSON.stringify(correctOrder) === JSON.stringify(studentOrder)
      return {
        id: answer.id,
        marksAwarded: isCorrect ? Number(q.marks) : 0,
        isCorrect,
      }
    }

    return { id: answer.id, marksAwarded: 0, isCorrect: false }
  })
}

// ─── Marks computation ────────────────────────────────────────────────────────
// Normalises to the assessment's totalMarks regardless of question count

async function computeResult(
  session: AssessmentSession & { assessment: Assessment; questionOrder: { questionId: string }[] },
  gradedAnswers: GradedAnswer[]
) {
  const prisma = await getPrismaClient()
  const assessment = session.assessment
  const totalMarks = Number(assessment.totalMarks)

  // raw marks sum
  const rawObtained = gradedAnswers.reduce((sum, a) => sum + a.marksAwarded, 0)

  // get total possible raw marks from the pool
  const questionIds = session.questionOrder.map(q => q.questionId)
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, marks: true },
  })

  const rawPossible = questions.reduce((sum, q) => sum + Number(q.marks), 0)

  // normalise: (rawObtained / rawPossible) * totalMarks
  const marksObtained = normalizeMarks(rawObtained, rawPossible, totalMarks)
  const percentage = toPercentage(marksObtained, totalMarks)

  const gradeResult = await computeGrade(percentage.toNumber())

  return {
    totalMarks,
    marksObtained: marksObtained.toNumber(),
    percentage: percentage.toNumber(),
    ...gradeResult,
  }
}

// ─── Grade computation ────────────────────────────────────────────────────────

export async function computeGrade(percentage: number): Promise<GradeResult> {
  const prisma = await getPrismaClient()
  const scale = await prisma.gradeScale.findMany({ orderBy: { minPercent: 'desc' } })

  for (const tier of scale) {
    if (percentage >= Number(tier.minPercent)) {
      return {
        grade: tier.label,
        gradePoints: Number(tier.points),
        passed: tier.label !== 'F',
      }
    }
  }

  return { grade: 'F', gradePoints: 0, passed: false }
}

// ─── Transcript (CA 30 + Exam 70) ────────────────────────────────────────────

export async function computeTranscriptEntry(
  studentId: string,
  courseId: string,
  academicSessionId: string
) {
  const prisma = await getPrismaClient()
  // find test result for this course in this session
  const testResult = await prisma.assessmentResult.findFirst({
    where: {
      studentId,
      assessment: { courseId, type: 'TEST' },
      isReleased: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const examResult = await prisma.assessmentResult.findFirst({
    where: {
      studentId,
      assessment: { courseId, type: 'EXAMINATION' },
      isReleased: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!testResult && !examResult) return null

  const testMark = testResult ? Number(testResult.marksObtained) : 0
  const examMark = examResult ? Number(examResult.marksObtained) : 0
  const totalMark = testMark + examMark
  const percentage = totalMark // already out of 100

  const gradeResult = await computeGrade(percentage)

  const course = await prisma.course.findUnique({ where: { id: courseId } })

  return prisma.transcriptEntry.upsert({
    where: { studentId_courseId_sessionId: { studentId, courseId, sessionId: academicSessionId } },
    create: {
      studentId,
      courseId,
      sessionId: academicSessionId,
      testMark,
      examMark,
      totalMark,
      percentage,
      grade: gradeResult.grade,
      gradePoints: gradeResult.gradePoints,
      passed: gradeResult.passed,
      creditUnits: course?.creditUnits,
    },
    update: {
      testMark,
      examMark,
      totalMark,
      percentage,
      grade: gradeResult.grade,
      gradePoints: gradeResult.gradePoints,
      passed: gradeResult.passed,
    },
  })
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}