import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AdaptiveEngine } from '../../services/AdaptiveEngine';
import { toJsonSafe } from '../../lib/json';
import { prisma } from '../../lib/prisma';
import type { AdaptiveContext } from '../../types';
import { CANONICAL_ADAPTIVE_SCENARIOS } from '../../policy/adaptive-alerts-policy';

const engine = new AdaptiveEngine();

const DecideSchema = z.object({
  sessionId:       z.string().uuid(),
  learnerId:       z.string().uuid(),
  episodeId:       z.string().optional(),
  affectState:     z.enum([
    'confusion',
    'frustration',
    'boredom_disengagement',
    'high_engagement',
    'test_anxiety',
    'neutral',
    'no_face_low_confidence',
  ]),
  scaffoldLevel:   z.number().int().min(1).max(4),
  competencyScore: z.number().min(0).max(1),
  sessionMinutes:  z.number(),
  behaviorMetrics: z.object({
    sessionId:     z.string(),
    learnerId:     z.string(),
    windowStartIso: z.string(),
    windowEndIso:   z.string(),
    dwellTimeSec:   z.number(),
    scrollEvents:   z.number(),
    rereadCount:    z.number(),
    clickCount:     z.number(),
    clickRatePerMin: z.number(),
    taskProgressPct: z.number(),
    pageReturns:    z.number(),
    hintRequests:   z.number(),
    abandonmentAttempts: z.number(),
    currentContentType: z.string().optional(),
    currentActivityType: z.string().optional(),
    currentTaskKey: z.string().optional(),
    expectedTimeSec: z.number().optional(),
  }),
});

export async function decide(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = DecideSchema.parse(req.body) as AdaptiveContext;
    const decision = await engine.decide(ctx);
    res.json({ data: decision });
  } catch (e) { next(e); }
}

export async function recordResponse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { learnerResponse, responseLatencySec, affectStatePost }
      = z.object({
        learnerResponse:   z.enum(['used', 'dismissed', 'no_action']),
        responseLatencySec: z.number().optional(),
        affectStatePost:   z.string().optional(),
        }).parse(req.body);

    const updated = await prisma.adaptiveEvent.update({
      where: { id },
      data: {
        learnerResponse,
        responseLatencySec,
        affectStatePost: affectStatePost as any,
        // Effectiveness heuristic: state improved AND learner used the intervention
        wasEffective: learnerResponse === 'used' && !!affectStatePost
          ? ['high_engagement', 'neutral'].includes(affectStatePost)
          : false,
      },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
}

export async function listEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const page  = Number(req.query.page  ?? 1);
    const limit = Number(req.query.limit ?? 100);
    const triggerType  = req.query.triggerType  as string | undefined;
    const intervention = req.query.intervention as string | undefined;

    const where: any = {};
    if (triggerType) {
      where.OR = [
        { triggerType },
        { matchedScenario: triggerType in CANONICAL_ADAPTIVE_SCENARIOS ? triggerType : undefined },
      ].filter(Boolean);
    }
    if (intervention) where.intervention = intervention;

    const [events, total] = await Promise.all([
      prisma.adaptiveEvent.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { occurredAt: 'desc' },
        include: { session: { select: { moduleId: true, learner: { select: { participantId: true, cohort: true } } } } },
      }),
      prisma.adaptiveEvent.count({ where }),
    ]);
    res.json({ data: { events, total, page, limit } });
  } catch (e) { next(e); }
}

export async function getEffectiveness(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT trigger_type, intervention,
             affect_state_pre AS state_before,
             affect_state_post AS state_after,
             COUNT(*) AS n,
             ROUND(
               SUM(CASE WHEN was_effective THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*),0) * 100, 1
             ) AS effectiveness_pct,
             ROUND(AVG(response_latency_sec)::numeric, 2) AS avg_latency_sec
      FROM   adaptive_event
      WHERE  was_effective IS NOT NULL
      GROUP BY trigger_type, intervention, affect_state_pre, affect_state_post
      ORDER BY effectiveness_pct DESC
    `;
    res.json({ data: toJsonSafe(rows) });
  } catch (e) { next(e); }
}
