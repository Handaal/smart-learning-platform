import { BookOpenCheck, Sparkles, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import styles from './EmotionSuggestionCard.module.css';

export type ContentSuggestion = {
  sessionId: string;
  dominantEmotion:
    | 'confusion'
    | 'frustration'
    | 'boredom_disengagement'
    | 'high_engagement'
    | 'test_anxiety'
    | 'neutral';
  distribution?: Array<{ state: string; count: number }>;
  contentId: string | null;
  contentTitle: string | null;
  uiShape: string;
  windowMinutes: number;
  occurredAt: string;
};

type Props = {
  suggestion: ContentSuggestion;
  canOpenContent: boolean;
  onView: () => void;
  onDismiss: () => void;
};

export default function EmotionSuggestionCard({ suggestion, canOpenContent, onView, onDismiss }: Props) {
  const { t } = useI18n();

  const labelByEmotion: Record<ContentSuggestion['dominantEmotion'], string> = {
    confusion: t('learner.session.suggestion.labelByEmotion.confusion', 'Content for a confused learner'),
    frustration: t('learner.session.suggestion.labelByEmotion.frustration', 'Content for a frustrated learner'),
    boredom_disengagement: t('learner.session.suggestion.labelByEmotion.boredom_disengagement', 'Content for a disengaged learner'),
    high_engagement: t('learner.session.suggestion.labelByEmotion.high_engagement', 'Content for a highly engaged learner'),
    test_anxiety: t('learner.session.suggestion.labelByEmotion.test_anxiety', 'Content for an anxious learner'),
    neutral: t('learner.session.suggestion.labelByEmotion.neutral', 'Content for a neutral learner'),
  };

  const bodyByEmotion: Record<ContentSuggestion['dominantEmotion'], string> = {
    confusion: t(
      'learner.session.suggestion.bodyByEmotion.confusion',
      'Parts of the last few minutes seemed unclear. A short clarification step is ready for you.',
    ),
    frustration: t(
      'learner.session.suggestion.bodyByEmotion.frustration',
      'The recent activity looked demanding. A calmer, simplified support step is ready for you.',
    ),
    boredom_disengagement: t(
      'learner.session.suggestion.bodyByEmotion.boredom_disengagement',
      'Engagement dipped over the last few minutes. A quick interactive activity can restore momentum.',
    ),
    high_engagement: t(
      'learner.session.suggestion.bodyByEmotion.high_engagement',
      'You have been highly focused. An optional challenge step is available if you want to go deeper.',
    ),
    test_anxiety: t(
      'learner.session.suggestion.bodyByEmotion.test_anxiety',
      'The last stretch seemed tense. A short reassurance note about how this step works is available.',
    ),
    neutral: t(
      'learner.session.suggestion.bodyByEmotion.neutral',
      'You are progressing steadily. The standard next step of the lesson is recommended.',
    ),
  };

  return (
    <section className={styles.card} role="status" aria-live="polite">
      <span className={styles.eyebrow}>
        <Sparkles size={14} />
        {t('learner.session.suggestion.kicker', 'Suggested for you - based on the last {minutes} minutes', {
          minutes: suggestion.windowMinutes,
        })}
      </span>
      <h3 className={styles.title}>{t('learner.session.suggestion.title', 'A learning step matched to how it is going')}</h3>
      <span className={`${styles.dominantLabel} ${styles[`emotion_${suggestion.dominantEmotion}`] ?? ''}`}>
        {t('learner.session.suggestion.dominantPrefix', 'Dominant result: {emotion}', {
          emotion: t(`learner.session.suggestion.emotionName.${suggestion.dominantEmotion}`, suggestion.dominantEmotion),
        })}
        {' · '}
        {labelByEmotion[suggestion.dominantEmotion]}
      </span>
      <p className={styles.body}>{bodyByEmotion[suggestion.dominantEmotion]}</p>
      {suggestion.contentTitle ? (
        <span className={styles.contentTitle}>
          <BookOpenCheck size={14} />
          {suggestion.contentTitle}
        </span>
      ) : null}
      <div className={styles.actions}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>
          <X size={14} />
          {t('learner.session.suggestion.dismiss', 'Not now')}
        </button>
        {canOpenContent ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={onView}>
            {t('learner.session.suggestion.view', 'Open the suggested step')}
          </button>
        ) : null}
      </div>
    </section>
  );
}
