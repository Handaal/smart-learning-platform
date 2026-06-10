-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('TEXT', 'VISUAL', 'VIDEO', 'ASSESSMENT');

-- AlterTable
ALTER TABLE "behavior_window" ADD COLUMN     "content_id" TEXT;

-- AlterTable
ALTER TABLE "emotion_event" ADD COLUMN     "content_id" TEXT;

-- CreateTable
CREATE TABLE "learning_content" (
    "id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "adaptive_tag" "AffectState",
    "content_data" JSONB NOT NULL,
    "scaffold_level" INTEGER NOT NULL DEFAULT 3,
    "is_enrichment" BOOLEAN NOT NULL DEFAULT false,
    "sequence_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "learning_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "behavior_window_content_id_idx" ON "behavior_window"("content_id");

-- CreateIndex
CREATE INDEX "emotion_event_content_id_idx" ON "emotion_event"("content_id");

-- AddForeignKey
ALTER TABLE "learning_content" ADD CONSTRAINT "learning_content_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emotion_event" ADD CONSTRAINT "emotion_event_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "learning_content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_window" ADD CONSTRAINT "behavior_window_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "learning_content"("id") ON DELETE SET NULL ON UPDATE CASCADE;
