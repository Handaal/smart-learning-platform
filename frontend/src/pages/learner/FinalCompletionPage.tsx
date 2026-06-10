import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n';
import styles from './FinalCompletionPage.module.css';

export default function FinalCompletionPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <span className={styles.iconWrap}>
          <CheckCircle2 size={34} />
        </span>
        <h1>{t('learner.completion.title', 'Training completed successfully')}</h1>
        <p>
          {t(
            'learner.completion.subtitle',
            'You completed the required training sequence: consent, profile/setup, ready screen, pre-test, training units, and post-test.',
          )}
        </p>

        <div className={styles.steps}>
          <div className={styles.step}>
            <span>1</span>
            {t('learner.completion.sequence.consent', 'Login and consent')}
          </div>
          <div className={styles.step}>
            <span>2</span>
            {t('learner.completion.sequence.setup', 'Profile and setup')}
          </div>
          <div className={styles.step}>
            <span>3</span>
            {t('learner.completion.sequence.ready', 'Ready screen')}
          </div>
          <div className={styles.step}>
            <span>4</span>
            {t('learner.completion.sequence.pretest', 'Pre-test')}
          </div>
          <div className={styles.step}>
            <span>5</span>
            {t('learner.completion.sequence.units', 'Training units')}
          </div>
          <div className={styles.step}>
            <span>6</span>
            {t('learner.completion.sequence.posttest', 'Post-test')}
          </div>
          <div className={styles.step}>
            <span>7</span>
            {t('learner.completion.sequence.complete', 'Final completion')}
          </div>
        </div>

        <div className={styles.note}>
          <Sparkles size={15} />
          <p>
            {t(
              'learner.completion.note',
              'Your learning and adaptive interaction records are now available in the research analytics dashboards.',
            )}
          </p>
        </div>

        <div className={styles.actions}>
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/help/learner')}>
            <ClipboardList size={14} />
            {t('learner.completion.actions.help', 'Open learner help')}
          </button>
          <button className="btn btn-primary" type="button" onClick={() => navigate('/dashboard')}>
            {t('learner.completion.actions.dashboard', 'Go to dashboard')}
          </button>
        </div>
      </section>
    </div>
  );
}
