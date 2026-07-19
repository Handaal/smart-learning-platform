import { Request, Response, NextFunction } from 'express';
import * as svc from './auth.service';
import { z } from 'zod';

const RegisterSchema = z.object({
  participantId: z.string().min(3).max(32).optional(),
  password: z.string().min(8).max(100),
  cohort:        z.enum(['experimental', 'control']),
  role:          z.enum(['learner', 'research_admin', 'researcher', 'admin']).default('learner'),
  consentAccepted: z.boolean().optional(),
});

const LoginSchema = z.object({
  participantId: z.string(),
  password:      z.string(),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = RegisterSchema.parse(req.body);
    const result = await svc.register(body);
    res.status(201).json({ data: result });
  } catch (e) { next(e); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = LoginSchema.parse(req.body);
    const tokens = await svc.login(body.participantId, body.password);
    res.json({ data: tokens });
  } catch (e) { next(e); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const tokens = await svc.refreshTokens(refreshToken);
    res.json({ data: tokens });
  } catch (e) { next(e); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.logout(req.user!.sub);
    res.json({ data: { message: 'Logged out' } });
  } catch (e) { next(e); }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const learner = await svc.getMe(req.user!.sub);
    res.json({ data: learner });
  } catch (e) { next(e); }
}
