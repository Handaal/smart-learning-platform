import { Outlet } from 'react-router-dom';
import { useI18n } from '@/i18n';
import styles from './AuthLayout.module.css';

export default function AuthLayout() {
  const { t, language } = useI18n();
  const researchNotice =
    language === 'ar'
      ? 'مشروع بحث دكتوراه · سري · 2026'
      : 'PhD Research Project · Confidential · 2026';

  return (
    <div className={styles.root}>
      <div className={styles.brand}>
        <span className={styles.logo}>STEP</span>
        <p className={styles.tagline}>{t('app.brand.tagline')}</p>
      </div>
      <div className={styles.card}>
        <Outlet />
      </div>
      <footer className={styles.footer}>{researchNotice || t('app.footer.researchNotice')}</footer>
    </div>
  );
}
