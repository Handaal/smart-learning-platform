-- ============================================================
-- STEP Platform — PostgreSQL Schema
-- Smart Training & Emotion Platform
-- ============================================================

-- ---- EXTENSIONS --------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- text similarity search

-- ---- ENUM TYPES --------------------------------------------

CREATE TYPE cohort_type AS ENUM ('experimental', 'control');

CREATE TYPE account_role_type AS ENUM ('learner', 'research_admin');

CREATE TYPE publish_status_type AS ENUM ('draft', 'published');

CREATE TYPE affect_state_type AS ENUM (
  'Flow', 'Confusion', 'Frustration', 'Anxiety', 'Boredom', 'Neutral', 'Unknown'
);

CREATE TYPE learning_pref_type AS ENUM (
  'reading_first', 'video_first', 'simulation_first', 'discussion_first', 'no_preference'
);

-- 1 (min support) → 4 (max support). A domain, not a type: CREATE TYPE ... AS
-- only accepts ENUM/RANGE/composite, so the old CREATE TYPE form was a syntax
-- error that aborted this whole script before any table was created.
CREATE DOMAIN scaffold_level_type AS SMALLINT CHECK (VALUE BETWEEN 1 AND 4);

CREATE TYPE reflection_depth_type AS ENUM ('surface', 'analytical', 'critical');

CREATE TYPE intervention_type AS ENUM (
  'hint', 'scaffold_up', 'scaffold_down', 'challenge',
  'break_prompt', 'affirmation', 'pause_and_check', 'reframe', 'none'
);

CREATE TYPE assessment_source_type AS ENUM ('pre', 'mid', 'post', 'transfer');

CREATE TYPE competency_source_type AS ENUM ('assessment', 'artifact', 'simulation');

-- ---- CORE TABLES -------------------------------------------

-- Learner — pseudonymized research identity
CREATE TABLE learner (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  VARCHAR(20) UNIQUE NOT NULL,
  cohort          cohort_type NOT NULL,
  role            account_role_type NOT NULL DEFAULT 'learner',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- PII stored separately, linked by participant_id only
CREATE TABLE learner_pii (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  VARCHAR(20) UNIQUE NOT NULL REFERENCES learner(participant_id),
  encrypted_name  BYTEA,        -- AES-256 encrypted at app layer
  encrypted_email BYTEA,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Learner profile — baseline and personalization data
CREATE TABLE learner_profile (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id            UUID NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
  years_experience      SMALLINT CHECK (years_experience BETWEEN 0 AND 40),
  primary_role          VARCHAR(100),
  organization_type     VARCHAR(100),
  learning_pref         learning_pref_type DEFAULT 'no_preference',
  -- Baseline competency scores (0.0–1.0)
  baseline_c1           NUMERIC(4,3) CHECK (baseline_c1 BETWEEN 0 AND 1),
  baseline_c2           NUMERIC(4,3) CHECK (baseline_c2 BETWEEN 0 AND 1),
  baseline_c3           NUMERIC(4,3) CHECK (baseline_c3 BETWEEN 0 AND 1),
  baseline_c4           NUMERIC(4,3) CHECK (baseline_c4 BETWEEN 0 AND 1),
  baseline_c5           NUMERIC(4,3) CHECK (baseline_c5 BETWEEN 0 AND 1),
  -- Self-efficacy baseline (PSE-12, normalized)
  pse_baseline          NUMERIC(4,3) CHECK (pse_baseline BETWEEN 0 AND 1),
  -- Emotion calibration
  emotion_neutral_au    JSONB,           -- {au1:0.1, au4:0.05, ...}
  frustration_threshold NUMERIC(4,3) DEFAULT 0.70,
  confusion_threshold   NUMERIC(4,3) DEFAULT 0.65,
  -- Starting scaffold per module (module_id → level)
  module_scaffold_start JSONB DEFAULT '{"M1":3,"M2":3,"M3":3,"M4":3,"M5":3}',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_profile_per_learner UNIQUE (learner_id)
);

-- Consent record — immutable audit trail
CREATE TABLE consent_record (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id              UUID NOT NULL REFERENCES learner(id),
  recorded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consent_version         VARCHAR(20) NOT NULL DEFAULT '1.0',
  -- Required consents
  participation           BOOLEAN NOT NULL DEFAULT FALSE,
  performance_data        BOOLEAN NOT NULL DEFAULT FALSE,
  -- Optional consents
  facial_analysis         BOOLEAN NOT NULL DEFAULT FALSE,
  au_data_retention       BOOLEAN NOT NULL DEFAULT FALSE,
  text_sentiment          BOOLEAN NOT NULL DEFAULT FALSE,
  behavioral_tracking     BOOLEAN NOT NULL DEFAULT FALSE,
  data_sharing_research   BOOLEAN NOT NULL DEFAULT FALSE,
  data_open_dataset       BOOLEAN NOT NULL DEFAULT FALSE,
  followup_contact        BOOLEAN NOT NULL DEFAULT FALSE,
  data_retention_years    SMALLINT NOT NULL DEFAULT 5,
  withdrawal_requested_at TIMESTAMPTZ,
  ip_hash                 VARCHAR(64),
  user_agent_hash         VARCHAR(64)
);

-- Auth credentials (separate from learner identity)
CREATE TABLE auth_credential (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID UNIQUE NOT NULL REFERENCES learner(id) ON DELETE CASCADE,
  password_hash   VARCHAR(255) NOT NULL,
  last_login      TIMESTAMPTZ,
  refresh_token   VARCHAR(512),
  token_expires   TIMESTAMPTZ,
  failed_attempts SMALLINT NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- MODULE & SCENARIO CONTENT -----------------------------

-- Module definitions (static reference data)
CREATE TABLE module (
  id              VARCHAR(10) PRIMARY KEY,      -- 'M0' onboarding, 'M1'–'M5'
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  objectives      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  primary_competency  VARCHAR(5),              -- 'C1'–'C5'
  secondary_competency VARCHAR(5),
  estimated_duration_min SMALLINT,
  session_count   SMALLINT,
  sequence_order  SMALLINT NOT NULL,
  is_assessable   BOOLEAN NOT NULL DEFAULT TRUE,
  status          publish_status_type NOT NULL DEFAULT 'published'
);

-- Episode definitions
CREATE TABLE episode (
  id              VARCHAR(20) PRIMARY KEY,      -- 'M1-1A', 'M1-1B', etc.
  module_id       VARCHAR(10) NOT NULL REFERENCES module(id),
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  objectives      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sequence_order  SMALLINT NOT NULL,
  base_scaffold   SMALLINT NOT NULL DEFAULT 3 CHECK (base_scaffold BETWEEN 1 AND 4),
  expected_duration_min SMALLINT,
  emotional_trigger_expected affect_state_type,
  is_adaptive     BOOLEAN NOT NULL DEFAULT TRUE,
  lesson_type     VARCHAR(40) NOT NULL DEFAULT 'guided',
  status          publish_status_type NOT NULL DEFAULT 'published'
);

-- Branching node registry (decision points)
CREATE TABLE branching_node (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id      VARCHAR(20) NOT NULL REFERENCES episode(id),
  node_key        VARCHAR(50) NOT NULL,         -- internal reference key
  prompt_text     TEXT NOT NULL,
  node_type       VARCHAR(20) NOT NULL,         -- 'decision', 'consequence', 'reveal'
  CONSTRAINT unique_node_key_per_episode UNIQUE (episode_id, node_key)
);

-- Branching outcomes
CREATE TABLE branching_outcome (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id         UUID NOT NULL REFERENCES branching_node(id),
  option_label    VARCHAR(100) NOT NULL,
  outcome_text    TEXT NOT NULL,
  stakeholder_effects JSONB,                   -- {trust: -0.15, urgency_tolerance: 0.1}
  next_node_key   VARCHAR(50),
  is_optimal      BOOLEAN NOT NULL DEFAULT FALSE,
  competency_signal VARCHAR(5)                 -- which competency this choice evidences
);

-- ---- SESSION MANAGEMENT ------------------------------------

CREATE TABLE session (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID NOT NULL REFERENCES learner(id),
  module_id       VARCHAR(10) NOT NULL REFERENCES module(id),
  episode_id      VARCHAR(20) REFERENCES episode(id),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  duration_min    NUMERIC(6,2),
  completion_pct  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  scaffold_level  SMALLINT NOT NULL DEFAULT 3 CHECK (scaffold_level BETWEEN 1 AND 4),
  initial_affect  affect_state_type DEFAULT 'Neutral',
  final_affect    affect_state_type,
  is_complete     BOOLEAN NOT NULL DEFAULT FALSE,
  device_info     JSONB,                       -- browser, OS (no fingerprinting)
  researcher_notes TEXT
);

-- Module progress tracker
CREATE TABLE module_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID NOT NULL REFERENCES learner(id),
  module_id       VARCHAR(10) NOT NULL REFERENCES module(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'not_started',
  -- 'not_started' | 'in_progress' | 'gated' | 'complete'
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  attempts        SMALLINT NOT NULL DEFAULT 0,
  current_scaffold SMALLINT NOT NULL DEFAULT 3,
  artifact_score  NUMERIC(5,2),              -- primary deliverable score
  gating_passed   BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT one_progress_per_module UNIQUE (learner_id, module_id)
);

-- ---- EMOTION & BEHAVIOR DATA -------------------------------

-- EmotionEvent — TimescaleDB hypertable (converted after creation)
CREATE TABLE emotion_event (
  time                    TIMESTAMPTZ NOT NULL,
  session_id              UUID NOT NULL REFERENCES session(id),
  learner_id              UUID NOT NULL REFERENCES learner(id),
  episode_id              VARCHAR(20) REFERENCES episode(id),
  -- Action Unit intensities (0.0–1.0)
  au1                     NUMERIC(4,3),   -- Inner Brow Raise
  au4                     NUMERIC(4,3),   -- Brow Lowerer
  au6                     NUMERIC(4,3),   -- Cheek Raiser
  au12                    NUMERIC(4,3),   -- Lip Corner Puller
  au20                    NUMERIC(4,3),   -- Lip Stretcher
  au23                    NUMERIC(4,3),   -- Lip Tightener
  au_confidence           NUMERIC(4,3),   -- Face detection confidence
  classified_state        affect_state_type NOT NULL DEFAULT 'Unknown',
  classification_confidence NUMERIC(4,3),
  is_below_threshold      BOOLEAN NOT NULL DEFAULT FALSE,  -- low-quality frame flag
  PRIMARY KEY (time, session_id)
);
-- Run in TimescaleDB: SELECT create_hypertable('emotion_event', 'time');
CREATE INDEX ON emotion_event (learner_id, time DESC);
CREATE INDEX ON emotion_event (session_id, time DESC);

-- BehaviorWindow — 90-second behavioral aggregates
CREATE TABLE behavior_window (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              UUID NOT NULL REFERENCES session(id),
  learner_id              UUID NOT NULL REFERENCES learner(id),
  window_start            TIMESTAMPTZ NOT NULL,
  window_end              TIMESTAMPTZ NOT NULL,
  episode_id              VARCHAR(20) REFERENCES episode(id),
  -- Attention signals
  dwell_time_sec          NUMERIC(8,2) NOT NULL DEFAULT 0,
  scroll_events           INTEGER NOT NULL DEFAULT 0,
  reread_count            INTEGER NOT NULL DEFAULT 0,
  -- Interaction signals
  click_count             INTEGER NOT NULL DEFAULT 0,
  click_rate_per_min      NUMERIC(6,2),
  task_progress_pct       NUMERIC(5,2) DEFAULT 0,
  -- Navigation signals
  page_returns            INTEGER NOT NULL DEFAULT 0,
  hint_requests           INTEGER NOT NULL DEFAULT 0,
  abandonment_attempts    INTEGER NOT NULL DEFAULT 0,
  -- Text signals
  typing_rate_wpm         NUMERIC(6,2),
  backspace_ratio         NUMERIC(4,3),
  -- Derived
  derived_affect_signal   affect_state_type,
  dwell_exceeds_threshold BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX ON behavior_window (session_id, window_start DESC);

-- ---- ADAPTIVE ENGINE ---------------------------------------

CREATE TABLE adaptive_event (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              UUID NOT NULL REFERENCES session(id),
  learner_id              UUID NOT NULL REFERENCES learner(id),
  occurred_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  episode_id              VARCHAR(20) REFERENCES episode(id),
  trigger_type            VARCHAR(60) NOT NULL,   -- e.g. 'confusion_dwell'
  trigger_priority        SMALLINT NOT NULL DEFAULT 2,  -- 1=critical, 2=standard, 3=optional
  affect_state_pre        affect_state_type NOT NULL,
  behavior_snapshot       JSONB NOT NULL,         -- BehaviorWindow values at decision time
  intervention            intervention_type NOT NULL,
  content_id              VARCHAR(100),           -- injected content key
  scaffold_from           SMALLINT,
  scaffold_to             SMALLINT,
  learner_response        VARCHAR(50),            -- 'used' | 'dismissed' | 'no_action'
  response_latency_sec    NUMERIC(8,2),
  affect_state_post       affect_state_type,      -- state ~90s after intervention
  was_effective           BOOLEAN                 -- computed post-hoc
);
CREATE INDEX ON adaptive_event (learner_id, occurred_at DESC);
CREATE INDEX ON adaptive_event (trigger_type, intervention);  -- for effectiveness analysis

-- ---- ASSESSMENT & COMPETENCY -------------------------------

CREATE TABLE assessment (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID NOT NULL REFERENCES learner(id),
  form            assessment_source_type NOT NULL,  -- 'pre' | 'mid' | 'post' | 'transfer'
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at    TIMESTAMPTZ,
  is_complete     BOOLEAN NOT NULL DEFAULT FALSE,
  -- Per-scenario raw scores (0–4 rubric points each)
  score_s1        SMALLINT CHECK (score_s1 BETWEEN 0 AND 4),  -- C1 scenario
  score_s2        SMALLINT CHECK (score_s2 BETWEEN 0 AND 4),  -- C2 scenario
  score_s3        SMALLINT CHECK (score_s3 BETWEEN 0 AND 4),  -- C3 scenario
  score_s4        SMALLINT CHECK (score_s4 BETWEEN 0 AND 4),  -- C4 scenario
  score_s5        SMALLINT CHECK (score_s5 BETWEEN 0 AND 4),  -- C5 scenario
  total_score     NUMERIC(4,2) GENERATED ALWAYS AS (
    (COALESCE(score_s1,0) + COALESCE(score_s2,0) + COALESCE(score_s3,0) +
     COALESCE(score_s4,0) + COALESCE(score_s5,0))::NUMERIC / 20.0
  ) STORED,
  rater_a_id      VARCHAR(50),   -- human rater pseudonym
  rater_b_id      VARCHAR(50),
  irr_kappa       NUMERIC(4,3),  -- inter-rater reliability
  CONSTRAINT one_form_per_learner UNIQUE (learner_id, form)
);

CREATE TABLE competency_record (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID NOT NULL REFERENCES learner(id),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source          competency_source_type NOT NULL,
  module_id       VARCHAR(10) REFERENCES module(id),
  assessment_id   UUID REFERENCES assessment(id),
  c1              NUMERIC(4,3) CHECK (c1 BETWEEN 0 AND 1),
  c2              NUMERIC(4,3) CHECK (c2 BETWEEN 0 AND 1),
  c3              NUMERIC(4,3) CHECK (c3 BETWEEN 0 AND 1),
  c4              NUMERIC(4,3) CHECK (c4 BETWEEN 0 AND 1),
  c5              NUMERIC(4,3) CHECK (c5 BETWEEN 0 AND 1),
  composite       NUMERIC(4,3) GENERATED ALWAYS AS (
    (COALESCE(c1,0) + COALESCE(c2,0) + COALESCE(c3,0) +
     COALESCE(c4,0) + COALESCE(c5,0)) / 5.0
  ) STORED
);
CREATE INDEX ON competency_record (learner_id, recorded_at DESC);

CREATE TABLE pse_assessment (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID NOT NULL REFERENCES learner(id),
  administered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  wave            VARCHAR(20) NOT NULL,           -- 'baseline' | 'mid' | 'post' | 'followup'
  responses       JSONB NOT NULL,                 -- {q1: 5, q2: 4, ...} 12 items, 1-7 Likert
  total_score     NUMERIC(5,2),                   -- sum / 84 normalized
  CONSTRAINT one_wave_per_learner UNIQUE (learner_id, wave)
);

-- ---- REFLECTIONS -------------------------------------------

CREATE TABLE reflection_prompt (
  id              VARCHAR(50) PRIMARY KEY,
  module_id       VARCHAR(10) REFERENCES module(id),
  episode_id      VARCHAR(20) REFERENCES episode(id),
  prompt_text     TEXT NOT NULL,
  min_words       SMALLINT DEFAULT 150,
  max_words       SMALLINT DEFAULT 300,
  sequence_order  SMALLINT
);

CREATE TABLE reflection_entry (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              UUID NOT NULL REFERENCES session(id),
  learner_id              UUID NOT NULL REFERENCES learner(id),
  prompt_id               VARCHAR(50) NOT NULL REFERENCES reflection_prompt(id),
  submitted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_text           TEXT NOT NULL,
  word_count              INTEGER,
  -- NLP analysis results
  sentiment_valence       NUMERIC(4,3) CHECK (sentiment_valence BETWEEN -1 AND 1),
  sentiment_arousal       NUMERIC(4,3) CHECK (sentiment_arousal BETWEEN 0 AND 1),
  reflection_depth        reflection_depth_type,
  self_reg_markers        TEXT[],
  competency_concepts     TEXT[],
  reflection_score        NUMERIC(5,2) CHECK (reflection_score BETWEEN 0 AND 100),
  auto_feedback           JSONB,
  analysis_model_version  VARCHAR(20)
);

-- ---- PM TOOL ARTIFACT STORAGE ------------------------------

CREATE TABLE artifact_submission (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID NOT NULL REFERENCES learner(id),
  session_id      UUID NOT NULL REFERENCES session(id),
  episode_id      VARCHAR(20) NOT NULL REFERENCES episode(id),
  artifact_type   VARCHAR(50) NOT NULL,   -- 'CSD' | 'WBS' | 'RiskRegister' | 'GanttPlan'
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  artifact_data   JSONB NOT NULL,         -- structured artifact content
  attempt_number  SMALLINT NOT NULL DEFAULT 1,
  -- Automated scoring
  auto_score      NUMERIC(5,2),
  auto_feedback   JSONB,
  -- Human rubric scoring (for open-ended artifacts)
  rubric_score    NUMERIC(5,2),
  rubric_feedback TEXT,
  scorer_id       VARCHAR(50),
  scored_at       TIMESTAMPTZ
);

-- ---- RESEARCH ANALYTICS VIEWS ------------------------------

-- Competency gain by cohort (primary research view)
CREATE VIEW v_competency_gain AS
SELECT
  l.participant_id,
  l.cohort,
  lp.years_experience,
  lp.baseline_c1, lp.baseline_c2, lp.baseline_c3, lp.baseline_c4, lp.baseline_c5,
  pre.total_score  AS pre_score,
  post.total_score AS post_score,
  (post.total_score - pre.total_score) AS competency_gain
FROM learner l
JOIN learner_profile lp ON l.id = lp.learner_id
LEFT JOIN assessment pre  ON l.id = pre.learner_id  AND pre.form = 'pre'
LEFT JOIN assessment post ON l.id = post.learner_id AND post.form = 'post'
WHERE pre.is_complete = TRUE AND post.is_complete = TRUE;

-- Adaptive intervention effectiveness (experimental group only)
CREATE VIEW v_adaptive_effectiveness AS
SELECT
  ae.trigger_type,
  ae.intervention,
  ae.affect_state_pre   AS state_before,
  ae.affect_state_post  AS state_after,
  COUNT(*)              AS n_interventions,
  ROUND(AVG(ae.response_latency_sec)::NUMERIC, 2) AS avg_latency_sec,
  ROUND(
    SUM(CASE WHEN ae.was_effective THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*),0) * 100, 1
  ) AS effectiveness_pct
FROM adaptive_event ae
JOIN session s ON ae.session_id = s.id
JOIN learner l ON s.learner_id = l.id
WHERE l.cohort = 'experimental'
  AND ae.was_effective IS NOT NULL
GROUP BY ae.trigger_type, ae.intervention, ae.affect_state_pre, ae.affect_state_post;

-- Emotion frequency per learner per module
CREATE VIEW v_emotion_frequency AS
SELECT
  l.participant_id,
  l.cohort,
  s.module_id,
  ee.classified_state,
  COUNT(*)  AS state_count,
  ROUND(AVG(ee.classification_confidence)::NUMERIC, 3) AS avg_confidence
FROM emotion_event ee
JOIN session s ON ee.session_id = s.id
JOIN learner l ON ee.learner_id = l.id
WHERE l.cohort = 'experimental'
  AND ee.is_below_threshold = FALSE
GROUP BY l.participant_id, l.cohort, s.module_id, ee.classified_state;

-- ---- INDEXES (performance) ---------------------------------
CREATE INDEX ON session (learner_id, module_id);
CREATE INDEX ON module_progress (learner_id, status);
CREATE INDEX ON artifact_submission (learner_id, artifact_type);
CREATE INDEX ON reflection_entry (learner_id, submitted_at DESC);

-- ---- DOCTORAL RESEARCH CORE EXTENSIONS -----------------------

ALTER TABLE learner_profile
  ADD COLUMN IF NOT EXISTS response_type VARCHAR(50);

ALTER TABLE IF EXISTS module
  ADD COLUMN IF NOT EXISTS objectives TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS status publish_status_type NOT NULL DEFAULT 'published';

ALTER TABLE IF EXISTS episode
  ADD COLUMN IF NOT EXISTS objectives TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS lesson_type VARCHAR(40) NOT NULL DEFAULT 'guided',
  ADD COLUMN IF NOT EXISTS status publish_status_type NOT NULL DEFAULT 'published';

ALTER TABLE IF EXISTS learning_content
  ADD COLUMN IF NOT EXISTS status publish_status_type NOT NULL DEFAULT 'published';

CREATE TABLE IF NOT EXISTS adaptive_tag (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_key            VARCHAR(60) UNIQUE NOT NULL,
  label              VARCHAR(120) NOT NULL,
  description        TEXT,
  trigger_states     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  priority           SMALLINT NOT NULL DEFAULT 2,
  fallback_behavior  VARCHAR(120),
  display_conditions JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenario_rule (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key              VARCHAR(80) UNIQUE NOT NULL,
  name                  VARCHAR(160) NOT NULL,
  trigger_emotion       VARCHAR(40) NOT NULL,
  min_confidence        NUMERIC(5,4),
  min_engagement_score  NUMERIC(6,2),
  max_engagement_score  NUMERIC(6,2),
  max_inactivity_ms     INTEGER,
  max_failed_attempts   INTEGER,
  max_repeated_errors   INTEGER,
  min_task_progress_pct NUMERIC(5,2),
  duration_window_sec   INTEGER,
  priority              SMALLINT NOT NULL DEFAULT 2,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  fallback_action_key   VARCHAR(80),
  explainability_notes  TEXT,
  metadata              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenario_action (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key           VARCHAR(80) UNIQUE NOT NULL,
  scenario_rule_key    VARCHAR(80),
  pedagogical_action   VARCHAR(120) NOT NULL,
  content_type         VARCHAR(40),
  badge_key            VARCHAR(80),
  difficulty_delta     SMALLINT,
  scaffold_delta       SMALLINT,
  pause_content        BOOLEAN NOT NULL DEFAULT FALSE,
  request_interaction  BOOLEAN NOT NULL DEFAULT FALSE,
  explainability_notes TEXT,
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS engagement_snapshot (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id       VARCHAR(20) NOT NULL,
  session_id           TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  module_id            VARCHAR(20),
  lesson_id            VARCHAR(40),
  activity_id          VARCHAR(80),
  captured_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  engagement_level     VARCHAR(20) NOT NULL,
  emotion_confidence   NUMERIC(5,4),
  engagement_score     NUMERIC(6,2),
  interaction_rate     NUMERIC(8,2),
  inactivity_ms        INTEGER,
  passive_exposure_sec NUMERIC(8,2),
  metadata             JSONB
);

CREATE TABLE IF NOT EXISTS intervention_log (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id             VARCHAR(20) NOT NULL,
  session_id                 TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  module_id                  VARCHAR(20),
  lesson_id                  VARCHAR(40),
  activity_id                VARCHAR(80),
  occurred_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_emotion           VARCHAR(40) NOT NULL,
  confidence                 NUMERIC(5,4),
  matched_scenario           VARCHAR(100),
  chosen_action              VARCHAR(80) NOT NULL,
  learner_state_after_action VARCHAR(120),
  pedagogical_explanation    TEXT,
  was_effective              BOOLEAN,
  metadata                   JSONB
);

CREATE TABLE IF NOT EXISTS activity_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id VARCHAR(20) NOT NULL,
  session_id     TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  module_id      VARCHAR(20),
  lesson_id      VARCHAR(40),
  activity_id    VARCHAR(80),
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type     VARCHAR(60) NOT NULL,
  event_name     VARCHAR(120) NOT NULL,
  actor_role     VARCHAR(30),
  metadata       JSONB
);

CREATE TABLE IF NOT EXISTS assessment_attempt (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   TEXT NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
  participant_id  VARCHAR(20) NOT NULL,
  session_id      TEXT REFERENCES session(id) ON DELETE SET NULL,
  attempt_index   SMALLINT NOT NULL DEFAULT 1,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at    TIMESTAMPTZ,
  score           NUMERIC(6,2),
  latency_sec     NUMERIC(8,2),
  emotional_state VARCHAR(40),
  metadata        JSONB
);

CREATE TABLE IF NOT EXISTS badge (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key         VARCHAR(80) UNIQUE NOT NULL,
  label             VARCHAR(120) NOT NULL,
  description       TEXT,
  icon_name         VARCHAR(120),
  trigger_rule_key  VARCHAR(80),
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timeline_heatmap (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id     VARCHAR(20) NOT NULL,
  session_id         TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  module_id          VARCHAR(20),
  lesson_id          VARCHAR(40),
  activity_id        VARCHAR(80),
  captured_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_emotion   VARCHAR(40) NOT NULL,
  confidence         NUMERIC(5,4),
  engagement_level   VARCHAR(20),
  adaptive_action    VARCHAR(80),
  post_action_outcome VARCHAR(120),
  metadata           JSONB
);

CREATE TABLE IF NOT EXISTS admin_simulation (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id     VARCHAR(20),
  session_id         TEXT REFERENCES session(id) ON DELETE SET NULL,
  lesson_id          VARCHAR(40),
  activity_id        VARCHAR(80),
  simulated_emotion  VARCHAR(40) NOT NULL,
  matched_scenario   VARCHAR(100),
  threshold_snapshot JSONB,
  preview_payload    JSONB,
  researcher_id      VARCHAR(100),
  metadata           JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_export (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id VARCHAR(20),
  session_id     TEXT REFERENCES session(id) ON DELETE SET NULL,
  export_type    VARCHAR(80) NOT NULL,
  export_format  VARCHAR(20) NOT NULL,
  requested_by   VARCHAR(100),
  filter_params  JSONB,
  status         VARCHAR(30) NOT NULL DEFAULT 'generated',
  file_name      VARCHAR(255),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS engagement_snapshot_session_time_idx
  ON engagement_snapshot (session_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS intervention_log_session_time_idx
  ON intervention_log (session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_session_time_idx
  ON activity_log (session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS assessment_attempt_assessment_idx
  ON assessment_attempt (assessment_id, started_at DESC);
CREATE INDEX IF NOT EXISTS timeline_heatmap_session_time_idx
  ON timeline_heatmap (session_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS admin_simulation_created_idx
  ON admin_simulation (created_at DESC);
CREATE INDEX IF NOT EXISTS research_export_created_idx
  ON research_export (created_at DESC);

CREATE OR REPLACE VIEW participants AS
SELECT * FROM learner;

CREATE OR REPLACE VIEW participant_profiles AS
SELECT * FROM learner_profile;

CREATE OR REPLACE VIEW sessions AS
SELECT * FROM session;

CREATE OR REPLACE VIEW modules AS
SELECT * FROM module;

CREATE OR REPLACE VIEW lessons AS
SELECT * FROM episode;

CREATE OR REPLACE VIEW lesson_contents AS
SELECT * FROM learning_content;

CREATE OR REPLACE VIEW adaptive_tags AS
SELECT * FROM adaptive_tag;

CREATE OR REPLACE VIEW scenario_rules AS
SELECT * FROM scenario_rule;

CREATE OR REPLACE VIEW scenario_actions AS
SELECT * FROM scenario_action;

CREATE OR REPLACE VIEW emotion_events AS
SELECT * FROM emotion_event;

CREATE OR REPLACE VIEW engagement_snapshots AS
SELECT * FROM engagement_snapshot;

CREATE OR REPLACE VIEW intervention_logs AS
SELECT * FROM intervention_log;

CREATE OR REPLACE VIEW activity_logs AS
SELECT * FROM activity_log;

CREATE OR REPLACE VIEW assessments AS
SELECT * FROM assessment;

CREATE OR REPLACE VIEW pretests AS
SELECT * FROM assessment WHERE form = 'pre';

CREATE OR REPLACE VIEW posttests AS
SELECT * FROM assessment WHERE form = 'post';

CREATE OR REPLACE VIEW assessment_attempts AS
SELECT * FROM assessment_attempt;

CREATE OR REPLACE VIEW badges AS
SELECT * FROM badge;

CREATE OR REPLACE VIEW timeline_heatmaps AS
SELECT * FROM timeline_heatmap;

CREATE OR REPLACE VIEW admin_simulations AS
SELECT * FROM admin_simulation;

CREATE OR REPLACE VIEW research_exports AS
SELECT * FROM research_export;

CREATE OR REPLACE VIEW consent_records AS
SELECT * FROM consent_record;
