import { useMemo, useSyncExternalStore } from 'react';

type LearnerOnboardingProgress = {
  profileComplete: boolean;
  readyAcknowledged: boolean;
};

const STORAGE_PREFIX = 'step-learner-onboarding';
const STORAGE_EVENT = 'step:learner-onboarding';
const EMPTY_PROGRESS: LearnerOnboardingProgress = {
  profileComplete: false,
  readyAcknowledged: false,
};

function normalizeBoolean(value: unknown) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function storageKey(learnerId: string) {
  return `${STORAGE_PREFIX}:${learnerId}`;
}

export const allowUnitsBeforePretest = normalizeBoolean(import.meta.env.VITE_ALLOW_UNITS_BEFORE_PRETEST);

export function readLearnerOnboardingProgress(learnerId: string | null | undefined): LearnerOnboardingProgress {
  if (!learnerId || typeof window === 'undefined') return EMPTY_PROGRESS;

  try {
    const raw = window.localStorage.getItem(storageKey(learnerId));
    if (!raw) return EMPTY_PROGRESS;

    const parsed = JSON.parse(raw) as Partial<LearnerOnboardingProgress> | null;
    return {
      profileComplete: Boolean(parsed?.profileComplete),
      readyAcknowledged: Boolean(parsed?.readyAcknowledged),
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function writeLearnerOnboardingProgress(
  learnerId: string | null | undefined,
  patch: Partial<LearnerOnboardingProgress>,
) {
  if (!learnerId || typeof window === 'undefined') return;

  const nextValue = {
    ...readLearnerOnboardingProgress(learnerId),
    ...patch,
  };

  window.localStorage.setItem(storageKey(learnerId), JSON.stringify(nextValue));
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { learnerId, nextValue } }));
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => undefined;

  const handler = () => onStoreChange();
  window.addEventListener(STORAGE_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(STORAGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

function progressSnapshot(learnerId: string | null | undefined) {
  const progress = readLearnerOnboardingProgress(learnerId);
  return `${progress.profileComplete ? '1' : '0'}|${progress.readyAcknowledged ? '1' : '0'}`;
}

export function useLearnerOnboardingProgress(learnerId: string | null | undefined) {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => progressSnapshot(learnerId),
    () => '0|0',
  );

  return useMemo(
    () => ({
      profileComplete: snapshot.startsWith('1|'),
      readyAcknowledged: snapshot.endsWith('|1'),
    }),
    [snapshot],
  );
}
