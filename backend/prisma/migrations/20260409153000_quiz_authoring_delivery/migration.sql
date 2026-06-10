-- CreateEnum
CREATE TYPE "QuizScope" AS ENUM ('lesson', 'unit');

-- CreateEnum
CREATE TYPE "QuizQuestionType" AS ENUM ('true_false', 'mcq');

-- CreateEnum
CREATE TYPE "QuizAttemptStatus" AS ENUM ('in_progress', 'submitted');

-- CreateTable
CREATE TABLE "quiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" "QuizScope" NOT NULL DEFAULT 'lesson',
    "module_id" TEXT,
    "episode_id" TEXT,
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "attempt_limit" INTEGER NOT NULL DEFAULT 2,
    "show_explanation_after_submit" BOOLEAN NOT NULL DEFAULT true,
    "allow_retry" BOOLEAN NOT NULL DEFAULT true,
    "adaptive_on_fail" TEXT,
    "adaptive_on_pass" TEXT,
    "sequence_order" INTEGER NOT NULL DEFAULT 1,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_question" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "question_type" "QuizQuestionType" NOT NULL,
    "question_text" TEXT NOT NULL,
    "explanation" TEXT,
    "hint" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "sequence_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_choice" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "choice_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "sequence_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_choice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempt" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "session_id" TEXT,
    "module_id" TEXT,
    "episode_id" TEXT,
    "status" "QuizAttemptStatus" NOT NULL DEFAULT 'submitted',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "score_pct" DOUBLE PRECISION,
    "score_earned" DOUBLE PRECISION,
    "total_possible" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "metadata" JSONB,

    CONSTRAINT "quiz_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_question_attempt" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "selected_choice_id" TEXT,
    "is_correct" BOOLEAN,
    "earned_score" DOUBLE PRECISION,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_question_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quiz_module_id_scope_sequence_order_idx" ON "quiz"("module_id", "scope", "sequence_order");

-- CreateIndex
CREATE INDEX "quiz_episode_id_scope_sequence_order_idx" ON "quiz"("episode_id", "scope", "sequence_order");

-- CreateIndex
CREATE INDEX "quiz_question_quiz_id_sequence_order_idx" ON "quiz_question"("quiz_id", "sequence_order");

-- CreateIndex
CREATE INDEX "quiz_choice_question_id_sequence_order_idx" ON "quiz_choice"("question_id", "sequence_order");

-- CreateIndex
CREATE INDEX "quiz_attempt_quiz_id_submitted_at_idx" ON "quiz_attempt"("quiz_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "quiz_attempt_learner_id_submitted_at_idx" ON "quiz_attempt"("learner_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "quiz_attempt_session_id_submitted_at_idx" ON "quiz_attempt"("session_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "quiz_question_attempt_question_id_idx" ON "quiz_question_attempt"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_question_attempt_attempt_id_question_id_key" ON "quiz_question_attempt"("attempt_id", "question_id");

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_choice" ADD CONSTRAINT "quiz_choice_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question_attempt" ADD CONSTRAINT "quiz_question_attempt_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "quiz_attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question_attempt" ADD CONSTRAINT "quiz_question_attempt_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question_attempt" ADD CONSTRAINT "quiz_question_attempt_selected_choice_id_fkey" FOREIGN KEY ("selected_choice_id") REFERENCES "quiz_choice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
