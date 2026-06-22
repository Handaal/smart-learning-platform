import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './EmptyState.module.css';

type Props = {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  compact?: boolean;
};

/** Unified empty / no-data panel. Replaces ad-hoc .emptyCard / .emptyState / .empty-panel. */
export default function EmptyState({ icon: Icon, title, hint, action, compact = false }: Props) {
  return (
    <div className={`${styles.root} ${compact ? styles.compact : ''}`}>
      {Icon ? (
        <span className={styles.icon}>
          <Icon size={compact ? 18 : 22} />
        </span>
      ) : null}
      <div className={styles.copy}>
        <p className={styles.title}>{title}</p>
        {hint ? <p className={styles.hint}>{hint}</p> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
