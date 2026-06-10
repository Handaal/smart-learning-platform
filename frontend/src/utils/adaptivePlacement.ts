import { normalizeAdaptiveTag } from '@policy/adaptive-alerts-policy';

type AdaptiveCandidate = {
  id: string;
  sequenceOrder: number;
  adaptiveTag?: string | null;
  contentData: Record<string, unknown>;
};

export type AdaptivePlacementMode = 'baseline' | 'before' | 'after' | 'instead';

export type AdaptiveInsertionPlan<T> = {
  mode: AdaptivePlacementMode;
  insertIndex: number;
  anchorIndex: number | null;
  anchorElement: T | null;
  replaceIndex: number | null;
};

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePlacementMode(value: unknown): AdaptivePlacementMode | null {
  const normalized = asText(value).toLowerCase();
  if (normalized === 'before' || normalized === 'after' || normalized === 'instead' || normalized === 'baseline') {
    return normalized;
  }
  return null;
}

export function getAdaptivePlacementMode(element: Pick<AdaptiveCandidate, 'adaptiveTag' | 'contentData'> | null | undefined) {
  if (!element || !element.adaptiveTag || normalizeAdaptiveTag(String(element.adaptiveTag)) === 'baseline') {
    return 'baseline';
  }

  return (
    normalizePlacementMode(element.contentData.journeyPlacementMode) ??
    normalizePlacementMode(element.contentData.placementMode) ??
    'after'
  );
}

export function getAdaptiveInsertionPlan<T extends AdaptiveCandidate>(
  baselineElements: T[],
  adaptiveElement: T | null | undefined,
): AdaptiveInsertionPlan<T> | null {
  if (!adaptiveElement) return null;

  const mode = getAdaptivePlacementMode(adaptiveElement);
  if (mode === 'baseline') {
    return {
      mode,
      insertIndex: baselineElements.length,
      anchorIndex: null,
      anchorElement: null,
      replaceIndex: null,
    };
  }

  if (!baselineElements.length) {
    return {
      mode,
      insertIndex: 0,
      anchorIndex: null,
      anchorElement: null,
      replaceIndex: null,
    };
  }

  const firstEqualOrLaterIndex = baselineElements.findIndex(
    (element) => element.sequenceOrder >= adaptiveElement.sequenceOrder,
  );

  if (mode === 'before') {
    const anchorIndex = firstEqualOrLaterIndex >= 0 ? firstEqualOrLaterIndex : Math.max(baselineElements.length - 1, 0);
    return {
      mode,
      insertIndex: anchorIndex,
      anchorIndex,
      anchorElement: baselineElements[anchorIndex] ?? null,
      replaceIndex: null,
    };
  }

  if (mode === 'instead') {
    const replaceIndex = firstEqualOrLaterIndex >= 0 ? firstEqualOrLaterIndex : baselineElements.length - 1;
    return {
      mode,
      insertIndex: Math.max(replaceIndex, 0),
      anchorIndex: replaceIndex >= 0 ? replaceIndex : null,
      anchorElement: baselineElements[replaceIndex] ?? null,
      replaceIndex: replaceIndex >= 0 ? replaceIndex : null,
    };
  }

  const anchorIndex = firstEqualOrLaterIndex >= 0 ? firstEqualOrLaterIndex : baselineElements.length - 1;
  return {
    mode,
    insertIndex: firstEqualOrLaterIndex >= 0 ? firstEqualOrLaterIndex + 1 : baselineElements.length,
    anchorIndex: anchorIndex >= 0 ? anchorIndex : null,
    anchorElement: baselineElements[anchorIndex] ?? null,
    replaceIndex: null,
  };
}

export function insertAdaptiveIntoBaseline<T extends AdaptiveCandidate>(
  baselineElements: T[],
  adaptiveElement: T | null | undefined,
) {
  if (!adaptiveElement) return { items: baselineElements, plan: null as AdaptiveInsertionPlan<T> | null };

  const plan = getAdaptiveInsertionPlan(baselineElements, adaptiveElement);
  if (!plan) return { items: baselineElements, plan: null };

  const items = [...baselineElements];
  if (plan.mode === 'instead' && plan.replaceIndex !== null && items[plan.replaceIndex]) {
    items.splice(plan.replaceIndex, 1, adaptiveElement);
    return { items, plan };
  }

  items.splice(plan.insertIndex, 0, adaptiveElement);
  return { items, plan };
}
