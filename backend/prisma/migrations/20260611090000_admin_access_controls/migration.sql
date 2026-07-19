ALTER TABLE "learner"
ADD COLUMN "emotion_tracking_override" BOOLEAN;

CREATE TABLE "cohort_settings" (
    "id" TEXT NOT NULL,
    "cohort" "CohortType" NOT NULL,
    "label" TEXT NOT NULL,
    "emotion_tracking_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohort_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cohort_settings_cohort_key" ON "cohort_settings"("cohort");

INSERT INTO "cohort_settings" ("id", "cohort", "label", "emotion_tracking_enabled")
VALUES
    ('f4f4954a-5c9f-4ad4-96fd-c1dce0c92001', 'experimental', 'Experimental group demo', true),
    ('f4f4954a-5c9f-4ad4-96fd-c1dce0c92002', 'control', 'Control group demo', false)
ON CONFLICT ("cohort") DO NOTHING;
