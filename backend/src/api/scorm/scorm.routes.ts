import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './scorm.controller';

const router = Router();

// Learner: commit a CMI snapshot for a SCORM block, and resume one.
router.post('/progress', authenticate, ctrl.commit);
router.get('/progress/:sessionId/:contentId', authenticate, ctrl.getOne);

// Research Admin: every participant's SCORM progress for the dashboard.
router.get('/admin/progress', authenticate, requireRole('research_admin'), ctrl.listAll);

export default router;
