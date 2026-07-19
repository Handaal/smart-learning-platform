import { Languages } from 'lucide-react';
import { useI18n } from '@/i18n';
import styles from './LanguageSwitcher.module.css';

export default function LanguageSwitcher() {
  const { language, toggleLanguage, t } = useI18n();
  const targetLabel = language === 'ar' ? 'English' : 'العربية';

  return (
    <button
      type="button"
      className={styles.switcher}
      onClick={toggleLanguage}
      aria-label={t('language.label')}
      title={targetLabel}
    >
      <Languages size={16} className={styles.icon} />
      <span className={styles.text}>{targetLabel}</span>
    </button>
  );
}
