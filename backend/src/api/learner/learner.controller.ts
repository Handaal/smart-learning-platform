import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './learner.service';
import { AppError } from '../../middleware/errorHandler';

// Ensure learner can only access their own data (unless researcher/admin)
function assertOwnership(req: Request, targetId: string) {
  const { role, sub } = req.user!;
  if (role === 'learner' && sub !== targetId)
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
}

const ProfileUpdateSchema = z.object({
  yearsExperience:  z.number().int().min(0).max(40).optional(),
  primaryRole:      z.string().max(100).optional(),
  organizationType: z.string().max(100).optional(),
  learningPref:     z.enum(['reading_first','video_first','simulation_first','discussion_first','no_preference']).optional(),
  responseType:     z.string().max(50).optional(),
});

const ConsentSchema = z.object({
  consentVersion:      z.string().default('1.0'),
  participation:       z.boolean(),
  performanceData:     z.boolean(),
  facialAnalysis:      z.boolean().default(false),
  auDataRetention:     z.boolean().default(false),
  textSentiment:       z.boolean().default(false),
  behavioralTracking:  z.boolean().default(false),
  dataSharingResearch: z.boolean().default(false),
  dataOpenDataset:     z.boolean().default(false),
  followupContact:     z.boolean().default(false),
  dataRetentionYears:  z.number().int().min(1).max(10).default(5),
});

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    assertOwnership(req, req.params.id);
    const profile = await svc.getProfile(req.params.id);
    res.json({ data: profile });
  } catch (e) { next(e); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    assertOwnership(req, req.params.id);
    const body = ProfileUpdateSchema.parse(req.body);
    const updated = await svc.updateProfile(req.params.id, body);
    res.json({ data: updated });
  } catch (e) { next(e); }
}

export async function getConsent(req: Request, res: Response, next: NextFunction) {
  try {
    assertOwnership(req, req.params.id);
    const consent = await svc.getLatestConsent(req.params.id);
    res.json({ data: consent });
  } catch (e) { next(e); }
}

export async function recordConsent(req: Request, res: Response, next: NextFunction) {
  try {
    assertOwnership(req, req.params.id);
    const body = ConsentSchema.parse(req.body);
    const normalizedBody =
      req.user?.cohort === 'control'
        ? {
            ...body,
            // Control-group learners use the standard non-camera experience.
            facialAnalysis: false,
          }
        : body;
    const record = await svc.recordConsent(req.params.id, normalizedBody, req);
    res.status(201).json({ data: record });
  } catch (e) { next(e); }
}

export async function withdrawConsent(req: Request, res: Response, next: NextFunction) {
  try {
    assertOwnership(req, req.params.id);
    await svc.withdrawConsent(req.params.id);
    res.json({ data: { message: 'Withdrawal recorded. Data deletion scheduled within 72 hours.' } });
  } catch (e) { next(e); }
}

export async function getProgress(req: Request, res: Response, next: NextFunction) {
  try {
    assertOwnership(req, req.params.id);
    const progress = await svc.getProgress(req.params.id);
    res.json({ data: progress });
  } catch (e) { next(e); }
}

export async function listLearners(req: Request, res: Response, next: NextFunction) {
  try {
    const page  = Number(req.query.page  ?? 1);
    const limit = Number(req.query.limit ?? 50);
    const cohort = req.query.cohort as string | undefined;
    const result = await svc.listLearners({ page, limit, cohort });
    res.json({ data: result });
  } catch (e) { next(e); }
}
