import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { Language } from '@/i18n/types';

const LOCALES = { ar, en: enUS } as const;

/**
 * Human-readable relative time (e.g. "2 days ago" / "منذ يومين").
 * Returns an empty string for missing/invalid input so callers can fall back.
 */
export function relativeTime(
  value: string | number | Date | null | undefined,
  language: Language = 'en',
): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, { addSuffix: true, locale: LOCALES[language] ?? enUS });
}
