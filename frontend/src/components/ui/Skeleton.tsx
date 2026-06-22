import styles from './Skeleton.module.css';

type Variant = 'line' | 'block' | 'card';

type Props = {
  variant?: Variant;
  /** For variant="line": number of stacked lines. */
  lines?: number;
  width?: string | number;
  height?: string | number;
  className?: string;
};

/** Lightweight shimmer placeholder for loading states on data-heavy pages. */
export default function Skeleton({
  variant = 'line',
  lines = 3,
  width,
  height,
  className = '',
}: Props) {
  if (variant === 'line') {
    return (
      <div className={`${styles.lines} ${className}`} aria-hidden>
        {Array.from({ length: Math.max(1, lines) }).map((_, index) => (
          <span
            key={index}
            className={`${styles.shimmer} ${styles.line}`}
            style={{ width: index === lines - 1 ? '70%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  return (
    <span
      className={`${styles.shimmer} ${variant === 'card' ? styles.card : styles.block} ${className}`}
      style={{ width, height }}
      aria-hidden
    />
  );
}
