import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { allowUnitsBeforePretest } from '@/features/learnerJourney';
import { useAuthStore } from '@/store/authStore';
import { useLearnerJourney } from '@/hooks/useLearnerJourney';

// Layouts
import AppLayout from '@/components/layout/AppLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import AppErrorBoundary from '@/components/feedback/AppErrorBoundary';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';

// Learner pages
import DashboardPage from '@/pages/learner/DashboardPage';
import OnboardingPage from '@/pages/learner/OnboardingPage';
import ModulesPage from '@/pages/learner/ModulesPage';
import SessionPage from '@/pages/learner/SessionPage';
import ReflectionPage from '@/pages/learner/ReflectionPage';
import AssessmentPage from '@/pages/learner/AssessmentPage';
import PMToolsPage from '@/pages/learner/PMToolsPage';
import AdaptiveQuizPage from '@/pages/learner/AdaptiveQuizPage';
import LearnerHelpPage from '@/pages/learner/LearnerHelpPage';
import FinalCompletionPage from '@/pages/learner/FinalCompletionPage';

// Research Admin pages
import ResearchAdminHome from '@/pages/researchAdmin/ResearchAdminHome';
import ResearchDashboard from '@/pages/research/ResearchDashboard';
import ParticipantView from '@/pages/research/ParticipantView';
import LearnerEvalDashboard from '@/pages/research/LearnerEvalDashboard';
import ContentControlHub from '@/pages/admin/ContentControlHub';
import ResearchAdminHelpPage from '@/pages/researchAdmin/ResearchAdminHelpPage';
import EmotionValidationPage from '@/pages/researchAdmin/EmotionValidationPage';
import AdaptiveDisplayCriteriaPage from '@/pages/researchAdmin/AdaptiveDisplayCriteriaPage';

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
  const onOnboarding = pathname === '/onboarding';
  const onPreTest = pathname === '/assessment/pre';
  const onPostTest = pathname === '/assessment/post';
  const onCompletion = pathname === '/completion';
  const onAssessmentRoute = pathname.startsWith('/assessment/');
  const onHelp = isHelpPath(pathname);

  if (stage === 'consent') {
    if (onOnboarding || onHelp) return null;
    return '/onboarding';
  }

  if (stage === 'setup' || stage === 'ready') {
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
  const redirect = resolveLearnerJourneyRedirect(stage, location.pathname);

  if (isLoading) {
    return (
      <div className="loading-panel route-state">
        Loading learner journey...
      </div>
    );
  }

  // Keep learner access resilient if APIs are temporarily unavailable.
  if (!isError && redirect && redirect !== location.pathname) {
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}

function AssessmentEntryRedirect() {
  const { stage, isLoading } = useLearnerJourney();

  if (isLoading) {
    return (
      <div className="loading-panel route-state route-state-sm">
        Preparing assessment flow...
      </div>
    );
  }

  if (stage === 'pretest') return <Navigate to="/assessment/pre" replace />;
  if (stage === 'posttest') return <Navigate to="/assessment/post" replace />;
  if (stage === 'consent' || stage === 'setup' || stage === 'ready') return <Navigate to="/onboarding" replace />;
  if (stage === 'completed') return <Navigate to="/completion" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
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
        <Route path="/assessment" element={<AssessmentEntryRedirect />} />
        <Route path="/assessment/:form" element={<AssessmentPage />} />
        <Route path="/completion" element={<FinalCompletionPage />} />
        <Route path="/pm-tools" element={<PMToolsPage />} />
        <Route path="/adaptive-quiz" element={<AdaptiveQuizPage />} />
        <Route path="/help" element={<LearnerHelpPage />} />
        <Route path="/help/learner" element={<LearnerHelpPage />} />
      </Route>

      <Route element={<AppErrorBoundary><RequireResearchAdmin><AppLayout /></RequireResearchAdmin></AppErrorBoundary>}>
        <Route path="/research-admin" element={<ResearchAdminHome />} />
        <Route path="/research-admin/course" element={<ContentControlHub />} />
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
        <Route path="/admin/content" element={<ContentControlHub />} />
        <Route path="/admin/verify" element={<Navigate to="/research-admin" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
