import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './research.controller';

const router = Router();

// All routes research-admin only
router.use(authenticate, requireRole('research_admin'));

// Core analytics views
router.get('/competency-gain',        ctrl.competencyGain);
router.get('/emotion-frequency',      ctrl.emotionFrequency);
router.get('/adaptive-effectiveness', ctrl.adaptiveEffectiveness);
router.get('/engagement',             ctrl.engagement);
router.get('/response-types',        ctrl.responseTypeDistribution);
router.get('/reflection-depth',       ctrl.reflectionDepth);
router.get('/content-engagement',     ctrl.contentEngagement);
router.get('/assessment-latency',     ctrl.assessmentLatency);
router.get('/timeline-heatmap',       ctrl.timelineHeatmap);
router.get('/assessment-results',     ctrl.assessmentResults);
router.post('/admin-simulations',     ctrl.logAdminSimulation);

// Data exports (anonymised CSV)
router.get('/export/sessions',        ctrl.exportSessions);
router.get('/export/emotion-events',  ctrl.exportEmotionEvents);
router.get('/export/timeline-heatmap', ctrl.exportTimelineHeatmap);
router.get('/export/competency',      ctrl.exportCompetency);
router.get('/export/reflections',     ctrl.exportReflections);
router.get('/export/merged-ml-dataset', ctrl.exportMergedAnalytics);
router.get('/export/assessment-results', ctrl.exportAssessmentResultsXlsx);

// Participant summary (single participant)
router.get('/participant/:participantId', ctrl.participantSummary);

export default router;
