import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

export type CmiMap = Record<string, string>;

/** Parse a SCORM 1.2 CMITimespan ("HHHH:MM:SS.SS") into whole seconds. */
export function parseCmiTimespan(value: string | undefined | null): number | null {
  if (!value) return null;
  const parts = String(value).split(':');
  if (parts.length !== 3) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = Number(parts[2]);
  if ([hours, minutes, seconds].some((n) => !Number.isFinite(n))) return null;
  return Math.round(hours * 3600 + minutes * 60 + seconds);
}

function finiteOrNull(value: string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Collect cmi.interactions.N.* keys into a best-effort array of objects. */
function extractInteractions(cmi: CmiMap) {
  const byIndex = new Map<number, Record<string, string>>();
  for (const [key, value] of Object.entries(cmi)) {
    const match = key.match(/^cmi\.interactions\.(\d+)\.(.+)$/);
    if (!match) continue;
    const index = Number(match[1]);
    const field = match[2];
    if (field.endsWith('._count') || field.endsWith('._children')) continue;
    const entry = byIndex.get(index) ?? {};
    entry[field] = value;
    byIndex.set(index, entry);
  }
  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, fields]) => ({ index, ...fields }));
}

function normalizeStatus(raw: string | undefined): string {
  return (raw ?? 'not_attempted').trim().toLowerCase().replace(/\s+/g, '_');
}

function deriveFields(cmi: CmiMap) {
  const lessonStatus = normalizeStatus(cmi['cmi.core.lesson_status']);
  const completed = lessonStatus === 'passed' || lessonStatus === 'completed';
  return {
    lessonStatus,
    completed,
    scoreRaw: finiteOrNull(cmi['cmi.core.score.raw']),
    scoreMin: finiteOrNull(cmi['cmi.core.score.min']),
    scoreMax: finiteOrNull(cmi['cmi.core.score.max']),
    sessionTimeSec: parseCmiTimespan(cmi['cmi.core.session_time']),
    lessonLocation: cmi['cmi.core.lesson_location'] ?? null,
    suspendData: cmi['cmi.suspend_data'] ?? null,
    interactions: extractInteractions(cmi),
  };
}

export interface CommitInput {
  sessionId: string;
  contentId: string;
  scormId?: string;
  cmi: CmiMap;
}

export async function commitProgress(learnerId: string, input: CommitInput) {
  // A learner may only write progress for a session that is their own.
  const session = await prisma.session.findUnique({
    where: { id: input.sessionId },
    select: { learnerId: true },
  });
  if (!session) throw new AppError(404, 'الجلسة غير موجودة.', 'SESSION_NOT_FOUND');
  if (session.learnerId !== learnerId) {
    throw new AppError(403, 'لا يمكن حفظ تقدم جلسة لا تخص المشارك الحالي.', 'FORBIDDEN');
  }

  const derived = deriveFields(input.cmi);
  const existing = await prisma.scormProgress.findUnique({
    where: {
      learnerId_sessionId_contentId: {
        learnerId,
        sessionId: input.sessionId,
        contentId: input.contentId,
      },
    },
    select: { completedAt: true, totalTimeSec: true },
  });

  // Time-on-content: session_time from Rise grows over the session, so the max
  // observed value is the best single-row estimate without double counting.
  const totalTimeSec = Math.max(existing?.totalTimeSec ?? 0, derived.sessionTimeSec ?? 0) || null;
  const completedAt = derived.completed ? existing?.completedAt ?? new Date() : existing?.completedAt ?? null;

  const data = {
    scormId: input.scormId ?? null,
    lessonStatus: derived.lessonStatus,
    completed: derived.completed,
    scoreRaw: derived.scoreRaw,
    scoreMin: derived.scoreMin,
    scoreMax: derived.scoreMax,
    sessionTimeSec: derived.sessionTimeSec,
    totalTimeSec,
    lessonLocation: derived.lessonLocation,
    suspendData: derived.suspendData,
    cmiSnapshot: input.cmi as object,
    interactions: derived.interactions as object,
    completedAt,
  };

  return prisma.scormProgress.upsert({
    where: {
      learnerId_sessionId_contentId: {
        learnerId,
        sessionId: input.sessionId,
        contentId: input.contentId,
      },
    },
    create: {
      learnerId,
      sessionId: input.sessionId,
      contentId: input.contentId,
      commitCount: 1,
      ...data,
    },
    update: {
      commitCount: { increment: 1 },
      ...data,
    },
  });
}

/** Resume payload for a learner reopening a SCORM block. */
export async function getProgress(learnerId: string, sessionId: string, contentId: string) {
  const row = await prisma.scormProgress.findUnique({
    where: { learnerId_sessionId_contentId: { learnerId, sessionId, contentId } },
    select: {
      lessonStatus: true,
      completed: true,
      lessonLocation: true,
      suspendData: true,
      scoreRaw: true,
      totalTimeSec: true,
    },
  });
  return row;
}

/** Research-admin aggregate: every SCORM progress row with participant context. */
export async function listAllProgress() {
  const rows = await prisma.scormProgress.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      learner: { select: { participantId: true, cohort: true } },
      session: { select: { moduleId: true, module: { select: { title: true } } } },
    },
  });

  return rows.map((row) => ({
    participantId: row.learner.participantId,
    cohort: row.learner.cohort,
    moduleId: row.session.moduleId,
    moduleTitle: row.session.module?.title ?? null,
    contentId: row.contentId,
    lessonStatus: row.lessonStatus,
    completed: row.completed,
    scoreRaw: row.scoreRaw,
    scoreMax: row.scoreMax,
    totalTimeSec: row.totalTimeSec,
    commitCount: row.commitCount,
    completedAt: row.completedAt,
    updatedAt: row.updatedAt,
  }));
}
