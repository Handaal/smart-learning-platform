import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

/**
 * EmotionTracker — MediaPipe Face Landmarker (blendshapes) → real Action Units
 *
 * Replaces the previous face-api basic-emotion proxy. MediaPipe outputs 52
 * Google-calibrated blendshape coefficients (0..1); we map the relevant ones to
 * the 6 FACS Action Units the research pipeline expects (au1/4/6/12/20/23) and
 * subtract a per-session neutral baseline so values are personalised.
 *
 * The previous implementation is preserved at emotionTracker.faceapi.bak.ts.
 * Rollback = restore that file over this one.
 */

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';

function modelUrlCandidates() {
  const configured = import.meta.env.VITE_FACE_LANDMARKER_URL
    ? [String(import.meta.env.VITE_FACE_LANDMARKER_URL)]
    : [];
  return [
    ...configured,
    '/mediapipe/face_landmarker.task',
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  ];
}

const DETECT_INTERVAL_MS = 500; // internal sampling cadence
const EMIT_INTERVAL_MS = 2000; // matches documented "2-second frame" contract
const CALIBRATION_MS = 2500; // collect the participant's neutral baseline
const CALIBRATION_MIN_SAMPLES = 3;
const NO_FACE_STREAK_THRESHOLD = 6;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: number | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function getRealtimeBaseUrl() {
  const configuredApiBase = import.meta.env.VITE_API_BASE_URL ? String(import.meta.env.VITE_API_BASE_URL) : '';
  if (configuredApiBase) return configuredApiBase.replace(/\/api\/?$/i, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://127.0.0.1:3001';
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

type LocalEmotionState =
  | 'no_face_low_confidence'
  | 'boredom_disengagement'
  | 'confusion'
  | 'frustration'
  | 'test_anxiety'
  | 'high_engagement'
  | 'neutral';

export type EmotionTrackerDiagnostics = {
  modelLoaded: boolean;
  modelSource: string | null;
  webcamActive: boolean;
  videoReady: boolean;
  inferenceRunning: boolean;
  socketConnected: boolean;
  faceDetected: boolean;
  lastEmotion: LocalEmotionState | string;
  lastConfidence: number;
  framesAnalyzed: number;
  lastDetectionTimestamp: string | null;
  modelError: string | null;
  runtimeError: string | null;
  faceStabilityScore?: number;
  recentRawPredictions?: string[];
  recentSmoothedStates?: string[];
  operationalFallbackReason?: string | null;
  highEngagementReason?: string | null;
  fallbackReason?: string | null;
  stateDurationSec?: number;
  transitionCount?: number;
  confidenceHistory?: number[];
  smoothingHold?: boolean;
  currentDecisionReason?: string | null;
  calibrating?: boolean;
};

export type EmotionTrackerLocalFrame = {
  timestamp: string;
  faceDetected: boolean;
  localEmotion: LocalEmotionState | string;
  confidence: number;
  detectorScore: number;
  expressions?: Record<string, number>;
};

type AuVector = {
  au1: number;
  au4: number;
  au6: number;
  au12: number;
  au20: number;
  au23: number;
  confidence: number;
};

type FrameSignals = {
  faceVisibleRatio: number;
  headTurnScore: number;
  passiveExpressionScore: number;
  yawnScore: number;
};

/** Map MediaPipe blendshape categories → the 6 research Action Units (pre-baseline). */
function rawAuFromBlendshapes(bs: Map<string, number>): Omit<AuVector, 'confidence'> {
  const g = (name: string) => bs.get(name) ?? 0;
  const mean = (a: string, b: string) => (g(a) + g(b)) / 2;
  return {
    au1: g('browInnerUp'), // inner brow raiser
    au4: mean('browDownLeft', 'browDownRight'), // brow lowerer
    au6: mean('cheekSquintLeft', 'cheekSquintRight'), // cheek raiser
    au12: mean('mouthSmileLeft', 'mouthSmileRight'), // lip corner puller
    au20: mean('mouthStretchLeft', 'mouthStretchRight'), // lip stretcher
    au23: mean('mouthPressLeft', 'mouthPressRight'), // lip tightener
  };
}

/**
 * Light local classifier — diagnostics/preview only. The backend classifier is
 * authoritative for the state shown to the learner; this just animates the
 * researcher validation panel. Thresholds mirror the Python rules and are tuned
 * against deviation-from-neutral AU ranges.
 */
function localStateFromAu(au: AuVector): { state: LocalEmotionState; confidence: number } {
  if (au.confidence < 0.5) return { state: 'no_face_low_confidence', confidence: au.confidence };
  const strain = clamp01(au.au23 * 0.5 + au.au20 * 0.3 + au.au4 * 0.2);
  const uncertainty = clamp01(au.au1 * 0.5 + au.au4 * 0.4 + au.au20 * 0.1);
  const peak = Math.max(au.au1, au.au4, au.au6, au.au12, au.au20, au.au23);

  // 1) Frustration — brow lowered + lips pressed/tight, clearly not smiling
  if (au.au4 > 0.18 && au.au23 > 0.12 && au.au12 < 0.2) {
    return { state: 'frustration', confidence: clamp01(0.6 + strain * 0.3) };
  }
  // 2) Confusion — brow activity (inner raise OR furrow), not smiling, not pressing lips
  if ((au.au1 > 0.12 || au.au4 > 0.12) && au.au12 < 0.22 && au.au23 < 0.15) {
    return { state: 'confusion', confidence: clamp01(0.6 + uncertainty * 0.3) };
  }
  // 3) Test anxiety — lip stretch + inner brow raise
  if (au.au20 > 0.18 && au.au1 > 0.12) {
    return { state: 'test_anxiety', confidence: clamp01(0.6 + (au.au20 + au.au1) * 0.2) };
  }
  // 4) High engagement — a genuine smile (lip-corner pull), not just squinting
  if (au.au12 > 0.18) {
    return { state: 'high_engagement', confidence: clamp01(0.6 + au.au12 * 0.3) };
  }
  // 5) Boredom — near-zero activation (blank, still face)
  if (peak < 0.08) {
    return { state: 'boredom_disengagement', confidence: 0.6 };
  }
  return { state: 'neutral', confidence: 0.62 };
}

export class EmotionTracker {
  private socket: Socket | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private landmarker: FaceLandmarker | null = null;
  private loopInterval: number | null = null;
  private frameLocked = false;
  private isModelLoaded = false;

  private noFaceStreak = 0;
  private framesAnalyzed = 0;

  // Neutral-baseline calibration
  private calibrating = true;
  private calibrationStartMs = 0;
  private calibrationSamples: Array<Omit<AuVector, 'confidence'>> = [];
  private baseline: Omit<AuVector, 'confidence'> | null = null;

  // Emit accumulation (average internal samples into one 2s frame)
  private emitAccumulator: Array<{ au: AuVector; signals: FrameSignals }> = [];
  private lastEmitMs = 0;

  // Light smoothing for the diagnostics display state only
  private displayHistory: LocalEmotionState[] = [];
  private stableDisplayState: LocalEmotionState = 'neutral';
  private stableSinceMs = Date.now();
  private transitionCount = 0;
  private confidenceHistory: number[] = [];
  private rawHistory: string[] = [];

  private diagnostics: EmotionTrackerDiagnostics = {
    modelLoaded: false,
    modelSource: null,
    webcamActive: false,
    videoReady: false,
    inferenceRunning: false,
    socketConnected: false,
    faceDetected: false,
    lastEmotion: 'neutral',
    lastConfidence: 0,
    framesAnalyzed: 0,
    lastDetectionTimestamp: null,
    modelError: null,
    runtimeError: null,
    faceStabilityScore: 0,
    recentRawPredictions: [],
    recentSmoothedStates: [],
    operationalFallbackReason: null,
    highEngagementReason: null,
    fallbackReason: null,
    stateDurationSec: 0,
    transitionCount: 0,
    confidenceHistory: [],
    smoothingHold: false,
    currentDecisionReason: null,
    calibrating: true,
  };

  public onStateUpdate?: (state: any) => void;
  public onIntervention?: (decision: any) => void;
  public onLocalFrame?: (frame: EmotionTrackerLocalFrame) => void;
  public onDiagnostics?: (diagnostics: EmotionTrackerDiagnostics) => void;
  public onError?: (message: string) => void;

  constructor(
    private sessionId: string,
    private episodeId: string,
    private options: {
      frameIntervalMs?: number;
      detectorInputSize?: number;
      detectorScoreThreshold?: number;
    } = {},
  ) {}

  updateSessionContext(sessionId: string, episodeId?: string) {
    this.sessionId = sessionId;
    this.episodeId = episodeId ?? this.episodeId;
  }

  getDiagnostics() {
    return { ...this.diagnostics };
  }

  private updateDiagnostics(partial: Partial<EmotionTrackerDiagnostics>) {
    this.diagnostics = { ...this.diagnostics, ...partial };
    this.onDiagnostics?.({ ...this.diagnostics });
  }

  private reportRuntimeError(message: string, alsoConsole = true) {
    this.updateDiagnostics({ runtimeError: message });
    this.onError?.(message);
    if (alsoConsole) console.error('[EmotionTracker]', message);
  }

  private async waitForVideoReady(videoElement: HTMLVideoElement, timeoutMs = 10000) {
    if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      this.updateDiagnostics({ videoReady: true });
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
          cleanup();
          this.updateDiagnostics({ videoReady: true });
          resolve();
        } else if (Date.now() - startedAt >= timeoutMs) {
          cleanup();
          reject(new Error('Video element did not become ready in time.'));
        }
      }, 120);
      const cleanup = () => clearInterval(timer);
    });
  }

  private async loadModel() {
    if (this.isModelLoaded) return;
    const errors: string[] = [];
    let fileset;
    try {
      fileset = await withTimeout(FilesetResolver.forVisionTasks(WASM_BASE), 15000, 'MediaPipe WASM load');
    } catch (error) {
      const message = `Failed to load MediaPipe runtime: ${error instanceof Error ? error.message : 'unknown'}`;
      this.updateDiagnostics({ modelLoaded: false, modelError: message });
      throw new Error(message);
    }

    for (const modelUrl of modelUrlCandidates()) {
      for (const delegate of ['GPU', 'CPU'] as const) {
        try {
          this.landmarker = await withTimeout(
            FaceLandmarker.createFromOptions(fileset, {
              baseOptions: { modelAssetPath: modelUrl, delegate },
              runningMode: 'VIDEO',
              numFaces: 1,
              outputFaceBlendshapes: true,
              outputFacialTransformationMatrixes: false,
            }),
            15000,
            `FaceLandmarker (${delegate})`,
          );
          this.isModelLoaded = true;
          this.updateDiagnostics({ modelLoaded: true, modelSource: `${modelUrl} (${delegate})`, modelError: null });
          return;
        } catch (error) {
          errors.push(`${modelUrl}/${delegate} -> ${error instanceof Error ? error.message : 'unknown'}`);
        }
      }
    }

    const message = `Failed to load Face Landmarker. Tried: ${errors.join(' | ')}`;
    this.updateDiagnostics({ modelLoaded: false, modelError: message });
    throw new Error(message);
  }

  private initSocket() {
    if (this.socket) return;
    const token = useAuthStore.getState().accessToken;
    const realtimeBase = getRealtimeBaseUrl();

    this.socket = io(realtimeBase, {
      path: '/ws/emotion',
      auth: token ? { token } : undefined,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 6,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      this.updateDiagnostics({ socketConnected: true, runtimeError: null });
      console.log('[EmotionTracker] Connected to /ws/emotion');
    });
    this.socket.on('disconnect', () => this.updateDiagnostics({ socketConnected: false }));
    this.socket.on('connect_error', (error) => {
      this.updateDiagnostics({ socketConnected: false });
      this.reportRuntimeError(`Socket connection failed: ${error.message}`);
    });

    this.socket.on('affect_state', (state) => {
      const calibration = (state as any)?.calibration;
      if (calibration) {
        const reasonText = typeof calibration.reason === 'string' ? calibration.reason : null;
        this.updateDiagnostics({
          stateDurationSec:
            typeof calibration.stateDurationSec === 'number' ? calibration.stateDurationSec : this.diagnostics.stateDurationSec,
          recentSmoothedStates: Array.isArray(calibration.smoothingWindow)
            ? calibration.smoothingWindow.map((item: unknown) => String(item))
            : this.diagnostics.recentSmoothedStates,
          transitionCount:
            typeof calibration.transitionCount === 'number' ? calibration.transitionCount : this.diagnostics.transitionCount,
          confidenceHistory: Array.isArray(calibration.confidenceWindow)
            ? calibration.confidenceWindow.map((item: unknown) => Number(item)).filter((item: number) => Number.isFinite(item))
            : this.diagnostics.confidenceHistory,
          currentDecisionReason: reasonText ?? this.diagnostics.currentDecisionReason,
        });
      }
      this.onStateUpdate?.(state);
    });

    this.socket.on('adaptation', (decision) => this.onIntervention?.(decision));
  }

  async initialize(videoElement: HTMLVideoElement) {
    this.videoEl = videoElement;
    this.updateDiagnostics({
      webcamActive: true,
      runtimeError: null,
      modelError: null,
      videoReady: videoElement.readyState >= 2 && videoElement.videoWidth > 0,
    });

    this.initSocket();

    void this.waitForVideoReady(videoElement)
      .then(() => this.updateDiagnostics({ videoReady: true }))
      .catch((error) => {
        this.updateDiagnostics({ videoReady: false });
        this.reportRuntimeError(error instanceof Error ? error.message : 'Video readiness check failed', false);
      });

    await this.loadModel().catch((error) => {
      const message = error instanceof Error ? error.message : 'Face Landmarker loading failed';
      this.updateDiagnostics({ modelLoaded: false, modelError: message });
      this.onError?.(message);
      console.error('[EmotionTracker]', message);
    });
  }

  startTracking() {
    if (!this.videoEl) {
      this.reportRuntimeError('Cannot start inference: video element is missing.');
      return;
    }
    if (this.loopInterval) return;

    this.calibrating = true;
    this.calibrationStartMs = Date.now();
    this.calibrationSamples = [];
    this.baseline = null;
    this.lastEmitMs = Date.now();
    this.updateDiagnostics({ inferenceRunning: true, runtimeError: null, calibrating: true });

    const detectInterval = Math.max(200, Math.min(this.options.frameIntervalMs ?? DETECT_INTERVAL_MS, EMIT_INTERVAL_MS));
    this.loopInterval = window.setInterval(() => this.tick(), detectInterval);
  }

  private tick() {
    if (this.frameLocked || !this.videoEl || !this.landmarker) return;
    if (this.videoEl.readyState < 2 || this.videoEl.videoWidth <= 0) {
      this.updateDiagnostics({ videoReady: false });
      return;
    }
    this.frameLocked = true;

    try {
      this.updateDiagnostics({ videoReady: true });
      const result = this.landmarker.detectForVideo(this.videoEl, performance.now());
      const landmarks = result.faceLandmarks?.[0];
      const blendshapes = result.faceBlendshapes?.[0]?.categories;
      const now = Date.now();

      if (!landmarks || !blendshapes) {
        this.noFaceStreak += 1;
        this.handleEmit(now, null);
        return;
      }

      this.noFaceStreak = 0;
      const bs = new Map<string, number>(blendshapes.map((c) => [c.categoryName, c.score]));
      const rawAu = rawAuFromBlendshapes(bs);
      const signals = this.computeSignals(landmarks, bs);

      if (this.calibrating) {
        this.calibrationSamples.push(rawAu);
        if (now - this.calibrationStartMs >= CALIBRATION_MS && this.calibrationSamples.length >= CALIBRATION_MIN_SAMPLES) {
          this.baseline = this.averageAu(this.calibrationSamples);
          this.calibrating = false;
          this.updateDiagnostics({ calibrating: false });
        } else {
          this.updateDiagnostics({
            faceDetected: true,
            calibrating: true,
            lastEmotion: 'neutral',
            currentDecisionReason: `calibrating:${this.calibrationSamples.length}`,
          });
          return;
        }
      }

      const au = this.applyBaseline(rawAu, signals);
      this.emitAccumulator.push({ au, signals });
      this.handleEmit(now, { au, signals });
    } catch (error) {
      this.reportRuntimeError(`Inference loop error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.frameLocked = false;
    }
  }

  /** Emit one averaged frame every EMIT_INTERVAL_MS. */
  private handleEmit(now: number, latest: { au: AuVector; signals: FrameSignals } | null) {
    if (now - this.lastEmitMs < EMIT_INTERVAL_MS) return;
    this.lastEmitMs = now;
    const timestamp = new Date(now).toISOString();
    this.framesAnalyzed += 1;

    const faceLost = this.noFaceStreak >= NO_FACE_STREAK_THRESHOLD || (!latest && this.emitAccumulator.length === 0);

    if (faceLost || this.emitAccumulator.length === 0) {
      const payload = this.buildMissingFacePayload();
      this.socket?.emit('emotion_frame', payload);
      this.pushDisplay('no_face_low_confidence');
      this.updateDiagnostics({
        faceDetected: false,
        lastEmotion: this.stableDisplayState,
        lastConfidence: 0,
        framesAnalyzed: this.framesAnalyzed,
        lastDetectionTimestamp: timestamp,
        currentDecisionReason: `no_face_streak_${this.noFaceStreak}`,
      });
      this.onLocalFrame?.({ timestamp, faceDetected: false, localEmotion: this.stableDisplayState, confidence: 0, detectorScore: 0 });
      return;
    }

    const au = this.averageAuVector(this.emitAccumulator.map((e) => e.au));
    const signals = this.emitAccumulator[this.emitAccumulator.length - 1].signals;
    this.emitAccumulator = [];

    const local = localStateFromAu(au);
    // Temporary tuning aid — read these in DevTools while making expressions.
    console.log(
      `[AU] au1=${au.au1.toFixed(2)} au4=${au.au4.toFixed(2)} au6=${au.au6.toFixed(2)} ` +
        `au12=${au.au12.toFixed(2)} au20=${au.au20.toFixed(2)} au23=${au.au23.toFixed(2)} ` +
        `conf=${au.confidence.toFixed(2)} -> ${local.state}`,
    );
    this.pushDisplay(local.state);
    this.confidenceHistory.push(au.confidence);
    if (this.confidenceHistory.length > 10) this.confidenceHistory.shift();
    this.rawHistory.push(`${local.state} ${Math.round(local.confidence * 100)}%`);
    if (this.rawHistory.length > 10) this.rawHistory.shift();

    const payload = {
      sessionId: this.sessionId,
      episodeId: this.episodeId,
      timestamp,
      auVector: au,
      facialSignals: {
        faceDetected: true,
        faceVisibleRatio: signals.faceVisibleRatio,
        headTurnScore: signals.headTurnScore,
        passiveExpressionScore: signals.passiveExpressionScore,
        yawnScore: signals.yawnScore,
      },
      classifiedState: this.stableDisplayState,
    };
    this.socket?.emit('emotion_frame', payload);

    this.updateDiagnostics({
      faceDetected: true,
      lastEmotion: this.stableDisplayState,
      lastConfidence: au.confidence,
      framesAnalyzed: this.framesAnalyzed,
      lastDetectionTimestamp: timestamp,
      calibrating: false,
      faceStabilityScore: clamp01(1 - signals.headTurnScore),
      recentRawPredictions: [...this.rawHistory],
      recentSmoothedStates: [...this.displayHistory],
      stateDurationSec: Math.max(0, (now - this.stableSinceMs) / 1000),
      transitionCount: this.transitionCount,
      confidenceHistory: [...this.confidenceHistory],
      currentDecisionReason: `mediapipe:${local.state}`,
    });
    this.onLocalFrame?.({
      timestamp,
      faceDetected: true,
      localEmotion: this.stableDisplayState,
      confidence: au.confidence,
      detectorScore: au.confidence,
      expressions: { au1: au.au1, au4: au.au4, au6: au.au6, au12: au.au12, au20: au.au20, au23: au.au23 },
    });
  }

  private computeSignals(landmarks: Array<{ x: number; y: number; z: number }>, bs: Map<string, number>): FrameSignals {
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;
    for (const p of landmarks) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const faceVisibleRatio = clamp01((maxX - minX) * (maxY - minY));

    // Head turn (yaw) from facial asymmetry: nose tip (1) vs face edges (234 / 454).
    const nose = landmarks[1];
    const left = landmarks[234];
    const right = landmarks[454];
    let headTurnScore = 1;
    if (nose && left && right) {
      const dxL = Math.abs(nose.x - left.x);
      const dxR = Math.abs(right.x - nose.x);
      const denom = dxL + dxR || 1;
      headTurnScore = clamp01((Math.abs(dxL - dxR) / denom) * 2);
    }

    let maxBlend = 0;
    for (const v of bs.values()) if (v > maxBlend) maxBlend = v;
    const passiveExpressionScore = clamp01(1 - maxBlend);
    const yawnScore = clamp01(bs.get('jawOpen') ?? 0);

    return { faceVisibleRatio, headTurnScore, passiveExpressionScore, yawnScore };
  }

  private applyBaseline(rawAu: Omit<AuVector, 'confidence'>, signals: FrameSignals): AuVector {
    const base = this.baseline ?? { au1: 0, au4: 0, au6: 0, au12: 0, au20: 0, au23: 0 };
    const dev = (k: keyof Omit<AuVector, 'confidence'>) => clamp01(rawAu[k] - base[k]);
    const confidence = clamp01(0.65 + Math.min(signals.faceVisibleRatio / 0.12, 1) * 0.3);
    return {
      au1: dev('au1'),
      au4: dev('au4'),
      au6: dev('au6'),
      au12: dev('au12'),
      au20: dev('au20'),
      au23: dev('au23'),
      confidence,
    };
  }

  private averageAu(samples: Array<Omit<AuVector, 'confidence'>>): Omit<AuVector, 'confidence'> {
    const sum = { au1: 0, au4: 0, au6: 0, au12: 0, au20: 0, au23: 0 };
    for (const s of samples) {
      sum.au1 += s.au1;
      sum.au4 += s.au4;
      sum.au6 += s.au6;
      sum.au12 += s.au12;
      sum.au20 += s.au20;
      sum.au23 += s.au23;
    }
    const n = samples.length || 1;
    return { au1: sum.au1 / n, au4: sum.au4 / n, au6: sum.au6 / n, au12: sum.au12 / n, au20: sum.au20 / n, au23: sum.au23 / n };
  }

  private averageAuVector(samples: AuVector[]): AuVector {
    const base = this.averageAu(samples);
    const conf = samples.reduce((s, x) => s + x.confidence, 0) / (samples.length || 1);
    return { ...base, confidence: conf };
  }

  /** Majority-vote smoothing over the last 5 frames — display/diagnostics only. */
  private pushDisplay(state: LocalEmotionState) {
    this.displayHistory.push(state);
    if (this.displayHistory.length > 5) this.displayHistory.shift();
    const counts = new Map<LocalEmotionState, number>();
    for (const s of this.displayHistory) counts.set(s, (counts.get(s) ?? 0) + 1);
    let best = this.stableDisplayState;
    let bestCount = 0;
    for (const [s, c] of counts) {
      if (c > bestCount) {
        best = s;
        bestCount = c;
      }
    }
    if (best !== this.stableDisplayState && bestCount >= 2) {
      this.transitionCount += 1;
      this.stableDisplayState = best;
      this.stableSinceMs = Date.now();
    }
  }

  private buildMissingFacePayload() {
    return {
      sessionId: this.sessionId,
      episodeId: this.episodeId,
      timestamp: new Date().toISOString(),
      auVector: { au1: 0, au4: 0, au6: 0, au12: 0, au20: 0, au23: 0, confidence: 0 },
      facialSignals: { faceDetected: false, faceVisibleRatio: 0, headTurnScore: 1, passiveExpressionScore: 1, yawnScore: 0 },
      classifiedState: 'no_face_low_confidence' as const,
    };
  }

  stopTracking() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    try {
      this.landmarker?.close();
    } catch {
      /* noop */
    }
    this.landmarker = null;
    this.isModelLoaded = false;
    this.displayHistory = [];
    this.confidenceHistory = [];
    this.rawHistory = [];
    this.emitAccumulator = [];
    this.transitionCount = 0;

    this.updateDiagnostics({
      inferenceRunning: false,
      socketConnected: false,
      webcamActive: false,
      transitionCount: 0,
      confidenceHistory: [],
      currentDecisionReason: null,
      calibrating: false,
    });
  }

  sendBehaviorWindow(
    dwellSecs: number,
    scrollEvents: number,
    rereadCount: number,
    taskProgress: number,
    context: Record<string, unknown> = {},
  ) {
    if (!this.socket) return;
    const clickCount = typeof context.clickCount === 'number' ? context.clickCount : 0;
    const pageReturns = typeof context.pageReturns === 'number' ? context.pageReturns : 0;
    const hintRequests = typeof context.hintRequests === 'number' ? context.hintRequests : 0;
    const abandonmentAttempts = typeof context.abandonmentAttempts === 'number' ? context.abandonmentAttempts : 0;
    const typingRateWpm = typeof context.typingRateWpm === 'number' ? context.typingRateWpm : 0;
    const backspaceRatio = typeof context.backspaceRatio === 'number' ? context.backspaceRatio : 0;
    this.socket.emit('behavior_window', {
      sessionId: this.sessionId,
      episodeId: this.episodeId,
      windowStartIso: new Date(Date.now() - dwellSecs * 1000).toISOString(),
      windowEndIso: new Date().toISOString(),
      dwellTimeSec: dwellSecs,
      scrollEvents,
      rereadCount,
      clickCount,
      clickRatePerMin: clickCount > 0 ? clickCount / (dwellSecs / 60) || 0 : 0,
      taskProgressPct: taskProgress,
      pageReturns,
      hintRequests,
      abandonmentAttempts,
      typingRateWpm,
      backspaceRatio,
      ...context,
    });
  }
}
