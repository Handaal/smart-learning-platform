import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Clock3,
  Download,
  Gauge,
  GraduationCap,
  Sparkles,
  TrendingUp,
  UserRoundSearch,
} from 'lucide-react';
import { researchApi } from '@/services/api';
import { useI18n } from '@/i18n';
import EmotionHeatmap from '@/components/research/EmotionHeatmap';
import TimeEngagementGrid from '@/components/research/TimeEngagementGrid';
import { RESEARCH_EMOTION_ORDER, emotionDisplayName } from '@/components/research/emotionPresentation';
import StatCard from '@/components/ui/StatCard';
import SectionTitle from '@/components/ui/SectionTitle';
import styles from './LearnerEvalDashboard.module.css';

const EMOTION_ORDER = RESEARCH_EMOTION_ORDER;

export default function LearnerEvalDashboard() {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [exporting, setExporting] = useState(false);

  const participantQuery = useQuery({
    queryKey: ['participant-eval', participantId],
    queryFn: () => researchApi.participantSummary(participantId!),
    enabled: Boolean(participantId),
  });

  const timelineQuery = useQuery({
    queryKey: ['participant-eval-timeline', participantId],
    queryFn: () => researchApi.timelineHeatmap(`participantId=${encodeURIComponent(participantId!)}`),
    enabled: Boolean(participantId),
  });

  const participant = ((participantQuery.data as any)?.data ?? null) as any;
  const timelineRows = (((timelineQuery.data as any)?.data ?? []) as any[])
    .filter((row) => !participantId || String(row.participantId ?? '') === participantId);

  const isLoading = participantQuery.isLoading || timelineQuery.isLoading;
  const isError = participantQuery.isError || timelineQuery.isError || (!participant && !participantQuery.isLoading);

  const profile = participant?.learnerProfile ?? {};
  const analytics = participant?.analytics ?? {};
  const assessments = (participant?.assessments ?? []).filter((item: any) => item?.isComplete);
  const moduleProgress = participant?.moduleProgress ?? [];
  const competencyRecords = participant?.competencyRecords ?? [];
  const sessionAnalytics = participant?.analytics?.sessionAnalytics ?? [];
  const adaptiveEvents = participant?.adaptiveEvents ?? [];
  const quizAttempts = participant?.quizAttempts ?? [];
  const latestCompetency = competencyRecords.at(-1) ?? null;

  const preAssessment = assessments.find((item: any) => item.form === 'pre');
  const postAssessment = assessments.find((item: any) => item.form === 'post');
  const prePostGain = preAssessment && postAssessment
    ? toNumber(postAssessment.totalScore) - toNumber(preAssessment.totalScore)
    : null;

  const averageCompletion = sessionAnalytics.length
    ? sessionAnalytics.reduce((sum: number, item: any) => sum + toNumber(item.completionPct), 0) / sessionAnalytics.length
    : 0;
  const averageQuizScore = analytics.averageQuizScore ?? null;
  const adaptiveEffectiveness = analytics.adaptiveEffectivenessPct ?? null;
  const dominantEmotion = analytics.dominantEmotion ?? summarizeTimelineEmotions(timelineRows).summary[0]?.state ?? null;
  const responseType = profile.responseType ?? analytics.derivedResponseType ?? 'unclassified';

  const competencyBars = latestCompetency
    ? [
        { label: t('learner.dashboard.competencies.scoping', 'Scoping'), value: latestCompetency.c1 },
        { label: t('learner.dashboard.competencies.planning', 'Planning'), value: latestCompetency.c2 },
        { label: t('learner.dashboard.competencies.communication', 'Communication'), value: latestCompetency.c3 },
        { label: t('learner.dashboard.competencies.risk', 'Risk'), value: latestCompetency.c4 },
        { label: t('learner.dashboard.competencies.decisions', 'Decisions'), value: latestCompetency.c5 },
      ]
    : [];

  const recentTimeline = [...timelineRows]
    .sort((left, right) => new Date(String(left.timestamp)).getTime() - new Date(String(right.timestamp)).getTime())
    .slice(-12);

  const heatmapModel = useMemo(() => {
    const labels = recentTimeline.map((row, index) => shortTimeLabel(row.timestamp, index));
    const intensityMap = Object.fromEntries(
      EMOTION_ORDER.map((state) => [
        state,
        recentTimeline.map((row) => {
          if (String(row.detectedEmotion ?? '') !== state) return 0.01;
          return emotionIntensity(row);
        }),
      ]),
    );

    return { labels, intensityMap };
  }, [recentTimeline]);

  const engagementGrid = useMemo(() => {
    const levels = [
      { label: t('research.participantDetail.engagementLevels.high', 'High'), emoji: '😊' },
      { label: t('research.participantDetail.engagementLevels.moderate', 'Moderate'), emoji: '🙂' },
      { label: t('research.participantDetail.engagementLevels.low', 'Low'), emoji: '😐' },
      { label: t('research.participantDetail.engagementLevels.idle', 'Idle'), emoji: '😔' },
    ];

    const data = levels.map(() => recentTimeline.map(() => 0.06));
    recentTimeline.forEach((row, index) => {
      const engagement = String(row.engagementLevel ?? '').toLowerCase();
      if (engagement === 'high') data[0][index] = 0.95;
      else if (engagement === 'moderate') data[1][index] = 0.8;
      else if (engagement === 'low') data[2][index] = 0.72;
      else data[3][index] = 0.64;
    });

    return { levels, data };
  }, [recentTimeline, t]);

  const activityFeed = useMemo(() => {
    const feed = [
      ...assessments.map((assessment: any) => ({
        id: `assessment-${assessment.id}`,
        time: assessment.submittedAt,
        label: t('research.participantDetail.sections.performance.assessmentLabel', '{form} assessment', {
          form: formatLabel(assessment.form),
        }),
        detail: t('research.participantEval.scoreSummary', 'Score {score}', {
          score: formatDecimal(toNumber(assessment.totalScore), 1),
        }),
        status: 'score',
      })),
      ...adaptiveEvents.map((event: any) => ({
        id: `adaptive-${event.id}`,
        time: event.createdAt ?? event.timestamp,
        label: formatLabel(event.intervention ?? 'adaptive_event'),
        detail: event.wasEffective
          ? t('research.participantEval.adaptiveEffective', 'Adaptive intervention supported recovery.')
          : t('research.participantEval.adaptiveRecorded', 'Adaptive intervention recorded.'),
        status: event.wasEffective ? 'success' : 'info',
      })),
      ...recentTimeline.map((row: any, index: number) => ({
        id: `timeline-${index}-${row.timestamp}`,
        time: row.timestamp,
        label: row.currentLessonActivity ?? t('layout.pageMeta.sessionTitle', 'Learning activity'),
        detail: `${emotionDisplayName(row.detectedEmotion ?? row.rawEmotion, true, t)} · ${formatLabel(row.engagementLevel ?? 'moderate')}`,
        status: row.triggeredAdaptiveAction && row.triggeredAdaptiveAction !== 'none' ? 'adaptive' : 'info',
      })),
    ];

    return feed
      .filter((item) => item.time)
      .sort((left, right) => new Date(String(right.time)).getTime() - new Date(String(left.time)).getTime())
      .slice(0, 8);
  }, [adaptiveEvents, assessments, recentTimeline, t]);

  async function handleParticipantExport() {
    if (!participantId) return;
    setExporting(true);
    try {
      await researchApi.exportTimelineHeatmap(`participantId=${encodeURIComponent(participantId)}`);
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) {
    return (
      <div className={styles.statePage}>
        <div className="loading-panel">
          <strong>{t('common.loading', 'Loading')}</strong>
          <span>{t('research.participantEval.loadingSubtitle', 'Preparing learner evaluation details and timeline signals.')}</span>
        </div>
      </div>
    );
  }

  if (isError || !participant) {
    return (
      <div className={styles.statePage}>
        <div className="empty-panel">
          <strong>{t('research.participant.unavailableTitle', 'Participant details unavailable')}</strong>
          <span>{t('research.participant.unavailableSubtitle', 'The participant summary or timeline could not be loaded right now.')}</span>
          <button className="btn btn-secondary" onClick={() => navigate('/research-admin/reports')} type="button">
            <ArrowLeft size={14} />
            {t('research.participantDetail.backToReports', 'Back to reports')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} type="button">
          <ArrowLeft size={14} />
          {t('research.participantDetail.backToReports', 'Back to reports')}
        </button>

        <div className={styles.topActions}>
          <button className="btn btn-secondary btn-sm" onClick={() => void handleParticipantExport()} disabled={exporting} type="button">
            <Download size={14} />
            {exporting
              ? t('research.participantDetail.exporting', 'Exporting...')
              : t('research.participantDetail.exportTimeline', 'Export participant timeline')}
          </button>
        </div>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <span className={styles.eyebrow}>{t('research.participantDetail.eyebrow', 'Participant Drill-Down')}</span>
          <div className={styles.identityRow}>
            <h1>{participant.participantId}</h1>
            <span className={`badge ${participant.cohort === 'experimental' ? 'badge-teal' : 'badge-muted'}`}>
              {participant.cohort === 'experimental'
                ? t('common.cohort.experimental', 'Experimental')
                : participant.cohort === 'control'
                  ? t('common.cohort.control', 'Control')
                  : formatLabel(participant.cohort)}
            </span>
            <span className="badge badge-soft-blue">{formatLabel(responseType)}</span>
          </div>

          <p className={styles.heroLead}>
            {t(
              'research.participantEval.lead',
              'A presentation-ready learner report that combines performance, canonical adaptive-emotion evidence, adaptive interventions, and progression in one unified view.',
            )}
          </p>

          <div className={styles.metaRow}>
            <span><UserRoundSearch size={14} /> {profile.primaryRole ?? t('research.participantDetail.primaryRole', 'Primary role')}</span>
            <span><Clock3 size={14} /> {sessionAnalytics.length} {t('research.participantDetail.sessions', 'sessions')}</span>
            <span><BookOpen size={14} /> {moduleProgress.filter((item: any) => item.status === 'complete').length}/{moduleProgress.length} {t('research.participantDetail.modulesComplete', 'modules complete')}</span>
          </div>
        </div>

        <aside className={styles.heroAside}>
          <div className={styles.contextCard}>
            <span>{t('research.participantDetail.responseType', 'Response type')}</span>
            <strong>{formatLabel(responseType)}</strong>
          </div>
          <div className={styles.contextCard}>
            <span>{t('research.participantDetail.learningPreference', 'Learning preference')}</span>
            <strong>{formatLabel(profile.learningPref ?? 'no_preference')}</strong>
          </div>
          <div className={styles.contextCard}>
            <span>{t('research.participantDetail.experience', 'Experience')}</span>
            <strong>{profile.yearsExperience ?? '--'} {t('research.participantDetail.years', 'years')}</strong>
          </div>
        </aside>
      </section>

      <section className={styles.kpiGrid}>
        {[
          {
            label: t('research.participantDetail.kpi.avgCompletion', 'Average completion'),
            value: `${Math.round(averageCompletion)}%`,
            icon: Gauge,
            tone: 'teal' as const,
          },
          {
            label: t('research.participantDetail.kpi.prePostGain', 'Pre/Post gain'),
            value: prePostGain === null ? '--' : formatSigned(prePostGain),
            icon: TrendingUp,
            tone: 'success' as const,
          },
          {
            label: t('research.participantDetail.kpi.dominantEmotion', 'Dominant emotion'),
            value: dominantEmotion ? emotionDisplayName(dominantEmotion, true, t) : '--',
            icon: Sparkles,
            tone: 'amber' as const,
          },
          {
            label: t('research.participantDetail.kpi.adaptiveEffectiveness', 'Adaptive effectiveness'),
            value: adaptiveEffectiveness === null ? '--' : `${Math.round(adaptiveEffectiveness)}%`,
            icon: Activity,
            tone: 'blue' as const,
          },
          {
            label: t('research.participantDetail.kpi.quizPassRate', 'Quiz pass rate'),
            value: quizAttempts.length ? `${Math.round((quizAttempts.filter((attempt: any) => attempt.passed).length / quizAttempts.length) * 100)}%` : '--',
            icon: GraduationCap,
            tone: 'success' as const,
          },
          {
            label: t('research.participantDetail.kpi.avgQuizScore', 'Average quiz score'),
            value: averageQuizScore === null ? '--' : `${Math.round(averageQuizScore)}%`,
            icon: BarChart3,
            tone: 'blue' as const,
          },
        ].map(({ label, value, icon: Icon, tone }) => (
          <StatCard key={label} icon={Icon} value={value} label={label} tone={tone} />
        ))}
      </section>

      <section className={styles.evalGrid}>
        <article className={styles.card}>
          <SectionTitle
            icon={TrendingUp}
            title={t('research.participantDetail.sections.performance.title', 'Assessment trajectory')}
            subtitle={t('research.participantEval.performanceLead', 'Assessment outcomes and current competency balance for this learner.')}
            tone="teal"
          />

          {assessments.length ? (
            <div className={styles.assessmentList}>
              {assessments.map((assessment: any) => (
                <div key={assessment.id} className={styles.assessmentCard}>
                  <div className={styles.assessmentHead}>
                    <strong>
                      {t('research.participantDetail.sections.performance.assessmentLabel', '{form} assessment', {
                        form: formatLabel(assessment.form),
                      })}
                    </strong>
                    <span className="badge badge-amber">{formatDecimal(toNumber(assessment.totalScore), 1)}</span>
                  </div>
                  <p>{formatTimestamp(assessment.submittedAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel">
              <strong>{t('research.participantDetail.empty.assessmentTitle', 'No assessment records yet.')}</strong>
              <span>{t('research.participantDetail.empty.assessmentSubtitle', 'Pre, mid, and post performance will appear here once submitted.')}</span>
            </div>
          )}

          {competencyBars.length ? (
            <div className={styles.barStack}>
              {competencyBars.map((bar) => (
                <div key={bar.label} className={styles.barRow}>
                  <span>{bar.label}</span>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${Math.round(toNumber(bar.value) * 100)}%` }} />
                  </div>
                  <strong>{Math.round(toNumber(bar.value) * 100)}%</strong>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <article className={styles.card}>
          <SectionTitle
            icon={Sparkles}
            title={t('research.participantDetail.sections.emotionEngagement.title', 'Emotional trajectory and learning rhythm')}
            subtitle={t('research.participantEval.emotionLead', 'Heatmap and engagement pattern for the latest tracked timeline points.')}
            tone="blue"
          />

          {recentTimeline.length ? (
            <div className={styles.visualStack}>
              <EmotionHeatmap
                title={t('research.participantDetail.sections.emotionEngagement.heatmapTitle', 'Participant emotion heatmap')}
                subtitle={t('research.participantDetail.sections.emotionEngagement.heatmapSubtitle', 'State intensity across the latest tracked session sequence')}
                states={EMOTION_ORDER}
                timeLabels={heatmapModel.labels}
                intensityMap={heatmapModel.intensityMap}
              />
              <TimeEngagementGrid
                title={t('research.participantDetail.sections.emotionEngagement.rhythmTitle', 'Engagement rhythm')}
                timeLabels={heatmapModel.labels}
                levels={engagementGrid.levels}
                data={engagementGrid.data}
              />
            </div>
          ) : (
            <div className="empty-panel">
              <strong>{t('research.participantDetail.empty.timelineTitle', 'No participant timeline rows yet.')}</strong>
              <span>{t('research.participantDetail.empty.timelineSubtitle', 'Timeline details appear after adaptive events are logged during learner sessions.')}</span>
            </div>
          )}
        </article>
      </section>

      <section className={styles.evalGrid}>
        <article className={styles.card}>
          <SectionTitle
            icon={Clock3}
            title={t('research.participantEval.activityTitle', 'Recent learner activity')}
            subtitle={t('research.participantEval.activityLead', 'Most recent assessments, adaptive events, and tracked timeline changes.')}
            tone="amber"
          />

          {activityFeed.length ? (
            <div className={styles.activityList}>
              {activityFeed.map((item) => (
                <div key={item.id} className={styles.activityRow}>
                  <div className={styles.activityMeta}>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <div className={styles.activitySide}>
                    <span className={`badge ${item.status === 'success' ? 'badge-success' : item.status === 'score' ? 'badge-amber' : 'badge-soft-blue'}`}>
                      {item.status === 'score'
                        ? t('research.participantEval.scoreLabel', 'Score')
                        : item.status === 'success'
                          ? t('research.participantEval.successLabel', 'Effective')
                          : t('research.participantEval.recordedLabel', 'Recorded')}
                    </span>
                    <span>{formatTimestamp(item.time)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel">
              <strong>{t('research.participantEval.activityEmptyTitle', 'No recent learner activity yet.')}</strong>
              <span>{t('research.participantEval.activityEmptyBody', 'Recent actions and tracked events will appear here once the learner progresses through sessions.')}</span>
            </div>
          )}
        </article>

        <article className={styles.card}>
          <SectionTitle
            icon={BookOpen}
            title={t('learner.dashboard.moduleSectionTitle', 'Module progress')}
            subtitle={t('research.participantEval.moduleLead', 'Unit-by-unit progression and unlock state for the selected learner.')}
            tone="teal"
          />

          {moduleProgress.length ? (
            <div className={styles.moduleList}>
              {moduleProgress.map((module: any) => (
                <div key={module.moduleId} className={styles.moduleRow}>
                  <div className={styles.moduleCopy}>
                    <strong>{module.module?.title ?? module.moduleId}</strong>
                    <p>
                      {module.isLocked
                        ? t('learner.modules.buttons.locked', 'Locked')
                        : formatLabel(module.status ?? 'not_started')}
                    </p>
                  </div>
                  <div className={styles.moduleProgress}>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, toNumber(module.progressPct ?? module.completionPct ?? (module.status === 'complete' ? 100 : 0))))}%` }} />
                    </div>
                    <span>{Math.round(toNumber(module.progressPct ?? module.completionPct ?? (module.status === 'complete' ? 100 : 0)))}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel">
              <strong>{t('learner.dashboard.noModules', 'No modules assigned yet.')}</strong>
              <span>{t('research.participantEval.moduleEmptyBody', 'Module progression becomes visible once the learner enters the training sequence.')}</span>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currentLocale() {
  return document.documentElement.lang === 'ar' ? 'ar-SA' : 'en-US';
}

function formatDecimal(value: number, digits = 1) {
  return new Intl.NumberFormat(currentLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatTimestamp(value: unknown) {
  if (!value) return '--';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat(currentLocale(), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function shortTimeLabel(value: unknown, index: number) {
  if (!value) return `T${index + 1}`;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return `T${index + 1}`;
  return new Intl.DateTimeFormat(currentLocale(), { hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatSigned(value: number) {
  return `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatDecimal(Math.abs(value), 1)}`;
}

function formatLabel(value: unknown) {
  return String(value ?? '--').replace(/_/g, ' ');
}

function emotionIntensity(row: any) {
  const confidence = Math.max(0.3, Math.min(1, toNumber(row.confidence)));
  const engagement = String(row.engagementLevel ?? '').toLowerCase();
  const engagementBoost =
    engagement === 'high' ? 0.95 :
    engagement === 'moderate' ? 0.75 :
    engagement === 'low' ? 0.55 :
    0.45;

  return Math.min(1, ((confidence + engagementBoost) / 2));
}

function summarizeTimelineEmotions(rows: any[]) {
  const summaryMap = new Map<string, { state: string; count: number }>();

  rows.forEach((row) => {
    const state = String(row.detectedEmotion ?? '').trim();
    if (!state) return;

    summaryMap.set(state, {
      state,
      count: (summaryMap.get(state)?.count ?? 0) + 1,
    });
  });

  return {
    summary: [...summaryMap.values()].sort((left, right) => right.count - left.count),
  };
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
