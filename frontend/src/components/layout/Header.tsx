import { Menu } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/i18n';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import styles from './Header.module.css';

type Props = {
  title: string;
  subtitle: string;
  onMenuToggle: () => void;
};

export default function Header({ title, subtitle, onMenuToggle }: Props) {
  const role = useAuthStore((state) => state.role);
  const cohort = useAuthStore((state) => state.cohort);
  const { t } = useI18n();

  return (
    <header className={styles.header}>
      <div className={styles.leading}>
        <button type="button" className={styles.menuButton} onClick={onMenuToggle} aria-label={t('layout.header.toggleNavigation')}>
          <Menu size={18} />
        </button>

        <div className={styles.titles}>
          <span className={styles.kicker}>
            {role === 'research_admin' ? t('layout.header.researchWorkspace') : t('layout.header.learnerWorkspace')}
          </span>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </div>

      <div className={styles.actions}>
        <LanguageSwitcher />
        {role === 'learner' && cohort === 'experimental' ? (
          <div className={styles.workspacePill}>
            <span className={styles.workspaceDot} />
            {t('layout.header.experimentalSupportBadge', 'جلسة الدعم الذكي مفعلة')}
          </div>
        ) : role === 'learner' ? (
          <div className={styles.workspacePill}>
            <span className={styles.workspaceDot} />
            {t('layout.header.controlGroupBadge', 'Standard learning flow')}
          </div>
        ) : (
          <div className={styles.workspacePill}>
            <span className={styles.workspaceDot} />
            {t('layout.header.researchBadge')}
          </div>
        )}
      </div>
    </header>
  );
}
