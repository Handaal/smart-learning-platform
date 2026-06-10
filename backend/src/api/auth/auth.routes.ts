import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimiter';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './auth.controller';

const router = Router();

router.post('/register', authLimiter, ctrl.register);
router.post('/login',    authLimiter, ctrl.login);
router.post('/refresh',  authLimiter, ctrl.refresh);
router.post('/logout',   authenticate, ctrl.logout);
router.get( '/me',       authenticate, ctrl.me);

export default router;
