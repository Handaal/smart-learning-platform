import * as faceapi from '@vladmandic/face-api';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

const DEFAULT_FRAME_INTERVAL_MS = 900;
const DEFAULT_DETECTOR_INPUT_SIZE = 224;
const DEFAULT_DETECTOR_SCORE_THRESHOLD = 0.28;
const NO_FACE_STREAK_THRESHOLD = 6;
const LOW_FACE_RATIO_THRESHOLD = 0.02;
const OFFSCREEN_HEADTURN_THRESHOLD = 0.62;
const ATTENTIVE_HEADTURN_THRESHOLD = 0.48;
const ATTENTIVE_FACE_RATIO_THRESHOLD = 0.028;
const ATTENTIVE_STREAK_FOR_FOCUS = 6;
const FOCUS_PRESENCE_SCORE_THRESHOLD = 0.68;

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`;
}

function modelUrlCandidates() {
  const configured = import.meta.env.VITE_FACE_API_MODEL_URL
    ? [String(import.meta.env.VITE_FACE_API_MODEL_URL)]
    : [];

  return [
    ...configured,
    '/faceapi-models',
    '/models/faceapi',
    'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/',
    'https://unpkg.com/@vladmandic/face-api/model/',
  ].map((value) => ensureTrailingSlash(value));
}

async function preflightModelSource(baseUrl: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(
      `${baseUrl}tiny_face_detector_model-weights_manifest.json`,
      {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      },
    );

    if (!response.ok) return false;
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('json')) return false;

    const text = await response.text();
    return text.trimStart().startsWith('[') || text.trimStart().startsWith('{');
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 5000, accept = 'json-or-binary') {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) return false;

    const contentType = response.headers.get('content-type') ?? '';
    if (accept === 'json') return contentType.toLowerCase().includes('json');
    if (accept === 'binary') {
      return (
        contentType.toLowerCase().includes('octet-stream') ||
        contentType.toLowerCase().includes('application/octet-stream') ||
        contentType.toLowerCase().includes('binary')
      );
    }

    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: number | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getRealtimeBaseUrl() {
  const configuredApiBase = import.meta.env.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL)
    : '';

  if (configuredApiBase) {
    return configuredApiBase.replace(/\/api\/?$/i, '');
  }

  if (typeof window !== 'undefined') {
    if (import.meta.env.DEV) {
      return `${window.location.protocol}//${window.location.hostname}:3002`;
    }
    return window.location.origin;
  }

  return 'http://127.0.0.1:3002';
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
};

export type EmotionTrackerLocalFrame = {
  timestamp: string;
  faceDetected: boolean;
  localEmotion: LocalEmotionState | string;
  confidence: number;
  detectorScore: number;
  expressions?: Record<string, number>;
};

function detectLocalEmotion(
  detection: faceapi.WithFaceExpressions<faceapi.WithFaceDetection<{}>>,
): { state: LocalEmotionState; confidence: number } {
  const expressions = detection.expressions;
  const detectorScore = detection.detection.score ?? 0;
  const angryMix = expressions.angry + expressions.disgusted;
  const uncertainMix = expressions.fearful + expressions.surprised;
  const calmNeutral = expressions.neutral;
  const positive = expressions.happy;
  const sadness = expressions.sad;
  const activationPeak = Math.max(positive, angryMix, uncertainMix, sadness);
  const strainScore = angryMix * 0.8 + uncertainMix * 0.2;
  const uncertaintyScore = uncertainMix * 0.78 + sadness * 0.22;
  const anxietyScore = expressions.fearful * 0.72 + expressions.surprised * 0.18 + sadness * 0.1;

  if (strainScore >= 0.66 && calmNeutral < 0.66) {
    return { state: 'frustration', confidence: Math.max(strainScore, detectorScore) };
  }

  if (anxietyScore >= 0.55 && calmNeutral < 0.74) {
    return { state: 'test_anxiety', confidence: Math.max(anxietyScore, detectorScore) };
  }

  if (uncertaintyScore >= 0.57 || (uncertaintyScore >= 0.46 && calmNeutral >= 0.28)) {
    return { state: 'confusion', confidence: Math.max(uncertaintyScore, detectorScore) };
  }

  if (positive >= 0.5 || (calmNeutral >= 0.72 && detectorScore >= 0.78 && uncertaintyScore < 0.48)) {
    return { state: 'high_engagement', confidence: Math.max(positive, calmNeutral, detectorScore) };
  }

  if (calmNeutral >= 0.9 && activationPeak < 0.28 && detectorScore >= 0.62) {
    return { state: 'boredom_disengagement', confidence: Math.max(calmNeutral, detectorScore) };
  }

  if (calmNeutral >= 0.45) {
    return { state: 'neutral', confidence: Math.max(calmNeutral, detectorScore) };
  }

  return { state: 'no_face_low_confidence', confidence: detectorScore };
}

export class EmotionTracker {
  private socket: Socket | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private loopInterval: number | null = null;
  private isModelsLoaded = false;
  private hasSsdModel = false;
  private frameLocked = false;
  private noFaceStreak = 0;
  private offScreenStreak = 0;
  private attentiveStreak = 0;
  private nativeFaceDetector: any = null;
  private reportedNativeUnavailable = false;
  private lastOperationalFallbackReason: string | null = null;
  private lastHighEngagementReason: string | null = null;
  private lastFallbackReason: string | null = null;
  private lastDecisionReason: string | null = null;
  private transitionCount = 0;
  private confidenceHistory: number[] = [];
  private rawStateHistory: Array<{ state: LocalEmotionState | string; confidence: number }> = [];
  private smoothedStateHistory: Array<{ state: LocalEmotionState | string; confidence: number }> = [];
  private stableLocalState: LocalEmotionState | string = 'neutral';
  private stableLocalStateSinceMs = Date.now();
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
    this.diagnostics = {
      ...this.diagnostics,
      ...partial,
    };
    this.onDiagnostics?.({ ...this.diagnostics });
  }

  private reportRuntimeError(message: string, alsoConsole = true) {
    this.updateDiagnostics({ runtimeError: message });
    this.onError?.(message);
    if (alsoConsole) {
      console.error('[EmotionTracker]', message);
    }
  }

  private pushRawState(state: LocalEmotionState | string, confidence: number) {
    this.rawStateHistory.push({ state, confidence });
    if (this.rawStateHistory.length > 10) this.rawStateHistory.shift();
  }

  private pushSmoothedState(state: LocalEmotionState | string, confidence: number) {
    this.smoothedStateHistory.push({ state, confidence });
    if (this.smoothedStateHistory.length > 10) this.smoothedStateHistory.shift();
  }

  private pushConfidence(value: number) {
    this.confidenceHistory.push(value);
    if (this.confidenceHistory.length > 10) this.confidenceHistory.shift();
  }

  private applyStateSmoothing(candidate: LocalEmotionState | string, confidence: number) {
    this.pushSmoothedState(candidate, confidence);

    const weightByState = new Map<string, number>();
    for (const entry of this.smoothedStateHistory) {
      weightByState.set(entry.state, (weightByState.get(entry.state) ?? 0) + Math.max(entry.confidence, 0.35));
    }

    const ordered = [...weightByState.entries()].sort((a, b) => b[1] - a[1]);
    const [dominantState, dominantWeight] = ordered[0] ?? [this.stableLocalState, 1];
    const totalWeight = [...weightByState.values()].reduce((sum, value) => sum + value, 0) || 1;
    const dominanceRatio = dominantWeight / totalWeight;
    const dominantCount = this.smoothedStateHistory.filter((entry) => entry.state === dominantState).length;

    let holdApplied = false;

    if (dominantState !== this.stableLocalState) {
      const requiresVeryStrongProof = dominantState === 'no_face_low_confidence';
      const requiresFocusProof = dominantState === 'high_engagement';
      const minRatio = requiresVeryStrongProof ? 0.76 : requiresFocusProof ? 0.62 : 0.58;
      const minVotes = requiresVeryStrongProof ? 4 : requiresFocusProof ? 3 : 2;
      if (dominanceRatio >= minRatio && dominantCount >= minVotes) {
        this.transitionCount += 1;
        this.stableLocalState = dominantState;
        this.stableLocalStateSinceMs = Date.now();
      } else {
        holdApplied = true;
      }
    }

    return {
      state: this.stableLocalState,
      holdApplied,
      dominantState,
      dominanceRatio,
      dominantCount,
    };
  }

  private updateClassificationDiagnostics(timestamp: string, smoothingHold = false) {
    const lastTimestampMs = Date.parse(timestamp);
    const durationSec = Number.isNaN(lastTimestampMs)
      ? (Date.now() - this.stableLocalStateSinceMs) / 1000
      : (lastTimestampMs - this.stableLocalStateSinceMs) / 1000;

    this.updateDiagnostics({
      faceStabilityScore: Math.max(0, Math.min(1, this.attentiveStreak / 6)),
      recentRawPredictions: this.rawStateHistory.map((entry) => `${entry.state} ${Math.round(entry.confidence * 100)}%`),
      recentSmoothedStates: this.smoothedStateHistory.map((entry) => `${entry.state} ${Math.round(entry.confidence * 100)}%`),
      operationalFallbackReason: this.lastOperationalFallbackReason,
      highEngagementReason: this.lastHighEngagementReason,
      fallbackReason: this.lastFallbackReason,
      stateDurationSec: Math.max(0, durationSec),
      transitionCount: this.transitionCount,
      confidenceHistory: [...this.confidenceHistory],
      smoothingHold,
      currentDecisionReason: this.lastDecisionReason,
    });
  }

  private async waitForVideoReady(videoElement: HTMLVideoElement, timeoutMs = 10000) {
    if (videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
      this.updateDiagnostics({ videoReady: true });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        if (videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
          cleanup();
          this.updateDiagnostics({ videoReady: true });
          resolve();
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          cleanup();
          reject(new Error('Video element did not become ready in time.'));
        }
      }, 120);

      const cleanup = () => {
        clearInterval(timer);
        videoElement.removeEventListener('loadeddata', handleReady);
        videoElement.removeEventListener('canplay', handleReady);
        videoElement.removeEventListener('playing', handleReady);
      };

      const handleReady = () => {
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
          cleanup();
          this.updateDiagnostics({ videoReady: true });
          resolve();
        }
      };

      videoElement.addEventListener('loadeddata', handleReady);
      videoElement.addEventListener('canplay', handleReady);
      videoElement.addEventListener('playing', handleReady);
    });
  }

  private async loadModels() {
    if (this.isModelsLoaded) return;

    const errors: string[] = [];

    for (const candidate of modelUrlCandidates()) {
      const hasTinyManifest = await preflightModelSource(candidate);
      const hasTinyBin = await fetchWithTimeout(
        `${candidate}tiny_face_detector_model.bin`,
        5000,
        'binary',
      );
      const hasExpressionManifest = await fetchWithTimeout(
        `${candidate}face_expression_model-weights_manifest.json`,
        5000,
        'json',
      );
      const hasExpressionBin = await fetchWithTimeout(
        `${candidate}face_expression_model.bin`,
        5000,
        'binary',
      );

      if (!hasTinyManifest || !hasTinyBin || !hasExpressionManifest || !hasExpressionBin) {
        errors.push(`${candidate} -> required tiny/expression files unavailable`);
        continue;
      }

      try {
        await withTimeout(
          Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(candidate),
            faceapi.nets.faceExpressionNet.loadFromUri(candidate),
          ]),
          12000,
          `Face model load (${candidate})`,
        );

        const hasSsdManifest = await fetchWithTimeout(
          `${candidate}ssd_mobilenetv1_model-weights_manifest.json`,
          3500,
          'json',
        );
        const hasSsdBin = await fetchWithTimeout(
          `${candidate}ssd_mobilenetv1_model.bin`,
          3500,
          'binary',
        );

        if (hasSsdManifest && hasSsdBin) {
          try {
            await withTimeout(
              faceapi.nets.ssdMobilenetv1.loadFromUri(candidate),
              15000,
              `SSD model load (${candidate})`,
            );
            this.hasSsdModel = true;
          } catch {
            this.hasSsdModel = false;
          }
        } else {
          this.hasSsdModel = false;
        }

        this.isModelsLoaded = true;
        this.updateDiagnostics({
          modelLoaded: true,
          modelSource: candidate,
          modelError: null,
        });
        return;
      } catch (error) {
        errors.push(`${candidate} -> ${error instanceof Error ? error.message : 'Unknown model load error'}`);
      }
    }

    const message = `Failed to load Face API models. Tried: ${errors.join(' | ')}`;
    this.updateDiagnostics({
      modelLoaded: false,
      modelError: message,
    });
    throw new Error(message);
  }

  private ensureNativeFaceDetector() {
    if (this.nativeFaceDetector) return;
    const NativeFaceDetector = (window as any).FaceDetector;
    if (NativeFaceDetector) {
      try {
        this.nativeFaceDetector = new NativeFaceDetector({
          fastMode: true,
          maxDetectedFaces: 1,
        });
      } catch {
        this.nativeFaceDetector = null;
      }
    }
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

    this.socket.on('disconnect', () => {
      this.updateDiagnostics({ socketConnected: false });
    });

    this.socket.on('connect_error', (error) => {
      this.updateDiagnostics({ socketConnected: false });
      this.reportRuntimeError(`Socket connection failed: ${error.message}`);
    });

    this.socket.on('affect_state', (state) => {
      const calibration = (state as any)?.calibration;
      if (calibration) {
        const reasonText = typeof calibration.reason === 'string' ? calibration.reason : null;
        this.updateDiagnostics({
          operationalFallbackReason: reasonText?.includes('face_lost') || reasonText?.includes('offscreen')
            ? reasonText
            : this.diagnostics.operationalFallbackReason,
          highEngagementReason:
            reasonText?.includes('engagement') || reasonText?.includes('focus')
              ? reasonText
              : this.diagnostics.highEngagementReason,
          fallbackReason: reasonText?.includes('fallback') || reasonText?.includes('hold:')
            ? reasonText
            : this.diagnostics.fallbackReason,
          stateDurationSec:
            typeof calibration.stateDurationSec === 'number'
              ? calibration.stateDurationSec
              : this.diagnostics.stateDurationSec,
          recentSmoothedStates: Array.isArray(calibration.smoothingWindow)
            ? calibration.smoothingWindow.map((item: unknown) => String(item))
            : this.diagnostics.recentSmoothedStates,
          transitionCount:
            typeof calibration.transitionCount === 'number'
              ? calibration.transitionCount
              : this.diagnostics.transitionCount,
          confidenceHistory: Array.isArray(calibration.confidenceWindow)
            ? calibration.confidenceWindow
                .map((item: unknown) => Number(item))
                .filter((item: number) => Number.isFinite(item))
            : this.diagnostics.confidenceHistory,
          faceStabilityScore:
            typeof calibration?.signalSnapshot?.attentionScore === 'number'
              ? calibration.signalSnapshot.attentionScore
              : this.diagnostics.faceStabilityScore,
          smoothingHold:
            typeof calibration.smoothingHold === 'boolean'
              ? calibration.smoothingHold
              : this.diagnostics.smoothingHold,
          currentDecisionReason: reasonText ?? this.diagnostics.currentDecisionReason,
        });
      }
      this.onStateUpdate?.(state);
    });

    this.socket.on('adaptation', (decision) => {
      this.onIntervention?.(decision);
    });
  }

  async initialize(videoElement: HTMLVideoElement) {
    this.videoEl = videoElement;
    this.updateDiagnostics({
      webcamActive: true,
      runtimeError: null,
      modelError: null,
      videoReady: videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0,
    });

    this.initSocket();
    this.ensureNativeFaceDetector();

    void this.waitForVideoReady(videoElement)
      .then(() => {
        this.updateDiagnostics({ videoReady: true });
      })
      .catch((error) => {
        this.updateDiagnostics({ videoReady: false });
        this.reportRuntimeError(error instanceof Error ? error.message : 'Video readiness check failed', false);
      });

    void this.loadModels().catch((error) => {
      const message = error instanceof Error ? error.message : 'Face model loading failed';
      this.updateDiagnostics({ modelLoaded: false, modelError: message });
      this.onError?.(message);
      console.warn('[EmotionTracker] falling back to native detector:', message);
    });
  }

  startTracking() {
    if (!this.videoEl) {
      this.reportRuntimeError('Cannot start inference: video element is missing.');
      return;
    }

    if (this.loopInterval) return;

    const frameIntervalMs = this.options.frameIntervalMs ?? DEFAULT_FRAME_INTERVAL_MS;
    const detectorInputSize = this.options.detectorInputSize ?? DEFAULT_DETECTOR_INPUT_SIZE;
    const detectorScoreThreshold = this.options.detectorScoreThreshold ?? DEFAULT_DETECTOR_SCORE_THRESHOLD;

    this.updateDiagnostics({
      inferenceRunning: true,
      runtimeError: null,
    });
    this.ensureNativeFaceDetector();

    this.loopInterval = window.setInterval(async () => {
      if (this.frameLocked) return;
      this.frameLocked = true;

      try {
        if (!this.videoEl) return;
        if (this.videoEl.readyState < 2 || this.videoEl.videoWidth <= 0 || this.videoEl.videoHeight <= 0) {
          this.updateDiagnostics({ videoReady: false });
          return;
        }

        this.updateDiagnostics({ videoReady: true });

        let detection: faceapi.WithFaceExpressions<faceapi.WithFaceDetection<{}>> | undefined;
        if (this.isModelsLoaded) {
          detection = await faceapi
            .detectSingleFace(
              this.videoEl,
              new faceapi.TinyFaceDetectorOptions({
                inputSize: detectorInputSize,
                scoreThreshold: detectorScoreThreshold,
              }),
            )
            .withFaceExpressions();
        }

        if (!detection) {
          this.noFaceStreak += 1;
        } else {
          this.noFaceStreak = 0;
        }

        if (!detection && this.hasSsdModel && this.noFaceStreak >= 2) {
          detection = await faceapi
            .detectSingleFace(
              this.videoEl,
              new faceapi.SsdMobilenetv1Options({
                minConfidence: 0.15,
                maxResults: 1,
              }),
            )
            .withFaceExpressions();

          if (detection) {
            this.noFaceStreak = 0;
          }
        }

        let nativeFaceMetrics:
          | {
              faceAreaRatio: number;
              headTurnScore: number;
              fallbackConfidence: number;
            }
          | null = null;

        if (!detection && this.nativeFaceDetector && this.noFaceStreak >= 1) {
          try {
            const faces = await this.nativeFaceDetector.detect(this.videoEl);
            if (Array.isArray(faces) && faces.length > 0) {
              const firstFace = faces[0] as { boundingBox?: { x: number; y: number; width: number; height: number } };
              const box = firstFace?.boundingBox;
              const frameWidth = this.videoEl.videoWidth || 1;
              const frameHeight = this.videoEl.videoHeight || 1;
              const width = box?.width ?? frameWidth * 0.45;
              const height = box?.height ?? frameHeight * 0.45;
              const x = box?.x ?? frameWidth * 0.27;
              const faceAreaRatio = Math.min((width * height) / (frameWidth * frameHeight), 1);
              const faceCenterX = (x + width / 2) / frameWidth;
              const headTurnScore = Math.min(Math.abs(faceCenterX - 0.5) * 1.6, 1);
              const fallbackConfidence = Math.max(0.55, Math.min(0.82, 0.45 + faceAreaRatio));
              this.noFaceStreak = 0;
              nativeFaceMetrics = {
                faceAreaRatio,
                headTurnScore,
                fallbackConfidence,
              };
            }
          } catch {
            // Continue to normal no-face handling below.
          }
        }

        if (!detection && !this.nativeFaceDetector && !this.reportedNativeUnavailable) {
          this.reportedNativeUnavailable = true;
          this.reportRuntimeError('Native FaceDetector API is unavailable in this browser runtime.');
        }

        const timestamp = new Date().toISOString();

        if (detection || nativeFaceMetrics) {
          const frameWidth = this.videoEl.videoWidth || 1;
          const frameHeight = this.videoEl.videoHeight || 1;
          const detectionBox = detection?.detection.box;

          const faceAreaRatio = nativeFaceMetrics
            ? nativeFaceMetrics.faceAreaRatio
            : Math.min(((detectionBox?.width ?? 0) * (detectionBox?.height ?? 0)) / (frameWidth * frameHeight), 1);

          const faceCenterX = detectionBox ? (detectionBox.x + detectionBox.width / 2) / frameWidth : 0.5;
          const headTurnScore = nativeFaceMetrics
            ? nativeFaceMetrics.headTurnScore
            : Math.min(Math.abs(faceCenterX - 0.5) * 1.6, 1);

          const detectorScore = nativeFaceMetrics
            ? nativeFaceMetrics.fallbackConfidence
            : detection?.detection.score ?? 0;

          const local = detection
            ? detectLocalEmotion(detection)
            : {
                state: 'neutral' as LocalEmotionState,
                confidence: Math.max(detectorScore, 0.55),
              };

          this.lastOperationalFallbackReason = null;
          this.lastHighEngagementReason = null;
          this.lastFallbackReason = null;

          const attentivePresenceScore = Math.max(
            0,
            Math.min(
              1,
              (1 - headTurnScore) * 0.44 +
                Math.min(faceAreaRatio / 0.2, 1) * 0.36 +
                Math.max(local.confidence, detectorScore) * 0.2,
            ),
          );
          const attentiveEvidence =
            faceAreaRatio >= ATTENTIVE_FACE_RATIO_THRESHOLD &&
            headTurnScore <= ATTENTIVE_HEADTURN_THRESHOLD &&
            attentivePresenceScore >= 0.56;
          const lowPresenceEvidence =
            faceAreaRatio < LOW_FACE_RATIO_THRESHOLD &&
            detectorScore < 0.58 &&
            local.confidence < 0.62;
          const offScreenEvidence =
            headTurnScore >= OFFSCREEN_HEADTURN_THRESHOLD ||
            (headTurnScore >= 0.52 && faceAreaRatio < 0.03 && attentivePresenceScore < 0.45) ||
            (lowPresenceEvidence && attentivePresenceScore < 0.4);

          this.offScreenStreak = offScreenEvidence ? this.offScreenStreak + 1 : 0;
          this.attentiveStreak = attentiveEvidence
            ? Math.min(this.attentiveStreak + 1, 24)
            : Math.max(this.attentiveStreak - 1, 0);

          let candidateState: LocalEmotionState | string = local.state;
          let decisionReason = `raw:${local.state}`;
          if (this.offScreenStreak >= NO_FACE_STREAK_THRESHOLD) {
            candidateState = 'no_face_low_confidence';
            this.lastOperationalFallbackReason = `head_turn_or_offscreen_streak_${this.offScreenStreak}`;
            decisionReason = `face_lost:offscreen_streak_${this.offScreenStreak}`;
          } else if (
            local.state === 'no_face_low_confidence' &&
            this.offScreenStreak < Math.max(2, NO_FACE_STREAK_THRESHOLD - 2) &&
            attentivePresenceScore >= 0.58
          ) {
            candidateState = this.attentiveStreak >= 4 ? 'high_engagement' : 'neutral';
            this.lastFallbackReason = 'face_lost_softened_due_to_recovered_attention';
            decisionReason = 'fallback:face_lost_softened_due_to_recovered_attention';
          } else if (
            (local.state === 'no_face_low_confidence' || local.state === 'neutral') &&
            this.attentiveStreak >= ATTENTIVE_STREAK_FOR_FOCUS &&
            local.confidence >= 0.54 &&
            attentivePresenceScore >= FOCUS_PRESENCE_SCORE_THRESHOLD
          ) {
            candidateState = 'high_engagement';
            this.lastHighEngagementReason = `high_engagement_presence_streak_${this.attentiveStreak}`;
            decisionReason = `high_engagement:presence_streak_${this.attentiveStreak}`;
          } else if (
            local.state === 'boredom_disengagement' &&
            (this.attentiveStreak >= 3 || attentivePresenceScore >= 0.62) &&
            local.confidence < 0.84
          ) {
            candidateState = 'neutral';
            this.lastFallbackReason = 'boredom_overridden_by_stable_attention';
            decisionReason = 'fallback:boredom_overridden_by_stable_attention';
          } else if (
            local.state === 'frustration' &&
            local.confidence < 0.72 &&
            attentiveEvidence &&
            this.offScreenStreak === 0
          ) {
            candidateState = 'confusion';
            this.lastFallbackReason = 'frustration_softened_to_confusion_due_to_low_strain';
            decisionReason = 'fallback:frustration_softened_to_confusion';
          } else if (
            local.state === 'confusion' &&
            attentiveEvidence &&
            this.attentiveStreak >= 3 &&
            local.confidence < 0.66
          ) {
            candidateState = 'neutral';
            this.lastFallbackReason = 'confusion_softened_to_neutral_during_stable_attention';
            decisionReason = 'fallback:confusion_softened_to_neutral';
          } else if (
            (local.state === 'no_face_low_confidence' || local.state === 'neutral' || local.state === 'boredom_disengagement') &&
            attentivePresenceScore >= 0.64 &&
            this.offScreenStreak === 0 &&
            local.confidence >= 0.45
          ) {
            candidateState = this.attentiveStreak >= ATTENTIVE_STREAK_FOR_FOCUS ? 'high_engagement' : 'neutral';
            this.lastHighEngagementReason =
              candidateState === 'high_engagement'
                ? `high_engagement:presence_score_${Math.round(attentivePresenceScore * 100)}`
                : this.lastHighEngagementReason;
            this.lastFallbackReason =
              candidateState === 'neutral'
                ? 'fallback:neutral_attentive_presence'
                : this.lastFallbackReason;
            decisionReason =
              candidateState === 'high_engagement'
                ? `high_engagement:presence_score_${Math.round(attentivePresenceScore * 100)}`
                : 'fallback:neutral_attentive_presence';
          } else if (
            local.state === 'no_face_low_confidence' &&
            local.confidence < 0.52 &&
            this.stableLocalState !== 'no_face_low_confidence'
          ) {
            candidateState = this.stableLocalState;
            this.lastFallbackReason = 'hold_previous_state_on_ambiguous_frame';
            decisionReason = 'fallback:hold_previous_state_on_ambiguous_frame';
          }

          this.pushRawState(local.state, local.confidence);
          const blendedConfidence = Math.max(local.confidence, detectorScore, 0.4);
          this.pushConfidence(blendedConfidence);

          const smoothing = this.applyStateSmoothing(
            candidateState,
            blendedConfidence,
          );
          const smoothedState = smoothing.state;
          this.lastDecisionReason = `${decisionReason}|smooth:${smoothing.dominantState}|ratio:${Math.round(smoothing.dominanceRatio * 100)}|votes:${smoothing.dominantCount}`;
          if (smoothing.holdApplied && !this.lastFallbackReason) {
            this.lastFallbackReason = 'smoothing_hold_previous_state';
          }

          this.updateDiagnostics({
            faceDetected: true,
            lastEmotion: smoothedState,
            lastConfidence: blendedConfidence,
            framesAnalyzed: this.diagnostics.framesAnalyzed + 1,
            lastDetectionTimestamp: timestamp,
          });
          this.updateClassificationDiagnostics(timestamp, smoothing.holdApplied);

          const payload = detection
            ? this.buildDetectedPayload(detection)
            : this.buildNativeDetectedPayload({
                confidence: Math.max(local.confidence, detectorScore),
                faceVisibleRatio: faceAreaRatio,
                headTurnScore,
                passiveExpressionScore: smoothedState === 'no_face_low_confidence' ? 0.75 : 0.24,
              });

          const calibratedPayload = {
            ...payload,
            classifiedState: smoothedState as any,
            facialSignals: {
              ...(payload.facialSignals ?? {}),
              faceDetected: true,
              faceVisibleRatio: faceAreaRatio,
              headTurnScore,
              passiveExpressionScore:
                payload.facialSignals?.passiveExpressionScore ?? (smoothedState === 'no_face_low_confidence' ? 0.58 : 0.22),
              yawnScore: payload.facialSignals?.yawnScore ?? 0.05,
            },
          };

          const expressions = detection?.expressions as unknown as Record<string, number> | undefined;
          this.onLocalFrame?.({
            timestamp,
            faceDetected: true,
            localEmotion: smoothedState,
            confidence: blendedConfidence,
            detectorScore,
            expressions,
          });

          this.socket?.emit('emotion_frame', calibratedPayload);
        } else {
          const payload = this.buildMissingFacePayload();
          const noFaceCandidate =
            this.noFaceStreak >= NO_FACE_STREAK_THRESHOLD
              ? ('no_face_low_confidence' as LocalEmotionState)
              : this.stableLocalState !== 'no_face_low_confidence'
                ? this.stableLocalState
                : ('neutral' as LocalEmotionState);

          this.lastHighEngagementReason = null;
          if (this.noFaceStreak >= NO_FACE_STREAK_THRESHOLD) {
            this.lastOperationalFallbackReason = `no_face_streak_${this.noFaceStreak}`;
            this.lastFallbackReason = null;
          } else {
            this.lastFallbackReason = 'holding_previous_state_until_absence_threshold';
          }

          this.pushRawState('no_face_low_confidence', 0);
          this.pushConfidence(this.noFaceStreak >= NO_FACE_STREAK_THRESHOLD ? 0.72 : 0.35);
          const smoothing = this.applyStateSmoothing(
            noFaceCandidate,
            this.noFaceStreak >= NO_FACE_STREAK_THRESHOLD ? 0.72 : 0.35,
          );
          const smoothedState = smoothing.state;
          this.lastDecisionReason =
            this.noFaceStreak >= NO_FACE_STREAK_THRESHOLD
              ? `face_lost:no_face_streak_${this.noFaceStreak}|smooth:${smoothing.dominantState}`
              : `fallback:hold_state_no_face_soft|smooth:${smoothing.dominantState}`;
          if (smoothing.holdApplied && !this.lastFallbackReason) {
            this.lastFallbackReason = 'smoothing_hold_previous_state';
          }
          const calibratedPayload = {
            ...payload,
            classifiedState: smoothedState as any,
          };

          this.updateDiagnostics({
            faceDetected: false,
            lastEmotion: smoothedState,
            lastConfidence: this.noFaceStreak >= NO_FACE_STREAK_THRESHOLD ? 0.72 : 0.35,
            framesAnalyzed: this.diagnostics.framesAnalyzed + 1,
            lastDetectionTimestamp: timestamp,
          });
          this.updateClassificationDiagnostics(timestamp, smoothing.holdApplied);

          this.onLocalFrame?.({
            timestamp,
            faceDetected: false,
            localEmotion: smoothedState,
            confidence: this.noFaceStreak >= NO_FACE_STREAK_THRESHOLD ? 0.72 : 0.35,
            detectorScore: 0,
          });

          this.socket?.emit('emotion_frame', calibratedPayload);
        }
      } catch (error) {
        this.reportRuntimeError(`Inference loop error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        this.frameLocked = false;
      }
    }, frameIntervalMs);
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

    this.rawStateHistory = [];
    this.smoothedStateHistory = [];
    this.confidenceHistory = [];
    this.transitionCount = 0;
    this.lastDecisionReason = null;

    this.updateDiagnostics({
      inferenceRunning: false,
      socketConnected: false,
      webcamActive: false,
      operationalFallbackReason: null,
      highEngagementReason: null,
      fallbackReason: null,
      transitionCount: 0,
      confidenceHistory: [],
      smoothingHold: false,
      currentDecisionReason: null,
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
    const abandonmentAttempts =
      typeof context.abandonmentAttempts === 'number' ? context.abandonmentAttempts : 0;
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
      clickRatePerMin: clickCount > 0 ? (clickCount / (dwellSecs / 60)) || 0 : 0,
      taskProgressPct: taskProgress,
      pageReturns,
      hintRequests,
      abandonmentAttempts,
      typingRateWpm,
      backspaceRatio,
      ...context,
    });
  }

  private buildDetectedPayload(detection: faceapi.WithFaceExpressions<faceapi.WithFaceDetection<{}>>) {
    const expr = detection.expressions;
    const box = detection.detection.box;
    const frameWidth = this.videoEl?.videoWidth || 1;
    const frameHeight = this.videoEl?.videoHeight || 1;
    const faceAreaRatio = Math.min((box.width * box.height) / (frameWidth * frameHeight), 1);
    const faceCenterX = (box.x + box.width / 2) / frameWidth;
    const headTurnScore = Math.min(Math.abs(faceCenterX - 0.5) * 1.6, 1);
    const activation = Math.max(
      expr.angry,
      expr.disgusted,
      expr.fearful,
      expr.happy,
      expr.neutral,
      expr.sad,
      expr.surprised,
    );

    return {
      sessionId: this.sessionId,
      episodeId: this.episodeId,
      timestamp: new Date().toISOString(),
      auVector: {
        au1: expr.surprised + expr.sad,
        au4: expr.angry * 0.8 + expr.disgusted * 0.2,
        au6: expr.happy * 0.5,
        au12: expr.happy,
        au20: expr.fearful,
        au23: expr.angry * 0.5,
        confidence: detection.detection.score,
      },
      facialSignals: {
        faceDetected: true,
        faceVisibleRatio: faceAreaRatio,
        headTurnScore,
        passiveExpressionScore: Math.max(0, 1 - activation),
        yawnScore: Math.max(0, expr.surprised - expr.happy * 0.5),
      },
    };
  }

  private buildMissingFacePayload() {
    return {
      sessionId: this.sessionId,
      episodeId: this.episodeId,
      timestamp: new Date().toISOString(),
      auVector: {
        au1: 0,
        au4: 0,
        au6: 0,
        au12: 0,
        au20: 0,
        au23: 0,
        confidence: 0,
      },
      facialSignals: {
        faceDetected: false,
        faceVisibleRatio: 0,
        headTurnScore: 1,
        passiveExpressionScore: 1,
        yawnScore: 0,
      },
    };
  }

  private buildNativeDetectedPayload(input: {
    confidence: number;
    faceVisibleRatio: number;
    headTurnScore: number;
    passiveExpressionScore: number;
  }) {
    return {
      sessionId: this.sessionId,
      episodeId: this.episodeId,
      timestamp: new Date().toISOString(),
      auVector: {
        au1: 0.1,
        au4: input.headTurnScore > 0.65 ? 0.22 : 0.06,
        au6: input.headTurnScore > 0.65 ? 0.02 : 0.16,
        au12: input.headTurnScore > 0.65 ? 0.03 : 0.14,
        au20: 0.05,
        au23: input.headTurnScore > 0.65 ? 0.18 : 0.04,
        confidence: input.confidence,
      },
      facialSignals: {
        faceDetected: true,
        faceVisibleRatio: input.faceVisibleRatio,
        headTurnScore: input.headTurnScore,
        passiveExpressionScore: input.passiveExpressionScore,
        yawnScore: 0.05,
      },
    };
  }
}
