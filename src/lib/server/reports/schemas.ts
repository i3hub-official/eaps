// src/lib/server/reports/schemas.ts

import { z } from 'zod';

export const DateRangeSchema = z.enum(['7d', '14d', '30d', '90d', '1y', 'all']).default('14d');

export const ReportParamsSchema = z.object({
  q: z.string().trim().max(200).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  range: DateRangeSchema.optional(),
  status: z.enum(['all', 'active', 'completed', 'upcoming', 'draft']).default('all'),
  college: z.string().optional(),
  department: z.string().optional(),
  level: z.string().optional(),
  lecturer: z.string().optional(),
  course: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).passthrough(); // Allow extra params for custom reports

export type ValidatedReportParams = z.infer<typeof ReportParamsSchema>;

/** Parse date range into actual dates */
export function parseDateRange(range: string): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);

  switch (range) {
    case '7d': from.setDate(to.getDate() - 7); break;
    case '14d': from.setDate(to.getDate() - 14); break;
    case '30d': from.setDate(to.getDate() - 30); break;
    case '90d': from.setDate(to.getDate() - 90); break;
    case '1y': from.setFullYear(to.getFullYear() - 1); break;
    case 'all': from.setFullYear(2000); break;
    default: from.setDate(to.getDate() - 14);
  }
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

/** Build SQL WHERE conditions from params */
export function buildFilters(params: ValidatedReportParams) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const addCondition = (field: string, operator: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`${field} ${operator} $${paramIndex++}`);
      values.push(value);
    }
  };

  addCondition('college', '=', params.college);
  addCondition('department', '=', params.department);
  addCondition('level', '=', params.level);
  addCondition('lecturer_name', 'ILIKE', params.lecturer ? `%${params.lecturer}%` : undefined);
  addCondition('course_code', 'ILIKE', params.course ? `%${params.course}%` : undefined);

  if (params.status && params.status !== 'all') {
    addCondition('status', '=', params.status);
  }

  if (params.q) {
    conditions.push(`(
      exam_title ILIKE $${paramIndex} OR
      course_code ILIKE $${paramIndex} OR
      course_title ILIKE $${paramIndex} OR
      lecturer_name ILIKE $${paramIndex}
    )`);
    values.push(`%${params.q}%`);
    paramIndex++;
  }

  if (params.from && params.to) {
    conditions.push(`created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
    values.push(params.from, params.to);
    paramIndex += 2;
  } else if (params.range && params.range !== 'all') {
    const { from, to } = parseDateRange(params.range);
    conditions.push(`created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
    values.push(from.toISOString(), to.toISOString());
    paramIndex += 2;
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
    paramIndex: paramIndex - 1,
  };
}
