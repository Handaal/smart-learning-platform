import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { toJsonSafe } from '../../lib/json';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

const EventSchema = z.object({
  sessionId:  z.string().uuid(),
  episodeId:  z.string().optional(),
  contentId:  z.string().optional(),
  timestamp:  z.string().optional(),
  auVector:   z.object({
    au1:  z.number(), au4:  z.number(), au6: z.number(),
    au12: z.number(), au20: z.number(), au23: z.number(),
    confidence: z.number(),
  }),
  facialSignals: z.object({
    faceDetected: z.boolean(),
    faceVisibleRatio: z.number(),
    headTurnScore: z.number(),
    passiveExpressionScore: z.number(),
    yawnScore: z.number(),
  }).optional(),
  classifiedState:          z.string().optional(),
  classificationConfidence: z.number().optional(),
});

const BehaviorSchema = z.object({
  sessionId:           z.string().uuid(),
  episodeId:           z.string().optional(),
  windowStartIso:      z.string(),
  windowEndIso:        z.string(),
  dwellTimeSec:        z.number(),
  scrollEvents:        z.number().int(),
  rereadCount:         z.number().int(),
  clickCount:          z.number().int(),
  clickRatePerMin:     z.number(),
  taskProgressPct:     z.number(),
  pageReturns:         z.number().int(),
  hintRequests:        z.number().int(),
  abandonmentAttempts: z.number().int(),
  typingRateWpm:       z.number().optional(),
  backspaceRatio:      z.number().optional(),
  currentLessonId:     z.string().optional(),
  currentActivityId:   z.string().optional(),
  currentContentType:  z.string().optional(),
  engagementScore:     z.number().optional(),
  missedInteractionWindow: z.boolean().optional(),
});

// REST fallback for emotion event (when WS unavailable)
export async function ingestEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const body = EventSchema.parse(req.body);
    await prisma.emotionEvent.create({
      data: {
        time:                    new Date(),
        sessionId:               body.sessionId,
        learnerId:               req.user!.sub,
        episodeId:               body.episodeId,
        contentId:               body.contentId,
        au1:  body.auVector.au1,  au4: body.auVector.au4,
        au6:  body.auVector.au6,  au12: body.auVector.au12,
        au20: body.auVector.au20, au23: body.auVector.au23,
        auConfidence:            body.auVector.confidence,
        classifiedState:         (body.classifiedState ?? 'no_face_low_confidence') as any,
        classificationConfidence: body.classificationConfidence ?? body.auVector.confidence,
        isBelowThreshold:        (body.classificationConfidence ?? body.auVector.confidence) < 0.7,
      },
    });
    res.status(202).json({ data: { accepted: true } });
  } catch (e) { next(e); }
}

export async function ingestBehavior(req: Request, res: Response, next: NextFunction) {
  try {
    const body = BehaviorSchema.parse(req.body);
    await prisma.behaviorWindow.create({
      data: {
        sessionId:           body.sessionId,
        learnerId:           req.user!.sub,
        episodeId:           body.episodeId,
        windowStart:         new Date(body.windowStartIso),
        windowEnd:           new Date(body.windowEndIso),
        dwellTimeSec:        body.dwellTimeSec,
        scrollEvents:        body.scrollEvents,
        rereadCount:         body.rereadCount,
        clickCount:          body.clickCount,
        clickRatePerMin:     body.clickRatePerMin,
        taskProgressPct:     body.taskProgressPct,
        pageReturns:         body.pageReturns,
        hintRequests:        body.hintRequests,
        abandonmentAttempts: body.abandonmentAttempts,
        typingRateWpm:       body.typingRateWpm,
        backspaceRatio:      body.backspaceRatio,
        dwellExceedsThreshold: body.dwellTimeSec > 90,
      },
    });
    res.status(202).json({ data: { accepted: true } });
  } catch (e) { next(e); }
}

export async function getSessionTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params;

    // Verify session belongs to learner (or researcher)
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError(404, 'Session not found', 'NOT_FOUND');
    if (req.user!.role === 'learner' && session.learnerId !== req.user!.sub)
      throw new AppError(403, 'Access denied', 'FORBIDDEN');

    const events = await prisma.emotionEvent.findMany({
      where:   { sessionId, isBelowThreshold: false },
      orderBy: { time: 'asc' },
      select:  { time: true, classifiedState: true, classificationConfidence: true, episodeId: true },
    });

    // Reframe labels for learner-facing display
    const labelMap: Record<string, string> = {
      confusion: 'Scaffolded clarification path',
      frustration: 'Task breakdown support',
      boredom_disengagement: 'Interactive re-engagement',
      high_engagement: 'Advanced path available',
      test_anxiety: 'Procedural reassurance',
      neutral: 'Standard path',
      no_face_low_confidence: 'Performance-only fallback',
    };

    const timeline = events.map(e => ({
      time:  e.time,
      state: labelMap[e.classifiedState as string] ?? e.classifiedState,
      raw:   e.classifiedState,
      confidence: e.classificationConfidence,
      episodeId:  e.episodeId,
    }));

    res.json({ data: timeline });
  } catch (e) { next(e); }
}

export async function getAggregate(req: Request, res: Response, next: NextFunction) {
  try {
    const { learnerId, moduleId, state } = req.query as Record<string, string>;

    // Use the research view via raw query
    const rows = await prisma.$queryRaw`
      SELECT participant_id, cohort, module_id, classified_state,
             COUNT(*) AS count,
             AVG(classification_confidence) AS avg_confidence
      FROM   emotion_event ee
      JOIN   session s ON ee.session_id = s.id
      JOIN   learner l ON ee.learner_id = l.id
      WHERE  ee.is_below_threshold = FALSE
        AND  (${learnerId}::text IS NULL OR ee.learner_id::text = ${learnerId})
        AND  (${moduleId}::text  IS NULL OR s.module_id = ${moduleId})
        AND  (${state}::text     IS NULL OR ee.classified_state::text = ${state})
      GROUP BY participant_id, cohort, module_id, classified_state
      ORDER BY participant_id, module_id, count DESC
    `;

    res.json({ data: toJsonSafe(rows) });
  } catch (e) { next(e); }
}
