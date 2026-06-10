-- CreateEnum
CREATE TYPE "CohortType" AS ENUM ('experimental', 'control');

-- CreateEnum
CREATE TYPE "AffectState" AS ENUM ('Flow', 'Confusion', 'Frustration', 'Anxiety', 'Boredom', 'Neutral', 'Unknown');

-- CreateEnum
CREATE TYPE "LearningPref" AS ENUM ('reading_first', 'video_first', 'simulation_first', 'discussion_first', 'no_preference');

-- CreateEnum
CREATE TYPE "ReflectionDepth" AS ENUM ('surface', 'analytical', 'critical');

-- CreateEnum
CREATE TYPE "InterventionType" AS ENUM ('hint', 'scaffold_up', 'scaffold_down', 'challenge', 'break_prompt', 'affirmation', 'none');

-- CreateEnum
CREATE TYPE "AssessmentForm" AS ENUM ('pre', 'mid', 'post', 'transfer');

-- CreateEnum
CREATE TYPE "CompetencySource" AS ENUM ('assessment', 'artifact', 'simulation');

-- CreateEnum
CREATE TYPE "ModuleProgressStatus" AS ENUM ('not_started', 'in_progress', 'gated', 'complete');

-- CreateTable
CREATE TABLE "learner" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "cohort" "CohortType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "learner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_profile" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "years_experience" INTEGER,
    "primary_role" TEXT,
    "organization_type" TEXT,
    "learning_pref" "LearningPref" NOT NULL DEFAULT 'no_preference',
    "baseline_c1" DOUBLE PRECISION,
    "baseline_c2" DOUBLE PRECISION,
    "baseline_c3" DOUBLE PRECISION,
    "baseline_c4" DOUBLE PRECISION,
    "baseline_c5" DOUBLE PRECISION,
    "pse_baseline" DOUBLE PRECISION,
    "emotion_neutral_au" JSONB,
    "frustration_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.70,
    "confusion_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.65,
    "module_scaffold_start" JSONB NOT NULL DEFAULT '{"M1":3,"M2":3,"M3":3,"M4":3,"M5":3}',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learner_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_record" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consent_version" TEXT NOT NULL DEFAULT '1.0',
    "participation" BOOLEAN NOT NULL DEFAULT false,
    "performance_data" BOOLEAN NOT NULL DEFAULT false,
    "facial_analysis" BOOLEAN NOT NULL DEFAULT false,
    "au_data_retention" BOOLEAN NOT NULL DEFAULT false,
    "text_sentiment" BOOLEAN NOT NULL DEFAULT false,
    "behavioral_tracking" BOOLEAN NOT NULL DEFAULT false,
    "data_sharing_research" BOOLEAN NOT NULL DEFAULT false,
    "data_open_dataset" BOOLEAN NOT NULL DEFAULT false,
    "followup_contact" BOOLEAN NOT NULL DEFAULT false,
    "data_retention_years" INTEGER NOT NULL DEFAULT 5,
    "withdrawal_requested_at" TIMESTAMP(3),
    "ip_hash" TEXT,
    "user_agent_hash" TEXT,

    CONSTRAINT "consent_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_credential" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "last_login" TIMESTAMP(3),
    "refresh_token" TEXT,
    "token_expires" TIMESTAMP(3),
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "primary_competency" TEXT,
    "secondary_competency" TEXT,
    "estimated_duration_min" INTEGER,
    "session_count" INTEGER,
    "sequence_order" INTEGER NOT NULL,
    "is_assessable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sequence_order" INTEGER NOT NULL,
    "base_scaffold" INTEGER NOT NULL DEFAULT 3,
    "expected_duration_min" INTEGER,
    "emotional_trigger_expected" "AffectState",
    "is_adaptive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branching_node" (
    "id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "node_key" TEXT NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "node_type" TEXT NOT NULL,

    CONSTRAINT "branching_node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branching_outcome" (
    "id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "option_label" TEXT NOT NULL,
    "outcome_text" TEXT NOT NULL,
    "stakeholder_effects" JSONB,
    "next_node_key" TEXT,
    "is_optimal" BOOLEAN NOT NULL DEFAULT false,
    "competency_signal" TEXT,

    CONSTRAINT "branching_outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "episode_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "duration_min" DOUBLE PRECISION,
    "completion_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scaffold_level" INTEGER NOT NULL DEFAULT 3,
    "initial_affect" "AffectState" NOT NULL DEFAULT 'Neutral',
    "final_affect" "AffectState",
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "device_info" JSONB NOT NULL DEFAULT '{}',
    "researcher_notes" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_progress" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "status" "ModuleProgressStatus" NOT NULL DEFAULT 'not_started',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "current_scaffold" INTEGER NOT NULL DEFAULT 3,
    "artifact_score" DOUBLE PRECISION,
    "gating_passed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "module_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emotion_event" (
    "id" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "episode_id" TEXT,
    "au1" DOUBLE PRECISION,
    "au4" DOUBLE PRECISION,
    "au6" DOUBLE PRECISION,
    "au12" DOUBLE PRECISION,
    "au20" DOUBLE PRECISION,
    "au23" DOUBLE PRECISION,
    "au_confidence" DOUBLE PRECISION,
    "classified_state" "AffectState" NOT NULL DEFAULT 'Unknown',
    "classification_confidence" DOUBLE PRECISION,
    "is_below_threshold" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "emotion_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavior_window" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "episode_id" TEXT,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "dwell_time_sec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scroll_events" INTEGER NOT NULL DEFAULT 0,
    "reread_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "click_rate_per_min" DOUBLE PRECISION,
    "task_progress_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "page_returns" INTEGER NOT NULL DEFAULT 0,
    "hint_requests" INTEGER NOT NULL DEFAULT 0,
    "abandonment_attempts" INTEGER NOT NULL DEFAULT 0,
    "typing_rate_wpm" DOUBLE PRECISION,
    "backspace_ratio" DOUBLE PRECISION,
    "derived_affect_signal" "AffectState",
    "dwell_exceeds_threshold" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "behavior_window_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adaptive_event" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "episode_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger_type" TEXT NOT NULL,
    "trigger_priority" INTEGER NOT NULL DEFAULT 2,
    "affect_state_pre" "AffectState" NOT NULL,
    "behavior_snapshot" JSONB NOT NULL,
    "intervention" "InterventionType" NOT NULL,
    "content_id" TEXT,
    "scaffold_from" INTEGER,
    "scaffold_to" INTEGER,
    "learner_response" TEXT,
    "response_latency_sec" DOUBLE PRECISION,
    "affect_state_post" "AffectState",
    "was_effective" BOOLEAN,

    CONSTRAINT "adaptive_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "form" "AssessmentForm" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "score_s1" INTEGER,
    "score_s2" INTEGER,
    "score_s3" INTEGER,
    "score_s4" INTEGER,
    "score_s5" INTEGER,
    "total_score" DOUBLE PRECISION,
    "rater_a_id" TEXT,
    "rater_b_id" TEXT,
    "irr_kappa" DOUBLE PRECISION,

    CONSTRAINT "assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competency_record" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "CompetencySource" NOT NULL,
    "module_id" TEXT,
    "assessment_id" TEXT,
    "c1" DOUBLE PRECISION,
    "c2" DOUBLE PRECISION,
    "c3" DOUBLE PRECISION,
    "c4" DOUBLE PRECISION,
    "c5" DOUBLE PRECISION,
    "composite" DOUBLE PRECISION,

    CONSTRAINT "competency_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pse_assessment" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "administered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wave" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "total_score" DOUBLE PRECISION,

    CONSTRAINT "pse_assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reflection_prompt" (
    "id" TEXT NOT NULL,
    "module_id" TEXT,
    "episode_id" TEXT,
    "prompt_text" TEXT NOT NULL,
    "min_words" INTEGER NOT NULL DEFAULT 150,
    "max_words" INTEGER NOT NULL DEFAULT 300,
    "sequence_order" INTEGER,

    CONSTRAINT "reflection_prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reflection_entry" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_text" TEXT NOT NULL,
    "word_count" INTEGER,
    "sentiment_valence" DOUBLE PRECISION,
    "sentiment_arousal" DOUBLE PRECISION,
    "reflection_depth" "ReflectionDepth",
    "self_reg_markers" TEXT[],
    "competency_concepts" TEXT[],
    "reflection_score" DOUBLE PRECISION,
    "auto_feedback" JSONB,
    "analysis_model_version" TEXT,

    CONSTRAINT "reflection_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact_submission" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "artifact_type" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "artifact_data" JSONB NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "auto_score" DOUBLE PRECISION,
    "auto_feedback" JSONB,
    "rubric_score" DOUBLE PRECISION,
    "rubric_feedback" TEXT,
    "scorer_id" TEXT,
    "scored_at" TIMESTAMP(3),

    CONSTRAINT "artifact_submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learner_participant_id_key" ON "learner"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "learner_profile_learner_id_key" ON "learner_profile"("learner_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credential_learner_id_key" ON "auth_credential"("learner_id");

-- CreateIndex
CREATE UNIQUE INDEX "branching_node_episode_id_node_key_key" ON "branching_node"("episode_id", "node_key");

-- CreateIndex
CREATE UNIQUE INDEX "module_progress_learner_id_module_id_key" ON "module_progress"("learner_id", "module_id");

-- CreateIndex
CREATE INDEX "emotion_event_learner_id_time_idx" ON "emotion_event"("learner_id", "time" DESC);

-- CreateIndex
CREATE INDEX "emotion_event_session_id_time_idx" ON "emotion_event"("session_id", "time" DESC);

-- CreateIndex
CREATE INDEX "behavior_window_session_id_window_start_idx" ON "behavior_window"("session_id", "window_start" DESC);

-- CreateIndex
CREATE INDEX "adaptive_event_learner_id_occurred_at_idx" ON "adaptive_event"("learner_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "adaptive_event_trigger_type_intervention_idx" ON "adaptive_event"("trigger_type", "intervention");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_learner_id_form_key" ON "assessment"("learner_id", "form");

-- CreateIndex
CREATE INDEX "competency_record_learner_id_recorded_at_idx" ON "competency_record"("learner_id", "recorded_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "pse_assessment_learner_id_wave_key" ON "pse_assessment"("learner_id", "wave");

-- AddForeignKey
ALTER TABLE "learner_profile" ADD CONSTRAINT "learner_profile_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_record" ADD CONSTRAINT "consent_record_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_credential" ADD CONSTRAINT "auth_credential_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode" ADD CONSTRAINT "episode_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branching_node" ADD CONSTRAINT "branching_node_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branching_outcome" ADD CONSTRAINT "branching_outcome_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "branching_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emotion_event" ADD CONSTRAINT "emotion_event_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emotion_event" ADD CONSTRAINT "emotion_event_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emotion_event" ADD CONSTRAINT "emotion_event_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_window" ADD CONSTRAINT "behavior_window_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_window" ADD CONSTRAINT "behavior_window_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_window" ADD CONSTRAINT "behavior_window_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adaptive_event" ADD CONSTRAINT "adaptive_event_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adaptive_event" ADD CONSTRAINT "adaptive_event_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adaptive_event" ADD CONSTRAINT "adaptive_event_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_record" ADD CONSTRAINT "competency_record_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_record" ADD CONSTRAINT "competency_record_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_record" ADD CONSTRAINT "competency_record_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pse_assessment" ADD CONSTRAINT "pse_assessment_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflection_prompt" ADD CONSTRAINT "reflection_prompt_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflection_prompt" ADD CONSTRAINT "reflection_prompt_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflection_entry" ADD CONSTRAINT "reflection_entry_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflection_entry" ADD CONSTRAINT "reflection_entry_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflection_entry" ADD CONSTRAINT "reflection_entry_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "reflection_prompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_submission" ADD CONSTRAINT "artifact_submission_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_submission" ADD CONSTRAINT "artifact_submission_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
