import { prisma } from '../lib/prisma';
import type { CohortType, UserRole } from '../types';

const DEFAULT_GROUP_CONFIG: Record<CohortType, { label: string; emotionTrackingEnabled: boolean }> = {
  experimental: {
    label: 'Experimental group demo',
    emotionTrackingEnabled: true,
  },
  control: {
    label: 'Control group demo',
    emotionTrackingEnabled: false,
  },
};

const SETTINGS_CACHE_TTL_MS = 15_000;
const learnerSettingsCache = new Map<string, { expiresAt: number; value: LearnerAccessSnapshot }>();

export type LearnerAccessSnapshot = {
  learnerId: string;
  participantId: string;
  role: UserRole;
  cohort: CohortType;
  groupLabel: string;
  isActive: boolean;
  groupEmotionTrackingEnabled: boolean;
  emotionTrackingOverride: boolean | null;
  emotionTrackingEnabled: boolean;
};

export function buildEffectiveEmotionTrackingEnabled(
  groupEmotionTrackingEnabled: boolean,
  emotionTrackingOverride: boolean | null | undefined,
) {
  return typeof emotionTrackingOverride === 'boolean'
    ? emotionTrackingOverride
    : groupEmotionTrackingEnabled;
}

export async function resolveCohortSettings(cohort: CohortType) {
  const row = await prisma.cohortSettings.findUnique({
    where: { cohort },
    select: {
      cohort: true,
      label: true,
      emotionTrackingEnabled: true,
    },
  });

  const fallback = DEFAULT_GROUP_CONFIG[cohort];
  return {
    cohort,
    label: row?.label ?? fallback.label,
    emotionTrackingEnabled: row?.emotionTrackingEnabled ?? fallback.emotionTrackingEnabled,
  };
}

export async function resolveLearnerAccessSnapshot(
  learnerId: string,
  options: { allowCache?: boolean } = {},
): Promise<LearnerAccessSnapshot> {
  const allowCache = options.allowCache ?? false;
  const cached = learnerSettingsCache.get(learnerId);
  if (allowCache && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const learner = await prisma.learner.findUnique({
    where: { id: learnerId },
    select: {
      id: true,
      participantId: true,
      role: true,
      cohort: true,
      isActive: true,
      emotionTrackingOverride: true,
    },
  });

  if (!learner) {
    throw new Error('Learner not found');
  }

  const cohortSettings = await resolveCohortSettings(learner.cohort as CohortType);
  const snapshot: LearnerAccessSnapshot = {
    learnerId: learner.id,
    participantId: learner.participantId,
    role: learner.role as UserRole,
    cohort: learner.cohort as CohortType,
    groupLabel: cohortSettings.label,
    isActive: learner.isActive,
    groupEmotionTrackingEnabled: cohortSettings.emotionTrackingEnabled,
    emotionTrackingOverride: learner.emotionTrackingOverride,
    emotionTrackingEnabled: buildEffectiveEmotionTrackingEnabled(
      cohortSettings.emotionTrackingEnabled,
      learner.emotionTrackingOverride,
    ),
  };

  learnerSettingsCache.set(learnerId, {
    expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS,
    value: snapshot,
  });

  return snapshot;
}

export function clearLearnerAccessCache(learnerId?: string) {
  if (learnerId) {
    learnerSettingsCache.delete(learnerId);
    return;
  }
  learnerSettingsCache.clear();
}
