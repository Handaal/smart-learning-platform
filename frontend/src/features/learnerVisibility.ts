export type LearnerVisibilityMode =
  | 'always_show'
  | 'show_if_needed'
  | 'show_after_submission'
  | 'researcher_only'
  | 'hidden_from_learner';

type VisibilityContext = {
  isNeeded?: boolean;
  afterSubmission?: boolean;
  researcherView?: boolean;
};

export const learnerVisibility = {
  dashboard: {
    cohortBadge: 'hidden_from_learner',
    supportPrompt: 'show_if_needed',
    lockedHint: 'show_if_needed',
  },
  modules: {
    availabilityHint: 'show_if_needed',
    internalFocusArea: 'hidden_from_learner',
  },
  session: {
    stepTypeLabel: 'hidden_from_learner',
    checkpointBadge: 'show_if_needed',
    adaptiveAlertSurface: 'show_if_needed',
    blockedGuidance: 'show_if_needed',
    internalPathLogic: 'hidden_from_learner',
  },
  quiz: {
    internalMeta: 'hidden_from_learner',
    feedbackSummary: 'show_after_submission',
    checkpointIntro: 'always_show',
  },
  content: {
    internalMeta: 'hidden_from_learner',
    passiveCompletionHint: 'hidden_from_learner',
    instructionalNote: 'show_if_needed',
  },
  onboarding: {
    overrideExplanation: 'hidden_from_learner',
    optionalBrowseAction: 'show_if_needed',
  },
  assessment: {
    rawFormType: 'hidden_from_learner',
    stageLabel: 'always_show',
    completionSummary: 'show_after_submission',
  },
  reflection: {
    writingGuide: 'show_if_needed',
    completionSummary: 'show_after_submission',
  },
  adaptiveQuiz: {
    checkpointIntro: 'always_show',
    attemptsMeta: 'show_if_needed',
    adaptiveAlertSurface: 'show_if_needed',
    resultFeedback: 'show_after_submission',
  },
  pmTools: {
    contextualPurpose: 'always_show',
  },
} as const satisfies Record<string, Record<string, LearnerVisibilityMode>>;

export function shouldShowLearnerElement(
  mode: LearnerVisibilityMode,
  context: VisibilityContext = {},
) {
  switch (mode) {
    case 'always_show':
      return true;
    case 'show_if_needed':
      return Boolean(context.isNeeded);
    case 'show_after_submission':
      return Boolean(context.afterSubmission);
    case 'researcher_only':
      return Boolean(context.researcherView);
    case 'hidden_from_learner':
    default:
      return false;
  }
}
