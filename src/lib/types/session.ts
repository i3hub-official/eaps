export type SessionStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'force_submitted'
  | 'flagged'
  | 'timed_out';

export interface ExamSession {
  id:               string;
  examId:           string;
  studentId:        string;
  invigilatorId?:   string;
  status:           SessionStatus;
  startedAt?:       Date;
  submittedAt?:     Date;
  timeRemainingSecs?: number;
  score?:           number;
  createdAt:        Date;
}