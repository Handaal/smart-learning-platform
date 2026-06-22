import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './StatCard.module.css';

type Tone = 'teal' | 'blue' | 'amber' | 'success' | 'violet' | 'rose' | 'coral' | 'indigo';

type Props = {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  hint?: string;
  tone?: Tone;
};

const TONE_CLASS: Record<Tone, string> = {
  teal: styles.toneTeal,
  blue: styles.toneBlue,
  amber: styles.toneAmber,
  success: styles.toneSuccess,
  violet: styles.toneViolet,
  rose: styles.toneRose,
  coral: styles.toneCoral,
  indigo: styles.toneIndigo,
};

/** Compact KPI / stat tile: toned icon + value + label (+ optional hint). */
export default function StatCard({ icon: Icon, value, label, hint, tone = 'teal' }: Props) {
  return (
    <div className={`card ${styles.statCard}`}>
      <span className={`${styles.icon} ${TONE_CLASS[tone]}`}>
        <Icon size={18} />
      </span>
      <div className={styles.body}>
        <div className={styles.value}>{value}</div>
        <div className={styles.label}>{label}</div>
        {hint ? <div className={styles.hint}>{hint}</div> : null}
      </div>
    </div>
  );
}
