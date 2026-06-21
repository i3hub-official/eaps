// src/routes/student/results/[id]/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  const user = await requireStudent(locals.user);
  const { id } = params;
  const prisma = await getPrismaClient();

  // Get the result with all related data
  const result = await prisma.examResult.findFirst({
    where: {
      id: id,
      studentId: user.id
    },
    include: {
      exam: {
        include: {
          course: true,
          lecturer: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      },
      session: {
        include: {
          studentAnswers: {
            include: {
              question: {
                include: {
                  options: true
                }
              }
            }
          },
          violations: true
        }
      }
    }
  });

  if (!result) {
    throw error(404, 'Result not found');
  }

  // Get student details
  const student = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      fullName: true,
      matricNumber: true,
      level: {
        select: {
          level: true
        }
      }
    }
  });

  // Calculate topic analysis from student answers
  const topicAnalysis: {
    id: string;
    name: string;
    percentage: number;
    correct: number;
    wrong: number;
    avgTime: number;
  }[] = [];

  if (result.session?.studentAnswers && result.session.studentAnswers.length > 0) {
    const topicMap = new Map<string, { 
      correct: number; 
      wrong: number; 
      total: number; 
      totalTime: number;
      name: string 
    }>();

    for (const answer of result.session.studentAnswers) {
      const topicName = answer.question.topic || 'Uncategorized';
      const isCorrect = answer.isCorrect || false;
      
      if (!topicMap.has(topicName)) {
        topicMap.set(topicName, {
          correct: 0,
          wrong: 0,
          total: 0,
          totalTime: 0,
          name: topicName
        });
      }

      const topic = topicMap.get(topicName)!;
      if (isCorrect) {
        topic.correct++;
      } else {
        topic.wrong++;
      }
      topic.total++;
      topic.totalTime += answer.timeSpentSecs || 0;
    }

    for (const [id, topic] of topicMap) {
      const percentage = topic.total > 0 ? (topic.correct / topic.total) * 100 : 0;
      const avgTime = topic.total > 0 ? Math.round(topic.totalTime / topic.total) : 0;
      
      topicAnalysis.push({
        id: id,
        name: topic.name,
        percentage: Math.round(percentage * 10) / 10,
        correct: topic.correct,
        wrong: topic.wrong,
        avgTime: avgTime
      });
    }
  }

  topicAnalysis.sort((a, b) => b.percentage - a.percentage);

  return {
    result: {
      id: result.id,
      score: Number(result.score || 0),
      totalMarks: result.exam?.totalMarks || 100,
      timeSpent: result.timeTakenSecs || 0,
      totalQuestions: result.totalQuestions || 0,
      correctAnswers: result.correct || 0,
      wrongAnswers: (result.answered || 0) - (result.correct || 0),
      avgTimePerQuestion: result.totalQuestions && result.timeTakenSecs 
        ? Math.round(result.timeTakenSecs / result.totalQuestions) 
        : 0,
      percentile: null,
      examId: result.examId,
      percentage: Number(result.percentage || 0),
      studentId: result.studentId,
      passed: result.passed || false,
      grade: result.grade || null,
      submittedAt: result.submittedAt || null,
      answered: result.answered || 0,
      violationCount: result.violationCount || 0
    },
    exam: result.exam ? {
      id: result.exam.id,
      title: result.exam.title,
      courseCode: result.exam.course?.code || 'N/A',
      courseTitle: result.exam.course?.title || '',
      courseId: result.exam.courseId,
      lecturerName: result.exam.lecturer?.fullName || 'Unknown',
      passMark: result.exam.passMark || 40,
      durationMinutes: result.exam.durationMinutes || 60,
      scheduledStart: result.exam.scheduledStart,
      scheduledEnd: result.exam.scheduledEnd,
      session: result.exam.session,
      semester: result.exam.semester
    } : null,
    student: student ? {
      id: student.id,
      fullName: student.fullName,
      matricNumber: student.matricNumber || 'N/A'
    } : null,
    topicAnalysis
  };
};