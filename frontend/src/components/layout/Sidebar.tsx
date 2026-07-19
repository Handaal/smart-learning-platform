import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Camera,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  LayoutDashboard,
  LibraryBig,
  ListChecks,
  LogOut,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';
import { useI18n } from '@/i18n';
import styles from './Sidebar.module.css';

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  key: string;
  label: string;
  arabicLabel?: string;
};

const LEARNER_NAV: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'layout.sidebar.nav.dashboard', label: 'Dashboard' },
  { to: '/modules', icon: BookOpen, key: 'layout.sidebar.nav.modules', label: 'Modules' },
  { to: '/pm-tools', icon: Wrench, key: 'layout.sidebar.nav.pmTools', label: 'PM Tools' },
  { to: '/help', icon: CircleHelp, key: 'layout.sidebar.nav.help', label: 'Help Guide' },
];

const RESEARCH_ADMIN_NAV: NavItem[] = [
  { to: '/research-admin', icon: LayoutDashboard, key: 'layout.sidebar.nav.researchAdmin', label: 'Research Admin' },
  {
    to: '/research-admin/access',
    icon: BookOpen,
    key: 'layout.sidebar.nav.accessManagement',
    label: 'User & Group Management',
    arabicLabel: 'إدارة المستخدمين والمجموعات',
  },
  { to: '/research-admin/course', icon: LibraryBig, key: 'layout.sidebar.nav.courseBuilder', label: 'Course Builder' },
  { to: '/research-admin/reports', icon: FlaskConical, key: 'layout.sidebar.nav.reports', label: 'Emotion Reports' },
  { to: '/research-admin/emotion-validation', icon: Camera, key: 'layout.sidebar.nav.emotionValidation', label: 'Emotion Validation Lab' },
  { to: '/research-admin/adaptive-display', icon: ListChecks, key: 'layout.sidebar.nav.adaptiveDisplayCriteria', label: 'Adaptive Display Criteria' },
  {
    to: '/research-admin/consent',
    icon: ShieldCheck,
    key: 'layout.sidebar.nav.consentSettings',
    label: 'Consent & Terms',
    arabicLabel: 'نص الموافقة والشروط',
  },
  { to: '/research-admin/help', icon: CircleHelp, key: 'layout.sidebar.nav.help', label: 'Help Guide' },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: Props) {
  const role = useAuthStore((state) => state.role);
  const pid = useAuthStore((state) => state.participantId);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { t, isRtl } = useI18n();

  const navItems = [
    ...(role === 'learner' ? LEARNER_NAV : []),
    ...(role === 'research_admin' ? RESEARCH_ADMIN_NAV : []),
  ];

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors during local logout.
    }

    logout();
    onClose();
    navigate('/login');
  }

  return (
    <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
      <div className={styles.brandRow}>
        <div className={styles.brand}>
          <span className={styles.logo}>STEP</span>
          <span className={styles.logoSub}>{t('app.brand.platformName')}</span>
        </div>

        <button type="button" className={styles.mobileClose} onClick={onClose} aria-label={t('layout.sidebar.closeNavigation')}>
          <X size={18} />
        </button>
      </div>

      <div className={styles.workspaceMeta}>
        <span className={styles.workspaceLabel}>
          {role === 'research_admin' ? t('layout.sidebar.workspaceLabel.researchAdmin') : t('layout.sidebar.workspaceLabel.learner')}
        </span>
        <p className={styles.workspaceText}>
          {role === 'research_admin'
            ? t('layout.sidebar.workspaceText.researchAdmin')
            : t('layout.sidebar.workspaceText.learner')}
        </p>
      </div>

      <nav className={styles.nav} aria-label={t('layout.sidebar.primaryNavigation')}>
        {navItems.map(({ to, icon: Icon, key, label, arabicLabel }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>
              <Icon size={18} />
            </span>
            <span className={styles.navLabel}>{arabicLabel && isRtl ? arabicLabel : t(key, label)}</span>
            <ChevronRight size={14} className={styles.chevron} style={isRtl ? { transform: 'rotate(180deg)' } : undefined} />
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.user}>
          <div className={styles.avatar}>{(pid ?? 'U').slice(0, 2).toUpperCase()}</div>
          <div className={styles.userInfo}>
            <span className={styles.userId}>{pid ?? t('common.participant')}</span>
            <span className={styles.userRole}>{role === 'research_admin' ? t('common.role.researchAdmin') : t('common.role.learner')}</span>
          </div>
        </div>

        <button className={styles.logoutBtn} onClick={handleLogout} aria-label={t('layout.sidebar.logout')}>
          <LogOut size={16} />
          <span>{t('layout.sidebar.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
