DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountRole') THEN
    CREATE TYPE "AccountRole" AS ENUM ('learner', 'research_admin');
  END IF;
END $$;

ALTER TABLE "learner"
  ADD COLUMN IF NOT EXISTS "role" "AccountRole" NOT NULL DEFAULT 'learner';

UPDATE "learner"
SET "role" = 'research_admin'
WHERE "participant_id" ILIKE '%ADMIN%'
   OR "participant_id" ILIKE '%RESEARCHER%'
   OR "participant_id" ILIKE '%RADMIN%';
