import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './scenario.controller';

const router = Router();

// List all modules with episode summaries
router.get('/modules',             authenticate, ctrl.listModules);

// Get a single module with all episodes
router.get('/modules/:moduleId',   authenticate, ctrl.getModule);

// Get a specific episode content
router.get('/episodes/:episodeId', authenticate, ctrl.getEpisode);

// Get branching node options for a learner (personalised)
router.get('/nodes/:nodeId',       authenticate, ctrl.getBranchingNode);

// Record a branching decision
router.post('/decisions',          authenticate, ctrl.recordDecision);

// Get learner's scenario progress (cross-module)
router.get('/progress/:learnerId', authenticate, ctrl.getScenarioProgress);

// Upload learning content
router.post('/content/upload',     authenticate, requireRole('research_admin'), ctrl.uploadContent);
router.patch('/content/:contentId', authenticate, requireRole('research_admin'), ctrl.updateContent);
router.delete('/content/:contentId', authenticate, requireRole('research_admin'), ctrl.deleteContent);
router.post('/content/reorder', authenticate, requireRole('research_admin'), ctrl.reorderContent);

// CRUD for Modules
router.post('/modules/apply-outline', authenticate, requireRole('research_admin'), ctrl.applyResearchOutline);
router.post('/modules',            authenticate, requireRole('research_admin'), ctrl.createModule);
router.patch('/modules/:moduleId',  authenticate, requireRole('research_admin'), ctrl.updateModule);
router.delete('/modules/:moduleId', authenticate, requireRole('research_admin'), ctrl.deleteModule);

// CRUD for Episodes (Lessons)
router.post('/episodes',           authenticate, requireRole('research_admin'), ctrl.createEpisode);
router.patch('/episodes/:episodeId', authenticate, requireRole('research_admin'), ctrl.updateEpisode);
router.delete('/episodes/:episodeId', authenticate, requireRole('research_admin'), ctrl.deleteEpisode);

// Reordering
router.post('/reorder',            authenticate, requireRole('research_admin'), ctrl.reorderHierarchy);


export default router;
