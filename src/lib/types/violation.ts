export type FlagType =
  | 'tab_switch'
  | 'window_blur'
  | 'fullscreen_exit'
  | 'copy_attempt'
  | 'devtools_open'
  | 'screenshot_attempt'
  | 'multiple_faces'
  | 'no_face_detected'
  | 'invigilator_manual';

export type ActionTaken =
  | 'warning'
  | 'invigilator_alerted'
  | 'exam_paused'
  | 'auto_submitted';

export interface Violation {
  id:          string;
  sessionId:   string;
  flagType:    FlagType;
  actionTaken: ActionTaken;
  flaggedAt:   Date;
  metadata?:   Record<string, unknown>;
}