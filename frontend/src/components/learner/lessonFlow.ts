export type LearnerStepPresentation =
  | 'content'
  | 'practice'
  | 'checkpoint'
  | 'adaptive_support'
  | 'completion';

export type LearnerStepActionKind =
  | 'complete_step'
  | 'submit_answer'
  | 'review_feedback'
  | 'retry_checkpoint'
  | 'open_support'
  | 'return_to_main_path'
  | 'continue';

export type LearnerStepStatus =
  | 'blocked'
  | 'ready'
  | 'feedback'
  | 'passed'
  | 'retry_required'
  | 'support_required'
  | 'attempt_limit'
  | 'completed';

export type LearnerStepRuntimeState = {
  presentation: LearnerStepPresentation;
  status: LearnerStepStatus;
  statusLabel: string;
  canContinue: boolean;
  blockingReason?: string | null;
  nextActionLabel: string;
  nextActionHint: string;
  nextActionKind: LearnerStepActionKind;
  supportVisibility?: 'none' | 'recommended' | 'required';
  isCorrect?: boolean | null;
  attemptsUsed?: number;
  attemptsRemaining?: number;
};

