import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './assessment.service';

const StartSchema = z.object({
  form: z.enum(['pre', 'mid', 'post', 'transfer']),
});

const SubmitSchema = z.union([
  z.object({
    answers: z.array(
      z.object({
        questionId: z.string(),
        choiceId: z.string(),
      }),
    ).min(1),
  }),
  z.object({
    scores: z.object({
      s1: z.number().int().min(0).max(4),
      s2: z.number().int().min(0).max(4),
      s3: z.number().int().min(0).max(4),
      s4: z.number().int().min(0).max(4),
      s5: z.number().int().min(0).max(4),
    }),
  }),
]);

export async function start(req: Request, res: Response, next: NextFunction) {
  try {
    const { form } = StartSchema.parse(req.body);
    const assessment = await svc.start(req.user!.sub, form);
    res.status(201).json({ data: assessment });
  } catch (e) { next(e); }
}

export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = SubmitSchema.parse(req.body);
    const result = await svc.submit(req.params.id, payload);
    res.json({ data: result });
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const assessment = await svc.getById(req.params.id);
    res.json({ data: assessment });
  } catch (e) { next(e); }
}

export async function getByLearner(req: Request, res: Response, next: NextFunction) {
  try {
    const assessments = await svc.getByLearner(req.params.learnerId);
    res.json({ data: assessments });
  } catch (e) { next(e); }
}

export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const page  = Number(req.query.page  ?? 1);
    const limit = Number(req.query.limit ?? 50);
    const form  = req.query.form as string | undefined;
    const result = await svc.listAll({ page, limit, form });
    res.json({ data: result });
  } catch (e) { next(e); }
}
