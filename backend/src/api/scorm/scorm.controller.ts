import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './scorm.service';

const CommitSchema = z.object({
  sessionId: z.string().uuid(),
  contentId: z.string().min(1),
  scormId: z.string().optional(),
  cmi: z.record(z.string()).default({}),
});

export async function commit(req: Request, res: Response, next: NextFunction) {
  try {
    const body = CommitSchema.parse(req.body);
    const row = await svc.commitProgress(req.user!.sub, body);
    res.json({ data: { id: row.id, lessonStatus: row.lessonStatus, completed: row.completed } });
  } catch (e) { next(e); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await svc.getProgress(req.user!.sub, req.params.sessionId, req.params.contentId);
    res.json({ data: row });
  } catch (e) { next(e); }
}

export async function listAll(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await svc.listAllProgress();
    res.json({ data: rows });
  } catch (e) { next(e); }
}
