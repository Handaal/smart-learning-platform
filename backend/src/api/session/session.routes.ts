import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './session.controller';

const router = Router();

router.post('/',          authenticate, ctrl.startSession);
router.get( '/:id',       authenticate, ctrl.getSession);
router.patch('/:id',      authenticate, ctrl.updateSession);
router.post('/:id/end',   authenticate, ctrl.endSession);

// All sessions for a learner (used by learner dashboard + research admin)
router.get('/learner/:learnerId',
  authenticate,
  ctrl.getSessionsByLearner,
);

// Research Admin: full session list with filters
router.get('/',
  authenticate,
  requireRole('research_admin'),
  ctrl.listSessions,
);

export default router;
