// src/routes/(student)/verify/+page.server.ts
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireStudent } from '$lib/server/auth/guards.js';
import { isFaceEnrolled } from '$lib/server/db/faces.js';

export const load: PageServerLoad = async ({ locals, url }) => {
  // 1. Require authenticated student
  const user = await requireStudent(locals.user);
  
  // 2. Check if student has face enrolled
  const hasFaceEnrolled = await isFaceEnrolled(String(user.id));
  
  if (!hasFaceEnrolled) {
    // Redirect to enrollment page with return URL
    const returnUrl = url.pathname + url.search;
    throw redirect(302, `/enroll?returnTo=${encodeURIComponent(returnUrl)}`);
  }
  
  // 3. Get examId from query params if present
  const examId = url.searchParams.get('examId');
  
  // Optional: Verify the exam exists and belongs to this student
  if (examId) {
    // You can add additional validation here
    // e.g., check if exam exists, if student is enrolled, if exam is active, etc.
    const { prisma } = await import('$lib/server/db/index.js');
    
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        students: {
          some: { id: user.id }
        }
      },
      select: { id: true, title: true, status: true }
    });
    
    if (!exam) {
      throw error(404, 'Exam not found or you are not enrolled');
    }
    
    if (exam.status !== 'ACTIVE') {
      throw error(400, 'This exam is not currently active');
    }
    
    return { 
      user: { id: user.id, name: user.name },
      exam: { id: exam.id, title: exam.title }
    };
  }
  
  // 4. Return user data for the page
  return { 
    user: { id: user.id, name: user.name },
    exam: null 
  };
};