import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './session.service';
import { AppError } from '../../middleware/errorHandler';

const StartSchema = z.object({
  moduleId:     z.string(),
  episodeId:    z.string().optional(),
  scaffoldLevel: z.number().int().min(1).max(4).optional(),
  deviceInfo:   z.record(z.unknown()).optional(),
});

const UpdateSchema = z.object({
  completionPct: z.number().min(0).max(100).optional(),
  scaffoldLevel: z.number().int().min(1).max(4).optional(),
  finalAffect:   z.string().optional(),
  episodeId:     z.string().optional(),
});

function assertSessionOwner(req: Request, learnerId: string) {
  if (req.user!.role === 'learner' && req.user!.sub !== learnerId)
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
}

export async function startSession(req: Request, res: Response, next: NextFunction) {
  try {
    const body = StartSchema.parse(req.body);
    const session = await svc.startSession(req.user!.sub, body);
    res.status(201).json({ data: session });
  } catch (e) { next(e); }
}

export async function getSession(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await svc.getSession(req.params.id);
    assertSessionOwner(req, session.learnerId);
    res.json({ data: session });
  } catch (e) { next(e); }
}

export async function updateSession(req: Request, res: Response, next: NextFunction) {
  try {
    const body = UpdateSchema.parse(req.body);
    const session = await svc.updateSession(req.params.id, body);
    res.json({ data: session });
  } catch (e) { next(e); }
}

export async function endSession(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await svc.endSession(req.params.id);
    res.json({ data: session });
  } catch (e) { next(e); }
}

export async function getSessionsByLearner(req: Request, res: Response, next: NextFunction) {
  try {
    assertSessionOwner(req, req.params.learnerId);
    const sessions = await svc.getSessionsByLearner(req.params.learnerId);
    res.json({ data: sessions });
  } catch (e) { next(e); }
}

export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const page   = Number(req.query.page  ?? 1);
    const limit  = Number(req.query.limit ?? 50);
    const cohort = req.query.cohort as string | undefined;
    const moduleId = req.query.moduleId as string | undefined;
    const result = await svc.listSessions({ page, limit, cohort, moduleId });
    res.json({ data: result });
  } catch (e) { next(e); }
}
