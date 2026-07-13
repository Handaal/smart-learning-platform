-- Widen participant_id from VARCHAR(20) to VARCHAR(32) everywhere it appears.
-- Registration now accepts 3-32 character participant IDs.
-- The researcher compatibility views select participant_id directly, so they
-- must be dropped before the ALTER and recreated afterwards.

DROP VIEW IF EXISTS "participants";
DROP VIEW IF EXISTS "activity_logs";
DROP VIEW IF EXISTS "admin_simulations";
DROP VIEW IF EXISTS "assessment_attempts";
DROP VIEW IF EXISTS "engagement_snapshots";
DROP VIEW IF EXISTS "intervention_logs";
DROP VIEW IF EXISTS "research_exports";
DROP VIEW IF EXISTS "timeline_heatmaps";

ALTER TABLE "learner" ALTER COLUMN "participant_id" SET DATA TYPE VARCHAR(32);
ALTER TABLE "activity_log" ALTER COLUMN "participant_id" SET DATA TYPE VARCHAR(32);
ALTER TABLE "admin_simulation" ALTER COLUMN "participant_id" SET DATA TYPE VARCHAR(32);
ALTER TABLE "assessment_attempt" ALTER COLUMN "participant_id" SET DATA TYPE VARCHAR(32);
ALTER TABLE "engagement_snapshot" ALTER COLUMN "participant_id" SET DATA TYPE VARCHAR(32);
ALTER TABLE "intervention_log" ALTER COLUMN "participant_id" SET DATA TYPE VARCHAR(32);
ALTER TABLE "research_export" ALTER COLUMN "participant_id" SET DATA TYPE VARCHAR(32);
ALTER TABLE "timeline_heatmap" ALTER COLUMN "participant_id" SET DATA TYPE VARCHAR(32);

CREATE VIEW "participants" AS
  SELECT learner.id, learner.participant_id, learner.cohort, learner.created_at,
         learner.last_active, learner.is_active
  FROM learner;

CREATE VIEW "activity_logs" AS
  SELECT activity_log.id, activity_log.participant_id, activity_log.session_id,
         activity_log.module_id, activity_log.lesson_id, activity_log.activity_id,
         activity_log.occurred_at, activity_log.event_type, activity_log.event_name,
         activity_log.actor_role, activity_log.metadata
  FROM activity_log;

CREATE VIEW "admin_simulations" AS
  SELECT admin_simulation.id, admin_simulation.participant_id, admin_simulation.session_id,
         admin_simulation.lesson_id, admin_simulation.activity_id,
         admin_simulation.simulated_emotion, admin_simulation.matched_scenario,
         admin_simulation.threshold_snapshot, admin_simulation.preview_payload,
         admin_simulation.researcher_id, admin_simulation.metadata, admin_simulation.created_at
  FROM admin_simulation;

CREATE VIEW "assessment_attempts" AS
  SELECT assessment_attempt.id, assessment_attempt.assessment_id,
         assessment_attempt.participant_id, assessment_attempt.session_id,
         assessment_attempt.attempt_index, assessment_attempt.started_at,
         assessment_attempt.submitted_at, assessment_attempt.score,
         assessment_attempt.latency_sec, assessment_attempt.emotional_state,
         assessment_attempt.metadata
  FROM assessment_attempt;

CREATE VIEW "engagement_snapshots" AS
  SELECT engagement_snapshot.id, engagement_snapshot.participant_id,
         engagement_snapshot.session_id, engagement_snapshot.module_id,
         engagement_snapshot.lesson_id, engagement_snapshot.activity_id,
         engagement_snapshot.captured_at, engagement_snapshot.engagement_level,
         engagement_snapshot.emotion_confidence, engagement_snapshot.engagement_score,
         engagement_snapshot.interaction_rate, engagement_snapshot.inactivity_ms,
         engagement_snapshot.passive_exposure_sec, engagement_snapshot.metadata
  FROM engagement_snapshot;

CREATE VIEW "intervention_logs" AS
  SELECT intervention_log.id, intervention_log.participant_id, intervention_log.session_id,
         intervention_log.module_id, intervention_log.lesson_id, intervention_log.activity_id,
         intervention_log.occurred_at, intervention_log.detected_emotion,
         intervention_log.confidence, intervention_log.matched_scenario,
         intervention_log.chosen_action, intervention_log.learner_state_after_action,
         intervention_log.pedagogical_explanation, intervention_log.was_effective,
         intervention_log.metadata
  FROM intervention_log;

CREATE VIEW "research_exports" AS
  SELECT research_export.id, research_export.participant_id, research_export.session_id,
         research_export.export_type, research_export.export_format,
         research_export.requested_by, research_export.filter_params,
         research_export.status, research_export.file_name,
         research_export.created_at, research_export.completed_at
  FROM research_export;

CREATE VIEW "timeline_heatmaps" AS
  SELECT timeline_heatmap.id, timeline_heatmap.participant_id, timeline_heatmap.session_id,
         timeline_heatmap.module_id, timeline_heatmap.lesson_id, timeline_heatmap.activity_id,
         timeline_heatmap.captured_at, timeline_heatmap.detected_emotion,
         timeline_heatmap.confidence, timeline_heatmap.engagement_level,
         timeline_heatmap.adaptive_action, timeline_heatmap.post_action_outcome,
         timeline_heatmap.metadata
  FROM timeline_heatmap;
