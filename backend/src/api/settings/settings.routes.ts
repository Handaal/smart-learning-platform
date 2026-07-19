import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './settings.controller';

const router = Router();

// Public: registration reads the consent text before the user has an account.
router.get('/consent', ctrl.getConsent);

// Admin-only: edit the consent/terms text shown at registration.
router.patch('/consent', authenticate, requireRole('research_admin'), ctrl.updateConsent);

export default router;
