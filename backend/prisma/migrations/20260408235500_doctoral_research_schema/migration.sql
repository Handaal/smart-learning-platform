ALTER TABLE learner_profile
  ADD COLUMN IF NOT EXISTS response_type VARCHAR(50);

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
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      VARCHAR(20) NOT NULL,
  session_id          TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  module_id           VARCHAR(20),
  lesson_id           VARCHAR(40),
  activity_id         VARCHAR(80),
  captured_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_emotion    VARCHAR(40) NOT NULL,
  confidence          NUMERIC(5,4),
  engagement_level    VARCHAR(20),
  adaptive_action     VARCHAR(80),
  post_action_outcome VARCHAR(120),
  metadata            JSONB
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
