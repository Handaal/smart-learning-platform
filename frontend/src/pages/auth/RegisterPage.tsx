import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { authApi } from '@/services/api';
import { useI18n } from '@/i18n';
import styles from './LoginPage.module.css';

export default function RegisterPage() {
  const [pid, setPid] = useState('');
  const [pass, setPass] = useState('');
  const [cohort, setCohort] = useState<'experimental' | 'control'>('experimental');
  const [createdId, setCreatedId] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!pass) {
      setErr(t('auth.register.errors.required'));
      return;
    }
    if (pass.length < 8) {
      setErr(t('auth.register.errors.shortPassword'));
      return;
    }

    setBusy(true);
    setErr('');
    try {
      const response = (await authApi.register({
        participantId: pid.trim() || undefined,
        password: pass,
        cohort,
        role: 'learner',
      })) as { data: { participantId: string } };
      setCreatedId(response.data.participantId);
    } catch (error: any) {
      setErr(error.message ?? t('auth.register.errors.failed'));
    } finally {
      setBusy(false);
    }
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
    </div>
  );
}
