import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

interface StartInput {
  moduleId:      string;
  episodeId?:    string;
  scaffoldLevel?: number;
  deviceInfo?:   Record<string, unknown>;
}

export async function startSession(learnerId: string, input: StartInput) {
  const firstEpisode = !input.episodeId
    ? await prisma.episode.findFirst({
        where: { moduleId: input.moduleId },
        orderBy: { sequenceOrder: 'asc' },
        select: { id: true },
      })
    : null;

  const episodeId = input.episodeId ?? firstEpisode?.id;

  // Determine scaffold level from learner profile if not provided
  let scaffold = input.scaffoldLevel ?? 3;
  if (!input.scaffoldLevel) {
    const profile = await prisma.learnerProfile.findUnique({ where: { learnerId } });
    if (profile?.moduleScaffoldStart) {
      const map = profile.moduleScaffoldStart as Record<string, number>;
      scaffold = map[input.moduleId] ?? 3;
    }
  }

  const session = await prisma.session.create({
    data: {
      learnerId,
      moduleId:     input.moduleId,
      episodeId,
      scaffoldLevel: scaffold,
      deviceInfo:   (input.deviceInfo ?? {}) as any,
    },
  });

  // Ensure module progress record exists
  await prisma.moduleProgress.upsert({
    where:  { learnerId_moduleId: { learnerId, moduleId: input.moduleId } },
    update: { status: 'in_progress', startedAt: new Date() },
    create: {
      learnerId, moduleId: input.moduleId,
      status: 'in_progress', startedAt: new Date(),
      currentScaffold: scaffold, attempts: 1,
    },
  });

  // Update last active timestamp
  await prisma.learner.update({
    where: { id: learnerId },
    data:  { lastActive: new Date() },
  });

  return session;
}

export async function getSession(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError(404, 'Session not found', 'NOT_FOUND');
  return session;
}

export async function updateSession(sessionId: string, data: {
  completionPct?: number;
  scaffoldLevel?: number;
  finalAffect?:   string;
  episodeId?:     string;
}) {
  return prisma.session.update({
    where: { id: sessionId },
    data:  data as any,
  });
}

export async function endSession(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError(404, 'Session not found', 'NOT_FOUND');

  const endedAt = new Date();
  const durationMin = (endedAt.getTime() - session.startedAt.getTime()) / 60000;

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { endedAt, durationMin, isComplete: true },
  });

  // Update module progress attempts counter and completion state
  await prisma.moduleProgress.updateMany({
    where: { learnerId: session.learnerId, moduleId: session.moduleId },
    data:  updated.completionPct >= 100
      ? {
          attempts: { increment: 1 },
          status: 'complete',
          completedAt: endedAt,
          currentScaffold: updated.scaffoldLevel,
          gatingPassed: true,
        }
      : {
          attempts: { increment: 1 },
          status: 'in_progress',
          currentScaffold: updated.scaffoldLevel,
        },
  });

  return updated;
}

export async function getSessionsByLearner(learnerId: string) {
  return prisma.session.findMany({
    where:   { learnerId },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true, moduleId: true, episodeId: true, startedAt: true,
      endedAt: true, durationMin: true, completionPct: true,
      scaffoldLevel: true, finalAffect: true, isComplete: true,
    },
  });
}

export async function listSessions(opts: {
  page: number; limit: number; cohort?: string; moduleId?: string;
}) {
  const { page, limit, cohort, moduleId } = opts;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (moduleId) where.moduleId = moduleId;
  if (cohort)   where.learner  = { cohort };

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where, skip, take: limit,
      orderBy: { startedAt: 'desc' },
      include: { learner: { select: { participantId: true, cohort: true } } },
    }),
    prisma.session.count({ where }),
  ]);

  return { data: sessions, total, page, limit };
}
