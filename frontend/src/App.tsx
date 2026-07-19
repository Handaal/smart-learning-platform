import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { allowUnitsBeforePretest } from '@/features/learnerJourney';
import { useAuthStore } from '@/store/authStore';
import { useLearnerJourney } from '@/hooks/useLearnerJourney';
import { useI18n } from '@/i18n';

// Layouts (eager — needed on first paint of every route)
import AppLayout from '@/components/layout/AppLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import AppErrorBoundary from '@/components/feedback/AppErrorBoundary';

// Pages are lazy-loaded so heavy dependencies (MediaPipe/face-api on the
// session page, Recharts on research dashboards, Framer Motion in the course
// builder) are split into their own chunks and only fetched when visited.
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));

const DashboardPage = lazy(() => import('@/pages/learner/DashboardPage'));
const OnboardingPage = lazy(() => import('@/pages/learner/OnboardingPage'));
const ModulesPage = lazy(() => import('@/pages/learner/ModulesPage'));
const SessionPage = lazy(() => import('@/pages/learner/SessionPage'));
const ReflectionPage = lazy(() => import('@/pages/learner/ReflectionPage'));
const AssessmentPage = lazy(() => import('@/pages/learner/AssessmentPage'));
const PMToolsPage = lazy(() => import('@/pages/learner/PMToolsPage'));
const AdaptiveQuizPage = lazy(() => import('@/pages/learner/AdaptiveQuizPage'));
const LearnerHelpPage = lazy(() => import('@/pages/learner/LearnerHelpPage'));
const FinalCompletionPage = lazy(() => import('@/pages/learner/FinalCompletionPage'));

const ResearchAdminHome = lazy(() => import('@/pages/researchAdmin/ResearchAdminHome'));
const ResearchDashboard = lazy(() => import('@/pages/research/ResearchDashboard'));
const ParticipantView = lazy(() => import('@/pages/research/ParticipantView'));
const LearnerEvalDashboard = lazy(() => import('@/pages/research/LearnerEvalDashboard'));
const CourseUnitsPage = lazy(() => import('@/pages/admin/CourseUnitsPage'));
const UnitLessonsPage = lazy(() => import('@/pages/admin/UnitLessonsPage'));
const ResearchAdminHelpPage = lazy(() => import('@/pages/researchAdmin/ResearchAdminHelpPage'));
const EmotionValidationPage = lazy(() => import('@/pages/researchAdmin/EmotionValidationPage'));
const AdaptiveDisplayCriteriaPage = lazy(() => import('@/pages/researchAdmin/AdaptiveDisplayCriteriaPage'));
const ResearchAdminUserManagementPage = lazy(() => import('@/pages/researchAdmin/ResearchAdminUserManagementPage'));
const ConsentSettingsPage = lazy(() => import('@/pages/researchAdmin/ConsentSettingsPage'));

function parseJwtExpiry(token: string | null) {
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = JSON.parse(window.atob(padded));
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function useSessionSnapshot() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const learnerId = useAuthStore((state) => state.learnerId);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);

  const expiresAt = parseJwtExpiry(accessToken);
  const tokenExpired = expiresAt !== null && expiresAt <= Date.now();
  const hasSession = Boolean(accessToken && learnerId && role);
  const isValidSession = hasSession && !tokenExpired;

  useEffect(() => {
    if (accessToken && !isValidSession) {
      logout();
    }
  }, [accessToken, isValidSession, logout]);

  return { role, isValidSession };
}

function RootRedirect() {
  const { role, isValidSession } = useSessionSnapshot();

  if (!isValidSession) return <Navigate to="/login" replace />;
  if (role === 'research_admin') return <Navigate to="/research-admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

function RequireLearner({ children }: { children: React.ReactNode }) {
  const { role, isValidSession } = useSessionSnapshot();

  if (!isValidSession) return <Navigate to="/login" replace />;
  if (role !== 'learner') return <Navigate to="/research-admin" replace />;
  return <>{children}</>;
}

function RequireResearchAdmin({ children }: { children: React.ReactNode }) {
  const { role, isValidSession } = useSessionSnapshot();

  if (!isValidSession) return <Navigate to="/login" replace />;
  if (role !== 'research_admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function isHelpPath(pathname: string) {
  return pathname === '/help' || pathname === '/help/learner';
}

function isTrainingPath(pathname: string) {
  return (
    pathname === '/dashboard' ||
    pathname === '/modules' ||
    pathname === '/pm-tools' ||
    pathname === '/adaptive-quiz' ||
    pathname.startsWith('/session/') ||
    pathname.startsWith('/reflect/')
  );
}

function resolveLearnerJourneyRedirect(stage: ReturnType<typeof useLearnerJourney>['stage'], pathname: string) {
  const onDashboard = pathname === '/dashboard';
  const onOnboarding = pathname === '/onboarding';
  const onPreTest = pathname === '/assessment/pre';
  const onPostTest = pathname === '/assessment/post';
  const onCompletion = pathname === '/completion';
  const onAssessmentRoute = pathname.startsWith('/assessment/');
  const onHelp = isHelpPath(pathname);

  if (stage === 'pending_approval') {
    if (onDashboard || onHelp) return null;
    return '/dashboard';
  }

  if (stage === 'ready') {
    if (onOnboarding || onHelp) return null;
    return '/onboarding';
  }

  if (stage === 'pretest') {
    if (onPreTest || onHelp) return null;
    if (allowUnitsBeforePretest && isTrainingPath(pathname)) return null;
    return '/assessment/pre';
  }

  if (stage === 'posttest') {
    if (onPostTest || onHelp) return null;
    return '/assessment/post';
  }

  if (stage === 'completed') {
    if (onCompletion || onHelp) return null;
    return '/completion';
  }

  if (stage === 'training') {
    if (onOnboarding || onPreTest || onPostTest || onCompletion) return '/dashboard';
    if (onAssessmentRoute && !onHelp) return '/dashboard';
    if (!isTrainingPath(pathname) && !onHelp) return '/dashboard';
  }

  return null;
}

function LearnerJourneyBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { stage, isLoading, isError } = useLearnerJourney();
  const { t } = useI18n();
  const redirect = resolveLearnerJourneyRedirect(stage, location.pathname);

  if (isLoading) {
    return (
      <div className="loading-panel route-state">
        {t('common.loadingLearnerJourney')}
      </div>
    );
  }

  // Keep learner access resilient if APIs are temporarily unavailable.
  if (!isError && redirect && redirect !== location.pathname) {
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}

function RouteFallback() {
  const { t } = useI18n();
  return <div className="loading-panel route-state">{t('common.loading', 'Loading...')}</div>;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route element={<AppErrorBoundary><AuthLayout /></AppErrorBoundary>}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<AppErrorBoundary><RequireLearner><LearnerJourneyBoundary><AppLayout /></LearnerJourneyBoundary></RequireLearner></AppErrorBoundary>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/modules" element={<ModulesPage />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="/reflect/:sessionId" element={<ReflectionPage />} />
        <Route path="/assessment/:form" element={<AssessmentPage />} />
        <Route path="/completion" element={<FinalCompletionPage />} />
        <Route path="/pm-tools" element={<PMToolsPage />} />
        <Route path="/adaptive-quiz" element={<AdaptiveQuizPage />} />
        <Route path="/help" element={<LearnerHelpPage />} />
        <Route path="/help/learner" element={<LearnerHelpPage />} />
      </Route>

      <Route element={<AppErrorBoundary><RequireResearchAdmin><AppLayout /></RequireResearchAdmin></AppErrorBoundary>}>
        <Route path="/research-admin" element={<ResearchAdminHome />} />
        <Route path="/research-admin/course" element={<CourseUnitsPage />} />
        <Route path="/research-admin/course/units/:unitId" element={<UnitLessonsPage />} />
        <Route path="/research-admin/access" element={<ResearchAdminUserManagementPage />} />
        <Route path="/research-admin/consent" element={<ConsentSettingsPage />} />
        <Route path="/research-admin/reports" element={<ResearchDashboard />} />
        <Route path="/research-admin/emotion-validation" element={<EmotionValidationPage />} />
        <Route path="/research-admin/adaptive-display" element={<AdaptiveDisplayCriteriaPage />} />
        <Route path="/research-admin/help" element={<ResearchAdminHelpPage />} />
        <Route path="/research-admin/participants/:participantId" element={<ParticipantView />} />
        <Route path="/research-admin/participants/:participantId/eval" element={<LearnerEvalDashboard />} />

        <Route path="/research" element={<Navigate to="/research-admin/reports" replace />} />
        <Route path="/research/:participantId" element={<ParticipantView />} />
        <Route path="/research/:participantId/eval" element={<LearnerEvalDashboard />} />
        <Route path="/admin" element={<Navigate to="/research-admin" replace />} />
        <Route path="/admin/content" element={<Navigate to="/research-admin/course" replace />} />
        <Route path="/admin/verify" element={<Navigate to="/research-admin" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
