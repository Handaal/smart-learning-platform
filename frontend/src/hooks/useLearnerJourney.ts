import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assessmentApi, learnerApi } from '@/services/api';
import {
  allowUnitsBeforePretest,
  useLearnerOnboardingProgress,
} from '@/features/learnerJourney';
import { useAuthStore } from '@/store/authStore';

export type LearnerJourneyStage =
  | 'pending_approval'
  | 'consent'
  | 'setup'
  | 'ready'
  | 'pretest'
  | 'training'
  | 'posttest'
  | 'completed';

function isCompletedAssessment(entry: unknown, form: 'pre' | 'post') {
  if (!entry || typeof entry !== 'object') return false;
  const row = entry as { form?: unknown; isComplete?: unknown };
  return String(row.form ?? '').toLowerCase() === form && Boolean(row.isComplete);
}

export function useLearnerJourney() {
  const learnerId = useAuthStore((state) => state.learnerId);
  const isActive = useAuthStore((state) => state.isActive);
  const setUser = useAuthStore((state) => state.setUser);
  const isEnabled = Boolean(learnerId);
  const onboardingProgress = useLearnerOnboardingProgress(learnerId);

  const consentQuery = useQuery({
    queryKey: ['journey', 'consent', learnerId],
    queryFn: () => learnerApi.getConsent(learnerId!),
    enabled: isEnabled,
    staleTime: 60_000,
  });

  const progressQuery = useQuery({
    queryKey: ['journey', 'progress', learnerId],
    queryFn: () => learnerApi.getProgress(learnerId!),
    enabled: isEnabled,
    staleTime: 20_000,
  });

  const assessmentsQuery = useQuery({
    queryKey: ['journey', 'assessments', learnerId],
    queryFn: () => assessmentApi.getByLearner(learnerId!),
    enabled: isEnabled,
    staleTime: 20_000,
  });

  useEffect(() => {
    const access = ((progressQuery.data as { data?: any } | undefined)?.data?.access ?? null) as
      | {
          isActive?: boolean;
          groupLabel?: string;
          groupEmotionTrackingEnabled?: boolean;
          emotionTrackingOverride?: boolean | null;
          emotionTrackingEnabled?: boolean;
        }
      | null;

    if (!access) return;

    setUser({
      isActive: typeof access.isActive === 'boolean' ? access.isActive : isActive,
      groupLabel: typeof access.groupLabel === 'string' ? access.groupLabel : undefined,
      groupEmotionTrackingEnabled:
        typeof access.groupEmotionTrackingEnabled === 'boolean'
          ? access.groupEmotionTrackingEnabled
          : undefined,
      emotionTrackingOverride:
        typeof access.emotionTrackingOverride === 'boolean' || access.emotionTrackingOverride === null
          ? access.emotionTrackingOverride
          : undefined,
      emotionTrackingEnabled:
        typeof access.emotionTrackingEnabled === 'boolean' ? access.emotionTrackingEnabled : undefined,
    });
  }, [isActive, progressQuery.data, setUser]);

  const state = useMemo(() => {
    const hasConsent = Boolean((consentQuery.data as { data?: unknown } | undefined)?.data);
    const assessmentRows = ((assessmentsQuery.data as { data?: unknown[] } | undefined)?.data ?? []) as unknown[];
    const hasPretest = assessmentRows.some((row) => isCompletedAssessment(row, 'pre'));
    const hasPosttest = assessmentRows.some((row) => isCompletedAssessment(row, 'post'));

    const progressData = ((progressQuery.data as { data?: any } | undefined)?.data ?? {}) as any;
    const summary = (progressData.summary ?? {}) as Record<string, unknown>;
    const totalUnits = Number(summary.totalUnits ?? 0);
    const completedUnits = Number(summary.completedUnits ?? 0);
    const allUnitsComplete = totalUnits > 0 && completedUnits >= totalUnits;

    let stage: LearnerJourneyStage = 'training';
    if (isActive === false) stage = 'pending_approval';
    else if (!hasConsent) stage = 'consent';
    else if (!hasPretest && !onboardingProgress.profileComplete) stage = 'setup';
    else if (!hasPretest && !onboardingProgress.readyAcknowledged) stage = 'ready';
    else if (!hasPretest) stage = 'pretest';
    else if (allUnitsComplete && !hasPosttest) stage = 'posttest';
    else if (allUnitsComplete && hasPosttest) stage = 'completed';

    return {
      stage,
      hasConsent,
      hasPretest,
      hasPosttest,
      allUnitsComplete,
      completedUnits,
      totalUnits,
      onboardingProgress,
      allowUnitsBeforePretest,
    };
  }, [assessmentsQuery.data, consentQuery.data, isActive, onboardingProgress, progressQuery.data]);

  return {
    ...state,
    isLoading: consentQuery.isLoading || progressQuery.isLoading || assessmentsQuery.isLoading,
    isError: consentQuery.isError || progressQuery.isError || assessmentsQuery.isError,
    refetch: async () => {
      await Promise.allSettled([consentQuery.refetch(), progressQuery.refetch(), assessmentsQuery.refetch()]);
    },
  };
}
