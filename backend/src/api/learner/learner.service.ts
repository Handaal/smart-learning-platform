import crypto from 'crypto';
import { Request } from 'express';
import { prisma } from '../../lib/prisma';
import { cache, redis } from '../../lib/redis';
import { AppError } from '../../middleware/errorHandler';
import {
  buildEffectiveEmotionTrackingEnabled,
  clearLearnerAccessCache,
  resolveCohortSettings,
  resolveLearnerAccessSnapshot,
} from '../../services/learnerAccess';

const COMPETENCY_KEYS = ['scoping', 'planning', 'communication', 'risk', 'decisions'] as const;

export async function getProfile(learnerId: string) {
  const cacheKey = `learner:profile:${learnerId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const learner = await prisma.learner.findUnique({
    where: { id: learnerId },
    include: { learnerProfile: true },
  });
  if (!learner) throw new AppError(404, 'Learner not found', 'NOT_FOUND');

  const result = { ...learner };
  await cache.set(cacheKey, result, 300);
  return result;
}

export async function updateProfile(learnerId: string, data: Record<string, unknown>) {
  // Convert camelCase keys to snake_case for Prisma
  const updated = await prisma.learnerProfile.upsert({
    where: { learnerId },
    update: data as any,
    create: { learnerId, ...(data as any) },
  });
  await cache.del(`learner:profile:${learnerId}`);
  return updated;
}

export async function getLatestConsent(learnerId: string) {
  return prisma.consentRecord.findFirst({
    where: { learnerId, withdrawalRequestedAt: null },
    orderBy: { recordedAt: 'desc' },
  });
}

export async function recordConsent(
  learnerId: string,
  data: Record<string, unknown>,
  req: Request,
) {
  // Hash IP and user-agent for audit trail (no raw PII stored)
  const ipRaw = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress ?? '';
  const uaRaw = req.headers['user-agent'] ?? '';
  const ipHash = crypto.createHash('sha256').update(ipRaw).digest('hex');
  const uaHash = crypto.createHash('sha256').update(uaRaw).digest('hex');

  return prisma.consentRecord.create({
    data: { learnerId, ipHash, userAgentHash: uaHash, ...(data as any) },
  });
}

export async function withdrawConsent(learnerId: string) {
  // Mark all active consent records as withdrawn
  await prisma.consentRecord.updateMany({
    where: { learnerId, withdrawalRequestedAt: null },
    data: { withdrawalRequestedAt: new Date() },
  });
  // In production: queue async data deletion job here
}

export async function getProgress(learnerId: string) {
  const access = await resolveLearnerAccessSnapshot(learnerId);
  const [moduleProgressRows, modules, latestCompetency, sessions] = await Promise.all([
    prisma.moduleProgress.findMany({
      where: { learnerId },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            sequenceOrder: true,
            isAssessable: true,
          },
        },
      },
    }),
    prisma.module.findMany({
      where: { status: 'published' },
      orderBy: { sequenceOrder: 'asc' },
      select: {
        id: true,
        title: true,
        sequenceOrder: true,
        isAssessable: true,
      },
    }),
    prisma.competencyRecord.findFirst({
      where: { learnerId },
      orderBy: { recordedAt: 'desc' },
    }),
    prisma.session.findMany({
      where: { learnerId },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        moduleId: true,
        episodeId: true,
        startedAt: true,
        endedAt: true,
        durationMin: true,
        completionPct: true,
        isComplete: true,
        finalAffect: true,
      },
    }),
  ]);

  const moduleProgressMap = new Map(moduleProgressRows.map((row) => [row.moduleId, row]));
  const episodeIds = [...new Set(sessions.map((row) => row.episodeId).filter(Boolean) as string[])];
  const episodes = episodeIds.length
    ? await prisma.episode.findMany({
        where: { id: { in: episodeIds } },
        select: { id: true, title: true, moduleId: true, sequenceOrder: true },
      })
    : [];
  const episodeMap = new Map(episodes.map((episode) => [episode.id, episode]));

  const moduleProgress = modules.map((module, index) => {
    const progress = moduleProgressMap.get(module.id);
    const status = progress?.status ?? 'not_started';
    const previousModule = index > 0 ? modules[index - 1] : null;
    const previousStatus = previousModule
      ? (moduleProgressMap.get(previousModule.id)?.status ?? 'not_started')
      : 'complete';
    const isLocked = status === 'not_started' && previousModule !== null && previousStatus !== 'complete';
    const unlockReason = isLocked
      ? (previousModule?.isAssessable
        ? 'complete_previous_unit_and_pass_checkpoint'
        : 'complete_previous_unit')
      : null;

    return {
      ...progress,
      moduleId: module.id,
      module,
      status,
      isLocked,
      unlockReason,
      isPublished: true,
    };
  });

  const currentModule = moduleProgress.find((item) => item.status === 'in_progress')
    ?? moduleProgress.find((item) => item.status !== 'complete')
    ?? moduleProgress[moduleProgress.length - 1]
    ?? null;
  const completedUnits = moduleProgress.filter((item) => item.status === 'complete').length;
  const totalUnits = moduleProgress.length;
  const remainingUnits = Math.max(totalUnits - completedUnits, 0);
  const overallProgressPct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  const resumableSession = sessions.find((session) => !session.isComplete) ?? null;
  const latestSession = sessions[0] ?? null;
  const resumeBase = resumableSession ?? latestSession;
  const resumeEpisode = resumeBase?.episodeId ? episodeMap.get(resumeBase.episodeId) : null;

  const nextRequiredStep = !currentModule
    ? 'start_first_unit'
    : currentModule.status === 'not_started' && currentModule.isLocked
      ? (currentModule.unlockReason ?? 'complete_previous_unit')
      : resumableSession
        ? 'resume_current_activity'
        : currentModule.status === 'in_progress'
          ? 'continue_current_unit'
          : 'start_next_unit';

  const resume = resumeBase
    ? {
        sessionId: resumeBase.id,
        resumable: !resumeBase.isComplete,
        moduleId: resumeBase.moduleId,
        moduleTitle: moduleProgress.find((item) => item.moduleId === resumeBase.moduleId)?.module?.title ?? resumeBase.moduleId,
        lessonId: resumeBase.episodeId ?? null,
        lessonTitle: resumeEpisode?.title ?? resumeBase.episodeId ?? null,
        activityId: resumeBase.episodeId ?? null,
        completionPct: Number(resumeBase.completionPct ?? 0),
        nextStep: !resumeBase.isComplete ? 'resume_session' : 'review_or_start_next_unit',
      }
    : null;

  const sessionCount = sessions.length;
  const completedSessions = sessions.filter((session) => session.isComplete).length;
  const currentUnitSessions = currentModule
    ? sessions.filter((session) => session.moduleId === currentModule.moduleId)
    : [];
  const currentUnitProgressPct = currentUnitSessions.length
    ? Math.round(
        currentUnitSessions.reduce((sum, row) => sum + Number(row.completionPct ?? 0), 0) / currentUnitSessions.length,
      )
    : (currentModule?.status === 'complete' ? 100 : 0);

  const competencyVector: number[] = latestCompetency
    ? [latestCompetency.c1, latestCompetency.c2, latestCompetency.c3, latestCompetency.c4, latestCompetency.c5]
      .map((value) => Number(value ?? 0))
    : [0, 0, 0, 0, 0];
  const strongestIndex = competencyVector.reduce((best, current, idx, arr) => (arr[best] >= current ? best : idx), 0);
  const weakestIndex = competencyVector.reduce((weak, current, idx, arr) => (arr[weak] <= current ? weak : idx), 0);
  const strongestValue = Number(competencyVector[strongestIndex] ?? 0);
  const weakestValue = Number(competencyVector[weakestIndex] ?? 0);

  const competencyInsights = latestCompetency
    ? {
        strongest: {
          key: COMPETENCY_KEYS[strongestIndex],
          value: strongestValue,
          reason: strongestValue >= 0.75 ? 'consistently_high_performance' : 'developing_strength',
        },
        weakest: {
          key: COMPETENCY_KEYS[weakestIndex],
          value: weakestValue,
          reason: weakestValue <= 0.5 ? 'requires_guided_practice' : 'needs_more_repetition',
        },
        recommendedFocus: {
          key: COMPETENCY_KEYS[weakestIndex],
          reason: weakestValue <= 0.5 ? 'priority_remedial_focus' : 'maintain_growth_momentum',
        },
      }
    : null;

  const supportPrompts = [
    resume?.resumable
      ? {
          type: 'resume_support',
          messageKey: 'resume_incomplete_session',
          moduleId: resume.moduleId,
        }
      : null,
    competencyInsights?.weakest
      ? {
          type: 'competency_focus',
          messageKey: 'review_weakest_competency',
          competencyKey: competencyInsights.weakest.key,
        }
      : null,
    competencyInsights?.strongest
      ? {
          type: 'challenge_prompt',
          messageKey: 'unlock_enrichment_path',
          competencyKey: competencyInsights.strongest.key,
        }
      : null,
  ].filter(Boolean);

  const recentSessions = sessions.slice(0, 8).map((session) => {
    const episode = session.episodeId ? episodeMap.get(session.episodeId) : null;
    const status = session.isComplete ? 'completed' : 'interrupted';
    const nextAction = session.isComplete ? 'review_module' : 'resume_session';
    return {
      id: session.id,
      moduleId: session.moduleId,
      moduleTitle: moduleProgress.find((item) => item.moduleId === session.moduleId)?.module?.title ?? session.moduleId,
      lessonId: session.episodeId,
      lessonTitle: episode?.title ?? session.episodeId ?? null,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationMin: session.durationMin,
      completionPct: session.completionPct,
      status,
      resumable: !session.isComplete,
      nextAction,
      finalAffect: session.finalAffect,
    };
  });

  return {
    access,
    moduleProgress,
    latestCompetency: latestCompetency ?? null,
    sessionCount,
    completedSessions,
    summary: {
      totalUnits,
      completedUnits,
      remainingUnits,
      overallProgressPct,
      currentUnitId: currentModule?.moduleId ?? null,
      currentUnitTitle: currentModule?.module?.title ?? null,
      currentUnitProgressPct,
      latestSessionId: latestSession?.id ?? null,
      nextRequiredStep,
    },
    resume,
    competencyInsights,
    supportPrompts,
    recentSessions,
  };
}

export async function listLearners(opts: { page: number; limit: number; cohort?: string }) {
  const { page, limit, cohort } = opts;
  const skip = (page - 1) * limit;
  const where = {
    role: 'learner' as const,
    ...(cohort ? { cohort: cohort as any } : {}),
  };

  const [learners, total] = await Promise.all([
    prisma.learner.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true, participantId: true, cohort: true,
        createdAt: true, lastActive: true, isActive: true,
        emotionTrackingOverride: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.learner.count({ where }),
  ]);

  const groups = await Promise.all([
    resolveCohortSettings('experimental'),
    resolveCohortSettings('control'),
  ]);
  const groupMap = new Map(groups.map((group) => [group.cohort, group]));

  return {
    data: learners.map((learner) => {
      const group = groupMap.get(learner.cohort as 'experimental' | 'control');
      const groupEmotionTrackingEnabled = group?.emotionTrackingEnabled ?? learner.cohort === 'experimental';
      return {
        ...learner,
        groupLabel: group?.label ?? learner.cohort,
        groupEmotionTrackingEnabled,
        emotionTrackingEnabled: buildEffectiveEmotionTrackingEnabled(
          groupEmotionTrackingEnabled,
          learner.emotionTrackingOverride,
        ),
      };
    }),
    total,
    page,
    limit,
  };
}

export async function getAdminOverview() {
  const [groupRows, learners, counts] = await Promise.all([
    Promise.all([resolveCohortSettings('experimental'), resolveCohortSettings('control')]),
    prisma.learner.findMany({
      where: { role: 'learner' },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        participantId: true,
        cohort: true,
        createdAt: true,
        lastActive: true,
        isActive: true,
        emotionTrackingOverride: true,
      },
    }),
    prisma.learner.groupBy({
      by: ['cohort'],
      where: { role: 'learner' },
      _count: { _all: true },
    }),
  ]);

  const countMap = new Map(counts.map((row) => [row.cohort, row._count._all]));
  const groupMap = new Map(groupRows.map((group) => [group.cohort, group]));

  return {
    groups: groupRows.map((group) => ({
      cohort: group.cohort,
      label: group.label,
      emotionTrackingEnabled: group.emotionTrackingEnabled,
      learnerCount: countMap.get(group.cohort) ?? 0,
    })),
    learners: learners.map((learner) => {
      const group = groupMap.get(learner.cohort as 'experimental' | 'control');
      const groupEmotionTrackingEnabled = group?.emotionTrackingEnabled ?? learner.cohort === 'experimental';
      return {
        ...learner,
        groupLabel: group?.label ?? learner.cohort,
        groupEmotionTrackingEnabled,
        emotionTrackingEnabled: buildEffectiveEmotionTrackingEnabled(
          groupEmotionTrackingEnabled,
          learner.emotionTrackingOverride,
        ),
      };
    }),
  };
}

export async function updateCohortEmotionTracking(
  cohort: 'experimental' | 'control',
  emotionTrackingEnabled: boolean,
) {
  const defaults = await resolveCohortSettings(cohort);
  const updated = await prisma.cohortSettings.upsert({
    where: { cohort: cohort as any },
    update: {
      label: defaults.label,
      emotionTrackingEnabled,
    },
    create: {
      cohort: cohort as any,
      label: defaults.label,
      emotionTrackingEnabled,
    },
  });

  clearLearnerAccessCache();

  return {
    cohort: updated.cohort,
    label: updated.label,
    emotionTrackingEnabled: updated.emotionTrackingEnabled,
  };
}

export async function updateLearnerAdminSettings(
  learnerId: string,
  changes: {
    isActive?: boolean;
    emotionTrackingOverride?: boolean | null;
  },
) {
  const learner = await prisma.learner.findUnique({
    where: { id: learnerId },
    select: { id: true, role: true },
  });

  if (!learner) throw new AppError(404, 'Learner not found', 'NOT_FOUND');
  if (learner.role !== 'learner') {
    throw new AppError(403, 'Only learner accounts can be managed here', 'FORBIDDEN');
  }

  const updated = await prisma.learner.update({
    where: { id: learnerId },
    data: {
      ...(typeof changes.isActive === 'boolean' ? { isActive: changes.isActive } : {}),
      ...(Object.prototype.hasOwnProperty.call(changes, 'emotionTrackingOverride')
        ? { emotionTrackingOverride: changes.emotionTrackingOverride ?? null }
        : {}),
    },
    select: {
      id: true,
      participantId: true,
      cohort: true,
      createdAt: true,
      lastActive: true,
      isActive: true,
      emotionTrackingOverride: true,
    },
  });

  clearLearnerAccessCache(learnerId);

  const access = await resolveLearnerAccessSnapshot(learnerId);
  return {
    ...updated,
    groupLabel: access.groupLabel,
    groupEmotionTrackingEnabled: access.groupEmotionTrackingEnabled,
    emotionTrackingEnabled: access.emotionTrackingEnabled,
  };
}

export async function deleteLearnerAccount(learnerId: string) {
  const learner = await prisma.learner.findUnique({
    where: { id: learnerId },
    select: { id: true, role: true },
  });

  if (!learner) throw new AppError(404, 'Learner not found', 'NOT_FOUND');
  if (learner.role !== 'learner') {
    throw new AppError(403, 'Only learner accounts can be deleted here', 'FORBIDDEN');
  }

  const quizAttemptIds = await prisma.quizAttempt.findMany({
    where: { learnerId },
    select: { id: true },
  });
  const sessionIds = await prisma.session.findMany({
    where: { learnerId },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.quizQuestionAttempt.deleteMany({
      where: { attemptId: { in: quizAttemptIds.map((row) => row.id) } },
    }),
    prisma.quizAttempt.deleteMany({ where: { learnerId } }),
    prisma.reflectionEntry.deleteMany({ where: { learnerId } }),
    prisma.artifactSubmission.deleteMany({ where: { learnerId } }),
    prisma.adaptiveEvent.deleteMany({ where: { learnerId } }),
    prisma.behaviorWindow.deleteMany({ where: { learnerId } }),
    prisma.emotionEvent.deleteMany({ where: { learnerId } }),
    prisma.session.deleteMany({ where: { learnerId } }),
    prisma.moduleProgress.deleteMany({ where: { learnerId } }),
    prisma.competencyRecord.deleteMany({ where: { learnerId } }),
    prisma.assessment.deleteMany({ where: { learnerId } }),
    prisma.pseAssessment.deleteMany({ where: { learnerId } }),
    prisma.consentRecord.deleteMany({ where: { learnerId } }),
    prisma.learnerProfile.deleteMany({ where: { learnerId } }),
    prisma.authCredential.deleteMany({ where: { learnerId } }),
    prisma.learner.delete({ where: { id: learnerId } }),
  ]);

  await redis.del(`refresh:${learnerId}`);
  clearLearnerAccessCache(learnerId);

  return {
    learnerId,
    deletedSessionCount: sessionIds.length,
  };
}
