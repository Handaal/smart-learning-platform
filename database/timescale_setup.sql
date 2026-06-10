-- ============================================================
-- STEP Platform — TimescaleDB Post-Migration Setup
-- Run AFTER `prisma migrate deploy` to convert emotion_event
-- into a TimescaleDB hypertable for time-series performance.
-- ============================================================

-- Enable TimescaleDB extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Convert emotion_event to hypertable
-- chunk_time_interval = 1 day (adjust for data volume)
SELECT create_hypertable(
  'emotion_event',
  'time',
  if_not_exists     => TRUE,
  migrate_data      => TRUE,
  chunk_time_interval => INTERVAL '1 day'
);

-- Convert behavior_window to hypertable (optional but recommended)
SELECT create_hypertable(
  'behavior_window',
  'window_start',
  if_not_exists     => TRUE,
  migrate_data      => TRUE,
  chunk_time_interval => INTERVAL '1 day'
);

-- ── Continuous Aggregates (for research analytics) ────────────

-- Hourly affect state counts per learner
CREATE MATERIALIZED VIEW IF NOT EXISTS agg_affect_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time)   AS bucket,
  learner_id,
  session_id,
  classified_state,
  COUNT(*)                       AS event_count,
  AVG(classification_confidence) AS avg_confidence
FROM   emotion_event
WHERE  is_below_threshold = FALSE
GROUP BY bucket, learner_id, session_id, classified_state
WITH NO DATA;

-- Refresh policy: keep aggregate up-to-date automatically
SELECT add_continuous_aggregate_policy('agg_affect_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset   => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- ── Compression (saves ~90% space for old data) ───────────────

ALTER TABLE emotion_event   SET (timescaledb.compress,
  timescaledb.compress_segmentby = 'learner_id, session_id');
ALTER TABLE behavior_window SET (timescaledb.compress,
  timescaledb.compress_segmentby = 'learner_id, session_id');

-- Compress chunks older than 7 days automatically
SELECT add_compression_policy('emotion_event',   INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('behavior_window',  INTERVAL '7 days', if_not_exists => TRUE);

-- ── Indexes for research query performance ─────────────────────

CREATE INDEX IF NOT EXISTS idx_emotion_event_state_time
  ON emotion_event (classified_state, time DESC);

CREATE INDEX IF NOT EXISTS idx_adaptive_event_trigger
  ON adaptive_event (trigger_type, intervention, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_reflection_learner_depth
  ON reflection_entry (learner_id, reflection_depth, submitted_at DESC);

-- ── Research read-only role ────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'step_researcher') THEN
    CREATE ROLE step_researcher NOLOGIN;
  END IF;
END$$;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO step_researcher;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO step_researcher;
