// src/routes/lecturer/exams/[examId]/questions/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();
  const { examId } = params;

  // Check if this is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(examId)) {
    throw error(404, 'Exam not found');
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      course: true,
      levels: true,
      examDepartments: {
        include: {
          department: true
        }
      },
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          options: {
            orderBy: { orderIndex: 'asc' }
          },
          fitbAnswers: true
        }
      },
      _count: {
        select: {
          questions: true,
          examSessions: true
        }
      }
    }
  });

  if (!exam) throw error(404, 'Exam not found');
  if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

  // Serialize Decimal values
  const serializedExam = {
    ...exam,
    marksPerQuestion: exam.marksPerQuestion ? Number(exam.marksPerQuestion) : null,
    totalMarks: Number(exam.totalMarks),
    passMark: Number(exam.passMark),
    durationMinutes: Number(exam.durationMinutes),
    lateEntryMinutes: Number(exam.lateEntryMinutes),
    maxViolations: Number(exam.maxViolations),
    questionsToPresent: Number(exam.questionsToPresent),
    semester: Number(exam.semester),
  };

  return {
    exam: serializedExam,
    questions: exam.questions,
    questionCount: exam._count.questions,
    sessionCount: exam._count.examSessions
  };
};

export const actions: Actions = {
  // Action for creating a question (MCQ or True/False)
  create: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();
    const { examId } = params;

    const formData = await request.formData();
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

    // Get current max order index
    const maxOrder = await prisma.question.aggregate({
      where: { examId },
      _max: { orderIndex: true }
    });

    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    // Create question
    const question = await prisma.question.create({
      data: {
        examId,
        type: type as any,
        body,
        marks,
        topic,
        orderIndex: nextOrder
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
      const isTrue = correctAnswer === 'true';
      await prisma.questionOption.createMany({
        data: [
          { questionId: question.id, optionText: 'True', isCorrect: isTrue, orderIndex: 0 },
          { questionId: question.id, optionText: 'False', isCorrect: !isTrue, orderIndex: 1 }
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
      action: 'create',
      questionId: question.id,
      message: 'Question created successfully!'
    };
  },

  // Action for editing a question
  edit: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();
    const { examId } = params;

    const formData = await request.formData();
    const questionId = formData.get('questionId')?.toString();
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

    if (!questionId) return fail(400, { error: 'Question ID required' });
    if (!body) return fail(400, { error: 'Question body is required' });

    // Verify exam belongs to user
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { createdBy: true }
    });

    if (!exam || exam.createdBy !== user.id) {
      return fail(403, { error: 'You do not have permission to edit questions in this exam' });
    }

    // Update question
    await prisma.question.update({
      where: { id: questionId },
      data: {
        body,
        marks,
        topic
      }
    });

    // If MCQ, update options
    if (type === 'mcq') {
      // Delete existing options
      await prisma.questionOption.deleteMany({
        where: { questionId }
      });

      const options = [option1, option2, option3, option4].filter(Boolean);
      if (options.length < 2) {
        return fail(400, { error: 'MCQ requires at least 2 options' });
      }

      await prisma.questionOption.createMany({
        data: options.map((text, index) => ({
          questionId,
          optionText: text,
          isCorrect: index === correctIndex,
          orderIndex: index
        }))
      });
    } else if (type === 'true_false') {
      // Delete existing options
      await prisma.questionOption.deleteMany({
        where: { questionId }
      });

      const isTrue = correctAnswer === 'true';
      await prisma.questionOption.createMany({
        data: [
          { questionId, optionText: 'True', isCorrect: isTrue, orderIndex: 0 },
          { questionId, optionText: 'False', isCorrect: !isTrue, orderIndex: 1 }
        ]
      });
    }

    return {
      success: true,
      action: 'edit',
      message: 'Question updated successfully!'
    };
  },

  // Action for deleting a question
  delete: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();
    const { examId } = params;

    const formData = await request.formData();
    const questionId = formData.get('questionId')?.toString();

    if (!questionId) {
      return fail(400, { error: 'Question ID required' });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { createdBy: true }
    });

    if (!exam) throw error(404, 'Exam not found');
    if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

    await prisma.question.delete({
      where: { id: questionId }
    });

    return {
      success: true,
      action: 'delete',
      message: 'Question deleted successfully!'
    };
  },

  // Action for reordering questions
  reorder: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();
    const { examId } = params;

    const formData = await request.formData();
    const order = formData.get('order')?.toString();

    if (!order) {
      return fail(400, { error: 'No order data provided' });
    }

    const questionIds = order.split(',').filter(id => id.trim());

    if (questionIds.length === 0) {
      return fail(400, { error: 'No questions to reorder' });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { createdBy: true }
    });

    if (!exam) throw error(404, 'Exam not found');
    if (exam.createdBy !== user.id) throw error(403, 'You do not own this exam');

    for (let i = 0; i < questionIds.length; i++) {
      await prisma.question.update({
        where: { id: questionIds[i] },
        data: { orderIndex: i }
      });
    }

    return {
      success: true,
      action: 'reorder',
      message: 'Questions reordered successfully!'
    };
  },

  // Action for bulk import
  import: async ({ request, params, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();
    const { examId } = params;

    const formData = await request.formData();
    const jsonData = formData.get('json')?.toString();

    if (!jsonData) {
      return fail(400, { error: 'No data provided for import' });
    }

    // Verify exam belongs to user
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { createdBy: true }
    });

    if (!exam || exam.createdBy !== user.id) {
      return fail(403, { error: 'You do not have permission to import questions to this exam' });
    }

    let questionsToImport: any[] = [];
    try {
      questionsToImport = JSON.parse(jsonData);
      if (!Array.isArray(questionsToImport)) {
        return fail(400, { error: 'Invalid JSON format. Expected an array.' });
      }
    } catch {
      return fail(400, { error: 'Invalid JSON format' });
    }

    // Get current max order index
    const maxOrder = await prisma.question.aggregate({
      where: { examId },
      _max: { orderIndex: true }
    });

    let nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;
    let successCount = 0;

    for (const q of questionsToImport) {
      try {
        const { type, body, topic, marks, options, correctIndex, correctAnswer, acceptedAnswers } = q;
        
        if (!type || !body) continue;

        const question = await prisma.question.create({
          data: {
            examId,
            type: type as any,
            body,
            marks: marks || 1,
            topic: topic || null,
            orderIndex: nextOrder++
          }
        });

        if (type === 'mcq' && options && Array.isArray(options) && options.length >= 2) {
          await prisma.questionOption.createMany({
            data: options.map((text, index) => ({
              questionId: question.id,
              optionText: text,
              isCorrect: index === (correctIndex || 0),
              orderIndex: index
            }))
          });
        } else if (type === 'true_false') {
          const isTrue = correctAnswer === 'true';
          await prisma.questionOption.createMany({
            data: [
              { questionId: question.id, optionText: 'True', isCorrect: isTrue, orderIndex: 0 },
              { questionId: question.id, optionText: 'False', isCorrect: !isTrue, orderIndex: 1 }
            ]
          });
        } else if (type === 'fill_in_the_blank' && acceptedAnswers) {
          const answers = acceptedAnswers.split(',').map((a: string) => a.trim()).filter(Boolean);
          await prisma.fitbAnswer.createMany({
            data: answers.map((answer: string, index: number) => ({
              questionId: question.id,
              acceptedAnswer: answer,
              isPrimary: index === 0
            }))
          });
        }

        successCount++;
      } catch {
        // Skip failed imports
        continue;
      }
    }

    return {
      success: true,
      action: 'import',
      count: successCount,
      message: `${successCount} questions imported successfully!`
    };
  }
};