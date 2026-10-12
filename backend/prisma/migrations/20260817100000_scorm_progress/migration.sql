-- Per-participant SCORM progress. One row per (learner, session, SCORM content
-- block); the learner's in-app SCORM 1.2 runtime commits CMI snapshots here.
CREATE TABLE "scorm_progress" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "scorm_id" TEXT,
    "lesson_status" TEXT NOT NULL DEFAULT 'not_attempted',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score_raw" DOUBLE PRECISION,
    "score_min" DOUBLE PRECISION,
    "score_max" DOUBLE PRECISION,
    "total_time_sec" INTEGER,
    "session_time_sec" INTEGER,
    "lesson_location" TEXT,
    "suspend_data" TEXT,
    "cmi_snapshot" JSONB NOT NULL DEFAULT '{}',
    "interactions" JSONB NOT NULL DEFAULT '[]',
    "commit_count" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "scorm_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scorm_progress_learner_id_session_id_content_id_key" ON "scorm_progress"("learner_id", "session_id", "content_id");
CREATE INDEX "scorm_progress_session_id_idx" ON "scorm_progress"("session_id");
CREATE INDEX "scorm_progress_content_id_idx" ON "scorm_progress"("content_id");

ALTER TABLE "scorm_progress" ADD CONSTRAINT "scorm_progress_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scorm_progress" ADD CONSTRAINT "scorm_progress_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
