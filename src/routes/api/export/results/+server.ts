// src/routes/api/export/results/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrismaClient } from '$lib/server/db/index.js';
import * as XLSX from 'xlsx';

export const GET: RequestHandler = async (event) => {
  const user = event.locals.user;
  if (!user) throw error(401, 'Unauthorized');
  if (user.role !== 'lecturer') throw error(403, 'Forbidden');

  const url = new URL(event.request.url);
  const courseId = url.searchParams.get('courseId');
  const examId = url.searchParams.get('examId');
  const format = url.searchParams.get('format') || 'excel';

  const prisma = await getPrismaClient();

  // Build query
  const where: any = {
    exam: {
      createdBy: user.id,
    },
  };

  if (courseId && courseId !== 'all') {
    where.exam.courseId = courseId;
  }

  if (examId && examId !== 'all') {
    where.examId = examId;
  }

  const results = await prisma.examResult.findMany({
    where,
    include: {
      student: {
        select: {
          fullName: true,
          matricNumber: true,
        },
      },
      exam: {
        select: {
          title: true,
          session: true,
          semester: true,
          course: {
            select: {
              code: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      student: {
        fullName: 'asc',
      },
    },
  });

  // Prepare data for export
  const exportData = results.map((r, i) => ({
    'S/N': i + 1,
    'Student Name': r.student.fullName,
    'Matric Number': r.student.matricNumber || '—',
    'Course Code': r.exam.course.code,
    'Course Title': r.exam.course.title,
    'Exam Title': r.exam.title,
    'Session': r.exam.session,
    'Semester': r.exam.semester,
    'Score': r.score ?? '—',
    'Percentage': r.percentage !== null ? `${r.percentage.toFixed(1)}%` : '—',
    'Grade': r.grade || '—',
    'Status': r.passed === true ? 'Passed' : r.passed === false ? 'Failed' : 'Pending',
    'Violations': r.violationCount,
  }));

  if (format === 'excel') {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="results_${Date.now()}.xlsx"`,
      },
    });
  }

  // PDF export - you'll need a PDF library like pdfkit or puppeteer
  // For now, return JSON
  return json(exportData);
};