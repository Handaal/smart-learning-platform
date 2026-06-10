import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './reflection.controller';

const router = Router();

// Submit a reflection
router.post('/',          authenticate, ctrl.submit);

// Get reflections for a session
router.get('/session/:sessionId', authenticate, ctrl.getBySession);

// Get all reflections for a learner
router.get('/learner/:learnerId', authenticate, ctrl.getByLearner);

// Research Admin: all reflections with NLP analysis
router.get('/',
  authenticate,
  requireRole('research_admin'),
  ctrl.listAll,
);

export default router;
