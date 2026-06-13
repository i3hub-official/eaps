// src/lib/constants/enums.ts

export const SessionStatus = {
  active: 'active',
  not_started: 'not_started',
  in_progress: 'in_progress',
  submitted: 'submitted',
  flagged: 'flagged',
  force_submitted: 'force_submitted',
} as const;

export type SessionStatus = typeof SessionStatus[keyof typeof SessionStatus];