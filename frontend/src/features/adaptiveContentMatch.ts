import {
  normalizeAdaptiveTag,
  type CanonicalAdaptiveScenarioKey,
} from '@policy/adaptive-alerts-policy';

/**
 * Single source of truth for "which authored content block should the learner
 * see for the detected emotion". Kept as pure functions (no React) so the exact
 * selection rule is testable and identical everywhere it is used.
 *
 * The backend emotion-suggestion service already picks the published block
 * authored for the dominant emotion and returns its id. The learner UI must show
 * THAT block — never a different one — regardless of how many emotion blocks a
 * lesson has or what order they are in.
 */

export type AdaptiveMatchElement = {
  id: string;
  adaptiveTag?: string | null;
  sequenceOrder: number;
  contentData: Record<string, unknown>;
};

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Score an element against the detected scenario.
 *  0 → an explicit authored trigger label matches the scenario (best)
 *  1 → the element's adaptiveTag matches the scenario
 * -1 → not a match for this scenario
 */
export function adaptiveMatchScore(
  element: AdaptiveMatchElement,
  state: CanonicalAdaptiveScenarioKey | null,
  adaptiveTags: string[],
): number {
  const displayTag = asText(element.contentData?.adaptiveTriggerLabel);
  if (displayTag && state && normalizeAdaptiveTag(displayTag) === state) return 0;
  if (
    element.adaptiveTag &&
    adaptiveTags.includes(normalizeAdaptiveTag(String(element.adaptiveTag)))
  ) {
    return 1;
  }
  return -1;
}

/** Every content block authored for the detected scenario, best match first. */
export function getEmotionCandidates<T extends AdaptiveMatchElement>(
  elements: T[],
  state: CanonicalAdaptiveScenarioKey | null,
  adaptiveTags: string[],
): T[] {
  return elements
    .map((element) => ({ element, score: adaptiveMatchScore(element, state, adaptiveTags) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score || a.element.sequenceOrder - b.element.sequenceOrder)
    .map((entry) => entry.element);
}

/**
 * Decide the single content block to display for the current reaction.
 *
 * Priority:
 *   1. An explicit learner choice, but ONLY when it is valid for the current
 *      scenario (prevents a stale choice from a previous emotion from winning).
 *   2. The exact block the backend selected for the detected emotion (by id).
 *   3. The best tag match for the scenario.
 */
export function resolveEmotionContent<T extends AdaptiveMatchElement>(params: {
  elements: T[];
  candidates: T[];
  backendContentId?: string | null;
  selectedElementId?: string | null;
}): T | null {
  const { elements, candidates, backendContentId, selectedElementId } = params;

  if (selectedElementId) {
    const chosen = candidates.find((element) => element.id === selectedElementId);
    if (chosen) return chosen;
    // A selection that is not valid for the current scenario is ignored so it
    // can never suppress the backend's pick for the new emotion.
  }

  if (backendContentId) {
    const byId =
      candidates.find((element) => element.id === backendContentId) ??
      elements.find((element) => element.id === backendContentId);
    if (byId) return byId;
  }

  return candidates[0] ?? null;
}
