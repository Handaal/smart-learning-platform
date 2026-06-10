import { AssessmentDimension, Prisma, QuizQuestionType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

const DEFAULT_COURSE_KEY = 'step-adaptive-training';

const quizInclude = {
  questions: {
    orderBy: { sequenceOrder: 'asc' },
    include: {
      choices: {
        orderBy: { sequenceOrder: 'asc' },
      },
    },
  },
} satisfies Prisma.QuizInclude;

export async function getQuizById(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: quizInclude,
  });

  if (!quiz) throw new AppError(404, 'Quiz not found', 'NOT_FOUND');
  return quiz;
}

export async function createQuiz(input: {
  title: string;
  description?: string | null;
  scope: 'lesson' | 'unit' | 'pretest' | 'posttest';
  courseKey?: string | null;
  moduleId?: string | null;
  episodeId?: string | null;
  passingScore?: number;
  attemptLimit?: number;
  showExplanationAfterSubmit?: boolean;
  allowRetry?: boolean;
  adaptiveOnFail?: string | null;
  adaptiveOnPass?: string | null;
  isPublished?: boolean;
}) {
  if (input.scope === 'lesson' && !input.episodeId) {
    throw new AppError(422, 'Lesson quizzes require an episodeId', 'VALIDATION_ERROR');
  }
  if (input.scope === 'unit' && !input.moduleId) {
    throw new AppError(422, 'Unit quizzes require a moduleId', 'VALIDATION_ERROR');
  }
  if ((input.scope === 'pretest' || input.scope === 'posttest') && !input.courseKey) {
    input.courseKey = DEFAULT_COURSE_KEY;
  }

  const orderingWhere =
    input.scope === 'lesson'
      ? { episodeId: input.episodeId, scope: 'lesson' as const }
      : input.scope === 'unit'
        ? { moduleId: input.moduleId, scope: 'unit' as const }
        : { courseKey: input.courseKey, scope: input.scope };

  const lastQuiz = await prisma.quiz.findFirst({
    where: orderingWhere,
    orderBy: { sequenceOrder: 'desc' },
    select: { sequenceOrder: true },
  });

  return prisma.quiz.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      scope: input.scope,
      courseKey: input.courseKey ?? null,
      moduleId: input.moduleId ?? null,
      episodeId: input.episodeId ?? null,
      passingScore: input.passingScore ?? 70,
      attemptLimit: input.attemptLimit ?? 2,
      showExplanationAfterSubmit: input.showExplanationAfterSubmit ?? true,
      allowRetry: input.allowRetry ?? true,
      adaptiveOnFail: input.adaptiveOnFail ?? null,
      adaptiveOnPass: input.adaptiveOnPass ?? null,
      isPublished: input.isPublished ?? true,
      sequenceOrder: (lastQuiz?.sequenceOrder ?? 0) + 1,
    },
    include: quizInclude,
  });
}

export async function updateQuiz(
  quizId: string,
  input: {
    title?: string;
    description?: string | null;
    courseKey?: string | null;
    passingScore?: number;
    attemptLimit?: number;
    showExplanationAfterSubmit?: boolean;
    allowRetry?: boolean;
    adaptiveOnFail?: string | null;
    adaptiveOnPass?: string | null;
    isPublished?: boolean;
  },
) {
  return prisma.quiz.update({
    where: { id: quizId },
    data: {
      title: input.title,
      description: input.description,
      courseKey: input.courseKey,
      passingScore: input.passingScore,
      attemptLimit: input.attemptLimit,
      showExplanationAfterSubmit: input.showExplanationAfterSubmit,
      allowRetry: input.allowRetry,
      adaptiveOnFail: input.adaptiveOnFail,
      adaptiveOnPass: input.adaptiveOnPass,
      isPublished: input.isPublished,
    },
    include: quizInclude,
  });
}

export async function listQuizzes(filters: {
  scope?: 'lesson' | 'unit' | 'pretest' | 'posttest';
  courseKey?: string;
  moduleId?: string;
  episodeId?: string;
}) {
  return prisma.quiz.findMany({
    where: {
      ...(filters.scope ? { scope: filters.scope } : {}),
      ...(filters.courseKey ? { courseKey: filters.courseKey } : {}),
      ...(filters.moduleId ? { moduleId: filters.moduleId } : {}),
      ...(filters.episodeId ? { episodeId: filters.episodeId } : {}),
    },
    orderBy: [{ sequenceOrder: 'asc' }, { createdAt: 'asc' }],
    include: quizInclude,
  });
}

export async function deleteQuiz(quizId: string) {
  await prisma.quiz.delete({ where: { id: quizId } });
}

function normalizeQuestionChoices(
  questionType: QuizQuestionType,
  choices: { id?: string; choiceText: string; isCorrect: boolean; sequenceOrder?: number }[] | undefined,
  correctBoolean: boolean | undefined,
) {
  if (questionType === 'true_false') {
    return [
      { choiceText: 'True', isCorrect: Boolean(correctBoolean), sequenceOrder: 1 },
      { choiceText: 'False', isCorrect: !Boolean(correctBoolean), sequenceOrder: 2 },
    ];
  }

  const normalized = (choices ?? [])
    .map((choice, index) => ({
      id: choice.id,
      choiceText: choice.choiceText.trim(),
      isCorrect: Boolean(choice.isCorrect),
      sequenceOrder: choice.sequenceOrder ?? index + 1,
    }))
    .filter((choice) => choice.choiceText.length > 0);

  if (normalized.length < 2) {
    throw new AppError(422, 'MCQ questions require at least two answer choices', 'VALIDATION_ERROR');
  }
  if (!normalized.some((choice) => choice.isCorrect)) {
    throw new AppError(422, 'At least one correct choice is required', 'VALIDATION_ERROR');
  }

  return normalized;
}

export async function createQuestion(
  quizId: string,
  input: {
    questionType: QuizQuestionType;
    dimension?: AssessmentDimension | null;
    questionText: string;
    explanation?: string | null;
    hint?: string | null;
    weight?: number;
    correctBoolean?: boolean;
    choices?: { choiceText: string; isCorrect: boolean; sequenceOrder?: number }[];
  },
) {
  const lastQuestion = await prisma.quizQuestion.findFirst({
    where: { quizId },
    orderBy: { sequenceOrder: 'desc' },
    select: { sequenceOrder: true },
  });

  const choices = normalizeQuestionChoices(input.questionType, input.choices, input.correctBoolean);

  return prisma.quizQuestion.create({
    data: {
      quizId,
      questionType: input.questionType,
      dimension: input.dimension ?? null,
      questionText: input.questionText,
      explanation: input.explanation ?? null,
      hint: input.hint ?? null,
      weight: input.weight ?? 1,
      sequenceOrder: (lastQuestion?.sequenceOrder ?? 0) + 1,
      choices: {
        create: choices.map((choice) => ({
          choiceText: choice.choiceText,
          isCorrect: choice.isCorrect,
          sequenceOrder: choice.sequenceOrder,
        })),
      },
    },
    include: {
      choices: {
        orderBy: { sequenceOrder: 'asc' },
      },
    },
  });
}

export async function updateQuestion(
  questionId: string,
  input: {
    questionType?: QuizQuestionType;
    dimension?: AssessmentDimension | null;
    questionText?: string;
    explanation?: string | null;
    hint?: string | null;
    weight?: number;
    correctBoolean?: boolean;
    choices?: { id?: string; choiceText: string; isCorrect: boolean; sequenceOrder?: number }[];
  },
) {
  const existing = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: {
      choices: {
        orderBy: { sequenceOrder: 'asc' },
      },
    },
  });

  if (!existing) throw new AppError(404, 'Question not found', 'NOT_FOUND');

  const questionType = input.questionType ?? existing.questionType;
  const choices = normalizeQuestionChoices(questionType, input.choices, input.correctBoolean);

  await prisma.quizQuestion.update({
    where: { id: questionId },
    data: {
      questionType,
      dimension: input.dimension,
      questionText: input.questionText,
      explanation: input.explanation,
      hint: input.hint,
      weight: input.weight,
    },
  });

  await prisma.quizChoice.deleteMany({ where: { questionId } });
  return prisma.quizQuestion.update({
    where: { id: questionId },
    data: {
      choices: {
        create: choices.map((choice, index) => ({
          choiceText: choice.choiceText,
          isCorrect: choice.isCorrect,
          sequenceOrder: choice.sequenceOrder ?? index + 1,
        })),
      },
    },
    include: {
      choices: {
        orderBy: { sequenceOrder: 'asc' },
      },
    },
  });
}

export async function deleteQuestion(questionId: string) {
  await prisma.quizQuestion.delete({ where: { id: questionId } });
}

export async function duplicateQuestion(questionId: string) {
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: {
      choices: {
        orderBy: { sequenceOrder: 'asc' },
      },
    },
  });

  if (!question) throw new AppError(404, 'Question not found', 'NOT_FOUND');

  const lastQuestion = await prisma.quizQuestion.findFirst({
    where: { quizId: question.quizId },
    orderBy: { sequenceOrder: 'desc' },
    select: { sequenceOrder: true },
  });

  return prisma.quizQuestion.create({
    data: {
      quizId: question.quizId,
      questionType: question.questionType,
      dimension: question.dimension,
      questionText: `${question.questionText} (Copy)`,
      explanation: question.explanation,
      hint: question.hint,
      weight: question.weight,
      sequenceOrder: (lastQuestion?.sequenceOrder ?? 0) + 1,
      choices: {
        create: question.choices.map((choice, index) => ({
          choiceText: choice.choiceText,
          isCorrect: choice.isCorrect,
          sequenceOrder: index + 1,
        })),
      },
    },
    include: {
      choices: {
        orderBy: { sequenceOrder: 'asc' },
      },
    },
  });
}

export async function reorderQuestions(items: { id: string; sequenceOrder: number }[]) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.quizQuestion.update({
        where: { id: item.id },
        data: { sequenceOrder: item.sequenceOrder },
      }),
    ),
  );
}

export async function reorderQuizzes(items: { id: string; sequenceOrder: number }[]) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.quiz.update({
        where: { id: item.id },
        data: { sequenceOrder: item.sequenceOrder },
      }),
    ),
  );
}

export async function getLatestAttempt(quizId: string, learnerId: string, sessionId?: string) {
  const where = {
    quizId,
    learnerId,
    ...(sessionId ? { sessionId } : {}),
  };

  const [attempt, totalAttempts] = await Promise.all([
    prisma.quizAttempt.findFirst({
      where,
      orderBy: { submittedAt: 'desc' },
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
    }),
    prisma.quizAttempt.count({ where }),
  ]);

  return { attempt, totalAttempts };
}

export async function submitQuiz(input: {
  quizId: string;
  learnerId: string;
  sessionId?: string;
  answers: { questionId: string; choiceId: string }[];
}) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: input.quizId },
    include: {
      questions: {
        orderBy: { sequenceOrder: 'asc' },
        include: {
          choices: {
            orderBy: { sequenceOrder: 'asc' },
          },
        },
      },
      episode: {
        select: { id: true, moduleId: true },
      },
    },
  });

  if (!quiz) throw new AppError(404, 'Quiz not found', 'NOT_FOUND');
  if (!quiz.isPublished) throw new AppError(403, 'Quiz is not published', 'QUIZ_UNAVAILABLE');

  if (input.sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: input.sessionId },
      select: { learnerId: true },
    });
    if (!session || session.learnerId !== input.learnerId) {
      throw new AppError(403, 'Session does not belong to this learner', 'FORBIDDEN');
    }
  }

  const priorAttemptsWhere = {
    quizId: input.quizId,
    learnerId: input.learnerId,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
  };

  const priorAttempts = await prisma.quizAttempt.count({
    where: priorAttemptsWhere,
  });

  if (priorAttempts >= quiz.attemptLimit) {
    throw new AppError(403, 'Attempt limit reached for this quiz', 'ATTEMPT_LIMIT_REACHED');
  }

  const answerMap = new Map(input.answers.map((answer) => [answer.questionId, answer.choiceId]));
  let scoreEarned = 0;
  let totalPossible = 0;

  const answerRows = quiz.questions.map((question) => {
    const selectedChoiceId = answerMap.get(question.id) ?? null;
    const correctChoice = question.choices.find((choice) => choice.isCorrect) ?? null;
    const isCorrect = Boolean(selectedChoiceId && correctChoice && selectedChoiceId === correctChoice.id);
    totalPossible += question.weight;
    if (isCorrect) scoreEarned += question.weight;

    return {
      questionId: question.id,
      selectedChoiceId,
      isCorrect,
      earnedScore: isCorrect ? question.weight : 0,
    };
  });

  const scorePct = totalPossible > 0 ? (scoreEarned / totalPossible) * 100 : 0;
  const passed = scorePct >= quiz.passingScore;
  const learner = await prisma.learner.findUnique({
    where: { id: input.learnerId },
    select: { participantId: true },
  });

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      learnerId: input.learnerId,
      sessionId: input.sessionId ?? null,
      moduleId: quiz.moduleId ?? quiz.episode?.moduleId ?? null,
      episodeId: quiz.episodeId ?? null,
      status: 'submitted',
      startedAt: new Date(),
      submittedAt: new Date(),
      scorePct,
      scoreEarned,
      totalPossible,
      passed,
      metadata: {
        submissionSource: 'lesson_flow',
        answerCount: input.answers.length,
      } as Prisma.JsonObject,
      answers: {
        create: answerRows,
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

  if (learner?.participantId && input.sessionId) {
    await prisma.activityLogRecord.create({
      data: {
        participantId: learner.participantId,
        sessionId: input.sessionId,
        moduleId: quiz.moduleId ?? quiz.episode?.moduleId ?? null,
        lessonId: quiz.episodeId ?? null,
        activityId: quiz.id,
        eventType: 'quiz',
        eventName: 'quiz_submitted',
        actorRole: 'learner',
        metadata: {
          attemptId: attempt.id,
          passed,
          scorePct,
          scoreEarned,
          totalPossible,
        } as Prisma.JsonObject,
      },
    });
  }

  return { quiz, attempt, totalAttempts: priorAttempts + 1 };
}
