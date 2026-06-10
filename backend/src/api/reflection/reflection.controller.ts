import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './reflection.service';

const SubmitSchema = z.object({
  sessionId:    z.string().uuid(),
  promptId:     z.string(),
  responseText: z.string().min(50).max(2000),
});

export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const body   = SubmitSchema.parse(req.body);
    const entry  = await svc.submit(req.user!.sub, body);
    res.status(201).json({ data: entry });
  } catch (e) { next(e); }
}

export async function getBySession(req: Request, res: Response, next: NextFunction) {
  try {
    const entries = await svc.getBySession(req.params.sessionId);
    res.json({ data: entries });
  } catch (e) { next(e); }
}

export async function getByLearner(req: Request, res: Response, next: NextFunction) {
  try {
    const entries = await svc.getByLearner(req.params.learnerId);
    res.json({ data: entries });
  } catch (e) { next(e); }
}

export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const page  = Number(req.query.page  ?? 1);
    const limit = Number(req.query.limit ?? 50);
    const result = await svc.listAll({ page, limit });
    res.json({ data: result });
  } catch (e) { next(e); }
}
