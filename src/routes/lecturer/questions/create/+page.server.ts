// src/routes/lecturer/questions/create/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // Get exams for this lecturer
  const exams = await prisma.exam.findMany({
    where: {
      createdBy: user.id,
      status: {
        not: 'cancelled'
      }
    },
    include: {
      course: {
        select: {
          code: true,
          title: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return {
    exams
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();

    const formData = await request.formData();
    const examId = formData.get('examId') as string;
    const type = formData.get('type') as string;
    const body = formData.get('body') as string;
    const marks = parseInt(formData.get('marks') as string) || 1;
    const topic = formData.get('topic') as string || null;

    // MCQ specific
    const option1 = formData.get('option1') as string;
    const option2 = formData.get('option2') as string;
    const option3 = formData.get('option3') as string;
    const option4 = formData.get('option4') as string;
    const correctIndex = parseInt(formData.get('correctIndex') as string) || 0;

    // True/False specific
    const correctAnswer = formData.get('correctAnswer') as string;

    // Fill in the Blank specific
    const acceptedAnswers = formData.get('acceptedAnswers') as string;

    // Validation
    if (!examId) return fail(400, { error: 'Please select an exam' });
    if (!type) return fail(400, { error: 'Please select a question type' });
    if (!body) return fail(400, { error: 'Question body is required' });

    // Verify exam belongs to user
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { createdBy: true }
    });

    if (!exam || exam.createdBy !== user.id) {
      return fail(403, { error: 'You do not have permission to add questions to this exam' });
    }

    // Create question
    const question = await prisma.question.create({
      data: {
        examId,
        type: type as any,
        body,
        marks,
        topic,
        orderIndex: 0
      }
    });

    // Create options based on type
    if (type === 'mcq') {
      const options = [option1, option2, option3, option4].filter(Boolean);
      if (options.length < 2) {
        await prisma.question.delete({ where: { id: question.id } });
        return fail(400, { error: 'MCQ requires at least 2 options' });
      }

      await prisma.questionOption.createMany({
        data: options.map((text, index) => ({
          questionId: question.id,
          optionText: text,
          isCorrect: index === correctIndex,
          orderIndex: index
        }))
      });
    } else if (type === 'true_false') {
      await prisma.questionOption.createMany({
        data: [
          { questionId: question.id, optionText: 'True', isCorrect: correctAnswer === 'true', orderIndex: 0 },
          { questionId: question.id, optionText: 'False', isCorrect: correctAnswer === 'false', orderIndex: 1 }
        ]
      });
    } else if (type === 'fill_in_the_blank') {
      if (acceptedAnswers) {
        const answers = acceptedAnswers.split(',').map(a => a.trim()).filter(Boolean);
        await prisma.fitbAnswer.createMany({
          data: answers.map((answer, index) => ({
            questionId: question.id,
            acceptedAnswer: answer,
            isPrimary: index === 0
          }))
        });
      }
    }

    return {
      success: true,
      questionId: question.id,
      message: 'Question created successfully!'
    };
  }
};