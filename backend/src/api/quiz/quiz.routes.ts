import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './quiz.controller';

const router = Router();

router.get('/', authenticate, requireRole('research_admin'), ctrl.listQuizzes);
router.get('/:quizId/attempts/latest', authenticate, ctrl.getLatestAttempt);
router.post('/:quizId/submit', authenticate, ctrl.submitQuiz);

router.post('/', authenticate, requireRole('research_admin'), ctrl.createQuiz);
router.patch('/:quizId', authenticate, requireRole('research_admin'), ctrl.updateQuiz);
router.delete('/:quizId', authenticate, requireRole('research_admin'), ctrl.deleteQuiz);
router.post('/reorder', authenticate, requireRole('research_admin'), ctrl.reorderQuizzes);

router.post('/:quizId/questions', authenticate, requireRole('research_admin'), ctrl.createQuestion);
router.patch('/questions/:questionId', authenticate, requireRole('research_admin'), ctrl.updateQuestion);
router.delete('/questions/:questionId', authenticate, requireRole('research_admin'), ctrl.deleteQuestion);
router.post('/questions/:questionId/duplicate', authenticate, requireRole('research_admin'), ctrl.duplicateQuestion);
router.post('/questions/reorder', authenticate, requireRole('research_admin'), ctrl.reorderQuestions);

export default router;
