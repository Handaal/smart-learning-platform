DO $$
BEGIN
  CREATE TYPE "PublishStatus" AS ENUM ('draft', 'published');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "module"
  ADD COLUMN IF NOT EXISTS "objectives" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "status" "PublishStatus" NOT NULL DEFAULT 'published';

ALTER TABLE "episode"
  ADD COLUMN IF NOT EXISTS "objectives" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "lesson_type" TEXT NOT NULL DEFAULT 'guided',
  ADD COLUMN IF NOT EXISTS "status" "PublishStatus" NOT NULL DEFAULT 'published';

ALTER TABLE "learning_content"
  ADD COLUMN IF NOT EXISTS "status" "PublishStatus" NOT NULL DEFAULT 'published';
