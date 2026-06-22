import { useAuthStore } from '@/store/authStore';

const BASE = import.meta.env.VITE_API_BASE_URL
  ? String(import.meta.env.VITE_API_BASE_URL)
  : '';

class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

async function request<T>(
  path:    string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().accessToken;

  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Auto-logout on 401
    if (res.status === 401) useAuthStore.getState().logout();
    throw new ApiError(res.status, body.error ?? 'Request failed', body.code);
  }

  return res.json() as Promise<T>;
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const token = useAuthStore.getState().accessToken;

  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) useAuthStore.getState().logout();
    throw new ApiError(res.status, body.error ?? 'Request failed', body.code);
  }

  return res.blob();
}

async function downloadBlob(path: string, fileName: string) {
  const blob = await requestBlob(path, { method: 'GET' });
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

const get  = <T>(path: string) => request<T>(path, { method: 'GET' });
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login:    (participantId: string, password: string) =>
    post<{ data: { accessToken: string; refreshToken: string; learnerId: string } }>(
      '/auth/login', { participantId, password }),
  register: (body: object) => post('/auth/register', body),
  me:       () => get<{ data: {
    id: string;
    participantId: string;
    cohort: 'experimental' | 'control';
    role: 'learner' | 'research_admin';
    isActive: boolean;
    groupLabel: string;
    groupEmotionTrackingEnabled: boolean;
    emotionTrackingOverride: boolean | null;
    emotionTrackingEnabled: boolean;
  } }>('/auth/me'),
  logout:   () => post('/auth/logout', {}),
};

// ── Learner ──────────────────────────────────────────────────
export const learnerApi = {
  getProfile: (id: string)        => get<{ data: unknown }>(`/learners/${id}/profile`),
  updateProfile: (id: string, body: object) => patch(`/learners/${id}/profile`, body),
  getConsent: (id: string)        => get<{ data: unknown }>(`/learners/${id}/consent`),
  recordConsent: (id: string, body: object) => post(`/learners/${id}/consent`, body),
  withdrawConsent: (id: string)   => post(`/learners/${id}/withdraw`, {}),
  getProgress: (id: string)       => get<{ data: unknown }>(`/learners/${id}/progress`),
  getAdminOverview: () => get<{ data: unknown }>('/learners/admin/overview'),
  updateGroupEmotionTracking: (cohort: 'experimental' | 'control', emotionTrackingEnabled: boolean) =>
    patch<{ data: unknown }>(`/learners/admin/groups/${cohort}`, { emotionTrackingEnabled }),
  updateLearnerAccess: (id: string, body: { isActive?: boolean; emotionTrackingOverride?: boolean | null }) =>
    patch<{ data: unknown }>(`/learners/admin/learners/${id}`, body),
  deleteLearner: (id: string) => del<{ data: unknown }>(`/learners/admin/learners/${id}`),
};

// ── Sessions ─────────────────────────────────────────────────
export const sessionApi = {
  start: (body: { moduleId: string; episodeId?: string; scaffoldLevel?: number }) =>
    post<{ data: { id: string } }>('/sessions', body),
  get:    (id: string)  => get<{ data: unknown }>(`/sessions/${id}`),
  update: (id: string, body: object) => patch(`/sessions/${id}`, body),
  end:    (id: string)  => post(`/sessions/${id}/end`, {}),
  getByLearner: (learnerId: string) =>
    get<{ data: unknown[] }>(`/sessions/learner/${learnerId}`),
};

// ── Emotion ──────────────────────────────────────────────────
export const emotionApi = {
  ingestBehavior: (body: object)     => post('/emotion/behavior', body),
  getTimeline: (sessionId: string)   =>
    get<{ data: { time: string; state: string; raw: string; confidence: number }[] }>(
      `/emotion/timeline/${sessionId}`),
};

// ── Scenarios ────────────────────────────────────────────────
export const scenarioApi = {
  listModules:    () => get<{ data: unknown[] }>('/scenarios/modules'),
  getModule:      (id: string) => get<{ data: unknown }>(`/scenarios/modules/${id}`),
  getEpisode:     (id: string) => get<{ data: unknown }>(`/scenarios/episodes/${id}`),
  recordDecision: (body: object) => post('/scenarios/decisions', body),
  uploadContent:  (body: object) => post('/scenarios/content/upload', body),
  getProgress:    (learnerId: string) =>
    get<{ data: unknown[] }>(`/scenarios/progress/${learnerId}`),
  
  // CRUD
  applySuggestedOutline: (body: object) => post('/scenarios/modules/apply-outline', body),
  createModule:  (body: object) => post('/scenarios/modules', body),
  updateModule:  (id: string, body: object) => patch(`/scenarios/modules/${id}`, body),
  deleteModule:  (id: string) => request(`/scenarios/modules/${id}`, { method: 'DELETE' }),
  
  createEpisode: (body: object) => post('/scenarios/episodes', body),
  updateEpisode: (id: string, body: object) => patch(`/scenarios/episodes/${id}`, body),
  deleteEpisode: (id: string) => request(`/scenarios/episodes/${id}`, { method: 'DELETE' }),

  updateContent:  (id: string, body: object) => patch(`/scenarios/content/${id}`, body),
  deleteContent:  (id: string) => request(`/scenarios/content/${id}`, { method: 'DELETE' }),
  reorderContent: (items: any[]) => post('/scenarios/content/reorder', { items }),

  reorder:       (items: any[]) => post('/scenarios/reorder', { items }),
};

// —— Quizing ————————————————————————————————————————————————————————————————
export const quizApi = {
  listQuizzes: (params?: { scope?: string; courseKey?: string; moduleId?: string; episodeId?: string }) => {
    const search = new URLSearchParams();
    if (params?.scope) search.set('scope', params.scope);
    if (params?.courseKey) search.set('courseKey', params.courseKey);
    if (params?.moduleId) search.set('moduleId', params.moduleId);
    if (params?.episodeId) search.set('episodeId', params.episodeId);
    return get<{ data: unknown[] }>(`/quizzes${search.size ? `?${search.toString()}` : ''}`);
  },
  createQuiz:   (body: object) => post<{ data: unknown }>('/quizzes', body),
  updateQuiz:   (id: string, body: object) => patch<{ data: unknown }>(`/quizzes/${id}`, body),
  deleteQuiz:   (id: string) => request(`/quizzes/${id}`, { method: 'DELETE' }),
  reorderQuizzes: (items: any[]) => post('/quizzes/reorder', { items }),

  createQuestion:    (quizId: string, body: object) => post<{ data: unknown }>(`/quizzes/${quizId}/questions`, body),
  updateQuestion:    (questionId: string, body: object) => patch<{ data: unknown }>(`/quizzes/questions/${questionId}`, body),
  deleteQuestion:    (questionId: string) => request(`/quizzes/questions/${questionId}`, { method: 'DELETE' }),
  duplicateQuestion: (questionId: string) => post<{ data: unknown }>(`/quizzes/questions/${questionId}/duplicate`, {}),
  reorderQuestions:  (items: any[]) => post('/quizzes/questions/reorder', { items }),

  getLatestAttempt: (quizId: string, sessionId?: string) =>
    get<{ data: unknown }>(`/quizzes/${quizId}/attempts/latest${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''}`),
  submitQuiz: (quizId: string, body: object) => post<{ data: unknown }>(`/quizzes/${quizId}/submit`, body),
};

// ── Reflections ──────────────────────────────────────────────
export const reflectionApi = {
  submit: (body: { sessionId: string; promptId: string; responseText: string }) =>
    post<{ data: unknown }>('/reflections', body),
  getBySession: (sessionId: string) =>
    get<{ data: unknown[] }>(`/reflections/session/${sessionId}`),
  getByLearner: (learnerId: string) =>
    get<{ data: unknown[] }>(`/reflections/learner/${learnerId}`),
};

// ── Assessments ──────────────────────────────────────────────
export const assessmentApi = {
  start:  (form: string) => post<{ data: unknown }>('/assessments/start', { form }),
  submit: (id: string, body: object) => post(`/assessments/${id}/submit`, body),
  get:    (id: string) => get<{ data: unknown }>(`/assessments/${id}`),
  getByLearner: (learnerId: string) =>
    get<{ data: unknown[] }>(`/assessments/learner/${learnerId}`),
};

// ── Research ─────────────────────────────────────────────────
export const researchApi = {
  competencyGain:           () => get('/research/competency-gain'),
  emotionFrequency:         (params?: string) => get(`/research/emotion-frequency${params ? '?' + params : ''}`),
  adaptiveEffectiveness:    () => get('/research/adaptive-effectiveness'),
  engagement:               () => get('/research/engagement'),
  responseTypeDistribution: () => get('/research/response-types'),
  reflectionDepth:          () => get('/research/reflection-depth'),
  contentEngagement:        () => get('/research/content-engagement'),
  assessmentLatency:        () => get('/research/assessment-latency'),
  timelineHeatmap:          (params?: string) => get(`/research/timeline-heatmap${params ? '?' + params : ''}`),
  participantSummary:       (pid: string) => get(`/research/participant/${pid}`),
  logAdminSimulation:       (body: object) => post('/research/admin-simulations', body),
  exportSessions:           () => downloadBlob('/research/export/sessions', 'step_sessions.csv'),
  exportCompetency:         () => downloadBlob('/research/export/competency', 'step_competency.csv'),
  exportReflections:        () => downloadBlob('/research/export/reflections', 'step_reflections.csv'),
  exportEmotionEvents:      () => downloadBlob('/research/export/emotion-events', 'step_emotion_events.csv'),
  exportTimelineHeatmap:    (params?: string) => downloadBlob(`/research/export/timeline-heatmap${params ? `?${params}` : ''}`, 'step_timeline_heatmap.csv'),
  exportMergedAnalytics:    () => downloadBlob('/research/export/merged-ml-dataset', 'step_merged_ml_dataset.csv'),
};

export { ApiError };
