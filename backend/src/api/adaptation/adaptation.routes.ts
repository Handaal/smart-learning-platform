import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './adaptation.controller';

const router = Router();

// Adaptive engine decision (called internally by session orchestrator)
router.post('/decide',    authenticate, ctrl.decide);

// Log result of an intervention (learner response)
router.patch('/events/:id/response', authenticate, ctrl.recordResponse);

// Research Admin audit of all adaptive events
router.get('/events',
  authenticate,
  requireRole('research_admin'),
  ctrl.listEvents,
);

// Effectiveness summary view
router.get('/effectiveness',
  authenticate,
  requireRole('research_admin'),
  ctrl.getEffectiveness,
);

export default router;
