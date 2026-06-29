// src/routes/lecturer/questions/import/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { sql } from '$lib/server/db/index.js';

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

  // Get import history
  const importHistory = await sql<{
    id: string;
    fileName: string;
    fileType: string;
    rowCount: number;
    successCount: number;
    errorCount: number;
    importedAt: Date;
    importedBy: string;
  }>(
    `SELECT
       ih.id,
       ih.file_name AS "fileName",
       ih.file_type AS "fileType",
       ih.row_count AS "rowCount",
       ih.success_count AS "successCount",
       ih.error_count AS "errorCount",
       ih.imported_at AS "importedAt",
       u.full_name AS "importedBy"
     FROM question_imports ih
     JOIN users u ON u.id = ih.imported_by
     WHERE ih.imported_by = $1::uuid
     ORDER BY ih.imported_at DESC
     LIMIT 20`,
    [user.id]
  );

  return {
    exams,
    importHistory: importHistory || []
  };
};

// ─── Parse functions for different file types ──────────────────────────────

function parseCSV(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const result: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    result.push(row);
  }
  
  return result;
}

function parseJSON(content: string): any[] {
  const data = JSON.parse(content);
  return Array.isArray(data) ? data : [data];
}

function parseTXT(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const hasTabs = lines[0].includes('\t');
  const delimiter = hasTabs ? '\t' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const result: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim());
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    result.push(row);
  }
  
  return result;
}

// ─── Validate question data ──────────────────────────────────────────────────

function validateQuestion(row: any, index: number, exams: any[]): { valid: boolean; errors: string[]; data: any } {
  const errors: string[] = [];
  
  const body = row['body'] || row['question'] || row['Question'] || row['Body'] || '';
  const type = row['type'] || row['Type'] || '';
  const examCode = row['examCode'] || row['exam_code'] || row['Exam Code'] || row['Exam'] || '';
  const marks = parseInt(row['marks'] || row['Marks'] || '1') || 1;
  const topic = row['topic'] || row['Topic'] || '';
  
  if (!body) errors.push(`Row ${index + 1}: Question body is required`);
  if (!type) errors.push(`Row ${index + 1}: Question type is required (mcq, true_false, fill_in_the_blank)`);
  if (!examCode) errors.push(`Row ${index + 1}: Exam code is required`);
  
  // Find exam
  let examId: string | null = null;
  if (examCode) {
    const exam = exams.find(e => 
      e.course?.code?.toLowerCase() === examCode.toLowerCase() ||
      e.title?.toLowerCase().includes(examCode.toLowerCase())
    );
    if (exam) {
      examId = exam.id;
    } else {
      errors.push(`Row ${index + 1}: Exam "${examCode}" not found`);
    }
  }
  
  // Validate type
  const validTypes = ['mcq', 'true_false', 'fill_in_the_blank', 'essay'];
  let normalizedType = type.toLowerCase().trim();
  if (normalizedType === 'multiple choice' || normalizedType === 'multiple-choice') normalizedType = 'mcq';
  if (normalizedType === 'true/false' || normalizedType === 'true-false') normalizedType = 'true_false';
  if (normalizedType === 'fill in the blank' || normalizedType === 'fill-in-the-blank') normalizedType = 'fill_in_the_blank';
  
  if (!validTypes.includes(normalizedType)) {
    errors.push(`Row ${index + 1}: Invalid type "${type}". Must be: mcq, true_false, fill_in_the_blank, essay`);
  }
  
  // MCQ specific validation
  if (normalizedType === 'mcq') {
    const option1 = row['option1'] || row['Option1'] || row['Option 1'] || '';
    const option2 = row['option2'] || row['Option2'] || row['Option 2'] || '';
    if (!option1 || !option2) {
      errors.push(`Row ${index + 1}: MCQ requires at least 2 options (option1, option2)`);
    }
  }
  
  // True/False specific validation
  if (normalizedType === 'true_false') {
    const correct = row['correct'] || row['Correct'] || row['answer'] || row['Answer'] || '';
    if (!correct || !['true', 'false', 't', 'f'].includes(correct.toLowerCase().trim())) {
      errors.push(`Row ${index + 1}: True/False requires correct answer (true or false)`);
    }
  }
  
  // Fill in the blank specific validation
  if (normalizedType === 'fill_in_the_blank') {
    const answers = row['answers'] || row['Answers'] || row['acceptedAnswers'] || row['Accepted Answers'] || '';
    if (!answers) {
      errors.push(`Row ${index + 1}: Fill in the blank requires accepted answers`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    data: {
      body: body.trim(),
      type: normalizedType,
      examId,
      marks,
      topic: topic.trim() || null,
      // MCQ
      option1: row['option1'] || row['Option1'] || row['Option 1'] || '',
      option2: row['option2'] || row['Option2'] || row['Option 2'] || '',
      option3: row['option3'] || row['Option3'] || row['Option 3'] || '',
      option4: row['option4'] || row['Option4'] || row['Option 4'] || '',
      correctIndex: parseInt(row['correctIndex'] || row['Correct Index'] || row['correct'] || row['Correct'] || '0') || 0,
      // True/False
      correctAnswer: row['correct'] || row['Correct'] || row['answer'] || row['Answer'] || 'true',
      // Fill in the blank
      acceptedAnswers: row['answers'] || row['Answers'] || row['acceptedAnswers'] || row['Accepted Answers'] || ''
    }
  };
}

export const actions: Actions = {
  import: async ({ request, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const examId = formData.get('examId') as string || null;
    
    if (!file) {
      return fail(400, { error: 'No file uploaded' });
    }
    
    // Check file type
    const fileName = file.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    const allowedTypes = ['csv', 'xlsx', 'xls', 'txt', 'json'];
    
    if (!allowedTypes.includes(fileExt)) {
      return fail(400, { 
        error: `Unsupported file type: ${fileExt}. Allowed: ${allowedTypes.join(', ')}` 
      });
    }
    
    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileSize = buffer.length;
    
    let parsedData: any[] = [];
    let parseError: string | null = null;
    
    try {
      if (fileExt === 'csv') {
        const content = buffer.toString('utf-8');
        parsedData = parseCSV(content);
      } else if (fileExt === 'json') {
        const content = buffer.toString('utf-8');
        parsedData = parseJSON(content);
      } else if (fileExt === 'txt') {
        const content = buffer.toString('utf-8');
        parsedData = parseTXT(content);
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        return fail(400, { 
          error: 'Excel files require the "xlsx" package. Please install it: pnpm add xlsx' 
        });
      }
    } catch (err) {
      parseError = err instanceof Error ? err.message : 'Failed to parse file';
    }
    
    if (parseError) {
      return fail(400, { error: `Failed to parse file: ${parseError}` });
    }
    
    if (parsedData.length === 0) {
      return fail(400, { error: 'No data found in file' });
    }
    
    // Get exams for validation
    const exams = await prisma.exam.findMany({
      where: {
        createdBy: user.id
      },
      include: {
        course: true
      }
    });
    
    // Validate each row
    const validationResults = parsedData.map((row, index) => 
      validateQuestion(row, index, exams)
    );
    
    const validRows = validationResults.filter(r => r.valid);
    const errorRows = validationResults.filter(r => !r.valid);
    
    const errors: string[] = [];
    let successCount = 0;
    
    for (const result of errorRows) {
      errors.push(...result.errors);
    }
    
    for (const result of validRows) {
      const { data } = result;
      const targetExamId = data.examId || examId;
      
      if (!targetExamId) {
        errors.push(`Row ${validationResults.indexOf(result) + 1}: No exam specified`);
        continue;
      }
      
      try {
        // Create question
        const question = await prisma.question.create({
          data: {
            examId: targetExamId,
            type: data.type as any,
            body: data.body,
            marks: data.marks,
            topic: data.topic,
            orderIndex: 0
          }
        });
        
        // Create options based on type
        if (data.type === 'mcq') {
          const options = [data.option1, data.option2, data.option3, data.option4].filter(Boolean);
          if (options.length >= 2) {
            await prisma.questionOption.createMany({
              data: options.map((text, index) => ({
                questionId: question.id,
                optionText: text,
                isCorrect: index === data.correctIndex,
                orderIndex: index
              }))
            });
          }
        } else if (data.type === 'true_false') {
          const isTrue = data.correctAnswer.toLowerCase().trim() === 'true' || data.correctAnswer.toLowerCase().trim() === 't';
          await prisma.questionOption.createMany({
            data: [
              { questionId: question.id, optionText: 'True', isCorrect: isTrue, orderIndex: 0 },
              { questionId: question.id, optionText: 'False', isCorrect: !isTrue, orderIndex: 1 }
            ]
          });
        } else if (data.type === 'fill_in_the_blank' && data.acceptedAnswers) {
          const answers = data.acceptedAnswers.split(',').map((a: string) => a.trim()).filter(Boolean);
          await prisma.fitbAnswer.createMany({
            data: answers.map((answer: string, index: number) => ({
              questionId: question.id,
              acceptedAnswer: answer,
              isPrimary: index === 0
            }))
          });
        }
        
        successCount++;
      } catch (err) {
        errors.push(`Failed to import question: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    // Log the import
    try {
      await sql(
        `INSERT INTO question_imports 
         (id, file_name, file_type, row_count, success_count, error_count, imported_by, imported_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)`,
        [
          crypto.randomUUID(),
          fileName,
          fileExt,
          parsedData.length,
          successCount,
          errors.length,
          user.id,
          new Date()
        ]
      );
    } catch {
      // Table might not exist yet - ignore
    }
    
    return {
      success: true,
      message: `Imported ${successCount} questions successfully`,
      errors: errors.length > 0 ? errors : undefined,
      totalRows: parsedData.length,
      successCount,
      errorCount: errors.length
    };
  }
};