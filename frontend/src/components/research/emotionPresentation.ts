import type { CanonicalEmotionState } from '@policy/adaptive-alerts-policy';

export type { CanonicalEmotionState };

export type EmotionTranslate = (key: string, fallback: string) => string;

export const RESEARCH_EMOTION_ORDER: CanonicalEmotionState[] = [
  'high_engagement',
  'frustration',
  'confusion',
  'boredom_disengagement',
  'test_anxiety',
  'neutral',
  'no_face_low_confidence',
];

export function normalizeEmotionState(value: unknown): CanonicalEmotionState | null {
  const token = String(value ?? '').trim().toLowerCase();
  if (!token) return null;

  if (token === 'high_engagement' || token === 'high-engagement' || token === 'high engagement') return 'high_engagement';
  if (token === 'frustration') return 'frustration';
  if (token === 'confusion') return 'confusion';
  if (
    token === 'boredom_disengagement' ||
    token === 'boredom-disengagement' ||
    token === 'boredom/disengagement' ||
    token === 'boredom disengagement'
  ) {
    return 'boredom_disengagement';
  }
  if (token === 'test_anxiety' || token === 'test-anxiety' || token === 'test anxiety') return 'test_anxiety';
  if (token === 'neutral') return 'neutral';
  if (
    token === 'no_face_low_confidence' ||
    token === 'no-face-low-confidence' ||
    token === 'no face low confidence' ||
    token === 'no face / low confidence'
  ) {
    return 'no_face_low_confidence';
  }
  return null;
}

const LABELS: Record<CanonicalEmotionState, { key: string; ar: string; en: string }> = {
  high_engagement: {
    key: 'research.emotions.highEngagement',
    ar: 'انخراط مرتفع',
    en: 'High engagement',
  },
  frustration: {
    key: 'research.emotions.frustration',
    ar: 'إحباط',
    en: 'Frustration',
  },
  confusion: {
    key: 'research.emotions.confusion',
    ar: 'ارتباك',
    en: 'Confusion',
  },
  boredom_disengagement: {
    key: 'research.emotions.boredomDisengagement',
    ar: 'ملل / ضعف اندماج',
    en: 'Boredom / disengagement',
  },
  test_anxiety: {
    key: 'research.emotions.testAnxiety',
    ar: 'قلق اختبار',
    en: 'Test anxiety',
  },
  neutral: {
    key: 'research.emotions.neutral',
    ar: 'حياد',
    en: 'Neutral',
  },
  no_face_low_confidence: {
    key: 'research.emotions.noFaceLowConfidence',
    ar: 'غياب وجه / ثقة منخفضة',
    en: 'No face / low confidence',
  },
};

export function emotionDisplayName(
  value: unknown,
  localized = false,
  translate?: EmotionTranslate,
) {
  const normalized = normalizeEmotionState(value);
  if (!normalized) return String(value ?? '--');

  const descriptor = LABELS[normalized];
  if (!localized) return descriptor.en;
  if (!translate) return descriptor.ar;
  return translate(descriptor.key, descriptor.ar);
}
