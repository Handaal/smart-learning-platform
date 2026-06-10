import { AdaptiveEngine } from './AdaptiveEngine';
import { prisma } from '../lib/prisma';
import type { AdaptiveContext, RealtimeAdaptiveState } from '../types';

jest.mock('../lib/prisma', () => ({
  prisma: {
    adaptiveEvent: { create: jest.fn() },
    learningContent: { findFirst: jest.fn() },
    learner: { findUnique: jest.fn() },
  },
}));

jest.mock('../lib/redis', () => ({
  redis: { get: jest.fn(), set: jest.fn() },
}));

jest.mock('../lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('AdaptiveEngine v2 canonical policy', () => {
  let engine: AdaptiveEngine;

  const baseContext: AdaptiveContext = {
    participantId: 'EXP-TEST-001',
    learnerId: 'learner-001',
    cohort: 'experimental',
    sessionId: 'session-001',
    episodeId: 'M1-E2',
    scaffoldLevel: 3,
    competencyScore: 0.62,
    sessionMinutes: 12,
    affectState: 'neutral',
    behaviorMetrics: {
      sessionId: 'session-001',
      learnerId: 'learner-001',
      episodeId: 'M1-E2',
      windowStartIso: new Date('2026-04-29T10:00:00Z').toISOString(),
      windowEndIso: new Date('2026-04-29T10:00:15Z').toISOString(),
      dwellTimeSec: 45,
      scrollEvents: 8,
      rereadCount: 0,
      clickCount: 6,
      clickRatePerMin: 6,
      taskProgressPct: 46,
      hintRequests: 0,
      abandonmentAttempts: 0,
      pageReturns: 0,
      typingRateWpm: 24,
      backspaceRatio: 0.08,
      currentTaskKey: 'wbs',
      currentActivityType: 'lesson',
      currentContentType: 'text',
      engagementScore: 58,
      expectedTimeSec: 40,
    },
  };

  function createRealtimeState(
    overrides: Partial<RealtimeAdaptiveState> & {
      emotionState?: AdaptiveContext['affectState'];
      confidence?: number;
      durationSec?: number;
      faceDetected?: boolean;
      faceQualityScore?: number;
      activityType?: string;
      contentType?: string;
      taskKey?: string;
      accuracyScore?: number;
      repeatedErrors?: number;
      failedAttempts?: number;
      hesitationMs?: number;
      performanceBand?: 'low' | 'moderate' | 'high';
      inactivityMs?: number;
      passiveExposureSec?: number;
      engagementLevel?: 'low' | 'moderate' | 'high';
      cooldownUntil?: string;
    } = {},
  ): RealtimeAdaptiveState {
    return {
      fetchedAt: Date.now(),
      emotion: {
        timestamp: new Date('2026-04-29T10:00:15Z').toISOString(),
        state: overrides.emotionState ?? 'neutral',
        confidence: overrides.confidence ?? 0.82,
        stateDurationSec: overrides.durationSec ?? 16,
        faceDetected: overrides.faceDetected ?? true,
        faceQualityScore: overrides.faceQualityScore ?? 0.88,
        qualityStatus: overrides.faceDetected === false || (overrides.faceQualityScore ?? 0.88) < 0.55 ? 'performance_only' : 'trusted',
        confidenceWindow: [overrides.confidence ?? 0.82, overrides.confidence ?? 0.82, overrides.confidence ?? 0.82],
      },
      context: {
        currentTaskKey: overrides.taskKey ?? 'wbs',
        activityType: overrides.activityType ?? 'lesson',
        currentContentType: overrides.contentType ?? 'text',
      },
      performance: {
        accuracyScore: overrides.accuracyScore ?? 0.52,
        repeatedErrors: overrides.repeatedErrors ?? 0,
        failedAttempts: overrides.failedAttempts ?? 0,
        hesitationMs: overrides.hesitationMs ?? 4000,
        performanceBand: overrides.performanceBand ?? 'moderate',
      },
      engagement: {
        engagementLevel: overrides.engagementLevel ?? 'moderate',
        interactionRate: 5,
        inactivityMs: overrides.inactivityMs ?? 15000,
        passiveExposureSec: overrides.passiveExposureSec ?? 12,
        score: overrides.engagementLevel === 'high' ? 84 : overrides.engagementLevel === 'low' ? 26 : 56,
      },
      intervention: overrides.cooldownUntil
        ? {
            currentIntervention: 'task_decomposition',
            startedAt: new Date('2026-04-29T10:00:00Z').toISOString(),
            cooldownUntil: overrides.cooldownUntil,
            lastTriggerType: 'adaptive_alert.frustration.mini_task_strip',
            lastScenarioKey: 'frustration',
          }
        : undefined,
      ...overrides,
    };
  }

  beforeEach(() => {
    engine = new AdaptiveEngine();
    jest.clearAllMocks();
    (prisma.learningContent.findFirst as jest.Mock).mockResolvedValue({ id: 'CONTENT-001' });
  });

  test('confusion scenario opens the side-panel scaffold', async () => {
    const decision = await engine.decide({
      ...baseContext,
      affectState: 'confusion',
      realtimeState: createRealtimeState({
        emotionState: 'confusion',
        durationSec: 14,
        repeatedErrors: 2,
        taskKey: 'wbs',
      }),
    });

    expect(decision.scenarioKey).toBe('confusion');
    expect(decision.intervention).toBe('scaffolded_hint');
    expect(decision.uiShape).toBe('side_panel');
    expect(decision.triggerSource).toBe('emotion_based_intervention');
  });

  test('frustration scenario opens the mini task strip', async () => {
    const decision = await engine.decide({
      ...baseContext,
      affectState: 'frustration',
      realtimeState: createRealtimeState({
        emotionState: 'frustration',
        durationSec: 18,
        repeatedErrors: 3,
        taskKey: 'schedule_management',
        performanceBand: 'low',
      }),
    });

    expect(decision.scenarioKey).toBe('frustration');
    expect(decision.intervention).toBe('task_decomposition');
    expect(decision.uiShape).toBe('mini_task_strip');
  });

  test('boredom scenario switches to an interactive case popup', async () => {
    const decision = await engine.decide({
      ...baseContext,
      affectState: 'boredom_disengagement',
      realtimeState: createRealtimeState({
        emotionState: 'boredom_disengagement',
        durationSec: 18,
        contentType: 'theoretical',
        inactivityMs: 52000,
        passiveExposureSec: 55,
        engagementLevel: 'low',
      }),
    });

    expect(decision.scenarioKey).toBe('boredom_disengagement');
    expect(decision.intervention).toBe('interactive_case_switch');
    expect(decision.uiShape).toBe('popup_card');
  });

  test('high engagement unlocks the advanced path', async () => {
    const decision = await engine.decide({
      ...baseContext,
      affectState: 'high_engagement',
      realtimeState: createRealtimeState({
        emotionState: 'high_engagement',
        accuracyScore: 0.92,
        performanceBand: 'high',
        engagementLevel: 'high',
      }),
    });

    expect(decision.scenarioKey).toBe('high_engagement');
    expect(decision.intervention).toBe('advanced_path');
    expect(decision.uiShape).toBe('advanced_path');
  });

  test('assessment anxiety shows only neutral reassurance', async () => {
    const decision = await engine.decide({
      ...baseContext,
      affectState: 'test_anxiety',
      realtimeState: createRealtimeState({
        emotionState: 'test_anxiety',
        durationSec: 12,
        activityType: 'pre_test',
        contentType: 'assessment',
        hesitationMs: 12000,
      }),
    });

    expect(decision.scenarioKey).toBe('test_anxiety');
    expect(decision.intervention).toBe('neutral_reassurance');
    expect(decision.uiShape).toBe('information_window');
  });

  test('neutral stable state suppresses extra alerts', async () => {
    const decision = await engine.decide({
      ...baseContext,
      affectState: 'neutral',
      realtimeState: createRealtimeState({
        emotionState: 'neutral',
        accuracyScore: 0.72,
        performanceBand: 'moderate',
      }),
    });

    expect(decision.scenarioKey).toBe('neutral');
    expect(decision.intervention).toBe('do_nothing');
    expect(decision.triggerSource).toBe('no_action');
  });

  test('no-face / low-confidence state falls back to performance-only logic', async () => {
    const decision = await engine.decide({
      ...baseContext,
      affectState: 'no_face_low_confidence',
      realtimeState: createRealtimeState({
        emotionState: 'no_face_low_confidence',
        confidence: 0.45,
        faceDetected: false,
        faceQualityScore: 0.22,
      }),
    });

    expect(decision.scenarioKey).toBe('no_face_low_confidence');
    expect(decision.triggerSource).toBe('fallback_performance_only');
    expect(decision.fallbackModeActive).toBe(true);
  });

  test('control group stays on standard feedback only even when confusion is present', async () => {
    const decision = await engine.decide({
      ...baseContext,
      cohort: 'control',
      affectState: 'confusion',
      realtimeState: createRealtimeState({
        emotionState: 'confusion',
        durationSec: 16,
        repeatedErrors: 3,
      }),
    });

    expect(decision.scenarioKey).toBe('neutral');
    expect(decision.intervention).toBe('do_nothing');
    expect(decision.triggerType).toBe('control_standard_flow');
    expect(prisma.adaptiveEvent.create).not.toHaveBeenCalled();
  });

  test('quality of response uses canonical positivity values', () => {
    const qor = engine.computeQualityOfResponse(10, 20, 'high_engagement', 1.0);
    expect(qor.compositeQoR).toBe(0.835);
  });
});
