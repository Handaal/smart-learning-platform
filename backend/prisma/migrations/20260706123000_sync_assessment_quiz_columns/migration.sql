-- Repair drift between the live database and schema.prisma: the assessment
-- linkage columns used by the structured pre/post test flow were present in
-- the Prisma schema but missing from the database.

ALTER TABLE "quiz" ADD COLUMN IF NOT EXISTS "course_key" TEXT;

ALTER TABLE "quiz_question" ADD COLUMN IF NOT EXISTS "dimension" "AssessmentDimension";

ALTER TABLE "assessment"
  ADD COLUMN IF NOT EXISTS "course_key" TEXT,
  ADD COLUMN IF NOT EXISTS "quiz_id" TEXT,
  ADD COLUMN IF NOT EXISTS "quiz_attempt_id" TEXT,
  ADD COLUMN IF NOT EXISTS "cohort_snapshot" "CohortType",
  ADD COLUMN IF NOT EXISTS "correct_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "question_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "response_payload" JSONB;
