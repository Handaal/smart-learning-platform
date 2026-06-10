import { Outlet } from 'react-router-dom';
import { useI18n } from '@/i18n';
import styles from './AuthLayout.module.css';

export default function AuthLayout() {
  const { t } = useI18n();

  return (
    <div className={styles.root}>
      <div className={styles.brand}>
        <span className={styles.logo}>STEP</span>
        <p className={styles.tagline}>{t('app.brand.tagline')}</p>
      </div>
      <div className={styles.card}>
        <Outlet />
      </div>
      <footer className={styles.footer}>{t('app.footer.researchNotice')}</footer>
    </div>
  );
}
