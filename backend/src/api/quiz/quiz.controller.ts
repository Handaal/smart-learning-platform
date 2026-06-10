import { NextFunction, Request, Response } from 'express';
import { AssessmentDimension, QuizQuestionType } from '@prisma/client';
import { z } from 'zod';
import * as svc from './quiz.service';
import { AppError } from '../../middleware/errorHandler';

const QuizSchema = z.object({
  title: z.string().min(2),
  description: z.string().trim().optional().nullable(),
  scope: z.enum(['lesson', 'unit', 'pretest', 'posttest']).default('lesson'),
  courseKey: z.string().trim().optional().nullable(),
  moduleId: z.string().optional().nullable(),
  episodeId: z.string().optional().nullable(),
  passingScore: z.number().int().min(0).max(100).optional(),
  attemptLimit: z.number().int().min(1).max(10).optional(),
  showExplanationAfterSubmit: z.boolean().optional(),
  allowRetry: z.boolean().optional(),
  adaptiveOnFail: z.string().trim().optional().nullable(),
  adaptiveOnPass: z.string().trim().optional().nullable(),
  isPublished: z.boolean().optional(),
});

const QuestionChoiceSchema = z.object({
  id: z.string().optional(),
  choiceText: z.string().min(1),
  isCorrect: z.boolean().default(false),
  sequenceOrder: z.number().int().min(1).optional(),
});

const QuestionSchema = z.object({
  questionType: z.nativeEnum(QuizQuestionType),
  dimension: z.nativeEnum(AssessmentDimension).optional().nullable(),
  questionText: z.string().min(3),
  explanation: z.string().trim().optional().nullable(),
  hint: z.string().trim().optional().nullable(),
  weight: z.number().int().min(1).max(10).optional(),
  correctBoolean: z.boolean().optional(),
  choices: z.array(QuestionChoiceSchema).optional(),
});

const QuizListSchema = z.object({
  scope: z.enum(['lesson', 'unit', 'pretest', 'posttest']).optional(),
  courseKey: z.string().trim().optional(),
  moduleId: z.string().trim().optional(),
  episodeId: z.string().trim().optional(),
});

const ReorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      sequenceOrder: z.number().int().min(1),
    }),
  ),
});

const SubmitQuizSchema = z.object({
  sessionId: z.string().optional(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      choiceId: z.string(),
    }),
  ),
});

function assertLearnerAccess(req: Request, learnerId: string) {
  if (req.user?.role === 'learner' && req.user.sub !== learnerId) {
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
  }
}

function sanitizeQuizForLearner<T extends { questions: Array<{ choices: Array<Record<string, unknown>> }> }>(quiz: T) {
  return quiz;
}

export async function listQuizzes(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = QuizListSchema.parse(req.query);
    const quizzes = await svc.listQuizzes(filters);
    res.json({ data: quizzes });
  } catch (e) { next(e); }
}

export async function createQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    const body = QuizSchema.parse(req.body);
    const quiz = await svc.createQuiz(body);
    res.status(201).json({ data: quiz });
  } catch (e) { next(e); }
}

export async function updateQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    const body = QuizSchema.partial().parse(req.body);
    const quiz = await svc.updateQuiz(req.params.quizId, body);
    res.json({ data: quiz });
  } catch (e) { next(e); }
}

export async function deleteQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteQuiz(req.params.quizId);
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function reorderQuizzes(req: Request, res: Response, next: NextFunction) {
  try {
    const { items } = ReorderSchema.parse(req.body);
    await svc.reorderQuizzes(items);
    res.json({ status: 'ok' });
  } catch (e) { next(e); }
}

export async function createQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const body = QuestionSchema.parse(req.body) as {
      questionType: QuizQuestionType;
      dimension?: AssessmentDimension | null;
      questionText: string;
      explanation?: string | null;
      hint?: string | null;
      weight?: number;
      correctBoolean?: boolean;
      choices?: { choiceText: string; isCorrect?: boolean; sequenceOrder?: number }[];
    };
    const question = await svc.createQuestion(req.params.quizId, body as any);
    res.status(201).json({ data: question });
  } catch (e) { next(e); }
}

export async function updateQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const body = QuestionSchema.partial().parse(req.body) as {
      questionType?: QuizQuestionType;
      dimension?: AssessmentDimension | null;
      questionText?: string;
      explanation?: string | null;
      hint?: string | null;
      weight?: number;
      correctBoolean?: boolean;
      choices?: { choiceText: string; isCorrect?: boolean; sequenceOrder?: number }[];
    };
    const question = await svc.updateQuestion(req.params.questionId, body as any);
    res.json({ data: question });
  } catch (e) { next(e); }
}

export async function deleteQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteQuestion(req.params.questionId);
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function duplicateQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const question = await svc.duplicateQuestion(req.params.questionId);
    res.status(201).json({ data: question });
  } catch (e) { next(e); }
}

export async function reorderQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { items } = ReorderSchema.parse(req.body);
    await svc.reorderQuestions(items);
    res.json({ status: 'ok' });
  } catch (e) { next(e); }
}

export async function getLatestAttempt(req: Request, res: Response, next: NextFunction) {
  try {
    const learnerId = req.user?.role === 'research_admin'
      ? String(req.query.learnerId ?? '')
      : req.user?.sub ?? '';
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;

    assertLearnerAccess(req, learnerId);
    const attemptState = await svc.getLatestAttempt(req.params.quizId, learnerId, sessionId);

    if (!attemptState.attempt) {
      return res.json({ data: null });
    }

    res.json({ data: attemptState });
  } catch (e) { next(e); }
}

export async function submitQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    const body = SubmitQuizSchema.parse(req.body);
    const learnerId = req.user?.sub ?? '';
    const result = await svc.submitQuiz({
      quizId: req.params.quizId,
      learnerId,
      sessionId: body.sessionId,
      answers: body.answers,
    });

    const learnerQuiz = sanitizeQuizForLearner(result.quiz);
    res.status(201).json({
      data: {
        quiz: learnerQuiz,
        attempt: result.attempt,
        totalAttempts: result.totalAttempts,
      },
    });
  } catch (e) { next(e); }
}

export { sanitizeQuizForLearner };
