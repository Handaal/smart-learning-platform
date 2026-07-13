-- Add authoring guidance fields to episode (Basics tab: general objective + teacher guidance)
ALTER TABLE "episode" ADD COLUMN IF NOT EXISTS "general_objective" TEXT;
ALTER TABLE "episode" ADD COLUMN IF NOT EXISTS "teacher_guidance" TEXT;
