import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';
import { useI18n } from '@/i18n';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [pid, setPid] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const { t } = useI18n();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  const demoAccounts = [
    {
      label: t('auth.login.experimentalDemo.label'),
      participantId: 'EXP00000000000000001',
      password: 'research2026',
      description: t('auth.login.experimentalDemo.description'),
    },
    {
      label: t('auth.login.controlDemo.label'),
      participantId: 'CTL00000000000000001',
      password: 'research2026',
      description: t('auth.login.controlDemo.description'),
    },
    {
      label: t('auth.login.researchDemo.label'),
      participantId: 'RADMIN00000000000001',
      password: 'research2026',
      description: t('auth.login.researchDemo.description'),
    },
  ];

  async function submitLogin() {
    if (busy) return;
    if (!pid || !pass) {
      setErr(t('common.errors.missingCredentials'));
      return;
    }

    setBusy(true);
    setErr('');

    try {
      const res = await authApi.login(pid.trim(), pass);
      setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      const me = await authApi.me();
      const role = me.data.role;

      setUser({
        learnerId: me.data.id,
        participantId: me.data.participantId,
        cohort: me.data.cohort as any,
        role,
      });

      if (role === 'research_admin') navigate('/research-admin');
      else navigate('/dashboard');
    } catch (error: any) {
      setErr(error.message ?? t('auth.login.failed'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submitLogin();
  }

  async function handleInputEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    await submitLogin();
  }

  return (
    <div>
      <h2 className={styles.heading}>{t('auth.login.title')}</h2>
      <p className={styles.sub}>{t('auth.login.subtitle')}</p>

      <section className={styles.demoPanel} aria-label={t('auth.login.demoTitle')}>
        <div className={styles.demoHeader}>
          <strong>{t('auth.login.demoTitle')}</strong>
          <span>{t('auth.login.demoSubtitle')}</span>
        </div>
        <div className={styles.demoList}>
          {demoAccounts.map((account) => (
            <button
              key={account.label}
              type="button"
              className={styles.demoCard}
              onClick={() => {
                setPid(account.participantId);
                setPass(account.password);
                setErr('');
              }}
            >
              <div>
                <strong>{account.label}</strong>
                <p>{account.description}</p>
              </div>
              <div className={styles.demoMeta}>
                <span>{account.participantId}</span>
                <span>{account.password}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className="form-group">
          <label className="label" htmlFor="pid">
            {t('auth.login.participantId')}
          </label>
          <input
            id="pid"
            type="text"
            className="input"
            placeholder={t('auth.login.participantPlaceholder')}
            value={pid}
            onChange={(event) => setPid(event.target.value)}
            onKeyDown={handleInputEnter}
            autoComplete="username"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="pass">
            {t('auth.login.password')}
          </label>
          <input
            id="pass"
            type="password"
            className="input"
            placeholder="••••••••"
            value={pass}
            onChange={(event) => setPass(event.target.value)}
            onKeyDown={handleInputEnter}
            autoComplete="current-password"
          />
        </div>

        {err && (
          <p className={styles.error} role="alert">
            {err}
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          style={{ width: '100%' }}
          onClick={() => {
            void submitLogin();
          }}
        >
          {busy ? (
            <span
              className="spin"
              style={{
                width: 16,
                height: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                display: 'inline-block',
              }}
            />
          ) : (
            t('auth.login.submit')
          )}
        </button>
      </form>

      <p className={styles.footer}>
        {t('auth.login.noAccountPrefix')}{' '}
        <a href="/register">{t('auth.login.createAccount')}</a>
      </p>
    </div>
  );
}
