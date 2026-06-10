import { useEffect, useMemo, useRef } from 'react';
import { useI18n } from '@/i18n';
import {
  RESEARCH_EMOTION_ORDER,
  emotionDisplayName,
  normalizeEmotionState,
} from './emotionPresentation';
import styles from './EmotionHeatmap.module.css';

const DEFAULT_STATES = [...RESEARCH_EMOTION_ORDER];

const DEFAULT_INTENSITY: Record<string, number[]> = {
  high_engagement: [0.2, 0.44, 0.76, 0.82, 0.6],
  frustration: [0.12, 0.22, 0.52, 0.42, 0.2],
  confusion: [0.16, 0.38, 0.68, 0.48, 0.18],
  boredom_disengagement: [0.1, 0.18, 0.36, 0.5, 0.3],
  test_anxiety: [0.08, 0.16, 0.34, 0.28, 0.14],
  neutral: [0.34, 0.4, 0.32, 0.28, 0.3],
  no_face_low_confidence: [0.06, 0.12, 0.18, 0.14, 0.12],
};

type Props = {
  intensityMap?: Record<string, number[]>;
  states?: string[];
  timeLabels?: string[];
  title?: string;
  subtitle?: string;
};

function heatColor(intensity: number) {
  if (intensity >= 0.82) return 'rgba(18, 148, 139, 0.96)';
  if (intensity >= 0.64) return 'rgba(31, 111, 176, 0.88)';
  if (intensity >= 0.46) return 'rgba(89, 124, 168, 0.78)';
  if (intensity >= 0.28) return 'rgba(201, 137, 26, 0.62)';
  return 'rgba(222, 229, 236, 0.85)';
}

export default function EmotionHeatmap({
  intensityMap = DEFAULT_INTENSITY,
  states = DEFAULT_STATES,
  timeLabels,
  title,
  subtitle,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t, isRtl } = useI18n();

  const resolvedLabels = useMemo(
    () =>
      timeLabels?.length
        ? timeLabels
        : [
            t('research.visuals.sequence.start', 'Start'),
            t('research.visuals.sequence.window2', 'Window 2'),
            t('research.visuals.sequence.window3', 'Window 3'),
            t('research.visuals.sequence.window4', 'Window 4'),
            t('research.visuals.sequence.current', 'Current'),
          ],
    [t, timeLabels],
  );

  const legendItems = useMemo(
    () =>
      states.map((state) => ({
        key: state,
        label: normalizeEmotionState(state)
          ? emotionDisplayName(state, true, (key, fallback) => t(key, fallback))
          : state,
      })),
    [states, t],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const padLeft = 170;
    const padTop = 38;
    const padRight = 24;
    const padBottom = 54;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    const cols = Math.max(resolvedLabels.length, 1);
    const rows = Math.max(states.length, 1);
    const cellWidth = plotWidth / cols;
    const cellHeight = plotHeight / rows;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fbfaf6';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(54, 73, 92, 0.08)';
    ctx.lineWidth = 1;
    for (let col = 0; col <= cols; col += 1) {
      const x = padLeft + col * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotHeight);
      ctx.stroke();
    }
    for (let row = 0; row <= rows; row += 1) {
      const y = padTop + row * cellHeight;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotWidth, y);
      ctx.stroke();
    }

    for (let row = 0; row < rows; row += 1) {
      const state = states[row];
      const data = intensityMap[state] ?? [];

      for (let col = 0; col < cols; col += 1) {
        const intensity = Math.max(0, Math.min(1, data[col] ?? 0));
        const x = padLeft + col * cellWidth;
        const y = padTop + row * cellHeight;
        const fill = heatColor(intensity);

        ctx.fillStyle = fill;
        ctx.fillRect(x + 4, y + 4, cellWidth - 8, cellHeight - 8);

        if (intensity > 0.14) {
          ctx.fillStyle = intensity >= 0.46 ? '#ffffff' : '#3b4a59';
          ctx.font = '600 11px "Segoe UI", Tahoma, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.round(intensity * 100)}%`, x + cellWidth / 2, y + cellHeight / 2);
        }
      }
    }

    ctx.font = '600 12px "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = isRtl ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#334155';

    for (let row = 0; row < rows; row += 1) {
      const y = padTop + (row + 0.5) * cellHeight;
      const label = normalizeEmotionState(states[row])
        ? emotionDisplayName(states[row], true, (key, fallback) => t(key, fallback))
        : states[row];
      ctx.fillText(label, padLeft - 14, y);
    }

    ctx.font = '500 11px "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    for (let col = 0; col < cols; col += 1) {
      const x = padLeft + (col + 0.5) * cellWidth;
      ctx.fillText(resolvedLabels[col] ?? `T${col + 1}`, x, padTop + plotHeight + 14);
    }
  }, [intensityMap, isRtl, resolvedLabels, states, t]);

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <h3 className={styles.title}>
          <span className={styles.titleIcon} aria-hidden="true" />
          {title ?? t('research.visuals.heatmap.title', 'Adaptive-emotion heatmap')}
        </h3>
        <p className={styles.subtitle}>
          {subtitle ??
            t(
              'research.visuals.heatmap.subtitle',
              'A structured summary of the seven canonical affective scenarios across the latest timeline window.',
            )}
        </p>
      </div>

      <div className={styles.legend}>
        {legendItems.map((item) => (
          <span key={item.key} className={styles.legendItem}>
            {item.label}
          </span>
        ))}
      </div>

      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
