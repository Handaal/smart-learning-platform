/**
 * AdaptiveEngine.test.ts — Comprehensive unit tests
 *
 * Covers all D'Mello scenarios, QoR computation, multi-modal classification,
 * rationale generation, Redis integration, and edge cases.
 */
import type {
  AdaptiveContext, AffectState, BehaviorWindowPayload,
  SensorSnapshot, AUVector, VoiceToneData, GazeData,
  QualityOfResponse,
} from '../../backend/src/types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock Prisma
const mockCreate = jest.fn().mockResolvedValue({ id: 'evt-001' });
const mockFindUnique = jest.fn().mockResolvedValue({ id: 'learner-uuid-001' });

jest.mock('../../backend/src/lib/prisma', () => ({
  prisma: {
    adaptiveEvent: { create: (...args: any[]) => mockCreate(...args) },
    learner:       { findUnique: (...args: any[]) => mockFindUnique(...args) },
  },
}));

// Mock Redis
const mockRedisGet = jest.fn().mockResolvedValue(null);

jest.mock('../../backend/src/lib/redis', () => ({
  redis: {
    get: (...args: any[]) => mockRedisGet(...args),
    on:  jest.fn(),
  },
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

// Mock Logger
jest.mock('../../backend/src/lib/logger', () => ({
  logger: {
    info:  jest.fn(),
    warn:  jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import AFTER mocks
import { AdaptiveEngine } from '../../backend/src/services/AdaptiveEngine';

// ── Test Helpers ──────────────────────────────────────────────────────────────

function makeBehavior(overrides: Partial<BehaviorWindowPayload> = {}): BehaviorWindowPayload {
  return {
    sessionId:           'session-001',
    learnerId:           'learner-001',
    windowStartIso:      '2026-04-07T10:00:00Z',
    windowEndIso:        '2026-04-07T10:01:30Z',
    dwellTimeSec:        45,
    scrollEvents:        5,
    rereadCount:         0,
    clickCount:          12,
    clickRatePerMin:     8,
    taskProgressPct:     50,
    pageReturns:         0,
    hintRequests:        0,
    abandonmentAttempts: 0,
    ...overrides,
  };
}

function makeAU(overrides: Partial<AUVector> = {}): AUVector {
  return {
    au1: 0.10, au4: 0.15, au6: 0.10,
    au12: 0.10, au20: 0.10, au23: 0.10,
    confidence: 0.92,
    ...overrides,
  };
}

function makeVoice(overrides: Partial<VoiceToneData> = {}): VoiceToneData {
  return {
    pitchVariance: 30, confidenceLevel: 0.75,
    speakingRate: 100, silenceRatio: 0.20,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeGaze(overrides: Partial<GazeData> = {}): GazeData {
  return {
    fixationStability: 0.70, saccadeFrequency: 15,
    offScreenRatio: 0.10, avgFixationDurationMs: 300,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeSensor(overrides: {
  au?: Partial<AUVector> | null;
  voice?: Partial<VoiceToneData> | null;
  gaze?: Partial<GazeData> | null;
} = {}): SensorSnapshot {
  return {
    au:        overrides.au === null ? null : makeAU(overrides.au ?? {}),
    voice:     overrides.voice === null ? null : makeVoice(overrides.voice ?? {}),
    gaze:      overrides.gaze === null ? null : makeGaze(overrides.gaze ?? {}),
    fetchedAt: Date.now(),
  };
}

function makeContext(overrides: Partial<AdaptiveContext> = {}): AdaptiveContext {
  return {
    sessionId:       'session-001',
    learnerId:       'learner-uuid-001',
    participantId:   'STEP-2026-001',
    affectState:     'Neutral',
    behaviorMetrics: makeBehavior(),
    scaffoldLevel:   3,
    competencyScore: 0.60,
    sessionMinutes:  15,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('AdaptiveEngine', () => {
  let engine: AdaptiveEngine;

  beforeEach(() => {
    engine = new AdaptiveEngine();
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ id: 'evt-001' });
    mockRedisGet.mockResolvedValue(null);
  });

  // ── SCENARIO 1: Frustration ─────────────────────────────────────────────────

  describe('Frustration Scenario', () => {
    it('should scaffold up when frustration is prolonged (> 5 min)', async () => {
      const ctx = makeContext({
        affectState:    'Frustration',
        scaffoldLevel:  2,
        sessionMinutes: 8,
        competencyScore: 0.35,
        sensorSnapshot: makeSensor({
          au: { au4: 0.72, au23: 0.65 },  // Brow furrow + lip press
        }),
        behaviorMetrics: makeBehavior({ taskProgressPct: 15, dwellTimeSec: 120 }),
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('scaffold_up');
      expect(decision.triggerType).toBe('frustration_prolonged');
      expect(decision.triggerPriority).toBe(1);
      expect(decision.scaffoldFrom).toBe(2);
      expect(decision.scaffoldTo).toBe(3);
      expect(decision.contentId).toBe('SCAFFOLD-L3');
    });

    it('should escalate to P1 on abandonment risk', async () => {
      const ctx = makeContext({
        affectState:    'Frustration',
        scaffoldLevel:  3,
        sessionMinutes: 3, // Less than 5 min — so not prolonged
        sensorSnapshot: makeSensor({ au: { au4: 0.60, au23: 0.55 } }),
        behaviorMetrics: makeBehavior({ abandonmentAttempts: 3, taskProgressPct: 10 }),
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('scaffold_up');
      expect(decision.triggerType).toBe('abandonment_risk');
      expect(decision.triggerPriority).toBe(1);
      expect(decision.contentId).toBe('AFF-001');
    });

    it('should generate rationale with D\'Mello transition for frustration', async () => {
      const ctx = makeContext({
        affectState:    'Frustration',
        scaffoldLevel:  2,
        sessionMinutes: 10,
        sensorSnapshot: makeSensor({ au: { au4: 0.70, au23: 0.60 } }),
        behaviorMetrics: makeBehavior({ taskProgressPct: 12 }),
      });

      const decision = await engine.decide(ctx);

      expect(decision.rationale).toBeDefined();
      expect(decision.rationale.model).toBe('dmello-v1');
      expect(decision.rationale.detectedState).toBe('Frustration');
      expect(decision.rationale.pedagogicalBasis).toContain('D\'Mello');
      expect(decision.rationale.pedagogicalBasis).toContain('learned helplessness');
      expect(decision.rationale.dmelloTransition).toBeDefined();
      expect(decision.rationale.dmelloTransition!.fromState).toBe('Frustration');
      expect(decision.rationale.dmelloTransition!.toState).toBe('Boredom');
      expect(decision.rationale.dmelloTransition!.probability).toBe(0.32);
    });

    it('should NOT scaffold beyond level 4', async () => {
      const ctx = makeContext({
        affectState:    'Frustration',
        scaffoldLevel:  4, // Already max
        sessionMinutes: 10,
        sensorSnapshot: makeSensor({ au: { au4: 0.65, au23: 0.60 } }),
        behaviorMetrics: makeBehavior({ abandonmentAttempts: 2 }),
      });

      const decision = await engine.decide(ctx);

      // Should still intervene via abandonment path, capping at 4
      expect(decision.intervention).toBe('scaffold_up');
      expect(decision.scaffoldTo).toBeLessThanOrEqual(4);
    });

    it('should persist event to database on frustration intervention', async () => {
      const ctx = makeContext({
        affectState:    'Frustration',
        scaffoldLevel:  2,
        sessionMinutes: 8,
        sensorSnapshot: makeSensor({ au: { au4: 0.70, au23: 0.58 } }),
        behaviorMetrics: makeBehavior({ taskProgressPct: 15 }),
      });

      await engine.decide(ctx);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const createArgs = mockCreate.mock.calls[0][0];
      expect(createArgs.data.triggerType).toBe('frustration_prolonged');
      expect(createArgs.data.intervention).toBe('scaffold_up');
      expect(createArgs.data.learnerId).toBe('learner-uuid-001');
    });
  });

  // ── SCENARIO 2: Confusion ──────────────────────────────────────────────────

  describe('Confusion Scenario', () => {
    it('should provide hint when confusion + dwell exceeds 90s', async () => {
      const ctx = makeContext({
        affectState:    'Confusion',
        sensorSnapshot: makeSensor({
          au:    { au4: 0.65, au12: 0.15 },
          voice: { confidenceLevel: 0.70 },
        }),
        behaviorMetrics: makeBehavior({ dwellTimeSec: 100, rereadCount: 1 }),
        episodeId: 'M2-1A',
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('hint');
      expect(decision.triggerType).toBe('confusion_dwell');
      expect(decision.triggerPriority).toBe(2);
      expect(decision.contentId).toBe('HINT-M2-1A');
    });

    it('should provide concept map when re-reading repeatedly', async () => {
      const ctx = makeContext({
        affectState:    'Confusion',
        sensorSnapshot: makeSensor({
          au:    { au4: 0.62, au12: 0.10 },
          voice: { confidenceLevel: 0.65 },
        }),
        behaviorMetrics: makeBehavior({ dwellTimeSec: 95, rereadCount: 4, taskProgressPct: 20 }),
        episodeId: 'M3-2B',
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('hint');
      expect(decision.contentId).toBe('CMAP-M3-2B'); // Concept map due to rereadCount >= 3
    });

    it('should detect confusion via uncertain voice tone', async () => {
      const ctx = makeContext({
        affectState:    'Confusion',
        sensorSnapshot: makeSensor({
          voice: { confidenceLevel: 0.30, pitchVariance: 45 },
        }),
        behaviorMetrics: makeBehavior({ dwellTimeSec: 50, clickRatePerMin: 2 }),
        episodeId: 'M1-1A',
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('hint');
      expect(decision.triggerType).toBe('confusion_voice_uncertain');
      expect(decision.rationale.pedagogicalBasis).toContain('Voice analysis');
      expect(decision.rationale.pedagogicalBasis).toContain('confidence < 0.45');
    });

    it('should reference D\'Mello cascade risk in confusion rationale', async () => {
      const ctx = makeContext({
        affectState:    'Confusion',
        sensorSnapshot: makeSensor({ au: { au4: 0.60 } }),
        behaviorMetrics: makeBehavior({ dwellTimeSec: 95 }),
      });

      const decision = await engine.decide(ctx);

      expect(decision.rationale.dmelloTransition).toBeDefined();
      expect(decision.rationale.dmelloTransition!.fromState).toBe('Confusion');
      expect(decision.rationale.dmelloTransition!.toState).toBe('Frustration');
      expect(decision.rationale.dmelloTransition!.probability).toBe(0.38);
      expect(decision.rationale.dmelloTransition!.isNegative).toBe(true);
    });
  });

  // ── SCENARIO 3: Boredom ────────────────────────────────────────────────────

  describe('Boredom Scenario', () => {
    it('should scaffold down with quiz for bored high-performer', async () => {
      const ctx = makeContext({
        affectState:     'Boredom',
        competencyScore: 0.75,
        scaffoldLevel:   3,
        sensorSnapshot:  makeSensor({
          gaze: { offScreenRatio: 0.45, fixationStability: 0.25 },
          au:   { au1: 0.10, au4: 0.10, au6: 0.05, au12: 0.05, au20: 0.05, au23: 0.05 },
        }),
        episodeId: 'M2-1A',
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('scaffold_down');
      expect(decision.triggerType).toBe('boredom_gaze_scatter');
      expect(decision.triggerPriority).toBe(3);
      expect(decision.scaffoldTo).toBe(2);
      expect(decision.contentId).toBe('QUIZ-M2-1A');
    });

    it('should inject advanced challenge for very high-performer', async () => {
      const ctx = makeContext({
        affectState:     'Boredom',
        competencyScore: 0.90,
        scaffoldLevel:   2,
        sensorSnapshot:  makeSensor({
          gaze: { offScreenRatio: 0.50 },
          au:   { au1: 0.05, au4: 0.08, au6: 0.05, au12: 0.05, au20: 0.05, au23: 0.05 },
        }),
        episodeId: 'M4-1A',
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('challenge');
      expect(decision.contentId).toBe('CHALLENGE-M4-1A');
      expect(decision.rationale.pedagogicalBasis).toContain('Csikszentmihalyi');
      expect(decision.rationale.pedagogicalBasis).toContain('advanced challenge');
    });

    it('should NOT intervene for bored low-performer (already struggling)', async () => {
      const ctx = makeContext({
        affectState:     'Boredom',
        competencyScore: 0.30, // Low — don't challenge further
        scaffoldLevel:   3,
        sensorSnapshot:  makeSensor({
          gaze: { offScreenRatio: 0.40 },
          au:   { au1: 0.05, au4: 0.10, au6: 0.05, au12: 0.05, au20: 0.05, au23: 0.05 },
        }),
      });

      const decision = await engine.decide(ctx);

      // Should not challenge a low-performer — falls through to 'none'
      expect(decision.intervention).toBe('none');
    });
  });

  // ── SCENARIO 4: Flow / Delight ──────────────────────────────────────────────

  describe('Flow/Delight Scenario', () => {
    it('should provide badge + challenge for flow state with high performance', async () => {
      const ctx = makeContext({
        affectState:     'Flow',
        competencyScore: 0.88,
        scaffoldLevel:   3,
        sensorSnapshot:  makeSensor({
          gaze: { fixationStability: 0.85, offScreenRatio: 0.05 },
          au:   { au6: 0.55, au12: 0.50, au4: 0.10 },
        }),
        episodeId: 'M1-2A',
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('challenge');
      expect(decision.triggerType).toBe('flow_stable_gaze');
      expect(decision.triggerPriority).toBe(3);
      expect(decision.scaffoldTo).toBe(2);
      expect(decision.contentId).toContain('BADGE-');
      expect(decision.contentId).toContain('M1-2A');
    });

    it('should award GOLD badge for score > 0.90', async () => {
      const ctx = makeContext({
        affectState:     'Flow',
        competencyScore: 0.95,
        scaffoldLevel:   2,
        sensorSnapshot:  makeSensor({
          gaze: { fixationStability: 0.90 },
          au:   { au6: 0.50, au12: 0.55, au4: 0.05 },
        }),
        episodeId: 'M3-1A',
      });

      const decision = await engine.decide(ctx);

      expect(decision.contentId).toBe('BADGE-GOLD-M3-1A');
    });

    it('should award SILVER badge for score between 0.80 and 0.90', async () => {
      const ctx = makeContext({
        affectState:     'Flow',
        competencyScore: 0.85,
        scaffoldLevel:   2,
        sensorSnapshot:  makeSensor({
          gaze: { fixationStability: 0.80 },
          au:   { au6: 0.45, au12: 0.48, au4: 0.10 },
        }),
        episodeId: 'M2-1B',
      });

      const decision = await engine.decide(ctx);

      expect(decision.contentId).toBe('BADGE-SILVER-M2-1B');
    });

    it('should include flow sustainability rationale', async () => {
      const ctx = makeContext({
        affectState:     'Flow',
        competencyScore: 0.85,
        scaffoldLevel:   2,
        sensorSnapshot:  makeSensor({
          gaze: { fixationStability: 0.82 },
          au:   { au6: 0.50, au12: 0.50, au4: 0.08 },
        }),
      });

      const decision = await engine.decide(ctx);

      expect(decision.rationale.pedagogicalBasis).toContain('flow state');
      expect(decision.rationale.pedagogicalBasis).toContain('Deci & Ryan');
      expect(decision.rationale.expectedOutcome).toContain('Sustain flow');
    });
  });

  // ── SCENARIO 5: Anxiety ─────────────────────────────────────────────────────

  describe('Anxiety Scenario', () => {
    it('should provide affirmation when anxious with low progress', async () => {
      const ctx = makeContext({
        affectState:    'Anxiety',
        sensorSnapshot: makeSensor({
          au:    { au1: 0.60, au4: 0.45 },
          voice: { pitchVariance: 65, confidenceLevel: 0.40 },
        }),
        behaviorMetrics: makeBehavior({ dwellTimeSec: 80, taskProgressPct: 12 }),
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('affirmation');
      expect(decision.triggerType).toBe('anxiety_hesitation');
      expect(decision.triggerPriority).toBe(2);
      expect(decision.contentId).toBe('AFFRM-001');
    });

    it('should reference evaluative threat theory in rationale', async () => {
      const ctx = makeContext({
        affectState:    'Anxiety',
        sensorSnapshot: makeSensor({
          au: { au1: 0.58, au4: 0.42 },
        }),
        behaviorMetrics: makeBehavior({ dwellTimeSec: 75, taskProgressPct: 10 }),
      });

      const decision = await engine.decide(ctx);

      expect(decision.rationale.pedagogicalBasis).toContain('Pekrun');
      expect(decision.rationale.pedagogicalBasis).toContain('evaluative threat');
    });

    it('should NOT intervene for anxiety with steady progress', async () => {
      const ctx = makeContext({
        affectState:    'Anxiety',
        sensorSnapshot: makeSensor({
          au: { au1: 0.55, au4: 0.40 },
        }),
        behaviorMetrics: makeBehavior({ dwellTimeSec: 30, taskProgressPct: 60 }),
      });

      const decision = await engine.decide(ctx);

      // taskProgressPct > 20, so anxiety doesn't trigger
      expect(decision.intervention).toBe('none');
    });
  });

  // ── QoR Computation ─────────────────────────────────────────────────────────

  describe('Quality of Response (QoR)', () => {
    it('should compute perfect QoR for fast, positive, accurate response', () => {
      const qor = engine.computeQualityOfResponse(
        5,     // 5s response time
        60,    // 60s max
        'Flow', // best emotional state
        1.0,    // perfect accuracy
      );

      expect(qor.timeScore).toBeCloseTo(0.917, 2);
      expect(qor.emotionalPositivity).toBe(0.95);
      expect(qor.accuracyScore).toBe(1.0);
      expect(qor.compositeQoR).toBeGreaterThan(0.90);
      expect(qor.affectDuringResponse).toBe('Flow');
      expect(qor.weights.w1).toBe(0.30);
    });

    it('should compute low QoR for slow, frustrated, inaccurate response', () => {
      const qor = engine.computeQualityOfResponse(
        55,           // 55s — nearly timed out
        60,           // 60s max
        'Frustration', // worst emotional state
        0.20,          // low accuracy
      );

      expect(qor.timeScore).toBeCloseTo(0.083, 2);
      expect(qor.emotionalPositivity).toBe(0.10);
      expect(qor.accuracyScore).toBe(0.20);
      expect(qor.compositeQoR).toBeLessThan(0.20);
    });

    it('should clamp time score to 0 when response exceeds max', () => {
      const qor = engine.computeQualityOfResponse(120, 60, 'Neutral', 0.50);
      expect(qor.timeScore).toBe(0);
    });

    it('should clamp accuracy to [0, 1]', () => {
      const qor = engine.computeQualityOfResponse(10, 60, 'Neutral', 1.5);
      expect(qor.accuracyScore).toBe(1.0);

      const qor2 = engine.computeQualityOfResponse(10, 60, 'Neutral', -0.5);
      expect(qor2.accuracyScore).toBe(0);
    });

    it('should handle zero max time gracefully', () => {
      const qor = engine.computeQualityOfResponse(10, 0, 'Neutral', 0.50);
      expect(qor.timeScore).toBe(0); // Division by max(0,1) = 1, so 1-10/1 clamped to 0
    });

    it('should support custom weights', () => {
      const customWeights = { w1: 0.50, w2: 0.10, w3: 0.40 };
      const qor = engine.computeQualityOfResponse(
        10, 60, 'Flow', 0.80, customWeights,
      );

      expect(qor.weights.w1).toBe(0.50);
      expect(qor.weights.w2).toBe(0.10);
      // Composite should reflect custom weights
      const expected = 0.50 * qor.timeScore + 0.10 * qor.emotionalPositivity + 0.40 * 0.80;
      expect(qor.compositeQoR).toBeCloseTo(expected, 2);
    });
  });

  // ── Pedagogical Rationale ───────────────────────────────────────────────────

  describe('Pedagogical Rationale', () => {
    it('should always include model, state, evidence, and basis', async () => {
      const ctx = makeContext({
        affectState:    'Frustration',
        scaffoldLevel:  2,
        sessionMinutes: 10,
        sensorSnapshot: makeSensor({ au: { au4: 0.70, au23: 0.55 } }),
        behaviorMetrics: makeBehavior({ taskProgressPct: 12 }),
      });

      const decision = await engine.decide(ctx);

      expect(decision.rationale.model).toBe('dmello-v1');
      expect(decision.rationale.detectedState).toBe('Frustration');
      expect(decision.rationale.evidence.length).toBeGreaterThan(0);
      expect(decision.rationale.pedagogicalBasis.length).toBeGreaterThan(20);
      expect(decision.rationale.expectedOutcome.length).toBeGreaterThan(10);
    });

    it('should include rationale even for no-intervention decisions', async () => {
      const ctx = makeContext({
        affectState:     'Neutral',
        sessionMinutes:  10,
        sensorSnapshot:  makeSensor({}),
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('none');
      expect(decision.rationale).toBeDefined();
      expect(decision.rationale.model).toBe('dmello-v1');
      expect(decision.rationale.pedagogicalBasis).toContain('does not warrant intervention');
    });

    it('should persist rationale in behaviorSnapshot for research audit', async () => {
      const ctx = makeContext({
        affectState:    'Frustration',
        scaffoldLevel:  2,
        sessionMinutes: 8,
        sensorSnapshot: makeSensor({ au: { au4: 0.65, au23: 0.55 } }),
        behaviorMetrics: makeBehavior({ taskProgressPct: 10 }),
      });

      await engine.decide(ctx);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const data = mockCreate.mock.calls[0][0].data;
      expect(data.behaviorSnapshot).toBeDefined();
      expect(data.behaviorSnapshot.rationale).toBeDefined();
      expect(data.behaviorSnapshot.rationale.model).toBe('dmello-v1');
    });

    it('should infer competency target from episode ID', async () => {
      const ctx = makeContext({
        affectState:    'Confusion',
        sensorSnapshot: makeSensor({ au: { au4: 0.60 } }),
        behaviorMetrics: makeBehavior({ dwellTimeSec: 100 }),
        episodeId: 'M3-2B',
      });

      const decision = await engine.decide(ctx);

      expect(decision.rationale.competencyTarget).toBe('C3');
    });
  });

  // ── Redis Sensor Integration ────────────────────────────────────────────────

  describe('Redis Sensor Fetch', () => {
    it('should fetch AU, voice, and gaze data from Redis', async () => {
      const auData: AUVector = makeAU({ au4: 0.72, au23: 0.60 });
      const voiceData: VoiceToneData = makeVoice({ confidenceLevel: 0.35 });
      const gazeData: GazeData = makeGaze({ fixationStability: 0.85 });

      mockRedisGet.mockImplementation((key: string) => {
        if (key.endsWith(':au'))    return Promise.resolve(JSON.stringify(auData));
        if (key.endsWith(':voice')) return Promise.resolve(JSON.stringify(voiceData));
        if (key.endsWith(':gaze'))  return Promise.resolve(JSON.stringify(gazeData));
        return Promise.resolve(null);
      });

      const snapshot = await engine.fetchSensorSnapshot('STEP-2026-001');

      expect(snapshot.au).toEqual(auData);
      expect(snapshot.voice).toEqual(voiceData);
      expect(snapshot.gaze).toEqual(gazeData);
      expect(snapshot.fetchedAt).toBeDefined();

      // Verify Redis keys
      expect(mockRedisGet).toHaveBeenCalledWith('step:sensor:STEP-2026-001:au');
      expect(mockRedisGet).toHaveBeenCalledWith('step:sensor:STEP-2026-001:voice');
      expect(mockRedisGet).toHaveBeenCalledWith('step:sensor:STEP-2026-001:gaze');
    });

    it('should handle Redis disconnect gracefully', async () => {
      mockRedisGet.mockRejectedValue(new Error('Redis connection refused'));

      const snapshot = await engine.fetchSensorSnapshot('STEP-2026-001');

      expect(snapshot.au).toBeNull();
      expect(snapshot.voice).toBeNull();
      expect(snapshot.gaze).toBeNull();
    });

    it('should handle partial sensor data', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key.endsWith(':au')) return Promise.resolve(JSON.stringify(makeAU()));
        return Promise.resolve(null); // No voice or gaze
      });

      const snapshot = await engine.fetchSensorSnapshot('STEP-2026-001');

      expect(snapshot.au).toBeDefined();
      expect(snapshot.voice).toBeNull();
      expect(snapshot.gaze).toBeNull();
    });
  });

  // ── Multi-Modal Classification ──────────────────────────────────────────────

  describe('Multi-Modal Affect Classification', () => {
    it('should override to Frustration with strong AU + voice evidence', async () => {
      const ctx = makeContext({
        affectState:    'Neutral', // Base classification says Neutral
        sensorSnapshot: makeSensor({
          au:    { au4: 0.75, au23: 0.65 },  // Strong frustration AUs
          voice: { pitchVariance: 90 },       // High-pitched = stressed
        }),
        behaviorMetrics: makeBehavior({ abandonmentAttempts: 2 }),
        scaffoldLevel:  2,
        sessionMinutes: 8,
      });

      const decision = await engine.decide(ctx);

      // Multi-modal should override Neutral → Frustration
      expect(decision.rationale.detectedState).toBe('Frustration');
      expect(decision.intervention).toBe('scaffold_up');
    });

    it('should override to Boredom with gaze + behavioral evidence', async () => {
      const ctx = makeContext({
        affectState:     'Neutral',
        competencyScore: 0.80,
        scaffoldLevel:   3,
        sensorSnapshot:  makeSensor({
          au:   { au1: 0.05, au4: 0.08, au6: 0.05, au12: 0.05, au20: 0.05, au23: 0.05 },
          gaze: { offScreenRatio: 0.50, fixationStability: 0.20 },
        }),
        behaviorMetrics: makeBehavior({ clickRatePerMin: 1 }),
      });

      const decision = await engine.decide(ctx);

      // Flat face + gaze off-screen + low clicks → Boredom override
      expect(['scaffold_down', 'challenge']).toContain(decision.intervention);
    });

    it('should NOT override when sensor evidence is weak', async () => {
      const ctx = makeContext({
        affectState:    'Neutral',
        sensorSnapshot: makeSensor({
          au:    { au4: 0.30, au23: 0.25 },  // Weak signals
          voice: { confidenceLevel: 0.60 },    // Normal
          gaze:  { fixationStability: 0.55 },  // Normal
        }),
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('none');
      expect(decision.rationale.detectedState).toBe('Neutral');
    });
  });

  // ── Break Prompt ────────────────────────────────────────────────────────────

  describe('Break Prompt', () => {
    it('should suggest break after 45+ minutes', async () => {
      const ctx = makeContext({
        affectState:    'Neutral',
        sessionMinutes: 50,
        sensorSnapshot: makeSensor({}),
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('break_prompt');
      expect(decision.triggerType).toBe('session_duration');
      expect(decision.contentId).toBe('BREAK-001');
    });

    it('should only give break once per session', async () => {
      const ctx = makeContext({
        affectState:    'Neutral',
        sessionMinutes: 50,
        sensorSnapshot: makeSensor({}),
      });

      const d1 = await engine.decide(ctx);
      expect(d1.intervention).toBe('break_prompt');

      // Second call — same sessionId
      const d2 = await engine.decide(ctx);
      expect(d2.intervention).toBe('none');
    });
  });

  // ── ParticipantId Resolution ────────────────────────────────────────────────

  describe('ParticipantId Resolution', () => {
    it('should resolve participantId to learnerId via Prisma', async () => {
      mockFindUnique.mockResolvedValue({ id: 'uuid-abc-123' });

      const id = await engine.resolveLearnerId('STEP-2026-005');

      expect(id).toBe('uuid-abc-123');
      expect(mockFindUnique).toHaveBeenCalledWith({
        where:  { participantId: 'STEP-2026-005' },
        select: { id: true },
      });
    });

    it('should return null for unknown participantId', async () => {
      mockFindUnique.mockResolvedValue(null);

      const id = await engine.resolveLearnerId('INVALID-ID');

      expect(id).toBeNull();
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle Unknown affect state gracefully', async () => {
      const ctx = makeContext({
        affectState:    'Unknown',
        sensorSnapshot: makeSensor({ au: null, voice: null, gaze: null }),
      });

      const decision = await engine.decide(ctx);

      expect(decision.intervention).toBe('none');
      expect(decision.rationale.detectedState).toBe('Unknown');
    });

    it('should handle missing sensorSnapshot (null from Redis)', async () => {
      mockRedisGet.mockResolvedValue(null);

      const ctx = makeContext({
        affectState: 'Frustration',
        scaffoldLevel: 2,
        sessionMinutes: 8,
        // No sensorSnapshot — engine should fetch from Redis
        behaviorMetrics: makeBehavior({ taskProgressPct: 15 }),
      });
      delete ctx.sensorSnapshot;

      const decision = await engine.decide(ctx);

      // Should still function based on affect + behavior alone
      expect(decision.intervention).toBe('scaffold_up');
    });

    it('should NOT persist event for no-intervention decisions', async () => {
      const ctx = makeContext({
        affectState:    'Neutral',
        sensorSnapshot: makeSensor({}),
        sessionMinutes: 10,
      });

      await engine.decide(ctx);

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should handle Prisma persistence failure gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('DB connection lost'));

      const ctx = makeContext({
        affectState:    'Frustration',
        scaffoldLevel:  2,
        sessionMinutes: 8,
        sensorSnapshot: makeSensor({ au: { au4: 0.70, au23: 0.55 } }),
        behaviorMetrics: makeBehavior({ taskProgressPct: 10 }),
      });

      // Should not throw — error logged but decision still returned
      const decision = await engine.decide(ctx);
      expect(decision.intervention).toBe('scaffold_up');
    });

    it('should support 20-character participantId in Redis keys', async () => {
      const longId = 'STEP-2026-ABCDE12345'; // Exactly 20 chars
      mockRedisGet.mockResolvedValue(null);

      await engine.fetchSensorSnapshot(longId);

      expect(mockRedisGet).toHaveBeenCalledWith(`step:sensor:${longId}:au`);
      expect(mockRedisGet).toHaveBeenCalledWith(`step:sensor:${longId}:voice`);
      expect(mockRedisGet).toHaveBeenCalledWith(`step:sensor:${longId}:gaze`);
    });
  });

  // ── D'Mello Transition Model ────────────────────────────────────────────────

  describe('D\'Mello Transition Model', () => {
    it('should identify Confusion→Frustration as negative cascade', async () => {
      const ctx = makeContext({
        affectState:    'Confusion',
        sensorSnapshot: makeSensor({ au: { au4: 0.65 } }),
        behaviorMetrics: makeBehavior({ dwellTimeSec: 95 }),
      });

      const decision = await engine.decide(ctx);

      const transition = decision.rationale.dmelloTransition;
      expect(transition).toBeDefined();
      expect(transition!.isNegative).toBe(true);
      expect(transition!.windowSec).toBe(90);
    });

    it('should identify Frustration→Boredom as negative cascade', async () => {
      const ctx = makeContext({
        affectState:    'Frustration',
        scaffoldLevel:  2,
        sessionMinutes: 8,
        sensorSnapshot: makeSensor({ au: { au4: 0.70, au23: 0.60 } }),
        behaviorMetrics: makeBehavior({ taskProgressPct: 12 }),
      });

      const decision = await engine.decide(ctx);

      const transition = decision.rationale.dmelloTransition;
      expect(transition).toBeDefined();
      expect(transition!.fromState).toBe('Frustration');
      expect(transition!.toState).toBe('Boredom');
      expect(transition!.probability).toBe(0.32);
    });
  });
});
