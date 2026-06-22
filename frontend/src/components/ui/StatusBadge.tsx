export type BadgeStatus =
  | 'complete'
  | 'in_progress'
  | 'ready'
  | 'locked'
  | 'pending'
  | 'active'
  | 'warning'
  | 'error'
  | 'neutral';

type Props = {
  status: BadgeStatus;
  label: string;
};

/**
 * Canonical status → badge color mapping, layered over the global `.badge-*`
 * utility classes in globals.css. Use this instead of hand-picking badge
 * colors per page so status colors stay consistent app-wide.
 */
const STATUS_CLASS: Record<BadgeStatus, string> = {
  complete: 'badge-success',
  active: 'badge-success',
  in_progress: 'badge-teal',
  ready: 'badge-soft-teal',
  locked: 'badge-muted',
  pending: 'badge-muted',
  neutral: 'badge-muted',
  warning: 'badge-amber',
  error: 'badge-soft-red',
};

export default function StatusBadge({ status, label }: Props) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{label}</span>;
}
