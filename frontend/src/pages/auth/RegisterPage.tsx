import { useState } from 'react';
import { CheckCircle2, Camera, FlaskConical, ShieldCheck } from 'lucide-react';
import { authApi } from '@/services/api';
import { useI18n } from '@/i18n';
import styles from './LoginPage.module.css';

const PARTICIPANT_ID_PATTERN = /^[A-Za-z0-9]{3,32}$/;

export default function RegisterPage() {
  const [pid, setPid] = useState('');
  const [pass, setPass] = useState('');
  const [cohort, setCohort] = useState<'experimental' | 'control'>('experimental');
  const [createdId, setCreatedId] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const { t } = useI18n();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!pass) {
      setErr(t('auth.register.errors.required'));
      return;
    }
    if (pass.length < 8) {
      setErr(t('auth.register.errors.shortPassword'));
      return;
    }
    const trimmedPid = pid.trim();
    if (trimmedPid && !PARTICIPANT_ID_PATTERN.test(trimmedPid.replace(/[^A-Za-z0-9]/g, ''))) {
      setErr(t('auth.register.errors.invalidParticipantId'));
      return;
    }

    setErr('');
    setConsentOpen(true);
  }

  async function handleConsentApprove() {
    setConsentOpen(false);
    setBusy(true);
    setErr('');
    try {
      const response = (await authApi.register({
        participantId: pid.trim() || undefined,
        password: pass,
        cohort,
        role: 'learner',
        consentAccepted: true,
      })) as { data: { participantId: string } };
      setCreatedId(response.data.participantId);
    } catch (error: any) {
      setErr(error.message ?? t('auth.register.errors.failed'));
    } finally {
      setBusy(false);
    }
  }

  function handleConsentDecline() {
    setConsentOpen(false);
    setErr(t('auth.register.consent.declinedNote'));
  }

  return (
    <div>
      <h2 className={styles.heading}>{t('auth.register.title')}</h2>
      <p className={styles.sub}>{t('auth.register.subtitle')}</p>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className="form-group">
          <label className="label" htmlFor="rpid">
            {t('auth.register.participantId')}
          </label>
          <input
            id="rpid"
            type="text"
            className="input"
            placeholder={t('auth.register.participantPlaceholder')}
            value={pid}
            onChange={(event) => setPid(event.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="rpass">
            {t('auth.register.password')}
          </label>
          <input
            id="rpass"
            type="password"
            className="input"
            placeholder={t('auth.register.passwordPlaceholder')}
            value={pass}
            onChange={(event) => setPass(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="rcohort">
            {t('auth.register.cohort')}
          </label>
          <select
            id="rcohort"
            className="input"
            value={cohort}
            onChange={(event) => setCohort(event.target.value as 'experimental' | 'control')}
            style={{ background: 'var(--color-surface-2)' }}
          >
            <option value="experimental">{t('auth.register.experimentalOption', 'Experimental Group')}</option>
            <option value="control">{t('auth.register.controlOption', 'Control Group')}</option>
          </select>
        </div>

        {err && (
          <p className={styles.error} role="alert">
            {err}
          </p>
        )}

        {createdId && (
          <div className={styles.successCard} role="status">
            <span className={styles.successTitle}>
              <CheckCircle2 size={16} />
              {t('auth.register.generatedIdPrefix')}
            </span>
            <span className={styles.successId}>{createdId}</span>
            <p className={styles.successHint}>{t('auth.register.generatedIdSuffix')}</p>
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
          {busy
            ? t('auth.register.submitBusy')
            : createdId
              ? t('auth.register.submitAgain')
              : t('auth.register.submit')}
        </button>
      </form>

      <p className={styles.footer}>
        {t('auth.register.alreadyRegistered')}{' '}
        <a href="/login">{t('auth.register.signIn')}</a>
        {createdId ? ` ${t('auth.register.generatedIdLoginHint')}` : ''}
      </p>

      {consentOpen && (
        <div className={styles.consentOverlay} role="presentation">
          <div
            className={styles.consentDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-title"
          >
            <h3 id="consent-title" className={styles.consentTitle}>
              <ShieldCheck size={20} />
              {t('auth.register.consent.title')}
            </h3>
            <p className={styles.consentIntro}>{t('auth.register.consent.intro')}</p>
            <ul className={styles.consentList}>
              <li>
                <FlaskConical size={16} />
                <span>{t('auth.register.consent.pointResearch')}</span>
              </li>
              <li>
                <Camera size={16} />
                <span>{t('auth.register.consent.pointCamera')}</span>
              </li>
              <li>
                <ShieldCheck size={16} />
                <span>{t('auth.register.consent.pointAnonymity')}</span>
              </li>
            </ul>
            <div className={styles.consentActions}>
              <button type="button" className="btn btn-secondary" onClick={handleConsentDecline}>
                {t('auth.register.consent.decline')}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConsentApprove}>
                {t('auth.register.consent.approve')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
