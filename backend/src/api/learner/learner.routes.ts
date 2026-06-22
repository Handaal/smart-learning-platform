import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './learner.controller';

const router = Router();

// Profile
router.get( '/:id/profile',  authenticate, ctrl.getProfile);
router.put( '/:id/profile',  authenticate, ctrl.updateProfile);

// Consent
router.get( '/:id/consent',  authenticate, ctrl.getConsent);
router.post('/:id/consent',  authenticate, ctrl.recordConsent);
router.post('/:id/withdraw', authenticate, ctrl.withdrawConsent);

// Progress overview
router.get('/:id/progress',  authenticate, ctrl.getProgress);

// Research Admin: access management
router.get('/admin/overview', authenticate, requireRole('research_admin'), ctrl.getAdminOverview);
router.patch('/admin/groups/:cohort', authenticate, requireRole('research_admin'), ctrl.updateCohortEmotionTracking);
router.patch('/admin/learners/:id', authenticate, requireRole('research_admin'), ctrl.updateLearnerAdminSettings);
router.delete('/admin/learners/:id', authenticate, requireRole('research_admin'), ctrl.deleteLearnerAccount);

// Research Admin: list all learners
router.get('/', authenticate, requireRole('research_admin'), ctrl.listLearners);

export default router;
