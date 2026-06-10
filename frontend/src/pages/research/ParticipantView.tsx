import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  Clock3,
  Download,
  FileText,
  Gauge,
  GraduationCap,
  Layers3,
  Sparkles,
  Target,
  TrendingUp,
  UserRoundSearch,
} from 'lucide-react';
import { researchApi } from '@/services/api';
import { useI18n } from '@/i18n';
import { MOCK_PARTICIPANT_SUMMARY, MOCK_TIMELINE_HEATMAP, USE_MOCK } from '@/services/mockData';
import EmotionHeatmap from '@/components/research/EmotionHeatmap';
import TimeEngagementGrid from '@/components/research/TimeEngagementGrid';
import { RESEARCH_EMOTION_ORDER, emotionDisplayName } from '@/components/research/emotionPresentation';
import styles from './ParticipantView.module.css';

const EMOTION_ORDER = RESEARCH_EMOTION_ORDER;

export default function ParticipantView() {
  const { t } = useI18n();
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const participantQuery = useQuery({
    queryKey: ['participant', participantId],
    queryFn: () => researchApi.participantSummary(participantId!),
    enabled: !!participantId && !USE_MOCK,
  });

  const timelineQuery = useQuery({
    queryKey: ['participant-heatmap', participantId],
    queryFn: () => researchApi.timelineHeatmap(`participantId=${encodeURIComponent(participantId!)}`),
    enabled: !!participantId && !USE_MOCK,
  });

  const participant = USE_MOCK
    ? MOCK_PARTICIPANT_SUMMARY
    : ((participantQuery.data as any)?.data ?? null);

  const timelineRows = USE_MOCK
    ? MOCK_TIMELINE_HEATMAP.filter((row) => row.participantId === participantId || !participantId)
    : (((timelineQuery.data as any)?.data ?? []) as any[]);

  const isLoading = !USE_MOCK && (participantQuery.isLoading || timelineQuery.isLoading);
  const hasError = !USE_MOCK && (participantQuery.error || (!participant && !participantQuery.isLoading));

  const profile = participant?.learnerProfile ?? {};
  const analytics = participant?.analytics ?? {};
  const assessments = participant?.assessments ?? [];
  const moduleProgress = participant?.moduleProgress ?? [];
  const competencyRecords = participant?.competencyRecords ?? [];
  const sessions = participant?.sessions ?? [];
  const sessionAnalytics = analytics.sessionAnalytics ?? [];
  const adaptiveEvents = participant?.adaptiveEvents ?? [];
  const reflectionEntries = participant?.reflectionEntries ?? [];
  const quizAttempts = participant?.quizAttempts ?? [];
  const emotionSummary = analytics.emotionSummary ?? [];
  const emotionTransitions = analytics.emotionTransitions ?? [];
  const timelineEmotionSummary = useMemo(() => summarizeTimelineEmotions(timelineRows), [timelineRows]);
  const resolvedEmotionSummary = emotionSummary.length ? emotionSummary : timelineEmotionSummary.summary;
  const resolvedEmotionTransitions = emotionTransitions.length ? emotionTransitions : timelineEmotionSummary.transitions;

  const latestCompetency = competencyRecords.at(-1) ?? null;
  const competencyBars = latestCompetency
    ? [
        { label: t('research.participantDetail.competency.scoping', 'Scoping'), value: latestCompetency.c1 },
        { label: t('research.participantDetail.competency.planning', 'Planning'), value: latestCompetency.c2 },
        { label: t('research.participantDetail.competency.communication', 'Communication'), value: latestCompetency.c3 },
        { label: t('research.participantDetail.competency.risk', 'Risk'), value: latestCompetency.c4 },
        { label: t('research.participantDetail.competency.decision', 'Decision'), value: latestCompetency.c5 },
      ]
    : [];

  const preAssessment = assessments.find((item: any) => item.form === 'pre' && item.isComplete);
  const postAssessment = assessments.find((item: any) => item.form === 'post' && item.isComplete);
  const prePostGain = preAssessment && postAssessment
    ? toNumber(postAssessment.totalScore) - toNumber(preAssessment.totalScore)
    : null;

  const averageCompletion = sessionAnalytics.length
    ? sessionAnalytics.reduce((sum: number, item: any) => sum + toNumber(item.completionPct), 0) / sessionAnalytics.length
    : 0;
  const completedModules = moduleProgress.filter((item: any) => item.status === 'complete').length;
  const adaptiveEffectiveness = analytics.adaptiveEffectivenessPct ?? null;
  const quizPassRate = analytics.quizPassRate ?? null;
  const averageQuizScore = analytics.averageQuizScore ?? null;
  const totalEmotionEvents = analytics.totalEmotionEvents ?? analytics.consistency?.emotionRows ?? 0;
  const totalAdaptiveEvents = analytics.totalAdaptiveEvents ?? analytics.consistency?.interventionEvents ?? 0;
  const dominantEmotion = analytics.dominantEmotion ?? resolvedEmotionSummary[0]?.state ?? null;

  const recentTimeline = [...timelineRows]
    .sort((left, right) => new Date(String(left.timestamp)).getTime() - new Date(String(right.timestamp)).getTime())
    .slice(-8);

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

  const interventionPatterns = useMemo(() => {
    const map = new Map<string, { intervention: string; count: number; effectiveness: number; latencySum: number }>();
    for (const event of adaptiveEvents) {
      const key = String(event.intervention ?? 'none');
      const current = map.get(key) ?? { intervention: key, count: 0, effectiveness: 0, latencySum: 0 };
      current.count += 1;
      current.effectiveness += event.wasEffective ? 1 : 0;
      current.latencySum += toNumber(event.responseLatencySec);
      map.set(key, current);
    }

    return [...map.values()]
      .map((item) => ({
        ...item,
        effectivenessPct: item.count ? (item.effectiveness / item.count) * 100 : 0,
        averageLatencySec: item.count ? item.latencySum / item.count : 0,
      }))
      .sort((left, right) => right.count - left.count);
  }, [adaptiveEvents]);

  if (isLoading) {
    return <div className={styles.loading}>{t('research.participant.loading')}</div>;
  }

  if (hasError || !participant) {
    return (
      <div className={styles.statePage}>
        <div className={styles.emptyCard}>
          <strong>{t('research.participant.unavailableTitle')}</strong>
          <span>{t('research.participant.unavailableSubtitle')}</span>
          <button className="btn btn-secondary" onClick={() => navigate('/research-admin/reports')} type="button">
            <ArrowLeft size={14} />
            {t('research.participant.backToReports')}
          </button>
        </div>
      </div>
    );
  }

  async function handleParticipantExport() {
    if (!participantId) return;
    setExporting(true);
    try {
      await researchApi.exportTimelineHeatmap(`participantId=${encodeURIComponent(participantId)}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/research-admin/reports')} type="button">
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
            <span className="badge badge-soft-blue">
              {profile.responseType ? formatLabel(profile.responseType) : t('research.participantDetail.responsePending', 'response type pending')}
            </span>
          </div>

          <p className={styles.heroLead}>
            {t(
              'research.participantDetail.lead',
              'Individual learner profile combining progress, canonical adaptive-emotion trajectory, interventions, quiz outcomes, and reflection quality within the smart training environment.',
            )}
          </p>

          <div className={styles.metaRow}>
            <span><Clock3 size={14} /> {t('research.participantDetail.enrolled', 'Enrolled')} {formatDate(participant.createdAt)}</span>
            <span><BookOpen size={14} /> {sessions.length} {t('research.participantDetail.sessions', 'sessions')}</span>
            <span>
              <Layers3 size={14} /> {completedModules}/{moduleProgress.length} {t('research.participantDetail.modulesComplete', 'modules complete')}
            </span>
            <span><BrainCircuit size={14} /> {totalEmotionEvents} {t('research.participantDetail.emotionEvents', 'emotion events')}</span>
          </div>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.panelHead}>
            <div className={styles.inlineHeading}>
              <UserRoundSearch size={16} />
              <strong>{t('research.participantDetail.researchProfile', 'Research profile')}</strong>
            </div>
            <span className="badge badge-muted">{t('research.participantDetail.context', 'Participant context')}</span>
          </div>

          <div className={styles.profileGrid}>
            <div>
              <span>{t('research.participantDetail.responseType', 'Response type')}</span>
              <strong>{profile.responseType ?? t('research.participantDetail.notClassified', 'Not classified')}</strong>
            </div>
            <div>
              <span>{t('research.participantDetail.experience', 'Experience')}</span>
              <strong>
                {profile.yearsExperience ?? '--'} {t('research.participantDetail.years', 'years')}
              </strong>
            </div>
            <div>
              <span>{t('research.participantDetail.primaryRole', 'Primary role')}</span>
              <strong>{profile.primaryRole ?? '--'}</strong>
            </div>
            <div>
              <span>{t('research.participantDetail.learningPreference', 'Learning preference')}</span>
              <strong>{formatLabel(profile.learningPref ?? 'no_preference')}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.kpiGrid}>
        {[
          { label: t('research.participantDetail.kpi.avgCompletion', 'Average completion'), value: `${Math.round(averageCompletion)}%`, icon: Gauge, tone: 'teal' },
          { label: t('research.participantDetail.kpi.prePostGain', 'Pre/Post gain'), value: prePostGain === null ? '--' : formatSigned(prePostGain), icon: TrendingUp, tone: 'success' },
          { label: t('research.participantDetail.kpi.dominantEmotion', 'Dominant emotion'), value: dominantEmotion ? emotionDisplayName(dominantEmotion, true, t) : '--', icon: Sparkles, tone: 'amber' },
          { label: t('research.participantDetail.kpi.adaptiveEffectiveness', 'Adaptive effectiveness'), value: adaptiveEffectiveness === null ? '--' : `${Math.round(adaptiveEffectiveness)}%`, icon: Activity, tone: 'blue' },
          { label: t('research.participantDetail.kpi.quizPassRate', 'Quiz pass rate'), value: quizPassRate === null ? '--' : `${Math.round(quizPassRate)}%`, icon: GraduationCap, tone: 'success' },
          { label: t('research.participantDetail.kpi.avgQuizScore', 'Average quiz score'), value: averageQuizScore === null ? '--' : `${Math.round(averageQuizScore)}%`, icon: Target, tone: 'blue' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className={styles.kpiCard}>
            <div className={`${styles.kpiIcon} ${styles[`tone${capitalize(tone)}`]}`}>
              <Icon size={18} />
            </div>
            <div>
              <div className={styles.kpiValue}>{value}</div>
              <div className={styles.kpiLabel}>{label}</div>
            </div>
          </article>
        ))}
      </section>

      <div className={styles.sectionGrid}>
        <section className={styles.card}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.sectionEyebrow}>{t('research.participantDetail.sections.performance.eyebrow', 'Performance')}</span>
              <h2>{t('research.participantDetail.sections.performance.title', 'Assessment trajectory')}</h2>
            </div>
            <span className="badge badge-soft-blue">
              {assessments.filter((item: any) => item.isComplete).length} {t('research.participantDetail.units.completed', 'completed')}
            </span>
          </div>

          {assessments.some((item: any) => item.isComplete) ? (
            <div className={styles.timelineList}>
              {assessments.filter((item: any) => item.isComplete).map((assessment: any) => (
                <article key={assessment.id} className={styles.timelineCard}>
                  <div className={styles.timelineHead}>
                    <strong>{t('research.participantDetail.sections.performance.assessmentLabel', '{form} assessment', { form: formatLabel(assessment.form) })}</strong>
                    <span className="badge badge-amber">{formatDecimal(toNumber(assessment.totalScore), 1)}</span>
                  </div>
                  <div className={styles.inlineMetrics}>
                    {['scoreS1', 'scoreS2', 'scoreS3', 'scoreS4', 'scoreS5'].map((key, index) => (
                      <span key={key}>{t('research.participantDetail.sections.performance.competencyShort', 'C{index}: {value}', { index: index + 1, value: formatDecimal(toNumber(assessment[key]), 1) })}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <strong>{t('research.participantDetail.empty.assessmentTitle', 'No assessment records yet.')}</strong>
              <span>{t('research.participantDetail.empty.assessmentSubtitle', 'Pre, mid, and post performance will appear here once submitted.')}</span>
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.sectionEyebrow}>{t('research.participantDetail.sections.competency.eyebrow', 'Competency profile')}</span>
              <h2>{t('research.participantDetail.sections.competency.title', 'Current competency balance')}</h2>
            </div>
            <span className="badge badge-muted">{latestCompetency ? formatDate(latestCompetency.recordedAt) : t('research.participantDetail.sections.competency.noRecord', 'No record')}</span>
          </div>

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
          ) : (
            <div className={styles.emptyCard}>
              <strong>{t('research.participantDetail.empty.competencyTitle', 'No competency records yet.')}</strong>
              <span>{t('research.participantDetail.empty.competencySubtitle', 'Competency snapshots will be listed here after assessments or scored tasks.')}</span>
            </div>
          )}
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.panelHead}>
          <div>
            <span className={styles.sectionEyebrow}>{t('research.participantDetail.sections.emotionEngagement.eyebrow', 'Emotion and engagement')}</span>
            <h2>{t('research.participantDetail.sections.emotionEngagement.title', 'Emotional trajectory and learning rhythm')}</h2>
          </div>
          <span className="badge badge-soft-blue">
            {timelineRows.length} {t('research.participantDetail.units.timelinePoints', 'timeline points')}
          </span>
        </div>

        <div className={styles.visualGrid}>
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
      </section>

      <div className={styles.sectionGrid}>
        <section className={styles.card}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.sectionEyebrow}>{t('research.participantDetail.sections.emotionSummary.eyebrow', 'Emotion summary')}</span>
              <h2>{t('research.participantDetail.sections.emotionSummary.title', 'Dominant states and transitions')}</h2>
            </div>
            <span className="badge badge-muted">{resolvedEmotionSummary.length} {t('research.participantDetail.units.states', 'states')}</span>
          </div>

          {resolvedEmotionSummary.length ? (
            <>
              <div className={styles.stateList}>
                {resolvedEmotionSummary.map((item: any) => (
                  <div key={item.state} className={styles.stateRow}>
                    <div className={styles.stateLabel}>
                      <span className={styles.colorDot} style={{ background: emotionColor(item.state) }} />
                      <strong>{emotionDisplayName(item.state, true, t)}</strong>
                    </div>
                    <div className={styles.stateTrack}>
                      <div
                        className={styles.stateFill}
                        style={{
                          width: `${Math.max(10, Math.round((toNumber(item.count) / Math.max(totalEmotionEvents, 1)) * 100))}%`,
                          background: emotionColor(item.state),
                        }}
                      />
                    </div>
                    <span>{toNumber(item.count)} {t('research.participantDetail.units.events', 'events')}</span>
                  </div>
                ))}
              </div>

              <div className={styles.transitionWrap}>
                <strong>{t('research.participantDetail.sections.emotionSummary.topTransitions', 'Top transitions')}</strong>
                <div className={styles.transitionList}>
                  {resolvedEmotionTransitions.length ? resolvedEmotionTransitions.map((item: any) => (
                    <span key={`${item.from}-${item.to}`} className={styles.transitionPill}>
                      {emotionDisplayName(item.from, true, t)} → {emotionDisplayName(item.to, true, t)} · {toNumber(item.count)}
                    </span>
                  )) : (
                    <span className={styles.transitionPill}>{t('research.participantDetail.empty.transitions', 'No transitions captured yet')}</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.emptyCard}>
              <strong>{t('research.participantDetail.empty.emotionSummaryTitle', 'No emotion summary is available yet.')}</strong>
              <span>{t('research.participantDetail.empty.emotionSummarySubtitle', 'Emotion summaries appear once facial emotion events are collected for this participant.')}</span>
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.sectionEyebrow}>{t('research.participantDetail.sections.adaptive.eyebrow', 'Adaptive layer')}</span>
              <h2>{t('research.participantDetail.sections.adaptive.title', 'Intervention pattern summary')}</h2>
            </div>
            <span className="badge badge-amber">{totalAdaptiveEvents} {t('research.participantDetail.units.events', 'events')}</span>
          </div>

          {interventionPatterns.length ? (
            <div className="table-scroll">
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('research.participantDetail.sections.adaptive.table.intervention', 'Intervention')}</th>
                    <th>{t('research.participantDetail.sections.adaptive.table.count', 'Count')}</th>
                    <th>{t('research.participantDetail.sections.adaptive.table.effectiveness', 'Effectiveness')}</th>
                    <th>{t('research.participantDetail.sections.adaptive.table.avgLatency', 'Avg. latency')}</th>
                  </tr>
                </thead>
                <tbody>
                  {interventionPatterns.map((item) => (
                    <tr key={item.intervention}>
                      <td>{formatLabel(item.intervention)}</td>
                      <td>{item.count}</td>
                      <td>{Math.round(item.effectivenessPct)}%</td>
                      <td>{t('research.participantDetail.units.secondsShort', '{value} s', { value: formatDecimal(item.averageLatencySec, 1) })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <strong>{t('research.participantDetail.empty.adaptiveTitle', 'No adaptive interventions recorded.')}</strong>
              <span>{t('research.participantDetail.empty.adaptiveSubtitle', 'This panel becomes active after scenario-based interventions are triggered for the learner.')}</span>
            </div>
          )}
        </section>
      </div>

      <div className={styles.sectionGrid}>
        <section className={styles.card}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.sectionEyebrow}>{t('research.participantDetail.sections.sessionJourney.eyebrow', 'Session journey')}</span>
              <h2>{t('research.participantDetail.sections.sessionJourney.title', 'Session-level drill-down')}</h2>
            </div>
            <span className="badge badge-soft-blue">{sessionAnalytics.length} {t('research.participantDetail.units.sessions', 'sessions')}</span>
          </div>

          {sessionAnalytics.length ? (
            <div className={styles.sessionGrid}>
              {sessionAnalytics.map((session: any) => (
                <article key={session.sessionId} className={styles.sessionCard}>
                  <div className={styles.sessionHead}>
                    <div>
                      <strong>{session.moduleTitle}</strong>
                      <span>{formatDate(session.startedAt)}</span>
                    </div>
                    <span className={`badge ${session.isComplete ? 'badge-success' : 'badge-amber'}`}>
                      {session.isComplete ? t('common.status.complete', 'Complete') : t('common.status.inProgress', 'In progress')}
                    </span>
                  </div>

                  <div className={styles.inlineMetrics}>
                    <span>{t('research.participantDetail.sections.sessionJourney.completion', '{value}% completion', { value: Math.round(toNumber(session.completionPct)) })}</span>
                    <span>{formatDuration(session.durationMin)}</span>
                    <span>{session.dominantEmotion ? emotionDisplayName(session.dominantEmotion, true, t) : t('research.participantDetail.sections.sessionJourney.noDominant', 'No dominant state')}</span>
                  </div>

                  <div className={styles.sessionMetrics}>
                    <div>
                      <span>{t('research.participantDetail.sections.sessionJourney.interventions', 'Interventions')}</span>
                      <strong>{session.interventionCount}</strong>
                    </div>
                    <div>
                      <span>{t('research.participantDetail.sections.sessionJourney.effectiveness', 'Effectiveness')}</span>
                      <strong>{session.effectiveInterventionRate === null ? '--' : `${Math.round(toNumber(session.effectiveInterventionRate))}%`}</strong>
                    </div>
                    <div>
                      <span>{t('research.participantDetail.sections.sessionJourney.quizScore', 'Quiz score')}</span>
                      <strong>{session.averageQuizScore === null ? '--' : `${Math.round(toNumber(session.averageQuizScore))}%`}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <strong>{t('research.participantDetail.empty.sessionTitle', 'No session data yet.')}</strong>
              <span>{t('research.participantDetail.empty.sessionSubtitle', 'Session analytics will appear here as the learner progresses through the environment.')}</span>
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.sectionEyebrow}>{t('research.participantDetail.sections.timeline.eyebrow', 'Recent event timeline')}</span>
              <h2>{t('research.participantDetail.sections.timeline.title', 'Emotion, engagement, and adaptive action')}</h2>
            </div>
            <span className="badge badge-muted">{recentTimeline.length} {t('research.participantDetail.units.recentRows', 'recent rows')}</span>
          </div>

          {recentTimeline.length ? (
            <div className="table-scroll">
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('research.participantDetail.sections.timeline.table.time', 'Time')}</th>
                    <th>{t('research.participantDetail.sections.timeline.table.emotion', 'Emotion')}</th>
                    <th>{t('research.participantDetail.sections.timeline.table.engagement', 'Engagement')}</th>
                    <th>{t('research.participantDetail.sections.timeline.table.lessonActivity', 'Lesson/activity')}</th>
                    <th>{t('research.participantDetail.sections.timeline.table.action', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...recentTimeline].reverse().map((row, index) => (
                    <tr key={`${row.timestamp}-${index}`}>
                      <td>{formatTimestamp(row.timestamp)}</td>
                      <td>{row.detectedEmotion ? emotionDisplayName(row.detectedEmotion, true, t) : '--'}</td>
                      <td>{formatLabel(row.engagementLevel ?? '--')}</td>
                      <td>{row.currentLessonActivity ?? '--'}</td>
                      <td>{formatLabel(row.triggeredAdaptiveAction ?? 'none')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <strong>{t('research.participantDetail.empty.timelineTitle', 'No participant timeline rows yet.')}</strong>
              <span>{t('research.participantDetail.empty.timelineSubtitle', 'Timeline details appear after adaptive events are logged during learner sessions.')}</span>
            </div>
          )}
        </section>
      </div>

      <div className={styles.sectionGrid}>
        <section className={styles.card}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.sectionEyebrow}>{t('research.participantDetail.sections.quiz.eyebrow', 'Quiz performance')}</span>
              <h2>{t('research.participantDetail.sections.quiz.title', 'Lesson-level quiz attempts')}</h2>
            </div>
            <span className="badge badge-soft-blue">{quizAttempts.length} {t('research.participantDetail.units.attempts', 'attempts')}</span>
          </div>

          {quizAttempts.length ? (
            <div className="table-scroll">
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('research.participantDetail.sections.quiz.table.quiz', 'Quiz')}</th>
                    <th>{t('research.participantDetail.sections.quiz.table.moduleLesson', 'Module / lesson')}</th>
                    <th>{t('research.participantDetail.sections.quiz.table.submitted', 'Submitted')}</th>
                    <th>{t('research.participantDetail.sections.quiz.table.score', 'Score')}</th>
                    <th>{t('research.participantDetail.sections.quiz.table.passed', 'Passed')}</th>
                  </tr>
                </thead>
                <tbody>
                  {quizAttempts.map((attempt: any) => (
                    <tr key={attempt.id}>
                      <td>{attempt.quiz?.title ?? attempt.quizId}</td>
                      <td>{attempt.quiz?.module?.title ?? attempt.quiz?.moduleId ?? '--'} / {attempt.quiz?.episode?.title ?? attempt.quiz?.episodeId ?? '--'}</td>
                      <td>{formatTimestamp(attempt.submittedAt)}</td>
                      <td>{attempt.scorePct === null ? '--' : `${Math.round(toNumber(attempt.scorePct))}%`}</td>
                      <td>
                        <span className={`badge ${attempt.passed ? 'badge-success' : 'badge-muted'}`}>
                          {attempt.passed ? t('research.participantDetail.sections.quiz.status.passed', 'Passed') : t('common.review', 'Review')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <strong>{t('research.participantDetail.empty.quizTitle', 'No lesson quiz attempts recorded.')}</strong>
              <span>{t('research.participantDetail.empty.quizSubtitle', 'Quiz performance becomes visible here once the learner submits lesson checkpoints.')}</span>
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.sectionEyebrow}>{t('research.participantDetail.sections.reflection.eyebrow', 'Reflection quality')}</span>
              <h2>{t('research.participantDetail.sections.reflection.title', 'Recent reflections and self-regulation evidence')}</h2>
            </div>
            <span className="badge badge-muted">{reflectionEntries.length} {t('research.participantDetail.units.entries', 'entries')}</span>
          </div>

          {reflectionEntries.length ? (
            <div className={styles.reflectionList}>
              {reflectionEntries.slice(0, 6).map((entry: any) => (
                <article key={entry.id} className={styles.reflectionCard}>
                  <div className={styles.reflectionHead}>
                    <strong>{entry.prompt?.promptText ?? entry.promptId}</strong>
                    <span>{formatDate(entry.submittedAt)}</span>
                  </div>
                  <div className={styles.inlineMetrics}>
                    <span>{formatLabel(entry.reflectionDepth ?? t('research.participantDetail.sections.reflection.unrated', 'unrated'))}</span>
                    <span>{t('research.participantDetail.labels.score', 'Score')} {entry.reflectionScore === null ? '--' : formatDecimal(toNumber(entry.reflectionScore), 1)}</span>
                    <span>{t('research.participantDetail.labels.valence', 'Valence')} {entry.sentimentValence === null ? '--' : formatDecimal(toNumber(entry.sentimentValence), 2)}</span>
                  </div>
                  <p>{truncateText(String(entry.responseText ?? ''), 220)}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <strong>{t('research.participantDetail.empty.reflectionTitle', 'No reflection entries yet.')}</strong>
              <span>{t('research.participantDetail.empty.reflectionSubtitle', 'Submitted reflective responses and depth indicators will appear here.')}</span>
            </div>
          )}
        </section>
      </div>
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

function formatDate(value: unknown) {
  if (!value) return '--';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat(currentLocale(), { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
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

function formatDuration(value: unknown) {
  const parsed = toNumber(value);
  if (!parsed) return '--';
  return `${new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 0 }).format(Math.round(parsed))} min`;
}

function formatLabel(value: unknown) {
  return String(value ?? '--').replace(/_/g, ' ');
}

function emotionColor(state: string) {
  if (state === 'high_engagement') return 'var(--affect-flow)';
  if (state === 'confusion') return 'var(--affect-confusion)';
  if (state === 'frustration') return 'var(--affect-frustration)';
  if (state === 'boredom_disengagement') return 'var(--affect-boredom)';
  if (state === 'test_anxiety') return 'var(--affect-anxiety)';
  if (state === 'no_face_low_confidence') return 'var(--color-amber)';
  return 'rgba(107, 130, 153, 0.9)';
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

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function summarizeTimelineEmotions(rows: any[]) {
  const summaryMap = new Map<string, { state: string; count: number }>();
  const transitionsMap = new Map<string, { from: string; to: string; count: number }>();
  let previousState: string | null = null;

  rows.forEach((row) => {
    const state = String(row.detectedEmotion ?? '').trim();
    if (!state) return;

    summaryMap.set(state, {
      state,
      count: (summaryMap.get(state)?.count ?? 0) + 1,
    });

    if (previousState && previousState !== state) {
      const key = `${previousState}->${state}`;
      transitionsMap.set(key, {
        from: previousState,
        to: state,
        count: (transitionsMap.get(key)?.count ?? 0) + 1,
      });
    }

    previousState = state;
  });

  return {
    summary: [...summaryMap.values()].sort((left, right) => right.count - left.count),
    transitions: [...transitionsMap.values()].sort((left, right) => right.count - left.count).slice(0, 8),
  };
}
