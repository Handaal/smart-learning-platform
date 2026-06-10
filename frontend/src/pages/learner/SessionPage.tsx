import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ListChecks,
  Lock,
  Route,
} from 'lucide-react';
import { sessionApi, scenarioApi } from '@/services/api';
import { EmotionTracker } from '@/services/emotionTracker';
import { useEmotionStore, type AdaptivePayload } from '@/store/emotionStore';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/i18n';
import { learnerVisibility, shouldShowLearnerElement } from '@/features/learnerVisibility';
import { MOCK_MODULES, MOCK_SESSION_DETAIL, USE_MOCK } from '@/services/mockData';
import AdaptiveAlertSurface from '@/components/emotion/AdaptiveAlertSurface';
import type { LessonQuiz } from '@/components/admin/LessonQuizBuilder';
import LessonContentBlock, { type LessonContentElement } from '@/components/learner/LessonContentBlock';
import LessonQuizPanel from '@/components/learner/LessonQuizPanel';
import type { LearnerStepPresentation, LearnerStepRuntimeState } from '@/components/learner/lessonFlow';
import { insertAdaptiveIntoBaseline } from '@/utils/adaptivePlacement';
import {
  normalizeAdaptiveScenarioKey,
  normalizeAdaptiveTag,
  scenarioUsesAlertSurface,
  type CanonicalAdaptiveScenarioKey,
} from '@policy/adaptive-alerts-policy';
import styles from './SessionPage.module.css';

type TranslateFn = (
  key: string,
  fallback?: string,
  values?: Record<string, string | number>,
) => string;

type ModuleSummary = {
  id: string;
  title: string;
  description?: string | null;
  sequenceOrder: number;
  estimatedDurationMin?: number | null;
  episodes: LessonSummary[];
};

type LessonSummary = {
  id: string;
  title: string;
  description?: string | null;
  sequenceOrder: number;
  expectedDurationMin?: number | null;
  lessonType?: string | null;
  status?: 'draft' | 'published';
};

type LessonDetail = LessonSummary & {
  learningContents: LessonContentElement[];
  quizzes: LessonQuiz[];
};

type LessonStep =
  | {
      id: string;
      kind: 'content';
      title: string;
      isAdaptive: boolean;
      presentation: Extract<LearnerStepPresentation, 'content' | 'practice' | 'adaptive_support'>;
      element: LessonContentElement;
    }
  | {
      id: string;
      kind: 'quiz';
      title: string;
      presentation: 'checkpoint';
      quiz: LessonQuiz;
    }
  | {
      id: string;
      kind: 'completion';
      title: string;
      presentation: 'completion';
    };

function buildMockLessonElements(lesson: LessonSummary | null): LessonContentElement[] {
  if (!lesson) return [];

  return [
    {
      id: `${lesson.id}-intro`,
      contentType: 'TEXT',
      adaptiveTag: null,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 1,
      contentData: {
        title: lesson.title,
        text:
          lesson.description ||
          'Start by identifying the key instructional decision in this scenario, then proceed to the next guided step.',
        note: 'Focus on this step only. You can always open the outline to review the full lesson flow.',
      },
    },
    {
      id: `${lesson.id}-video`,
      contentType: 'VIDEO',
      adaptiveTag: null,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 2,
      contentData: {
        title: 'Scenario walkthrough',
        url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        transcript: 'Watch the clip and capture one concrete action you would apply in your own project context.',
      },
    },
    {
      id: `${lesson.id}-check`,
      contentType: 'ASSESSMENT',
      adaptiveTag: null,
      scaffoldLevel: 3,
      isEnrichment: false,
      sequenceOrder: 3,
      contentData: {
        title: 'Quick checkpoint',
        question: 'Which action should happen first in this situation?',
        options: ['Clarify scope impact', 'Start implementation', 'Skip the review', 'Delay all communication'],
        hint: 'Pick the option that creates clarity before execution.',
      },
    },
  ];
}

function buildMockLessonQuizzes(lesson: LessonSummary | null): LessonQuiz[] {
  if (!lesson) return [];

  return [
    {
      id: `${lesson.id}-quiz`,
      title: 'Lesson checkpoint',
      description: 'Confirm your understanding before moving forward.',
      scope: 'lesson',
      passingScore: 70,
      attemptLimit: 2,
      showExplanationAfterSubmit: true,
      allowRetry: true,
      adaptiveOnFail: 'support_content',
      adaptiveOnPass: 'challenge_path',
      isPublished: true,
      sequenceOrder: 1,
      questions: [
        {
          id: `${lesson.id}-quiz-q1`,
          questionType: 'mcq',
          questionText: 'What should you do first?',
          explanation: 'The first step is clarification before committing to action.',
          hint: 'Choose the option that improves clarity.',
          weight: 1,
          sequenceOrder: 1,
          choices: [
            { id: `${lesson.id}-quiz-q1-a`, choiceText: 'Clarify the situation and impact', isCorrect: true, sequenceOrder: 1 },
            { id: `${lesson.id}-quiz-q1-b`, choiceText: 'Start immediately without analysis', isCorrect: false, sequenceOrder: 2 },
            { id: `${lesson.id}-quiz-q1-c`, choiceText: 'Ignore stakeholder signals', isCorrect: false, sequenceOrder: 3 },
            { id: `${lesson.id}-quiz-q1-d`, choiceText: 'Wait without communicating', isCorrect: false, sequenceOrder: 4 },
          ],
        },
      ],
    },
  ];
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getAdaptiveTags(state: CanonicalAdaptiveScenarioKey | null) {
  return state ? [state] : [];
}

function getAdaptiveDisplayTag(element: LessonContentElement) {
  return asText(element.contentData.adaptiveTriggerLabel);
}

function mapTriggerTypeToState(triggerType?: string | null) {
  if (!triggerType) return null;
  return normalizeAdaptiveScenarioKey(triggerType);
}

function triggerUsesAdaptiveContent(triggerType?: string | null) {
  const scenarioKey = mapTriggerTypeToState(triggerType);
  return (
    scenarioKey === 'confusion' ||
    scenarioKey === 'frustration' ||
    scenarioKey === 'boredom_disengagement' ||
    scenarioKey === 'high_engagement'
  );
}

function getAdaptiveMatchScore(
  element: LessonContentElement,
  state: CanonicalAdaptiveScenarioKey | null,
  adaptiveTags: string[],
) {
  const displayTag = getAdaptiveDisplayTag(element);
  if (displayTag && state && normalizeAdaptiveTag(displayTag) === state) return 0;
  if (element.adaptiveTag && adaptiveTags.includes(normalizeAdaptiveTag(String(element.adaptiveTag)))) return 1;
  return -1;
}

function contentStepTitle(
  element: LessonContentElement,
  tr: (key: string, fallback?: string, values?: Record<string, string | number>) => string,
) {
  const customTitle = asText(element.contentData.title);
  if (customTitle) return customTitle;

  if (element.contentType === 'TEXT') return tr('learner.session.contentStep.text', 'Text step');
  if (element.contentType === 'VIDEO') return tr('learner.session.contentStep.video', 'Video step');
  if (element.contentType === 'VISUAL') return tr('learner.session.contentStep.image', 'Visual step');
  return tr('learner.session.contentStep.activity', 'Interactive activity');
}

function getAdaptiveOptionKey(element: LessonContentElement) {
  return asText(element.contentData.adaptiveOptionKey) || element.id;
}

function getAdaptiveOptionLabel(
  element: LessonContentElement,
  tr: (key: string, fallback?: string, values?: Record<string, string | number>) => string,
) {
  const fallback = asText(element.contentData.adaptiveOptionLabel) || contentStepTitle(element, tr);
  const optionKey = getAdaptiveOptionKey(element);
  const translationKey = {
    simple_example: 'learner.session.adaptiveOptions.simpleExample',
    image: 'learner.session.adaptiveOptions.image',
    diagram: 'learner.session.adaptiveOptions.diagram',
    video: 'learner.session.adaptiveOptions.video',
    simplified_explanation: 'learner.session.adaptiveOptions.simplifiedExplanation',
    worked_example: 'learner.session.adaptiveOptions.workedExample',
    task_breakdown: 'learner.session.adaptiveOptions.taskBreakdown',
    short_support_video: 'learner.session.adaptiveOptions.shortSupportVideo',
  }[optionKey];

  return translationKey ? tr(translationKey, fallback) : fallback;
}

function getContentPresentation(
  element: LessonContentElement,
  isAdaptive: boolean,
): Extract<LearnerStepPresentation, 'content' | 'practice' | 'adaptive_support'> {
  if (isAdaptive) return 'adaptive_support';
  if (element.contentType === 'ASSESSMENT') return 'practice';
  return 'content';
}

function normalizeTaskKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const TASK_CONTEXT_RULES = [
  { key: 'wbs', terms: ['wbs', 'work breakdown', 'هيكل تجزئة', 'تجزئة العمل'] },
  { key: 'scope_analysis', terms: ['scope', 'النطاق', 'scope analysis', 'تحليل النطاق'] },
  { key: 'risk_analysis', terms: ['risk', 'المخاطر', 'risk analysis', 'تحليل المخاطر'] },
  { key: 'schedule_management', terms: ['schedule', 'الجدول الزمني', 'timeline', 'الجدولة'] },
  { key: 'cost_management', terms: ['cost', 'budget', 'التكلفة', 'الميزانية'] },
  { key: 'resource_management', terms: ['resource', 'الموارد', 'resource allocation', 'تخصيص الموارد'] },
  { key: 'communication_management', terms: ['communication', 'الاتصال', 'التواصل'] },
  { key: 'stakeholder_management', terms: ['stakeholder', 'أصحاب المصلحة'] },
  { key: 'integration_management', terms: ['integration', 'التكامل'] },
  { key: 'quality_management', terms: ['quality', 'الجودة'] },
  { key: 'decision_making', terms: ['decision', 'القرار', 'اتخاذ القرار'] },
  { key: 'documentation_follow_up', terms: ['documentation', 'التوثيق', 'follow-up', 'المتابعة'] },
] as const;

function inferTaskContextKeyFromText(...segments: Array<string | null | undefined>) {
  const haystack = segments
    .map((segment) => asText(segment))
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!haystack) return null;

  for (const rule of TASK_CONTEXT_RULES) {
    if (rule.terms.some((term) => haystack.includes(term))) {
      return rule.key;
    }
  }

  return null;
}

function getTaskContextKey(
  step: LessonStep | null,
  lesson: LessonSummary | null,
) {
  if (!step) return null;

  if (step.kind === 'content') {
    const explicitKey = asText(step.element.contentData.taskContextKey);
    if (explicitKey) return normalizeTaskKey(explicitKey);

    return inferTaskContextKeyFromText(
      step.title,
      asText(step.element.contentData.title),
      asText(step.element.contentData.text),
      asText(step.element.contentData.caption),
      asText(step.element.contentData.transcript),
      asText(step.element.contentData.prompt),
      asText(step.element.contentData.question),
      lesson?.title,
      lesson?.description,
    );
  }

  if (step.kind === 'quiz') {
    const explicitKey = asText((step.quiz as Record<string, unknown>).taskContextKey);
    if (explicitKey) return normalizeTaskKey(explicitKey);

    return inferTaskContextKeyFromText(
      step.title,
      step.quiz.title,
      step.quiz.description ?? '',
      lesson?.title,
      lesson?.description,
      ...step.quiz.questions.map((question) => question.questionText),
    );
  }

  return inferTaskContextKeyFromText(step.title, lesson?.title, lesson?.description);
}

function getBehaviorContentType(step: LessonStep | null) {
  if (!step) return 'theoretical';
  if (step.kind === 'quiz') return 'assessment';
  if (step.kind === 'completion') return 'summary';

  if (step.presentation === 'adaptive_support' && step.element.isEnrichment) return 'challenge';
  if (step.presentation === 'adaptive_support') return 'support';
  if (step.element.contentType === 'ASSESSMENT') return 'interactive_case';
  if (step.element.contentType === 'TEXT' || step.element.contentType === 'VIDEO' || step.element.contentType === 'VISUAL') {
    return 'theoretical';
  }

  return 'interactive_case';
}

function getBehaviorActivityType(step: LessonStep | null) {
  if (!step) return 'learning_step';
  if (step.kind === 'quiz') return 'assessment';
  if (step.kind === 'completion') return 'summary';
  if (step.presentation === 'adaptive_support') return 'support';
  return step.element.contentType === 'ASSESSMENT' ? 'scenario_task' : 'learning_step';
}

function getExpectedTimeSec(step: LessonStep | null) {
  if (!step) return 90;
  if (step.kind === 'quiz') return 180;
  if (step.kind === 'completion') return 45;
  if (step.element.contentType === 'VIDEO' || step.element.contentType === 'VISUAL') return 120;
  if (step.element.contentType === 'ASSESSMENT') return step.presentation === 'adaptive_support' ? 120 : 150;
  return 90;
}

function createDefaultStepState(step: LessonStep, tr: TranslateFn, hasNextLesson: boolean): LearnerStepRuntimeState {
  if (step.presentation === 'completion') {
    return {
      presentation: 'completion',
      status: 'ready',
      statusLabel: tr('learner.session.flow.status.completionReady', 'Lesson ready to complete'),
      canContinue: true,
      blockingReason: null,
      nextActionLabel: hasNextLesson
        ? tr('learner.session.flow.next.nextLesson', 'Continue to next lesson')
        : tr('learner.session.flow.next.finishJourney', 'Continue to final completion'),
      nextActionHint: hasNextLesson
        ? tr(
            'learner.session.flow.hint.completionWithNext',
            'This lesson is complete. Continue to open the next lesson in sequence.',
          )
        : tr(
            'learner.session.flow.hint.completionFinal',
            'This lesson is complete. Continue to finish the final stage of the training.',
          ),
      nextActionKind: 'continue',
      supportVisibility: 'none',
    };
  }

  if (step.presentation === 'checkpoint') {
    return {
      presentation: 'checkpoint',
      status: 'blocked',
      statusLabel: tr('learner.session.flow.status.awaitingSubmission', 'Checkpoint answer required'),
      canContinue: false,
      blockingReason: tr(
        'learner.session.flow.blocking.checkpoint',
        'Answer the checkpoint first, then review the result before the lesson continues.',
      ),
      nextActionLabel: tr('learner.session.flow.next.submitCheckpoint', 'Submit checkpoint'),
      nextActionHint: tr(
        'learner.session.flow.hint.checkpoint',
        'Answer the questions, submit the checkpoint, then review the feedback shown below.',
      ),
      nextActionKind: 'submit_answer',
      supportVisibility: 'none',
    };
  }

  if (step.presentation === 'practice') {
    return {
      presentation: 'practice',
      status: 'blocked',
      statusLabel: tr('learner.session.flow.status.practiceRequired', 'Practice response required'),
      canContinue: false,
      blockingReason: tr(
        'learner.session.flow.blocking.practice',
        'Complete this short activity and submit your response before continuing.',
      ),
      nextActionLabel: tr('learner.session.flow.next.submitPractice', 'Submit activity response'),
      nextActionHint: tr(
        'learner.session.flow.hint.practice',
        'Use the activity area below to submit your response. The lesson will continue after it is saved.',
      ),
      nextActionKind: 'submit_answer',
      supportVisibility: 'none',
    };
  }

  if (step.presentation === 'adaptive_support') {
    const adaptiveVisibility =
      step.kind === 'content' && step.element.isEnrichment ? 'recommended' : 'required';
    const isInteractiveAdaptive =
      step.kind === 'content' && step.element.contentType === 'ASSESSMENT';

    if (!isInteractiveAdaptive) {
      return {
        presentation: 'adaptive_support',
        status: 'ready',
        statusLabel: tr('learner.lessonContent.flow.supportReviewedStatus', 'Support step reviewed'),
        canContinue: true,
        blockingReason: null,
        nextActionLabel: tr('learner.lessonContent.flow.nextAction.returnToLesson', 'Continue with the lesson'),
        nextActionHint: tr(
          'learner.lessonContent.flow.supportReviewedHint',
          'You reviewed this support step. Continue to return to the lesson.',
        ),
        nextActionKind: 'return_to_main_path',
        supportVisibility: adaptiveVisibility,
      };
    }

    return {
      presentation: 'adaptive_support',
      status: adaptiveVisibility === 'required' ? 'support_required' : 'blocked',
      statusLabel:
        adaptiveVisibility === 'required'
          ? tr('learner.session.flow.status.supportRequired', 'Support step in progress')
          : tr('learner.session.flow.status.challengeAvailable', 'Challenge step available'),
      canContinue: false,
      blockingReason:
        adaptiveVisibility === 'required'
          ? tr(
              'learner.session.flow.blocking.support',
              'Complete this short support step before you return to the lesson.',
            )
          : tr(
              'learner.session.flow.blocking.challenge',
              'Take a moment with this optional stretch step, then continue when you are ready.',
            ),
      nextActionLabel:
        adaptiveVisibility === 'required'
          ? tr('learner.session.flow.next.completeSupport', 'Complete support step')
          : tr('learner.session.flow.next.reviewChallenge', 'Review challenge step'),
      nextActionHint:
        adaptiveVisibility === 'required'
          ? tr(
              'learner.session.flow.hint.support',
              'This short support step helps you continue more clearly. Finish it, then return to the lesson.',
            )
          : tr(
              'learner.session.flow.hint.challenge',
              'This optional stretch step lets you go a little deeper before you move on.',
            ),
      nextActionKind: 'continue',
      supportVisibility: adaptiveVisibility,
    };
  }

  if (step.kind === 'content' && step.element.contentType !== 'ASSESSMENT') {
    return {
      presentation: 'content',
      status: 'ready',
      statusLabel: tr('learner.lessonContent.flow.readyAfterReviewStatus', 'Ready to continue'),
      canContinue: true,
      blockingReason: null,
      nextActionLabel: tr('learner.session.flow.next.completeContent', 'Continue when ready'),
      nextActionHint: tr(
        'learner.lessonContent.flow.reviewReadyHint',
        'You reviewed this step. Continue whenever you are ready for the next part.',
      ),
      nextActionKind: 'continue',
      supportVisibility: 'none',
    };
  }

  return {
    presentation: 'content',
    status: 'blocked',
    statusLabel: tr('learner.session.flow.status.reviewCurrent', 'Review this lesson step'),
    canContinue: false,
    blockingReason: tr(
      'learner.session.flow.blocking.content',
      'Spend a moment with this step first. The lesson will open the next part automatically after review.',
    ),
    nextActionLabel: tr('learner.session.flow.next.completeContent', 'Continue when ready'),
    nextActionHint: tr(
      'learner.session.flow.hint.content',
      'Read, watch, or review this step first. The continue action becomes available automatically after a short review.',
    ),
    nextActionKind: 'complete_step',
    supportVisibility: 'none',
  };
}

export default function SessionPage() {
  const { t, isRtl } = useI18n();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const learnerCohort = useAuthStore((state) => state.cohort);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<EmotionTracker | null>(null);
  const hydratedEpisodeRef = useRef(false);
  const stepHeaderRef = useRef<HTMLDivElement | null>(null);

  const [wsReady, setWsReady] = useState(false);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [furthestLessonIndexReached, setFurthestLessonIndexReached] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [furthestStepIndexReached, setFurthestStepIndexReached] = useState(0);
  const [showOutline, setShowOutline] = useState(false);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [currentStepState, setCurrentStepState] = useState<LearnerStepRuntimeState | null>(null);
  const [selectedAdaptiveElementId, setSelectedAdaptiveElementId] = useState<string | null>(null);
  const [requestedAdaptiveElementId, setRequestedAdaptiveElementId] = useState<string | null>(null);
  const [dismissedNoticeKeys, setDismissedNoticeKeys] = useState<Record<string, true>>({});
  const [adaptiveEventCount, setAdaptiveEventCount] = useState(0);
  const [stepReadyCueVisible, setStepReadyCueVisible] = useState(false);
  const lastAdaptiveEventRef = useRef<AdaptivePayload | null>(null);
  const lastVisitedStepRef = useRef<string | null>(null);
  const stepEnteredAtRef = useRef(Date.now());
  const interactionMetricsRef = useRef({
    scrollEvents: 0,
    clickCount: 0,
    pageReturns: 0,
    hintRequests: 0,
    abandonmentAttempts: 0,
  });

  const currentState = useEmotionStore((state) => state.currentState);
  const pendingAdaptiveAlert = useEmotionStore((state) => state.pendingAdaptiveAlert);
  const setAffectState = useEmotionStore((state) => state.setAffectState);
  const setPendingAdaptiveAlert = useEmotionStore((state) => state.setPendingAdaptiveAlert);
  const setScaffoldLevel = useEmotionStore((state) => state.setScaffoldLevel);
  const setWebcamActive = useEmotionStore((state) => state.setWebcamActive);

  const { data: sessionData } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionApi.get(sessionId!),
    enabled: Boolean(sessionId) && !USE_MOCK,
  });

  const session = USE_MOCK ? MOCK_SESSION_DETAIL : (sessionData?.data as any);
  const moduleId = session?.moduleId;

  const { data: moduleData } = useQuery({
    queryKey: ['module', moduleId],
    queryFn: () => scenarioApi.getModule(moduleId),
    enabled: Boolean(moduleId) && !USE_MOCK,
  });

  const module = USE_MOCK
    ? (MOCK_MODULES.find((item) => item.id === moduleId) as ModuleSummary | undefined)
    : (moduleData?.data as ModuleSummary | undefined);

  const lessons = module?.episodes ?? [];
  const lesson = lessons[currentLessonIndex] ?? null;
  const nextLesson = lessons[currentLessonIndex + 1] ?? null;

  const { data: lessonData, isFetching: lessonLoading } = useQuery({
    queryKey: ['episode', lesson?.id],
    queryFn: () => scenarioApi.getEpisode(lesson!.id),
    enabled: Boolean(lesson?.id) && !USE_MOCK,
  });

  const lessonDetail = USE_MOCK
    ? ({ ...lesson, learningContents: buildMockLessonElements(lesson), quizzes: buildMockLessonQuizzes(lesson) } as LessonDetail | null)
    : ((lessonData?.data as LessonDetail | undefined) ?? null);

  const lessonElements = lessonDetail?.learningContents ?? [];
  const lessonQuizzes = lessonDetail?.quizzes ?? [];
  // Control-group learners stay on the standard lesson path. The
  // existing adaptive model remains active only for the experimental group.
  const adaptiveExperienceEnabled = learnerCohort !== 'control';
  const pendingScenarioKey =
    pendingAdaptiveAlert?.scenarioKey ?? mapTriggerTypeToState(pendingAdaptiveAlert?.triggerType);
  const adaptiveNoticeState = useMemo(
    () => pendingScenarioKey ?? currentState,
    [currentState, pendingScenarioKey],
  );
  const adaptiveTags = useMemo(() => getAdaptiveTags(adaptiveNoticeState), [adaptiveNoticeState]);
  const hasLearnerFacingAdaptiveDecision =
    adaptiveExperienceEnabled &&
    Boolean(
      pendingAdaptiveAlert &&
        pendingAdaptiveAlert.intervention !== 'do_nothing' &&
        (pendingScenarioKey ? scenarioUsesAlertSurface(pendingScenarioKey) : false),
    );
  const shouldResolveAdaptiveContent =
    adaptiveExperienceEnabled &&
    Boolean(
      selectedAdaptiveElementId ||
        (hasLearnerFacingAdaptiveDecision && triggerUsesAdaptiveContent(pendingAdaptiveAlert?.triggerType)),
    );
  const selectedAdaptiveElement = useMemo(
    () => lessonElements.find((element) => element.id === selectedAdaptiveElementId) ?? null,
    [lessonElements, selectedAdaptiveElementId],
  );

  const baselineElements = useMemo(() => {
    const baseline = lessonElements
      .filter((element) => !element.adaptiveTag || normalizeAdaptiveTag(String(element.adaptiveTag)) === 'baseline')
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    if (baseline.length) return baseline;
    return [...lessonElements].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  }, [lessonElements]);

  const matchingAdaptive = useMemo(
    () => {
      if (!shouldResolveAdaptiveContent) return [];
      if (selectedAdaptiveElement && !pendingAdaptiveAlert) return [selectedAdaptiveElement];
      return lessonElements
        .map((element) => ({
          element,
          score: getAdaptiveMatchScore(element, adaptiveNoticeState, adaptiveTags),
        }))
        .filter((entry) => entry.score >= 0)
        .sort((a, b) => a.score - b.score || a.element.sequenceOrder - b.element.sequenceOrder)
        .map((entry) => entry.element);
    },
    [adaptiveNoticeState, adaptiveTags, lessonElements, pendingAdaptiveAlert, selectedAdaptiveElement, shouldResolveAdaptiveContent],
  );

  const contextualAdaptive = useMemo(() => {
    if (!matchingAdaptive.length) return null;
    if (!selectedAdaptiveElementId) return matchingAdaptive[0] ?? null;
    return matchingAdaptive.find((element) => element.id === selectedAdaptiveElementId) ?? matchingAdaptive[0] ?? null;
  }, [matchingAdaptive, selectedAdaptiveElementId]);

  const lessonSteps = useMemo<LessonStep[]>(() => {
    const lessonFlow = contextualAdaptive
      ? insertAdaptiveIntoBaseline(baselineElements, contextualAdaptive).items
      : baselineElements;

    const contentSteps: LessonStep[] = lessonFlow.map((element) => {
      const isAdaptive = Boolean(contextualAdaptive && element.id === contextualAdaptive.id);
      return {
        id: element.id,
        kind: 'content',
        title: contentStepTitle(element, t),
        isAdaptive,
        presentation: getContentPresentation(element, isAdaptive),
        element,
      };
    });

    const quizSteps: LessonStep[] = [...lessonQuizzes]
      .filter((quiz) => quiz.isPublished !== false)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .map((quiz) => ({
        id: `quiz-${quiz.id}`,
        kind: 'quiz',
        title: quiz.title,
        presentation: 'checkpoint',
        quiz,
      }));

    const completionStep: LessonStep = {
      id: `completion-${lesson?.id ?? 'lesson'}`,
      kind: 'completion',
      title: t('learner.session.flow.completionTitle', 'Lesson wrap-up'),
      presentation: 'completion',
    };

    return [...contentSteps, ...quizSteps, completionStep];
  }, [baselineElements, contextualAdaptive, lesson?.id, lessonQuizzes, t]);

  const currentStep = lessonSteps[currentStepIndex] ?? null;
  const adaptiveStepIndex = lessonSteps.findIndex((step) => step.presentation === 'adaptive_support');
  const adaptiveSupportAvailable =
    adaptiveExperienceEnabled &&
    Boolean(contextualAdaptive) &&
    adaptiveStepIndex >= 0 &&
    adaptiveStepIndex !== currentStepIndex;
  const completedStepsCount = useMemo(() => {
    const completed = new Set(completedStepIds);
    for (let index = 0; index < currentStepIndex; index += 1) {
      const step = lessonSteps[index];
      if (step) completed.add(step.id);
    }
    return completed.size;
  }, [completedStepIds, currentStepIndex, lessonSteps]);

  const stepProgressPct = lessonSteps.length
    ? Math.round(((Math.min(currentStepIndex, lessonSteps.length - 1) + 1) / lessonSteps.length) * 100)
    : 0;

  const canMoveNext = currentStepState?.canContinue ?? false;
  const furthestAccessibleStepIndex = Math.max(
    furthestStepIndexReached,
    currentStep && currentStepState?.canContinue ? Math.min(currentStepIndex + 1, lessonSteps.length - 1) : currentStepIndex,
  );
  const stepBlocked = Boolean(currentStepState && !currentStepState.canContinue);
  const adaptiveSupportRequired = false;
  const currentNoticeKey =
    hasLearnerFacingAdaptiveDecision && pendingAdaptiveAlert && currentStep
      ? `${currentStep.id}:${pendingScenarioKey ?? 'no_face_low_confidence'}:${adaptiveEventCount}`
      : null;
  const noticeDismissed = Boolean(currentNoticeKey && dismissedNoticeKeys[currentNoticeKey]);
  const adaptiveChoices = useMemo(() => {
    if (!adaptiveExperienceEnabled) return [];
    if (!pendingAdaptiveAlert) return [];
    if (pendingScenarioKey !== 'confusion' && pendingScenarioKey !== 'frustration') {
      return [];
    }

    return matchingAdaptive.map((element) => ({
      key: element.id,
      label: getAdaptiveOptionLabel(element, t),
    }));
  }, [adaptiveExperienceEnabled, matchingAdaptive, pendingAdaptiveAlert, pendingScenarioKey, t]);
  const showAdaptiveAlertSurface =
    adaptiveExperienceEnabled &&
    hasLearnerFacingAdaptiveDecision &&
    !noticeDismissed &&
    currentStep?.presentation !== 'adaptive_support' &&
    shouldShowLearnerElement(learnerVisibility.session.adaptiveAlertSurface, { isNeeded: true });
  const stepContextBadgeLabel =
    currentStep?.presentation === 'checkpoint'
      ? t('learner.assessment.stage.checkpoint', 'Checkpoint')
      : currentStep?.presentation === 'adaptive_support' && currentStep.kind === 'content' && currentStep.element.isEnrichment
        ? t('learner.session.flow.supportBadge.challenge', 'Optional challenge')
        : currentStep?.presentation === 'adaptive_support'
          ? t('learner.session.flow.supportBadge.required', 'Short support step')
          : null;
  const footerNoticeTitle = stepBlocked
    ? currentStepState?.supportVisibility === 'required'
      ? t('learner.session.flow.guidance.required', 'Required before continuing')
      : t('learner.session.flow.guidance.blocked', 'Before you continue')
    : currentStepState?.nextActionLabel ?? t('common.continue');
  const footerNoticeBody = stepBlocked
    ? currentStepState?.blockingReason ??
      t(
        'learner.session.flow.guidance.blockedFallback',
        'Finish the current learning step first, then the next part will unlock clearly.',
      )
    : currentStepState?.nextActionHint ??
      t(
        'learner.session.flow.guidance.readyFallback',
        'You are ready to move to the next lesson item when you want to continue.',
      );

  useEffect(() => {
    if (!lessons.length || hydratedEpisodeRef.current) return;
    let initialIndex = 0;
    if (session?.episodeId) {
      const sessionIndex = lessons.findIndex((item) => item.id === session.episodeId);
      if (sessionIndex >= 0) {
        initialIndex = sessionIndex;
      }
    }
    setCurrentLessonIndex(initialIndex);
    setFurthestLessonIndexReached(initialIndex);
    setCompletedLessonIds(lessons.slice(0, initialIndex).map((item) => item.id));
    hydratedEpisodeRef.current = true;
  }, [lessons, session?.episodeId]);

  useEffect(() => {
    setCurrentStepIndex(0);
    setFurthestStepIndexReached(0);
    setCompletedStepIds([]);
    setShowOutline(false);
    setSelectedAdaptiveElementId(null);
    setRequestedAdaptiveElementId(null);
    setPendingAdaptiveAlert(null);
  }, [lesson?.id]);

  useEffect(() => {
    setFurthestStepIndexReached((current) => Math.max(current, currentStepIndex));
  }, [currentStepIndex]);

  useEffect(() => {
    if (!lessonSteps.length) return;
    if (currentStepIndex > lessonSteps.length - 1) {
      setCurrentStepIndex(lessonSteps.length - 1);
    }
  }, [currentStepIndex, lessonSteps.length]);

  useEffect(() => {
    if (adaptiveExperienceEnabled) return;
    setPendingAdaptiveAlert(null);
    setSelectedAdaptiveElementId(null);
    setRequestedAdaptiveElementId(null);
  }, [adaptiveExperienceEnabled, setPendingAdaptiveAlert]);

  useEffect(() => {
    if (!pendingAdaptiveAlert || pendingAdaptiveAlert.intervention === 'do_nothing') {
      lastAdaptiveEventRef.current = null;
      return;
    }

    if (lastAdaptiveEventRef.current !== pendingAdaptiveAlert) {
      lastAdaptiveEventRef.current = pendingAdaptiveAlert;
      setAdaptiveEventCount((count) => count + 1);
    }
  }, [pendingAdaptiveAlert]);

  useEffect(() => {
    const nextStepId = currentStep?.id ?? null;
    const previousStepId = lastVisitedStepRef.current;

    if (previousStepId && nextStepId && previousStepId !== nextStepId) {
      interactionMetricsRef.current = {
        scrollEvents: 0,
        clickCount: 0,
        pageReturns: interactionMetricsRef.current.pageReturns + 1,
        hintRequests: 0,
        abandonmentAttempts: 0,
      };
      stepEnteredAtRef.current = Date.now();
      setPendingAdaptiveAlert(null);
      setRequestedAdaptiveElementId(null);
    }

    lastVisitedStepRef.current = nextStepId;
  }, [currentStep?.id, setPendingAdaptiveAlert]);

  useEffect(() => {
    const handleScroll = () => {
      interactionMetricsRef.current.scrollEvents += 1;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!requestedAdaptiveElementId) return;
    const targetIndex = lessonSteps.findIndex(
      (step) => step.kind === 'content' && step.element.id === requestedAdaptiveElementId,
    );
    if (targetIndex < 0) return;

    setCurrentStepIndex(targetIndex);
    setShowOutline(false);
    setPendingAdaptiveAlert(null);
    setRequestedAdaptiveElementId(null);
  }, [lessonSteps, requestedAdaptiveElementId, setPendingAdaptiveAlert]);

  useEffect(() => {
    if (!currentStep) {
      setCurrentStepState(null);
      return;
    }
    setCurrentStepState(createDefaultStepState(currentStep, t, Boolean(nextLesson)));
  }, [currentStep, nextLesson, t]);

  useEffect(() => {
    if (!currentStep) return;

    setStepReadyCueVisible(true);

    const scrollFrame = window.requestAnimationFrame(() => {
      stepHeaderRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    });

    const cueTimer = window.setTimeout(() => {
      setStepReadyCueVisible(false);
    }, 900);

    return () => {
      window.cancelAnimationFrame(scrollFrame);
      window.clearTimeout(cueTimer);
    };
  }, [currentStep?.id]);

  useEffect(() => {
    const episodeId = lesson?.id ?? session?.episodeId ?? 'E1';
    if (!sessionId || !videoRef.current || USE_MOCK || !adaptiveExperienceEnabled) {
      setWebcamActive(false);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 320 } })
      .then((stream) => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;

        const tracker = new EmotionTracker(sessionId, episodeId);
        tracker.onStateUpdate = (state) => {
          setWebcamActive(true);
          setAffectState(
            (state.displayState ?? state.state ?? 'Unknown') as any,
            state.displayConfidence ?? state.confidence ?? 0,
          );
        };
        tracker.onIntervention = (decision) => {
          if (!adaptiveExperienceEnabled) return;
          setPendingAdaptiveAlert(decision);
          if (decision.scaffoldTo) setScaffoldLevel(decision.scaffoldTo);
        };

        tracker.initialize(videoRef.current).then(() => {
          setWsReady(true);
          tracker.startTracking();
        });
        trackerRef.current = tracker;
      })
      .catch(() => setWebcamActive(false));

    return () => {
      trackerRef.current?.stopTracking();
      setWebcamActive(false);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      }
    };
  }, [
    USE_MOCK,
    lesson?.id,
    session?.episodeId,
    sessionId,
    setAffectState,
    setPendingAdaptiveAlert,
    setScaffoldLevel,
    setWebcamActive,
    adaptiveExperienceEnabled,
  ]);

  useEffect(() => {
    if (!trackerRef.current || !wsReady || USE_MOCK || !adaptiveExperienceEnabled) return;
    const currentContentType = getBehaviorContentType(currentStep);
    const currentActivityType = getBehaviorActivityType(currentStep);
    const currentTaskKey = getTaskContextKey(currentStep, lesson ?? null);
    const expectedTimeSec = getExpectedTimeSec(currentStep);

    const currentActivityId =
      currentStep?.kind === 'quiz'
        ? currentStep.quiz.id
        : currentStep?.kind === 'content'
          ? currentStep.element.id
          : currentStep?.id ?? `${lesson?.id ?? 'E1'}-activity`;

    const interval = window.setInterval(() => {
      const dwellSec = Math.max(5, Math.min(15, Math.round((Date.now() - stepEnteredAtRef.current) / 1000)));
      const metrics = interactionMetricsRef.current;
      const rereadCount =
        currentStepState?.status === 'attempt_limit'
          ? 3
          : currentStepState?.status === 'feedback' || currentStepState?.status === 'support_required'
            ? 2
            : metrics.hintRequests > 0
              ? 1
              : 0;
      const abandonmentAttempts =
        currentStepState?.status === 'attempt_limit' ? 1 : metrics.abandonmentAttempts;
      const missedInteractionWindow =
        dwellSec >= 15 && metrics.clickCount === 0 && metrics.scrollEvents === 0;

      trackerRef.current?.sendBehaviorWindow(dwellSec, metrics.scrollEvents, rereadCount, stepProgressPct, {
        currentLessonId: lesson?.id ?? 'E1',
        currentActivityId,
        currentContentType,
        currentActivityType,
        currentTaskKey,
        expectedTimeSec,
        engagementScore: currentStepState?.canContinue ? 74 : stepBlocked ? 48 : 60,
        missedInteractionWindow,
        hintRequests: metrics.hintRequests,
        abandonmentAttempts,
        clickCount: metrics.clickCount,
        pageReturns: metrics.pageReturns,
      });

      interactionMetricsRef.current = {
        ...interactionMetricsRef.current,
        scrollEvents: 0,
        clickCount: 0,
        hintRequests: 0,
        abandonmentAttempts: 0,
      };
    }, 5000);

    return () => clearInterval(interval);
  }, [USE_MOCK, adaptiveExperienceEnabled, currentStep, currentStepState, lesson?.id, stepBlocked, stepProgressPct, wsReady]);

  async function persistLesson(index: number) {
    const targetLesson = lessons[index];
    if (!targetLesson || !sessionId || USE_MOCK) return;
    await sessionApi.update(sessionId, {
      episodeId: targetLesson.id,
      completionPct: Math.round(((index + 1) / Math.max(lessons.length, 1)) * 100),
    });
  }

  async function goToLesson(index: number) {
    if (index < 0 || index >= lessons.length) return;
    const nextFurthestLessonIndex = Math.max(furthestLessonIndexReached, index);
    setCurrentLessonIndex(index);
    setFurthestLessonIndexReached(nextFurthestLessonIndex);
    setCurrentStepIndex(0);
    setCompletedStepIds([]);
    setShowOutline(false);
    try {
      await persistLesson(nextFurthestLessonIndex);
    } catch {
      // Keep learner flow smooth even when sync is briefly unavailable.
    }
  }

  async function completeSession() {
    if (!USE_MOCK && sessionId) {
      await sessionApi.update(sessionId, {
        completionPct: 100,
        episodeId: lesson?.id,
      });
      await sessionApi.end(sessionId);
    }
    navigate(`/reflect/${sessionId}`);
  }

  function markStepComplete(stepId: string) {
    setCompletedStepIds((current) => (current.includes(stepId) ? current : [...current, stepId]));
  }

  function dismissAdaptiveNoticeForCurrentStep() {
    if (!currentNoticeKey) return;
    setDismissedNoticeKeys((current) => ({ ...current, [currentNoticeKey]: true }));
  }

  function openSupportStep(targetElementId?: string) {
    if (!adaptiveExperienceEnabled) return;
    interactionMetricsRef.current.clickCount += 1;
    interactionMetricsRef.current.hintRequests += 1;
    const nextElementId = targetElementId ?? contextualAdaptive?.id ?? pendingAdaptiveAlert?.contentId ?? null;
    if (nextElementId) {
      setSelectedAdaptiveElementId(nextElementId);
      setRequestedAdaptiveElementId(nextElementId);
      return;
    }

    if (adaptiveSupportAvailable) {
      setCurrentStepIndex(adaptiveStepIndex);
      setShowOutline(false);
      setPendingAdaptiveAlert(null);
    }
  }

  function handleAdaptiveChoiceSelection(choiceKey: string) {
    openSupportStep(choiceKey);
  }

  function goToPreviousStep() {
    interactionMetricsRef.current.clickCount += 1;
    if (currentStepIndex > 0) {
      setCurrentStepIndex((index) => index - 1);
      return;
    }
    if (currentLessonIndex > 0) {
      void goToLesson(currentLessonIndex - 1);
    }
  }

  function goToNextStep() {
    if (!currentStep) return;
    interactionMetricsRef.current.clickCount += 1;
    if (currentStep.kind !== 'completion') {
      markStepComplete(currentStep.id);
    }
    if (currentStep.kind === 'completion' && lesson?.id) {
      setCompletedLessonIds((current) => (current.includes(lesson.id) ? current : [...current, lesson.id]));
    }

    if (currentStepIndex < lessonSteps.length - 1) {
      setFurthestStepIndexReached((current) => Math.max(current, currentStepIndex + 1));
      setCurrentStepIndex((index) => index + 1);
      return;
    }

    if (nextLesson) {
      void goToLesson(currentLessonIndex + 1);
      return;
    }

    void completeSession();
  }

  function handlePrimaryAction() {
    if (!currentStep || !currentStepState) return;
    interactionMetricsRef.current.clickCount += 1;

    if (currentStepState.nextActionKind === 'open_support' && adaptiveSupportAvailable) {
      openSupportStep();
      return;
    }

    if (!currentStepState.canContinue) return;
    goToNextStep();
  }

  function handleStepSelection(index: number) {
    if (index <= furthestAccessibleStepIndex) {
      interactionMetricsRef.current.clickCount += 1;
      setCurrentStepIndex(index);
      setShowOutline(false);
    }
  }

  const primaryButtonLabel =
    currentStepState?.nextActionKind === 'open_support'
      ? adaptiveExperienceEnabled
        ? t('learner.session.flow.next.reviewSupport', 'Review support step')
        : currentStepState?.nextActionLabel ?? t('common.continue')
      : currentStepState?.nextActionLabel ??
        (currentStepIndex < lessonSteps.length - 1
          ? t('common.next')
          : nextLesson
            ? t('common.continue')
            : t('common.status.complete'));

  return (
    <div className={styles.page}>
      <video ref={videoRef} className={styles.hiddenVideo} muted playsInline aria-hidden="true" />

      {showOutline ? <button className={styles.drawerBackdrop} onClick={() => setShowOutline(false)} aria-label={t('layout.sidebar.closeNavigation')} /> : null}

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.moduleEyebrow}>{module?.title ?? t('layout.pageMeta.modulesTitle')}</span>
        </div>

        <div className={styles.headerMain}>
          <div className={styles.lessonTitleWrap}>
            <h1>{lesson?.title ?? t('common.loading')}</h1>
            <p>{lesson?.description || t('layout.pageMeta.sessionSubtitle')}</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowOutline((open) => !open)}>
            {showOutline ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <ListChecks size={14} />
            {t('help.layout.quickNavigation')}
          </button>
        </div>

        <div className={styles.progressStrip}>
          <div className={styles.progressMeta}>
            <span>{t('common.next')} {lessonSteps.length ? currentStepIndex + 1 : 0}/{lessonSteps.length}</span>
            <span>{t('common.status.complete')} {completedStepsCount}/{lessonSteps.length || 1}</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${stepProgressPct}%` }} />
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={`${styles.outlineDrawer} ${showOutline ? styles.outlineDrawerOpen : ''}`}>
          <section className={styles.outlineSection}>
            <div className={styles.outlineHead}>
              <h3>{t('layout.sidebar.nav.modules')}</h3>
              <span>{currentLessonIndex + 1}/{Math.max(lessons.length, 1)}</span>
            </div>

            <div className={styles.lessonList}>
              {lessons.map((item, index) => {
                const isCurrent = index === currentLessonIndex;
                const isCompleted = completedLessonIds.includes(item.id);
                const isLocked = index > furthestLessonIndexReached;
                return (
                  <button
                    key={item.id}
                    className={`${styles.lessonItem} ${isCurrent ? styles.lessonItemActive : ''} ${
                      isLocked ? styles.lessonItemLocked : ''
                    }`}
                    onClick={() => void goToLesson(index)}
                    disabled={isLocked}
                  >
                    <span className={`${styles.lessonIndex} ${isCompleted ? styles.lessonIndexDone : ''}`}>
                      {isCompleted ? <CheckCircle2 size={14} /> : isLocked ? <Lock size={12} /> : index + 1}
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        {isLocked
                          ? t('learner.session.flow.lessonLocked', 'Unlocks after the current lesson sequence')
                          : t('research.courseBuilder.units.durationMinutes', '{count} min', {
                              count: item.expectedDurationMin ?? 10,
                            })}
                      </p>
                    </div>
                  </button>
                  );
              })}
            </div>
          </section>

          <section className={styles.outlineSection}>
            <div className={styles.outlineHead}>
              <h3>{t('layout.pageMeta.sessionTitle')}</h3>
              <span>{lessonSteps.length}</span>
            </div>

            <div className={styles.stepList}>
              {lessonSteps.map((step, index) => {
                const completed =
                  completedStepIds.includes(step.id) ||
                  index < currentStepIndex ||
                  (step.kind === 'completion' && index < currentStepIndex);
                const isLocked = index > furthestAccessibleStepIndex;
                return (
                  <button
                    key={step.id}
                    className={`${styles.stepItem} ${index === currentStepIndex ? styles.stepItemActive : ''} ${
                      isLocked ? styles.stepItemLocked : ''
                    }`}
                    onClick={() => handleStepSelection(index)}
                    disabled={isLocked}
                  >
                    <span className={`${styles.stepIndex} ${completed ? styles.stepIndexDone : ''}`}>
                      {completed ? <CheckCircle2 size={12} /> : isLocked ? <Lock size={12} /> : index + 1}
                    </span>
                    <div>
                      <strong>{step.title}</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <main className={styles.main}>
          <section className={styles.player}>
            {lessonLoading ? (
              <div className={styles.emptyState}>{t('common.loading')}</div>
            ) : !lessonSteps.length ? (
              <div className={styles.emptyState}>{t('common.errors.unavailable')}</div>
            ) : currentStep ? (
              <>
                <div className={styles.stepStage} key={currentStep.id}>
                <div className={styles.stepHeader} ref={stepHeaderRef}>
                  <div>
                    <span className={styles.stepEyebrow}>{t('common.next')} {currentStepIndex + 1} / {lessonSteps.length}</span>
                    <h2>{currentStep.title}</h2>
                  </div>
                  <div className={styles.stepMeta}>
                    {stepReadyCueVisible ? (
                      <span className={styles.stepReadyCue}>
                        <CheckCircle2 size={14} />
                        {t('learner.session.flow.stepReadyCue', 'Step ready')}
                      </span>
                    ) : null}
                    {stepContextBadgeLabel ? (
                      <span
                        className={
                          currentStep.presentation === 'checkpoint' ? 'badge badge-soft-blue' : 'badge badge-teal'
                        }
                      >
                        {stepContextBadgeLabel}
                      </span>
                    ) : null}
                  </div>
                </div>

                {currentStep.kind === 'content' ? (
                  <LessonContentBlock
                    element={currentStep.element}
                    variant={currentStep.isAdaptive ? 'adaptive' : 'base'}
                    onComplete={() => markStepComplete(currentStep.id)}
                    onStateChange={setCurrentStepState}
                  />
                ) : currentStep.kind === 'quiz' ? (
                  <LessonQuizPanel
                    quiz={currentStep.quiz}
                    sessionId={sessionId!}
                    onComplete={() => markStepComplete(currentStep.id)}
                    onStateChange={setCurrentStepState}
                    adaptiveSupportAvailable={adaptiveSupportAvailable}
                    onOpenSupport={openSupportStep}
                  />
                ) : (
                  <section className={styles.completionCard}>
                    <div className={styles.completionHead}>
                      <div className={styles.completionIcon}>
                        <Route size={18} />
                      </div>
                      <div>
                        <span className={styles.stepStateEyebrow}>
                          {t('learner.session.flow.completionEyebrow', 'Completion / continue step')}
                        </span>
                        <h3>{t('learner.session.flow.completionTitle', 'Lesson wrap-up')}</h3>
                      </div>
                    </div>
                    <p>
                      {nextLesson
                        ? t(
                            'learner.session.flow.completionBodyNext',
                            'This lesson is complete. Continue to the next lesson when you are ready.',
                          )
                        : t(
                            'learner.session.flow.completionBodyFinal',
                            'This lesson is complete. Continue to the final completion stage of the training.',
                          )}
                    </p>
                    <div className={styles.completionMeta}>
                      <span className="badge badge-soft-blue">
                        {t('learner.session.flow.completionProgress', '{completed}/{total} lesson steps complete', {
                          completed: completedStepsCount,
                          total: lessonSteps.length - 1,
                        })}
                      </span>
                      <span className="badge badge-soft-teal">
                        {nextLesson
                          ? t('learner.session.flow.next.upcomingLesson', 'Next lesson: {title}', {
                              title: nextLesson.title,
                            })
                          : t('learner.session.flow.next.finalStage', 'Next stage: final completion')}
                      </span>
                    </div>
                  </section>
                )}

                </div>
              </>
            ) : (
              <div className={styles.emptyState}>{t('common.continue')}</div>
            )}
          </section>

          {showAdaptiveAlertSurface && pendingAdaptiveAlert ? (
            <AdaptiveAlertSurface
              alert={pendingAdaptiveAlert}
              choices={adaptiveChoices}
              onSelectChoice={adaptiveChoices.length ? handleAdaptiveChoiceSelection : undefined}
              onPrimaryAction={
                adaptiveChoices.length
                  ? undefined
                  : adaptiveSupportAvailable &&
                      pendingScenarioKey !== 'test_anxiety' &&
                      pendingScenarioKey !== 'no_face_low_confidence'
                    ? () => openSupportStep()
                    : undefined
              }
              onDismissed={dismissAdaptiveNoticeForCurrentStep}
            />
          ) : null}

          <footer className={styles.navigationBar}>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={goToPreviousStep}
              disabled={currentStepIndex === 0 && currentLessonIndex === 0}
            >
              <ArrowRight size={14} style={isRtl ? { transform: 'rotate(180deg)' } : undefined} />
              {t('common.previous')}
            </button>

            <div className={styles.navigationCenter}>
              <span>
                {currentStep
                  ? t('learner.session.flow.currentStepSummary', 'Step {current} of {total}', {
                      current: currentStepIndex + 1,
                      total: lessonSteps.length,
                    })
                  : t('layout.pageMeta.sessionTitle')}
              </span>
              <strong>{footerNoticeTitle}</strong>
              <p>{footerNoticeBody}</p>
            </div>

            <button
              className="btn btn-primary"
              type="button"
              onClick={handlePrimaryAction}
              disabled={!currentStep || !canMoveNext}
            >
              {primaryButtonLabel}
              <ArrowLeft size={14} style={isRtl ? { transform: 'rotate(180deg)' } : undefined} />
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}
