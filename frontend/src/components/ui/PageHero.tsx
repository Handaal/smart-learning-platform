import type { ReactNode } from 'react';
import styles from './PageHero.module.css';

type Props = {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Right-aligned slot: action buttons, a badge, or a small stat. */
  actions?: ReactNode;
  /** Use the accent gradient surface (for primary landing heroes). */
  gradient?: boolean;
  children?: ReactNode;
};

/** Unified page hero: eyebrow + title + lead with an optional right-aligned actions slot. */
export default function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  gradient = false,
  children,
}: Props) {
  return (
    <section className={`${styles.hero} ${gradient ? styles.gradient : ''}`}>
      <div className={styles.content}>
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        <h1 className={styles.title}>{title}</h1>
        {lead ? <p className={styles.lead}>{lead}</p> : null}
        {children}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  );
}
