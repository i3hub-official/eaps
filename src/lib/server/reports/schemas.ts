// lib/server/reports/schemas.ts

import { z } from 'zod';

// ─── Shared params all reports can receive ────────────────────────────────────
export const ReportParamsSchema = z.object({
  q:        z.string().trim().optional(),
  from:     z.string().optional(),   // ISO date string
  to:       z.string().optional(),
  semester: z.string().optional(),
  page:     z.coerce.number().int().positive().default(1),
});

export type ReportParams = z.infer<typeof ReportParamsSchema>;

export const ReportFiltersSchema = z.object({
  session:    z.string().optional(),
  semester:   z.coerce.number().int().min(1).max(2).optional(),
  department: z.string().optional(),   // department id (uuid)
  college:    z.coerce.number().optional(),  // college id
  level:      z.coerce.number().optional(),  // level value e.g. 100, 200
  exam:       z.string().optional(),   // exam id (uuid)
  role:       z.enum(['student', 'lecturer', 'invigilator', 'admin']).optional(),
  status:     z.string().optional(),
  dateFrom:   z.string().optional(),   // ISO date string
  dateTo:     z.string().optional(),   // ISO date string
  limit:      z.coerce.number().int().min(1).max(500).default(100),
  page:       z.coerce.number().int().min(1).default(1),
});
 
export type ReportFilters = z.infer<typeof ReportFiltersSchema>;

// ─── What every engine must return ───────────────────────────────────────────
export type ReportResult = Record<string, unknown>;

// ─── Engine interface every report file must implement ────────────────────────
export interface ReportEngine {
  fetch(params: ReportParams): Promise<ReportResult>;
}



// ─── Report metadata for the registry ────────────────────────────────────────
export interface ReportMeta {
  id:          string;
  label:       string;
  description: string;
  engine:      () => Promise<{ default: ReportEngine }>;  // lazy import
  supportsSearch:   boolean;
  supportsDateRange: boolean;
  exportable:  boolean;
}