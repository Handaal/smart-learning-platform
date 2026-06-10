import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './assessment.controller';

const router = Router();

// Start a new assessment form
router.post('/start',     authenticate, ctrl.start);

// Submit completed assessment
router.post('/:id/submit', authenticate, ctrl.submit);

// Get a specific assessment
router.get('/:id',         authenticate, ctrl.getById);

// Get all assessments for a learner (pre/mid/post/transfer)
router.get('/learner/:learnerId', authenticate, ctrl.getByLearner);

// Research Admin: all assessments with scoring
router.get('/',
  authenticate,
  requireRole('research_admin'),
  ctrl.listAll,
);

export default router;
