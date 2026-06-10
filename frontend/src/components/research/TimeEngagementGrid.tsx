import { useEffect, useMemo, useRef } from 'react';
import { useI18n } from '@/i18n';
import styles from './TimeEngagementGrid.module.css';

const DEFAULT_TIME_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];

const DEFAULT_DATA = [
  [0.18, 0.32, 0.58, 0.8, 0.88, 0.54],
  [0.22, 0.48, 0.74, 0.78, 0.66, 0.4],
  [0.14, 0.36, 0.52, 0.44, 0.3, 0.18],
  [0.08, 0.2, 0.28, 0.24, 0.16, 0.12],
];

function engagementColor(value: number): string {
  if (value > 0.8) return 'rgba(18, 148, 139, 0.96)';
  if (value > 0.65) return 'rgba(31, 111, 176, 0.88)';
  if (value > 0.5) return 'rgba(89, 124, 168, 0.8)';
  if (value > 0.35) return 'rgba(201, 137, 26, 0.72)';
  if (value > 0.2) return 'rgba(229, 196, 127, 0.76)';
  return 'rgba(222, 229, 236, 0.9)';
}

type Props = {
  data?: number[][];
  title?: string;
  subtitle?: string;
  timeLabels?: string[];
  levels?: Array<{ label: string }>;
};

export default function TimeEngagementGrid({
  data = DEFAULT_DATA,
  title,
  subtitle,
  timeLabels = DEFAULT_TIME_LABELS,
  levels,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t, isRtl } = useI18n();

  const resolvedLevels = useMemo(
    () =>
      levels ?? [
        { label: t('research.participantDetail.engagementLevels.high', 'High') },
        { label: t('research.participantDetail.engagementLevels.moderate', 'Moderate') },
        { label: t('research.participantDetail.engagementLevels.low', 'Low') },
        { label: t('research.participantDetail.engagementLevels.idle', 'Idle') },
      ],
    [levels, t],
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

    const padLeft = 128;
    const padTop = 32;
    const padRight = 36;
    const padBottom = 56;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    const cols = Math.max(timeLabels.length, 1);
    const rows = Math.max(resolvedLevels.length, 1);
    const cellWidth = plotWidth / cols;
    const cellHeight = plotHeight / rows;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fbfaf6';
    ctx.fillRect(0, 0, width, height);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const value = Math.max(0, Math.min(1, data[row]?.[col] ?? 0));
        const x = padLeft + col * cellWidth;
        const y = padTop + row * cellHeight;

        ctx.fillStyle = engagementColor(value);
        ctx.fillRect(x + 4, y + 4, cellWidth - 8, cellHeight - 8);

        if (value > 0.16) {
          ctx.font = '600 11px "Segoe UI", Tahoma, sans-serif';
          ctx.fillStyle = value > 0.5 ? '#ffffff' : '#3b4a59';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.round(value * 100)}%`, x + cellWidth / 2, y + cellHeight / 2);
        }
      }
    }

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

    ctx.font = '600 12px "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = isRtl ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#334155';
    for (let row = 0; row < rows; row += 1) {
      const y = padTop + (row + 0.5) * cellHeight;
      ctx.fillText(resolvedLevels[row]?.label ?? `L${row + 1}`, padLeft - 14, y);
    }

    ctx.font = '500 11px "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    for (let col = 0; col < cols; col += 1) {
      const x = padLeft + (col + 0.5) * cellWidth;
      ctx.fillText(timeLabels[col] ?? `T${col + 1}`, x, padTop + plotHeight + 14);
    }
  }, [data, isRtl, resolvedLevels, timeLabels]);

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <h3 className={styles.title}>
          <span className={styles.titleIcon} aria-hidden="true" />
          {title ?? t('research.visuals.engagement.title', 'Engagement rhythm over time')}
        </h3>
        <p className={styles.subtitle}>
          {subtitle ??
            t(
              'research.visuals.engagement.subtitle',
              'A compact time-based reading of learner interaction intensity across the latest observation windows.',
            )}
        </p>
      </div>

      <div className={styles.legend}>
        <span>{t('research.participantDetail.engagementLevels.high', 'High')}</span>
        <span>{t('research.participantDetail.engagementLevels.moderate', 'Moderate')}</span>
        <span>{t('research.participantDetail.engagementLevels.low', 'Low')}</span>
        <span>{t('research.participantDetail.engagementLevels.idle', 'Idle')}</span>
      </div>

      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
