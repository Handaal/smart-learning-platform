import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { researchLedger } from './ResearchLedger';
import {
  ADAPTIVE_ALERTS_POLICY_VERSION,
  ADAPTIVE_ALERTS_THRESHOLDS,
  CANONICAL_ADAPTIVE_SCENARIOS,
  type CanonicalAdaptiveScenarioKey,
} from '../policy/adaptive-alerts-policy';
import type {
  ActiveInterventionState,
  AdaptiveContext,
  AdaptiveDecision,
  AdaptiveEventLog,
  AffectState,
  AffectiveFeedbackLoop,
  CohortType,
  InterventionType,
  PedagogicalRationale,
  PerformanceSnapshot,
  QualityOfResponse,
  RealtimeAdaptiveState,
  ResearchAffectState,
} from '../types';

const REDIS_PREFIX = 'step:doctoral';

const REDIS_KEYS = {
  emotion: (participantId: string) => `${REDIS_PREFIX}:emotion:${participantId}`,
  engagement: (sessionId: string) => `${REDIS_PREFIX}:engagement:${sessionId}`,
  context: (sessionId: string) => `${REDIS_PREFIX}:context:${sessionId}`,
  performance: (sessionId: string) => `${REDIS_PREFIX}:performance:${sessionId}`,
  intervention: (sessionId: string) => `${REDIS_PREFIX}:intervention:${sessionId}`,
};

const QOR_WEIGHTS = { w1: 0.3, w2: 0.3, w3: 0.4 };
const MOVING_WINDOW_SEC = ADAPTIVE_ALERTS_THRESHOLDS.decisionWindowSec;
const DECISION_TICK_SEC = ADAPTIVE_ALERTS_THRESHOLDS.decisionTickSec;
const PERFORMANCE_ONLY_THRESHOLD = ADAPTIVE_ALERTS_THRESHOLDS.lowFaceQualityThreshold;
const OPERATIONAL_CONFIDENCE_THRESHOLD = ADAPTIVE_ALERTS_THRESHOLDS.emotionConfidenceThreshold;
const DEFAULT_COOLDOWN_SEC = ADAPTIVE_ALERTS_THRESHOLDS.defaultCooldownSec;
const CONFUSION_MIN_SEC = 12;
const FRUSTRATION_MIN_SEC = 15;
const BOREDOM_MIN_SEC = 15;
const ANXIETY_MIN_SEC = 10;
const MASTERY_THRESHOLD = 0.8;

const CONFUSION_TASK_KEYS = ['wbs', 'risk_analysis', 'scope_analysis', 'scope_management'];
const FRUSTRATION_TASK_KEYS = [
  'schedule_management',
  'cost_management',
  'resource_allocation',
  'resource_management',
];

const AFFECT_POSITIVITY: Record<AffectState, number> = {
  high_engagement: 0.95,
  confusion: 0.32,
  frustration: 0.12,
  test_anxiety: 0.28,
  boredom_disengagement: 0.18,
  neutral: 0.6,
  no_face_low_confidence: 0.5,
};

type ScenarioMatch =
  | 'confusion'
  | 'frustration'
  | 'boredom_disengagement'
  | 'high_engagement'
  | 'test_anxiety'
  | 'neutral'
  | 'no_face_low_confidence';

type TemporalSnapshot = {
  affect: ResearchAffectState;
  meanConfidence: number;
  faceQualityScore: number;
  faceDetected: boolean;
  persistenceSec: number;
  qualityStatus: 'trusted' | 'performance_only';
  confidenceWindow: number[];
  signalEvidence: string[];
};

type LearningContextSnapshot = {
  taskKey: string | null;
  activityType: string;
  contentType: string;
  theoretical: boolean;
  assessment: boolean;
};

type ScenarioDescriptor = {
  id: ScenarioMatch;
  label: string;
  triggerType: string;
  intervention: InterventionType;
  uiShape: AdaptiveDecision['uiShape'];
  triggerSource: AdaptiveDecision['triggerSource'];
  triggerReason: string;
  triggerPriority: 1 | 2 | 3;
  scaffoldDelta?: -1 | 0 | 1;
  contentType?: 'TEXT' | 'VISUAL' | 'VIDEO' | 'ASSESSMENT' | 'PROMPT';
  cooldownSec?: number;
  pedagogicalBasis: string;
  expectedOutcome: string;
  learnerStateAfterAction: string;
};

const SCENARIOS: Record<ScenarioMatch, ScenarioDescriptor> = {
  confusion: {
    id: 'confusion',
    label: 'Confusion -> side panel guidance',
    triggerType: CANONICAL_ADAPTIVE_SCENARIOS.confusion.loggingEvent,
    intervention: 'scaffolded_hint',
    uiShape: CANONICAL_ADAPTIVE_SCENARIOS.confusion.uiShape,
    triggerSource: CANONICAL_ADAPTIVE_SCENARIOS.confusion.triggerSource,
    triggerReason: CANONICAL_ADAPTIVE_SCENARIOS.confusion.triggerReason,
    triggerPriority: 1,
    scaffoldDelta: 1,
    contentType: 'TEXT',
    cooldownSec: 75,
    pedagogicalBasis:
      'Cognitive confusion with repeated error should trigger a staged hint and a partially worked example to lower extraneous load.',
    expectedOutcome:
      'Reveal a scaffolded clarification path that helps the learner resume the current task with less ambiguity.',
    learnerStateAfterAction: 'hint-level-1-opened',
  },
  frustration: {
    id: 'frustration',
    label: 'Frustration -> task strip support',
    triggerType: CANONICAL_ADAPTIVE_SCENARIOS.frustration.loggingEvent,
    intervention: 'task_decomposition',
    uiShape: CANONICAL_ADAPTIVE_SCENARIOS.frustration.uiShape,
    triggerSource: CANONICAL_ADAPTIVE_SCENARIOS.frustration.triggerSource,
    triggerReason: CANONICAL_ADAPTIVE_SCENARIOS.frustration.triggerReason,
    triggerPriority: 1,
    scaffoldDelta: 1,
    contentType: 'TEXT',
    cooldownSec: 90,
    pedagogicalBasis:
      'Frustration with repeated failure indicates loss of control and excessive task pressure, so the task should be segmented into smaller steps with supportive wording.',
    expectedOutcome:
      'Reduce immediate pressure, restore perceived control, and keep the learner on the same instructional goal.',
    learnerStateAfterAction: 'task-segmentation-opened',
  },
  boredom_disengagement: {
    id: 'boredom_disengagement',
    label: 'Boredom/disengagement -> popup case switch',
    triggerType: CANONICAL_ADAPTIVE_SCENARIOS.boredom_disengagement.loggingEvent,
    intervention: 'interactive_case_switch',
    uiShape: CANONICAL_ADAPTIVE_SCENARIOS.boredom_disengagement.uiShape,
    triggerSource: CANONICAL_ADAPTIVE_SCENARIOS.boredom_disengagement.triggerSource,
    triggerReason: CANONICAL_ADAPTIVE_SCENARIOS.boredom_disengagement.triggerReason,
    triggerPriority: 2,
    contentType: 'ASSESSMENT',
    cooldownSec: 75,
    pedagogicalBasis:
      'Boredom/disengagement during theoretical content should shift presentation into a short interactive case or decision prompt to restore task value.',
    expectedOutcome:
      'Re-activate participation by moving from passive exposure to a short purposeful interaction.',
    learnerStateAfterAction: 'interactive-case-activated',
  },
  high_engagement: {
    id: 'high_engagement',
    label: 'High engagement -> advanced path',
    triggerType: CANONICAL_ADAPTIVE_SCENARIOS.high_engagement.loggingEvent,
    intervention: 'advanced_path',
    uiShape: CANONICAL_ADAPTIVE_SCENARIOS.high_engagement.uiShape,
    triggerSource: CANONICAL_ADAPTIVE_SCENARIOS.high_engagement.triggerSource,
    triggerReason: CANONICAL_ADAPTIVE_SCENARIOS.high_engagement.triggerReason,
    triggerPriority: 3,
    scaffoldDelta: -1,
    contentType: 'TEXT',
    cooldownSec: 75,
    pedagogicalBasis:
      'Stable mastery with strong engagement should unlock a deeper or more transferable challenge without disrupting the main path.',
    expectedOutcome:
      'Extend the learner into an advanced task while preserving the main lesson path as the default route.',
    learnerStateAfterAction: 'advanced-path-unlocked',
  },
  test_anxiety: {
    id: 'test_anxiety',
    label: 'Assessment anxiety -> neutral reassurance',
    triggerType: CANONICAL_ADAPTIVE_SCENARIOS.test_anxiety.loggingEvent,
    intervention: 'neutral_reassurance',
    uiShape: CANONICAL_ADAPTIVE_SCENARIOS.test_anxiety.uiShape,
    triggerSource: CANONICAL_ADAPTIVE_SCENARIOS.test_anxiety.triggerSource,
    triggerReason: CANONICAL_ADAPTIVE_SCENARIOS.test_anxiety.triggerReason,
    triggerPriority: 1,
    cooldownSec: 60,
    pedagogicalBasis:
      'Assessment anxiety should only trigger neutral procedural reassurance and instruction clarification, never answer guidance.',
    expectedOutcome:
      'Calm the learner, clarify the procedure, and keep the assessment valid without revealing the answer.',
    learnerStateAfterAction: 'assessment-reassurance-shown',
  },
  neutral: {
    id: 'neutral',
    label: 'Neutral -> standard path',
    triggerType: CANONICAL_ADAPTIVE_SCENARIOS.neutral.loggingEvent,
    intervention: 'do_nothing',
    uiShape: CANONICAL_ADAPTIVE_SCENARIOS.neutral.uiShape,
    triggerSource: CANONICAL_ADAPTIVE_SCENARIOS.neutral.triggerSource,
    triggerReason: CANONICAL_ADAPTIVE_SCENARIOS.neutral.triggerReason,
    triggerPriority: 3,
    pedagogicalBasis:
      'Neutral affect with acceptable performance does not justify an adaptive interruption.',
    expectedOutcome: 'Keep the learner on the standard lesson path without interruption.',
    learnerStateAfterAction: 'standard-path-continued',
  },
  no_face_low_confidence: {
    id: 'no_face_low_confidence',
    label: 'No face/low confidence -> operational safety protocol',
    triggerType: CANONICAL_ADAPTIVE_SCENARIOS.no_face_low_confidence.loggingEvent,
    intervention: 'operational_safety_protocol',
    uiShape: CANONICAL_ADAPTIVE_SCENARIOS.no_face_low_confidence.uiShape,
    triggerSource: CANONICAL_ADAPTIVE_SCENARIOS.no_face_low_confidence.triggerSource,
    triggerReason: CANONICAL_ADAPTIVE_SCENARIOS.no_face_low_confidence.triggerReason,
    triggerPriority: 2,
    cooldownSec: 90,
    pedagogicalBasis:
      'When the face is unavailable or the reading quality is too weak, the system must not guess. It falls back to performance-only logic and may show one optional camera-angle notice.',
    expectedOutcome:
      'Continue learning safely through performance-only interpretation, with at most one optional operational notice.',
    learnerStateAfterAction: 'performance-only-fallback',
  },
};

export class AdaptiveEngine {
  async decide(ctx: AdaptiveContext): Promise<AdaptiveDecision> {
    const learnerCohort = ctx.cohort ?? (await this.resolveLearnerCohort(ctx.learnerId));
    const realtimeState =
      ctx.realtimeState ?? (await this.fetchRealtimeState(ctx.sessionId, ctx.participantId));

    const temporal = this.buildTemporalSnapshot(realtimeState, ctx);
    const learningContext = this.getLearningContext(realtimeState, ctx);
    const performance = this.getPerformanceSnapshot(realtimeState, ctx);
    const engagement = this.getEngagementLevel(realtimeState, ctx);
    const feedbackLoop = this.buildFeedbackLoop(temporal.affect, realtimeState, ctx);

    const decision =
      learnerCohort === 'control'
        ? this.buildStaticDecision(
            {
              ...SCENARIOS.neutral,
              triggerType: 'control_standard_flow',
              triggerReason: 'control group uses standard feedback only',
              pedagogicalBasis:
                'Control-group learners remain on the standard non-adaptive path and do not receive facial-expression-based interventions.',
              expectedOutcome: 'Continue through the standard lesson flow without adaptive support.',
              learnerStateAfterAction: 'standard-control-flow',
            },
            ctx,
            realtimeState,
            temporal.affect,
            temporal.meanConfidence,
            feedbackLoop,
            this.gatherEvidence(ctx, realtimeState, temporal, learningContext, performance, engagement),
          )
        : await this.decideExperimentalPath(
            ctx,
            realtimeState,
            temporal,
            learningContext,
            performance,
            engagement,
            feedbackLoop,
          );

    if (learnerCohort !== 'control') {
      await this.persistDecision(ctx, realtimeState, decision, temporal, learningContext, performance, engagement);
    }

    if (learnerCohort !== 'control' && decision.intervention !== 'do_nothing') {
      const cooldownSeconds = decision.cooldownSeconds ?? DEFAULT_COOLDOWN_SEC;
      const cooldownUntil = new Date(Date.now() + cooldownSeconds * 1000).toISOString();
      await redis.set(
        REDIS_KEYS.intervention(ctx.sessionId),
        JSON.stringify({
          currentIntervention: decision.intervention,
          startedAt: new Date().toISOString(),
          cooldownUntil,
          lastTriggerType: decision.triggerType,
          lastScenarioKey: decision.scenarioKey,
        } satisfies ActiveInterventionState),
        'EX',
        60 * 60,
      );
    }

    return decision;
  }

  computeQualityOfResponse(
    responseTimeSec: number,
    maxExpectedTimeSec: number,
    affectDuringResponse: AffectState,
    accuracyScore: number,
    weights = QOR_WEIGHTS,
  ): QualityOfResponse {
    const timeScore = Math.max(0, Math.min(1, 1 - responseTimeSec / Math.max(maxExpectedTimeSec, 1)));
    const emotionalPositivity = AFFECT_POSITIVITY[affectDuringResponse] ?? 0.5;
    const clampedAccuracy = Math.max(0, Math.min(1, accuracyScore));

    const compositeQoR =
      weights.w1 * timeScore +
      weights.w2 * emotionalPositivity +
      weights.w3 * clampedAccuracy;

    return {
      responseTimeSec,
      maxExpectedTimeSec,
      timeScore: Math.round(timeScore * 1000) / 1000,
      emotionalPositivity: Math.round(emotionalPositivity * 1000) / 1000,
      accuracyScore: Math.round(clampedAccuracy * 1000) / 1000,
      compositeQoR: Math.round(compositeQoR * 1000) / 1000,
      weights: { ...weights },
      affectDuringResponse,
    };
  }

  async fetchRealtimeState(sessionId: string, participantId: string): Promise<RealtimeAdaptiveState> {
    const [emotionRaw, engagementRaw, contextRaw, performanceRaw, interventionRaw] = await Promise.all([
      redis.get(REDIS_KEYS.emotion(participantId)),
      redis.get(REDIS_KEYS.engagement(sessionId)),
      redis.get(REDIS_KEYS.context(sessionId)),
      redis.get(REDIS_KEYS.performance(sessionId)),
      redis.get(REDIS_KEYS.intervention(sessionId)),
    ]);

    return {
      emotion: this.safeParse(emotionRaw),
      engagement: this.safeParse(engagementRaw),
      context: this.safeParse(contextRaw),
      performance: this.safeParse(performanceRaw),
      intervention: this.safeParse(interventionRaw),
      fetchedAt: Date.now(),
    };
  }

  async resolveLearnerId(participantId: string): Promise<string | null> {
    try {
      const learner = await prisma.learner.findUnique({
        where: { participantId },
        select: { id: true },
      });
      return learner?.id ?? null;
    } catch (error) {
      logger.error('AdaptiveEngine: failed to resolve participantId', error);
      return null;
    }
  }

  private async resolveLearnerCohort(learnerId: string): Promise<CohortType | null> {
    try {
      const learner = await prisma.learner.findUnique({
        where: { id: learnerId },
        select: { cohort: true },
      });
      return (learner?.cohort as CohortType | undefined) ?? null;
    } catch (error) {
      logger.error('AdaptiveEngine: failed to resolve learner cohort', error);
      return null;
    }
  }

  private async decideExperimentalPath(
    ctx: AdaptiveContext,
    realtime: RealtimeAdaptiveState,
    temporal: TemporalSnapshot,
    learningContext: LearningContextSnapshot,
    performance: PerformanceSnapshot,
    engagement: NonNullable<RealtimeAdaptiveState['engagement']>,
    feedbackLoop: AffectiveFeedbackLoop,
  ): Promise<AdaptiveDecision> {
    const evidence = this.gatherEvidence(
      ctx,
      realtime,
      temporal,
      learningContext,
      performance,
      engagement,
    );

    if (
      temporal.affect === 'no_face_low_confidence' ||
      !temporal.faceDetected ||
      temporal.faceQualityScore < PERFORMANCE_ONLY_THRESHOLD ||
      temporal.meanConfidence < PERFORMANCE_ONLY_THRESHOLD
    ) {
      const faceLostNoticeAllowed = !this.isCooldownActive(realtime);
      return this.buildStaticDecision(
        {
          ...SCENARIOS.no_face_low_confidence,
          intervention: faceLostNoticeAllowed ? 'operational_safety_protocol' : 'do_nothing',
        },
        ctx,
        realtime,
        'no_face_low_confidence',
        temporal.meanConfidence,
        feedbackLoop,
        evidence,
      );
    }

    if (temporal.meanConfidence < OPERATIONAL_CONFIDENCE_THRESHOLD) {
      return this.buildStaticDecision(
        {
          ...SCENARIOS.neutral,
          triggerType: 'low_confidence_monitor_only',
          triggerReason: 'confidence below 0.70 so emotion-based adaptation remains disabled',
          pedagogicalBasis:
            'Confidence below the canonical emotional threshold is not strong enough to justify an adaptive alert.',
          expectedOutcome: 'Keep monitoring conservatively without guessing or interrupting the learner.',
          learnerStateAfterAction: 'monitoring-continued',
        },
        ctx,
        realtime,
        temporal.affect,
        temporal.meanConfidence,
        feedbackLoop,
        evidence,
      );
    }

    if (this.isCooldownActive(realtime)) {
      return this.buildStaticDecision(
        {
          ...SCENARIOS.neutral,
          triggerType: 'cooldown_skip',
          triggerReason: 'adaptive cooldown still active',
          pedagogicalBasis:
            'A recent intervention is still active, so the engine defers another adaptive interruption to avoid annoying the learner.',
          expectedOutcome: 'Observe silently until the cooldown period expires.',
          learnerStateAfterAction: 'cooldown-observed',
        },
        ctx,
        realtime,
        temporal.affect,
        temporal.meanConfidence,
        feedbackLoop,
        evidence,
      );
    }

    const scenario = this.matchScenario(temporal, learningContext, performance, engagement);
    if (scenario) {
      return this.buildScenarioDecision(
        scenario,
        ctx,
        realtime,
        temporal.affect,
        temporal.meanConfidence,
        feedbackLoop,
        evidence,
      );
    }

    return this.buildStaticDecision(
      {
        ...SCENARIOS.neutral,
        triggerType: 'neutral_monitor_only',
        triggerReason: 'conditions incomplete for a trustworthy adaptive alert',
        pedagogicalBasis:
          'The current evidence does not yet justify an adaptive interruption, so the learner remains on the standard path.',
        expectedOutcome: 'Continue the lesson without a new alert until stronger evidence appears.',
        learnerStateAfterAction: 'monitoring-continued',
      },
      ctx,
      realtime,
      temporal.affect,
      temporal.meanConfidence,
      feedbackLoop,
      evidence,
    );
  }

  private buildTemporalSnapshot(
    realtime: RealtimeAdaptiveState,
    ctx: AdaptiveContext,
  ): TemporalSnapshot {
    const affect = this.normalizeAffectState(
      realtime.emotion?.state ?? ctx.affectState,
      ctx.facialSignals ?? realtime.emotion?.facialSignals,
    );
    const confidenceWindow =
      realtime.emotion?.confidenceWindow && realtime.emotion.confidenceWindow.length
        ? realtime.emotion.confidenceWindow
        : [realtime.emotion?.confidence ?? ctx.emotionConfidence ?? ctx.sensorSnapshot?.au?.confidence ?? 0];
    const meanConfidence =
      confidenceWindow.reduce((sum, value) => sum + value, 0) / Math.max(confidenceWindow.length, 1);
    const faceDetected =
      realtime.emotion?.faceDetected ??
      realtime.emotion?.facialSignals?.faceDetected ??
      ctx.facialSignals?.faceDetected ??
      false;
    const faceQualityScore =
      realtime.emotion?.faceQualityScore ?? this.estimateFaceQuality(ctx.facialSignals ?? realtime.emotion?.facialSignals);
    const persistenceSec = realtime.emotion?.stateDurationSec ?? 0;
    const qualityStatus =
      realtime.emotion?.qualityStatus ??
      (!faceDetected || faceQualityScore < PERFORMANCE_ONLY_THRESHOLD || meanConfidence < PERFORMANCE_ONLY_THRESHOLD
        ? 'performance_only'
        : meanConfidence < OPERATIONAL_CONFIDENCE_THRESHOLD
          ? 'performance_only'
          : 'trusted');

    const signalEvidence = [
      `window=${MOVING_WINDOW_SEC}s`,
      `tick=${DECISION_TICK_SEC}s`,
      `persistence=${persistenceSec.toFixed(1)}s`,
      `faceQuality=${faceQualityScore.toFixed(2)}`,
      `meanConfidence=${meanConfidence.toFixed(2)}`,
      `qualityStatus=${qualityStatus}`,
    ];

    return {
      affect,
      meanConfidence,
      faceQualityScore,
      faceDetected,
      persistenceSec,
      qualityStatus,
      confidenceWindow,
      signalEvidence,
    };
  }

  private getLearningContext(
    realtime: RealtimeAdaptiveState,
    ctx: AdaptiveContext,
  ): LearningContextSnapshot {
    const taskKey = this.normalizeTaskKey(
      realtime.context?.currentTaskKey ?? ctx.behaviorMetrics.currentTaskKey ?? null,
    );
    const activityType =
      (realtime.context?.activityType ?? ctx.behaviorMetrics.currentActivityType ?? '').toLowerCase() ||
      'scenario_task';
    const contentType =
      (realtime.context?.currentContentType ?? ctx.behaviorMetrics.currentContentType ?? '').toLowerCase() ||
      'interactive_scenario';
    const theoretical = ['text', 'video', 'visual', 'document', 'theoretical', 'pdf'].includes(contentType);
    const assessment = ['assessment', 'quiz', 'pre_test', 'post_test', 'pretest', 'posttest'].includes(activityType) ||
      ['assessment', 'quiz'].includes(contentType);

    return {
      taskKey,
      activityType,
      contentType,
      theoretical,
      assessment,
    };
  }

  private matchScenario(
    temporal: TemporalSnapshot,
    learningContext: LearningContextSnapshot,
    performance: PerformanceSnapshot,
    engagement: NonNullable<RealtimeAdaptiveState['engagement']>,
  ): ScenarioDescriptor | null {
    const errorCount = Math.max(performance.repeatedErrors, performance.failedAttempts);
    const inactivityHigh = engagement.inactivityMs >= 45000 || engagement.passiveExposureSec >= 45;
    const performanceAcceptable =
      performance.accuracyScore >= 0.55 &&
      performance.performanceBand !== 'low' &&
      errorCount < 2;

    if (
      learningContext.assessment &&
      temporal.affect === 'test_anxiety' &&
      temporal.persistenceSec >= ANXIETY_MIN_SEC &&
      performance.hesitationMs >= 10000
    ) {
      return SCENARIOS.test_anxiety;
    }

    if (
      temporal.affect === 'confusion' &&
      temporal.persistenceSec >= CONFUSION_MIN_SEC &&
      this.matchesTaskKey(learningContext.taskKey, CONFUSION_TASK_KEYS) &&
      errorCount >= 2
    ) {
      return SCENARIOS.confusion;
    }

    if (
      temporal.affect === 'frustration' &&
      temporal.persistenceSec >= FRUSTRATION_MIN_SEC &&
      this.matchesTaskKey(learningContext.taskKey, FRUSTRATION_TASK_KEYS) &&
      (errorCount >= 3 || performance.failedAttempts >= 2)
    ) {
      return SCENARIOS.frustration;
    }

    if (
      temporal.affect === 'boredom_disengagement' &&
      temporal.persistenceSec >= BOREDOM_MIN_SEC &&
      learningContext.theoretical &&
      inactivityHigh
    ) {
      return SCENARIOS.boredom_disengagement;
    }

    if (
      temporal.affect === 'high_engagement' &&
      performance.accuracyScore >= MASTERY_THRESHOLD &&
      performance.performanceBand === 'high' &&
      engagement.engagementLevel !== 'low'
    ) {
      return SCENARIOS.high_engagement;
    }

    if (temporal.affect === 'neutral' && performanceAcceptable) {
      return SCENARIOS.neutral;
    }

    return null;
  }

  private async buildScenarioDecision(
    scenario: ScenarioDescriptor,
    ctx: AdaptiveContext,
    realtime: RealtimeAdaptiveState,
    affect: ResearchAffectState,
    emotionConfidence: number,
    feedbackLoop: AffectiveFeedbackLoop,
    evidence: string[],
  ): Promise<AdaptiveDecision> {
    const scaffoldFrom = ctx.scaffoldLevel;
    const scaffoldTo =
      typeof scenario.scaffoldDelta === 'number'
        ? Math.max(1, Math.min(4, scaffoldFrom + scenario.scaffoldDelta))
        : scaffoldFrom;

    const contentId =
      scenario.contentType && scenario.contentType !== 'PROMPT'
        ? await this.resolveDbContent(ctx.episodeId, affect, scenario.contentType, scaffoldTo)
        : undefined;

    const rationale: PedagogicalRationale = {
      model: `adaptive-alerts-policy-${ADAPTIVE_ALERTS_POLICY_VERSION}`,
      detectedState: affect,
      evidence,
      intervention: scenario.intervention,
      pedagogicalBasis: scenario.pedagogicalBasis,
      expectedOutcome: scenario.expectedOutcome,
      competencyTarget: this.inferCompetencyTarget(ctx.episodeId),
      matchedScenario: scenario.id as CanonicalAdaptiveScenarioKey,
    };

    return {
      scenarioKey: scenario.id as CanonicalAdaptiveScenarioKey,
      intervention: scenario.intervention,
      uiShape: scenario.uiShape,
      triggerSource: scenario.triggerSource,
      triggerReason: scenario.triggerReason,
      contentId,
      scaffoldFrom,
      scaffoldTo,
      cooldownSeconds: scenario.cooldownSec ?? DEFAULT_COOLDOWN_SEC,
      triggerType: scenario.triggerType,
      triggerPriority: scenario.triggerPriority,
      matchedScenario: scenario.id as CanonicalAdaptiveScenarioKey,
      detectedAffect: affect,
      emotionConfidence,
      learnerStateAfterAction: scenario.learnerStateAfterAction,
      feedbackLoop,
      logPayload: {
        sessionId: ctx.sessionId,
        learnerId: ctx.learnerId,
        episodeId: ctx.episodeId,
        triggerType: scenario.triggerType,
        triggerPriority: scenario.triggerPriority,
        affectStatePre: this.persistedAffectState(affect),
        behaviorSnapshot: {},
        intervention: scenario.intervention,
        contentId,
        scaffoldFrom,
        scaffoldTo,
        rationale,
      },
      rationale,
      fallbackModeActive: scenario.id === 'no_face_low_confidence',
    };
  }

  private buildStaticDecision(
    scenario: ScenarioDescriptor,
    ctx: AdaptiveContext,
    realtime: RealtimeAdaptiveState,
    affect: ResearchAffectState,
    emotionConfidence: number,
    feedbackLoop: AffectiveFeedbackLoop,
    evidence: string[],
  ): AdaptiveDecision {
    const rationale: PedagogicalRationale = {
      model: `adaptive-alerts-policy-${ADAPTIVE_ALERTS_POLICY_VERSION}`,
      detectedState: affect,
      evidence,
      intervention: scenario.intervention,
      pedagogicalBasis: scenario.pedagogicalBasis,
      expectedOutcome: scenario.expectedOutcome,
      competencyTarget: this.inferCompetencyTarget(ctx.episodeId),
      matchedScenario: scenario.id as CanonicalAdaptiveScenarioKey,
    };

    return {
      scenarioKey: scenario.id as CanonicalAdaptiveScenarioKey,
      intervention: scenario.intervention,
      uiShape: scenario.uiShape,
      triggerSource: scenario.triggerSource,
      triggerReason: scenario.triggerReason,
      contentId: undefined,
      cooldownSeconds: scenario.cooldownSec,
      triggerType: scenario.triggerType,
      triggerPriority: scenario.triggerPriority,
      matchedScenario: scenario.id as CanonicalAdaptiveScenarioKey,
      detectedAffect: affect,
      emotionConfidence,
      learnerStateAfterAction: scenario.learnerStateAfterAction,
      feedbackLoop,
      logPayload: {
        sessionId: ctx.sessionId,
        learnerId: ctx.learnerId,
        episodeId: ctx.episodeId,
        triggerType: scenario.triggerType,
        triggerPriority: scenario.triggerPriority,
        affectStatePre: this.persistedAffectState(affect),
        behaviorSnapshot: {},
        intervention: scenario.intervention,
        rationale,
      },
      rationale,
      fallbackModeActive: scenario.id === 'no_face_low_confidence',
    };
  }

  private getEngagementLevel(
    realtime: RealtimeAdaptiveState,
    ctx: AdaptiveContext,
  ): NonNullable<RealtimeAdaptiveState['engagement']> {
    const score =
      realtime.engagement?.score ??
      ctx.behaviorMetrics.engagementScore ??
      Math.max(0, Math.min(100, ctx.behaviorMetrics.clickRatePerMin * 10));
    const level: NonNullable<RealtimeAdaptiveState['engagement']>['engagementLevel'] =
      score >= 70 ? 'high' : score >= 40 ? 'moderate' : 'low';

    return {
      engagementLevel: level,
      interactionRate: realtime.engagement?.interactionRate ?? ctx.behaviorMetrics.clickRatePerMin,
      inactivityMs: realtime.engagement?.inactivityMs ?? ctx.behaviorMetrics.dwellTimeSec * 1000,
      passiveExposureSec:
        realtime.engagement?.passiveExposureSec ?? Math.max(ctx.behaviorMetrics.dwellTimeSec - 15, 0),
      score,
    };
  }

  private getPerformanceSnapshot(realtime: RealtimeAdaptiveState, ctx: AdaptiveContext): PerformanceSnapshot {
    if (realtime.performance) return realtime.performance;

    const accuracyScore = Math.max(0, Math.min(1, ctx.competencyScore));
    const failedAttempts = ctx.behaviorMetrics.abandonmentAttempts;
    const repeatedErrors = Math.max(ctx.behaviorMetrics.rereadCount, 0);
    const hesitationMs = Math.round(ctx.behaviorMetrics.dwellTimeSec * 1000);

    return {
      accuracyScore,
      failedAttempts,
      repeatedErrors,
      hesitationMs,
      performanceBand:
        accuracyScore >= 0.75 ? 'high' : accuracyScore >= 0.45 ? 'moderate' : 'low',
    };
  }

  private buildFeedbackLoop(
    affect: ResearchAffectState,
    realtime: RealtimeAdaptiveState,
    ctx: AdaptiveContext,
  ): AffectiveFeedbackLoop {
    const engagement = this.getEngagementLevel(realtime, ctx);
    const performance = this.getPerformanceSnapshot(realtime, ctx);

    return {
      emotion: affect,
      engagement: engagement.engagementLevel,
      learningTask:
        realtime.context?.currentTaskKey ??
        realtime.context?.activityType ??
        realtime.context?.currentContentType ??
        ctx.behaviorMetrics.currentTaskKey ??
        ctx.behaviorMetrics.currentContentType ??
        'adaptive_learning_activity',
      performance: performance.performanceBand,
      recentAction: realtime.intervention?.currentIntervention ?? 'do_nothing',
      learnerState: `${affect.toLowerCase()}_${engagement.engagementLevel}_${performance.performanceBand}`,
    };
  }

  private gatherEvidence(
    ctx: AdaptiveContext,
    realtime: RealtimeAdaptiveState,
    temporal: TemporalSnapshot,
    learningContext: LearningContextSnapshot,
    performance: PerformanceSnapshot,
    engagement: NonNullable<RealtimeAdaptiveState['engagement']>,
  ): string[] {
    const evidence = [
      ...temporal.signalEvidence,
      `affect=${temporal.affect}`,
      `taskKey=${learningContext.taskKey ?? 'none'}`,
      `activityType=${learningContext.activityType}`,
      `contentType=${learningContext.contentType}`,
      `engagement=${engagement.engagementLevel}`,
      `accuracy=${performance.accuracyScore.toFixed(2)}`,
      `errors=${Math.max(performance.repeatedErrors, performance.failedAttempts)}`,
      `hesitationMs=${performance.hesitationMs}`,
    ];

    if (ctx.behaviorMetrics.hintRequests > 0) evidence.push(`hintRequests=${ctx.behaviorMetrics.hintRequests}`);
    if (ctx.behaviorMetrics.abandonmentAttempts > 0) {
      evidence.push(`abandonmentAttempts=${ctx.behaviorMetrics.abandonmentAttempts}`);
    }
    if (ctx.behaviorMetrics.expectedTimeSec) evidence.push(`expectedTimeSec=${ctx.behaviorMetrics.expectedTimeSec}`);
    if (realtime.intervention?.cooldownUntil) evidence.push(`cooldownUntil=${realtime.intervention.cooldownUntil}`);

    return evidence;
  }

  private normalizeAffectState(
    rawState: ResearchAffectState | AffectState,
    facialSignals?: AdaptiveContext['facialSignals'],
  ): ResearchAffectState {
    if (
      facialSignals &&
      (!facialSignals.faceDetected ||
        facialSignals.faceVisibleRatio < 0.02 ||
        facialSignals.headTurnScore > 0.7)
    ) {
      return 'no_face_low_confidence';
    }

    return rawState;
  }

  private estimateFaceQuality(facialSignals?: AdaptiveContext['facialSignals']) {
    if (!facialSignals?.faceDetected) return 0;

    return Math.max(
      0,
      Math.min(
        1,
        Math.max(0, Math.min(facialSignals.faceVisibleRatio / 0.18, 1)) * 0.45 +
          (1 - facialSignals.headTurnScore) * 0.35 +
          (1 - facialSignals.passiveExpressionScore) * 0.2,
      ),
    );
  }

  private normalizeTaskKey(value: string | null | undefined) {
    if (!value) return null;
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private matchesTaskKey(taskKey: string | null, allowed: string[]) {
    if (!taskKey) return false;
    return allowed.some((entry) => taskKey.includes(entry));
  }

  private isCooldownActive(realtime: RealtimeAdaptiveState) {
    const cooldownUntil = realtime.intervention?.cooldownUntil;
    if (!cooldownUntil) return false;
    const parsed = Date.parse(cooldownUntil);
    return Number.isFinite(parsed) && parsed > Date.now();
  }

  private persistedAffectState(affect: ResearchAffectState): AffectState {
    return affect;
  }

  private async resolveDbContent(
    episodeId: string | undefined,
    affect: ResearchAffectState,
    contentType: 'TEXT' | 'VISUAL' | 'VIDEO' | 'ASSESSMENT',
    scaffoldLevel: number,
  ): Promise<string | undefined> {
    if (!episodeId) return `${contentType}-GENERIC`;
    if (affect === 'no_face_low_confidence') return undefined;

    try {
      const adaptiveTag = affect === 'neutral' ? null : this.persistedAffectState(affect);

      const content = await prisma.learningContent.findFirst({
        where: {
          episodeId,
          contentType,
          scaffoldLevel,
          OR: adaptiveTag ? [{ adaptiveTag: adaptiveTag as any }, { adaptiveTag: null }] : [{ adaptiveTag: null }],
        },
        orderBy: { sequenceOrder: 'asc' },
      });

      return content?.id ?? `${contentType}-GENERIC`;
    } catch (error) {
      logger.warn('AdaptiveEngine: failed to resolve adaptive content, using generic fallback', error);
      return `${contentType}-GENERIC`;
    }
  }

  private inferCompetencyTarget(episodeId?: string): string | undefined {
    if (!episodeId) return undefined;
    const moduleNumber = episodeId.replace(/[^0-9]/g, '').slice(0, 1);
    return moduleNumber ? `C${moduleNumber}` : undefined;
  }

  private async persistDecision(
    ctx: AdaptiveContext,
    realtime: RealtimeAdaptiveState,
    decision: AdaptiveDecision,
    temporal: TemporalSnapshot,
    learningContext: LearningContextSnapshot,
    performance: PerformanceSnapshot,
    engagement: NonNullable<RealtimeAdaptiveState['engagement']>,
  ): Promise<void> {
    const behaviorSnapshot: Record<string, unknown> = {
      ...ctx.behaviorMetrics,
      detectedEmotion: decision.detectedAffect,
      emotionConfidence: decision.emotionConfidence,
      matchedScenario: decision.matchedScenario ?? 'neutral',
      faceQualityScore: temporal.faceQualityScore,
      faceDetected: temporal.faceDetected,
      temporalWindowSec: MOVING_WINDOW_SEC,
      decisionTickSec: DECISION_TICK_SEC,
      persistenceSec: temporal.persistenceSec,
      qualityStatus: temporal.qualityStatus,
      context: realtime.context ?? null,
      learningContext,
      engagement,
      performance,
      activeIntervention: realtime.intervention ?? null,
      chosenAdaptiveAction: decision.intervention,
      learnerStateAfterAction: decision.learnerStateAfterAction,
      affectiveFeedbackLoop: decision.feedbackLoop,
      rationale: decision.rationale,
    };

    try {
      await prisma.adaptiveEvent.create({
        data: {
          sessionId: ctx.sessionId,
          learnerId: ctx.learnerId,
          episodeId: ctx.episodeId,
          triggerType: decision.triggerType,
          triggerPriority: decision.triggerPriority,
          affectStatePre: this.persistedAffectState(decision.detectedAffect) as any,
          behaviorSnapshot: behaviorSnapshot as any,
          intervention: decision.intervention as any,
          contentId: decision.contentId,
          scaffoldFrom: decision.scaffoldFrom,
          scaffoldTo: decision.scaffoldTo,
        },
      });

      logger.info(
        `AdaptiveEngine: ${decision.triggerType} -> ${decision.intervention} for ${ctx.participantId} (${decision.detectedAffect})`,
      );

      await researchLedger.logAdaptiveDecision({
        ctx,
        realtime,
        decision,
        engagement,
        performance,
      });
    } catch (error) {
      logger.error('AdaptiveEngine: failed to persist adaptive decision', error);
    }
  }

  private safeParse<T>(raw: string | null): T | undefined {
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }
}
