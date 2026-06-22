import type { AssessmentDimension, AssessmentForm, Prisma, QuizScope } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CompetencyTracker } from '../../services/CompetencyTracker';
import { resolveLearnerAccessSnapshot } from '../../services/learnerAccess';

const tracker = new CompetencyTracker();
const DEFAULT_COURSE_KEY = 'step-adaptive-training';

type LegacyScoreInput = {
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  s5: number;
};

type StructuredAnswerInput = {
  questionId: string;
  choiceId: string;
};

type StructuredSubmissionInput = {
  answers: StructuredAnswerInput[];
};

const QUIZ_SCOPE_BY_FORM: Partial<Record<AssessmentForm, QuizScope>> = {
  pre: 'pretest',
  post: 'posttest',
};

function toQuizScope(form: AssessmentForm) {
  const scope = QUIZ_SCOPE_BY_FORM[form];
  if (!scope) {
    throw new AppError(422, `Structured ${form} assessment is not configured`, 'UNSUPPORTED_ASSESSMENT_FORM');
  }
  return scope;
}

function emptyDimensionScores() {
  return {
    s1: { correct: 0, total: 0 },
    s2: { correct: 0, total: 0 },
    s3: { correct: 0, total: 0 },
    s4: { correct: 0, total: 0 },
    s5: { correct: 0, total: 0 },
  };
}

function scaledDimensionScore(correct: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 4);
}

function buildLegacyTotalScore(scores: LegacyScoreInput) {
  return Object.values(scores).reduce((sum, value) => sum + Number(value ?? 0), 0);
}

async function resolveAssessmentQuiz(form: AssessmentForm) {
  const scope = toQuizScope(form);

  const quiz = await prisma.quiz.findFirst({
    where: {
      scope,
      isPublished: true,
      courseKey: DEFAULT_COURSE_KEY,
    },
    orderBy: [{ sequenceOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      questions: {
        orderBy: { sequenceOrder: 'asc' },
        include: {
          choices: {
            orderBy: { sequenceOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!quiz) {
    throw new AppError(404, `${form} assessment quiz is not configured`, 'ASSESSMENT_QUIZ_NOT_FOUND');
  }

  return quiz;
}

function sanitizeQuizForAssessment<
  T extends { questions?: Array<{ choices?: Array<Record<string, unknown>> }> },
>(quiz: T) {
  if (!Array.isArray(quiz.questions)) return quiz;

  return {
    ...quiz,
    questions: quiz.questions.map((question) => ({
      ...question,
      choices: (question.choices ?? []).map((choice) => ({
        ...choice,
        isCorrect: undefined,
      })),
    })),
  };
}

async function submitStructuredAssessment(assessmentId: string, input: StructuredSubmissionInput) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
  });

  if (!assessment) throw new AppError(404, 'Assessment not found', 'NOT_FOUND');
  if (assessment.isComplete) throw new AppError(409, 'Assessment already submitted', 'ALREADY_COMPLETE');
  if (!assessment.quizId) throw new AppError(422, 'Assessment quiz link is missing', 'ASSESSMENT_QUIZ_NOT_FOUND');

  const quiz = await prisma.quiz.findUnique({
    where: { id: assessment.quizId },
    include: {
      questions: {
        orderBy: { sequenceOrder: 'asc' },
        include: {
          choices: {
            orderBy: { sequenceOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!quiz) throw new AppError(404, 'Assessment quiz not found', 'ASSESSMENT_QUIZ_NOT_FOUND');

  const priorAttempts = await prisma.quizAttempt.count({
    where: {
      quizId: quiz.id,
      learnerId: assessment.learnerId,
    },
  });

  if (priorAttempts >= quiz.attemptLimit) {
    throw new AppError(403, 'Attempt limit reached for this assessment', 'ATTEMPT_LIMIT_REACHED');
  }

  const answerMap = new Map(input.answers.map((answer) => [answer.questionId, answer.choiceId]));
  const dimensionScores = emptyDimensionScores();
  let scoreEarned = 0;
  let totalPossible = 0;
  let correctCount = 0;

  const answerRows = quiz.questions.map((question) => {
    const selectedChoiceId = answerMap.get(question.id) ?? null;
    const correctChoice = question.choices.find((choice) => choice.isCorrect) ?? null;
    const isCorrect = Boolean(selectedChoiceId && correctChoice && selectedChoiceId === correctChoice.id);

    totalPossible += question.weight;
    if (isCorrect) {
      scoreEarned += question.weight;
      correctCount += 1;
    }

    if (question.dimension) {
      const bucket = dimensionScores[question.dimension as keyof typeof dimensionScores];
      bucket.total += 1;
      if (isCorrect) bucket.correct += 1;
    }

    return {
      questionId: question.id,
      selectedChoiceId,
      isCorrect,
      earnedScore: isCorrect ? question.weight : 0,
      questionText: question.questionText,
      dimension: question.dimension,
      correctChoiceText: correctChoice?.choiceText ?? null,
      selectedChoiceText: question.choices.find((choice) => choice.id === selectedChoiceId)?.choiceText ?? null,
    };
  });

  const scorePct = totalPossible > 0 ? (scoreEarned / totalPossible) * 100 : 0;
  const passed = scorePct >= quiz.passingScore;

  const quizAttempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      learnerId: assessment.learnerId,
      status: 'submitted',
      startedAt: assessment.startedAt,
      submittedAt: new Date(),
      scorePct,
      scoreEarned,
      totalPossible,
      passed,
      metadata: {
        assessmentId,
        assessmentForm: assessment.form,
        submissionSource: 'structured_assessment',
        courseKey: assessment.courseKey ?? DEFAULT_COURSE_KEY,
      } as Prisma.JsonObject,
      answers: {
        create: answerRows.map((answer) => ({
          questionId: answer.questionId,
          selectedChoiceId: answer.selectedChoiceId,
          isCorrect: answer.isCorrect,
          earnedScore: answer.earnedScore,
        })),
      },
    },
    include: {
      answers: {
        include: {
          question: {
            include: {
              choices: {
                orderBy: { sequenceOrder: 'asc' },
              },
            },
          },
          selectedChoice: true,
        },
      },
    },
  });

  const competencyScores: LegacyScoreInput = {
    s1: scaledDimensionScore(dimensionScores.s1.correct, dimensionScores.s1.total),
    s2: scaledDimensionScore(dimensionScores.s2.correct, dimensionScores.s2.total),
    s3: scaledDimensionScore(dimensionScores.s3.correct, dimensionScores.s3.total),
    s4: scaledDimensionScore(dimensionScores.s4.correct, dimensionScores.s4.total),
    s5: scaledDimensionScore(dimensionScores.s5.correct, dimensionScores.s5.total),
  };

  const updated = await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      submittedAt: new Date(),
      isComplete: true,
      quizAttemptId: quizAttempt.id,
      responsePayload: {
        answers: answerRows,
      } as Prisma.JsonObject,
      questionCount: quiz.questions.length,
      correctCount,
      scoreS1: competencyScores.s1,
      scoreS2: competencyScores.s2,
      scoreS3: competencyScores.s3,
      scoreS4: competencyScores.s4,
      scoreS5: competencyScores.s5,
      totalScore: scorePct,
    },
  });

  await tracker.recordFromAssessment(assessment.learnerId, assessmentId, competencyScores);

  return {
    assessment: updated,
    quiz: sanitizeQuizForAssessment(quiz),
    attempt: quizAttempt,
  };
}

export async function start(learnerId: string, form: AssessmentForm) {
  const access = await resolveLearnerAccessSnapshot(learnerId);
  if (!access.isActive) {
    throw new AppError(403, 'Your account is awaiting admin approval', 'ACCOUNT_INACTIVE');
  }

  const existingComplete = await prisma.assessment.findFirst({
    where: { learnerId, form: form as any, isComplete: true },
  });
  if (existingComplete) throw new AppError(409, `${form} assessment already completed`, 'DUPLICATE_FORM');

  const existingOpen = await prisma.assessment.findFirst({
    where: { learnerId, form: form as any, isComplete: false },
    orderBy: { startedAt: 'desc' },
  });

  const learner = await prisma.learner.findUnique({
    where: { id: learnerId },
    select: { cohort: true },
  });
  if (!learner) throw new AppError(404, 'Learner not found', 'NOT_FOUND');

  const quiz = await resolveAssessmentQuiz(form);

  if (existingOpen) {
    return {
      ...existingOpen,
      quiz: sanitizeQuizForAssessment(quiz),
    };
  }

  const assessment = await prisma.assessment.create({
    data: {
      learnerId,
      form: form as any,
      courseKey: quiz.courseKey ?? DEFAULT_COURSE_KEY,
      quizId: quiz.id,
      cohortSnapshot: learner.cohort,
    },
  });

  return {
    ...assessment,
    quiz: sanitizeQuizForAssessment(quiz),
  };
}

export async function submit(assessmentId: string, payload: StructuredSubmissionInput | { scores: LegacyScoreInput }) {
  if ('answers' in payload) {
    return submitStructuredAssessment(assessmentId, payload);
  }

  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) throw new AppError(404, 'Assessment not found', 'NOT_FOUND');
  if (assessment.isComplete) throw new AppError(409, 'Assessment already submitted', 'ALREADY_COMPLETE');

  const totalScore = buildLegacyTotalScore(payload.scores);
  const updated = await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      scoreS1: payload.scores.s1,
      scoreS2: payload.scores.s2,
      scoreS3: payload.scores.s3,
      scoreS4: payload.scores.s4,
      scoreS5: payload.scores.s5,
      totalScore,
      submittedAt: new Date(),
      isComplete: true,
      responsePayload: {
        legacyScores: payload.scores,
      } as Prisma.JsonObject,
    },
  });

  await tracker.recordFromAssessment(assessment.learnerId, assessmentId, payload.scores);
  return { assessment: updated };
}

export async function getById(assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) throw new AppError(404, 'Assessment not found', 'NOT_FOUND');
  return assessment;
}

export async function getByLearner(learnerId: string) {
  return prisma.assessment.findMany({
    where: { learnerId },
    orderBy: { startedAt: 'asc' },
  });
}

export async function listAll(opts: { page: number; limit: number; form?: string }) {
  const { page, limit, form } = opts;
  const skip = (page - 1) * limit;
  const where: Prisma.AssessmentWhereInput = {};
  if (form) where.form = form as AssessmentForm;

  const [assessments, total] = await Promise.all([
    prisma.assessment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: {
        learner: { select: { participantId: true, cohort: true } },
      },
    }),
    prisma.assessment.count({ where }),
  ]);

  return { data: assessments, total, page, limit };
}
