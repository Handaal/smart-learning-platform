import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock3,
  Eye,
  Gauge,
  ListChecks,
  Play,
  RefreshCcw,
  Square,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '@/i18n';
import { scenarioApi, sessionApi } from '@/services/api';
import {
  EmotionTracker,
  type EmotionTrackerDiagnostics,
  type EmotionTrackerLocalFrame,
} from '@/services/emotionTracker';
import {
  emotionDisplayName,
  normalizeEmotionState,
  type CanonicalEmotionState,
} from '@/components/research/emotionPresentation';
import styles from './EmotionValidationPage.module.css';

type ValidationStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'error';

type EmotionReading = {
  id: number;
  timestamp: string;
  state: string;
  confidence: number;
  faceDetected: boolean;
  source: 'local' | 'server';
};

type DemoPose = {
  id: string;
  titleKey: string;
  titleFallback: string;
  instructionKey: string;
  instructionFallback: string;
  expected: CanonicalEmotionState[];
};

const MAX_LOG_ITEMS = 80;
const STABILITY_WINDOW = 15;

const EMPTY_DIAGNOSTICS: EmotionTrackerDiagnostics = {
  modelLoaded: false,
  modelSource: null,
  webcamActive: false,
  videoReady: false,
  inferenceRunning: false,
  socketConnected: false,
  faceDetected: false,
  lastEmotion: 'no_face_low_confidence',
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

const DEMO_POSES: DemoPose[] = [
  {
    id: 'neutral',
    titleKey: 'research.emotionValidation.demo.neutral.title',
    titleFallback: 'Neutral baseline',
    instructionKey: 'research.emotionValidation.demo.neutral.instruction',
    instructionFallback: 'Relax your face, look directly at the camera, and hold for 5 seconds.',
    expected: ['neutral', 'high_engagement'],
  },
  {
    id: 'focused',
    titleKey: 'research.emotionValidation.demo.focused.title',
    titleFallback: 'High-engagement readiness',
    instructionKey: 'research.emotionValidation.demo.focused.instruction',
    instructionFallback: 'Keep steady eye contact and attentive posture while reading the screen to simulate a strong engaged state.',
    expected: ['high_engagement'],
  },
  {
    id: 'confused',
    titleKey: 'research.emotionValidation.demo.confused.title',
    titleFallback: 'Confusion expression',
    instructionKey: 'research.emotionValidation.demo.confused.instruction',
    instructionFallback: 'Slightly squint or raise one brow while pausing as if uncertain.',
    expected: ['confusion'],
  },
  {
    id: 'frustrated',
    titleKey: 'research.emotionValidation.demo.frustrated.title',
    titleFallback: 'Frustration expression',
    instructionKey: 'research.emotionValidation.demo.frustrated.instruction',
    instructionFallback: 'Frown lightly, tighten lips, and keep a tense facial posture briefly.',
    expected: ['frustration'],
  },
  {
    id: 'no-face',
    titleKey: 'research.emotionValidation.demo.noFace.title',
    titleFallback: 'No-face / low-confidence test',
    instructionKey: 'research.emotionValidation.demo.noFace.instruction',
    instructionFallback: 'Move away from the frame or reduce face visibility briefly to test the safety fallback.',
    expected: ['no_face_low_confidence'],
  },
];

function formatClock(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function statusTone(status: ValidationStatus) {
  if (status === 'running') return 'success';
  if (status === 'starting') return 'info';
  if (status === 'error') return 'danger';
  if (status === 'stopped') return 'warning';
  return 'neutral';
}

function readingFromLocal(local: EmotionTrackerLocalFrame): EmotionReading {
  return {
    id: Date.now() + Math.random(),
    timestamp: local.timestamp,
    state: local.localEmotion,
    confidence: local.confidence,
    faceDetected: local.faceDetected,
    source: 'local',
  };
}

function readingFromServer(payload: any): EmotionReading {
  const timestamp = payload?.timestamp ?? new Date().toISOString();
  const candidateState = String(payload?.displayState ?? payload?.state ?? payload?.persistedState ?? 'Unknown');
  const normalized = normalizeEmotionState(candidateState);
  const state = normalized ?? (candidateState.toLowerCase().includes('neutral') ? 'neutral' : candidateState);
  const confidence = Number(payload?.confidence ?? 0);
  const faceDetected = payload?.facialSignals?.faceDetected ?? confidence > 0.05;

  return {
    id: Date.now() + Math.random(),
    timestamp,
    state,
    confidence,
    faceDetected,
    source: 'server',
  };
}

export default function EmotionValidationPage() {
  const { t, direction } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackerRef = useRef<EmotionTracker | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);

  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [readings, setReadings] = useState<EmotionReading[]>([]);
  const [diagnostics, setDiagnostics] = useState<EmotionTrackerDiagnostics>(EMPTY_DIAGNOSTICS);
  const [selectedPoseId, setSelectedPoseId] = useState(DEMO_POSES[0].id);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [testStartedAt, setTestStartedAt] = useState<string | null>(null);

  const activePose = useMemo(
    () => DEMO_POSES.find((pose) => pose.id === selectedPoseId) ?? DEMO_POSES[0],
    [selectedPoseId],
  );

  const currentReading = readings[0] ?? null;

  const currentState = useMemo(() => {
    if (currentReading?.state) return currentReading.state;
    if (status === 'idle' || status === 'stopped') return t('research.emotionValidation.states.webcamNotStarted', 'Webcam not started');
    if (!diagnostics.modelLoaded && status === 'starting') return t('research.emotionValidation.states.modelLoading', 'Model loading');
    if (diagnostics.inferenceRunning && !diagnostics.faceDetected) return t('research.emotionValidation.states.noFaceDetected', 'No face detected');
    if (diagnostics.inferenceRunning && diagnostics.faceDetected && diagnostics.lastEmotion) return String(diagnostics.lastEmotion);
    return t('research.emotionValidation.labels.noSignal', 'No signal');
  }, [currentReading?.state, diagnostics.faceDetected, diagnostics.inferenceRunning, diagnostics.lastEmotion, diagnostics.modelLoaded, status, t]);

  const currentEmotionCanonical = normalizeEmotionState(currentState);
  const currentEmotionDisplay = currentEmotionCanonical
    ? emotionDisplayName(currentEmotionCanonical, true, (key, fallback) => t(key, fallback))
    : currentState;

  const pipelineState = useMemo(() => {
    if (status === 'idle' || status === 'stopped') {
      return {
        label: t('research.emotionValidation.states.webcamNotStarted', 'Webcam not started'),
        tone: styles.statusneutral,
      };
    }

    if (status === 'starting' && !diagnostics.modelLoaded) {
      return {
        label: t('research.emotionValidation.states.modelLoading', 'Model loading'),
        tone: styles.statusinfo,
      };
    }

    if (status === 'running' && !diagnostics.videoReady) {
      return {
        label: t('research.emotionValidation.states.videoPreparing', 'Waiting for video readiness'),
        tone: styles.statuswarning,
      };
    }

    if (status === 'running' && diagnostics.inferenceRunning && !diagnostics.faceDetected) {
      return {
        label: t('research.emotionValidation.states.noFaceDetected', 'No face detected'),
        tone: styles.statuswarning,
      };
    }

    if (status === 'running' && diagnostics.faceDetected && diagnostics.lastConfidence < 0.45) {
      return {
        label: t('research.emotionValidation.states.lowConfidence', 'Low confidence'),
        tone: styles.statuswarning,
      };
    }

    if (status === 'running' && diagnostics.faceDetected) {
      return {
        label: t('research.emotionValidation.states.liveDetected', 'Live emotion detected'),
        tone: styles.statussuccess,
      };
    }

    if (status === 'error' || diagnostics.runtimeError || diagnostics.modelError) {
      return {
        label: t('research.emotionValidation.states.runtimeError', 'Runtime error'),
        tone: styles.statusdanger,
      };
    }

    return {
      label: t('research.emotionValidation.states.inferenceRunning', 'Inference running'),
      tone: styles.statusinfo,
    };
  }, [
    diagnostics.faceDetected,
    diagnostics.inferenceRunning,
    diagnostics.lastConfidence,
    diagnostics.modelError,
    diagnostics.modelLoaded,
    diagnostics.runtimeError,
    diagnostics.videoReady,
    status,
    t,
  ]);

  const metrics = useMemo(() => {
    if (!readings.length) {
      return {
        dominant: t('research.emotionValidation.labels.noData', 'No data'),
        averageConfidence: 0,
        transitions: 0,
        stability: t('research.emotionValidation.labels.calibrating', 'Calibrating'),
        noFaceCount: 0,
        lowConfidenceCount: 0,
      };
    }

    const scoped = readings.slice(0, STABILITY_WINDOW);
    const frequency: Record<string, number> = {};
    let transitionCount = 0;
    let noFaceCount = 0;
    let lowConfidenceCount = 0;
    let confidenceSum = 0;
    let previousState = '';

    for (const row of scoped) {
      const normalized = normalizeEmotionState(row.state);
      const key = normalized ?? row.state;
      frequency[key] = (frequency[key] ?? 0) + 1;
      confidenceSum += row.confidence;
      if (!row.faceDetected) noFaceCount += 1;
      if (row.confidence < 0.55) lowConfidenceCount += 1;
      if (previousState && previousState !== key) transitionCount += 1;
      previousState = key;
    }

    const dominant =
      Object.entries(frequency).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      t('research.emotionValidation.labels.noData', 'No data');

    const dominantDisplay = normalizeEmotionState(dominant)
      ? emotionDisplayName(dominant, true, (key, fallback) => t(key, fallback))
      : dominant;

    const averageConfidence = confidenceSum / scoped.length;

    const stabilityLabel =
      averageConfidence >= 0.68 && transitionCount <= Math.max(3, Math.floor(scoped.length / 4))
        ? t('research.emotionValidation.labels.stable', 'Stable')
        : averageConfidence < 0.45 || transitionCount >= Math.max(6, Math.floor(scoped.length / 2))
          ? t('research.emotionValidation.labels.noisy', 'Noisy')
          : t('research.emotionValidation.labels.moderate', 'Moderate');

    return {
      dominant: dominantDisplay,
      averageConfidence,
      transitions: transitionCount,
      stability: stabilityLabel,
      noFaceCount,
      lowConfidenceCount,
    };
  }, [readings, t]);

  const poseMatch = useMemo(() => {
    if (!currentReading) return false;
    const normalized = normalizeEmotionState(currentReading.state);
    if (normalized) return activePose.expected.includes(normalized);
    if (currentReading.state === 'neutral') return activePose.expected.includes('neutral');
    return false;
  }, [activePose.expected, currentReading]);

  function stopCameraStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
    let timer: number | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function stopValidation(updateStatus = true) {
    trackerRef.current?.stopTracking();
    trackerRef.current = null;
    stopCameraStream();

    const endedSessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    if (endedSessionId && !endedSessionId.startsWith('validation-local-')) {
      await sessionApi.end(endedSessionId).catch(() => undefined);
    }

    if (!isMountedRef.current || !updateStatus) return;
    setDiagnostics((current) => ({
      ...current,
      webcamActive: false,
      inferenceRunning: false,
      socketConnected: false,
      videoReady: false,
    }));
    setStatus('stopped');
    setSessionId(null);
    setTestStartedAt(null);
  }

  async function startValidation() {
    if (status === 'starting' || status === 'running') return;
    if (!videoRef.current) return;

    setStatus('starting');
    setError(null);
    setReadings([]);
    setDiagnostics(EMPTY_DIAGNOSTICS);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);

      const localSessionId = `validation-local-${Date.now()}`;
      let trackerSessionId = localSessionId;
      let trackerEpisodeId = localSessionId;
      let fallbackMessage: string | null = null;

      try {
        const modulesResponse = await withTimeout(
          scenarioApi.listModules(),
          4500,
          t(
            'research.emotionValidation.errors.noModule',
            'No module is available. Add at least one module and lesson before running validation.',
          ),
        );
        const modules = ((modulesResponse as any)?.data ?? []) as Array<{
          id: string;
          episodes?: Array<{ id: string }>;
        }>;
        const selectedModule = modules.find((item) => item?.id);
        const selectedEpisodeId = selectedModule?.episodes?.[0]?.id;

        if (selectedModule?.id) {
          trackerEpisodeId = selectedEpisodeId ?? localSessionId;
          const startedSession = await withTimeout(
            sessionApi.start({
              moduleId: selectedModule.id,
              episodeId: selectedEpisodeId,
              scaffoldLevel: 3,
            }),
            4500,
            t(
              'research.emotionValidation.errors.sessionInitFailed',
              'Unable to initialize validation session.',
            ),
          );

          const remoteSessionId = (startedSession as any)?.data?.id as string | undefined;
          if (remoteSessionId) {
            trackerSessionId = remoteSessionId;
          }
        }
      } catch {
        fallbackMessage = t(
          'research.emotionValidation.errors.fallbackLocalOnly',
          'Live detection is running in local validation mode. Backend session logging is currently unavailable.',
        );
      }

      sessionIdRef.current = trackerSessionId;

      const tracker = new EmotionTracker(trackerSessionId, trackerEpisodeId, {
        frameIntervalMs: 750,
        detectorInputSize: 320,
        detectorScoreThreshold: 0.16,
      });

      tracker.onDiagnostics = (snapshot) => {
        if (!isMountedRef.current) return;
        setDiagnostics(snapshot);
      };

      tracker.onError = (message) => {
        if (!isMountedRef.current) return;
        setError(message);
      };

      tracker.onLocalFrame = (localFrame) => {
        const row = readingFromLocal(localFrame);
        if (!isMountedRef.current) return;
        setReadings((prev) => [row, ...prev].slice(0, MAX_LOG_ITEMS));
      };

      tracker.onStateUpdate = (payload: any) => {
        const row = readingFromServer(payload);
        if (!isMountedRef.current) return;
        setReadings((prev) => [row, ...prev].slice(0, MAX_LOG_ITEMS));
      };

      await tracker.initialize(videoRef.current);
      tracker.startTracking();
      trackerRef.current = tracker;

      if (!isMountedRef.current) return;
      setSessionId(trackerSessionId);
      setTestStartedAt(new Date().toISOString());
      setStatus('running');
      setDiagnostics((current) => ({
        ...current,
        webcamActive: true,
        inferenceRunning: true,
      }));
      if (fallbackMessage) {
        setError(fallbackMessage);
      }
    } catch (err) {
      await stopValidation(false);
      if (!isMountedRef.current) return;
      setStatus('error');
      setError(err instanceof Error ? err.message : t('common.errors.generic', 'Something went wrong. Please try again.'));
    }
  }

  useEffect(() => {
    // React.StrictMode (dev) runs effect cleanup/setup twice.
    // Ensure mount-guard is restored on setup so async callbacks can update state.
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      void stopValidation(false);
      stopCameraStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.page} dir={direction}>
      <section className={styles.headerCard}>
        <div>
          <p className={styles.eyebrow}>{t('research.emotionValidation.eyebrow', 'Affective Sensing Validation')}</p>
          <h1>{t('research.emotionValidation.title', 'Live Emotion Validation Lab')}</h1>
          <p className={styles.lead}>
            {t(
              'research.emotionValidation.lead',
              'Use this page during live demonstrations to validate webcam-based emotion sensing, confidence quality, and real-time detection stability.',
            )}
          </p>
        </div>
        <div className={`${styles.statusPill} ${styles[`status${statusTone(status)}`]}`}>
          {status === 'running' ? <CheckCircle2 size={14} /> : status === 'error' ? <AlertTriangle size={14} /> : <Gauge size={14} />}
          <span>
            {status === 'running'
              ? t('research.emotionValidation.status.running', 'Running')
              : status === 'starting'
                ? t('research.emotionValidation.status.starting', 'Starting')
                : status === 'stopped'
                  ? t('research.emotionValidation.status.stopped', 'Stopped')
                  : status === 'error'
                    ? t('research.emotionValidation.status.error', 'Error')
                    : t('research.emotionValidation.status.idle', 'Idle')}
          </span>
        </div>
      </section>

      <section className={styles.grid}>
        <div className={styles.stackColumn}>
          <article className={styles.card}>
            <div className={styles.cardHead}>
              <h2>{t('research.emotionValidation.webcam.title', 'Live Camera Test')}</h2>
              <div className={styles.cardActions}>
                {status === 'running' || status === 'starting' ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => void stopValidation()}>
                    <Square size={14} />
                    {t('research.emotionValidation.actions.stop', 'Stop test')}
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => void startValidation()}>
                    <Play size={14} />
                    {t('research.emotionValidation.actions.start', 'Start test')}
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReadings([])}>
                  <RefreshCcw size={14} />
                  {t('research.emotionValidation.actions.clearLog', 'Clear log')}
                </button>
              </div>
            </div>

            <div className={styles.videoWrap}>
              <video ref={videoRef} className={styles.video} autoPlay muted playsInline />
              <div className={styles.videoBadge}>
                {diagnostics.faceDetected ? <Camera size={14} /> : <CameraOff size={14} />}
                <span>
                  {diagnostics.faceDetected
                    ? t('research.emotionValidation.webcam.faceDetected', 'Face detected')
                    : t('research.emotionValidation.webcam.noFace', 'No face detected')}
                </span>
              </div>
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.inlineMeta}>
              <span>
                <Clock3 size={13} />
                {status === 'idle' || status === 'stopped'
                  ? t('research.emotionValidation.webcam.notStarted', 'Validation has not started yet')
                  : testStartedAt
                    ? `${t('research.emotionValidation.webcam.startedAt', 'Started at')} ${formatClock(testStartedAt)}`
                    : t('research.emotionValidation.states.startingPipeline', 'Starting pipeline...')}
              </span>
              {sessionId ? (
                <span>
                  <ListChecks size={13} />
                  {t('research.emotionValidation.webcam.sessionId', 'Session ID')}: {sessionId}
                </span>
              ) : null}
            </div>
          </article>

          <article className={styles.card}>
            <h2>{t('research.emotionValidation.debug.title', 'Live Pipeline Diagnostics')}</h2>
            <div className={styles.debugGrid}>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.modelLoaded', 'Model loaded')}</span>
                <strong className={styles.debugValue}>{diagnostics.modelLoaded ? 'true' : 'false'}</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.modelSource', 'Model source')}</span>
                <strong className={styles.debugValue}>{diagnostics.modelSource ?? '--'}</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.webcamActive', 'Webcam active')}</span>
                <strong className={styles.debugValue}>{diagnostics.webcamActive ? 'true' : 'false'}</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.videoReady', 'Video ready')}</span>
                <strong className={styles.debugValue}>{diagnostics.videoReady ? 'true' : 'false'}</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.inferenceRunning', 'Inference running')}</span>
                <strong className={styles.debugValue}>{diagnostics.inferenceRunning ? 'true' : 'false'}</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.socketConnected', 'Socket connected')}</span>
                <strong className={styles.debugValue}>{diagnostics.socketConnected ? 'true' : 'false'}</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.faceDetected', 'Face detected')}</span>
                <strong className={styles.debugValue}>{diagnostics.faceDetected ? 'true' : 'false'}</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.lastEmotion', 'Last detected emotion')}</span>
                <strong className={styles.debugValue}>
                  {normalizeEmotionState(diagnostics.lastEmotion)
                    ? emotionDisplayName(diagnostics.lastEmotion, true, (key, fallback) => t(key, fallback))
                    : String(diagnostics.lastEmotion || '--')}
                </strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.lastConfidence', 'Last confidence')}</span>
                <strong className={styles.debugValue}>{Math.round((diagnostics.lastConfidence ?? 0) * 100)}%</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.framesAnalyzed', 'Analyzed frames')}</span>
                <strong className={styles.debugValue}>{diagnostics.framesAnalyzed}</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.lastDetection', 'Last detection timestamp')}</span>
                <strong className={styles.debugValue}>
                  {diagnostics.lastDetectionTimestamp ? formatClock(diagnostics.lastDetectionTimestamp) : '--'}
                </strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.faceStability', 'Face stability score')}</span>
                <strong className={styles.debugValue}>{Math.round((diagnostics.faceStabilityScore ?? 0) * 100)}%</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.stateDuration', 'Current state duration')}</span>
                <strong className={styles.debugValue}>
                  {`${Math.round(diagnostics.stateDurationSec ?? 0)} ${t('research.emotionValidation.debug.seconds', 'sec')}`}
                </strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.operationalFallbackReason', 'Operational fallback reason')}</span>
                <strong className={styles.debugValue}>{diagnostics.operationalFallbackReason ?? '--'}</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.highEngagementReason', 'High-engagement reason')}</span>
                <strong className={styles.debugValue}>{diagnostics.highEngagementReason ?? '--'}</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.fallbackReason', 'Fallback reason')}</span>
                <strong className={styles.debugValue}>{diagnostics.fallbackReason ?? '--'}</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.transitionCount', 'State transition count')}</span>
                <strong className={styles.debugValue}>{diagnostics.transitionCount ?? 0}</strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.smoothingHold', 'Smoothing hold active')}</span>
                <strong className={styles.debugValue}>
                  {(diagnostics.smoothingHold ?? false)
                    ? t('research.emotionValidation.log.yes', 'Yes')
                    : t('research.emotionValidation.log.no', 'No')}
                </strong>
              </div>
              <div className={styles.debugRow}>
                <span className={styles.debugKey}>{t('research.emotionValidation.debug.decisionReason', 'Current decision reason')}</span>
                <strong className={styles.debugValue}>{diagnostics.currentDecisionReason ?? '--'}</strong>
              </div>
            </div>
            <div className={styles.historyGrid}>
              <div className={styles.historyCard}>
                <span className={styles.historyTitle}>{t('research.emotionValidation.debug.rawHistory', 'Last 10 raw predictions')}</span>
                <div className={styles.historyChips}>
                  {(diagnostics.recentRawPredictions ?? []).length ? (
                    (diagnostics.recentRawPredictions ?? []).map((item, index) => (
                      <span key={`raw-${index}`} className={styles.historyChip}>{item}</span>
                    ))
                  ) : (
                    <span className={styles.historyEmpty}>--</span>
                  )}
                </div>
              </div>
              <div className={styles.historyCard}>
                <span className={styles.historyTitle}>{t('research.emotionValidation.debug.smoothHistory', 'Last 10 smoothed states')}</span>
                <div className={styles.historyChips}>
                  {(diagnostics.recentSmoothedStates ?? []).length ? (
                    (diagnostics.recentSmoothedStates ?? []).map((item, index) => (
                      <span key={`smooth-${index}`} className={styles.historyChip}>{item}</span>
                    ))
                  ) : (
                    <span className={styles.historyEmpty}>--</span>
                  )}
                </div>
              </div>
              <div className={styles.historyCard}>
                <span className={styles.historyTitle}>{t('research.emotionValidation.debug.confidenceHistory', 'Last 10 confidence values')}</span>
                <div className={styles.historyChips}>
                  {(diagnostics.confidenceHistory ?? []).length ? (
                    (diagnostics.confidenceHistory ?? []).map((item, index) => (
                      <span key={`conf-${index}`} className={styles.historyChip}>{Math.round(item * 100)}%</span>
                    ))
                  ) : (
                    <span className={styles.historyEmpty}>--</span>
                  )}
                </div>
              </div>
            </div>
            {diagnostics.modelError ? (
              <p className={styles.error}>
                {t('research.emotionValidation.debug.modelError', 'Model loading error')}: {diagnostics.modelError}
              </p>
            ) : null}
            {diagnostics.runtimeError ? (
              <p className={styles.error}>
                {t('research.emotionValidation.debug.runtimeError', 'Runtime error')}: {diagnostics.runtimeError}
              </p>
            ) : null}
          </article>

          <article className={styles.card}>
            <h2>{t('research.emotionValidation.explain.title', 'What This Validation View Demonstrates')}</h2>
            <ul className={styles.explainList}>
              <li>
                <Sparkles size={14} />
                <span>
                  {t(
                    'research.emotionValidation.explain.one',
                    'This page validates live webcam-based facial emotion sensing under realistic presentation conditions.',
                  )}
                </span>
              </li>
              <li>
                <Gauge size={14} />
                <span>
                  {t(
                    'research.emotionValidation.explain.two',
                    'Confidence values and face-visibility indicators help reviewers evaluate detection quality and signal reliability.',
                  )}
                </span>
              </li>
              <li>
                <ListChecks size={14} />
                <span>
                  {t(
                    'research.emotionValidation.explain.three',
                    'Timestamped readings show that the system captures events over time rather than displaying static labels.',
                  )}
                </span>
              </li>
              <li>
                <CheckCircle2 size={14} />
                <span>
                  {t(
                    'research.emotionValidation.explain.four',
                    'Detected emotional states feed the same adaptive and research logging pipeline used in the training environment.',
                  )}
                </span>
              </li>
            </ul>
          </article>
        </div>

        <div className={styles.stackColumn}>
          <article className={styles.card}>
            <h2>{t('research.emotionValidation.current.title', 'Live Emotion Output')}</h2>
            <div className={styles.currentStateBox}>
              <p className={styles.currentState}>{currentEmotionDisplay}</p>
              <p className={styles.currentTimestamp}>
                {currentReading
                  ? `${t('research.emotionValidation.current.lastUpdate', 'Last update')}: ${formatClock(currentReading.timestamp)}`
                  : t('research.emotionValidation.current.awaiting', 'Awaiting live readings...')}
              </p>
              <div className={`${styles.pipelineNote} ${pipelineState.tone}`}>
                <span>{pipelineState.label}</span>
                {currentReading ? (
                  <span className={styles.sourceTag}>
                    {currentReading.source === 'server'
                      ? t('research.emotionValidation.debug.sourceServer', 'server')
                      : t('research.emotionValidation.debug.sourceLocal', 'local')}
                  </span>
                ) : null}
              </div>
            </div>

            <div className={styles.metricGrid}>
              <div className={styles.metricCard}>
                <span>{t('research.emotionValidation.current.confidence', 'Confidence')}</span>
                <strong>{Math.round((currentReading?.confidence ?? diagnostics.lastConfidence ?? 0) * 100)}%</strong>
              </div>
              <div className={styles.metricCard}>
                <span>{t('research.emotionValidation.current.faceVisibility', 'Face visibility')}</span>
                <strong>
                  {diagnostics.faceDetected
                    ? t('research.emotionValidation.log.yes', 'Yes')
                    : t('research.emotionValidation.log.no', 'No')}
                </strong>
              </div>
              <div className={styles.metricCard}>
                <span>{t('research.emotionValidation.current.totalReadings', 'Captured readings')}</span>
                <strong>{readings.length}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>{t('research.emotionValidation.current.currentStatus', 'Test status')}</span>
                <strong>
                  {status === 'running'
                    ? t('research.emotionValidation.status.running', 'Running')
                    : status === 'starting'
                      ? t('research.emotionValidation.status.starting', 'Starting')
                      : status === 'stopped'
                        ? t('research.emotionValidation.status.stopped', 'Stopped')
                        : status === 'error'
                          ? t('research.emotionValidation.status.error', 'Error')
                          : t('research.emotionValidation.status.idle', 'Idle')}
                </strong>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h2>{t('research.emotionValidation.quality.title', 'Detection Quality Panel')}</h2>
            <div className={styles.metricGrid}>
              <div className={styles.metricCard}>
                <span>{t('research.emotionValidation.quality.dominant', 'Dominant emotion')}</span>
                <strong>{metrics.dominant}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>{t('research.emotionValidation.quality.averageConfidence', 'Average confidence')}</span>
                <strong>{Math.round(metrics.averageConfidence * 100)}%</strong>
              </div>
              <div className={styles.metricCard}>
                <span>{t('research.emotionValidation.quality.transitions', 'Emotion transitions')}</span>
                <strong>{metrics.transitions}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>{t('research.emotionValidation.quality.stability', 'Stability')}</span>
                <strong>{metrics.stability}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>{t('research.emotionValidation.quality.noFaceEvents', 'No-face events')}</span>
                <strong>{metrics.noFaceCount}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>{t('research.emotionValidation.quality.lowConfidenceEvents', 'Low-confidence events')}</span>
                <strong>{metrics.lowConfidenceCount}</strong>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <h2>{t('research.emotionValidation.demo.title', 'Controlled Demonstration Mode')}</h2>
            <p className={styles.muted}>
              {t(
                'research.emotionValidation.demo.summary',
                'Choose a demonstration pose below, perform it in front of the camera, then compare expected versus detected state.',
              )}
            </p>
            <div className={styles.demoButtons}>
              {DEMO_POSES.map((pose) => (
                <button
                  key={pose.id}
                  type="button"
                  className={`btn btn-sm ${pose.id === activePose.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedPoseId(pose.id)}
                >
                  {t(pose.titleKey, pose.titleFallback)}
                </button>
              ))}
            </div>
            <div className={styles.demoPanel}>
              <p className={styles.demoInstruction}>{t(activePose.instructionKey, activePose.instructionFallback)}</p>
              <p className={styles.demoExpected}>
                {t('research.emotionValidation.demo.expected', 'Expected')}:{' '}
                {activePose.expected
                  .map((item) => emotionDisplayName(item, true, (key, fallback) => t(key, fallback)))
                  .join(' / ')}
              </p>
              <div className={`${styles.matchPill} ${poseMatch ? styles.matchYes : styles.matchNo}`}>
                {poseMatch ? <CheckCircle2 size={14} /> : <Eye size={14} />}
                {poseMatch
                  ? t('research.emotionValidation.demo.match', 'Current reading matches expected pose')
                  : t('research.emotionValidation.demo.noMatch', 'Current reading does not match expected pose yet')}
              </div>
            </div>
          </article>
          <article className={styles.card}>
            <h2>{t('research.emotionValidation.log.title', 'Recent Emotion Validation Log')}</h2>
            {readings.length ? (
              <div className={styles.logTableWrap}>
                <table className={styles.logTable}>
                  <thead>
                    <tr>
                      <th>{t('research.emotionValidation.log.time', 'Time')}</th>
                      <th>{t('research.emotionValidation.log.state', 'Detected state')}</th>
                      <th>{t('research.emotionValidation.log.confidence', 'Confidence')}</th>
                      <th>{t('research.emotionValidation.log.face', 'Face detected')}</th>
                      <th>{t('research.emotionValidation.debug.source', 'Source')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.slice(0, 18).map((row) => (
                      <tr key={row.id}>
                        <td>{formatClock(row.timestamp)}</td>
                        <td>
                          {normalizeEmotionState(row.state)
                            ? emotionDisplayName(row.state, true, (key, fallback) => t(key, fallback))
                            : row.state}
                        </td>
                        <td>{Math.round(row.confidence * 100)}%</td>
                        <td>{row.faceDetected ? t('research.emotionValidation.log.yes', 'Yes') : t('research.emotionValidation.log.no', 'No')}</td>
                        <td>
                          {row.source === 'server'
                            ? t('research.emotionValidation.debug.sourceServer', 'server')
                            : t('research.emotionValidation.debug.sourceLocal', 'local')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.muted}>{t('research.emotionValidation.log.empty', 'No validation readings yet. Start the test to see live records.')}</p>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
