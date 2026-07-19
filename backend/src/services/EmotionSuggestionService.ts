import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import {
  CANONICAL_ADAPTIVE_SCENARIOS,
  type CanonicalAdaptiveScenarioKey,
  type CanonicalAdaptiveUiShape,
} from '../policy/adaptive-alerts-policy';

/**
 * Per-result emotion content suggestion layer (15-second cadence).
 *
 * Replaces the previous 5-minute dominant-emotion layer: on every behavior
 * window (~15s), the dominant classified emotion over the last SUGGESTION_WINDOW_MS
 * is computed and a content suggestion — shaped per emotion via the canonical
 * scenario uiShape — is pushed to the learner. It keeps its own Redis cooldown key
 * (~15s) and must never touch the `step:doctoral:intervention:{sessionId}` key used
 * by the fast AdaptiveEngine alerts.
 */

const SUGGESTION_WINDOW_MS = 15 * 1000;
const REDIS_TTL_SEC = 60 * 60;

const suggestionKey = (sessionId: string) => `step:doctoral:suggestion:${sessionId}`;

type SuggestibleEmotion =
  | 'confusion'
  | 'frustration'
  | 'boredom_disengagement'
  | 'high_engagement'
  | 'test_anxiety'
  | 'neutral';

const SUGGESTIBLE_EMOTIONS: SuggestibleEmotion[] = [
  'confusion',
  'frustration',
  'boredom_disengagement',
  'high_engagement',
  'test_anxiety',
  'neutral',
];

function isSuggestibleEmotion(value: string): value is SuggestibleEmotion {
  return (SUGGESTIBLE_EMOTIONS as string[]).includes(value);
}

export type ContentSuggestionPayload = {
  sessionId: string;
  scenarioKey: CanonicalAdaptiveScenarioKey;
  dominantEmotion: SuggestibleEmotion | 'no_face_low_confidence';
  intervention: string;
  uiShape: CanonicalAdaptiveUiShape;
  /** When true, show only the "safe continuity" header (no descriptive body) —
   *  used when an emotion is detected but the admin authored no content for it. */
  headerOnly: boolean;
  distribution: Array<{ state: string; count: number }>;
  contentId: string | null;
  contentTitle: string | null;
  windowSeconds: number;
  occurredAt: string;
};

type SuggestionInput = {
  sessionId: string;
  learnerId: string;
  episodeId?: string | null;
  emotionTrackingEnabled: boolean;
};

export async function maybeBuildEmotionSuggestion(
  input: SuggestionInput,
): Promise<ContentSuggestionPayload | null> {
  if (!input.emotionTrackingEnabled) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: input.sessionId },
      select: { startedAt: true, episodeId: true, isComplete: true },
    });
    if (!session || session.isComplete) return null;

    // ~15s cadence throttle (was a 5-minute window).
    const cooldownRaw = await redis.get(suggestionKey(input.sessionId));
    const lastSuggestionAt = cooldownRaw ? Number(cooldownRaw) : 0;
    if (Date.now() - lastSuggestionAt < SUGGESTION_WINDOW_MS) return null;

    const windowStartMs = Date.now() - SUGGESTION_WINDOW_MS;

    // Rank every classified state in the last window (including no_face) so we can
    // detect a camera-loss-dominated window as well as the dominant emotion.
    const grouped = await prisma.emotionEvent.groupBy({
      by: ['classifiedState'],
      _count: { classifiedState: true },
      where: {
        sessionId: input.sessionId,
        time: { gte: new Date(windowStartMs) },
        isBelowThreshold: false,
      },
    });
    if (grouped.length === 0) return null;

    const ranked = grouped
      .map((row) => ({ state: String(row.classifiedState), count: row._count.classifiedState }))
      .sort((a, b) => b.count - a.count);

    // Prefer the dominant *actionable* emotion whenever the window contains any
    // above-threshold emotion, so intermittent camera loss (no_face) can't mask a
    // real emotion. Only fall back to the camera-loss safety notice when the window
    // is essentially all no-face (no actionable emotion, and no_face outweighs neutral).
    const actionable = ranked.filter(
      (row) => isSuggestibleEmotion(row.state) && row.state !== 'neutral',
    );
    const noFaceCount = ranked.find((row) => row.state === 'no_face_low_confidence')?.count ?? 0;
    const neutralCount = ranked.find((row) => row.state === 'neutral')?.count ?? 0;

    const episodeId = input.episodeId ?? session.episodeId ?? null;

    let scenarioKey: CanonicalAdaptiveScenarioKey;
    let dominantEmotion: ContentSuggestionPayload['dominantEmotion'];
    let headerOnly = false;
    let content: { id: string; contentData: unknown } | null = null;

    if (actionable.length > 0) {
      const emotion = actionable[0].state as SuggestibleEmotion;
      dominantEmotion = emotion;
      // Only content the admin authored *for this emotion* counts — no baseline
      // fallback — so we can tell when nothing has been set for the detected emotion.
      if (episodeId) {
        content = await prisma.learningContent.findFirst({
          where: { episodeId, status: 'published', adaptiveTag: emotion as any },
          orderBy: { sequenceOrder: 'asc' },
          select: { id: true, contentData: true },
        });
      }
      if (content) {
        // Case C: a real emotion suggestion with authored content.
        scenarioKey = emotion as CanonicalAdaptiveScenarioKey;
      } else {
        // Case B: emotion detected but no content authored for it → show only the
        // "safe continuity" header (no descriptive body).
        scenarioKey = 'no_face_low_confidence';
        headerOnly = true;
      }
    } else if (noFaceCount > 0 && noFaceCount >= neutralCount) {
      // Case A: genuine camera loss → full safety notice (header + message).
      scenarioKey = 'no_face_low_confidence';
      dominantEmotion = 'no_face_low_confidence';
    } else {
      scenarioKey = 'neutral';
      dominantEmotion = 'neutral';
    }

    const scenario = CANONICAL_ADAPTIVE_SCENARIOS[scenarioKey];

    const contentTitle =
      content && content.contentData && typeof content.contentData === 'object'
        ? String((content.contentData as Record<string, unknown>).title ?? '') || null
        : null;

    const payload: ContentSuggestionPayload = {
      sessionId: input.sessionId,
      scenarioKey,
      dominantEmotion,
      intervention: scenario.intervention,
      uiShape: scenario.uiShape,
      headerOnly,
      distribution: ranked,
      contentId: content?.id ?? null,
      contentTitle,
      windowSeconds: Math.round(SUGGESTION_WINDOW_MS / 1000),
      occurredAt: new Date().toISOString(),
    };

    await prisma.adaptiveEvent.create({
      data: {
        sessionId: input.sessionId,
        learnerId: input.learnerId,
        episodeId,
        triggerType: 'per_result_emotion_suggestion',
        triggerPriority: 3,
        affectStatePre: dominantEmotion as any,
        behaviorSnapshot: {
          windowStart: new Date(windowStartMs).toISOString(),
          windowSeconds: payload.windowSeconds,
          distribution: ranked,
        } as any,
        intervention: scenario.intervention as any,
        contentId: content?.id ?? null,
      },
    });

    await redis.set(suggestionKey(input.sessionId), String(Date.now()), 'EX', REDIS_TTL_SEC);

    return payload;
  } catch (error) {
    logger.error('maybeBuildEmotionSuggestion failed', error);
    return null;
  }
}
