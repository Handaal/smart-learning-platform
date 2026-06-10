import type { AUVector, AffectState } from '../types';

interface ClassificationResult {
  state: AffectState;
  confidence: number;
  modelVersion: string;
}

const MODEL_VERSION = 'rf-v1.0';
const FALLBACK_MODEL_VERSION = 'local-rules-v2';
const SERVICE_ERROR_COOLDOWN_MS = 30_000;
const AUTH_ERROR_COOLDOWN_MS = 120_000;

/**
 * AffectClassifier — HTTP Client for AI Service
 * Connects to the Python FastAPI microservice for emotion classification.
 */
export class AffectClassifier {
  // Session-level state cache (sessionId → last classified state)
  private stateCache: Map<string, AffectState> = new Map();
  private serviceFailureStreak = 0;
  private serviceCooldownUntilMs = 0;

  private clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
  }

  private localRuleClassify(auVector: AUVector): ClassificationResult {
    const au1 = auVector.au1 ?? 0;
    const au4 = auVector.au4 ?? 0;
    const au6 = auVector.au6 ?? 0;
    const au12 = auVector.au12 ?? 0;
    const au20 = auVector.au20 ?? 0;
    const au23 = auVector.au23 ?? 0;

    const strainScore = this.clamp01(au23 * 0.46 + au20 * 0.32 + au4 * 0.22);
    const uncertaintyScore = this.clamp01(au1 * 0.52 + au4 * 0.24 + au20 * 0.24);
    const positiveScore = this.clamp01(au6 * 0.42 + au12 * 0.58);
    const activationPeak = Math.max(au1, au4, au6, au12, au20, au23);

    if (strainScore >= 0.62 && positiveScore < 0.46) {
      return {
        state: 'frustration',
        confidence: this.clamp01(0.58 + (strainScore - 0.62) * 1.2),
        modelVersion: FALLBACK_MODEL_VERSION,
      };
    }

    if (uncertaintyScore >= 0.56 && strainScore < 0.7) {
      return {
        state: 'confusion',
        confidence: this.clamp01(0.56 + (uncertaintyScore - 0.56) * 1.25),
        modelVersion: FALLBACK_MODEL_VERSION,
      };
    }

    if (positiveScore >= 0.54 && strainScore < 0.46) {
      return {
        state: 'high_engagement',
        confidence: this.clamp01(0.58 + (positiveScore - 0.54) * 1.25),
        modelVersion: FALLBACK_MODEL_VERSION,
      };
    }

    const lowActivationPattern =
      activationPeak < 0.23 ||
      (au1 < 0.24 && au4 < 0.24 && au6 < 0.24 && au12 < 0.24 && au20 < 0.24 && au23 < 0.24);

    if (lowActivationPattern) {
      return {
        state: 'boredom_disengagement',
        confidence: this.clamp01(0.58 + (0.24 - Math.min(activationPeak, 0.24))),
        modelVersion: FALLBACK_MODEL_VERSION,
      };
    }

    return {
      state: 'neutral',
      confidence: 0.62,
      modelVersion: FALLBACK_MODEL_VERSION,
    };
  }

  async classify(sessionId: string, learnerId: string, auVector: AUVector): Promise<ClassificationResult> {
    // Reject low-confidence frame locally
    if (auVector.confidence < 0.5) {
      return { state: 'no_face_low_confidence', confidence: auVector.confidence, modelVersion: MODEL_VERSION };
    }

    if (Date.now() < this.serviceCooldownUntilMs) {
      const local = this.localRuleClassify(auVector);
      this.stateCache.set(sessionId, local.state);
      return local;
    }

    try {
      const url = `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/affect/classify`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const res = await (async () => {
        try {
          return await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.AI_SERVICE_API_KEY || 'dev-key',
            },
            signal: controller.signal,
            body: JSON.stringify({
              session_id: sessionId,
              learner_id: learnerId,
              au_vector: auVector,
            }),
          });
        } finally {
          clearTimeout(timeout);
        }
      })();

      if (!res.ok) {
        throw new Error(`AI service Error: ${res.status}`);
      }

      const data = (await res.json()) as ClassificationResult;
      this.serviceFailureStreak = 0;
      this.serviceCooldownUntilMs = 0;
      this.stateCache.set(sessionId, data.state);
      return data;
    } catch (err) {
      this.serviceFailureStreak += 1;
      const message = err instanceof Error ? err.message : 'Unknown classifier error';
      const authFailure = message.includes('401') || message.includes('403');
      if (authFailure || this.serviceFailureStreak >= 3) {
        this.serviceCooldownUntilMs =
          Date.now() + (authFailure ? AUTH_ERROR_COOLDOWN_MS : SERVICE_ERROR_COOLDOWN_MS);
      }

      console.error('FastAPI Affect Classifier Error:', err);
      const local = this.localRuleClassify(auVector);
      this.stateCache.set(sessionId, local.state);
      return local;
    }
  }

  getCurrentState(sessionId: string): AffectState {
    return this.stateCache.get(sessionId) ?? 'neutral';
  }

  clearSession(sessionId: string): void {
    this.stateCache.delete(sessionId);
  }
}
