import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/i18n';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './AppLayout.module.css';

type PageMeta = {
  title: string;
  subtitle: string;
};

function resolvePageMeta(
  pathname: string,
  role: 'learner' | 'research_admin' | null,
  t: (key: string, fallback?: string) => string,
  language: 'ar' | 'en',
): PageMeta {
  if (pathname.startsWith('/research-admin/course')) {
    return {
      title: t('layout.pageMeta.courseBuilderTitle'),
      subtitle: t('layout.pageMeta.courseBuilderSubtitle'),
    };
  }

  if (pathname.startsWith('/research-admin/reports')) {
    return {
      title: t('layout.pageMeta.reportsTitle'),
      subtitle: t('layout.pageMeta.reportsSubtitle'),
    };
  }

  if (pathname.startsWith('/research-admin/emotion-validation')) {
    return {
      title: t('layout.pageMeta.emotionValidationTitle'),
      subtitle: t('layout.pageMeta.emotionValidationSubtitle'),
    };
  }

  if (pathname.startsWith('/research-admin/adaptive-display')) {
    return {
      title: t('layout.pageMeta.adaptiveDisplayCriteriaTitle'),
      subtitle: t('layout.pageMeta.adaptiveDisplayCriteriaSubtitle'),
    };
  }

  if (pathname.startsWith('/research-admin/access')) {
    return {
      title: t('layout.pageMeta.userManagementTitle'),
      subtitle: t('layout.pageMeta.userManagementSubtitle'),
    };
  }

  if (pathname.startsWith('/research-admin/consent')) {
    return {
      title: t('layout.pageMeta.consentSettingsTitle', 'Consent & Terms'),
      subtitle: t('layout.pageMeta.consentSettingsSubtitle', 'Registration consent text'),
    };
  }

  if (pathname.startsWith('/research-admin/help')) {
    return {
      title: t('layout.pageMeta.researchHelpTitle'),
      subtitle: t('layout.pageMeta.researchHelpSubtitle'),
    };
  }

  if (pathname.startsWith('/research-admin/participants')) {
    return {
      title: t('layout.pageMeta.participantTitle'),
      subtitle: t('layout.pageMeta.participantSubtitle'),
    };
  }

  if (pathname.startsWith('/research-admin')) {
    return {
      title: t('layout.pageMeta.researchHomeTitle'),
      subtitle: t('layout.pageMeta.researchHomeSubtitle'),
    };
  }

  if (pathname.startsWith('/modules')) {
    return {
      title: t('layout.pageMeta.modulesTitle'),
      subtitle: t('layout.pageMeta.modulesSubtitle'),
    };
  }

  if (pathname.startsWith('/session/')) {
    return {
      title: t('layout.pageMeta.sessionTitle'),
      subtitle: t('layout.pageMeta.sessionSubtitle'),
    };
  }

  if (pathname.startsWith('/reflect/')) {
    return {
      title: t('layout.pageMeta.reflectionTitle'),
      subtitle: t('layout.pageMeta.reflectionSubtitle'),
    };
  }

  if (pathname.startsWith('/assessment/')) {
    return {
      title: t('layout.pageMeta.assessmentTitle'),
      subtitle: t('layout.pageMeta.assessmentSubtitle'),
    };
  }

  if (pathname.startsWith('/help')) {
    return {
      title: t('layout.pageMeta.learnerHelpTitle'),
      subtitle: t('layout.pageMeta.learnerHelpSubtitle'),
    };
  }

  if (pathname.startsWith('/pm-tools')) {
    return {
      title: t('layout.pageMeta.pmToolsTitle'),
      subtitle: t('layout.pageMeta.pmToolsSubtitle'),
    };
  }

  return role === 'research_admin'
    ? {
        title: t('layout.pageMeta.researchHomeTitle'),
        subtitle: t('layout.pageMeta.researchHomeSubtitle'),
      }
    : {
        title: t('layout.pageMeta.learnerDashboardTitle'),
        subtitle: t('layout.pageMeta.learnerDashboardSubtitle'),
      };
}

export default function AppLayout() {
  const location = useLocation();
  const role = useAuthStore((state) => state.role);
  const { t, language } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageMeta = useMemo(() => resolvePageMeta(location.pathname, role, t, language), [language, location.pathname, role, t]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className={styles.root}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <button
        type="button"
        className={`${styles.backdrop} ${sidebarOpen ? styles.backdropVisible : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-label={t('layout.sidebar.closeNavigation')}
        tabIndex={sidebarOpen ? 0 : -1}
      />

      <div className={styles.main}>
        <Header
          title={pageMeta.title}
          subtitle={pageMeta.subtitle}
          onMenuToggle={() => setSidebarOpen((current) => !current)}
        />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
