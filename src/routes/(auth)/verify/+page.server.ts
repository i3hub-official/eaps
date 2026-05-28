// src/routes/(student)/verify/+page.server.ts
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { isFaceEnrolled } from '$lib/server/db/faces.js';
import { prisma } from '$lib/server/db/index.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  // 1. Require authenticated student
  const user = await requireStudent(locals.user);
  
  // 2. Check if student has face enrolled
  const hasFaceEnrolled = await isFaceEnrolled(String(user.id));
  
  if (!hasFaceEnrolled) {
    const returnUrl = url.pathname + url.search;
    throw redirect(302, `/enroll?returnTo=${encodeURIComponent(returnUrl)}`);
  }
  
  // 3. Get examId from query params
  const examId = url.searchParams.get('examId');
  const expired = url.searchParams.get('expired');
  
  // 4. Verify exam if examId is provided
  if (examId) {
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        course: {
          registrations: {
            some: {
              studentId: user.id
            }
          }
        },
        status: { in: ['active', 'scheduled'] }
      },
      select: { 
        id: true, 
        title: true, 
        status: true,
        durationMinutes: true,
        course: {
          select: {
            code: true,
            title: true
          }
        }
      }
    });
    
    if (!exam) {
      throw error(404, 'Exam not found or you are not enrolled');
    }
    
    // Check for existing session
    const existingSession = await prisma.examSession.findFirst({
      where: {
        examId: exam.id,
        studentId: user.id,
        status: { in: ['in_progress', 'not_started'] }
      }
    });
    
    return { 
      user: { id: user.id, name: user.fullName },
      exam: { 
        id: exam.id, 
        title: exam.title,
        courseCode: exam.course.code,
        durationMinutes: exam.durationMinutes,
        hasExistingSession: !!existingSession && existingSession.status === 'in_progress',
        sessionId: existingSession?.id
      },
      expired: !!expired
    };
  }
  
  return { 
    user: { id: user.id, name: user.fullName },
    exam: null,
    expired: false
  };
};