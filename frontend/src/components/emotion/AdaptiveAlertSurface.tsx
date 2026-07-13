import type { ReactNode } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Lightbulb,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  getScenarioDefinition,
  normalizeAdaptiveScenarioKey,
  type CanonicalAdaptiveScenarioKey,
} from '@policy/adaptive-alerts-policy';
import { useI18n } from '@/i18n';
import { sanitizeAdaptivePayload, type AdaptivePayload } from '@/store/emotionStore';
import styles from './AdaptiveAlertSurface.module.css';

type Choice = {
  key: string;
  label: string;
};

type Props = {
  alert: AdaptivePayload;
  contentTitle?: string | null;
  choices?: Choice[];
  onSelectChoice?: (choiceKey: string) => void;
  onPrimaryAction?: () => void;
  onDismissed?: () => void;
};

const SCENARIO_ICON: Record<CanonicalAdaptiveScenarioKey, ReactNode> = {
  confusion: <Lightbulb size={16} />,
  frustration: <AlertCircle size={16} />,
  boredom_disengagement: <Sparkles size={16} />,
  high_engagement: <CheckCircle2 size={16} />,
  test_anxiety: <AlertCircle size={16} />,
  neutral: <CheckCircle2 size={16} />,
  no_face_low_confidence: <ShieldCheck size={16} />,
};

const SURFACE_CLASS: Record<AdaptivePayload['uiShape'], string> = {
  side_panel: styles.sidePanel,
  mini_task_strip: styles.miniTaskStrip,
  popup_card: styles.popupCard,
  advanced_path: styles.advancedPath,
  information_window: styles.informationWindow,
  standard_path: styles.standardPath,
  operational_safety_protocol: styles.operationalSafetyProtocol,
};

export default function AdaptiveAlertSurface({
  alert,
  contentTitle,
  choices = [],
  onSelectChoice,
  onPrimaryAction,
  onDismissed,
}: Props) {
  const { language, t } = useI18n();
  const normalizedAlert = sanitizeAdaptivePayload(alert);
  const scenarioKey = normalizeAdaptiveScenarioKey(
    normalizedAlert?.scenarioKey ?? normalizedAlert?.triggerType,
  );
  const scenario = getScenarioDefinition(scenarioKey);
  const locale = language === 'ar' ? 'ar' : 'en';
  const choiceMode = choices.length > 0 && typeof onSelectChoice === 'function';
  const uiShape = normalizedAlert?.uiShape ?? scenario.uiShape;

  return (
    <section
      className={[styles.surface, SURFACE_CLASS[uiShape]].filter(Boolean).join(' ')}
      aria-label={scenario.learnerTitle[locale]}
    >
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            {SCENARIO_ICON[scenarioKey]}
            {t('learner.session.adaptiveAlert.kicker', 'Smart learning support')}
          </span>
          <h3 className={styles.title}>{scenario.learnerTitle[locale]}</h3>
          <p className={styles.message}>{scenario.learnerMessage[locale]}</p>
          {contentTitle ? (
            <span className={styles.contentTitle}>
              <BookOpenCheck size={14} />
              {contentTitle}
            </span>
          ) : null}
        </div>
        {scenario.allowsDismiss && onDismissed ? (
          <button
            type="button"
            className={styles.dismiss}
            onClick={onDismissed}
            aria-label={t('common.close', 'Close')}
          >
            ×
          </button>
        ) : null}
      </div>

      {choiceMode ? (
        <div className={styles.choices}>
          {choices.map((choice) => (
            <button
              key={choice.key}
              type="button"
              className={styles.choiceButton}
              onClick={() => onSelectChoice?.(choice.key)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      ) : null}

      {!choiceMode && onPrimaryAction && scenario.learnerActionLabel ? (
        <div className={styles.actions}>
          <button type="button" className="btn" onClick={onPrimaryAction}>
            <ArrowRight size={16} />
            {scenario.learnerActionLabel[locale]}
          </button>
        </div>
      ) : null}

      <details className={styles.details}>
        <summary className={styles.summary}>
          {t('learner.session.adaptiveAlert.more', 'Why this support appeared')}
        </summary>
        <div className={styles.meta}>
          <div className={styles.metaBlock}>
            <strong>{t('learner.session.adaptiveAlert.helpLabel', 'How this helps')}</strong>
            <p>{scenario.educationalInterpretation[locale]}</p>
          </div>
          <div className={styles.metaBlock}>
            <strong>{t('learner.session.adaptiveAlert.fallbackLabel', 'What happens if conditions change')}</strong>
            <p>{scenario.fallbackBehavior[locale]}</p>
          </div>
        </div>
      </details>
    </section>
  );
}
