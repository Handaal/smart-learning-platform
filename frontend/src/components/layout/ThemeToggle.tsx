import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { useI18n } from '@/i18n';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const { t } = useI18n();

  const isDark = theme === 'dark';
  const label = isDark ? t('theme.toLight') : t('theme.toDark');

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
