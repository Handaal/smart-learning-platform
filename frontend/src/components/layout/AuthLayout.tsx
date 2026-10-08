import { Outlet } from 'react-router-dom';
import { useI18n } from '@/i18n';
import styles from './AuthLayout.module.css';

export default function AuthLayout() {
  const { t, language } = useI18n();
  const researchNotice =
    language === 'ar'
      ? 'بيئة تجريبية لأغراض البحث العلمي | رسالة دكتوراه | 2026'
      : 'Experimental environment for scientific research | PhD Dissertation | 2026';

  return (
    <div className={styles.root}>
      <div className={styles.brand}>
        <img
          className={styles.logo}
          src="/affectpath-logo.png"
          alt={t('app.brand.platformName')}
          width={220}
          height={165}
        />
        <p className={styles.tagline}>{t('app.brand.tagline')}</p>
      </div>
      <div className={styles.card}>
        <Outlet />
      </div>
      <footer className={styles.footer}>{researchNotice || t('app.footer.researchNotice')}</footer>
    </div>
  );
}
