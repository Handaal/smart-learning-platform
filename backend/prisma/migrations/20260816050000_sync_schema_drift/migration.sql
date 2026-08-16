-- Reconciles schema.prisma with the migration history. Prior migrations
-- created AffectState with old capitalized values ('Flow', 'Confusion', ...)
-- while schema.prisma had already moved to the current lowercase set, and
-- several other columns/indexes/constraints drifted the same way (schema.prisma
-- was hand-edited without matching migrations being generated). A fresh
-- `prisma migrate deploy` produced a DB the seed script couldn't write to
-- (P22P02 invalid enum value). Body generated via `prisma migrate diff`
-- against a DB that had all 12 prior migrations applied and nothing else.
--
-- The researcher-facing compatibility views (see 20260408235500 and
-- 20260706120000) select columns straight through, so — same as those two
-- migrations — every view is dropped before altering its underlying table
-- and recreated afterwards.

-- DropViews (recreated at the end of this migration)
DROP VIEW IF EXISTS "activity_logs";
DROP VIEW IF EXISTS "adaptive_tags";
DROP VIEW IF EXISTS "admin_simulations";
DROP VIEW IF EXISTS "assessment_attempts";
DROP VIEW IF EXISTS "assessments";
DROP VIEW IF EXISTS "badges";
DROP VIEW IF EXISTS "consent_records";
DROP VIEW IF EXISTS "emotion_events";
DROP VIEW IF EXISTS "engagement_snapshots";
DROP VIEW IF EXISTS "intervention_logs";
DROP VIEW IF EXISTS "lesson_contents";
DROP VIEW IF EXISTS "lessons";
DROP VIEW IF EXISTS "modules";
DROP VIEW IF EXISTS "participant_profiles";
DROP VIEW IF EXISTS "participants";
DROP VIEW IF EXISTS "posttests";
DROP VIEW IF EXISTS "pretests";
DROP VIEW IF EXISTS "research_exports";
DROP VIEW IF EXISTS "scenario_actions";
DROP VIEW IF EXISTS "scenario_rules";
DROP VIEW IF EXISTS "sessions";
DROP VIEW IF EXISTS "timeline_heatmaps";

-- CreateEnum
CREATE TYPE "AdaptiveTag" AS ENUM ('baseline', 'confusion', 'frustration', 'boredom_disengagement', 'high_engagement', 'test_anxiety', 'neutral', 'no_face_low_confidence');

-- learning_content.adaptive_tag switches from AffectState to AdaptiveTag; it
-- must be dropped before AffectState_old is dropped below, or Postgres
-- refuses the DROP TYPE (column still depends on it).
ALTER TABLE "learning_content" DROP COLUMN "adaptive_tag",
ADD COLUMN     "adaptive_tag" "AdaptiveTag";

-- AlterEnum
BEGIN;
CREATE TYPE "AffectState_new" AS ENUM ('confusion', 'frustration', 'boredom_disengagement', 'high_engagement', 'test_anxiety', 'neutral', 'no_face_low_confidence');
ALTER TABLE "emotion_event" ALTER COLUMN "classified_state" DROP DEFAULT;
ALTER TABLE "session" ALTER COLUMN "initial_affect" DROP DEFAULT;
ALTER TABLE "episode" ALTER COLUMN "emotional_trigger_expected" TYPE "AffectState_new" USING ("emotional_trigger_expected"::text::"AffectState_new");
ALTER TABLE "session" ALTER COLUMN "initial_affect" TYPE "AffectState_new" USING ("initial_affect"::text::"AffectState_new");
ALTER TABLE "session" ALTER COLUMN "final_affect" TYPE "AffectState_new" USING ("final_affect"::text::"AffectState_new");
ALTER TABLE "emotion_event" ALTER COLUMN "classified_state" TYPE "AffectState_new" USING ("classified_state"::text::"AffectState_new");
ALTER TABLE "behavior_window" ALTER COLUMN "derived_affect_signal" TYPE "AffectState_new" USING ("derived_affect_signal"::text::"AffectState_new");
ALTER TABLE "adaptive_event" ALTER COLUMN "affect_state_pre" TYPE "AffectState_new" USING ("affect_state_pre"::text::"AffectState_new");
ALTER TABLE "adaptive_event" ALTER COLUMN "affect_state_post" TYPE "AffectState_new" USING ("affect_state_post"::text::"AffectState_new");
ALTER TYPE "AffectState" RENAME TO "AffectState_old";
ALTER TYPE "AffectState_new" RENAME TO "AffectState";
DROP TYPE "AffectState_old";
ALTER TABLE "emotion_event" ALTER COLUMN "classified_state" SET DEFAULT 'no_face_low_confidence';
ALTER TABLE "session" ALTER COLUMN "initial_affect" SET DEFAULT 'neutral';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "InterventionType_new" AS ENUM ('scaffolded_hint', 'worked_example', 'micro_learning_review', 'task_decomposition', 'supportive_message', 'interactive_case_switch', 'quick_decision_question', 'advanced_path', 'neutral_reassurance', 'operational_safety_protocol', 'do_nothing');
ALTER TABLE "adaptive_event" ALTER COLUMN "intervention" TYPE "InterventionType_new" USING ("intervention"::text::"InterventionType_new");
ALTER TYPE "InterventionType" RENAME TO "InterventionType_old";
ALTER TYPE "InterventionType_new" RENAME TO "InterventionType";
DROP TYPE "InterventionType_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuizScope" ADD VALUE 'pretest';
ALTER TYPE "QuizScope" ADD VALUE 'posttest';

-- DropForeignKey
ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_session_id_fkey";

-- DropForeignKey
ALTER TABLE "admin_simulation" DROP CONSTRAINT "admin_simulation_session_id_fkey";

-- DropForeignKey
ALTER TABLE "assessment_attempt" DROP CONSTRAINT "assessment_attempt_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "assessment_attempt" DROP CONSTRAINT "assessment_attempt_session_id_fkey";

-- DropForeignKey
ALTER TABLE "engagement_snapshot" DROP CONSTRAINT "engagement_snapshot_session_id_fkey";

-- DropForeignKey
ALTER TABLE "intervention_log" DROP CONSTRAINT "intervention_log_session_id_fkey";

-- DropForeignKey
ALTER TABLE "research_export" DROP CONSTRAINT "research_export_session_id_fkey";

-- DropForeignKey
ALTER TABLE "timeline_heatmap" DROP CONSTRAINT "timeline_heatmap_session_id_fkey";

-- DropIndex
DROP INDEX "assessment_attempt_assessment_idx";

-- AlterTable
ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "module_id" SET DATA TYPE TEXT,
ALTER COLUMN "lesson_id" SET DATA TYPE TEXT,
ALTER COLUMN "activity_id" SET DATA TYPE TEXT,
ALTER COLUMN "occurred_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "event_type" SET DATA TYPE TEXT,
ALTER COLUMN "event_name" SET DATA TYPE TEXT,
ALTER COLUMN "actor_role" SET DATA TYPE TEXT,
ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "adaptive_tag" DROP CONSTRAINT "adaptive_tag_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tag_key" SET DATA TYPE TEXT,
ALTER COLUMN "label" SET DATA TYPE TEXT,
ALTER COLUMN "priority" SET DATA TYPE INTEGER,
ALTER COLUMN "fallback_behavior" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "adaptive_tag_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "admin_simulation" DROP CONSTRAINT "admin_simulation_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "lesson_id" SET DATA TYPE TEXT,
ALTER COLUMN "activity_id" SET DATA TYPE TEXT,
ALTER COLUMN "simulated_emotion" SET DATA TYPE TEXT,
ALTER COLUMN "matched_scenario" SET DATA TYPE TEXT,
ALTER COLUMN "researcher_id" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "admin_simulation_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "assessment_attempt" DROP CONSTRAINT "assessment_attempt_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "attempt_index" SET DATA TYPE INTEGER,
ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "submitted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "latency_sec" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "emotional_state" SET DATA TYPE TEXT,
ADD CONSTRAINT "assessment_attempt_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "badge" DROP CONSTRAINT "badge_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "badge_key" SET DATA TYPE TEXT,
ALTER COLUMN "label" SET DATA TYPE TEXT,
ALTER COLUMN "icon_name" SET DATA TYPE TEXT,
ALTER COLUMN "trigger_rule_key" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "badge_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "emotion_event" ALTER COLUMN "classified_state" SET DEFAULT 'no_face_low_confidence';

-- AlterTable
ALTER TABLE "engagement_snapshot" DROP CONSTRAINT "engagement_snapshot_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "module_id" SET DATA TYPE TEXT,
ALTER COLUMN "lesson_id" SET DATA TYPE TEXT,
ALTER COLUMN "activity_id" SET DATA TYPE TEXT,
ALTER COLUMN "captured_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "engagement_level" SET DATA TYPE TEXT,
ALTER COLUMN "emotion_confidence" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "engagement_score" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "interaction_rate" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "passive_exposure_sec" SET DATA TYPE DOUBLE PRECISION,
ADD CONSTRAINT "engagement_snapshot_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "intervention_log" DROP CONSTRAINT "intervention_log_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "module_id" SET DATA TYPE TEXT,
ALTER COLUMN "lesson_id" SET DATA TYPE TEXT,
ALTER COLUMN "activity_id" SET DATA TYPE TEXT,
ALTER COLUMN "occurred_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "detected_emotion" SET DATA TYPE TEXT,
ALTER COLUMN "confidence" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "matched_scenario" SET DATA TYPE TEXT,
ALTER COLUMN "chosen_action" SET DATA TYPE TEXT,
ALTER COLUMN "learner_state_after_action" SET DATA TYPE TEXT,
ADD CONSTRAINT "intervention_log_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "learner_profile" ALTER COLUMN "confusion_threshold" SET DEFAULT 0.70,
ALTER COLUMN "response_type" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "research_export" DROP CONSTRAINT "research_export_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "export_type" SET DATA TYPE TEXT,
ALTER COLUMN "export_format" SET DATA TYPE TEXT,
ALTER COLUMN "requested_by" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "file_name" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "research_export_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "scenario_action" DROP CONSTRAINT "scenario_action_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "action_key" SET DATA TYPE TEXT,
ALTER COLUMN "scenario_rule_key" SET DATA TYPE TEXT,
ALTER COLUMN "pedagogical_action" SET DATA TYPE TEXT,
ALTER COLUMN "content_type" SET DATA TYPE TEXT,
ALTER COLUMN "badge_key" SET DATA TYPE TEXT,
ALTER COLUMN "difficulty_delta" SET DATA TYPE INTEGER,
ALTER COLUMN "scaffold_delta" SET DATA TYPE INTEGER,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "scenario_action_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "scenario_rule" DROP CONSTRAINT "scenario_rule_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "rule_key" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "trigger_emotion" SET DATA TYPE TEXT,
ALTER COLUMN "min_confidence" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "min_engagement_score" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "max_engagement_score" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "min_task_progress_pct" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "priority" SET DATA TYPE INTEGER,
ALTER COLUMN "fallback_action_key" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "scenario_rule_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "session" ALTER COLUMN "initial_affect" SET DEFAULT 'neutral';

-- AlterTable
ALTER TABLE "timeline_heatmap" DROP CONSTRAINT "timeline_heatmap_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "module_id" SET DATA TYPE TEXT,
ALTER COLUMN "lesson_id" SET DATA TYPE TEXT,
ALTER COLUMN "activity_id" SET DATA TYPE TEXT,
ALTER COLUMN "captured_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "detected_emotion" SET DATA TYPE TEXT,
ALTER COLUMN "confidence" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "engagement_level" SET DATA TYPE TEXT,
ALTER COLUMN "adaptive_action" SET DATA TYPE TEXT,
ALTER COLUMN "post_action_outcome" SET DATA TYPE TEXT,
ADD CONSTRAINT "timeline_heatmap_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "activity_log_participant_id_occurred_at_idx" ON "activity_log"("participant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "assessment_attempt_participant_id_started_at_idx" ON "assessment_attempt"("participant_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "engagement_snapshot_participant_id_captured_at_idx" ON "engagement_snapshot"("participant_id", "captured_at" DESC);

-- CreateIndex
CREATE INDEX "intervention_log_participant_id_occurred_at_idx" ON "intervention_log"("participant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "timeline_heatmap_participant_id_captured_at_idx" ON "timeline_heatmap"("participant_id", "captured_at" DESC);

-- RenameIndex
ALTER INDEX "activity_log_session_time_idx" RENAME TO "activity_log_session_id_occurred_at_idx";

-- RenameIndex
ALTER INDEX "admin_simulation_created_idx" RENAME TO "admin_simulation_created_at_idx";

-- RenameIndex
ALTER INDEX "engagement_snapshot_session_time_idx" RENAME TO "engagement_snapshot_session_id_captured_at_idx";

-- RenameIndex
ALTER INDEX "intervention_log_session_time_idx" RENAME TO "intervention_log_session_id_occurred_at_idx";

-- RenameIndex
ALTER INDEX "research_export_created_idx" RENAME TO "research_export_created_at_idx";

-- RenameIndex
ALTER INDEX "timeline_heatmap_session_time_idx" RENAME TO "timeline_heatmap_session_id_captured_at_idx";

-- RecreateViews (mirrors 20260408235500_doctoral_research_schema)
CREATE VIEW "participants" AS SELECT * FROM "learner";
CREATE VIEW "participant_profiles" AS SELECT * FROM "learner_profile";
CREATE VIEW "sessions" AS SELECT * FROM "session";
CREATE VIEW "modules" AS SELECT * FROM "module";
CREATE VIEW "lessons" AS SELECT * FROM "episode";
CREATE VIEW "lesson_contents" AS SELECT * FROM "learning_content";
CREATE VIEW "adaptive_tags" AS SELECT * FROM "adaptive_tag";
CREATE VIEW "scenario_rules" AS SELECT * FROM "scenario_rule";
CREATE VIEW "scenario_actions" AS SELECT * FROM "scenario_action";
CREATE VIEW "emotion_events" AS SELECT * FROM "emotion_event";
CREATE VIEW "engagement_snapshots" AS SELECT * FROM "engagement_snapshot";
CREATE VIEW "intervention_logs" AS SELECT * FROM "intervention_log";
CREATE VIEW "activity_logs" AS SELECT * FROM "activity_log";
CREATE VIEW "assessments" AS SELECT * FROM "assessment";
CREATE VIEW "pretests" AS SELECT * FROM "assessment" WHERE "form" = 'pre';
CREATE VIEW "posttests" AS SELECT * FROM "assessment" WHERE "form" = 'post';
CREATE VIEW "badges" AS SELECT * FROM "badge";
CREATE VIEW "consent_records" AS SELECT * FROM "consent_record";
CREATE VIEW "admin_simulations" AS SELECT * FROM "admin_simulation";
CREATE VIEW "assessment_attempts" AS SELECT * FROM "assessment_attempt";
CREATE VIEW "research_exports" AS SELECT * FROM "research_export";
CREATE VIEW "timeline_heatmaps" AS SELECT * FROM "timeline_heatmap";
