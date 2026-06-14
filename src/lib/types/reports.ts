// src/lib/types/reports.ts

/** Report metadata — serializable, sent to client */
export interface ReportMeta {
  id: string;
  label: string;
  description: string;
  category: 'academic' | 'administrative' | 'analytics' | 'compliance';
  icon?: string;
  supportsSearch: boolean;
  supportsDateRange: boolean;
  supportsFilters: boolean;
  defaultDateRange?: string;
  allowedRoles?: string[];
}

/** Server-side engine definition — NOT serializable, stays on server */
export interface ReportEngine<TParams = unknown, TData = unknown> {
  fetch(params: TParams): Promise<TData>;
  validate?(params: unknown): TParams;
}

/** Complete report definition — server-only */
export interface ReportDefinition<TParams = unknown, TData = unknown> {
  meta: ReportMeta;
  engine: () => Promise<{ default: ReportEngine<TParams, TData> }>;
}

/** Unified report params from URL */
export interface ReportParams {
  q?: string;
  from?: string;
  to?: string;
  range?: string;
  status?: string;
  college?: string;
  department?: string;
  level?: string;
  lecturer?: string;
  course?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  [key: string]: unknown;
}

/** Generic report data wrapper */
export interface ReportPayload<T = unknown> {
  meta: ReportMeta;
  params: ReportParams;
  data: T;
  summary?: ReportSummary;
}

/** Common summary stats */
export interface ReportSummary {
  totalCount: number;
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  generatedAt: string;
  loadTimeMs: number;
}

/** Exam performance data shape */
export interface ExamPerformanceData {
  exams: ExamStat[];
  dailyActivity: DailyActivity[];
  topStudents: StudentPerformance[];
  atRiskStudents: StudentPerformance[];
  violationBreakdown: ViolationItem[];
  flagLabels: Record<string, string>;
  colleges: string[];
  departments: string[];
  lecturers: string[];
  courses: string[];
  levels: string[];
}

export interface ExamStat {
  id: string;
  exam_title: string;
  course_code: string;
  course_title?: string;
  lecturer_name: string | null;
  lecturer_id?: string;
  college: string;
  department: string;
  level: number | string;
  total: number;
  submitted: number;
  passed: number;
  failed: number;
  pending: number;
  completion_rate: number;
  pass_rate: number;
  avg_pct: number;
  avg_score?: number;
  status: 'active' | 'completed' | 'upcoming' | 'draft';
  start_date?: string;
  end_date?: string;
  violation_count: number;
}

export interface DailyActivity {
  day: string;
  sessions: number;
  submissions: number;
  avg_score: number;
  unique_students: number;
}

export interface StudentPerformance {
  student_id: string;
  student_name: string;
  matric_number: string | null;
  email?: string;
  college: string;
  department: string;
  level: number | string;
  exams_taken: number;
  submitted_count: number;
  passed_count: number;
  failed_count: number;
  avg_pct: number;
  best_pct: number;
  worst_pct: number;
  total_score?: number;
  max_possible?: number;
}

export interface ViolationItem {
  flag_type: string;
  count: number;
  pct_of_total: number;
  severity: 'low' | 'medium' | 'high';
  last_occurrence?: string;
}

/** Grade distribution data shape */
export interface GradeDistributionData {
  gradeData: Record<string, GradeInfo>;
  distribution: GradeDistributionItem[];
  byDepartment: Record<string, DepartmentGrades>;
  byLevel: Record<string, LevelGrades>;
  overallStats: GradeStats;
}

export interface GradeInfo {
  count: number;
  percentage: number;
  range: string;
  minScore: number;
  maxScore: number;
}

export interface GradeDistributionItem {
  grade: string;
  count: number;
  percentage: number;
  cumulativePct: number;
}

export interface DepartmentGrades {
  department: string;
  college: string;
  totalStudents: number;
  avgScore: number;
  gradeDistribution: Record<string, number>;
}

export interface LevelGrades {
  level: string;
  totalStudents: number;
  avgScore: number;
  passRate: number;
}

export interface GradeStats {
  totalStudents: number;
  meanScore: number;
  medianScore: number;
  stdDeviation: number;
  passRate: number;
  failRate: number;
}

/** Audit log data shape */
export interface AuditLogData {
  logs: AuditLogEntry[];
  summary: AuditSummary;
  filters: AuditFilterOptions;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user: string;
  user_role: string;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, unknown>;
  ip: string;
  user_agent?: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface AuditSummary {
  totalLogs: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
  byUser: Record<string, number>;
  timeRange: { from: string; to: string };
}

export interface AuditFilterOptions {
  actions: string[];
  entities: string[];
  users: string[];
  severities: string[];
}

/** Chart/Visualization types */
export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar';
  labels: string[];
  datasets: ChartDataset[];
  options?: Record<string, unknown>;
}

export type ViewMode = 'list' | 'grid' | 'card' | 'carousel';
export type SortDir  = 'asc' | 'desc';

export interface PaginationState {
  page:     number;
  pageSize: number;
  total:    number;
}

export interface TableColumn {
  key:      string;
  label:    string;
  numeric?: boolean;
  hidden?:  boolean;   // IDs start hidden
  format?:  'id' | 'date' | 'percent' | 'number' | 'badge';
}