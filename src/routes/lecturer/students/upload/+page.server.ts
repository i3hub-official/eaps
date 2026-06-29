// src/routes/lecturer/students/upload/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireLecturer } from '$lib/server/auth/guards.js';
import { getPrismaClient } from '$lib/server/db/index.js';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { sql } from '$lib/server/db/index.js';
import { randomBytes } from 'crypto';

export const load: PageServerLoad = async ({ locals }) => {
  const user = requireLecturer(locals.user);
  const prisma = await getPrismaClient();

  // Get departments for the dropdown
  const departments = await prisma.department.findMany({
    where: {
      collegeId: user.collegeId || undefined
    },
    orderBy: {
      name: 'asc'
    },
    select: {
      id: true,
      name: true,
      code: true
    }
  });

  // Get levels for the dropdown
  const levels = await prisma.level.findMany({
    orderBy: {
      level: 'asc'
    },
    select: {
      id: true,
      level: true,
      name: true
    }
  });

  // Get upload history
  const uploadHistory = await sql<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    rowCount: number;
    successCount: number;
    errorCount: number;
    uploadedAt: Date;
    uploadedBy: string;
  }>(
    `SELECT
       uh.id,
       uh.file_name AS "fileName",
       uh.file_type AS "fileType",
       uh.file_size AS "fileSize",
       uh.row_count AS "rowCount",
       uh.success_count AS "successCount",
       uh.error_count AS "errorCount",
       uh.uploaded_at AS "uploadedAt",
       u.full_name AS "uploadedBy"
     FROM student_uploads uh
     JOIN users u ON u.id = uh.uploaded_by
     WHERE uh.uploaded_by = $1::uuid
     ORDER BY uh.uploaded_at DESC
     LIMIT 20`,
    [user.id]
  );

  return {
    departments,
    levels,
    uploadHistory: uploadHistory || []
  };
};

// ─── Parse functions for different file types ──────────────────────────────

function parseCSV(content: string): any[] {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

function parseJSON(content: string): any[] {
  const data = JSON.parse(content);
  return Array.isArray(data) ? data : [data];
}

function parseTXT(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Try to detect if it's tab-separated
  const firstLine = lines[0];
  const hasTabs = firstLine.includes('\t');
  const hasCommas = firstLine.includes(',');
  
  let delimiter = ',';
  if (hasTabs && !hasCommas) delimiter = '\t';
  else if (hasTabs && hasCommas) {
    // Use the one with more occurrences
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    delimiter = tabCount > commaCount ? '\t' : ',';
  }
  
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

function parseExcel(buffer: Buffer): any[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet);
}

// ─── Validate student data ──────────────────────────────────────────────────

function validateStudentData(row: any, index: number, departments: any[], levels: any[]): { valid: boolean; errors: string[]; data: any } {
  const errors: string[] = [];
  
  // Required fields
  const fullName = row['fullName'] || row['full_name'] || row['Full Name'] || row['Name'] || row['Student Name'] || '';
  const email = row['email'] || row['Email'] || row['Email Address'] || '';
  const matricNumber = row['matricNumber'] || row['matric_number'] || row['Matric Number'] || row['Matric'] || '';
  const departmentCode = row['departmentCode'] || row['department_code'] || row['Department Code'] || row['Dept Code'] || row['Department'] || '';
  const levelNum = row['level'] || row['Level'] || row['Level Number'] || '';
  
  // Validate required fields
  if (!fullName) errors.push(`Row ${index + 1}: Full name is required`);
  if (!email) errors.push(`Row ${index + 1}: Email is required`);
  if (!matricNumber) errors.push(`Row ${index + 1}: Matric number is required`);
  if (!departmentCode) errors.push(`Row ${index + 1}: Department is required`);
  if (!levelNum) errors.push(`Row ${index + 1}: Level is required`);
  
  // Validate email format
  if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push(`Row ${index + 1}: Invalid email format`);
  }
  
  // Validate level
  let levelId: number | null = null;
  if (levelNum) {
    const level = levels.find(l => String(l.level) === String(levelNum));
    if (level) {
      levelId = level.id;
    } else {
      errors.push(`Row ${index + 1}: Invalid level "${levelNum}"`);
    }
  }
  
  // Validate department
  let departmentId: string | null = null;
  if (departmentCode) {
    const dept = departments.find(d => 
      d.code?.toLowerCase() === departmentCode.toLowerCase() ||
      d.name?.toLowerCase() === departmentCode.toLowerCase()
    );
    if (dept) {
      departmentId = dept.id;
    } else {
      errors.push(`Row ${index + 1}: Department "${departmentCode}" not found`);
    }
  }
  
  // Additional fields
  const phone = row['phone'] || row['Phone'] || row['Phone Number'] || '';
  const gender = row['gender'] || row['Gender'] || '';
  const dateOfBirth = row['dateOfBirth'] || row['date_of_birth'] || row['Date of Birth'] || row['DOB'] || '';
  const jambRegNo = row['jambRegNo'] || row['jamb_reg_no'] || row['JAMB Number'] || row['JAMB'] || '';
  
  // Validate gender
  let genderEnum: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | 'required' = 'required';
  if (gender) {
    const normalized = gender.toLowerCase();
    if (['male', 'm'].includes(normalized)) genderEnum = 'male';
    else if (['female', 'f'].includes(normalized)) genderEnum = 'female';
    else if (['non-binary', 'nonbinary', 'nb'].includes(normalized)) genderEnum = 'non_binary';
    else if (['prefer not to say', 'prefer not', 'pnts'].includes(normalized)) genderEnum = 'prefer_not_to_say';
  }
  
  return {
    valid: errors.length === 0,
    errors,
    data: {
      fullName,
      email,
      matricNumber,
      phone,
      gender: genderEnum,
      dateOfBirth: dateOfBirth || undefined,
      jambRegNo,
      levelId,
      departmentId,
      level: levelNum ? String(levelNum) : undefined
    }
  };
}

export const actions: Actions = {
  upload: async ({ request, locals }) => {
    const user = requireLecturer(locals.user);
    const prisma = await getPrismaClient();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const departmentId = formData.get('departmentId') as string || null;
    const levelId = formData.get('levelId') as string || null;
    const defaultPassword = formData.get('defaultPassword') as string || 'student123';
    
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
        parsedData = parseExcel(buffer);
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
    
    // Get departments and levels for validation
    const departments = await prisma.department.findMany({
      select: { id: true, code: true, name: true }
    });
    
    const levels = await prisma.level.findMany({
      select: { id: true, level: true, name: true }
    });
    
    // Validate each row
    const validationResults = parsedData.map((row, index) => 
      validateStudentData(row, index, departments, levels)
    );
    
    const validRows = validationResults.filter(r => r.valid);
    const errorRows = validationResults.filter(r => !r.valid);
    
    // Prepare for database insertion
    const studentsToCreate: any[] = [];
    const errors: string[] = [];
    
    for (const result of validRows) {
      const { data } = result;
      
      // Check if student already exists
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: data.email },
            { matricNumber: data.matricNumber }
          ]
        }
      });
      
      if (existing) {
        errors.push(`Student ${data.fullName} (${data.matricNumber}) already exists`);
        continue;
      }
      
      studentsToCreate.push({
        email: data.email,
        fullName: data.fullName,
        passwordHash: defaultPassword, // Will be hashed by the system
        role: 'student',
        matricNumber: data.matricNumber,
        phone: data.phone || null,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : new Date(),
        jambRegNo: data.jambRegNo || null,
        levelId: data.levelId || (levelId ? parseInt(levelId) : null),
        departmentId: data.departmentId || departmentId || null,
        session: '2025/2026',
        isActive: true
      });
    }
    
    // Add error rows messages
    for (const result of errorRows) {
      errors.push(...result.errors);
    }
    
    // Create students
    let successCount = 0;
    for (const student of studentsToCreate) {
      try {
        // Hash password using the same method as seed
        const { hashPassword } = await import('$lib/server/auth/password.js');
        student.passwordHash = await hashPassword(defaultPassword);
        
        await prisma.user.create({
          data: student
        });
        successCount++;
      } catch (err) {
        errors.push(`Failed to create student ${student.fullName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    // Log the upload
    await sql(
      `INSERT INTO student_uploads 
       (id, file_name, file_type, file_size, row_count, success_count, error_count, uploaded_by, uploaded_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomBytes(16).toString('hex'),
        fileName,
        fileExt,
        fileSize,
        parsedData.length,
        successCount,
        errors.length,
        user.id,
        new Date()
      ]
    );
    
    return {
      success: true,
      message: `Uploaded ${successCount} students successfully`,
      errors: errors.length > 0 ? errors : undefined,
      totalRows: parsedData.length,
      successCount,
      errorCount: errors.length
    };
  }
};