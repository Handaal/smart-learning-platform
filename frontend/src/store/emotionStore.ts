import { create } from 'zustand';
import type {
  AdaptiveTriggerSource,
  CanonicalAdaptiveIntervention,
  CanonicalAdaptiveScenarioKey,
  CanonicalAdaptiveUiShape,
  CanonicalEmotionState,
  CanonicalScenarioDefinition,
} from '@policy/adaptive-alerts-policy';
import {
  getScenarioDefinition,
  normalizeAdaptiveScenarioKey,
} from '@policy/adaptive-alerts-policy';

export type AffectState = CanonicalEmotionState;

export interface AdaptivePayload {
  scenarioKey: CanonicalAdaptiveScenarioKey;
  intervention: CanonicalAdaptiveIntervention;
  uiShape: CanonicalAdaptiveUiShape;
  triggerType: string;
  triggerSource: AdaptiveTriggerSource;
  triggerReason: string;
  contentId?: string;
  scaffoldFrom?: number;
  scaffoldTo?: number;
  cooldownSeconds?: number;
  fallbackModeActive?: boolean;
}

interface EmotionState {
  currentState: AffectState;
  confidence: number;
  webcamActive: boolean;
  webcamPaused: boolean;
  scaffoldLevel: number;
  pendingAdaptiveAlert: AdaptivePayload | null;

  setAffectState: (state: AffectState, confidence: number) => void;
  setWebcamActive: (active: boolean) => void;
  setWebcamPaused: (paused: boolean) => void;
  setScaffoldLevel: (level: number) => void;
  setPendingAdaptiveAlert: (payload: AdaptivePayload | null) => void;
}

type AdaptivePayloadInput = Record<string, unknown>;

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function coerceScenarioDefinition(
  payload: AdaptivePayloadInput & Partial<AdaptivePayload>,
): CanonicalScenarioDefinition {
  const scenarioToken =
    safeString(payload.scenarioKey) ??
    safeString(payload.triggerType) ??
    safeString(payload['matchedScenario']) ??
    safeString(payload['detectedAffect']);

  return getScenarioDefinition(normalizeAdaptiveScenarioKey(scenarioToken));
}

export function sanitizeAdaptivePayload(
  payload: AdaptivePayload | AdaptivePayloadInput | null | undefined,
): AdaptivePayload | null {
  if (!payload) return null;
  const raw = payload as AdaptivePayloadInput & Partial<AdaptivePayload>;

  const scenario = coerceScenarioDefinition(raw);
  return {
    scenarioKey: scenario.scenarioKey,
    intervention:
      (safeString(raw.intervention) as CanonicalAdaptiveIntervention | undefined) ??
      scenario.intervention,
    uiShape:
      (safeString(raw.uiShape) as CanonicalAdaptiveUiShape | undefined) ?? scenario.uiShape,
    triggerType: safeString(raw.triggerType) ?? scenario.loggingEvent,
    triggerSource:
      (safeString(raw.triggerSource) as AdaptiveTriggerSource | undefined) ??
      scenario.triggerSource,
    triggerReason: safeString(raw.triggerReason) ?? scenario.triggerReason,
    contentId: safeString(raw.contentId),
    scaffoldFrom: isNumber(raw.scaffoldFrom) ? raw.scaffoldFrom : undefined,
    scaffoldTo: isNumber(raw.scaffoldTo) ? raw.scaffoldTo : undefined,
    cooldownSeconds: isNumber(raw.cooldownSeconds) ? raw.cooldownSeconds : undefined,
    fallbackModeActive:
      Boolean(raw.fallbackModeActive) || scenario.scenarioKey === 'no_face_low_confidence',
  };
}

export const useEmotionStore = create<EmotionState>()((set) => ({
  currentState: 'neutral',
  confidence: 0,
  webcamActive: false,
  webcamPaused: false,
  scaffoldLevel: 3,
  pendingAdaptiveAlert: null,

  setAffectState: (state, confidence) => set({ currentState: state, confidence }),
  setWebcamActive: (active) => set({ webcamActive: active }),
  setWebcamPaused: (paused) => set({ webcamPaused: paused }),
  setScaffoldLevel: (level) => set({ scaffoldLevel: level }),
  setPendingAdaptiveAlert: (payload) =>
    set({ pendingAdaptiveAlert: sanitizeAdaptivePayload(payload) }),
}));
