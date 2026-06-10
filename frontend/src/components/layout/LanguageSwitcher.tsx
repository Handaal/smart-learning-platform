import { useI18n, type Language } from '@/i18n';
import styles from './LanguageSwitcher.module.css';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <label className={styles.switcher}>
      <span className={styles.label}>{t('language.label')}</span>
      <select
        className={styles.select}
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        aria-label={t('language.label')}
      >
        <option value="ar">{t('language.ar')}</option>
        <option value="en">{t('language.en')}</option>
      </select>
    </label>
  );
}
