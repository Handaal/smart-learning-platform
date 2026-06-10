import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Download,
  FlaskConical,
  Gauge,
  Layers3,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { researchApi } from '@/services/api';
import { useI18n } from '@/i18n';
import {
  MOCK_ADAPTIVE_EFFECTIVENESS,
  MOCK_COMPETENCY_GAIN,
  MOCK_ENGAGEMENT,
  MOCK_PARTICIPANT_SUMMARY,
  MOCK_REFLECTION_DEPTH,
  MOCK_RESPONSE_TYPE_DISTRIBUTION,
  MOCK_TIMELINE_HEATMAP,
  USE_MOCK,
} from '@/services/mockData';
import {
  CanonicalEmotionState,
  RESEARCH_EMOTION_ORDER,
  emotionDisplayName,
  normalizeEmotionState,
} from '@/components/research/emotionPresentation';
import styles from './ResearchDashboard.module.css';

const EMOTIONS: CanonicalEmotionState[] = RESEARCH_EMOTION_ORDER;
const CONTENT_TYPES = ['text', 'video', 'image', 'interactive_activity', 'reflection_prompt', 'quiz', 'scenario', 'unknown'] as const;

const SECTION_LINKS = [
  { id: 'overview', key: 'research.dashboard.sectionLinks.overview' },
  { id: 'progress', key: 'research.dashboard.sectionLinks.progress' },
  { id: 'prepost', key: 'research.dashboard.sectionLinks.prepost' },
  { id: 'emotions', key: 'research.dashboard.sectionLinks.emotions' },
  { id: 'interventions', key: 'research.dashboard.sectionLinks.interventions' },
  { id: 'emotion-performance', key: 'research.dashboard.sectionLinks.emotionPerformance' },
  { id: 'content-types', key: 'research.dashboard.sectionLinks.contentTypes' },
  { id: 'drilldown', key: 'research.dashboard.sectionLinks.drilldown' },
  { id: 'comparison', key: 'research.dashboard.sectionLinks.comparison' },
  { id: 'response-types', key: 'research.dashboard.sectionLinks.responseTypes' },
  { id: 'participant-detail', key: 'research.dashboard.sectionLinks.participantDetail' },
  { id: 'exports', key: 'research.dashboard.sectionLinks.exports' },
] as const;

type FilterState = {
  cohort: 'all' | 'experimental' | 'control';
  participantQuery: string;
  emotion: 'all' | CanonicalEmotionState;
  unit: string;
  sessionQuery: string;
  responseType: string;
};

type ReportCatalogItem = {
  id: string;
  title: string;
  description: string;
  interpretation: string;
  metric: string;
  state: 'ready' | 'partial' | 'waiting';
  icon: typeof Users;
  preview: 'bars' | 'line' | 'matrix' | 'table' | 'timeline' | 'scatter';
};

function clampPreview(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function normalizePreviewSeries(values: number[], targetLength = values.length || 1) {
  const safe = values.filter((value) => Number.isFinite(value)).map((value) => Math.max(0, value));
  const base = safe.length ? [...safe] : [0];
  while (base.length < targetLength) {
    base.push(base[base.length - 1] ?? 0);
  }
  const trimmed = base.slice(0, targetLength);
  const max = Math.max(...trimmed, 1);
  return trimmed.map((value) => clampPreview((value / max) * 100));
}

function linePath(values: number[], width = 200, height = 70, padding = 10) {
  const safe = values.length ? values : [0];
  const step = safe.length > 1 ? (width - padding * 2) / (safe.length - 1) : 0;
  return safe
    .map((value, index) => {
      const x = padding + step * index;
      const y = height - padding - ((clampPreview(value) / 100) * (height - padding * 2));
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function ResearchDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    cohort: 'all',
    participantQuery: '',
    emotion: 'all',
    unit: 'all',
    sessionQuery: '',
    responseType: 'all',
  });
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const cohortLabel = (value: string) => formatCohortLabel(t, value);

  const gainQuery = useQuery({ queryKey: ['research', 'gain'], queryFn: researchApi.competencyGain, enabled: !USE_MOCK });
  const engagementQuery = useQuery({ queryKey: ['research', 'engagement'], queryFn: researchApi.engagement, enabled: !USE_MOCK });
  const effectivenessQuery = useQuery({ queryKey: ['research', 'effectiveness'], queryFn: researchApi.adaptiveEffectiveness, enabled: !USE_MOCK });
  const responseTypeQuery = useQuery({ queryKey: ['research', 'response-types'], queryFn: researchApi.responseTypeDistribution, enabled: !USE_MOCK });
  const depthQuery = useQuery({ queryKey: ['research', 'reflection-depth'], queryFn: researchApi.reflectionDepth, enabled: !USE_MOCK });
  const heatmapQuery = useQuery({ queryKey: ['research', 'heatmap'], queryFn: () => researchApi.timelineHeatmap(), enabled: !USE_MOCK });
  const contentEngagementQuery = useQuery({ queryKey: ['research', 'content-engagement'], queryFn: researchApi.contentEngagement, enabled: !USE_MOCK });
  const assessmentLatencyQuery = useQuery({ queryKey: ['research', 'assessment-latency'], queryFn: researchApi.assessmentLatency, enabled: !USE_MOCK });
  const emotionFrequencyQuery = useQuery({ queryKey: ['research', 'emotion-frequency'], queryFn: () => researchApi.emotionFrequency(), enabled: !USE_MOCK });

  const gains = useMemo(() => {
    const rows = USE_MOCK ? MOCK_COMPETENCY_GAIN : ((gainQuery.data as any)?.data ?? []);
    return asArray(rows).map((row: any) => ({
      participantId: String(row.participant_id ?? row.participantId ?? ''),
      cohort: normalizeCohort(row.cohort),
      preScore: num(row.pre_score),
      postScore: num(row.post_score),
      gain: row.gain === null || row.gain === undefined ? null : num(row.gain),
    }));
  }, [gainQuery.data]);

  const engagementRows = useMemo(() => {
    const rows = USE_MOCK ? MOCK_ENGAGEMENT : ((engagementQuery.data as any)?.data ?? []);
    return asArray(rows).map((row: any) => ({
      participantId: String(row.participant_id ?? row.participantId ?? ''),
      cohort: normalizeCohort(row.cohort),
      totalSessions: num(row.total_sessions ?? row.sessions),
      completedSessions: num(row.completed_sessions),
      avgCompletionPct: num(row.avg_completion_pct ?? row.avgCompletion),
      avgDurationMin: num(row.avg_duration_min ?? row.avgDuration),
      totalHints: num(row.total_hints_used ?? row.hints),
    }));
  }, [engagementQuery.data]);

  const effectRows = useMemo(() => {
    const rows = USE_MOCK ? MOCK_ADAPTIVE_EFFECTIVENESS : ((effectivenessQuery.data as any)?.data ?? []);
    return asArray(rows).map((row: any) => ({
      triggerType: String(row.trigger_type ?? ''),
      triggerEmotion: normalizeEmotionState(row.trigger_type ?? row.state_before ?? row.affect_state_pre),
      intervention: String(row.intervention ?? 'none'),
      stateBefore: normalizeEmotionState(row.state_before ?? row.affect_state_pre),
      stateAfter: normalizeEmotionState(row.state_after ?? row.affect_state_post),
      count: num(row.n),
      evaluatedCount: num(row.evaluated_n ?? row.evaluatedCount ?? row.n),
      effectivenessPct: row.effectiveness_pct === null || row.effectiveness_pct === undefined ? null : num(row.effectiveness_pct),
      avgLatencySec: row.avg_latency_sec === null || row.avg_latency_sec === undefined ? null : num(row.avg_latency_sec),
    }));
  }, [effectivenessQuery.data]);

  const responseTypeRows = useMemo(() => {
    const rows = USE_MOCK ? MOCK_RESPONSE_TYPE_DISTRIBUTION : ((responseTypeQuery.data as any)?.data ?? []);
    return asArray(rows).map((row: any) => ({
      cohort: normalizeCohort(row.cohort),
      responseType: String(row.response_type ?? row.responseType ?? 'unclassified'),
      responseSource: String(row.response_source ?? row.responseSource ?? 'profile'),
      count: num(row.n ?? row.count),
    }));
  }, [responseTypeQuery.data]);

  const depthRows = useMemo(() => {
    const rows = USE_MOCK ? MOCK_REFLECTION_DEPTH : ((depthQuery.data as any)?.data ?? []);
    return asArray(rows).map((row: any) => ({
      participantId: String(row.participant_id ?? row.participantId ?? ''),
      cohort: normalizeCohort(row.cohort),
      reflectionDepth: String(row.reflection_depth ?? row.reflectionDepth ?? 'unknown'),
      count: num(row.count),
      avgScore: num(row.avg_score ?? row.avgScore),
      avgValence: num(row.avg_valence ?? row.avgValence),
    }));
  }, [depthQuery.data]);

  const heatmapRows = useMemo(() => {
    const rows = USE_MOCK ? MOCK_TIMELINE_HEATMAP : ((heatmapQuery.data as any)?.data ?? []);
    return asArray(rows).map((row: any) => {
      const activity = String(row.currentLessonActivity ?? row.current_lesson_activity ?? row.activityId ?? 'UNASSIGNED');
      const action = String(row.triggeredAdaptiveAction ?? row.triggered_adaptive_action ?? 'none');
      const outcome = String(row.postActionOutcome ?? row.post_action_outcome ?? 'not_recorded');
      const rawEmotion = String(row.detectedEmotion ?? row.detected_emotion ?? row.classified_state ?? '');
      return {
        participantId: String(row.participantId ?? row.participant_id ?? ''),
        sessionId: String(row.sessionId ?? row.session_id ?? ''),
        timestamp: String(row.timestamp ?? row.time ?? ''),
        detectedEmotion: normalizeEmotionState(rawEmotion),
        rawEmotion,
        confidence: row.confidence === null || row.confidence === undefined ? null : num(row.confidence),
        currentLessonActivity: activity,
        unit: parseUnit(activity),
        lesson: parseLesson(activity),
        engagementLevel: normalizeEngagementLevel(row.engagementLevel ?? row.engagement_level),
        triggeredAdaptiveAction: action,
        postActionOutcome: outcome,
        matchedScenario: String(row.matchedScenario ?? row.matched_scenario ?? ''),
        contentType: inferContentType(activity, action, outcome),
        sourceType: String(row.sourceType ?? row.source_type ?? 'emotion_event'),
        isInterventionEvent: Boolean(row.isInterventionEvent ?? row.is_intervention_event ?? (String(action).toLowerCase() !== 'none')),
      };
    }).filter((row: any) => row.participantId);
  }, [heatmapQuery.data]);

  const contentEngagementRows = useMemo(() => {
    const rows = USE_MOCK ? deriveMockContentRows(heatmapRows) : ((contentEngagementQuery.data as any)?.data ?? []);
    return asArray(rows).map((row: any) => ({
      contentType: normalizeContentType(row.content_type ?? row.contentType),
      adaptiveTag: String(row.adaptive_tag ?? row.adaptiveTag ?? 'none'),
      accessCount: num(row.access_count ?? row.accessCount),
      avgDwellTimeSec: num(row.avg_dwell_time_sec ?? row.avgDwellTimeSec),
      maxDwellTimeSec: num(row.max_dwell_time_sec ?? row.maxDwellTimeSec),
    }));
  }, [contentEngagementQuery.data, heatmapRows]);

  const assessmentLatencyRows = useMemo(() => {
    const rows = USE_MOCK ? deriveMockLatency(effectRows) : ((assessmentLatencyQuery.data as any)?.data ?? []);
    return asArray(rows).map((row: any) => ({
      emotionalState: normalizeEmotionState(row.emotional_state ?? row.emotionalState),
      attempts: num(row.attempts),
      avgLatencySec: num(row.avg_latency_sec ?? row.avgLatencySec),
      minLatencySec: num(row.min_latency_sec ?? row.minLatencySec),
      maxLatencySec: num(row.max_latency_sec ?? row.maxLatencySec),
    }));
  }, [assessmentLatencyQuery.data, effectRows]);

  const emotionFrequencyRows = useMemo(() => {
    const rows = USE_MOCK ? deriveMockFrequency(heatmapRows) : ((emotionFrequencyQuery.data as any)?.data ?? []);
    return asArray(rows).map((row: any) => ({
      participantId: String(row.participant_id ?? row.participantId ?? ''),
      cohort: normalizeCohort(row.cohort),
      moduleId: String(row.module_id ?? row.moduleId ?? ''),
      emotion: normalizeEmotionState(row.classified_state ?? row.classifiedState),
      count: num(row.freq ?? row.count),
      avgConfidence: num(row.avg_confidence ?? row.avgConfidence),
    }));
  }, [emotionFrequencyQuery.data, heatmapRows]);

  const participantIds = useMemo(
    () => unique([...gains.map((r) => r.participantId), ...engagementRows.map((r) => r.participantId), ...heatmapRows.map((r) => r.participantId)]),
    [gains, engagementRows, heatmapRows],
  );

  const participantDetailsQuery = useQuery({
    queryKey: ['research', 'participant-bundle', participantIds.join('|')],
    enabled: !USE_MOCK && participantIds.length > 0,
    staleTime: 120000,
    queryFn: async () => {
      const rows = await Promise.all(participantIds.slice(0, 40).map(async (participantId) => {
        try {
          const result = await researchApi.participantSummary(participantId);
          return (result as any)?.data ?? null;
        } catch {
          return null;
        }
      }));
      return rows.filter(Boolean);
    },
  });

  const participantDetails = USE_MOCK ? [MOCK_PARTICIPANT_SUMMARY as any] : (participantDetailsQuery.data ?? []);
  const responseTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    participantDetails.forEach((row: any) => {
      const participantId = String(row.participantId ?? '');
      if (!participantId) return;
      const responseType = String(
        row.learnerProfile?.responseType
        ?? row.responseType
        ?? row.analytics?.derivedResponseType
        ?? 'unclassified',
      );
      map.set(participantId, responseType);
    });
    return map;
  }, [participantDetails]);

  const unitOptions = useMemo(() => unique(heatmapRows.map((row: any) => row.unit).filter((v: string) => v !== 'UNASSIGNED')), [heatmapRows]);
  const responseTypeOptions = useMemo(
    () => unique([...responseTypeRows.map((row: any) => row.responseType), ...Array.from(responseTypeMap.values())]).sort(),
    [responseTypeRows, responseTypeMap],
  );

  const filtered = useMemo(() => {
    const pNeedle = filters.participantQuery.trim().toLowerCase();
    const sNeedle = filters.sessionQuery.trim().toLowerCase();
    const passParticipant = (id: string) => !pNeedle || id.toLowerCase().includes(pNeedle);
    const passResponseType = (id: string) => filters.responseType === 'all' || (responseTypeMap.get(id) ?? 'unclassified') === filters.responseType;
    const cohortMap = new Map<string, string>();
    gains.forEach((row: any) => cohortMap.set(row.participantId, row.cohort));
    engagementRows.forEach((row: any) => cohortMap.set(row.participantId, row.cohort));

    const gainsRows = gains.filter((row: any) => (filters.cohort === 'all' || row.cohort === filters.cohort) && passParticipant(row.participantId) && passResponseType(row.participantId));
    const engagementData = engagementRows.filter((row: any) => (filters.cohort === 'all' || row.cohort === filters.cohort) && passParticipant(row.participantId) && passResponseType(row.participantId));
    const depthData = depthRows.filter((row: any) => (filters.cohort === 'all' || row.cohort === filters.cohort) && passParticipant(row.participantId) && passResponseType(row.participantId));
    const heatmapData = heatmapRows.filter((row: any) => {
      const cohort = cohortMap.get(row.participantId) ?? 'unknown';
      if (filters.cohort !== 'all' && cohort !== filters.cohort) return false;
      if (!passParticipant(row.participantId) || !passResponseType(row.participantId)) return false;
      if (filters.emotion !== 'all' && row.detectedEmotion !== filters.emotion) return false;
      if (filters.unit !== 'all' && row.unit !== filters.unit) return false;
      if (sNeedle && !row.sessionId.toLowerCase().includes(sNeedle)) return false;
      return true;
    });
    const effectsData = effectRows.filter((row: any) => filters.emotion === 'all' || row.triggerEmotion === filters.emotion || row.stateBefore === filters.emotion);
    const responseTypesData = responseTypeRows.filter((row: any) => {
      if (filters.cohort !== 'all' && row.cohort !== filters.cohort) return false;
      if (filters.responseType !== 'all' && row.responseType !== filters.responseType) return false;
      return true;
    });
    return { gainsRows, engagementData, depthData, heatmapData, effectsData, responseTypesData };
  }, [filters, gains, engagementRows, depthRows, heatmapRows, effectRows, responseTypeRows, responseTypeMap]);

  const aggregates = useMemo(
    () => buildParticipantAggregates(filtered.gainsRows, filtered.engagementData, filtered.heatmapData, responseTypeMap, participantDetails),
    [filtered, responseTypeMap, participantDetails],
  );

  useEffect(() => {
    if (!aggregates.length) {
      setSelectedParticipantId('');
      return;
    }
    if (!aggregates.find((row: any) => row.participantId === selectedParticipantId)) {
      setSelectedParticipantId(aggregates[0].participantId);
    }
  }, [aggregates, selectedParticipantId]);

  const prePost = useMemo(
    () => computePrePost(filtered.gainsRows, (gainQuery.data as any)?.meta),
    [filtered.gainsRows, gainQuery.data],
  );
  const emotionSummary = useMemo(() => summarizeEmotions(filtered.heatmapData), [filtered.heatmapData]);
  const interventionStats = useMemo(() => summarizeInterventions(filtered.effectsData, filtered.heatmapData), [filtered.effectsData, filtered.heatmapData]);
  const emotionPerformance = useMemo(() => summarizeEmotionPerformance(aggregates), [aggregates]);
  const contentStats = useMemo(() => summarizeContentTypes(filtered.heatmapData, contentEngagementRows, aggregates), [filtered.heatmapData, contentEngagementRows, aggregates]);
  const hierarchy = useMemo(() => summarizeHierarchy(filtered.heatmapData, aggregates), [filtered.heatmapData, aggregates]);
  const groupComparison = useMemo(() => summarizeGroups(aggregates, filtered.heatmapData, t), [aggregates, filtered.heatmapData, t]);
  const responseDeep = useMemo(() => summarizeResponseTypes(aggregates, filtered.heatmapData, t), [aggregates, filtered.heatmapData, t]);

  const validationChecks = useMemo(
    () => buildValidation({
      participants: aggregates.length,
      emotionEvents: emotionSummary.emotionRows,
      timelineRows: emotionSummary.totalTimelineRows,
      adaptiveEvents: interventionStats.timelineInterventions,
      avgConfidence: emotionSummary.avgConfidencePct,
      adaptiveCoverage: emotionSummary.adaptiveCoveragePct,
      matchedPrePost: prePost.matchedCount,
      aggregates,
      emotionSummaryRows: emotionSummary.rows,
      emotionFrequencyRows,
    }, t),
    [aggregates, interventionStats.timelineInterventions, emotionSummary, prePost.matchedCount, emotionFrequencyRows, t],
  );

  const hasLoadingState = !USE_MOCK && [
    gainQuery.isLoading,
    engagementQuery.isLoading,
    effectivenessQuery.isLoading,
    responseTypeQuery.isLoading,
    depthQuery.isLoading,
    heatmapQuery.isLoading,
    contentEngagementQuery.isLoading,
    assessmentLatencyQuery.isLoading,
    emotionFrequencyQuery.isLoading,
  ].some(Boolean);

  const queryError = !USE_MOCK
    ? [
        gainQuery.error,
        engagementQuery.error,
        effectivenessQuery.error,
        responseTypeQuery.error,
        depthQuery.error,
        heatmapQuery.error,
        contentEngagementQuery.error,
        assessmentLatencyQuery.error,
        emotionFrequencyQuery.error,
      ].find(Boolean)
    : null;

  const dominantEmotion = emotionSummary.rows[0];
  const totalParticipants = aggregates.length;
  const selectedTimeline = filtered.heatmapData.filter((row: any) => row.participantId === selectedParticipantId);
  const selectedAggregate = aggregates.find((row: any) => row.participantId === selectedParticipantId);

  async function handleServerExport(label: string, action: () => Promise<void>) {
    setExporting(label);
    setExportError(null);
    try {
      await action();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : t('research.dashboard.errors.exportFailed', 'Export failed'));
    } finally {
      setExporting(null);
    }
  }

  function handleClientExport(label: string, rows: any[]) {
    if (!rows.length) {
      setExportError(t('research.dashboard.errors.noRows', 'No rows available for {label}.', { label }));
      return;
    }
    setExportError(null);
    downloadCsv(`${label}.csv`, rows);
  }

  function renderEmptyPanel(titleKey: string, titleFallback: string, bodyKey?: string, bodyFallback?: string) {
    return (
      <div className="empty-panel">
        <strong>{t(titleKey, titleFallback)}</strong>
        {bodyKey && bodyFallback ? <span>{t(bodyKey, bodyFallback)}</span> : null}
      </div>
    );
  }

  function ui(key: string, fallback: string, params?: Record<string, any>) {
    return t(`research.dashboard.ui.${key}`, fallback, params);
  }

  const reportCatalog: ReportCatalogItem[] = [
    {
      id: 'overview',
      title: ui('catalogOverviewTitle', 'لوحة النظرة العامة'),
      description: ui('catalogOverviewDescription', 'يعرض المشاركين، والإكمال، وسلامة المؤشرات الأساسية.'),
      interpretation: ui('catalogOverviewInterpretation', 'ابدأ به لتثبيت سياق الدراسة والتحقق من تكامل البيانات.'),
      metric: `${validationChecks.length} ${ui('checks', 'فحوصات')}`,
      state: validationChecks.length ? 'ready' : 'waiting',
      icon: Users,
      preview: 'bars',
    },
    {
      id: 'progress',
      title: ui('catalogProgressTitle', 'تحليلات تقدم المتعلمين'),
      description: ui('catalogProgressDescription', 'يعرض مسار التقدم، والإيقاع، واستمرارية الجلسات عبر الزمن.'),
      interpretation: ui('catalogProgressInterpretation', 'يشرح أين يتسارع أو يتباطأ مسار التعلم.'),
      metric: `${filtered.engagementData.length} ${ui('learners', 'متعلمين')}`,
      state: filtered.engagementData.length ? 'ready' : 'waiting',
      icon: TrendingUp,
      preview: 'line',
    },
    {
      id: 'prepost',
      title: ui('catalogPrepostTitle', 'الاختبار القبلي/البعدي'),
      description: ui('catalogPrepostDescription', 'يعرض الصفوف المطابقة قبل/بعد ومؤشرات الكسب بين المجموعات.'),
      interpretation: ui('catalogPrepostInterpretation', 'هو الدليل الرئيس على التحسن التعليمي بين البداية والنهاية.'),
      metric: `${prePost.rows.length} ${ui('matchedRowsShort', 'صفوف مطابقة')}`,
      state: prePost.rows.length ? 'ready' : 'waiting',
      icon: BarChart3,
      preview: 'bars',
    },
    {
      id: 'emotions',
      title: ui('catalogEmotionsTitle', 'ملخص الاستشعار الانفعالي'),
      description: ui('catalogEmotionsDescription', 'يلخص الحالات المهيمنة، والثقة، والخط الزمني للحالات الانفعالية.'),
      interpretation: ui('catalogEmotionsInterpretation', 'يمهّد لقراءة أثر الحالة الوجدانية قبل الانتقال للتدخلات.'),
      metric: `${filtered.heatmapData.length} ${ui('events', 'أحداث')}`,
      state: filtered.heatmapData.length ? 'ready' : 'partial',
      icon: FlaskConical,
      preview: 'matrix',
    },
    {
      id: 'interventions',
      title: ui('catalogInterventionsTitle', 'فعالية التدخلات'),
      description: ui('catalogInterventionsDescription', 'يعرض سبب التفعيل، ونوع التدخل، والتغير بعد التدخل.'),
      interpretation: ui('catalogInterventionsInterpretation', 'يفسر متى كان التدخل مفيدًا وكيف أثّر على المتابعة.'),
      metric: `${filtered.effectsData.length} ${ui('rows', 'صفوف')}`,
      state: filtered.effectsData.length ? 'ready' : 'waiting',
      icon: Activity,
      preview: 'table',
    },
    {
      id: 'participant-detail',
      title: ui('catalogParticipantTitle', 'تفاصيل جلسة المشارك'),
      description: ui('catalogParticipantDescription', 'يعرض تسلسل الجلسة خطوة بخطوة لمشارك محدد.'),
      interpretation: ui('catalogParticipantInterpretation', 'مفيد لعرض حالة فردية أو تتبع جلسة مفصلة أثناء المناقشة.'),
      metric: `${aggregates.length} ${ui('participants', 'مشاركين')}`,
      state: aggregates.length ? 'ready' : 'waiting',
      icon: Layers3,
      preview: 'timeline',
    },
    {
      id: 'comparison',
      title: ui('catalogComparisonTitle', 'مقارنة المجموعات'),
      description: ui('catalogComparisonDescription', 'يعرض الفروق العامة بين الضابطة والتجريبية في المكسب والإكمال.'),
      interpretation: ui('catalogComparisonInterpretation', 'يدعم المقارنة البحثية الأساسية بين المجموعتين.'),
      metric: `${groupComparison.tableRows.length} ${ui('metrics', 'مقاييس')}`,
      state: groupComparison.tableRows.length ? 'ready' : 'waiting',
      icon: Users,
      preview: 'line',
    },
    {
      id: 'emotion-performance',
      title: ui('catalogEmotionPerformanceTitle', 'الانفعال مقابل الأداء'),
      description: ui('catalogEmotionPerformanceDescription', 'يربط الحمل الانفعالي وجودة الانخراط بنتائج الأداء والإكمال.'),
      interpretation: ui('catalogEmotionPerformanceInterpretation', 'يساعد على تفسير أثر الانفعال على نتائج المتعلم.'),
      metric: `${emotionPerformance.participantRows.length} ${ui('participants', 'مشاركين')}`,
      state: emotionPerformance.participantRows.length ? 'ready' : 'waiting',
      icon: Gauge,
      preview: 'scatter',
    },
  ];

  const reportPreviewData = useMemo(() => {
    const overviewBars = normalizePreviewSeries(
      [
        totalParticipants,
        emotionSummary.emotionRows,
        interventionStats.timelineInterventions,
        prePost.matchedCount,
        validationChecks.filter((check: any) => check.severity === 'ok').length,
      ],
      5,
    );

    const progressPrimary = normalizePreviewSeries(
      filtered.engagementData.slice(0, 7).map((row: any) => row.avgCompletionPct),
      7,
    );
    const progressSecondary = normalizePreviewSeries(
      filtered.engagementData.slice(0, 7).map((row: any) => (row.totalSessions ? (row.completedSessions / row.totalSessions) * 100 : 0)),
      7,
    );

    const prepostBars = normalizePreviewSeries(
      [
        prePost.preMean,
        prePost.postMean,
        prePost.exp.gainMean,
        prePost.ctl.gainMean,
        Math.max(prePost.gainMean, 0),
      ],
      5,
    );

    const emotionMatrix = emotionSummary.rows
      .slice(0, 12)
      .map((row: any) => clampPreview(row.share));

    const interventionTable = interventionStats.interventionRows.slice(0, 4).map((row: any) => ({
      countWidth: clampPreview((row.count / Math.max(interventionStats.totalEvents || 1, 1)) * 100, 10),
      effectivenessWidth: clampPreview(Number(row.effectivenessPct ?? 0)),
      latencyWidth: clampPreview(
        row.avgLatencySec === null || row.avgLatencySec === undefined
          ? 0
          : 100 - (Number(row.avgLatencySec) / Math.max(interventionStats.avgLatencySec || 1, 1)) * 100,
        10,
      ),
    }));

    const participantTimelineSource = (selectedTimeline.length ? selectedTimeline : filtered.heatmapData).slice(0, 5);
    const participantTimeline = participantTimelineSource.map((row: any, index: number) => ({
      size: clampPreview(((row.confidence ?? 0.3) * 100), 20, 100),
      highlighted: Boolean(row.isInterventionEvent) || index === participantTimelineSource.length - 1,
    }));

    const comparisonPrimary = normalizePreviewSeries(
      [
        groupComparison.experimental.participants,
        groupComparison.experimental.completionMean,
        groupComparison.experimental.gainMean,
        groupComparison.experimental.interventionsPerLearner * 10,
      ],
      4,
    );
    const comparisonSecondary = normalizePreviewSeries(
      [
        groupComparison.control.participants,
        groupComparison.control.completionMean,
        groupComparison.control.gainMean,
        groupComparison.control.interventionsPerLearner * 10,
      ],
      4,
    );

    const emotionScatter = emotionPerformance.participantRows.slice(0, 6).map((row: any) => ({
      x: clampPreview((row.highEngagementRatio ?? 0) * 100, 10, 92),
      y: clampPreview(row.completionPct ?? 0, 12, 92),
      radius: clampPreview(((row.confidence ?? 0.4) * 10), 4, 8),
      soft: (row.frustrationConfusionRatio ?? 0) > (row.highEngagementRatio ?? 0),
    }));

    return {
      overview: overviewBars,
      progress: { primary: progressPrimary, secondary: progressSecondary },
      prepost: prepostBars,
      emotions: emotionMatrix,
      interventions: interventionTable,
      participantDetail: participantTimeline,
      comparison: { primary: comparisonPrimary, secondary: comparisonSecondary },
      emotionPerformance: emotionScatter,
    };
  }, [
    emotionPerformance.participantRows,
    emotionSummary.emotionRows,
    emotionSummary.rows,
    filtered.engagementData,
    filtered.heatmapData,
    groupComparison.control.completionMean,
    groupComparison.control.gainMean,
    groupComparison.control.interventionsPerLearner,
    groupComparison.control.participants,
    groupComparison.experimental.completionMean,
    groupComparison.experimental.gainMean,
    groupComparison.experimental.interventionsPerLearner,
    groupComparison.experimental.participants,
    interventionStats.avgLatencySec,
    interventionStats.interventionRows,
    interventionStats.timelineInterventions,
    interventionStats.totalEvents,
    prePost.ctl.gainMean,
    prePost.exp.gainMean,
    prePost.gainMean,
    prePost.matchedCount,
    prePost.postMean,
    prePost.preMean,
    selectedTimeline,
    totalParticipants,
    validationChecks,
  ]);

  function renderCatalogPreview(item: ReportCatalogItem) {
    if (item.preview === 'bars') {
      const bars = item.id === 'prepost' ? reportPreviewData.prepost : reportPreviewData.overview;
      return (
        <div className={styles.catalogBars} aria-hidden>
          {bars.map((value, index) => (
            <span key={`${item.id}-bar-${index}`} style={{ height: `${Math.max(14, value)}%` }} />
          ))}
        </div>
      );
    }

    if (item.preview === 'line') {
      const series = item.id === 'comparison' ? reportPreviewData.comparison : reportPreviewData.progress;
      return (
        <svg viewBox="0 0 200 70" className={styles.catalogSvg} aria-hidden>
          <path d={linePath(series.primary)} className={styles.catalogLine} />
          <path d={linePath(series.secondary)} className={styles.catalogLineSoft} />
        </svg>
      );
    }

    if (item.preview === 'matrix') {
      return (
        <div className={styles.catalogMatrix} aria-hidden>
          {reportPreviewData.emotions.map((value, index) => (
            <span key={`${item.id}-cell-${index}`} style={{ opacity: Math.max(0.18, value / 100) }} />
          ))}
        </div>
      );
    }

    if (item.preview === 'table') {
      return (
        <div className={styles.catalogTable} aria-hidden>
          {reportPreviewData.interventions.map((row, index) => (
            <div key={`${item.id}-row-${index}`}>
              <span style={{ width: `${row.countWidth}%` }} />
              <span style={{ width: `${row.effectivenessWidth}%` }} />
              <span style={{ width: `${row.latencyWidth}%` }} />
            </div>
          ))}
        </div>
      );
    }

    if (item.preview === 'timeline') {
      return (
        <div className={styles.catalogTimeline} aria-hidden>
          {reportPreviewData.participantDetail.map((point, index) => (
            <span
              key={`${item.id}-point-${index}`}
              className={point.highlighted ? styles.catalogTimelineActive : ''}
              style={{
                width: `${Math.max(10, point.size / 6)}px`,
                height: `${Math.max(10, point.size / 6)}px`,
                opacity: Math.max(0.35, point.size / 100),
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <svg viewBox="0 0 200 74" className={styles.catalogSvg} aria-hidden>
        {reportPreviewData.emotionPerformance.map((point, index) => (
          <circle
            key={`${item.id}-dot-${index}`}
            cx={point.x * 1.8 + 6}
            cy={74 - (point.y * 0.58)}
            r={point.radius}
            className={point.soft ? styles.catalogDotSoft : styles.catalogDot}
          />
        ))}
      </svg>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <span className={styles.eyebrow}>{t('research.dashboard.hero.eyebrow', 'Research Admin Analytics')}</span>
          <h1>{t('research.dashboard.hero.title', 'Research Reports and Emotion Analytics')}</h1>
          <p className={styles.heroLead}>
            {t('research.dashboard.hero.lead', 'Doctoral-level analytics for facial emotion sensing, adaptive interventions, learning progression, and response-type behavior.')}
          </p>
          <div className={styles.heroHighlights}>
            <span className={styles.highlightPill}><Users size={14} />{totalParticipants} {t('research.dashboard.hero.participants', 'participants')}</span>
            <span className={styles.highlightPill}><FlaskConical size={14} />{dominantEmotion ? emotionDisplayName(dominantEmotion.state, true, t) : t('research.dashboard.hero.noDominantEmotion', 'No dominant emotion yet')}</span>
            <span className={styles.highlightPill}><Gauge size={14} />{emotionSummary.avgConfidencePct}% {t('research.dashboard.hero.avgConfidence', 'avg confidence')}</span>
          </div>
          <nav className={styles.sectionNav} aria-label={t('research.dashboard.hero.sectionNav', 'Report sections')}>
            {SECTION_LINKS.map((link) => <a key={link.id} href={`#${link.id}`} className={styles.sectionLink}>{t(link.key)}</a>)}
          </nav>
        </div>

        <div className={styles.utilityColumn}>
          <div className={styles.filterPanel}>
            <div className={styles.panelHead}>
              <div className={styles.inlineHeading}>
                <SlidersHorizontal size={16} />
                <strong>{t('research.dashboard.filters.title', 'Research Filters')}</strong>
              </div>
              <span className="badge badge-muted">{t('research.dashboard.filters.persistent', 'Persistent')}</span>
            </div>
            <div className={styles.filterGrid}>
              <label className={styles.filterField}>
                <span>{t('research.dashboard.filters.cohort', 'Cohort')}</span>
                <select className="input" value={filters.cohort} onChange={(event) => setFilters((s) => ({ ...s, cohort: event.target.value as FilterState['cohort'] }))}>
                  <option value="all">{t('common.cohort.all', 'All cohorts')}</option>
                  <option value="experimental">{t('common.cohort.experimental', 'Experimental')}</option>
                  <option value="control">{t('common.cohort.control', 'Control')}</option>
                </select>
              </label>
              <label className={styles.filterField}>
                <span>{t('research.dashboard.filters.participant', 'Participant')}</span>
                <div className={styles.searchField}>
                  <Search size={15} />
                  <input
                    className="input"
                    value={filters.participantQuery}
                    onChange={(event) => setFilters((s) => ({ ...s, participantQuery: event.target.value }))}
                    placeholder={t('research.dashboard.filters.participantPlaceholder', 'Search participant ID')}
                  />
                </div>
              </label>
              <label className={styles.filterField}>
                <span>{t('research.dashboard.filters.emotion', 'Emotion focus')}</span>
                <select className="input" value={filters.emotion} onChange={(event) => setFilters((s) => ({ ...s, emotion: event.target.value as FilterState['emotion'] }))}>
                  <option value="all">{t('research.dashboard.filters.allStates', 'All states')}</option>
                  {EMOTIONS.map((state) => <option key={state} value={state}>{emotionDisplayName(state)}</option>)}
                </select>
              </label>
              <label className={styles.filterField}>
                <span>{t('research.dashboard.filters.unit', 'Unit')}</span>
                <select className="input" value={filters.unit} onChange={(event) => setFilters((s) => ({ ...s, unit: event.target.value }))}>
                  <option value="all">{t('research.dashboard.filters.allUnits', 'All units')}</option>
                  {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </label>
              <label className={styles.filterField}>
                <span>{t('research.dashboard.filters.session', 'Session')}</span>
                <input
                  className="input"
                  value={filters.sessionQuery}
                  onChange={(event) => setFilters((s) => ({ ...s, sessionQuery: event.target.value }))}
                  placeholder={t('research.dashboard.filters.sessionPlaceholder', 'Search session ID')}
                />
              </label>
              <label className={styles.filterField}>
                <span>{t('research.dashboard.filters.responseType', 'Response Type')}</span>
                <select className="input" value={filters.responseType} onChange={(event) => setFilters((s) => ({ ...s, responseType: event.target.value }))}>
                  <option value="all">{t('research.dashboard.filters.allResponseTypes', 'All response types')}</option>
                  {responseTypeOptions.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className={styles.exportPanel}>
            <div className={styles.panelHead}>
              <div className={styles.inlineHeading}>
                <Download size={16} />
                <strong>{t('research.dashboard.exports.quickTitle', 'Quick Exports')}</strong>
              </div>
              <span className="badge badge-soft-blue">{t('research.dashboard.exports.csvReady', 'CSV ready')}</span>
            </div>
            <p className={styles.utilityText}>{t('research.dashboard.exports.subtitle', 'Download core research datasets from server-side exports.')}</p>
            <div className={styles.exportActions}>
              <button className="btn btn-secondary btn-sm" onClick={() => void handleServerExport('sessions', researchApi.exportSessions)} disabled={exporting !== null}><Download size={13} />{t('research.dashboard.exports.sessions', 'Sessions')}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => void handleServerExport('competency', researchApi.exportCompetency)} disabled={exporting !== null}><Download size={13} />{t('research.dashboard.exports.competency', 'Competency')}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => void handleServerExport('reflections', researchApi.exportReflections)} disabled={exporting !== null}><Download size={13} />{t('research.dashboard.exports.reflections', 'Reflections')}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => void handleServerExport('emotion-events', researchApi.exportEmotionEvents)} disabled={exporting !== null}><Download size={13} />{t('research.dashboard.exports.emotionEvents', 'Emotion events')}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => void handleServerExport('timeline-heatmap', researchApi.exportTimelineHeatmap)} disabled={exporting !== null}><Download size={13} />{t('research.dashboard.exports.heatmap', 'Heatmap')}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => void handleServerExport('merged-analytics', researchApi.exportMergedAnalytics)} disabled={exporting !== null}><Download size={13} />{t('research.dashboard.exports.merged', 'Merged ML dataset')}</button>
            </div>
          </div>
        </div>
      </section>

      {hasLoadingState ? (
        <section className="loading-panel">
          <strong>{t('research.dashboard.loading.title', 'Loading research analytics...')}</strong>
          <span>{t('research.dashboard.loading.subtitle', 'The dashboard is assembling live data sources.')}</span>
        </section>
      ) : null}
      {queryError ? (
        <section className={`${styles.alertCard} card`}>
          <div className={styles.inlineHeading}>
            <Activity size={18} />
            <strong>{t('research.dashboard.errors.sourceLoadFailed', 'One or more report sources failed to load.')}</strong>
          </div>
          <p>{(queryError as Error).message}</p>
        </section>
      ) : null}
      {exportError ? (
        <section className={`${styles.alertCard} card`}>
          <div className={styles.inlineHeading}>
            <AlertTriangle size={18} />
            <strong>{t('research.dashboard.errors.exportFailed', 'Export failed')}</strong>
          </div>
          <p>{exportError}</p>
        </section>
      ) : null}
      <section className={`${styles.presentationPanel} card`}>
        <div className={styles.inlineHeading}>
          <Sparkles size={18} />
          <strong>{t('research.dashboard.presentation.title', 'Academic presentation flow')}</strong>
        </div>
        <p>
          {t(
            'research.dashboard.presentation.lead',
            'Present sections in this order for defensible interpretation: Overview -> Progress -> Pre/Post -> Emotion Timeline -> Intervention Effectiveness -> Participant Detail -> Exports.',
          )}
        </p>
      </section>

      <section className={styles.catalogSection}>
        <div className={styles.sectionIntro}>
          <div>
            <span className={styles.sectionEyebrow}>{ui('catalogEyebrow', 'فهرس التقارير')}</span>
            <h2>{ui('catalogTitle', 'التقارير المطلوبة داخل صفحة تقارير الانفعالات')}</h2>
          </div>
          <p>{ui('catalogLead', 'تجمع هذه البطاقات التقارير الأساسية المطلوبة في العرض الأكاديمي، مع رابط مباشر لكل قسم وحالة جاهزية سريعة للبيانات.')}</p>
        </div>
        <div className={styles.catalogGrid}>
          {reportCatalog.map((item) => {
            const Icon = item.icon;
            const statusLabel =
              item.state === 'ready'
                ? ui('catalogStatusReady', 'جاهز')
                : item.state === 'partial'
                  ? ui('catalogStatusPartial', 'بيانات جزئية')
                  : ui('catalogStatusWaiting', 'بانتظار بيانات');

            return (
              <article key={item.id} className={styles.catalogCard}>
                <div className={styles.catalogHead}>
                  <div className={styles.catalogIconWrap}>
                    <Icon size={16} />
                  </div>
                  <div className={styles.catalogHeadCopy}>
                    <h3>{item.title}</h3>
                    <span className={`${styles.catalogState} ${styles[`catalogState${capitalize(item.state)}`]}`}>{statusLabel}</span>
                  </div>
                </div>
                <div className={styles.catalogPreview}>
                  {renderCatalogPreview(item)}
                </div>
                <div className={styles.catalogCopy}>
                  <strong>{ui('catalogWhatItShows', 'ما الذي يعرضه')}</strong>
                  <p>{item.description}</p>
                  <strong>{ui('catalogHowToRead', 'كيف يُفسَّر')}</strong>
                  <p>{item.interpretation}</p>
                </div>
                <div className={styles.catalogMeta}>
                  <span>{item.metric}</span>
                  <a href={`#${item.id}`} className={styles.catalogLink}>
                    {ui('catalogOpenSection', 'فتح القسم')}
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.kpiGrid}>
        {[
          { icon: Users, label: ui('kpiParticipants', 'Participants'), value: totalParticipants, color: 'var(--color-accent-2)' },
          { icon: Gauge, label: ui('kpiAverageCompletion', 'Average Completion'), value: `${Math.round(avg(aggregates.map((r: any) => r.avgCompletionPct)))}%`, color: 'var(--color-success)' },
          { icon: Sparkles, label: ui('kpiAdaptiveCoverage', 'Adaptive Coverage'), value: `${emotionSummary.adaptiveCoveragePct}%`, color: 'var(--color-accent-blue)' },
          { icon: TrendingUp, label: ui('kpiExperimentalGain', 'Experimental Gain'), value: fmt(prePost.exp.gainMean, 2), color: 'var(--color-success)' },
          { icon: BarChart3, label: ui('kpiControlGain', 'Control Gain'), value: fmt(prePost.ctl.gainMean, 2), color: 'var(--color-amber)' },
          { icon: Layers3, label: ui('kpiAdaptiveEvents', 'Adaptive Events'), value: interventionStats.timelineInterventions, color: 'var(--affect-confusion)' },
        ].map(({ icon: Icon, label, value, color }) => (
          <article key={label} className={styles.kpiCard}><div className={styles.kpiIcon} style={{ background: `${color}18`, color }}><Icon size={18} /></div><div><div className={styles.kpiValue}>{value}</div><div className={styles.kpiLabel}>{label}</div></div></article>
        ))}
      </section>

      <div className={styles.dashboardSections}>
        <section id="overview" className={styles.sectionBlock}>
          <div className={styles.sectionIntro}><div><span className={styles.sectionEyebrow}>{ui('priority1', 'Priority 1')}</span><h2>{ui('overviewTitle', 'Data integrity and validation')}</h2></div><p>{ui('overviewLead', 'Validation checks to keep metrics research-safe and interpretable.')}</p></div>
          <div className={styles.dualGrid}>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}><div><h3>{ui('metricValidationTitle', 'Metric validation pass')}</h3><p className={styles.cardLead}>{ui('metricValidationLead', 'Consistency checks for confidence, adaptive coverage, and matched pre/post data.')}</p></div><span className="badge badge-soft-blue">{validationChecks.length} {ui('checks', 'checks')}</span></div>
              <div className={styles.validationList}>{validationChecks.map((check: any) => <div key={check.id} className={styles.validationRow}><span className={`${styles.validationBadge} ${styles[`severity${capitalize(check.severity)}`]}`}>{check.severity.toUpperCase()}</span><div><strong>{check.label}</strong><p>{check.message}</p></div></div>)}</div>
            </article>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}><div><h3>{ui('emotionSummaryTitle', 'Emotion sensing summary')}</h3><p className={styles.cardLead}>{ui('emotionSummaryLead', 'Dominant state, confidence, and event share distribution.')}</p></div><span className="badge badge-soft-blue">{filtered.heatmapData.length} {ui('events', 'events')}</span></div>
              <div className={styles.summaryMetrics}><div className={styles.summaryMetric}><span>{ui('dominantState', 'Dominant state')}</span><strong>{dominantEmotion ? emotionDisplayName(dominantEmotion.state) : '--'}</strong></div><div className={styles.summaryMetric}><span>{ui('averageConfidence', 'Average confidence')}</span><strong>{emotionSummary.avgConfidencePct}%</strong></div><div className={styles.summaryMetric}><span>{ui('interventionCoverage', 'Intervention coverage')}</span><strong>{emotionSummary.adaptiveCoveragePct}%</strong></div></div>
              <div className={styles.emotionBars}>{emotionSummary.rows.map((row: any) => <div key={row.state} className={styles.emotionRow}><div className={styles.emotionLabel}><span className={styles.colorDot} style={{ background: emotionColor(row.state) }} /><strong>{emotionDisplayName(row.state)}</strong><span>{row.count} {ui('events', 'events')}</span></div><div className={styles.emotionTrack}><div className={styles.emotionFill} style={{ width: `${Math.max(8, row.share)}%`, background: emotionColor(row.state) }} /></div><span className={styles.emotionShare}>{row.share}%</span></div>)}</div>
            </article>
          </div>
        </section>

        <section id="progress" className={styles.sectionBlock}>
          <div className={styles.sectionIntro}><div><span className={styles.sectionEyebrow}>{ui('progressEyebrow', 'Learner progress analytics')}</span><h2>{ui('progressTitle', 'Sessions, completion, and progression')}</h2></div><p>{ui('progressLead', 'Participant-level progression rows with duration and hint load.')}</p></div>
          <article className={styles.fullWidthCard}><div className={styles.panelHead}><div><h3>{ui('progressTableTitle', 'Learner progress table')}</h3><p className={styles.cardLead}>{ui('progressTableLead', 'Research-ready participant progression records.')}</p></div><span className="badge badge-muted">{filtered.engagementData.length} {ui('learners', 'learners')}</span></div>
            <div className="table-scroll"><table className={styles.table}><thead><tr><th>{ui('thParticipant', 'Participant')}</th><th>{ui('thCohort', 'Cohort')}</th><th>{ui('thSessions', 'Sessions')}</th><th>{ui('thCompleted', 'Completed')}</th><th>{ui('thCompletion', 'Completion')}</th><th>{ui('thDuration', 'Duration')}</th><th>{ui('thHints', 'Hints')}</th></tr></thead><tbody>{filtered.engagementData.slice(0, 18).map((row: any) => <tr key={row.participantId} className={styles.clickRow} onClick={() => navigate(`/research-admin/participants/${row.participantId}`)}><td>{row.participantId}</td><td><span className={`badge ${row.cohort === 'experimental' ? 'badge-teal' : 'badge-muted'}`}>{cohortLabel(row.cohort)}</span></td><td>{row.totalSessions}</td><td>{row.completedSessions}</td><td>{Math.round(row.avgCompletionPct)}%</td><td>{row.avgDurationMin.toFixed(1)} {ui('minShort', 'min')}</td><td>{row.totalHints}</td></tr>)}</tbody></table></div>
          </article>
        </section>

        <section id="prepost" className={styles.sectionBlock}>
          <div className={styles.sectionIntro}>
            <div>
              <span className={styles.sectionEyebrow}>{ui('priority2', 'Priority 2')}</span>
              <h2>{ui('prepostTitle', 'Pre/Post performance analytics')}</h2>
            </div>
            <p>{ui('prepostLead', 'Matched pre/post learners with group comparison and gain distribution.')}</p>
          </div>
          <div className={styles.dualGrid}>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>{ui('prepostSummaryTitle', 'Pre/Post summary')}</h3>
                  <p className={styles.cardLead}>{ui('prepostSummaryLead', 'Study-level matched comparison metrics.')}</p>
                </div>
                <span className="badge badge-soft-blue">{prePost.matchedCount} {ui('matched', 'matched')}</span>
              </div>
              {prePost.matchedCount > 0 ? (
                <>
                  <div className={styles.summaryMetrics}>
                    <div className={styles.summaryMetric}><span>{ui('preTestMean', 'Pre-test mean')}</span><strong>{prePost.preMean.toFixed(2)}</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('postTestMean', 'Post-test mean')}</span><strong>{prePost.postMean.toFixed(2)}</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('gainMean', 'Gain mean')}</span><strong>{fmt(prePost.gainMean, 2)}</strong></div>
                  </div>
                  <div className={styles.summaryMetrics}>
                    <div className={styles.summaryMetric}><span>{ui('experimentalGainCount', 'Experimental gain ({count})', { count: prePost.exp.count })}</span><strong>{fmt(prePost.exp.gainMean, 2)}</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('controlGainCount', 'Control gain ({count})', { count: prePost.ctl.count })}</span><strong>{fmt(prePost.ctl.gainMean, 2)}</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('deltaExpCtrl', 'Delta (Exp-Ctrl)')}</span><strong>{fmt(prePost.exp.gainMean - prePost.ctl.gainMean, 2)}</strong></div>
                  </div>
                </>
              ) : (
                renderEmptyPanel(
                  'research.dashboard.empty.prepostSummaryTitle',
                  'No matched pre/post learners yet.',
                  'research.dashboard.empty.prepostSummaryBody',
                  'Complete both pre and post assessments for the same participants to activate this section.',
                )
              )}
            </article>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>{ui('matchedRowsTitle', 'Matched participant rows')}</h3>
                  <p className={styles.cardLead}>{ui('matchedRowsLead', 'Per-learner pre/post gain values.')}</p>
                </div>
                <span className="badge badge-muted">{prePost.rows.length} {ui('rows', 'rows')}</span>
              </div>
              {prePost.rows.length > 0 ? (
                <div className="table-scroll">
                  <table className={styles.table}>
                    <thead><tr><th>{ui('thParticipant', 'Participant')}</th><th>{ui('thCohort', 'Cohort')}</th><th>{ui('thPre', 'Pre')}</th><th>{ui('thPost', 'Post')}</th><th>{ui('thGain', 'Gain')}</th></tr></thead>
                    <tbody>
                      {prePost.rows.slice(0, 18).map((row: any) => (
                        <tr key={row.participantId} className={styles.clickRow} onClick={() => navigate(`/research-admin/participants/${row.participantId}`)}>
                          <td>{row.participantId}</td>
                          <td>{cohortLabel(row.cohort)}</td>
                          <td>{row.preScore?.toFixed(2)}</td>
                          <td>{row.postScore?.toFixed(2)}</td>
                          <td>{fmt(row.gain, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                renderEmptyPanel(
                  'research.dashboard.empty.prepostRowsTitle',
                  'No matched rows to display.',
                  'research.dashboard.empty.prepostRowsBody',
                  'Once learners complete both assessments, matched rows appear here.',
                )
              )}
            </article>
          </div>
        </section>

        <section id="emotions" className={styles.sectionBlock}>
          <div className={styles.sectionIntro}><div><span className={styles.sectionEyebrow}>{ui('emotionsEyebrow', 'Emotion sensing summary')}</span><h2>{ui('emotionsTitle', 'Emotion timeline and heatmap')}</h2></div><p>{ui('emotionsLead', 'Chronological emotion-action records for session-level interpretation.')}</p></div>
          <article className={styles.fullWidthCard}><div className={styles.panelHead}><div><h3>{ui('timelineTableTitle', 'Timeline table')}</h3><p className={styles.cardLead}>{ui('timelineTableLead', 'Participant/session timestamp trace with emotion, engagement, and adaptive actions.')}</p></div><span className="badge badge-soft-blue">{filtered.heatmapData.length} {ui('rows', 'rows')}</span></div><div className="table-scroll"><table className={styles.table}><thead><tr><th>{ui('thParticipant', 'Participant')}</th><th>{ui('thSession', 'Session')}</th><th>{ui('thTime', 'Time')}</th><th>{ui('thEmotion', 'Emotion')}</th><th>{ui('thConfidence', 'Confidence')}</th><th>{ui('thLessonActivity', 'Lesson/Activity')}</th><th>{ui('thEngagement', 'Engagement')}</th><th>{ui('thAdaptiveAction', 'Adaptive action')}</th><th>{ui('thOutcome', 'Outcome')}</th></tr></thead><tbody>{filtered.heatmapData.slice(-24).map((row: any, index: number) => <tr key={`${row.participantId}-${index}`} className={styles.clickRow} onClick={() => setSelectedParticipantId(row.participantId)}><td>{row.participantId}</td><td>{row.sessionId}</td><td>{fmtTime(row.timestamp)}</td><td>{emotionDisplayName(row.detectedEmotion ?? row.rawEmotion)}</td><td>{row.confidence === null ? '--' : `${Math.round(row.confidence * 100)}%`}</td><td>{row.currentLessonActivity}</td><td>{formatLabel(row.engagementLevel)}</td><td>{formatLabel(row.triggeredAdaptiveAction)}</td><td>{formatLabel(row.postActionOutcome)}</td></tr>)}</tbody></table></div></article>
        </section>

        <section id="interventions" className={styles.sectionBlock}>
          <div className={styles.sectionIntro}>
            <div>
              <span className={styles.sectionEyebrow}>{ui('priority3', 'Priority 3')}</span>
              <h2>{ui('interventionsTitle', 'Adaptive intervention effectiveness')}</h2>
            </div>
            <p>{ui('interventionsLead', 'Trigger-emotion mapping, effectiveness, and recovery latency indicators.')}</p>
          </div>
          <div className={styles.dualGrid}>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>{ui('interventionEffectivenessTitle', 'Intervention effectiveness')}</h3>
                  <p className={styles.cardLead}>{ui('interventionEffectivenessLead', 'Adaptive intervention patterns with before/after states.')}</p>
                </div>
                <span className="badge badge-amber">{interventionStats.rows.length} {ui('patterns', 'patterns')}</span>
              </div>
              {interventionStats.totalEvents > 0 ? (
                <>
                  <div className={styles.summaryMetrics}>
                    <div className={styles.summaryMetric}><span>{ui('interventionEvents', 'Intervention events')}</span><strong>{interventionStats.totalEvents}</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('evaluatedOutcomes', 'Evaluated outcomes')}</span><strong>{interventionStats.evaluatedEvents}</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('weightedEffectiveness', 'Weighted effectiveness')}</span><strong>{Math.round(interventionStats.weightedEffectiveness)}%</strong></div>
                  </div>
                  <div className={styles.summaryMetrics}>
                    <div className={styles.summaryMetric}><span>{ui('avgLatency', 'Avg latency')}</span><strong>{interventionStats.avgLatencySec.toFixed(1)} {ui('secondsShort', 's')}</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('bestIntervention', 'Best intervention')}</span><strong>{interventionStats.bestIntervention ? formatLabel(interventionStats.bestIntervention.intervention) : '--'}</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('leastEffectiveIntervention', 'Least effective intervention')}</span><strong>{interventionStats.leastIntervention ? formatLabel(interventionStats.leastIntervention.intervention) : '--'}</strong></div>
                  </div>
                  <div className="table-scroll">
                    <table className={styles.table}>
                      <thead><tr><th>{ui('thTrigger', 'Trigger')}</th><th>{ui('thIntervention', 'Intervention')}</th><th>{ui('thN', 'N')}</th><th>{ui('thEvaluated', 'Evaluated')}</th><th>{ui('thEffectiveness', 'Effectiveness')}</th><th>{ui('thBeforeAfter', 'Before to After')}</th></tr></thead>
                      <tbody>
                        {interventionStats.rows.slice(0, 12).map((row: any, index: number) => (
                          <tr key={`${row.triggerType}-${index}`}>
                            <td>{row.triggerEmotion ? emotionDisplayName(row.triggerEmotion) : formatLabel(row.triggerType)}</td>
                            <td>{formatLabel(row.intervention)}</td>
                            <td>{row.count}</td>
                            <td>{row.evaluatedCount}</td>
                            <td>{row.effectivenessPct === null ? '--' : `${Math.round(row.effectivenessPct)}%`}</td>
                            <td>{row.stateBefore ? emotionDisplayName(row.stateBefore) : '--'} {ui('toConnector', 'to')} {row.stateAfter ? emotionDisplayName(row.stateAfter) : '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                renderEmptyPanel(
                  'research.dashboard.empty.interventionsTitle',
                  'No intervention records for current filters.',
                  'research.dashboard.empty.interventionsBody',
                  'Run adaptive sessions and ensure interventions are logged to activate this section.',
                )
              )}
            </article>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>{ui('triggerMatrixTitle', 'Trigger emotion x intervention matrix')}</h3>
                  <p className={styles.cardLead}>{ui('triggerMatrixLead', 'Counts by trigger emotion and intervention type.')}</p>
                </div>
                <span className="badge badge-soft-blue">{ui('matrixBadge', 'Matrix')}</span>
              </div>
              {interventionStats.matrixColumns.length > 0 ? (
                <>
                  <div className="table-scroll">
                    <table className={styles.table}>
                      <thead><tr><th>{ui('thTriggerEmotion', 'Trigger emotion')}</th>{interventionStats.matrixColumns.map((col: string) => <th key={col}>{formatLabel(col)}</th>)}</tr></thead>
                      <tbody>{interventionStats.matrixRows.map((row: any) => <tr key={row.emotion}><td>{emotionDisplayName(row.emotion)}</td>{interventionStats.matrixColumns.map((col: string) => <td key={`${row.emotion}-${col}`}>{row.counts[col] ?? 0}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                  <div className={styles.summaryMetrics}>
                    <div className={styles.summaryMetric}><span>{ui('timelineInterventions', 'Timeline interventions')}</span><strong>{interventionStats.timelineInterventions}</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('positivePostOutcomes', 'Positive post-outcomes')}</span><strong>{interventionStats.positiveOutcomeRate}%</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('returnToFocus', 'Return to high engagement')}</span><strong>{interventionStats.returnToFocusRate}%</strong></div>
                  </div>
                  <div className="table-scroll">
                    <table className={styles.table}>
                      <thead><tr><th>{ui('thTriggerEmotion', 'Trigger emotion')}</th><th>{ui('thInterventions', 'Interventions')}</th><th>{ui('thEvaluated', 'Evaluated')}</th><th>{ui('thSuccessRate', 'Success rate')}</th></tr></thead>
                      <tbody>
                        {interventionStats.triggerSummary.slice(0, 8).map((row: any) => (
                          <tr key={row.triggerEmotion}>
                            <td>{emotionDisplayName(row.triggerEmotion)}</td>
                            <td>{row.count}</td>
                            <td>{row.evaluated}</td>
                            <td>{row.effectivenessPct === null ? '--' : `${Math.round(row.effectivenessPct)}%`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                renderEmptyPanel(
                  'research.dashboard.empty.triggerMatrixTitle',
                  'No trigger matrix data available.',
                  'research.dashboard.empty.triggerMatrixBody',
                  'Intervention matrix appears once trigger-emotion pairs are logged.',
                )
              )}
            </article>
          </div>
        </section>

        <section id="emotion-performance" className={styles.sectionBlock}>
          <div className={styles.sectionIntro}>
            <div>
              <span className={styles.sectionEyebrow}>{ui('priority4', 'Priority 4')}</span>
              <h2>{ui('emotionPerformanceTitle', 'Emotion vs performance analytics')}</h2>
            </div>
            <p>{ui('emotionPerformanceLead', 'Link emotional burden and engagement quality to completion and gain outcomes.')}</p>
          </div>
          <div className={styles.dualGrid}>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>{ui('dominantVsOutcomeTitle', 'Dominant emotion vs outcomes')}</h3>
                  <p className={styles.cardLead}>{ui('dominantVsOutcomeLead', 'Participant groups by dominant emotional state.')}</p>
                </div>
                <span className="badge badge-muted">{emotionPerformance.rows.length} {ui('groups', 'groups')}</span>
              </div>
              {emotionPerformance.rows.length > 0 ? (
                <>
                  <div className={styles.summaryMetrics}>
                    <div className={styles.summaryMetric}>
                      <span>{ui('focusCompletionCorr', 'High engagement vs completion correlation')}</span>
                      <strong>{emotionPerformance.correlation.highEngagementVsCompletion === null ? '--' : emotionPerformance.correlation.highEngagementVsCompletion.toFixed(2)}</strong>
                    </div>
                    <div className={styles.summaryMetric}>
                      <span>{ui('struggleGainCorr', 'Struggle vs gain correlation')}</span>
                      <strong>{emotionPerformance.correlation.struggleVsGain === null ? '--' : emotionPerformance.correlation.struggleVsGain.toFixed(2)}</strong>
                    </div>
                    <div className={styles.summaryMetric}>
                      <span>{ui('participantLinkageRows', 'Participant linkage rows')}</span>
                      <strong>{emotionPerformance.participantRows.length}</strong>
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table className={styles.table}>
                      <thead><tr><th>{ui('thEmotion', 'Emotion')}</th><th>{ui('thParticipants', 'Participants')}</th><th>{ui('thCompletion', 'Completion')}</th><th>{ui('thGain', 'Gain')}</th><th>{ui('thQuizScore', 'Quiz score')}</th><th>{ui('thAvgAttempts', 'Avg attempts')}</th></tr></thead>
                      <tbody>{emotionPerformance.rows.map((row: any) => <tr key={row.emotion}><td>{emotionDisplayName(row.emotion)}</td><td>{row.participants}</td><td>{Math.round(row.completionMean)}%</td><td>{fmt(row.gainMean, 2)}</td><td>{row.quizScoreMean === null ? '--' : `${Math.round(row.quizScoreMean)}%`}</td><td>{row.avgAttempts.toFixed(1)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </>
              ) : (
                renderEmptyPanel(
                  'research.dashboard.empty.emotionPerformanceTitle',
                  'No emotion-performance rows yet.',
                  'research.dashboard.empty.emotionPerformanceBody',
                  'Require timeline emotion events and learner outcome records under the current filter scope.',
                )
              )}
            </article>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>{ui('participantLinkageTitle', 'Participant-level linkage')}</h3>
                  <p className={styles.cardLead}>{ui('participantLinkageLead', 'High-engagement ratio, confusion/frustration burden, and performance trace.')}</p>
                </div>
                <span className="badge badge-soft-blue">{emotionPerformance.participantRows.length} {ui('rows', 'rows')}</span>
              </div>
              {emotionPerformance.participantRows.length > 0 ? (
                <div className="table-scroll">
                  <table className={styles.table}>
                    <thead><tr><th>{ui('thParticipant', 'Participant')}</th><th>{ui('thCompletion', 'Completion')}</th><th>{ui('thGain', 'Gain')}</th><th>{ui('thFocusedRatio', 'High-engagement ratio')}</th><th>{ui('thFrustrationConfusion', 'Frustration + confusion')}</th><th>{ui('thDistractionRatio', 'No-face fallback ratio')}</th><th>{ui('thConfidence', 'Confidence')}</th></tr></thead>
                    <tbody>{emotionPerformance.participantRows.slice(0, 12).map((row: any) => <tr key={row.participantId} className={styles.clickRow} onClick={() => navigate(`/research-admin/participants/${row.participantId}`)}><td>{row.participantId}</td><td>{Math.round(row.completionPct)}%</td><td>{fmt(row.gain, 2)}</td><td>{Math.round(row.highEngagementRatio * 100)}%</td><td>{Math.round(row.frustrationConfusionRatio * 100)}%</td><td>{Math.round(row.noFaceFallbackRatio * 100)}%</td><td>{Math.round((row.confidence ?? 0) * 100)}%</td></tr>)}</tbody>
                  </table>
                </div>
              ) : (
                renderEmptyPanel(
                  'research.dashboard.empty.participantLinkageTitle',
                  'No participant-level linkage available.',
                  'research.dashboard.empty.participantLinkageBody',
                  'Add session, emotion, and outcome records to populate this relation table.',
                )
              )}
            </article>
          </div>
        </section>

        <section id="content-types" className={styles.sectionBlock}>
          <div className={styles.sectionIntro}>
            <div>
              <span className={styles.sectionEyebrow}>{ui('priority5', 'Priority 5')}</span>
              <h2>{ui('contentTypesTitle', 'Content type analytics')}</h2>
            </div>
            <p>{ui('contentTypesLead', 'Emotional response and intervention load by content type and learning block style.')}</p>
          </div>
          <div className={styles.dualGrid}>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>{ui('contentMatrixTitle', 'Content type matrix')}</h3>
                  <p className={styles.cardLead}>{ui('contentMatrixLead', 'Dominant emotion, interventions, completion and gain by content type.')}</p>
                </div>
                <span className="badge badge-soft-blue">{contentStats.rows.length} {ui('types', 'types')}</span>
              </div>
              {contentStats.rows.length > 0 ? (
                <>
                  <div className={styles.summaryMetrics}>
                    <div className={styles.summaryMetric}><span>{ui('mostDistractingType', 'Highest no-face fallback type')}</span><strong>{contentStats.mostNoFaceFallback ? formatLabel(contentStats.mostNoFaceFallback.contentType) : '--'}</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('mostFocusType', 'Most high-engagement supportive type')}</span><strong>{contentStats.mostHighEngagementSupportive ? formatLabel(contentStats.mostHighEngagementSupportive.contentType) : '--'}</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('typesWithInterventions', 'Types with interventions')}</span><strong>{contentStats.rows.filter((row: any) => row.interventionCount > 0).length}</strong></div>
                  </div>
                  <div className="table-scroll">
                    <table className={styles.table}>
                      <thead><tr><th>{ui('thContentType', 'Content type')}</th><th>{ui('thDominantEmotion', 'Dominant emotion')}</th><th>{ui('thInterventions', 'Interventions')}</th><th>{ui('thInterventionRate', 'Intervention rate')}</th><th>{ui('thLowEngagement', 'Low-engagement')}</th><th>{ui('thAvgTime', 'Avg time')}</th><th>{ui('thCompletion', 'Completion')}</th><th>{ui('thGain', 'Gain')}</th></tr></thead>
                      <tbody>{contentStats.rows.map((row: any) => <tr key={row.contentType}><td>{formatLabel(row.contentType)}</td><td>{row.dominantEmotion ? emotionDisplayName(row.dominantEmotion) : '--'}</td><td>{row.interventionCount}</td><td>{Math.round(row.interventionRate)}%</td><td>{Math.round(row.lowEngagementShare)}%</td><td>{row.avgTimeSpentSec ? `${row.avgTimeSpentSec.toFixed(1)} ${ui('secondsShort', 's')}` : '--'}</td><td>{Math.round(row.completionMean)}%</td><td>{fmt(row.gainMean, 2)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </>
              ) : (
                renderEmptyPanel(
                  'research.dashboard.empty.contentTypeTitle',
                  'No content-type analytics available yet.',
                  'research.dashboard.empty.contentTypeBody',
                  'Ensure content interactions and timeline events are being captured to activate this section.',
                )
              )}
            </article>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>{ui('assessmentLatencyTitle', 'Assessment latency by emotion')}</h3>
                  <p className={styles.cardLead}>{ui('assessmentLatencyLead', 'Latency profile of assessment interactions by emotional state.')}</p>
                </div>
                <span className="badge badge-muted">{assessmentLatencyRows.length} {ui('rows', 'rows')}</span>
              </div>
              {assessmentLatencyRows.length > 0 ? (
                <div className="table-scroll">
                  <table className={styles.table}>
                    <thead><tr><th>{ui('thEmotion', 'Emotion')}</th><th>{ui('thAttempts', 'Attempts')}</th><th>{ui('thAvgLatency', 'Avg latency')}</th><th>{ui('thMinMaxLatency', 'Min/Max latency')}</th></tr></thead>
                    <tbody>{assessmentLatencyRows.map((row: any, index: number) => <tr key={`${row.emotionalState ?? 'unknown'}-${index}`}><td>{row.emotionalState ? emotionDisplayName(row.emotionalState) : '--'}</td><td>{row.attempts}</td><td>{row.avgLatencySec.toFixed(2)} {ui('secondsShort', 's')}</td><td>{row.minLatencySec.toFixed(2)} - {row.maxLatencySec.toFixed(2)} {ui('secondsShort', 's')}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : (
                renderEmptyPanel(
                  'research.dashboard.empty.assessmentLatencyTitle',
                  'No assessment-latency rows for current filters.',
                  'research.dashboard.empty.assessmentLatencyBody',
                  'Latency appears after quiz/assessment activity is linked to adaptive events.',
                )
              )}
            </article>
          </div>
        </section>

        <section id="drilldown" className={styles.sectionBlock}>
          <div className={styles.sectionIntro}>
            <div>
              <span className={styles.sectionEyebrow}>{ui('priority6', 'Priority 6')}</span>
              <h2>{ui('drilldownTitle', 'Unit / Lesson / Activity drill-down')}</h2>
            </div>
            <p>{ui('drilldownLead', 'Drill from global overview into problematic and successful learning points.')}</p>
          </div>
          <div className={styles.dualGrid}>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>{ui('unitDrilldownTitle', 'Unit drill-down')}</h3>
                  <p className={styles.cardLead}>{ui('unitDrilldownLead', 'Completion burden and dominant emotions per unit.')}</p>
                </div>
                <span className="badge badge-soft-blue">{hierarchy.unitRows.length} {ui('units', 'units')}</span>
              </div>
              {hierarchy.unitRows.length > 0 ? (
                <div className="table-scroll">
                  <table className={styles.table}>
                    <thead><tr><th>{ui('thUnit', 'Unit')}</th><th>{ui('thParticipants', 'Participants')}</th><th>{ui('thEvents', 'Events')}</th><th>{ui('thDominantEmotion', 'Dominant emotion')}</th><th>{ui('thInterventions', 'Interventions')}</th><th>{ui('thCompletion', 'Completion')}</th><th>{ui('thLowEngagement', 'Low-engagement')}</th></tr></thead>
                    <tbody>{hierarchy.unitRows.map((row: any) => <tr key={row.key}><td>{row.label ?? row.key}</td><td>{row.participants}</td><td>{row.events}</td><td>{row.dominantEmotion ? emotionDisplayName(row.dominantEmotion) : '--'}</td><td>{row.interventions}</td><td>{Math.round(row.completionMean)}%</td><td>{Math.round(row.lowEngagementRate)}%</td></tr>)}</tbody>
                  </table>
                </div>
              ) : (
                renderEmptyPanel(
                  'research.dashboard.empty.unitDrilldownTitle',
                  'No unit-level rows available.',
                  'research.dashboard.empty.unitDrilldownBody',
                  'Unit drill-down appears after timeline rows include identifiable unit contexts.',
                )
              )}
            </article>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>{ui('activityDrilldownTitle', 'Activity drill-down')}</h3>
                  <p className={styles.cardLead}>{ui('activityDrilldownLead', 'Drop-off risk and success score per activity.')}</p>
                </div>
                <span className="badge badge-muted">{hierarchy.activityRows.length} {ui('activities', 'activities')}</span>
              </div>
              {hierarchy.activityRows.length > 0 ? (
                <>
                  <div className="table-scroll">
                    <table className={styles.table}>
                      <thead><tr><th>{ui('thActivity', 'Activity')}</th><th>{ui('thEvents', 'Events')}</th><th>{ui('thDominantEmotion', 'Dominant emotion')}</th><th>{ui('thInterventions', 'Interventions')}</th><th>{ui('thDropOffRisk', 'Drop-off risk')}</th><th>{ui('thSuccessScore', 'Success score')}</th></tr></thead>
                      <tbody>{hierarchy.activityRows.slice(0, 14).map((row: any) => <tr key={row.key}><td>{row.label ?? row.key}</td><td>{row.events}</td><td>{row.dominantEmotion ? emotionDisplayName(row.dominantEmotion) : '--'}</td><td>{row.interventions}</td><td>{Math.round(row.dropOffRisk)}%</td><td>{Math.round(row.successScore)}%</td></tr>)}</tbody>
                    </table>
                  </div>
                  <div className={styles.summaryMetrics}>
                    <div className={styles.summaryMetric}><span>{ui('mostProblematic', 'Most problematic')}</span><strong>{hierarchy.problemRows[0]?.label ?? hierarchy.problemRows[0]?.key ?? '--'}</strong></div>
                    <div className={styles.summaryMetric}><span>{ui('mostSuccessful', 'Most successful')}</span><strong>{hierarchy.successRows[0]?.label ?? hierarchy.successRows[0]?.key ?? '--'}</strong></div>
                  </div>
                </>
              ) : (
                renderEmptyPanel(
                  'research.dashboard.empty.activityDrilldownTitle',
                  'No activity-level rows available.',
                  'research.dashboard.empty.activityDrilldownBody',
                  'Activity hotspots will appear once lesson activity events are logged.',
                )
              )}
            </article>
          </div>
        </section>

        <section id="comparison" className={styles.sectionBlock}>
          <div className={styles.sectionIntro}><div><span className={styles.sectionEyebrow}>{ui('priority7', 'Priority 7')}</span><h2>{ui('comparisonTitle', 'Experimental vs control comparison')}</h2></div><p>{ui('comparisonLead', 'Comparative outcomes for gains, completion, duration, and intervention density.')}</p></div>
          <div className={styles.dualGrid}>
            <article className={styles.reportCard}><div className={styles.panelHead}><div><h3>{ui('cohortCardsTitle', 'Cohort comparison cards')}</h3><p className={styles.cardLead}>{ui('cohortCardsLead', 'Direct exp-control deltas for primary study outcomes.')}</p></div><span className="badge badge-teal">{ui('comparative', 'Comparative')}</span></div><div className={styles.summaryMetrics}><div className={styles.summaryMetric}><span>{ui('experimentalCompletion', 'Experimental completion')}</span><strong>{Math.round(groupComparison.experimental.completionMean)}%</strong></div><div className={styles.summaryMetric}><span>{ui('controlCompletion', 'Control completion')}</span><strong>{Math.round(groupComparison.control.completionMean)}%</strong></div><div className={styles.summaryMetric}><span>{ui('completionDelta', 'Completion delta')}</span><strong>{fmt(groupComparison.experimental.completionMean - groupComparison.control.completionMean, 1)}</strong></div></div><div className={styles.summaryMetrics}><div className={styles.summaryMetric}><span>{ui('kpiExperimentalGain', 'Experimental Gain')}</span><strong>{fmt(groupComparison.experimental.gainMean, 2)}</strong></div><div className={styles.summaryMetric}><span>{ui('kpiControlGain', 'Control Gain')}</span><strong>{fmt(groupComparison.control.gainMean, 2)}</strong></div><div className={styles.summaryMetric}><span>{ui('gainDelta', 'Gain delta')}</span><strong>{fmt(groupComparison.experimental.gainMean - groupComparison.control.gainMean, 2)}</strong></div></div></article>
            <article className={styles.reportCard}><div className={styles.panelHead}><div><h3>{ui('comparativeTableTitle', 'Comparative table')}</h3><p className={styles.cardLead}>{ui('comparativeTableLead', 'Structured metric-by-metric exp/control comparison.')}</p></div><span className="badge badge-muted">{groupComparison.tableRows.length} {ui('metrics', 'metrics')}</span></div><div className="table-scroll"><table className={styles.table}><thead><tr><th>{ui('thMetric', 'Metric')}</th><th>{ui('thExperimental', 'Experimental')}</th><th>{ui('thControl', 'Control')}</th><th>{ui('thDelta', 'Delta')}</th></tr></thead><tbody>{groupComparison.tableRows.map((row: any) => <tr key={row.metric}><td>{row.metric}</td><td>{row.experimental}</td><td>{row.control}</td><td>{row.delta}</td></tr>)}</tbody></table></div>{groupComparison.notes.length ? <div className={styles.insightList}>{groupComparison.notes.map((note: string) => <div key={note} className={styles.insightRow}><strong>{ui('note', 'Note')}</strong><p>{note}</p></div>)}</div> : null}</article>
          </div>
        </section>

        <section id="response-types" className={styles.sectionBlock}>
          <div className={styles.sectionIntro}>
            <div>
              <span className={styles.sectionEyebrow}>{ui('priority8', 'Priority 8')}</span>
              <h2>{ui('responseTypesTitle', 'Deep response-type analytics')}</h2>
            </div>
            <p>{ui('responseTypesLead', 'Completion, gains, emotional patterns, and adaptive sensitivity by response type.')}</p>
          </div>
          <div className={styles.dualGrid}>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>{ui('responseTableTitle', 'Response-type analytical table')}</h3>
                  <p className={styles.cardLead}>{ui('responseTableLead', 'Aggregated response-category behavior and outcomes.')}</p>
                </div>
                <span className="badge badge-soft-blue">{responseDeep.rows.length} {ui('types', 'types')}</span>
              </div>
              {responseDeep.rows.length > 0 ? (
                <div className="table-scroll">
                  <table className={styles.table}>
                    <thead><tr><th>{ui('thResponseType', 'Response type')}</th><th>{ui('thLearners', 'Learners')}</th><th>{ui('thCompletion', 'Completion')}</th><th>{ui('thGain', 'Gain')}</th><th>{ui('thDominantEmotion', 'Dominant emotion')}</th><th>{ui('thInterventionsPerLearner', 'Interventions/learner')}</th><th>{ui('thSensitiveContent', 'Sensitive content')}</th></tr></thead>
                    <tbody>{responseDeep.rows.map((row: any) => <tr key={row.responseType}><td>{formatLabel(row.responseType)}</td><td>{row.learners}</td><td>{Math.round(row.completionMean)}%</td><td>{fmt(row.gainMean, 2)}</td><td>{row.dominantEmotion ? emotionDisplayName(row.dominantEmotion) : '--'}</td><td>{row.interventionsPerLearner.toFixed(1)}</td><td>{formatLabel(row.sensitiveContentType)}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : (
                renderEmptyPanel(
                  'research.dashboard.empty.responseTypeRowsTitle',
                  'No response-type analytics rows yet.',
                  'research.dashboard.empty.responseTypeRowsBody',
                  'Need participant progression and emotion timeline data to build this section.',
                )
              )}
            </article>
            <article className={styles.reportCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>{ui('responseInsightsTitle', 'Response-type insights')}</h3>
                  <p className={styles.cardLead}>{ui('responseInsightsLead', 'Interpretive notes for response mediation analysis.')}</p>
                </div>
                <span className="badge badge-muted">{responseDeep.insights.length} {ui('insights', 'insights')}</span>
              </div>
              {responseDeep.insights.length ? <div className={styles.insightList}>{responseDeep.insights.map((insight: any) => <div key={insight.title} className={styles.insightRow}><strong>{insight.title}</strong><p>{insight.description}</p></div>)}</div> : renderEmptyPanel(
                'research.dashboard.empty.responseTypeInsightsTitle',
                'No response-type insights yet.',
                'research.dashboard.empty.responseTypeInsightsBody',
                'Populate participant profiles with response categories or run more sessions to deepen mediation analysis.',
              )}
              {filtered.responseTypesData.length > 0 ? (
                <div className="table-scroll">
                  <table className={styles.table}>
                    <thead><tr><th>{ui('thCohort', 'Cohort')}</th><th>{ui('thResponseType', 'Response type')}</th><th>{ui('thSource', 'Source')}</th><th>{ui('thLearners', 'Learners')}</th></tr></thead>
            <tbody>{filtered.responseTypesData.map((row: any, index: number) => <tr key={`${row.cohort}-${row.responseType}-${index}`}><td>{cohortLabel(row.cohort)}</td><td>{formatLabel(row.responseType)}</td><td>{formatLabel(row.responseSource ?? 'profile')}</td><td>{row.count}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : (
                renderEmptyPanel(
                  'research.dashboard.empty.responseTypeDistributionTitle',
                  'No cohort response rows available.',
                  'research.dashboard.empty.responseTypeDistributionBody',
                  'Response-type distribution table will appear after profile or derived classification is available.',
                )
              )}
            </article>
          </div>
        </section>

        <section id="participant-detail" className={styles.sectionBlock}>
          <div className={styles.sectionIntro}><div><span className={styles.sectionEyebrow}>{ui('priority9', 'Priority 9')}</span><h2>{ui('participantDetailTitle', 'Participant session detail')}</h2></div><p>{ui('participantDetailLead', 'Drill-down timeline for a selected participant with full intervention trace.')}</p></div>
          <div className={styles.dualGrid}>
          <article className={styles.reportCard}><div className={styles.panelHead}><div><h3>{ui('participantSelectorTitle', 'Participant selector')}</h3><p className={styles.cardLead}>{ui('participantSelectorLead', 'Focus one learner and inspect session path in detail.')}</p></div><span className="badge badge-muted">{aggregates.length} {ui('participants', 'participants')}</span></div><div className={styles.participantList}>{aggregates.slice(0, 12).map((row: any) => <button key={row.participantId} type="button" className={styles.participantCard} onClick={() => setSelectedParticipantId(row.participantId)}><div className={styles.participantHead}><div><strong>{row.participantId}</strong><span className={styles.participantMeta}>{ui('participantCohortSessions', '{cohort} cohort · {sessions} sessions', { cohort: cohortLabel(row.cohort), sessions: row.totalSessions })}</span></div><ArrowUpRight size={16} /></div><div className={styles.participantMetrics}><span>{Math.round(row.avgCompletionPct)}% {ui('completionLabel', 'completion')}</span><span>{row.interventionCount} {ui('interventionsLabel', 'interventions')}</span><span>{formatLabel(row.responseType)}</span></div></button>)}</div></article>
            <article className={styles.reportCard}><div className={styles.panelHead}><div><h3>{ui('selectedTimelineTitle', 'Selected participant timeline')}</h3><p className={styles.cardLead}>{ui('selectedTimelineLead', 'Timestamped emotion and adaptive events with outcomes.')}</p></div><span className="badge badge-soft-blue">{selectedTimeline.length} {ui('rows', 'rows')}</span></div>{selectedAggregate ? <><div className={styles.summaryMetrics}><div className={styles.summaryMetric}><span>{ui('thParticipant', 'Participant')}</span><strong>{selectedAggregate.participantId}</strong></div><div className={styles.summaryMetric}><span>{ui('cohortResponse', 'Cohort / response')}</span><strong>{cohortLabel(selectedAggregate.cohort)} / {formatLabel(selectedAggregate.responseType)}</strong></div><div className={styles.summaryMetric}><span>{ui('durationMean', 'Duration mean')}</span><strong>{selectedAggregate.avgDurationMin.toFixed(1)} {ui('minShort', 'min')}</strong></div></div><div className="table-scroll"><table className={styles.table}><thead><tr><th>{ui('thTime', 'Time')}</th><th>{ui('thSession', 'Session')}</th><th>{ui('thActivity', 'Activity')}</th><th>{ui('thEmotion', 'Emotion')}</th><th>{ui('thEngagement', 'Engagement')}</th><th>{ui('thAdaptiveEvent', 'Adaptive event')}</th><th>{ui('thOutcome', 'Outcome')}</th></tr></thead><tbody>{selectedTimeline.slice(-30).map((row: any, index: number) => <tr key={`${row.timestamp}-${index}`}><td>{fmtTime(row.timestamp)}</td><td>{row.sessionId}</td><td>{row.currentLessonActivity}</td><td>{emotionDisplayName(row.detectedEmotion ?? row.rawEmotion)}</td><td>{formatLabel(row.engagementLevel)}</td><td>{formatLabel(row.triggeredAdaptiveAction)}</td><td>{formatLabel(row.postActionOutcome)}</td></tr>)}</tbody></table></div><div className={styles.exportActions}><button className="btn btn-secondary btn-sm" onClick={() => navigate(`/research-admin/participants/${selectedAggregate.participantId}`)}><ArrowUpRight size={13} />{ui('openFullParticipantReport', 'Open full participant report')}</button><button className="btn btn-secondary btn-sm" onClick={() => handleClientExport('participant_session_detail', selectedTimeline)}><Download size={13} />{ui('exportParticipantTimeline', 'Export participant timeline')}</button></div></> : renderEmptyPanel('research.dashboard.empty.selectParticipantTitle', 'Select a participant to view details.')}</article>
          </div>
        </section>

        <section id="exports" className={styles.sectionBlock}>
          <div className={styles.sectionIntro}><div><span className={styles.sectionEyebrow}>{ui('priority10', 'Priority 10')}</span><h2>{ui('exportsTitle', 'Research export completion')}</h2></div><p>{ui('exportsLead', 'Export one dataset per analytical area for statistical analysis.')}</p></div>
          <article className={styles.fullWidthCard}><div className={styles.panelHead}><div><h3>{ui('exportCenterTitle', 'Analytics export center')}</h3><p className={styles.cardLead}>{ui('exportCenterLead', 'Dashboard-derived and server-level exports with participant/session identifiers.')}</p></div><span className="badge badge-soft-blue">{ui('csvReady', 'CSV ready')}</span></div><div className={styles.exportActions}><button className="btn btn-secondary btn-sm" onClick={() => handleClientExport('pre_post_performance', prePost.rows)}><Download size={13} />{ui('prepostRowsExport', 'Pre/Post rows')}</button><button className="btn btn-secondary btn-sm" onClick={() => handleClientExport('intervention_effectiveness', interventionStats.rows)}><Download size={13} />{ui('interventionEffectivenessExport', 'Intervention effectiveness')}</button><button className="btn btn-secondary btn-sm" onClick={() => handleClientExport('emotion_vs_performance', emotionPerformance.participantRows)}><Download size={13} />{ui('emotionPerformanceExport', 'Emotion vs performance')}</button><button className="btn btn-secondary btn-sm" onClick={() => handleClientExport('content_type_analytics', contentStats.rows)}><Download size={13} />{ui('contentTypeExport', 'Content type analytics')}</button><button className="btn btn-secondary btn-sm" onClick={() => handleClientExport('activity_drilldown', hierarchy.activityRows)}><Download size={13} />{ui('activityDrilldownExport', 'Activity drill-down')}</button><button className="btn btn-secondary btn-sm" onClick={() => handleClientExport('experimental_control_comparison', groupComparison.tableRows)}><Download size={13} />{ui('groupComparisonExport', 'Group comparison')}</button><button className="btn btn-secondary btn-sm" onClick={() => handleClientExport('response_type_analytics', responseDeep.rows)}><Download size={13} />{ui('responseTypeExport', 'Response-type analytics')}</button><button className="btn btn-secondary btn-sm" onClick={() => handleClientExport('timeline_heatmap_filtered', filtered.heatmapData)}><Download size={13} />{ui('filteredTimelineExport', 'Filtered timeline')}</button></div></article>
        </section>
      </div>
    </div>
  );
}

function emotionColor(state: CanonicalEmotionState) {
  if (state === 'high_engagement') return 'var(--affect-flow)';
  if (state === 'confusion') return 'var(--affect-confusion)';
  if (state === 'frustration') return 'var(--affect-frustration)';
  if (state === 'boredom_disengagement') return 'var(--affect-boredom)';
  if (state === 'test_anxiety') return 'var(--affect-anxiety)';
  return 'var(--color-amber)';
}

function asArray(value: any): any[] { return Array.isArray(value) ? value : []; }
function num(value: any): number { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; }
function avg(values: number[]) { return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0; }
function unique(values: string[]) { return [...new Set(values.filter(Boolean))]; }
function currentLocale() {
  return document.documentElement.lang === 'ar' ? 'ar-SA' : 'en-US';
}

function computePearsonCorrelation(xs: number[], ys: number[]) {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const meanX = avg(xs);
  const meanY = avg(ys);
  let numerator = 0;
  let varianceX = 0;
  let varianceY = 0;
  for (let index = 0; index < xs.length; index += 1) {
    const dx = Number(xs[index] ?? 0) - meanX;
    const dy = Number(ys[index] ?? 0) - meanY;
    numerator += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }
  const denominator = Math.sqrt(varianceX * varianceY);
  if (!denominator) return null;
  return numerator / denominator;
}

function fmt(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  const absolute = Math.abs(value);
  const formatted = new Intl.NumberFormat(currentLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(absolute);
  return `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatted}`;
}

function formatLabel(value: unknown) {
  return String(value ?? '--').replace(/_/g, ' ');
}

function fmtTime(value: unknown) {
  const date = new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat(currentLocale(), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
function normalizeCohort(value: any) { const token = String(value ?? '').toLowerCase(); if (token === 'experimental') return 'experimental'; if (token === 'control') return 'control'; return 'unknown'; }
function formatCohortLabel(
  translate: (key: string, fallback?: string, values?: Record<string, string | number>) => string,
  value: unknown,
) {
  const normalized = normalizeCohort(value);
  if (normalized === 'experimental') return translate('common.cohort.experimental', 'Experimental');
  if (normalized === 'control') return translate('common.cohort.control', 'Control');
  return formatLabel(value);
}
function parseUnit(activity: string) { const m = activity.match(/(M\d+)/i); return m ? m[1].toUpperCase() : 'UNASSIGNED'; }
function parseLesson(activity: string) { const m = activity.match(/(M\d+E\d+)/i); return m ? m[1].toUpperCase() : activity.toUpperCase(); }
function normalizeEngagementLevel(value: any) { const token = String(value ?? '').toLowerCase(); if (token === 'high') return 'high'; if (token === 'moderate' || token === 'medium') return 'moderate'; if (token === 'low') return 'low'; if (token === 'idle') return 'idle'; return 'unknown'; }
function normalizeContentType(value: any) { const token = String(value ?? '').toLowerCase(); if (token.includes('video')) return 'video'; if (token.includes('image')) return 'image'; if (token.includes('quiz') || token.includes('assessment')) return 'quiz'; if (token.includes('reflect')) return 'reflection_prompt'; if (token.includes('activity') || token.includes('interactive')) return 'interactive_activity'; if (token.includes('scenario')) return 'scenario'; if (token.includes('text')) return 'text'; return 'unknown'; }
function inferContentType(activity: string, action: string, outcome: string) { return normalizeContentType(`${activity} ${action} ${outcome}`); }

function formatHierarchyLabel(level: 'unit' | 'lesson' | 'currentLessonActivity', key: string) {
  const normalized = String(key ?? '').trim();
  if (!normalized) return '--';
  if (level === 'unit') {
    const unitMatch = normalized.match(/^M(\d+)$/i);
    if (unitMatch) return `Unit ${unitMatch[1]} (${normalized.toUpperCase()})`;
    return normalized;
  }
  if (level === 'lesson') {
    const lessonMatch = normalized.match(/^M(\d+)E(\d+)$/i);
    if (lessonMatch) return `Unit ${lessonMatch[1]} - Lesson ${lessonMatch[2]} (${normalized.toUpperCase()})`;
    return normalized;
  }
  const activityMatch = normalized.match(/^M(\d+)E(\d+)(?:[-_](.+))?$/i);
  if (activityMatch) {
    const suffix = activityMatch[3] ? ` - ${activityMatch[3]}` : '';
    return `Unit ${activityMatch[1]} - Lesson ${activityMatch[2]}${suffix}`;
  }
  return normalized;
}

function deriveMockContentRows(rows: any[]) {
  const map = new Map<string, { access: number; dwell: number }>();
  rows.forEach((row: any) => {
    const key = row.contentType ?? 'unknown';
    const current = map.get(key) ?? { access: 0, dwell: 0 };
    current.access += 1;
    current.dwell += row.engagementLevel === 'high' ? 180 : row.engagementLevel === 'moderate' ? 120 : 80;
    map.set(key, current);
  });
  return [...map.entries()].map(([content_type, data]) => ({
    content_type,
    adaptive_tag: 'derived',
    access_count: data.access,
    avg_dwell_time_sec: data.access ? data.dwell / data.access : 0,
    max_dwell_time_sec: data.access ? (data.dwell / data.access) * 1.5 : 0,
  }));
}

function deriveMockLatency(rows: any[]) {
  return rows.map((row: any) => ({
    emotional_state: row.stateBefore ?? row.triggerEmotion,
    attempts: row.count,
    avg_latency_sec: row.avgLatencySec ?? 0,
    min_latency_sec: (row.avgLatencySec ?? 0) * 0.6,
    max_latency_sec: (row.avgLatencySec ?? 0) * 1.4,
  }));
}

function deriveMockFrequency(rows: any[]) {
  const map = new Map<string, { count: number; confidence: number }>();
  rows.forEach((row: any) => {
    if (!row.detectedEmotion) return;
    const key = `${row.participantId}|${row.unit}|${row.detectedEmotion}`;
    const current = map.get(key) ?? { count: 0, confidence: 0 };
    current.count += 1;
    current.confidence += row.confidence ?? 0;
    map.set(key, current);
  });
  return [...map.entries()].map(([key, value]) => {
    const [participant_id, module_id, classified_state] = key.split('|');
    return {
      participant_id,
      cohort: 'experimental',
      module_id,
      classified_state,
      freq: value.count,
      avg_confidence: value.count ? value.confidence / value.count : 0,
    };
  });
}

function buildParticipantAggregates(gains: any[], engagement: any[], heatmap: any[], responseTypeMap: Map<string, string>, details: any[]) {
  const ids = unique([...gains.map((r) => r.participantId), ...engagement.map((r) => r.participantId), ...heatmap.map((r) => r.participantId)]);
  const detailMap = new Map(details.map((d) => [String(d.participantId), d]));
  return ids.map((participantId) => {
    const g = gains.find((r) => r.participantId === participantId);
    const e = engagement.find((r) => r.participantId === participantId);
    const t = heatmap.filter((r) => r.participantId === participantId);
    const emotionRows = t.filter((row) => row.sourceType !== 'adaptive_event');
    const counts: Record<CanonicalEmotionState, number> = {
      high_engagement: 0,
      frustration: 0,
      confusion: 0,
      boredom_disengagement: 0,
      test_anxiety: 0,
      neutral: 0,
      no_face_low_confidence: 0,
    };
    let confSum = 0;
    let confN = 0;
    const interventions = t.filter((row) => row.isInterventionEvent).length;

    emotionRows.forEach((row) => {
      const detectedEmotion = row.detectedEmotion as CanonicalEmotionState | null;
      if (detectedEmotion && detectedEmotion in counts) counts[detectedEmotion] += 1;
      if (row.confidence !== null) { confSum += row.confidence; confN += 1; }
    });

    const dominantEmotion = EMOTIONS.map((state) => ({ state, count: counts[state] })).sort((a, b) => b.count - a.count)[0];
    const d = detailMap.get(participantId);

    return {
      participantId,
      cohort: g?.cohort ?? e?.cohort ?? 'unknown',
      responseType: responseTypeMap.get(participantId) ?? 'unclassified',
      preScore: g?.preScore ?? null,
      postScore: g?.postScore ?? null,
      gain: g?.gain ?? null,
      totalSessions: e?.totalSessions ?? d?.sessions?.length ?? 0,
      completedSessions: e?.completedSessions ?? d?.sessions?.filter((s: any) => s.isComplete).length ?? 0,
      avgCompletionPct: e?.avgCompletionPct ?? avg((d?.analytics?.sessionAnalytics ?? []).map((s: any) => num(s.completionPct))),
      avgDurationMin: e?.avgDurationMin ?? avg((d?.analytics?.sessionAnalytics ?? []).map((s: any) => num(s.durationMin))),
      totalHints: e?.totalHints ?? 0,
      avgQuizScore: d?.analytics?.averageQuizScore ?? null,
      quizPassRate: d?.analytics?.quizPassRate ?? null,
      dominantEmotion: dominantEmotion?.count ? dominantEmotion.state : null,
      avgEmotionConfidence: confN ? confSum / confN : 0,
      emotionCounts: counts,
      interventionCount: interventions,
      totalEvents: emotionRows.length,
      totalTimelineRows: t.length,
      avgAttempts: avg((d?.analytics?.sessionAnalytics ?? []).map((s: any) => num(s.quizAttemptCount))),
    };
  });
}

function summarizeEmotions(rows: any[]) {
  const emotionRows = rows.filter((row) => row.sourceType !== 'adaptive_event');
  const summary = EMOTIONS.map((state) => {
    const scoped = emotionRows.filter((row) => row.detectedEmotion === state);
    return { state, count: scoped.length, share: emotionRows.length ? Math.round((scoped.length / emotionRows.length) * 100) : 0 };
  }).sort((a, b) => b.count - a.count);

  const confidenceRows = emotionRows.filter((row) => row.confidence !== null && row.confidence !== undefined);
  const avgConfidencePct = confidenceRows.length
    ? Math.round(avg(confidenceRows.map((row) => Number(row.confidence) * 100)))
    : 0;
  const adaptiveCoveragePct = emotionRows.length
    ? Math.round((emotionRows.filter((row) => row.isInterventionEvent).length / emotionRows.length) * 100)
    : 0;
  return {
    rows: summary,
    avgConfidencePct,
    adaptiveCoveragePct,
    emotionRows: emotionRows.length,
    totalTimelineRows: rows.length,
    interventionRows: rows.filter((row) => row.isInterventionEvent).length,
  };
}

function computePrePost(rows: any[], meta?: any) {
  const matched = rows.filter((row) => Number.isFinite(row.preScore) && Number.isFinite(row.postScore));
  const exp = matched.filter((row) => row.cohort === 'experimental');
  const ctl = matched.filter((row) => row.cohort === 'control');
  const defaultComputed = {
    matchedCount: matched.length,
    preMean: avg(matched.map((row) => row.preScore ?? 0)),
    postMean: avg(matched.map((row) => row.postScore ?? 0)),
    gainMean: avg(matched.map((row) => row.gain ?? 0)),
    exp: { count: exp.length, gainMean: avg(exp.map((row) => row.gain ?? 0)) },
    ctl: { count: ctl.length, gainMean: avg(ctl.map((row) => row.gain ?? 0)) },
    rows: matched,
  };

  const hasLocalFilter = rows.length !== Number(meta?.matchedLearners ?? rows.length);
  if (hasLocalFilter || !meta) return defaultComputed;

  return {
    matchedCount: Number(meta.matchedLearners ?? defaultComputed.matchedCount),
    preMean: Number(meta.preMean ?? defaultComputed.preMean),
    postMean: Number(meta.postMean ?? defaultComputed.postMean),
    gainMean: Number(meta.gainMean ?? defaultComputed.gainMean),
    exp: {
      count: Number(meta.groups?.experimental?.count ?? defaultComputed.exp.count),
      gainMean: Number(meta.groups?.experimental?.gainMean ?? defaultComputed.exp.gainMean),
    },
    ctl: {
      count: Number(meta.groups?.control?.count ?? defaultComputed.ctl.count),
      gainMean: Number(meta.groups?.control?.gainMean ?? defaultComputed.ctl.gainMean),
    },
    rows: matched,
  };
}

function summarizeInterventions(effectRows: any[], heatmapRows: any[]) {
  const total = effectRows.reduce((sum, row) => sum + row.count, 0);
  const evaluatedTotal = effectRows.reduce((sum, row) => sum + Number(row.evaluatedCount ?? row.count ?? 0), 0);
  const weightedEffectiveness = evaluatedTotal
    ? effectRows.reduce(
        (sum, row) => sum + (row.effectivenessPct ?? 0) * Number(row.evaluatedCount ?? row.count ?? 0),
        0,
      ) / evaluatedTotal
    : 0;
  const avgLatencySec = total ? effectRows.reduce((sum, row) => sum + (row.avgLatencySec ?? 0) * row.count, 0) / total : 0;
  const timelineInterventions = heatmapRows.filter((row) => row.isInterventionEvent).length;

  const matrixColumns = unique(effectRows.map((row) => row.intervention));
  const matrixRows = EMOTIONS.map((emotion) => {
    const counts: Record<string, number> = {};
    matrixColumns.forEach((col) => { counts[col] = 0; });
    effectRows.filter((row) => row.triggerEmotion === emotion || row.stateBefore === emotion).forEach((row) => { counts[row.intervention] += row.count; });
    return { emotion, counts };
  });

  const positiveOutcomeCount = heatmapRows
    .filter((row) => row.isInterventionEvent)
    .filter((row) => ['continue', 'unlock', 'improv', 'resolved', 'focus', 'supportive'].some((token) => String(row.postActionOutcome).toLowerCase().includes(token)))
    .length;
  const returnToHighEngagementCount = effectRows.filter((row) => row.stateAfter === 'high_engagement').reduce((sum, row) => sum + row.count, 0);
  const byIntervention = [...effectRows]
    .reduce((map, row) => {
      const key = String(row.intervention ?? 'none');
      const current = map.get(key) ?? { intervention: key, count: 0, evaluated: 0, effectivenessWeighted: 0, avgLatencyWeighted: 0 };
      current.count += row.count;
      current.evaluated += Number(row.evaluatedCount ?? row.count ?? 0);
      current.effectivenessWeighted += (row.effectivenessPct ?? 0) * Number(row.evaluatedCount ?? row.count ?? 0);
      current.avgLatencyWeighted += (row.avgLatencySec ?? 0) * row.count;
      map.set(key, current);
      return map;
    }, new Map<string, any>());
  const interventionRows = [...byIntervention.values()]
    .map((row) => ({
      intervention: row.intervention,
      count: row.count,
      evaluated: row.evaluated,
      effectivenessPct: row.evaluated ? row.effectivenessWeighted / row.evaluated : null,
      avgLatencySec: row.count ? row.avgLatencyWeighted / row.count : null,
    }))
    .sort((a, b) => b.count - a.count);
  const bestIntervention = [...interventionRows]
    .filter((row) => row.effectivenessPct !== null)
    .sort((a, b) => Number(b.effectivenessPct ?? 0) - Number(a.effectivenessPct ?? 0))[0] ?? null;
  const leastIntervention = [...interventionRows]
    .filter((row) => row.effectivenessPct !== null)
    .sort((a, b) => Number(a.effectivenessPct ?? 0) - Number(b.effectivenessPct ?? 0))[0] ?? null;
  const triggerSummary = EMOTIONS.map((emotion) => {
    const scoped = effectRows.filter((row) => row.triggerEmotion === emotion || row.stateBefore === emotion);
    const count = scoped.reduce((sum, row) => sum + row.count, 0);
    const evaluated = scoped.reduce((sum, row) => sum + Number(row.evaluatedCount ?? row.count ?? 0), 0);
    const effectivenessPct = evaluated
      ? scoped.reduce((sum, row) => sum + (row.effectivenessPct ?? 0) * Number(row.evaluatedCount ?? row.count ?? 0), 0) / evaluated
      : null;
    return { triggerEmotion: emotion, count, evaluated, effectivenessPct };
  })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    rows: [...effectRows].sort((a, b) => b.count - a.count),
    totalEvents: total,
    evaluatedEvents: evaluatedTotal,
    totalPatterns: effectRows.length,
    weightedEffectiveness,
    avgLatencySec,
    timelineInterventions,
    matrixColumns,
    matrixRows,
    positiveOutcomeRate: timelineInterventions ? Math.round((positiveOutcomeCount / timelineInterventions) * 100) : 0,
    returnToFocusRate: total ? Math.round((returnToHighEngagementCount / total) * 100) : 0,
    interventionRows,
    triggerSummary,
    bestIntervention,
    leastIntervention,
  };
}

function summarizeEmotionPerformance(aggregates: any[]) {
  const rows = EMOTIONS.map((emotion) => {
    const scoped = aggregates.filter((row) => row.dominantEmotion === emotion);
    return {
      emotion,
      participants: scoped.length,
      completionMean: avg(scoped.map((row) => row.avgCompletionPct)),
      gainMean: avg(scoped.map((row) => row.gain ?? 0)),
      quizScoreMean: scoped.length ? avg(scoped.map((row) => row.avgQuizScore ?? 0)) : null,
      avgAttempts: avg(scoped.map((row) => row.avgAttempts ?? 0)),
    };
  }).filter((row) => row.participants > 0);

  const participantRows = aggregates.map((row) => ({
    participantId: row.participantId,
    completionPct: row.avgCompletionPct,
    gain: row.gain ?? 0,
    highEngagementRatio: row.totalEvents ? row.emotionCounts.high_engagement / row.totalEvents : 0,
    frustrationConfusionRatio: row.totalEvents ? (row.emotionCounts.frustration + row.emotionCounts.confusion) / row.totalEvents : 0,
    noFaceFallbackRatio: row.totalEvents ? row.emotionCounts.no_face_low_confidence / row.totalEvents : 0,
    confidence: row.avgEmotionConfidence ?? 0,
    durationMin: row.avgDurationMin ?? 0,
  }));

  const highEngagementVsCompletionCorrelation = computePearsonCorrelation(
    participantRows.map((row) => row.highEngagementRatio),
    participantRows.map((row) => row.completionPct / 100),
  );
  const struggleVsGainCorrelation = computePearsonCorrelation(
    participantRows.map((row) => row.frustrationConfusionRatio),
    participantRows.map((row) => row.gain),
  );

  return {
    rows,
    participantRows,
    correlation: {
      highEngagementVsCompletion: highEngagementVsCompletionCorrelation,
      struggleVsGain: struggleVsGainCorrelation,
    },
  };
}

function summarizeContentTypes(heatmapRows: any[], contentRows: any[], aggregates: any[]) {
  const analysisRows = heatmapRows.filter((row) => row.sourceType !== 'adaptive_event');
  const rows = CONTENT_TYPES.map((contentType) => {
    const events = analysisRows.filter((row) => row.contentType === contentType);
    const pids = unique(events.map((row) => row.participantId));
    const scoped = aggregates.filter((row) => pids.includes(row.participantId));
    const dominantEmotion = summarizeEmotions(events).rows[0]?.state ?? null;
    const interventionCount = events.filter((row) => row.isInterventionEvent).length;
    const dwellRows = contentRows.filter((row) => row.contentType === contentType);
    const avgTimeSpentSec = dwellRows.length ? avg(dwellRows.map((row) => row.avgDwellTimeSec)) : 0;
    const lowEngagementCount = events.filter((row) => row.engagementLevel === 'low' || row.engagementLevel === 'idle').length;
    return {
      contentType,
      events: events.length,
      participants: pids.length,
      dominantEmotion,
      interventionCount,
      interventionRate: events.length ? (interventionCount / events.length) * 100 : 0,
      completionMean: avg(scoped.map((row) => row.avgCompletionPct)),
      gainMean: avg(scoped.map((row) => row.gain ?? 0)),
      avgTimeSpentSec,
      lowEngagementShare: events.length ? (lowEngagementCount / events.length) * 100 : 0,
      participationBurden: events.length ? lowEngagementCount + interventionCount : 0,
      noFaceFallbackShare: events.length ? (events.filter((row) => row.detectedEmotion === 'no_face_low_confidence').length / events.length) * 100 : 0,
    };
  }).filter((row) => row.events > 0 || row.avgTimeSpentSec > 0);

  const mostNoFaceFallback = [...rows].sort((a, b) => b.noFaceFallbackShare - a.noFaceFallbackShare)[0] ?? null;
  const mostHighEngagementSupportive = [...rows].sort((a, b) => {
    const af = a.dominantEmotion === 'high_engagement' ? 1 : 0;
    const bf = b.dominantEmotion === 'high_engagement' ? 1 : 0;
    if (af !== bf) return bf - af;
    return b.completionMean - a.completionMean;
  })[0] ?? null;
  return { rows, mostNoFaceFallback, mostHighEngagementSupportive };
}

function summarizeHierarchy(heatmapRows: any[], aggregates: any[]) {
  const analysisRows = heatmapRows.filter((row) => row.sourceType !== 'adaptive_event');
  const build = (field: 'unit' | 'lesson' | 'currentLessonActivity') => {
    const groups = new Map<string, any[]>();
    analysisRows.forEach((row) => {
      const key = field === 'currentLessonActivity' ? row.currentLessonActivity : row[field];
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    });

    return [...groups.entries()].map(([key, rows]) => {
      const pids = unique(rows.map((row) => row.participantId));
      const scoped = aggregates.filter((row) => pids.includes(row.participantId));
      const dominantEmotion = summarizeEmotions(rows).rows[0]?.state ?? null;
      const interventions = rows.filter((row) => row.isInterventionEvent).length;
      const lowEngagementRate = rows.length ? (rows.filter((row) => row.engagementLevel === 'low' || row.engagementLevel === 'idle').length / rows.length) * 100 : 0;
      const highEngagementRate = rows.length ? (rows.filter((row) => row.detectedEmotion === 'high_engagement').length / rows.length) * 100 : 0;
      return {
        key,
        label: formatHierarchyLabel(field, key),
        events: rows.length,
        participants: pids.length,
        dominantEmotion,
        interventions,
        completionMean: avg(scoped.map((row) => row.avgCompletionPct)),
        lowEngagementRate,
        dropOffRisk: Math.min(100, lowEngagementRate + (interventions / Math.max(rows.length, 1)) * 40),
        successScore: Math.min(100, highEngagementRate * 0.6 + avg(scoped.map((row) => row.avgCompletionPct)) * 0.4),
      };
    }).sort((a, b) => b.events - a.events);
  };

  const activityRows = build('currentLessonActivity');
  return {
    unitRows: build('unit'),
    lessonRows: build('lesson'),
    activityRows,
    problemRows: [...activityRows].sort((a, b) => b.dropOffRisk - a.dropOffRisk).slice(0, 5),
    successRows: [...activityRows].sort((a, b) => b.successScore - a.successScore).slice(0, 5),
  };
}

function summarizeGroups(
  aggregates: any[],
  heatmapRows: any[],
  translate: (key: string, fallback?: string, params?: Record<string, any>) => string,
) {
  const analysisRows = heatmapRows.filter((row) => row.sourceType !== 'adaptive_event');
  const build = (cohort: 'experimental' | 'control') => {
    const scoped = aggregates.filter((row) => row.cohort === cohort);
    const pids = unique(scoped.map((row) => row.participantId));
    const timeline = analysisRows.filter((row) => pids.includes(row.participantId));
    const dominantEmotion = summarizeEmotions(timeline).rows[0]?.state ?? null;
    const interventions = timeline.filter((row) => row.isInterventionEvent).length;
    return {
      participants: scoped.length,
      completionMean: avg(scoped.map((row) => row.avgCompletionPct)),
      gainMean: avg(scoped.map((row) => row.gain ?? 0)),
      durationMean: avg(scoped.map((row) => row.avgDurationMin)),
      interventionsPerLearner: scoped.length ? interventions / scoped.length : 0,
      dominantEmotion,
    };
  };

  const experimental = build('experimental');
  const control = build('control');
  return {
    experimental,
    control,
    tableRows: [
      { metric: translate('research.dashboard.ui.metricParticipants', 'Participants'), experimental: experimental.participants, control: control.participants, delta: experimental.participants - control.participants },
      { metric: translate('research.dashboard.ui.metricGainMean', 'Gain mean'), experimental: fmt(experimental.gainMean, 2), control: fmt(control.gainMean, 2), delta: fmt(experimental.gainMean - control.gainMean, 2) },
      { metric: translate('research.dashboard.ui.metricCompletionMean', 'Completion mean'), experimental: `${Math.round(experimental.completionMean)}%`, control: `${Math.round(control.completionMean)}%`, delta: fmt(experimental.completionMean - control.completionMean, 1) },
      { metric: translate('research.dashboard.ui.metricDurationMean', 'Duration mean'), experimental: `${experimental.durationMean.toFixed(1)} ${translate('research.dashboard.ui.minShort', 'min')}`, control: `${control.durationMean.toFixed(1)} ${translate('research.dashboard.ui.minShort', 'min')}`, delta: fmt(experimental.durationMean - control.durationMean, 1) },
      { metric: translate('research.dashboard.ui.metricInterventionsPerLearner', 'Interventions per learner'), experimental: experimental.interventionsPerLearner.toFixed(1), control: control.interventionsPerLearner.toFixed(1), delta: fmt(experimental.interventionsPerLearner - control.interventionsPerLearner, 1) },
      { metric: translate('research.dashboard.ui.metricDominantEmotion', 'Dominant emotion'), experimental: experimental.dominantEmotion ? emotionDisplayName(experimental.dominantEmotion) : '--', control: control.dominantEmotion ? emotionDisplayName(control.dominantEmotion) : '--', delta: '--' },
    ],
    notes: [
      experimental.participants < 3 || control.participants < 3
        ? translate('research.dashboard.ui.noteLowSample', 'Low sample size detected for one cohort.')
        : '',
      experimental.participants === 0 || control.participants === 0
        ? translate('research.dashboard.ui.noteEmptyCohort', 'One cohort has no learners in current filter scope.')
        : '',
    ].filter(Boolean),
  };
}

function summarizeResponseTypes(
  aggregates: any[],
  heatmapRows: any[],
  translate: (key: string, fallback?: string, params?: Record<string, any>) => string,
) {
  const analysisRows = heatmapRows.filter((row) => row.sourceType !== 'adaptive_event');
  const grouped = new Map<string, any[]>();
  aggregates.forEach((row) => {
    const key = row.responseType || 'unclassified';
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  });

  const rows = [...grouped.entries()].map(([responseType, scoped]) => {
    const pids = unique(scoped.map((row) => row.participantId));
    const timeline = analysisRows.filter((row) => pids.includes(row.participantId));
    const dominantEmotion = summarizeEmotions(timeline).rows[0]?.state ?? null;
    const interventions = timeline.filter((row) => row.isInterventionEvent).length;
    const contentSensitivity = summarizeContentTypes(timeline, [], scoped).rows.sort((a: any, b: any) => (b.noFaceFallbackShare + b.interventionCount) - (a.noFaceFallbackShare + a.interventionCount))[0]?.contentType ?? 'unknown';

    return {
      responseType,
      learners: scoped.length,
      completionMean: avg(scoped.map((row) => row.avgCompletionPct)),
      gainMean: avg(scoped.map((row) => row.gain ?? 0)),
      dominantEmotion,
      interventionsPerLearner: scoped.length ? interventions / scoped.length : 0,
      sensitiveContentType: contentSensitivity,
    };
  }).sort((a, b) => b.learners - a.learners);

  return {
    rows,
    insights: rows.length
      ? [{
        title: translate('research.dashboard.ui.responseInsightTitle', 'Highest completion response type'),
        description: translate(
          'research.dashboard.ui.responseInsightBody',
          '{type} shows the highest completion mean.',
          { type: formatLabel([...rows].sort((a, b) => b.completionMean - a.completionMean)[0].responseType) },
        ),
      }]
      : [],
  };
}

function buildValidation(input: any, translate: (key: string, fallback?: string, params?: Record<string, any>) => string) {
  const checks = [];
  checks.push({
    id: 'timeline-rows',
    label: translate('research.dashboard.ui.validationTimelineRows', 'Timeline integrity'),
    severity: input.timelineRows >= input.emotionEvents ? 'ok' : 'warn',
    message: translate(
      'research.dashboard.ui.validationTimelineRowsValue',
      'Timeline rows: {timeline}. Emotion rows: {emotion}.',
      { timeline: input.timelineRows ?? 0, emotion: input.emotionEvents ?? 0 },
    ),
  });
  checks.push({
    id: 'participants',
    label: translate('research.dashboard.ui.validationParticipants', 'Participant population'),
    severity: input.participants > 0 ? 'ok' : 'warn',
    message: input.participants > 0
      ? translate('research.dashboard.ui.validationParticipantsOk', '{count} participants available.', { count: input.participants })
      : translate('research.dashboard.ui.validationParticipantsWarn', 'No participants for current filters.'),
  });
  checks.push({
    id: 'confidence',
    label: translate('research.dashboard.ui.validationConfidence', 'Emotion confidence validity'),
    severity: input.emotionEvents > 0 && input.avgConfidence === 0 ? 'error' : 'ok',
    message: input.emotionEvents > 0 && input.avgConfidence === 0
      ? translate('research.dashboard.ui.validationConfidenceError', 'Emotion events exist but average confidence is 0%.')
      : translate('research.dashboard.ui.validationConfidenceOk', 'Average confidence is {value}%.', { value: input.avgConfidence }),
  });
  checks.push({
    id: 'coverage',
    label: translate('research.dashboard.ui.validationCoverage', 'Adaptive coverage coherence'),
    severity: input.adaptiveEvents === 0 && input.adaptiveCoverage > 0 ? 'error' : 'ok',
    message: input.adaptiveEvents === 0 && input.adaptiveCoverage > 0
      ? translate('research.dashboard.ui.validationCoverageError', 'Coverage is non-zero while adaptive events are zero.')
      : translate('research.dashboard.ui.validationCoverageOk', '{count} adaptive events detected.', { count: input.adaptiveEvents }),
  });
  checks.push({
    id: 'prepost',
    label: translate('research.dashboard.ui.validationPrepost', 'Matched pre/post availability'),
    severity: input.matchedPrePost > 0 ? 'ok' : 'warn',
    message: input.matchedPrePost > 0
      ? translate('research.dashboard.ui.validationPrepostOk', '{count} matched learners available.', { count: input.matchedPrePost })
      : translate('research.dashboard.ui.validationPrepostWarn', 'No matched pre/post learners yet.'),
  });
  const unclassifiedCount = input.aggregates.filter((row: any) => String(row.responseType ?? 'unclassified') === 'unclassified').length;
  checks.push({
    id: 'response-classification',
    label: translate('research.dashboard.ui.validationResponseCoverage', 'Response-type coverage'),
    severity: input.participants > 0 && unclassifiedCount === input.participants ? 'warn' : 'ok',
    message:
      input.participants > 0 && unclassifiedCount === input.participants
        ? translate('research.dashboard.ui.validationResponseCoverageWarn', 'All learners are still unclassified. Derived response typing needs more behavior history.')
        : translate('research.dashboard.ui.validationResponseCoverageOk', '{count} learners have classified response types.', { count: Math.max(input.participants - unclassifiedCount, 0) }),
  });
  const inconsistent = input.aggregates.filter((row: any) => row.totalSessions === 0 && row.avgCompletionPct > 0);
  checks.push({
    id: 'progress-consistency',
    label: translate('research.dashboard.ui.validationProgressConsistency', 'Session/progress consistency'),
    severity: inconsistent.length ? 'warn' : 'ok',
    message: inconsistent.length
      ? translate('research.dashboard.ui.validationProgressConsistencyWarn', '{count} rows have completion without sessions.', { count: inconsistent.length })
      : translate('research.dashboard.ui.validationProgressConsistencyOk', 'Session and completion metrics are consistent.'),
  });
  const dominant = input.emotionSummaryRows[0]?.share ?? 0;
  checks.push({
    id: 'dominance-balance',
    label: translate('research.dashboard.ui.validationDominance', 'Dominant emotion concentration'),
    severity: dominant === 100 && input.emotionEvents > 10 ? 'warn' : 'ok',
    message: translate('research.dashboard.ui.validationDominanceValue', 'Dominant emotion share is {value}%.', { value: dominant }),
  });
  const freqTotal = input.emotionFrequencyRows.reduce((s: number, r: any) => s + r.count, 0);
  checks.push({
    id: 'cross-source',
    label: translate('research.dashboard.ui.validationCrossSource', 'Cross-source emotion availability'),
    severity: freqTotal > 0 ? 'ok' : 'warn',
    message: freqTotal > 0
      ? translate('research.dashboard.ui.validationCrossSourceOk', 'Emotion-frequency source active ({count} rows).', { count: freqTotal })
      : translate('research.dashboard.ui.validationCrossSourceWarn', 'Emotion-frequency source currently empty.'),
  });
  return checks;
}

function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }

function downloadCsv(fileName: string, rows: any[]) {
  const headers = unique(rows.flatMap((row) => Object.keys(row)));
  const lines = [headers.join(','), ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

