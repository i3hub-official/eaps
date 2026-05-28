// src/routes/(student)/exam/[examId]/complete/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = await requireStudent(locals.user);
  
  // Get exam with proper relations
  const exam = await prisma.exam.findFirst({
    where: {
      id: params.examId,
      course: {
        registrations: {
          some: {
            studentId: user.id
          }
        }
      }
    },
    select: {
      id: true,
      title: true,
      course: {
        select: {
          code: true,
          title: true
        }
      },
      showResultAfter: true,
      totalMarks: true,
      passMark: true
    }
  });
  
  if (!exam) {
    throw error(404, 'Exam not found');
  }

  // Get the exam session
  const session = await prisma.examSession.findFirst({
    where: {
      examId: exam.id,
      studentId: user.id,
      status: 'submitted'
    },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      score: true,
      violationCount: true
    }
  });
  
  if (!session) {
    // If no submitted session, redirect to exam
    throw redirect(302, `/student/exam/${exam.id}`);
  }

  // Get the result if available
  const result = await prisma.examResult.findFirst({
    where: {
      sessionId: session.id
    },
    select: {
      id: true,
      totalQuestions: true,
      answered: true,
      correct: true,
      score: true,
      percentage: true,
      passed: true,
      grade: true,
      violationCount: true,
      timeTakenSecs: true,
      submittedAt: true
    }
  });

  // Calculate result if not yet stored
  let finalResult = result;
  if (!result && session.score !== null) {
    // Calculate grade based on percentage
    const percentage = Number(session.score) / exam.totalMarks * 100;
    const passed = percentage >= exam.passMark;
    let grade = 'F';
    if (percentage >= 70) grade = 'A';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 45) grade = 'D';
    else if (percentage >= 40) grade = 'E';
    
    finalResult = {
      id: session.id,
      totalQuestions: 0, // You might want to calculate this
      answered: 0,
      correct: 0,
      score: session.score,
      percentage: percentage,
      passed: passed,
      grade: grade,
      violationCount: session.violationCount,
      timeTakenSecs: null,
      submittedAt: session.submittedAt
    };
  }
  
  return { 
    exam, 
    session,
    result: finalResult,
    showResult: exam.showResultAfter || finalResult?.passed === true
  };
};