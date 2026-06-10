import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import type {
  AdaptiveContext,
  AdaptiveDecision,
  EngagementSnapshot,
  PerformanceSnapshot,
  RealtimeAdaptiveState,
} from '../types';

interface AdaptiveLedgerPayload {
  ctx: AdaptiveContext;
  realtime: RealtimeAdaptiveState;
  decision: AdaptiveDecision;
  engagement: EngagementSnapshot;
  performance: PerformanceSnapshot;
}

interface AdminSimulationPayload {
  participantId?: string | null;
  sessionId?: string | null;
  lessonId?: string | null;
  activityId?: string | null;
  simulatedEmotion: string;
  matchedScenario?: string | null;
  thresholds?: Record<string, unknown> | null;
  previewPayload?: Record<string, unknown> | null;
  researcherId?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface ResearchExportPayload {
  participantId?: string | null;
  sessionId?: string | null;
  exportType: string;
  exportFormat: string;
  requestedBy?: string | null;
  filters?: Record<string, unknown> | null;
  status?: 'requested' | 'generated' | 'failed';
  fileName?: string | null;
}

export class ResearchLedger {
  async logAdaptiveDecision(payload: AdaptiveLedgerPayload): Promise<void> {
    const { ctx, realtime, decision, engagement, performance } = payload;
    const timestamp = new Date();
    const moduleId = this.inferModuleId(ctx, realtime);
    const lessonId =
      realtime.context?.lessonId ??
      ctx.behaviorMetrics.currentLessonId ??
      ctx.episodeId ??
      null;
    const activityId =
      realtime.context?.activityId ??
      ctx.behaviorMetrics.currentActivityId ??
      null;
    const eventMetadata = {
      context: realtime.context ?? null,
      performance,
      feedbackLoop: decision.feedbackLoop,
      rationale: decision.rationale,
      sensorSnapshot: ctx.sensorSnapshot ?? null,
      scenarioKey: decision.scenarioKey,
      uiShape: decision.uiShape,
      triggerSource: decision.triggerSource,
      triggerReason: decision.triggerReason,
      fallbackModeActive: decision.fallbackModeActive ?? false,
    };

    await this.runSafely('log engagement snapshot', async () => {
      await prisma.$executeRaw`
        INSERT INTO engagement_snapshot (
          participant_id,
          session_id,
          module_id,
          lesson_id,
          activity_id,
          captured_at,
          engagement_level,
          emotion_confidence,
          engagement_score,
          interaction_rate,
          inactivity_ms,
          passive_exposure_sec,
          metadata
        ) VALUES (
          ${ctx.participantId},
          CAST(${ctx.sessionId} AS UUID),
          ${moduleId},
          ${lessonId},
          ${activityId},
          ${timestamp},
          ${engagement.engagementLevel},
          ${decision.emotionConfidence},
          ${engagement.score},
          ${engagement.interactionRate},
          ${engagement.inactivityMs},
          ${engagement.passiveExposureSec},
          CAST(${JSON.stringify(eventMetadata)} AS JSONB)
        )
      `;
    });

    await this.runSafely('log intervention record', async () => {
      await prisma.$executeRaw`
        INSERT INTO intervention_log (
          participant_id,
          session_id,
          module_id,
          lesson_id,
          activity_id,
          occurred_at,
          detected_emotion,
          confidence,
          matched_scenario,
          chosen_action,
          learner_state_after_action,
          pedagogical_explanation,
          metadata
        ) VALUES (
          ${ctx.participantId},
          CAST(${ctx.sessionId} AS UUID),
          ${moduleId},
          ${lessonId},
          ${activityId},
          ${timestamp},
          ${decision.detectedAffect},
          ${decision.emotionConfidence},
          ${decision.matchedScenario ?? decision.triggerType},
          ${decision.intervention},
          ${decision.learnerStateAfterAction},
          ${decision.rationale.pedagogicalBasis},
          CAST(${JSON.stringify(eventMetadata)} AS JSONB)
        )
      `;
    });

    await this.runSafely('log activity event', async () => {
      await prisma.$executeRaw`
        INSERT INTO activity_log (
          participant_id,
          session_id,
          module_id,
          lesson_id,
          activity_id,
          occurred_at,
          event_type,
          event_name,
          actor_role,
          metadata
        ) VALUES (
          ${ctx.participantId},
          CAST(${ctx.sessionId} AS UUID),
          ${moduleId},
          ${lessonId},
          ${activityId},
          ${timestamp},
          ${decision.intervention === 'do_nothing' ? 'monitoring' : 'adaptive_decision'},
          ${decision.triggerType},
          ${'system'},
          CAST(${JSON.stringify({
            intervention: decision.intervention,
            contentId: decision.contentId ?? null,
            scaffoldFrom: decision.scaffoldFrom ?? null,
            scaffoldTo: decision.scaffoldTo ?? null,
            rationale: decision.rationale,
          })} AS JSONB)
        )
      `;
    });

    await this.runSafely('log timeline heatmap entry', async () => {
      await prisma.$executeRaw`
        INSERT INTO timeline_heatmap (
          participant_id,
          session_id,
          module_id,
          lesson_id,
          activity_id,
          captured_at,
          detected_emotion,
          confidence,
          engagement_level,
          adaptive_action,
          post_action_outcome,
          metadata
        ) VALUES (
          ${ctx.participantId},
          CAST(${ctx.sessionId} AS UUID),
          ${moduleId},
          ${lessonId},
          ${activityId},
          ${timestamp},
          ${decision.detectedAffect},
          ${decision.emotionConfidence},
          ${engagement.engagementLevel},
          ${decision.intervention},
          ${decision.learnerStateAfterAction},
          CAST(${JSON.stringify({
            matchedScenario: decision.matchedScenario ?? decision.triggerType,
            performance,
            feedbackLoop: decision.feedbackLoop,
          })} AS JSONB)
        )
      `;
    });
  }

  async logAdminSimulation(payload: AdminSimulationPayload): Promise<void> {
    await this.runSafely('log admin simulation', async () => {
      await prisma.$executeRaw`
        INSERT INTO admin_simulation (
          participant_id,
          session_id,
          lesson_id,
          activity_id,
          simulated_emotion,
          matched_scenario,
          threshold_snapshot,
          preview_payload,
          researcher_id,
          metadata
        ) VALUES (
          ${payload.participantId ?? null},
          CAST(${payload.sessionId ?? null} AS UUID),
          ${payload.lessonId ?? null},
          ${payload.activityId ?? null},
          ${payload.simulatedEmotion},
          ${payload.matchedScenario ?? null},
          CAST(${JSON.stringify(payload.thresholds ?? {})} AS JSONB),
          CAST(${JSON.stringify(payload.previewPayload ?? {})} AS JSONB),
          ${payload.researcherId ?? null},
          CAST(${JSON.stringify(payload.metadata ?? {})} AS JSONB)
        )
      `;
    });
  }

  async logResearchExport(payload: ResearchExportPayload): Promise<void> {
    await this.runSafely('log research export', async () => {
      await prisma.$executeRaw`
        INSERT INTO research_export (
          participant_id,
          session_id,
          export_type,
          export_format,
          requested_by,
          filter_params,
          status,
          file_name
        ) VALUES (
          ${payload.participantId ?? null},
          CAST(${payload.sessionId ?? null} AS UUID),
          ${payload.exportType},
          ${payload.exportFormat},
          ${payload.requestedBy ?? null},
          CAST(${JSON.stringify(payload.filters ?? {})} AS JSONB),
          ${payload.status ?? 'generated'},
          ${payload.fileName ?? null}
        )
      `;
    });
  }

  private inferModuleId(ctx: AdaptiveContext, realtime: RealtimeAdaptiveState): string | null {
    if (realtime.context?.moduleId) return realtime.context.moduleId;

    const lessonId =
      realtime.context?.lessonId ??
      ctx.behaviorMetrics.currentLessonId ??
      ctx.episodeId;
    if (!lessonId) return null;

    const [prefix] = lessonId.split('-');
    return prefix || null;
  }

  private async runSafely(action: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const missingRelation =
        message.includes('does not exist') &&
        (message.includes('relation') || message.includes('table'));

      if (missingRelation) {
        logger.warn(`ResearchLedger: skipped ${action}; research migration is not applied yet`);
        return;
      }

      logger.warn(`ResearchLedger: failed to ${action}`, error);
    }
  }
}

export const researchLedger = new ResearchLedger();
