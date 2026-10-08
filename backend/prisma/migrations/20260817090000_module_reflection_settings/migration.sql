-- Admin-managed session-reflection settings per unit (module):
--  * reflection_required  — whether learners must submit the unit reflection
--  * reflection_min_words — the minimum word count required to submit
ALTER TABLE "module"
  ADD COLUMN "reflection_required" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "reflection_min_words" INTEGER NOT NULL DEFAULT 150;
