import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Rocket } from 'lucide-react';
import { allowUnitsBeforePretest, writeLearnerOnboardingProgress } from '@/features/learnerJourney';
import { learnerVisibility, shouldShowLearnerElement } from '@/features/learnerVisibility';
import { useLearnerJourney } from '@/hooks/useLearnerJourney';
import { useI18n } from '@/i18n';
import { learnerApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import styles from './OnboardingPage.module.css';

const STEP_KEYS = ['consent', 'profile', 'ready'] as const;

export default function OnboardingPage() {
  const learnerId = useAuthStore((state) => state.learnerId)!;
  const emotionTrackingEnabled = useAuthStore((state) => state.emotionTrackingEnabled);
  const navigate = useNavigate();
  const { t, isRtl } = useI18n();
  const { stage, refetch } = useLearnerJourney();
  const isExperimentalGroup = Boolean(emotionTrackingEnabled);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState({
    participation: false,
    performanceData: false,
    facialAnalysis: false,
    textSentiment: false,
    behavioralTracking: false,
  });
  const [profile, setProfile] = useState({
    yearsExperience: '',
    primaryRole: '',
    learningPref: 'no_preference',
  });

  const consentItems = useMemo(
    () => {
      const items = [
        { key: 'participation', label: t('learner.onboarding.consent.items.participation', ''), required: true },
        { key: 'performanceData', label: t('learner.onboarding.consent.items.performanceData', ''), required: true },
        { key: 'textSentiment', label: t('learner.onboarding.consent.items.textSentiment', ''), required: false },
        { key: 'behavioralTracking', label: t('learner.onboarding.consent.items.behavioralTracking', ''), required: false },
      ];

      if (isExperimentalGroup) {
        items.splice(2, 0, {
          key: 'facialAnalysis',
          label: t('learner.onboarding.consent.items.facialAnalysis', ''),
          required: false,
        });
      }

      return items;
    },
    [isExperimentalGroup, t],
  );

  useEffect(() => {
    setStep((current) => {
      if (stage === 'consent') return current === 0 ? 0 : current;
      if (stage === 'setup') return Math.max(current, 1);
      if (stage === 'ready') return 2;
      return current;
    });
  }, [stage]);

  async function submitConsent() {
    if (!consent.participation || !consent.performanceData) return;
    setBusy(true);
    try {
      await learnerApi.recordConsent(learnerId, {
        ...consent,
        facialAnalysis: isExperimentalGroup ? consent.facialAnalysis : false,
        consentVersion: '1.0',
      });
      writeLearnerOnboardingProgress(learnerId, {
        profileComplete: false,
        readyAcknowledged: false,
      });
      await refetch();
      setStep(1);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.errors.generic', 'Something went wrong. Please try again.');
      alert(message);
    } finally {
      setBusy(false);
    }
  }

  async function submitProfile() {
    setBusy(true);
    try {
      await learnerApi.updateProfile(learnerId, {
        yearsExperience: Number(profile.yearsExperience) || 0,
        primaryRole: profile.primaryRole,
        learningPref: profile.learningPref,
      });
    } catch {
      // Keep onboarding resilient if profile sync is briefly unavailable.
    } finally {
      writeLearnerOnboardingProgress(learnerId, {
        profileComplete: true,
        readyAcknowledged: false,
      });
      await refetch();
      setStep(2);
      setBusy(false);
    }
  }

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
      <div className={styles.steps}>
        {STEP_KEYS.map((stepKey, index) => (
          <div key={stepKey} className={`${styles.stepItem} ${index <= step ? styles.stepActive : ''}`}>
            <div className={styles.stepDot}>{index < step ? '\u2713' : index + 1}</div>
            <span>{t(`learner.onboarding.steps.${stepKey}`, stepKey)}</span>
            {index < STEP_KEYS.length - 1 ? <div className={styles.stepLine} /> : null}
          </div>
        ))}
      </div>

      {step === 0 ? (
        <div className={styles.stepCard}>
          <h1>{t('learner.onboarding.consent.title', 'Research Consent')}</h1>
          <p className={styles.intro}>
            {isExperimentalGroup
              ? t('learner.onboarding.consent.intro', '')
              : t('learner.onboarding.consent.controlIntro', '')}
          </p>

          <div className={styles.consentItems}>
            {consentItems.map(({ key, label, required }) => (
              <label key={key} className={styles.consentCheck}>
                <input
                  type="checkbox"
                  checked={consent[key as keyof typeof consent]}
                  onChange={(event) =>
                    setConsent((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                />
                <span>
                  {label}
                  {required ? <em style={{ color: 'var(--color-accent-2)' }}> {t('learner.onboarding.consent.items.required', 'Required')}</em> : null}
                </span>
              </label>
            ))}
          </div>

          <p className={styles.legal}>
            {isExperimentalGroup
              ? t('learner.onboarding.consent.legal', '')
              : t('learner.onboarding.consent.controlLegal', '')}
          </p>

          <button
            className="btn btn-primary"
            disabled={!consent.participation || !consent.performanceData || busy}
            onClick={submitConsent}
          >
            {busy ? t('learner.onboarding.consent.saving', 'Saving...') : t('learner.onboarding.consent.continue', 'Continue')}
            {!busy ? <ChevronRight size={16} style={{ transform: isRtl ? 'scaleX(-1)' : undefined }} /> : null}
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className={styles.stepCard}>
          <h1>{t('learner.onboarding.profile.title', 'Your Background')}</h1>
          <p className={styles.intro}>{t('learner.onboarding.profile.intro', '')}</p>

          <div className={styles.profileForm}>
            <div className="form-group">
              <label className="label">{t('learner.onboarding.profile.yearsExperience', '')}</label>
              <input
                type="number"
                className="input"
                min={0}
                max={40}
                value={profile.yearsExperience}
                onChange={(event) => setProfile((current) => ({ ...current, yearsExperience: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="label">{t('learner.onboarding.profile.primaryRole', 'Primary role')}</label>
              <input
                type="text"
                className="input"
                placeholder={t('learner.onboarding.profile.rolePlaceholder', 'e.g. Instructional Designer')}
                value={profile.primaryRole}
                onChange={(event) => setProfile((current) => ({ ...current, primaryRole: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="label">{t('learner.onboarding.profile.learningPref', 'Preferred learning approach')}</label>
              <select
                className="input"
                value={profile.learningPref}
                onChange={(event) => setProfile((current) => ({ ...current, learningPref: event.target.value }))}
                style={{ background: 'var(--color-surface-2)' }}
              >
                <option value="no_preference">{t('learner.onboarding.preferences.noPreference', 'No preference')}</option>
                <option value="reading_first">{t('learner.onboarding.preferences.readingFirst', 'Reading first')}</option>
                <option value="video_first">{t('learner.onboarding.preferences.videoFirst', 'Video first')}</option>
                <option value="simulation_first">{t('learner.onboarding.preferences.simulationFirst', 'Simulation first')}</option>
                <option value="discussion_first">{t('learner.onboarding.preferences.discussionFirst', 'Discussion first')}</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary" onClick={submitProfile} disabled={busy}>
            {busy ? t('learner.onboarding.consent.saving', 'Saving...') : t('learner.onboarding.profile.saveContinue', 'Save & continue')}
            {!busy ? <ChevronRight size={16} style={{ transform: isRtl ? 'scaleX(-1)' : undefined }} /> : null}
          </button>
        </div>
      ) : null}

      {step === 2 ? (
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
      ) : null}
    </div>
  );
}
