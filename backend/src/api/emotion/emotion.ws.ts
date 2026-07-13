import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { getAllowedOrigins } from '../../lib/cors';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { AdaptiveEngine } from '../../services/AdaptiveEngine';
import { AffectClassifier } from '../../services/AffectClassifier';
import { maybeBuildEmotionSuggestion } from '../../services/EmotionSuggestionService';
import { resolveLearnerAccessSnapshot } from '../../services/learnerAccess';
import { EMOTION_CONFIDENCE_THRESHOLD } from '../../policy/adaptive-alerts-policy';
import { logger } from '../../lib/logger';
import type {
  AUVector,
  BehaviorWindowPayload,
  EmotionEventPayload,
  FacialSignalMetrics,
  ResearchAffectState,
} from '../../types';

const engine = new AdaptiveEngine();
const classifier = new AffectClassifier();
const REDIS_PREFIX = 'step:doctoral';

const REDIS_KEYS = {
  emotion: (participantId: string) => `${REDIS_PREFIX}:emotion:${participantId}`,
  engagement: (sessionId: string) => `${REDIS_PREFIX}:engagement:${sessionId}`,
  context: (sessionId: string) => `${REDIS_PREFIX}:context:${sessionId}`,
  performance: (sessionId: string) => `${REDIS_PREFIX}:performance:${sessionId}`,
};

const SESSION_WINDOW_SIZE = 9;
const FACE_LOST_HEADTURN_THRESHOLD = 0.62;
const FACE_LOST_FACE_RATIO_THRESHOLD = 0.02;
const ATTENTIVE_HEADTURN_THRESHOLD = 0.48;
const ATTENTIVE_FACE_RATIO_THRESHOLD = 0.028;
const NO_FACE_STREAK_FOR_FACE_LOST = 6;
const OFFSCREEN_STREAK_FOR_FACE_LOST = 6;
const ATTENTIVE_STREAK_FOR_FOCUS = 6;
const FOCUS_ATTENTION_SCORE_THRESHOLD = 0.68;
const PERFORMANCE_ONLY_QUALITY_THRESHOLD = 0.55;
const MONITOR_ONLY_CONFIDENCE_THRESHOLD = EMOTION_CONFIDENCE_THRESHOLD;

interface SessionAffectTracker {
  lastFinalState: ResearchAffectState;
  stateStartedAtMs: number;
  noFaceStreak: number;
  offScreenStreak: number;
  attentiveStreak: number;
  transitionCount: number;
  recentCandidates: Array<{ state: ResearchAffectState; confidence: number; timestampMs: number }>;
  confidenceWindow: number[];
}

interface DerivedAffectResult {
  state: ResearchAffectState;
  rawState: ResearchAffectState;
  candidateState: ResearchAffectState;
  reason: string;
  faceQualityScore: number;
  qualityStatus: 'trusted' | 'performance_only';
  noFaceStreak: number;
  offScreenStreak: number;
  attentiveStreak: number;
  stateDurationSec: number;
  smoothingWindow: ResearchAffectState[];
  transitionCount: number;
  confidenceWindow: number[];
  smoothingHold: boolean;
  signalSnapshot: {
    attentionScore: number;
    attentivePresenceScore: number;
    uncertaintyScore: number;
    strainScore: number;
    passiveScore: number;
  };
}

const sessionAffectTrackers = new Map<string, SessionAffectTracker>();
const validatedEpisodeIds = new Map<string, string | null>();

function getSessionAffectTracker(sessionId: string): SessionAffectTracker {
  const existing = sessionAffectTrackers.get(sessionId);
  if (existing) return existing;

  const fresh: SessionAffectTracker = {
    lastFinalState: 'neutral',
    stateStartedAtMs: Date.now(),
    noFaceStreak: 0,
    offScreenStreak: 0,
    attentiveStreak: 0,
    transitionCount: 0,
    recentCandidates: [],
    confidenceWindow: [],
  };
  sessionAffectTrackers.set(sessionId, fresh);
  return fresh;
}

// States that represent a recovered/positive learner condition. If affect lands
// here in the window after an intervention, we count the intervention effective.
const RECOVERED_AFFECT_STATES: ResearchAffectState[] = ['high_engagement', 'neutral'];
const EFFECTIVENESS_WINDOW_MS = 5 * 60 * 1000;

/**
 * Score the most recent unresolved intervention for a session against the affect
 * observed in the following window, and persist wasEffective + affectStatePost.
 * No-ops when the latest event is already resolved, too old, or on a low-signal
 * frame (no_face) where attribution would be meaningless.
 */
async function evaluatePendingAdaptiveEffectiveness(
  sessionId: string,
  currentState: ResearchAffectState,
): Promise<void> {
  if (!currentState || currentState === 'no_face_low_confidence') return;
  try {
    const latest = await prisma.adaptiveEvent.findFirst({
      where: { sessionId, wasEffective: null, affectStatePost: null },
      orderBy: { occurredAt: 'desc' },
      select: { id: true, occurredAt: true },
    });
    if (!latest) return;
    if (Date.now() - latest.occurredAt.getTime() > EFFECTIVENESS_WINDOW_MS) return;

    await prisma.adaptiveEvent.update({
      where: { id: latest.id },
      data: {
        affectStatePost: currentState as any,
        wasEffective: RECOVERED_AFFECT_STATES.includes(currentState),
      },
    });
  } catch (error) {
    logger.error('evaluatePendingAdaptiveEffectiveness failed', error);
  }
}

function mapClassifierToResearchState(classifiedState: string): ResearchAffectState {
  if (classifiedState === 'high_engagement') return 'high_engagement';
  if (classifiedState === 'test_anxiety') return 'test_anxiety';
  if (classifiedState === 'confusion') return 'confusion';
  if (classifiedState === 'frustration') return 'frustration';
  if (classifiedState === 'boredom_disengagement') return 'boredom_disengagement';
  if (classifiedState === 'neutral') return 'neutral';
  return 'no_face_low_confidence';
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function buildSignalSnapshot(auVector?: AUVector, facialSignals?: FacialSignalMetrics) {
  const faceDetected = facialSignals?.faceDetected ?? false;
  const faceVisibleRatio = facialSignals?.faceVisibleRatio ?? 0;
  const headTurnScore = facialSignals?.headTurnScore ?? 1;
  const passiveScore = clamp01(facialSignals?.passiveExpressionScore ?? 0.5);

  const au1 = auVector?.au1 ?? 0;
  const au4 = auVector?.au4 ?? 0;
  const au20 = auVector?.au20 ?? 0;
  const au23 = auVector?.au23 ?? 0;

  const uncertaintyScore = clamp01(au1 * 0.5 + au20 * 0.25 + au4 * 0.25);
  const strainScore = clamp01(au23 * 0.48 + au20 * 0.3 + au4 * 0.22);
  const attentionScore = faceDetected
    ? clamp01(
        (1 - headTurnScore) * 0.5 +
          clamp01(faceVisibleRatio / 0.2) * 0.38 +
          (1 - passiveScore) * 0.12,
      )
    : 0;

  return {
    faceDetected,
    faceVisibleRatio,
    headTurnScore,
    passiveScore,
    uncertaintyScore,
    strainScore,
    attentionScore,
  };
}

function calculateFaceQualityScore(signal: ReturnType<typeof buildSignalSnapshot>) {
  if (!signal.faceDetected) return 0;

  return clamp01(
    Math.max(0, Math.min(signal.faceVisibleRatio / 0.18, 1)) * 0.45 +
      (1 - signal.headTurnScore) * 0.35 +
      (1 - signal.passiveScore) * 0.2,
  );
}

function deriveResearchAffectState(
  sessionId: string,
  classifiedState: string,
  classifierConfidence: number,
  auVector?: AUVector,
  facialSignals?: FacialSignalMetrics,
): DerivedAffectResult {
  const tracker = getSessionAffectTracker(sessionId);
  const rawState = mapClassifierToResearchState(classifiedState);
  const now = Date.now();

  const signal = buildSignalSnapshot(auVector, facialSignals);
  const faceDetected = signal.faceDetected;
  const faceVisibleRatio = signal.faceVisibleRatio;
  const headTurnScore = signal.headTurnScore;
  const passiveScore = signal.passiveScore;
  const uncertaintyScore = signal.uncertaintyScore;
  const strainScore = signal.strainScore;
  const attentionScore = signal.attentionScore;
  const attentivePresenceScore = clamp01(
    attentionScore * 0.82 + Math.max(classifierConfidence, 0.35) * 0.18,
  );
  const faceQualityScore = calculateFaceQualityScore(signal);

  const strongNoFaceEvidence =
    !faceDetected || (faceVisibleRatio < FACE_LOST_FACE_RATIO_THRESHOLD && classifierConfidence < 0.55);
  const strongOffScreenEvidence =
    faceDetected &&
    (headTurnScore > FACE_LOST_HEADTURN_THRESHOLD ||
      (headTurnScore > 0.52 && faceVisibleRatio < 0.03 && attentionScore < 0.42) ||
      (faceVisibleRatio < FACE_LOST_FACE_RATIO_THRESHOLD &&
        attentionScore < 0.35 &&
        classifierConfidence < 0.5));
  const attentiveEvidence =
    faceDetected &&
    faceVisibleRatio >= ATTENTIVE_FACE_RATIO_THRESHOLD &&
    headTurnScore <= ATTENTIVE_HEADTURN_THRESHOLD &&
    attentivePresenceScore >= 0.56;

  tracker.noFaceStreak = strongNoFaceEvidence ? tracker.noFaceStreak + 1 : 0;
  tracker.offScreenStreak = strongOffScreenEvidence ? tracker.offScreenStreak + 1 : 0;
  tracker.attentiveStreak = attentiveEvidence
    ? Math.min(tracker.attentiveStreak + 1, 24)
    : Math.max(tracker.attentiveStreak - 1, 0);

  let candidateState: ResearchAffectState = rawState;
  let reason = `classifier:${classifiedState || 'no_face_low_confidence'}`;

  const confirmedFaceLost =
    tracker.noFaceStreak >= NO_FACE_STREAK_FOR_FACE_LOST ||
    tracker.offScreenStreak >= OFFSCREEN_STREAK_FOR_FACE_LOST ||
    faceQualityScore < PERFORMANCE_ONLY_QUALITY_THRESHOLD;

  // Lean derivation: trust the classifier's verdict on real Action Units.
  // The ONLY overrides are (a) operational face-loss and (b) holding the
  // previous state on a genuinely low-confidence frame. Temporal smoothing
  // (below) absorbs single-frame noise. The previous ~10-branch cascade that
  // rewrote minority states into neutral/high_engagement is removed — that bias
  // is what made every session collapse to the same output.
  if (confirmedFaceLost) {
    candidateState = 'no_face_low_confidence';
    reason =
      tracker.noFaceStreak >= NO_FACE_STREAK_FOR_FACE_LOST
        ? `face_lost:no_face_streak_${tracker.noFaceStreak}`
        : tracker.offScreenStreak >= OFFSCREEN_STREAK_FOR_FACE_LOST
          ? `face_lost:offscreen_streak_${tracker.offScreenStreak}`
          : `face_lost:quality_${faceQualityScore.toFixed(2)}`;
  } else if (rawState !== 'no_face_low_confidence' && classifierConfidence < EMOTION_CONFIDENCE_THRESHOLD) {
    candidateState = tracker.lastFinalState;
    reason = `hold_low_confidence_${Math.round(classifierConfidence * 100)}`;
  }

  tracker.confidenceWindow.push(classifierConfidence);
  if (tracker.confidenceWindow.length > 10) {
    tracker.confidenceWindow.shift();
  }

  tracker.recentCandidates.push({
    state: candidateState,
    confidence: Math.max(classifierConfidence, 0.35),
    timestampMs: now,
  });
  if (tracker.recentCandidates.length > SESSION_WINDOW_SIZE) {
    tracker.recentCandidates.shift();
  }

  const weights = new Map<ResearchAffectState, number>();
  for (let index = 0; index < tracker.recentCandidates.length; index += 1) {
    const item = tracker.recentCandidates[index];
    const recencyWeight = 0.75 + (index / Math.max(tracker.recentCandidates.length - 1, 1)) * 0.25;
    weights.set(item.state, (weights.get(item.state) ?? 0) + item.confidence * recencyWeight);
  }

  const ranked = [...weights.entries()].sort((a, b) => b[1] - a[1]);
  const [dominantState, dominantWeight] = ranked[0] ?? [tracker.lastFinalState, 1];
  const totalWeight = [...weights.values()].reduce((sum, value) => sum + value, 0) || 1;
  const dominantRatio = dominantWeight / totalWeight;
  const dominantCount = tracker.recentCandidates.filter((entry) => entry.state === dominantState).length;

  let finalState = tracker.lastFinalState;
  let smoothingHold = false;
  if (dominantState === tracker.lastFinalState) {
    finalState = tracker.lastFinalState;
  } else {
    const needsVeryStrongProof = dominantState === 'no_face_low_confidence';
    const needsFocusProof = dominantState === 'high_engagement';
    const minRatio = needsVeryStrongProof ? 0.76 : needsFocusProof ? 0.62 : 0.58;
    const minVotes = needsVeryStrongProof ? 4 : needsFocusProof ? 3 : 2;
    if (dominantRatio >= minRatio && dominantCount >= minVotes) {
      finalState = dominantState;
      reason = `${reason}|smoothed_switch:${dominantState}`;
    } else {
      smoothingHold = true;
      reason = `${reason}|hold:${tracker.lastFinalState}`;
    }
  }

  if (finalState !== tracker.lastFinalState) {
    tracker.transitionCount += 1;
    tracker.lastFinalState = finalState;
    tracker.stateStartedAtMs = now;
  }

  return {
    state: finalState,
    rawState,
    candidateState,
    reason,
    faceQualityScore,
    qualityStatus:
      !faceDetected || faceQualityScore < PERFORMANCE_ONLY_QUALITY_THRESHOLD || classifierConfidence < MONITOR_ONLY_CONFIDENCE_THRESHOLD
        ? 'performance_only'
        : 'trusted',
    noFaceStreak: tracker.noFaceStreak,
    offScreenStreak: tracker.offScreenStreak,
    attentiveStreak: tracker.attentiveStreak,
    stateDurationSec: (now - tracker.stateStartedAtMs) / 1000,
    smoothingWindow: tracker.recentCandidates.map((entry) => entry.state),
    transitionCount: tracker.transitionCount,
    confidenceWindow: [...tracker.confidenceWindow],
    smoothingHold,
    signalSnapshot: {
      attentionScore,
      attentivePresenceScore,
      uncertaintyScore,
      strainScore,
      passiveScore,
    },
  };
}

function persistedAffectState(state: ResearchAffectState) {
  return state;
}

async function resolveValidEpisodeId(episodeId?: string | null) {
  if (!episodeId) return null;

  if (validatedEpisodeIds.has(episodeId)) {
    return validatedEpisodeIds.get(episodeId) ?? null;
  }

  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: { id: true },
  });

  const safeEpisodeId = episode?.id ?? null;
  validatedEpisodeIds.set(episodeId, safeEpisodeId);
  return safeEpisodeId;
}

function buildEngagementSnapshot(bw: BehaviorWindowPayload) {
  const score =
    bw.engagementScore ??
    Math.max(
      0,
      Math.min(
        100,
        bw.clickRatePerMin * 15 +
          Math.max(0, 25 - bw.dwellTimeSec / 3) +
          Math.max(0, 20 - bw.rereadCount * 4),
      ),
    );

  return {
    engagementLevel: score >= 70 ? 'high' : score >= 40 ? 'moderate' : 'low',
    interactionRate: bw.clickRatePerMin,
    inactivityMs: Math.round(bw.dwellTimeSec * 1000),
    passiveExposureSec: Math.max(Math.round(bw.dwellTimeSec - bw.clickRatePerMin * 2), 0),
    score,
  } as const;
}

function buildPerformanceSnapshot(bw: BehaviorWindowPayload) {
  const accuracyScore = Math.max(0, Math.min(1, bw.taskProgressPct / 100));
  return {
    accuracyScore,
    repeatedErrors: Math.max(bw.rereadCount - 1, 0),
    failedAttempts: bw.abandonmentAttempts,
    hesitationMs: Math.round(bw.dwellTimeSec * 1000),
    performanceBand: accuracyScore >= 0.75 ? 'high' : accuracyScore >= 0.45 ? 'moderate' : 'low',
  } as const;
}

function safeParse<T>(raw: string | null): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
    path: '/ws/emotion',
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error('Authentication error'));

    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET!) as any;
      socket.data.learnerId = decoded.sub;
      socket.data.participantId = decoded.participantId;
      socket.data.cohort = decoded.cohort;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const learnerId = socket.data.learnerId as string;
    const participantId = socket.data.participantId as string;
    const learnerCohort = socket.data.cohort as 'experimental' | 'control' | undefined;
    const activeSessionIds = new Set<string>();

    logger.info(`Socket connected: learner ${learnerId}`);
    socket.join(`learner_${learnerId}`);

    socket.on('disconnect', () => {
      for (const id of activeSessionIds) {
        sessionAffectTrackers.delete(id);
      }
      logger.info(`Socket disconnected: learner ${learnerId}`);
    });

    socket.on('ping', (callback) => {
      if (callback) callback('pong');
    });

    socket.on('emotion_frame', async (frame: EmotionEventPayload) => {
      try {
        const access = await resolveLearnerAccessSnapshot(learnerId, { allowCache: true });
        if (!access.emotionTrackingEnabled) {
          return;
        }

        activeSessionIds.add(frame.sessionId);
        const state = await classifier.classify(frame.sessionId, learnerId, frame.auVector);
        const safeEpisodeId = await resolveValidEpisodeId(frame.episodeId);
        const interpretation = deriveResearchAffectState(
          frame.sessionId,
          state.state,
          state.confidence,
          frame.auVector,
          frame.facialSignals,
        );
        const detectedAffect = interpretation.state;
        const persistedState = persistedAffectState(detectedAffect);
        const timestamp = frame.timestamp ?? new Date().toISOString();

        await prisma.emotionEvent.create({
          data: {
            time: new Date(timestamp),
            sessionId: frame.sessionId,
            learnerId,
            episodeId: safeEpisodeId,
            contentId: frame.contentId,
            au1: frame.auVector.au1,
            au4: frame.auVector.au4,
            au6: frame.auVector.au6,
            au12: frame.auVector.au12,
            au20: frame.auVector.au20,
            au23: frame.auVector.au23,
            auConfidence: frame.auVector.confidence,
            classifiedState: persistedState as any,
            classificationConfidence: state.confidence,
            isBelowThreshold: state.confidence < EMOTION_CONFIDENCE_THRESHOLD,
          },
        });

        await redis.set(
          REDIS_KEYS.emotion(participantId),
          JSON.stringify({
            state: detectedAffect,
            persistedState,
            confidence: state.confidence,
            timestamp,
            episodeId: safeEpisodeId,
            facialSignals: frame.facialSignals,
            faceDetected: frame.facialSignals?.faceDetected ?? false,
            faceQualityScore: interpretation.faceQualityScore,
            qualityStatus: interpretation.qualityStatus,
            stateDurationSec: interpretation.stateDurationSec,
            confidenceWindow: interpretation.confidenceWindow,
            signalSnapshot: interpretation.signalSnapshot,
          }),
          'EX',
          60 * 60,
        );

        const payload = {
          ...state,
          displayState: detectedAffect,
          displayConfidence:
            detectedAffect === 'no_face_low_confidence'
              ? clamp01(Math.max(0.55, interpretation.faceQualityScore))
              : detectedAffect === 'high_engagement'
                ? clamp01(
                    Math.max(
                      state.confidence,
                      interpretation.signalSnapshot.attentivePresenceScore,
                    ),
                  )
                : state.confidence,
          rawState: interpretation.rawState,
          candidateState: interpretation.candidateState,
          persistedState,
          facialSignals: frame.facialSignals,
          faceDetected: frame.facialSignals?.faceDetected ?? false,
          faceQualityScore: interpretation.faceQualityScore,
          qualityStatus: interpretation.qualityStatus,
          calibration: {
            reason: interpretation.reason,
            noFaceStreak: interpretation.noFaceStreak,
            offScreenStreak: interpretation.offScreenStreak,
            attentiveStreak: interpretation.attentiveStreak,
            stateDurationSec: interpretation.stateDurationSec,
            smoothingWindow: interpretation.smoothingWindow,
            transitionCount: interpretation.transitionCount,
            confidenceWindow: interpretation.confidenceWindow,
            smoothingHold: interpretation.smoothingHold,
            signalSnapshot: interpretation.signalSnapshot,
          },
        };

        socket.emit('affect_state', payload);
        io.to(`researcher_learner_${learnerId}`).emit('live_affect_state', payload);
      } catch (error) {
        logger.error('emotion_frame handling error', error);
      }
    });

    socket.on('behavior_window', async (bw: BehaviorWindowPayload) => {
      try {
        const access = await resolveLearnerAccessSnapshot(learnerId, { allowCache: true });
        const safeEpisodeId = await resolveValidEpisodeId(bw.episodeId);
        await prisma.behaviorWindow.create({
          data: {
            sessionId: bw.sessionId,
            learnerId,
            episodeId: safeEpisodeId,
            contentId: (bw as any).contentId,
            windowStart: new Date(bw.windowStartIso),
            windowEnd: new Date(bw.windowEndIso),
            dwellTimeSec: bw.dwellTimeSec,
            scrollEvents: bw.scrollEvents,
            rereadCount: bw.rereadCount,
            clickCount: bw.clickCount,
            clickRatePerMin: bw.clickRatePerMin,
            taskProgressPct: bw.taskProgressPct,
            pageReturns: bw.pageReturns,
            hintRequests: bw.hintRequests,
            abandonmentAttempts: bw.abandonmentAttempts,
            typingRateWpm: bw.typingRateWpm,
            backspaceRatio: bw.backspaceRatio,
            dwellExceedsThreshold: bw.dwellTimeSec > 90,
          },
        });

        const session = await prisma.session.findUnique({
          where: { id: bw.sessionId },
          select: {
            id: true,
            moduleId: true,
            episodeId: true,
            scaffoldLevel: true,
            startedAt: true,
          },
        });

        const emotionSnapshot = safeParse<{
          state: ResearchAffectState;
          confidence: number;
          facialSignals?: FacialSignalMetrics;
        }>(await redis.get(REDIS_KEYS.emotion(participantId)));

        await Promise.all([
          redis.set(REDIS_KEYS.engagement(bw.sessionId), JSON.stringify(buildEngagementSnapshot(bw)), 'EX', 60 * 60),
          redis.set(
            REDIS_KEYS.context(bw.sessionId),
            JSON.stringify({
              moduleId: session?.moduleId,
              lessonId: bw.currentLessonId ?? bw.episodeId ?? session?.episodeId,
              activityId: bw.currentActivityId ?? bw.episodeId,
              activityType: bw.currentActivityType ?? 'scenario_task',
              currentContentType: bw.currentContentType ?? 'interactive_scenario',
              currentTaskKey: bw.currentTaskKey,
              phase: 'adaptive_learning',
            }),
            'EX',
            60 * 60,
          ),
          redis.set(
            REDIS_KEYS.performance(bw.sessionId),
            JSON.stringify(buildPerformanceSnapshot(bw)),
            'EX',
            60 * 60,
          ),
        ]);

        const sessionMinutes = session
          ? (Date.now() - session.startedAt.getTime()) / 60000
          : bw.dwellTimeSec / 60;

        // Auto-evaluate the previous intervention's effectiveness from the
        // affect observed in this following window (server-side fallback so
        // wasEffective is populated even if the learner never reports a
        // response). The frontend response endpoint can still override later.
        await evaluatePendingAdaptiveEffectiveness(
          bw.sessionId,
          (emotionSnapshot?.state ?? classifier.getCurrentState(bw.sessionId)) as ResearchAffectState,
        );

        const decision = await engine.decide({
          sessionId: bw.sessionId,
          learnerId,
          participantId,
          cohort: learnerCohort,
          emotionTrackingEnabled: access.emotionTrackingEnabled,
          episodeId: bw.episodeId ?? session?.episodeId ?? undefined,
          affectState: persistedAffectState(
            (emotionSnapshot?.state ?? classifier.getCurrentState(bw.sessionId)) as ResearchAffectState,
          ),
          emotionConfidence: emotionSnapshot?.confidence,
          facialSignals: emotionSnapshot?.facialSignals,
          behaviorMetrics: bw,
          scaffoldLevel: session?.scaffoldLevel ?? 3,
          competencyScore: bw.taskProgressPct / 100,
          sessionMinutes,
        });

        if (decision.intervention !== 'do_nothing') {
          socket.emit('adaptation', decision);
        }

        // Per-result (~15s) emotion suggestion layer: the unified adaptive
        // surface on the learner. Separate Redis cooldown from the fast alerts.
        const suggestion = await maybeBuildEmotionSuggestion({
          sessionId: bw.sessionId,
          learnerId,
          episodeId: bw.episodeId ?? session?.episodeId ?? null,
          emotionTrackingEnabled: access.emotionTrackingEnabled,
        });
        if (suggestion) {
          socket.emit('content_suggestion', suggestion);
          io.to(`researcher_learner_${learnerId}`).emit('content_suggestion', suggestion);
        }
      } catch (error) {
        logger.error('behavior_window handling error', error);
      }
    });

    socket.on('subscribe_learner', (targetLearnerId: string) => {
      socket.join(`researcher_learner_${targetLearnerId}`);
    });

    socket.on('unsubscribe_learner', (targetLearnerId: string) => {
      socket.leave(`researcher_learner_${targetLearnerId}`);
    });
  });

  return io;
}
