import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { toJsonSafe } from '../../lib/json';
import { CompetencyTracker } from '../../services/CompetencyTracker';
import { researchLedger } from '../../services/ResearchLedger';

const tracker = new CompetencyTracker();

const ADAPTIVE_MATCH_WINDOW_MS = 15000;

type TimelineEventRow = {
  participantId: string;
  cohort: string;
  moduleId: string | null;
  sessionId: string;
  timestamp: Date;
  detectedEmotion: string;
  confidence: number | null;
  currentLessonActivity: string | null;
  engagementLevel: string | null;
  triggeredAdaptiveAction: string;
  postActionOutcome: string | null;
  matchedScenario: string | null;
  sourceType: 'emotion_event' | 'adaptive_event';
  isInterventionEvent: boolean;
};

type TimelineFilters = {
  participantId?: string;
  sessionId?: string;
  cohort?: string;
  moduleId?: string;
};

function normalizeResearchEmotion(value: unknown): string {
  const token = String(value ?? '').trim().toLowerCase();
  if (!token) return 'no_face_low_confidence';
  if (token === 'high_engagement' || token.includes('high engagement')) return 'high_engagement';
  if (token === 'frustration') return 'frustration';
  if (token === 'confusion') return 'confusion';
  if (token === 'boredom_disengagement' || token.includes('boredom')) return 'boredom_disengagement';
  if (token === 'test_anxiety' || token.includes('test anxiety')) return 'test_anxiety';
  if (token === 'neutral') return 'neutral';
  if (token === 'no_face_low_confidence' || token.includes('no face') || token.includes('low confidence')) {
    return 'no_face_low_confidence';
  }
  return 'no_face_low_confidence';
}

function normalizeCoverageIntervention(value: unknown): string {
  const token = String(value ?? '').trim().toLowerCase();
  if (!token || token === 'none' || token === 'null' || token === 'undefined') return 'none';
  return token;
}

function safeConfidence(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(1, Math.max(0, parsed));
}

function parseBehaviorSnapshot(snapshot: unknown): Record<string, any> {
  if (!snapshot || typeof snapshot !== 'object') return {};
  return snapshot as Record<string, any>;
}

function buildCanonicalTimelineRows(input: {
  emotionEvents: Array<{
    sessionId: string;
    learnerId: string;
    time: Date;
    classifiedState: string;
    classificationConfidence: number | null;
    episodeId: string | null;
    learner: { participantId: string; cohort: string };
    session: { moduleId: string; episodeId: string | null };
  }>;
  adaptiveEvents: Array<{
    sessionId: string;
    learnerId: string;
    occurredAt: Date;
    triggerType: string;
    intervention: string;
    affectStatePre: string;
    affectStatePost: string | null;
    behaviorSnapshot: unknown;
    episodeId: string | null;
    learner: { participantId: string; cohort: string };
    session: { moduleId: string; episodeId: string | null };
  }>;
}) {
  const adaptiveBySession = new Map<
    string,
    Array<{
      adaptive: (typeof input.adaptiveEvents)[number];
      used: boolean;
    }>
  >();

  for (const adaptive of input.adaptiveEvents) {
    const bucket = adaptiveBySession.get(adaptive.sessionId) ?? [];
    bucket.push({ adaptive, used: false });
    adaptiveBySession.set(adaptive.sessionId, bucket);
  }

  const rows: TimelineEventRow[] = [];

  for (const event of input.emotionEvents) {
    const adaptiveCandidates = adaptiveBySession.get(event.sessionId) ?? [];
    let selected: (typeof adaptiveCandidates)[number] | null = null;
    let selectedDelta = Number.POSITIVE_INFINITY;

    for (const candidate of adaptiveCandidates) {
      if (candidate.used) continue;
      const deltaMs = Math.abs(candidate.adaptive.occurredAt.getTime() - event.time.getTime());
      if (deltaMs <= ADAPTIVE_MATCH_WINDOW_MS && deltaMs < selectedDelta) {
        selected = candidate;
        selectedDelta = deltaMs;
      }
    }

    if (selected) selected.used = true;

    const snapshot = selected ? parseBehaviorSnapshot(selected.adaptive.behaviorSnapshot) : {};
    const context = snapshot.context ?? {};
    const engagement = snapshot.engagement ?? {};
    const rawIntervention = selected?.adaptive.intervention ?? 'none';

    rows.push({
      participantId: event.learner.participantId,
      cohort: String(event.learner.cohort),
      moduleId: event.session.moduleId ?? null,
      sessionId: event.sessionId,
      timestamp: event.time,
      detectedEmotion: normalizeResearchEmotion(snapshot.detectedEmotion ?? event.classifiedState),
      confidence: safeConfidence(snapshot.emotionConfidence ?? event.classificationConfidence),
      currentLessonActivity:
        context.activityId ?? context.lessonId ?? event.episodeId ?? event.session.episodeId ?? null,
      engagementLevel: String(engagement.engagementLevel ?? '').trim() || null,
      triggeredAdaptiveAction: normalizeCoverageIntervention(rawIntervention),
      postActionOutcome: String(snapshot.learnerStateAfterAction ?? selected?.adaptive.affectStatePost ?? '').trim() || null,
      matchedScenario: String(snapshot.matchedScenario ?? selected?.adaptive.triggerType ?? '').trim() || null,
      sourceType: 'emotion_event',
      isInterventionEvent: normalizeCoverageIntervention(rawIntervention) !== 'none',
    });
  }

  for (const bucket of adaptiveBySession.values()) {
    for (const candidate of bucket) {
      if (candidate.used) continue;
      const adaptive = candidate.adaptive;
      const snapshot = parseBehaviorSnapshot(adaptive.behaviorSnapshot);
      const context = snapshot.context ?? {};
      const engagement = snapshot.engagement ?? {};
      const normalizedIntervention = normalizeCoverageIntervention(adaptive.intervention);

      rows.push({
        participantId: adaptive.learner.participantId,
        cohort: String(adaptive.learner.cohort),
        moduleId: adaptive.session.moduleId ?? null,
        sessionId: adaptive.sessionId,
        timestamp: adaptive.occurredAt,
        detectedEmotion: normalizeResearchEmotion(snapshot.detectedEmotion ?? adaptive.affectStatePre),
        confidence: safeConfidence(snapshot.emotionConfidence),
        currentLessonActivity:
          context.activityId ?? context.lessonId ?? adaptive.episodeId ?? adaptive.session.episodeId ?? null,
        engagementLevel: String(engagement.engagementLevel ?? '').trim() || null,
        triggeredAdaptiveAction: normalizedIntervention,
        postActionOutcome: String(snapshot.learnerStateAfterAction ?? adaptive.affectStatePost ?? '').trim() || null,
        matchedScenario: String(snapshot.matchedScenario ?? adaptive.triggerType ?? '').trim() || null,
        sourceType: 'adaptive_event',
        isInterventionEvent: normalizedIntervention !== 'none',
      });
    }
  }

  rows.sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
  return rows;
}

function summarizeCanonicalTimeline(rows: TimelineEventRow[]) {
  const emotionRows = rows.filter((row) => row.sourceType === 'emotion_event');
  const confidenceRows = emotionRows.filter((row) => row.confidence !== null);
  const interventionEvents = rows.filter((row) => row.isInterventionEvent);
  const coverage = emotionRows.length
    ? (emotionRows.filter((row) => row.isInterventionEvent).length / emotionRows.length) * 100
    : 0;

  return {
    totalRows: rows.length,
    emotionRows: emotionRows.length,
    adaptiveRows: rows.filter((row) => row.sourceType === 'adaptive_event').length,
    interventionEvents: interventionEvents.length,
    avgConfidencePct: confidenceRows.length
      ? (confidenceRows.reduce((sum, row) => sum + Number(row.confidence ?? 0), 0) / confidenceRows.length) * 100
      : 0,
    interventionCoveragePct: coverage,
  };
}

async function fetchTimelineRows(filters: TimelineFilters) {
  const normalizedCohort =
    filters.cohort === 'experimental' || filters.cohort === 'control'
      ? filters.cohort
      : undefined;

  const learnerFilter: Record<string, unknown> = {};
  if (filters.participantId) learnerFilter.participantId = filters.participantId;
  if (normalizedCohort) learnerFilter.cohort = normalizedCohort;

  const sessionFilter: Record<string, unknown> = {};
  if (filters.moduleId) sessionFilter.moduleId = filters.moduleId;

  const emotionWhere = {
    isBelowThreshold: false,
    ...(filters.sessionId ? { sessionId: filters.sessionId } : {}),
    ...(Object.keys(learnerFilter).length ? { learner: learnerFilter } : {}),
    ...(Object.keys(sessionFilter).length ? { session: sessionFilter } : {}),
  };

  const adaptiveWhere = {
    ...(filters.sessionId ? { sessionId: filters.sessionId } : {}),
    ...(Object.keys(learnerFilter).length ? { learner: learnerFilter } : {}),
    ...(Object.keys(sessionFilter).length ? { session: sessionFilter } : {}),
  };

  const [emotionEvents, adaptiveEvents] = await Promise.all([
    prisma.emotionEvent.findMany({
      where: emotionWhere,
      orderBy: { time: 'asc' },
      select: {
        sessionId: true,
        learnerId: true,
        time: true,
        classifiedState: true,
        classificationConfidence: true,
        episodeId: true,
        learner: { select: { participantId: true, cohort: true } },
        session: { select: { moduleId: true, episodeId: true } },
      },
    }),
    prisma.adaptiveEvent.findMany({
      where: adaptiveWhere,
      orderBy: { occurredAt: 'asc' },
      select: {
        sessionId: true,
        learnerId: true,
        occurredAt: true,
        triggerType: true,
        intervention: true,
        affectStatePre: true,
        affectStatePost: true,
        behaviorSnapshot: true,
        episodeId: true,
        learner: { select: { participantId: true, cohort: true } },
        session: { select: { moduleId: true, episodeId: true } },
      },
    }),
  ]);

  return buildCanonicalTimelineRows({
    emotionEvents: emotionEvents.map((event) => ({
      ...event,
      classifiedState: String(event.classifiedState),
      learner: { ...event.learner, cohort: String(event.learner.cohort) },
    })),
    adaptiveEvents: adaptiveEvents.map((event) => ({
      ...event,
      triggerType: String(event.triggerType),
      intervention: String(event.intervention),
      affectStatePre: String(event.affectStatePre),
      affectStatePost: event.affectStatePost ? String(event.affectStatePost) : null,
      learner: { ...event.learner, cohort: String(event.learner.cohort) },
    })),
  });
}

// ── Analytics views ──────────────────────────────────────────────────────────

export async function competencyGain(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw<Array<{
      participant_id: string;
      cohort: string;
      years_experience: number | null;
      pre_score: number;
      post_score: number;
      gain: number;
      pre_submitted_at: Date | null;
      post_submitted_at: Date | null;
    }>>`
      WITH ranked_scores AS (
        SELECT learner_id,
               form,
               total_score,
               submitted_at,
               ROW_NUMBER() OVER (
                 PARTITION BY learner_id, form
                 ORDER BY submitted_at DESC NULLS LAST, started_at DESC
               ) AS rn
        FROM assessment
        WHERE form IN ('pre', 'post')
          AND is_complete = TRUE
          AND total_score IS NOT NULL
      ),
      pre_scores AS (
        SELECT learner_id, total_score, submitted_at
        FROM ranked_scores
        WHERE form = 'pre' AND rn = 1
      ),
      post_scores AS (
        SELECT learner_id, total_score, submitted_at
        FROM ranked_scores
        WHERE form = 'post' AND rn = 1
      )
      SELECT l.participant_id,
             l.cohort::text AS cohort,
             lp.years_experience,
             pre.total_score  AS pre_score,
             post.total_score AS post_score,
             (post.total_score - pre.total_score) AS gain,
             pre.submitted_at  AS pre_submitted_at,
             post.submitted_at AS post_submitted_at
      FROM learner l
      JOIN pre_scores  pre  ON l.id = pre.learner_id
      JOIN post_scores post ON l.id = post.learner_id
      LEFT JOIN learner_profile lp ON l.id = lp.learner_id
      ORDER BY l.cohort, gain DESC, l.participant_id
    `;

    const safeRows = toJsonSafe(rows) as Array<{
      participant_id: string;
      cohort: string;
      pre_score: number;
      post_score: number;
      gain: number;
    }>;

    const matchedCount = safeRows.length;
    const preMean = matchedCount
      ? safeRows.reduce((sum, row) => sum + Number(row.pre_score ?? 0), 0) / matchedCount
      : 0;
    const postMean = matchedCount
      ? safeRows.reduce((sum, row) => sum + Number(row.post_score ?? 0), 0) / matchedCount
      : 0;
    const gainMean = matchedCount
      ? safeRows.reduce((sum, row) => sum + Number(row.gain ?? 0), 0) / matchedCount
      : 0;

    const experimentalRows = safeRows.filter((row) => String(row.cohort) === 'experimental');
    const controlRows = safeRows.filter((row) => String(row.cohort) === 'control');
    const expGain = experimentalRows.length
      ? experimentalRows.reduce((sum, row) => sum + Number(row.gain ?? 0), 0) / experimentalRows.length
      : 0;
    const ctlGain = controlRows.length
      ? controlRows.reduce((sum, row) => sum + Number(row.gain ?? 0), 0) / controlRows.length
      : 0;

    res.json({
      data: safeRows,
      meta: {
        matchedLearners: matchedCount,
        preMean,
        postMean,
        gainMean,
        groups: {
          experimental: {
            count: experimentalRows.length,
            gainMean: expGain,
          },
          control: {
            count: controlRows.length,
            gainMean: ctlGain,
          },
          deltaExpVsControl: expGain - ctlGain,
        },
        definition: 'Matched learners = participants with completed pre and post assessments (latest completed attempt per form).',
      },
    });
  } catch (e) { next(e); }
}

export async function emotionFrequency(req: Request, res: Response, next: NextFunction) {
  try {
    const moduleId = req.query.moduleId as string | undefined;
    const cohort   = req.query.cohort   as string | undefined;
    const timelineRows = await fetchTimelineRows({ cohort, moduleId });
    const emotionRows = timelineRows.filter((row) => row.sourceType === 'emotion_event');

    const grouped = new Map<
      string,
      {
        participant_id: string;
        cohort: string;
        module_id: string;
        classified_state: string;
        freq: number;
        confidence_sum: number;
        confidence_count: number;
      }
    >();

    for (const row of emotionRows) {
      if (!row.participantId) continue;
      const state = normalizeResearchEmotion(row.detectedEmotion);
      const scopedModule = row.moduleId ?? 'UNASSIGNED';
      const key = `${row.participantId}|${scopedModule}|${state}`;
      const current = grouped.get(key) ?? {
        participant_id: row.participantId,
        cohort: row.cohort,
        module_id: scopedModule,
        classified_state: state,
        freq: 0,
        confidence_sum: 0,
        confidence_count: 0,
      };
      current.freq += 1;
      if (row.confidence !== null) {
        current.confidence_sum += Number(row.confidence);
        current.confidence_count += 1;
      }
      grouped.set(key, current);
    }

    const data = [...grouped.values()]
      .map((row) => ({
        participant_id: row.participant_id,
        cohort: row.cohort,
        module_id: row.module_id,
        classified_state: row.classified_state,
        freq: row.freq,
        avg_confidence: row.confidence_count ? Number((row.confidence_sum / row.confidence_count).toFixed(3)) : 0,
      }))
      .filter((row) => (moduleId ? row.module_id === moduleId : true))
      .sort((left, right) =>
        left.participant_id.localeCompare(right.participant_id)
        || left.module_id.localeCompare(right.module_id)
        || right.freq - left.freq,
      );

    const summary = summarizeCanonicalTimeline(timelineRows);
    res.json({
      data: toJsonSafe(data),
      meta: {
        confidenceDefinition: 'Average confidence from emotion-event timeline rows only.',
        timelineRows: summary.totalRows,
        emotionRows: summary.emotionRows,
        adaptiveRows: summary.adaptiveRows,
      },
    });
  } catch (e) { next(e); }
}

export async function adaptiveEffectiveness(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw<Array<{
      trigger_type: string;
      intervention: string;
      state_before: string;
      state_after: string | null;
      n: number;
      evaluated_n: number;
      effectiveness_pct: number | null;
      avg_latency_sec: number | null;
    }>>`
      SELECT trigger_type,
             intervention,
             affect_state_pre   AS state_before,
             affect_state_post  AS state_after,
             COUNT(*) AS n,
             COUNT(CASE WHEN was_effective IS NOT NULL THEN 1 END) AS evaluated_n,
             ROUND(
               SUM(CASE WHEN was_effective THEN 1 ELSE 0 END)::numeric /
               NULLIF(COUNT(CASE WHEN was_effective IS NOT NULL THEN 1 END), 0) * 100, 1
             ) AS effectiveness_pct,
             ROUND(AVG(response_latency_sec)::numeric, 2) AS avg_latency_sec
      FROM   adaptive_event
      GROUP BY trigger_type, intervention, affect_state_pre, affect_state_post
      ORDER BY n DESC
    `;
    const data = rows.map((row) => ({
      ...row,
      trigger_type: normalizeResearchEmotion(row.trigger_type),
      intervention: normalizeCoverageIntervention(row.intervention),
      state_before: normalizeResearchEmotion(row.state_before),
      state_after: row.state_after ? normalizeResearchEmotion(row.state_after) : null,
    }));
    const totalEvents = data.reduce((sum, row) => sum + Number(row.n ?? 0), 0);
    const totalEvaluated = data.reduce((sum, row) => sum + Number(row.evaluated_n ?? 0), 0);

    res.json({
      data: toJsonSafe(data),
      meta: {
        totalEvents,
        totalEvaluated,
        weightedEffectivenessPct: totalEvaluated
          ? data.reduce(
              (sum, row) => sum + Number(row.effectiveness_pct ?? 0) * Number(row.evaluated_n ?? 0),
              0,
            ) / totalEvaluated
          : 0,
      },
    });
  } catch (e) { next(e); }
}

export async function engagement(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw`
      WITH hint_per_session AS (
        SELECT session_id, SUM(COALESCE(hint_requests, 0)) AS hint_requests
        FROM behavior_window
        GROUP BY session_id
      ),
      session_metrics AS (
        SELECT s.learner_id,
               COUNT(s.id) AS total_sessions,
               SUM(CASE WHEN s.is_complete THEN 1 ELSE 0 END) AS completed_sessions,
               ROUND(AVG(s.completion_pct)::numeric, 1) AS avg_completion_pct,
               ROUND(AVG(s.duration_min)::numeric, 1) AS avg_duration_min,
               SUM(COALESCE(hps.hint_requests, 0)) AS total_hints_used
        FROM session s
        LEFT JOIN hint_per_session hps ON hps.session_id = s.id
        GROUP BY s.learner_id
      )
      SELECT l.participant_id,
             l.cohort,
             COALESCE(sm.total_sessions, 0) AS total_sessions,
             COALESCE(sm.completed_sessions, 0) AS completed_sessions,
             COALESCE(sm.avg_completion_pct, 0) AS avg_completion_pct,
             COALESCE(sm.avg_duration_min, 0) AS avg_duration_min,
             COALESCE(sm.total_hints_used, 0) AS total_hints_used
      FROM learner l
      LEFT JOIN session_metrics sm ON sm.learner_id = l.id
      ORDER BY l.cohort, completed_sessions DESC
    `;
    res.json({ data: toJsonSafe(rows) });
  } catch (e) { next(e); }
}

export async function responseTypeDistribution(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw`
      WITH session_metrics AS (
        SELECT learner_id,
               COUNT(*) AS session_count,
               COALESCE(AVG(completion_pct), 0) AS avg_completion
        FROM session
        GROUP BY learner_id
      ),
      adaptive_metrics AS (
        SELECT learner_id,
               COUNT(*) AS adaptive_events,
               COALESCE(SUM(CASE WHEN was_effective THEN 1 ELSE 0 END), 0) AS effective_adaptive_events
        FROM adaptive_event
        GROUP BY learner_id
      ),
      emotion_metrics AS (
        SELECT learner_id,
               COALESCE(SUM(CASE WHEN classified_state::text = 'high_engagement' THEN 1 ELSE 0 END), 0) AS focused_events,
               COALESCE(SUM(CASE WHEN classified_state::text IN ('confusion', 'frustration', 'test_anxiety') THEN 1 ELSE 0 END), 0) AS struggle_events,
               COALESCE(SUM(CASE WHEN classified_state::text = 'boredom_disengagement' THEN 1 ELSE 0 END), 0) AS boredom_events,
               COALESCE(SUM(CASE WHEN classified_state::text = 'no_face_low_confidence' THEN 1 ELSE 0 END), 0) AS fallback_events
        FROM emotion_event
        WHERE is_below_threshold = FALSE
        GROUP BY learner_id
      ),
      prepost_metrics AS (
        SELECT learner_id,
               MAX(CASE WHEN form = 'pre'  AND is_complete = TRUE AND total_score IS NOT NULL THEN total_score END) AS pre_score,
               MAX(CASE WHEN form = 'post' AND is_complete = TRUE AND total_score IS NOT NULL THEN total_score END) AS post_score
        FROM assessment
        GROUP BY learner_id
      ),
      participant_metrics AS (
        SELECT l.id AS learner_id,
               COALESCE(sm.session_count, 0) AS session_count,
               COALESCE(sm.avg_completion, 0) AS avg_completion,
               COALESCE(am.adaptive_events, 0) AS adaptive_events,
               COALESCE(am.effective_adaptive_events, 0) AS effective_adaptive_events,
               COALESCE(em.focused_events, 0) AS focused_events,
               COALESCE(em.struggle_events, 0) AS struggle_events,
               COALESCE(em.boredom_events, 0) AS boredom_events,
               COALESCE(em.fallback_events, 0) AS fallback_events,
               pp.pre_score AS pre_score,
               pp.post_score AS post_score
        FROM learner l
        LEFT JOIN session_metrics sm ON sm.learner_id = l.id
        LEFT JOIN adaptive_metrics am ON am.learner_id = l.id
        LEFT JOIN emotion_metrics em ON em.learner_id = l.id
        LEFT JOIN prepost_metrics pp ON pp.learner_id = l.id
      ),
      classified AS (
        SELECT l.cohort,
               CASE
                 WHEN lp.response_type IS NOT NULL AND lp.response_type <> '' THEN lp.response_type
                 WHEN pm.session_count = 0
                      AND pm.adaptive_events = 0
                      AND pm.focused_events = 0
                      AND pm.struggle_events = 0
                      AND pm.boredom_events = 0
                      AND pm.pre_score IS NULL
                      AND pm.post_score IS NULL
                   THEN 'unclassified'
                 WHEN pm.avg_completion >= 80 AND pm.focused_events >= GREATEST(pm.struggle_events, 4) THEN 'steady_progressor'
                 WHEN pm.adaptive_events >= 2
                      AND pm.effective_adaptive_events::numeric / NULLIF(pm.adaptive_events, 0) >= 0.45 THEN 'support_responsive'
                 WHEN pm.post_score IS NOT NULL
                      AND pm.pre_score IS NOT NULL
                      AND (pm.post_score - pm.pre_score) >= 8
                      AND pm.avg_completion >= 65 THEN 'adaptive_balanced'
                 WHEN (pm.struggle_events + pm.boredom_events) > pm.focused_events
                      AND pm.avg_completion < 60 THEN 'high_variability'
                 WHEN pm.avg_completion >= 65 THEN 'adaptive_balanced'
                 ELSE 'emerging'
               END AS response_type,
               CASE
                 WHEN lp.response_type IS NOT NULL AND lp.response_type <> '' THEN 'profile'
                 ELSE 'derived'
               END AS response_source
        FROM learner l
        LEFT JOIN learner_profile lp ON l.id = lp.learner_id
        LEFT JOIN participant_metrics pm ON l.id = pm.learner_id
      )
      SELECT cohort, response_type, response_source, COUNT(*) AS n
      FROM classified
      GROUP BY cohort, response_type, response_source
      ORDER BY cohort, n DESC
    `;
    const safeRows = toJsonSafe(rows) as Array<{ response_type: string; n: number }>;
    const totals = safeRows.reduce(
      (acc, row) => {
        const count = Number(row.n ?? 0);
        acc.total += count;
        if (String(row.response_type) === 'unclassified') acc.unclassified += count;
        return acc;
      },
      { total: 0, unclassified: 0 },
    );

    res.json({
      data: safeRows,
      meta: {
        totalLearners: totals.total,
        unclassifiedLearners: totals.unclassified,
        classifiedLearners: Math.max(totals.total - totals.unclassified, 0),
        classificationCoveragePct: totals.total ? ((totals.total - totals.unclassified) / totals.total) * 100 : 0,
      },
    });
  } catch (e) { next(e); }
}

export async function reflectionDepth(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT l.participant_id,
             l.cohort,
             re.reflection_depth,
             COUNT(*) AS count,
             ROUND(AVG(re.reflection_score)::numeric, 1)     AS avg_score,
             ROUND(AVG(re.sentiment_valence)::numeric, 3)    AS avg_valence
      FROM   reflection_entry re
      JOIN   learner l ON re.learner_id = l.id
      GROUP BY l.participant_id, l.cohort, re.reflection_depth
      ORDER BY l.participant_id, count DESC
    `;
    res.json({ data: toJsonSafe(rows) });
  } catch (e) { next(e); }
}

export async function contentEngagement(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT lc.content_type,
             lc.adaptive_tag,
             COUNT(bw.id) AS access_count,
             ROUND(AVG(bw.dwell_time_sec)::numeric, 1) AS avg_dwell_time_sec,
             MAX(bw.dwell_time_sec) AS max_dwell_time_sec
      FROM   behavior_window bw
      JOIN   learning_content lc ON bw.content_id = lc.id
      GROUP BY lc.content_type, lc.adaptive_tag
      ORDER BY avg_dwell_time_sec DESC
    `;
    res.json({ data: toJsonSafe(rows) });
  } catch (e) { next(e); }
}

export async function assessmentLatency(_req: Request, res: Response, next: NextFunction) {
  try {
    // Requires mapping assessments back to recent emotions 
    // Uses adaptive_event to map response_latency to affectStatePost
    const rows = await prisma.$queryRaw`
      SELECT ae.affect_state_pre AS emotional_state,
             ROUND(AVG(ae.response_latency_sec)::numeric, 2) AS avg_latency_sec,
             ROUND(MIN(ae.response_latency_sec)::numeric, 2) AS min_latency_sec,
             ROUND(MAX(ae.response_latency_sec)::numeric, 2) AS max_latency_sec,
             COUNT(*) AS attempts
      FROM   adaptive_event ae
      JOIN   learning_content lc ON ae.content_id = lc.id
      WHERE  lc.content_type = 'ASSESSMENT' AND ae.response_latency_sec IS NOT NULL
      GROUP BY ae.affect_state_pre
      ORDER BY avg_latency_sec DESC
    `;
    res.json({ data: toJsonSafe(rows) });
  } catch (e) { next(e); }
}

export async function participantSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { participantId } = req.params;
    const learner = await prisma.learner.findUnique({
      where: { participantId },
      include: {
        learnerProfile: true,
        moduleProgress: {
          orderBy: { module: { sequenceOrder: 'asc' } },
          include: {
            module: {
              select: {
                id: true,
                title: true,
                sequenceOrder: true,
              },
            },
          },
        },
        assessments: { orderBy: { startedAt: 'asc' } },
        competencyRecords: { orderBy: { recordedAt: 'asc' } },
        sessions: {
          orderBy: { startedAt: 'asc' },
          include: {
            module: {
              select: {
                id: true,
                title: true,
                sequenceOrder: true,
              },
            },
          },
        },
      },
    });
    if (!learner) return res.status(404).json({ error: 'Participant not found' });

    const [emotionEvents, adaptiveEvents, reflectionEntries, quizAttempts] = await Promise.all([
      prisma.emotionEvent.findMany({
        where: {
          learnerId: learner.id,
          isBelowThreshold: false,
        },
        orderBy: { time: 'asc' },
        select: {
          id: true,
          sessionId: true,
          episodeId: true,
          time: true,
          classifiedState: true,
          classificationConfidence: true,
          contentId: true,
        },
      }),
      prisma.adaptiveEvent.findMany({
        where: { learnerId: learner.id },
        orderBy: { occurredAt: 'asc' },
        include: {
          episode: {
            select: { id: true, title: true },
          },
        },
      }),
      prisma.reflectionEntry.findMany({
        where: { learnerId: learner.id },
        orderBy: { submittedAt: 'desc' },
        include: {
          prompt: {
            select: {
              id: true,
              promptText: true,
            },
          },
        },
      }),
      prisma.quizAttempt.findMany({
        where: { learnerId: learner.id },
        orderBy: { submittedAt: 'desc' },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              passingScore: true,
              scope: true,
              episodeId: true,
              moduleId: true,
              episode: {
                select: { id: true, title: true },
              },
              module: {
                select: { id: true, title: true },
              },
            },
          },
          answers: {
            include: {
              question: {
                select: {
                  id: true,
                  questionText: true,
                  explanation: true,
                },
              },
              selectedChoice: {
                select: {
                  id: true,
                  choiceText: true,
                  isCorrect: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const participantTimelineRows = await fetchTimelineRows({ participantId });
    const timelineSummary = summarizeCanonicalTimeline(participantTimelineRows);

    const analytics = buildParticipantAnalytics({
      sessions: learner.sessions,
      emotionEvents,
      adaptiveEvents,
      quizAttempts,
      timelineRows: participantTimelineRows,
    });
    const derivedResponseType = deriveResponseTypeFromAnalytics(analytics);
    const resolvedResponseType = learner.learnerProfile?.responseType ?? derivedResponseType;
    const responseTypeSource = learner.learnerProfile?.responseType ? 'profile' : 'derived';

    res.json({
      data: toJsonSafe({
        ...learner,
        learnerProfile: learner.learnerProfile
          ? { ...learner.learnerProfile, responseType: resolvedResponseType }
          : null,
        responseType: resolvedResponseType,
        responseTypeSource,
        emotionEvents,
        adaptiveEvents,
        reflectionEntries,
        quizAttempts,
        timelineHeatmapRows: participantTimelineRows,
        analytics: {
          ...analytics,
          derivedResponseType,
          responseTypeSource,
          consistency: {
            timelineRows: timelineSummary.totalRows,
            emotionRows: timelineSummary.emotionRows,
            adaptiveRows: timelineSummary.adaptiveRows,
            interventionEvents: timelineSummary.interventionEvents,
            avgConfidencePct: timelineSummary.avgConfidencePct,
            interventionCoveragePct: timelineSummary.interventionCoveragePct,
          },
        },
      }),
    });
  } catch (e) { next(e); }
}

export async function timelineHeatmap(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.query.sessionId as string | undefined;
    const participantId = req.query.participantId as string | undefined;
    const rows = await fetchTimelineRows({ participantId, sessionId });
    const summary = summarizeCanonicalTimeline(rows);

    res.json({
      data: toJsonSafe(rows.map((row) => ({
        participantId: row.participantId,
        cohort: row.cohort,
        moduleId: row.moduleId,
        sessionId: row.sessionId,
        timestamp: row.timestamp,
        detectedEmotion: row.detectedEmotion,
        confidence: row.confidence,
        currentLessonActivity: row.currentLessonActivity,
        engagementLevel: row.engagementLevel,
        triggeredAdaptiveAction: row.triggeredAdaptiveAction,
        postActionOutcome: row.postActionOutcome,
        matchedScenario: row.matchedScenario,
        sourceType: row.sourceType,
        isInterventionEvent: row.isInterventionEvent,
      }))),
      meta: {
        metricDefinitions: {
          confidence: 'Average confidence is calculated from emotion-event rows only.',
          interventionCoverage: 'Coverage = share of emotion-event rows that were linked to an adaptive intervention.',
          interventionCount: 'Intervention count = rows where triggeredAdaptiveAction is not none.',
        },
        totals: summary,
      },
    });
  } catch (e) { next(e); }
}

export async function logAdminSimulation(req: Request, res: Response, next: NextFunction) {
  try {
    const simulatedEmotion = String(req.body.simulatedEmotion ?? '').trim();
    if (!simulatedEmotion) {
      return res.status(400).json({ error: 'simulatedEmotion is required' });
    }

    await researchLedger.logAdminSimulation({
      participantId: req.body.participantId ?? null,
      sessionId: req.body.sessionId ?? null,
      lessonId: req.body.lessonId ?? null,
      activityId: req.body.activityId ?? null,
      simulatedEmotion,
      matchedScenario: req.body.matchedScenario ?? null,
      thresholds:
        req.body.thresholds && typeof req.body.thresholds === 'object'
          ? req.body.thresholds
          : null,
      previewPayload:
        req.body.previewPayload && typeof req.body.previewPayload === 'object'
          ? req.body.previewPayload
          : null,
      researcherId: req.user?.sub ?? null,
      metadata:
        req.body.metadata && typeof req.body.metadata === 'object'
          ? req.body.metadata
          : null,
    });

    res.status(201).json({ data: { status: 'logged' } });
  } catch (e) { next(e); }
}

// ── CSV Exports ───────────────────────────────────────────────────────────────

function toCSV(rows: object[]): string {
  const safeRows = toJsonSafe(rows) as Record<string, unknown>[];
  if (!safeRows.length) return '';
  const headers = Object.keys(safeRows[0]);
  const lines = safeRows.map((row) =>
    headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}

function deriveResponseTypeFromAnalytics(input: {
  dominantEmotion: string | null;
  totalEmotionEvents: number;
  totalAdaptiveEvents: number;
  adaptiveEffectivenessPct: number | null;
  adaptiveCoveragePct: number;
  sessionAnalytics: Array<{ completionPct: number; emotionEventCount: number; interventionCount: number }>;
}) {
  const avgCompletion = input.sessionAnalytics.length
    ? input.sessionAnalytics.reduce((sum, row) => sum + Number(row.completionPct ?? 0), 0) / input.sessionAnalytics.length
    : 0;
  const totalInterventions = input.sessionAnalytics.reduce((sum, row) => sum + Number(row.interventionCount ?? 0), 0);
  const totalEmotionSignals = input.sessionAnalytics.reduce((sum, row) => sum + Number(row.emotionEventCount ?? 0), 0);
  const supportEfficiency = Number(input.adaptiveEffectivenessPct ?? 0);
  const hasBehaviorSignals = input.totalEmotionEvents > 0 || input.totalAdaptiveEvents > 0;

  if (!input.sessionAnalytics.length && !hasBehaviorSignals) return 'unclassified';
  if (!input.sessionAnalytics.length && hasBehaviorSignals) return 'emerging';
  if (avgCompletion >= 80 && input.dominantEmotion === 'high_engagement') return 'steady_progressor';
  if (totalInterventions >= 2 && supportEfficiency >= 45) return 'support_responsive';
  if (
    (input.dominantEmotion === 'confusion' || input.dominantEmotion === 'frustration') &&
    avgCompletion < 60 &&
    totalEmotionSignals >= 6
  ) {
    return 'high_variability';
  }
  if (avgCompletion >= 65 && input.adaptiveCoveragePct >= 20) return 'adaptive_balanced';
  if (avgCompletion >= 65) return 'adaptive_balanced';
  return 'emerging';
}

function buildParticipantAnalytics(input: {
  sessions: Array<{
    id: string;
    moduleId: string;
    episodeId: string | null;
    startedAt: Date;
    durationMin: number | null;
    completionPct: number;
    isComplete: boolean;
    finalAffect: string | null;
    scaffoldLevel: number;
    module: { id: string; title: string; sequenceOrder: number } | null;
  }>;
  emotionEvents: Array<{
    sessionId: string;
    time: Date;
    classifiedState: string;
    classificationConfidence: number | null;
  }>;
  adaptiveEvents: Array<{
    sessionId: string;
    occurredAt: Date;
    triggerType: string;
    intervention: string;
    affectStatePre: string;
    affectStatePost: string | null;
    wasEffective: boolean | null;
    responseLatencySec: number | null;
    behaviorSnapshot: unknown;
    episode: { id: string; title: string } | null;
  }>;
  quizAttempts: Array<{
    sessionId: string | null;
    submittedAt: Date | null;
    scorePct: number | null;
    passed: boolean | null;
  }>;
  timelineRows: TimelineEventRow[];
}) {
  const emotionTimelineRows = input.timelineRows.filter((row) => row.sourceType === 'emotion_event');

  const emotionSummaryMap = new Map<
    string,
    {
      state: string;
      count: number;
      avgConfidence: number;
      confidenceSum: number;
      confidenceCount: number;
      firstSeen: Date | null;
      lastSeen: Date | null;
    }
  >();

  for (const event of emotionTimelineRows) {
      const key = normalizeResearchEmotion(event.detectedEmotion);
    const existing = emotionSummaryMap.get(key) ?? {
      state: key,
      count: 0,
      avgConfidence: 0,
      confidenceSum: 0,
      confidenceCount: 0,
      firstSeen: null,
      lastSeen: null,
    };
    const nextCount = existing.count + 1;
    const confidenceValue =
      event.confidence === null || event.confidence === undefined
        ? null
        : Number(event.confidence);
    const nextConfidenceSum = existing.confidenceSum + (confidenceValue ?? 0);
    const nextConfidenceCount = existing.confidenceCount + (confidenceValue === null ? 0 : 1);
    emotionSummaryMap.set(key, {
      state: key,
      count: nextCount,
      avgConfidence: nextConfidenceCount ? nextConfidenceSum / nextConfidenceCount : 0,
      confidenceSum: nextConfidenceSum,
      confidenceCount: nextConfidenceCount,
      firstSeen: existing.firstSeen ?? event.timestamp,
      lastSeen: event.timestamp,
    });
  }

  const emotionSummary = [...emotionSummaryMap.values()]
    .map((row) => ({
      state: row.state,
      count: row.count,
      avgConfidence: row.avgConfidence,
      firstSeen: row.firstSeen,
      lastSeen: row.lastSeen,
    }))
    .sort((left, right) => right.count - left.count);

  const emotionTransitionsMap = new Map<string, { from: string; to: string; count: number }>();
  let previousState: string | null = null;
  for (const event of emotionTimelineRows) {
    const nextState = normalizeResearchEmotion(event.detectedEmotion);
    if (!previousState || previousState === nextState) {
      previousState = nextState;
      continue;
    }

    const key = `${previousState}->${nextState}`;
    const current = emotionTransitionsMap.get(key) ?? {
      from: previousState,
      to: nextState,
      count: 0,
    };
    current.count += 1;
    emotionTransitionsMap.set(key, current);
    previousState = nextState;
  }

  const sessionAnalytics = input.sessions.map((session) => {
    const sessionEmotionEvents = emotionTimelineRows.filter((event) => event.sessionId === session.id);
    const sessionAdaptiveEvents = input.adaptiveEvents.filter((event) => event.sessionId === session.id);
    const sessionQuizAttempts = input.quizAttempts.filter((attempt) => attempt.sessionId === session.id);

    const dominantEmotion = sessionEmotionEvents.length
      ? [...sessionEmotionEvents.reduce((map, event) => {
          const state = normalizeResearchEmotion(event.detectedEmotion);
          map.set(state, (map.get(state) ?? 0) + 1);
          return map;
        }, new Map<string, number>()).entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
      : null;

    const confidenceEvents = sessionEmotionEvents.filter(
      (event) => event.confidence !== null && event.confidence !== undefined,
    );
    const averageConfidence = confidenceEvents.length
      ? confidenceEvents.reduce((sum, event) => sum + Number(event.confidence), 0) / confidenceEvents.length
      : null;

    const effectiveCount = sessionAdaptiveEvents.filter((event) => event.wasEffective === true).length;
    const averageQuizScore = sessionQuizAttempts.length
      ? sessionQuizAttempts.reduce((sum, attempt) => sum + Number(attempt.scorePct ?? 0), 0) / sessionQuizAttempts.length
      : null;

    return {
      sessionId: session.id,
      moduleId: session.moduleId,
      moduleTitle: session.module?.title ?? session.moduleId,
      lessonId: session.episodeId,
      startedAt: session.startedAt,
      durationMin: session.durationMin,
      completionPct: session.completionPct,
      isComplete: session.isComplete,
      finalAffect: session.finalAffect,
      scaffoldLevel: session.scaffoldLevel,
      dominantEmotion,
      emotionEventCount: sessionEmotionEvents.length,
      averageConfidence,
      interventionCount: sessionAdaptiveEvents.length,
      effectiveInterventionRate: sessionAdaptiveEvents.length
        ? (effectiveCount / sessionAdaptiveEvents.length) * 100
        : null,
      quizAttemptCount: sessionQuizAttempts.length,
      averageQuizScore,
    };
  });

  const totalAdaptiveEvents = input.timelineRows.filter((event) => event.isInterventionEvent).length;
  const effectiveAdaptiveEvents = input.adaptiveEvents.filter((event) => event.wasEffective === true).length;
  const quizScoreRows = input.quizAttempts.filter((attempt) => attempt.scorePct !== null);
  const adaptiveCoveragePct = emotionTimelineRows.length
    ? (emotionTimelineRows.filter((event) => event.isInterventionEvent).length / emotionTimelineRows.length) * 100
    : 0;
  const confidenceRows = emotionTimelineRows.filter((event) => event.confidence !== null);
  const averageEmotionConfidencePct = confidenceRows.length
    ? (confidenceRows.reduce((sum, event) => sum + Number(event.confidence ?? 0), 0) / confidenceRows.length) * 100
    : 0;

  return {
    dominantEmotion: emotionSummary[0]?.state ?? null,
    emotionSummary,
    emotionTransitions: [...emotionTransitionsMap.values()].sort((left, right) => right.count - left.count).slice(0, 8),
    totalEmotionEvents: emotionTimelineRows.length,
    totalAdaptiveEvents,
    adaptiveCoveragePct,
    averageEmotionConfidencePct,
    adaptiveEffectivenessPct: totalAdaptiveEvents
      ? (effectiveAdaptiveEvents / totalAdaptiveEvents) * 100
      : null,
    averageQuizScore: quizScoreRows.length
      ? quizScoreRows.reduce((sum, attempt) => sum + Number(attempt.scorePct ?? 0), 0) / quizScoreRows.length
      : null,
    quizPassRate: input.quizAttempts.length
      ? (input.quizAttempts.filter((attempt) => attempt.passed).length / input.quizAttempts.length) * 100
      : null,
    averageResponseLatencySec: input.adaptiveEvents.length
      ? input.adaptiveEvents.reduce((sum, event) => sum + Number(event.responseLatencySec ?? 0), 0) / input.adaptiveEvents.length
      : null,
    sessionAnalytics,
  };
}

export async function exportSessions(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw<object[]>`
      SELECT l.participant_id, l.cohort, s.module_id, s.episode_id,
             s.started_at, s.ended_at, s.duration_min, s.completion_pct,
             s.scaffold_level, s.initial_affect, s.final_affect, s.is_complete
      FROM session s JOIN learner l ON s.learner_id = l.id
      ORDER BY l.participant_id, s.started_at
    `;
    await researchLedger.logResearchExport({
      exportType: 'sessions',
      exportFormat: 'csv',
      requestedBy: _req.user?.sub ?? null,
      fileName: 'step_sessions.csv',
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="step_sessions.csv"');
    res.send(toCSV(rows));
  } catch (e) { next(e); }
}

export async function exportEmotionEvents(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw<Array<{
      participant_id: string;
      cohort: string;
      module_id: string | null;
      episode_id: string | null;
      time: Date;
      au1: number | null;
      au4: number | null;
      au6: number | null;
      au12: number | null;
      au20: number | null;
      au23: number | null;
      au_confidence: number | null;
      classified_state: string;
      classification_confidence: number | null;
      is_below_threshold: boolean;
    }>>`
      SELECT l.participant_id, l.cohort, s.module_id, ee.episode_id,
             ee.time, ee.au1, ee.au4, ee.au6, ee.au12, ee.au20, ee.au23,
             ee.au_confidence, ee.classified_state, ee.classification_confidence,
             ee.is_below_threshold
      FROM emotion_event ee
      JOIN session s ON ee.session_id = s.id
      JOIN learner l ON ee.learner_id = l.id
      WHERE ee.is_below_threshold = FALSE
      ORDER BY l.participant_id, ee.time
    `;
    const exportRows = rows.map((row) => ({
      ...row,
      canonical_emotion: normalizeResearchEmotion(row.classified_state),
      normalized_confidence: safeConfidence(row.classification_confidence),
    }));
    await researchLedger.logResearchExport({
      exportType: 'emotion_events',
      exportFormat: 'csv',
      requestedBy: _req.user?.sub ?? null,
      fileName: 'step_emotion_events.csv',
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="step_emotion_events.csv"');
    res.send(toCSV(exportRows));
  } catch (e) { next(e); }
}

export async function exportTimelineHeatmap(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.query.sessionId as string | undefined;
    const participantId = req.query.participantId as string | undefined;
    const rows = await fetchTimelineRows({ participantId, sessionId });
    const exportRows = rows.map((row) => ({
      participantId: row.participantId,
      cohort: row.cohort,
      moduleId: row.moduleId ?? '',
      sessionId: row.sessionId,
      timestamp: row.timestamp.toISOString(),
      detectedEmotion: row.detectedEmotion,
      confidence: row.confidence ?? '',
      currentLessonActivity: row.currentLessonActivity ?? '',
      engagementLevel: row.engagementLevel ?? '',
      triggeredAdaptiveAction: row.triggeredAdaptiveAction,
      postActionOutcome: row.postActionOutcome ?? '',
      matchedScenario: row.matchedScenario ?? '',
      sourceType: row.sourceType,
      isInterventionEvent: row.isInterventionEvent,
    }));

    await researchLedger.logResearchExport({
      participantId: participantId ?? null,
      sessionId: sessionId ?? null,
      exportType: 'timeline_heatmap',
      exportFormat: 'csv',
      requestedBy: req.user?.sub ?? null,
      filters: {
        participantId: participantId ?? null,
        sessionId: sessionId ?? null,
      },
      fileName: 'step_timeline_heatmap.csv',
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="step_timeline_heatmap.csv"');
    res.send(toCSV(exportRows));
  } catch (e) { next(e); }
}

export async function exportCompetency(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw<object[]>`
      SELECT l.participant_id, l.cohort, cr.recorded_at, cr.source,
             cr.module_id, cr.c1, cr.c2, cr.c3, cr.c4, cr.c5, cr.composite
      FROM competency_record cr
      JOIN learner l ON cr.learner_id = l.id
      ORDER BY l.participant_id, cr.recorded_at
    `;
    await researchLedger.logResearchExport({
      exportType: 'competency',
      exportFormat: 'csv',
      requestedBy: _req.user?.sub ?? null,
      fileName: 'step_competency.csv',
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="step_competency.csv"');
    res.send(toCSV(rows));
  } catch (e) { next(e); }
}

export async function exportReflections(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw<object[]>`
      SELECT l.participant_id, l.cohort, re.submitted_at, re.prompt_id,
             re.word_count, re.sentiment_valence, re.sentiment_arousal,
             re.reflection_depth, re.reflection_score,
             array_to_string(re.self_reg_markers, '|')    AS self_reg_markers,
             array_to_string(re.competency_concepts, '|') AS competency_concepts
      FROM reflection_entry re
      JOIN learner l ON re.learner_id = l.id
      ORDER BY l.participant_id, re.submitted_at
    `;
    await researchLedger.logResearchExport({
      exportType: 'reflections',
      exportFormat: 'csv',
      requestedBy: _req.user?.sub ?? null,
      fileName: 'step_reflections.csv',
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="step_reflections.csv"');
    res.send(toCSV(rows));
  } catch (e) { next(e); }
}

export async function exportMergedAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw<object[]>`
      SELECT 
        l.participant_id, l.cohort, s.module_id, ee.episode_id,
        ee.time AS timestamp,
        lc.content_type, lc.adaptive_tag, lc.scaffold_level,
        ee.classified_state, ee.classification_confidence,
        ee.au1, ee.au4, ee.au6, ee.au12, ee.au20, ee.au23,
        bw.dwell_time_sec, bw.click_count, bw.scroll_events,
        ae.trigger_type, ae.intervention, ae.response_latency_sec, ae.learner_response
      FROM emotion_event ee
      JOIN learner l ON ee.learner_id = l.id
      JOIN session s ON ee.session_id = s.id
      LEFT JOIN adaptive_event ae ON ee.session_id = ae.session_id AND ee.time = ae.occurred_at
      LEFT JOIN learning_content lc ON ee.content_id = lc.id
      LEFT JOIN behavior_window bw ON ee.session_id = bw.session_id AND ee.episode_id = bw.episode_id AND bw.content_id = lc.id
      ORDER BY l.participant_id, ee.time
    `;
    await researchLedger.logResearchExport({
      exportType: 'merged_ml_dataset',
      exportFormat: 'csv',
      requestedBy: _req.user?.sub ?? null,
      fileName: 'step_merged_ml_dataset.csv',
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="step_merged_ml_dataset.csv"');
    res.send(toCSV(rows));
  } catch (e) { next(e); }
}
