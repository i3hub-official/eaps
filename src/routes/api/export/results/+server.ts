// src/routes/api/export/results/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import * as XLSX from 'xlsx';

export const GET: RequestHandler = async (event) => {
  // FIX: Use requireLecturer to get authenticated user
  const user = await requireLecturer(event.locals.user);
  const prisma = await getPrismaClient();

  const url = new URL(event.request.url);
  const courseId = url.searchParams.get('courseId');
  const examId = url.searchParams.get('examId');
  const format = url.searchParams.get('format') || 'excel';

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
          college: {
            select: {
              name: true,
              abbreviation: true,
            },
          },
          department: {
            select: {
              name: true,
            },
          },
        },
      },
      exam: {
        select: {
          title: true,
          session: true,
          semester: true,
          scheduledStart: true,
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
    'College': r.student.college?.name || '—',
    'Department': r.student.department?.name || '—',
    'Course Code': r.exam.course.code,
    'Course Title': r.exam.course.title,
    'Exam Title': r.exam.title,
    'Session': r.exam.session,
    'Semester': r.exam.semester,
    'Exam Date': r.exam.scheduledStart ? new Date(r.exam.scheduledStart).toLocaleDateString() : '—',
    'Score': r.score ?? '—',
    'Percentage': r.percentage !== null ? `${Number(r.percentage).toFixed(1)}%` : '—',
    'Grade': r.grade || '—',
    'Status': r.passed === true ? 'Passed' : r.passed === false ? 'Failed' : 'Pending',
    'Violations': r.violationCount,
    'Time Taken (mins)': r.timeTakenSecs ? Math.round(r.timeTakenSecs / 60) : '—',
  }));

  // If no data, return appropriate response
  if (exportData.length === 0) {
    return new Response(
      JSON.stringify({ 
        error: 'No results found matching your criteria',
        message: 'Try adjusting your filters or check back later.'
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Excel export
  if (format === 'excel') {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-size columns
    const maxWidth = 30;
    worksheet['!cols'] = Object.keys(exportData[0]).map(() => ({ wch: maxWidth }));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="exam_results_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  }

  // PDF export - For now, return CSV as fallback
  // You can integrate pdfkit or puppeteer for actual PDF generation
  if (format === 'pdf') {
    // For now, return a simple JSON response
    // In production, use a PDF library
    return json({
      message: 'PDF export coming soon. Please use Excel format for now.',
      data: exportData,
      count: exportData.length,
    });
  }

  // Default: return JSON
  return json({
    count: exportData.length,
    data: exportData,
  });
};