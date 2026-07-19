import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { allowUnitsBeforePretest, writeLearnerOnboardingProgress } from '@/features/learnerJourney';
import { learnerVisibility, shouldShowLearnerElement } from '@/features/learnerVisibility';
import { useI18n } from '@/i18n';
import { useAuthStore } from '@/store/authStore';
import styles from './OnboardingPage.module.css';

export default function OnboardingPage() {
  const learnerId = useAuthStore((state) => state.learnerId)!;
  const navigate = useNavigate();
  const { t } = useI18n();

  function startPretestNow() {
    writeLearnerOnboardingProgress(learnerId, {
      profileComplete: true,
      readyAcknowledged: true,
    });
    navigate('/assessment/pre?autostart=1', { replace: true });
  }

  function previewUnitsWithOverride() {
    writeLearnerOnboardingProgress(learnerId, {
      profileComplete: true,
      readyAcknowledged: true,
    });
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.stepCard} ${styles.readyCard}`}>
        <div className={styles.readyIcon}><Rocket size={28} /></div>
        <h1>{t('learner.onboarding.ready.title', "You're all set!")}</h1>
        <p className={`${styles.intro} ${styles.readyIntro}`}>
          {t('learner.onboarding.ready.intro', '')}
        </p>
        <p className={`${styles.legal} ${styles.readyNote}`}>
          {allowUnitsBeforePretest
            ? t(
                'learner.onboarding.ready.overrideNote',
                'The recommended next step is the pre-test. If you prefer, you can browse the course now and return to the pre-test afterward.',
              )
            : t(
                'learner.onboarding.ready.lockedNote',
                'The pre-test comes first. When you start now, the first pre-test screen opens immediately.',
              )}
        </p>
        <div className={styles.readyActions}>
          {shouldShowLearnerElement(learnerVisibility.onboarding.optionalBrowseAction, { isNeeded: allowUnitsBeforePretest }) ? (
            <button className="btn btn-secondary" onClick={previewUnitsWithOverride}>
              {t('learner.onboarding.ready.skip', 'Browse the course first')}
            </button>
          ) : null}
          <button className="btn btn-primary" onClick={startPretestNow}>
            {t('learner.onboarding.ready.startPre', 'Start pre-test now')}
          </button>
        </div>
      </div>
    </div>
  );
}
