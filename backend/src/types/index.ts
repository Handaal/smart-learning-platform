import type {
  AdaptiveTriggerSource,
  CanonicalAdaptiveIntervention,
  CanonicalAdaptiveScenarioKey,
  CanonicalAdaptiveUiShape,
  CanonicalEmotionState,
} from '../policy/adaptive-alerts-policy';

export type AffectState = CanonicalEmotionState;
export type ResearchAffectState = CanonicalEmotionState;
export type InterventionType = CanonicalAdaptiveIntervention;

export type SessionFlowStep =
  | 'login_consent'
  | 'pretest'
  | 'personalization'
  | 'emotion_activation'
  | 'problem_scenario'
  | 'adaptive_learning'
  | 'posttest'
  | 'completion';

export interface AUVector {
  au1: number;
  au4: number;
  au6: number;
  au12: number;
  au20: number;
  au23: number;
  confidence: number;
}

export interface FacialSignalMetrics {
  faceDetected: boolean;
  faceVisibleRatio: number;
  headTurnScore: number;
  passiveExpressionScore: number;
  yawnScore: number;
}

export interface EmotionEventPayload {
  sessionId: string;
  learnerId?: string;
  episodeId?: string;
  contentId?: string;
  timestamp?: string;
  auVector: AUVector;
  facialSignals?: FacialSignalMetrics;
  classifiedState?: AffectState;
  classificationConfidence?: number;
}

export interface SensorSnapshot {
  au: AUVector | null;
  facialSignals: FacialSignalMetrics | null;
  fetchedAt: number;
}

export interface BehaviorWindowPayload {
  sessionId: string;
  learnerId: string;
  episodeId?: string;
  windowStartIso: string;
  windowEndIso: string;
  dwellTimeSec: number;
  scrollEvents: number;
  rereadCount: number;
  clickCount: number;
  clickRatePerMin: number;
  taskProgressPct: number;
  pageReturns: number;
  hintRequests: number;
  abandonmentAttempts: number;
  typingRateWpm?: number;
  backspaceRatio?: number;
  currentLessonId?: string;
  currentActivityId?: string;
  currentActivityType?: string;
  currentContentType?: string;
  currentTaskKey?: string;
  expectedTimeSec?: number;
  engagementScore?: number;
  missedInteractionWindow?: boolean;
}

export interface DmelloTransition {
  fromState: AffectState;
  toState: AffectState;
  probability: number;
  isNegative: boolean;
  windowSec: number;
}

export interface EngagementSnapshot {
  engagementLevel: 'low' | 'moderate' | 'high';
  interactionRate: number;
  inactivityMs: number;
  passiveExposureSec: number;
  score: number;
}

export interface LessonContextSnapshot {
  moduleId?: string;
  lessonId?: string;
  activityId?: string;
  activityType?: string;
  currentContentType?: string;
  currentTaskKey?: string;
  phase?: SessionFlowStep;
}

export interface PerformanceSnapshot {
  accuracyScore: number;
  repeatedErrors: number;
  failedAttempts: number;
  hesitationMs: number;
  performanceBand: 'low' | 'moderate' | 'high';
}

export interface ActiveInterventionState {
  currentIntervention?: InterventionType;
  startedAt?: string;
  cooldownUntil?: string;
  lastTriggerType?: string;
  lastScenarioKey?: CanonicalAdaptiveScenarioKey;
}

export interface RealtimeEmotionState {
  state: ResearchAffectState;
  persistedState?: AffectState;
  confidence: number;
  timestamp: string;
  facialSignals?: FacialSignalMetrics;
  faceDetected?: boolean;
  faceQualityScore?: number;
  qualityStatus?: 'trusted' | 'performance_only';
  stateDurationSec?: number;
  confidenceWindow?: number[];
  signalSnapshot?: {
    attentionScore: number;
    attentivePresenceScore: number;
    uncertaintyScore: number;
    strainScore: number;
    passiveScore: number;
  };
}

export interface RealtimeAdaptiveState {
  emotion?: RealtimeEmotionState;
  engagement?: EngagementSnapshot;
  context?: LessonContextSnapshot;
  performance?: PerformanceSnapshot;
  intervention?: ActiveInterventionState;
  fetchedAt: number;
}

export interface PedagogicalRationale {
  model: string;
  detectedState: ResearchAffectState;
  evidence: string[];
  intervention: InterventionType;
  pedagogicalBasis: string;
  expectedOutcome: string;
  competencyTarget?: string;
  matchedScenario?: CanonicalAdaptiveScenarioKey;
  dmelloTransition?: DmelloTransition;
}

export interface QualityOfResponse {
  responseTimeSec: number;
  maxExpectedTimeSec: number;
  timeScore: number;
  emotionalPositivity: number;
  accuracyScore: number;
  compositeQoR: number;
  weights: { w1: number; w2: number; w3: number };
  affectDuringResponse: AffectState;
}

export interface AffectiveFeedbackLoop {
  emotion: ResearchAffectState;
  engagement: EngagementSnapshot['engagementLevel'];
  learningTask: string;
  performance: PerformanceSnapshot['performanceBand'];
  recentAction: InterventionType;
  learnerState: string;
}

export interface AdaptiveScenarioDescriptor {
  id: CanonicalAdaptiveScenarioKey;
  label: string;
  trigger: ResearchAffectState;
  priority: 1 | 2 | 3;
  actionLabel: string;
  contentType: 'TEXT' | 'VISUAL' | 'VIDEO' | 'ASSESSMENT' | 'PROMPT';
  contextDescription: string;
}

export interface AdaptiveContext {
  sessionId: string;
  learnerId: string;
  participantId: string;
  cohort?: CohortType;
  emotionTrackingEnabled?: boolean;
  episodeId?: string;
  affectState: AffectState;
  emotionConfidence?: number;
  facialSignals?: FacialSignalMetrics;
  behaviorMetrics: BehaviorWindowPayload;
  scaffoldLevel: number;
  competencyScore: number;
  sessionMinutes: number;
  sensorSnapshot?: SensorSnapshot;
  realtimeState?: RealtimeAdaptiveState;
}

export interface AdaptiveEventLog {
  sessionId: string;
  learnerId: string;
  episodeId?: string;
  triggerType: string;
  triggerPriority: number;
  affectStatePre: AffectState;
  behaviorSnapshot: Record<string, unknown>;
  intervention: InterventionType;
  contentId?: string;
  scaffoldFrom?: number;
  scaffoldTo?: number;
  rationale?: PedagogicalRationale;
}

export interface AdaptiveDecision {
  scenarioKey: CanonicalAdaptiveScenarioKey;
  intervention: InterventionType;
  uiShape: CanonicalAdaptiveUiShape;
  triggerSource: AdaptiveTriggerSource;
  triggerReason: string;
  contentId?: string;
  scaffoldFrom?: number;
  scaffoldTo?: number;
  cooldownSeconds?: number;
  triggerType: string;
  triggerPriority: 1 | 2 | 3;
  matchedScenario?: CanonicalAdaptiveScenarioKey;
  detectedAffect: ResearchAffectState;
  emotionConfidence: number;
  learnerStateAfterAction: string;
  feedbackLoop: AffectiveFeedbackLoop;
  logPayload: AdaptiveEventLog;
  rationale: PedagogicalRationale;
  qualityOfResponse?: QualityOfResponse;
  fallbackModeActive?: boolean;
}

export interface CompetencyScores {
  c1?: number;
  c2?: number;
  c3?: number;
  c4?: number;
  c5?: number;
}

export type CompetencySource = 'assessment' | 'artifact' | 'simulation';
export type UserRole = 'learner' | 'research_admin';
export type CohortType = 'experimental' | 'control';
export type ContentTypeStr = 'TEXT' | 'VISUAL' | 'VIDEO' | 'ASSESSMENT';

export interface LearningContentPayload {
  id?: string;
  episodeId: string;
  contentType: ContentTypeStr;
  adaptiveTag?: string;
  contentData: unknown;
  scaffoldLevel: number;
  isEnrichment: boolean;
  sequenceOrder: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiSuccess<T = unknown> {
  data: T;
  message?: string;
}
