import type { LucideIcon } from 'lucide-react';
import styles from './SectionTitle.module.css';

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: 'teal' | 'blue' | 'amber' | 'success';
  level?: 'h2' | 'h3';
};

export default function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  tone = 'teal',
  level = 'h2',
}: Props) {
  const Heading = level;
  const toneClass =
    tone === 'blue'
      ? styles.toneBlue
      : tone === 'amber'
        ? styles.toneAmber
        : tone === 'success'
          ? styles.toneSuccess
          : styles.toneTeal;

  return (
    <div className={styles.root}>
      <span className={`${styles.iconWrap} ${toneClass}`}>
        <Icon size={17} />
      </span>
      <div className={styles.copy}>
        <Heading className={styles.title}>{title}</Heading>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
    </div>
  );
}
