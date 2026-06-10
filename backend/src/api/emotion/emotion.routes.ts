import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './emotion.controller';

const router = Router();

// REST ingest (fallback if WebSocket unavailable)
router.post('/events',    authenticate, ctrl.ingestEvent);

// Behavior window submission (all cohorts)
router.post('/behavior',  authenticate, ctrl.ingestBehavior);

// Session emotion timeline (learner-facing, for post-session chart)
router.get('/timeline/:sessionId', authenticate, ctrl.getSessionTimeline);

// Research Admin: aggregate emotion query
router.get('/aggregate',
  authenticate,
  requireRole('research_admin'),
  ctrl.getAggregate,
);

export default router;
