import type { RefObject } from 'react';
import { Activity, Camera, CameraOff, ScanFace } from 'lucide-react';
import { useI18n } from '@/i18n';
import type { EmotionTrackerDiagnostics } from '@/services/emotionTracker';
import { emotionDisplayName } from '@/components/research/emotionPresentation';
import type { AffectState } from '@/store/emotionStore';
import styles from './LearnerEmotionPanel.module.css';

type Props = {
  videoRef: RefObject<HTMLVideoElement>;
  cameraEnabled: boolean;
  onToggleCamera: () => void;
  emotionState: AffectState;
  confidence: number;
  diagnostics: EmotionTrackerDiagnostics | null;
  streamReady: boolean;
};

function pct(value: number | undefined | null): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

export default function LearnerEmotionPanel({
  videoRef,
  cameraEnabled,
  onToggleCamera,
  emotionState,
  confidence,
  diagnostics,
  streamReady,
}: Props) {
  const { t } = useI18n();

  const faceDetected = Boolean(diagnostics?.faceDetected);
  const accuracy = pct(diagnostics?.lastConfidence ?? confidence);
  const confidencePct = pct(confidence);
  const attention = pct(diagnostics?.faceStabilityScore);

  const lastEmotionSource = diagnostics?.lastEmotion ?? emotionState;
  const emotionLabel = emotionDisplayName(lastEmotionSource, true, t);
  const hasReading = cameraEnabled && (Boolean(diagnostics) || confidence > 0);

  return (
    <aside className={styles.panel} aria-label={t('learner.session.emotionPanel.title')}>
      <header className={styles.head}>
        <Camera size={16} />
        <h3>{t('learner.session.emotionPanel.title')}</h3>
      </header>

      <div className={styles.stage}>
        {/* The video element is always mounted so the tracker keeps a stable
            ref; we simply hide it behind the off-state card when paused. */}
        <video
          ref={videoRef}
          className={styles.video}
          muted
          playsInline
          autoPlay
          aria-hidden={!cameraEnabled}
          style={{ opacity: cameraEnabled && streamReady ? 1 : 0 }}
        />
        {!(cameraEnabled && streamReady) ? (
          <div className={styles.offState}>
            <CameraOff size={30} />
            <strong>
              {cameraEnabled
                ? t('learner.session.emotionPanel.starting')
                : t('learner.session.emotionPanel.cameraOffTitle')}
            </strong>
            {!cameraEnabled ? <span>{t('learner.session.emotionPanel.cameraOffHint')}</span> : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={`btn ${cameraEnabled ? 'btn-secondary' : 'btn-primary'} btn-sm ${styles.toggle}`}
        onClick={onToggleCamera}
      >
        {cameraEnabled ? <CameraOff size={14} /> : <Camera size={14} />}
        {cameraEnabled
          ? t('learner.session.emotionPanel.stop')
          : t('learner.session.emotionPanel.start')}
      </button>

      <section className={styles.analysis}>
        <div className={styles.analysisHead}>
          <ScanFace size={14} />
          <span>{t('learner.session.emotionPanel.analysisTitle')}</span>
          <span
            className={`badge ${faceDetected ? 'badge-teal' : 'badge-muted'} ${styles.faceBadge}`}
          >
            {faceDetected
              ? t('learner.session.emotionPanel.faceDetected')
              : t('learner.session.emotionPanel.noFace')}
          </span>
        </div>

        <div className={styles.readingCard}>
          <span className={styles.readingLabel}>
            {t('learner.session.emotionPanel.lastAnalysis')}
          </span>
          <div className={styles.readingRow}>
            <strong className={styles.emotion}>
              {hasReading ? emotionLabel : t('learner.session.emotionPanel.waiting')}
            </strong>
            {hasReading ? (
              <span className={styles.accuracy}>
                {t('learner.session.emotionPanel.accuracy')} {accuracy}%
              </span>
            ) : null}
          </div>
        </div>

        <p className={styles.note}>{t('learner.session.emotionPanel.updateNote')}</p>

        <div className={styles.metric}>
          <div className={styles.metricHead}>
            <span>{t('learner.session.emotionPanel.confidence')}</span>
            <strong>{confidencePct}%</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${confidencePct}%` }} />
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricHead}>
            <span className={styles.metricLabelWithIcon}>
              <Activity size={12} /> {t('learner.session.emotionPanel.attention')}
            </span>
            <strong>{attention}%</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${attention}%` }} />
          </div>
        </div>
      </section>
    </aside>
  );
}
