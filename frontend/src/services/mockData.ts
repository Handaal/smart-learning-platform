/* ================================================================
   STEP Platform — Mock Data for UI Preview
   All data reflects realistic IDPM (Instructional Design Project
   Management) training scenarios for the PhD research study.
   ================================================================ */

// ── Modules ────────────────────────────────────────────────────
export const MOCK_MODULES = [
  {
    id: 'M1',
    sequenceOrder: 1,
    title: 'Project Scope & Stakeholder Analysis',
    description:
      'Define learning project boundaries, identify stakeholders, negotiate expectations, and create a scope statement for an eLearning initiative.',
    primaryCompetency: 'Scoping',
    estimatedDurationMin: 45,
    sessionCount: 3,
    episodes: [
      { id: 'M1E1', title: 'Client Brief Analysis', description: 'Review a realistic client brief and extract key requirements for the eLearning project.' },
      { id: 'M1E2', title: 'Stakeholder Mapping', description: 'Identify stakeholders, analyse their influence/interest, and plan communication strategies.' },
      { id: 'M1E3', title: 'Scope Statement', description: 'Draft a formal scope statement integrating constraints, deliverables, and success criteria.' },
    ],
  },
  {
    id: 'M2',
    sequenceOrder: 2,
    title: 'Work Breakdown & Scheduling',
    description:
      'Decompose learning projects using WBS, estimate task durations, assign resources, and build a Gantt chart for an instructional design project.',
    primaryCompetency: 'Planning',
    estimatedDurationMin: 50,
    sessionCount: 3,
    episodes: [
      { id: 'M2E1', title: 'WBS Construction', description: 'Build a hierarchical WBS for a blended learning programme.' },
      { id: 'M2E2', title: 'Duration Estimation', description: 'Apply analogous and parametric estimation techniques to ID tasks.' },
      { id: 'M2E3', title: 'Gantt Chart Development', description: 'Create a Gantt chart with dependencies and milestones.' },
    ],
  },
  {
    id: 'M3',
    sequenceOrder: 3,
    title: 'Team Communication & Conflict Resolution',
    description:
      'Practice effective communication with SMEs, developers, and sponsors through realistic scenario dialogues and conflict-resolution exercises.',
    primaryCompetency: 'Communication',
    estimatedDurationMin: 40,
    sessionCount: 2,
    episodes: [
      { id: 'M3E1', title: 'SME Interview Simulation', description: 'Conduct a virtual interview with a subject matter expert to elicit content.' },
      { id: 'M3E2', title: 'Conflict Scenario', description: 'Navigate a disagreement between the sponsor and development team.' },
    ],
  },
  {
    id: 'M4',
    sequenceOrder: 4,
    title: 'Risk Identification & Mitigation',
    description:
      'Identify common risks in learning projects, build a risk register, and develop mitigation strategies using probability-impact analysis.',
    primaryCompetency: 'Risk Mgmt',
    estimatedDurationMin: 35,
    sessionCount: 2,
    episodes: [
      { id: 'M4E1', title: 'Risk Brainstorming', description: 'Identify risks for a corporate eLearning rollout scenario.' },
      { id: 'M4E2', title: 'Mitigation Planning', description: 'Prioritise risks and develop response strategies.' },
    ],
  },
  {
    id: 'M5',
    sequenceOrder: 5,
    title: 'Decision-Making Under Pressure',
    description:
      'Face time-constrained trade-off decisions involving scope, budget, and quality in a simulated project crisis scenario.',
    primaryCompetency: 'Decisions',
    estimatedDurationMin: 40,
    sessionCount: 2,
    episodes: [
      { id: 'M5E1', title: 'Budget Crunch Scenario', description: 'Handle a 30% budget cut while maintaining quality standards.' },
      { id: 'M5E2', title: 'Launch Decision', description: 'Decide whether to launch with known issues or delay the project.' },
    ],
  },
];

// ── Module Progress (per learner) ──────────────────────────────
export const MOCK_MODULE_PROGRESS = [
  { moduleId: 'M1', status: 'complete',    attempts: 3, module: { title: 'Project Scope & Stakeholder Analysis' } },
  { moduleId: 'M2', status: 'complete',    attempts: 3, module: { title: 'Work Breakdown & Scheduling' } },
  { moduleId: 'M3', status: 'in_progress', attempts: 1, module: { title: 'Team Communication & Conflict Resolution' } },
  { moduleId: 'M4', status: 'not_started', attempts: 0, module: { title: 'Risk Identification & Mitigation' } },
  { moduleId: 'M5', status: 'not_started', attempts: 0, module: { title: 'Decision-Making Under Pressure' } },
];

// ── Scenario Progress ──────────────────────────────────────────
export const MOCK_SCENARIO_PROGRESS = [
  { moduleId: 'M1', status: 'complete' },
  { moduleId: 'M2', status: 'complete' },
  { moduleId: 'M3', status: 'in_progress' },
];

// ── Learner Progress Summary ───────────────────────────────────
export const MOCK_LEARNER_PROGRESS = {
  moduleProgress: MOCK_MODULE_PROGRESS,
  completedSessions: 8,
  latestCompetency: {
    composite: 0.68,
    c1: 0.82,
    c2: 0.75,
    c3: 0.61,
    c4: 0.42,
    c5: 0.38,
  },
};

// ── Sessions ───────────────────────────────────────────────────
export const MOCK_SESSIONS = [
  { id: 's1', moduleId: 'M3', startedAt: '2026-04-06T09:12:00Z', durationMin: 38, completionPct: 45 },
  { id: 's2', moduleId: 'M2', startedAt: '2026-04-05T14:20:00Z', durationMin: 42, completionPct: 100 },
  { id: 's3', moduleId: 'M2', startedAt: '2026-04-04T11:05:00Z', durationMin: 51, completionPct: 100 },
  { id: 's4', moduleId: 'M2', startedAt: '2026-04-03T16:30:00Z', durationMin: 48, completionPct: 100 },
  { id: 's5', moduleId: 'M1', startedAt: '2026-04-02T10:00:00Z', durationMin: 55, completionPct: 100 },
  { id: 's6', moduleId: 'M1', startedAt: '2026-04-01T13:45:00Z', durationMin: 40, completionPct: 100 },
  { id: 's7', moduleId: 'M1', startedAt: '2026-03-31T09:30:00Z', durationMin: 44, completionPct: 100 },
  { id: 's8', moduleId: 'M1', startedAt: '2026-03-30T15:00:00Z', durationMin: 35, completionPct: 100 },
];

// ── Session Detail (for SessionPage) ───────────────────────────
export const MOCK_SESSION_DETAIL = {
  id: 'session-demo',
  moduleId: 'M3',
  startedAt: '2026-04-06T09:12:00Z',
  completionPct: 45,
};

// ── Research: Competency Gain ──────────────────────────────────
export const MOCK_COMPETENCY_GAIN = [
  { participant_id: 'STEP-2026-001', cohort: 'experimental', pre_score: 8.2,  post_score: 14.8, gain: 6.6  },
  { participant_id: 'STEP-2026-002', cohort: 'experimental', pre_score: 9.4,  post_score: 15.1, gain: 5.7  },
  { participant_id: 'STEP-2026-003', cohort: 'control',      pre_score: 7.8,  post_score: 10.2, gain: 2.4  },
  { participant_id: 'STEP-2026-004', cohort: 'experimental', pre_score: 10.1, post_score: 16.5, gain: 6.4  },
  { participant_id: 'STEP-2026-005', cohort: 'control',      pre_score: 8.6,  post_score: 11.3, gain: 2.7  },
  { participant_id: 'STEP-2026-006', cohort: 'experimental', pre_score: 7.2,  post_score: 13.9, gain: 6.7  },
  { participant_id: 'STEP-2026-007', cohort: 'control',      pre_score: 9.0,  post_score: 10.8, gain: 1.8  },
  { participant_id: 'STEP-2026-008', cohort: 'experimental', pre_score: 11.0, post_score: 17.2, gain: 6.2  },
  { participant_id: 'STEP-2026-009', cohort: 'control',      pre_score: 8.3,  post_score: 11.0, gain: 2.7  },
  { participant_id: 'STEP-2026-010', cohort: 'experimental', pre_score: 6.9,  post_score: 14.1, gain: 7.2  },
  { participant_id: 'STEP-2026-011', cohort: 'control',      pre_score: 9.5,  post_score: 11.9, gain: 2.4  },
  { participant_id: 'STEP-2026-012', cohort: 'experimental', pre_score: 8.8,  post_score: 15.6, gain: 6.8  },
];

// ── Research: Engagement ───────────────────────────────────────
export const MOCK_ENGAGEMENT = [
  { participant_id: 'STEP-2026-001', cohort: 'experimental', sessions: 12, avgDuration: 42, daysActive: 18 },
  { participant_id: 'STEP-2026-002', cohort: 'experimental', sessions: 10, avgDuration: 38, daysActive: 15 },
  { participant_id: 'STEP-2026-003', cohort: 'control',      sessions: 8,  avgDuration: 35, daysActive: 12 },
  { participant_id: 'STEP-2026-004', cohort: 'experimental', sessions: 14, avgDuration: 45, daysActive: 20 },
  { participant_id: 'STEP-2026-005', cohort: 'control',      sessions: 7,  avgDuration: 32, daysActive: 10 },
  { participant_id: 'STEP-2026-006', cohort: 'experimental', sessions: 11, avgDuration: 40, daysActive: 16 },
  { participant_id: 'STEP-2026-007', cohort: 'control',      sessions: 9,  avgDuration: 36, daysActive: 13 },
  { participant_id: 'STEP-2026-008', cohort: 'experimental', sessions: 13, avgDuration: 44, daysActive: 19 },
  { participant_id: 'STEP-2026-009', cohort: 'control',      sessions: 6,  avgDuration: 30, daysActive: 9  },
  { participant_id: 'STEP-2026-010', cohort: 'experimental', sessions: 15, avgDuration: 47, daysActive: 21 },
  { participant_id: 'STEP-2026-011', cohort: 'control',      sessions: 8,  avgDuration: 34, daysActive: 11 },
  { participant_id: 'STEP-2026-012', cohort: 'experimental', sessions: 12, avgDuration: 41, daysActive: 17 },
];

// ── Research: Adaptive Effectiveness ───────────────────────────
export const MOCK_ADAPTIVE_EFFECTIVENESS = [
  { trigger_type: 'adaptive_alert.frustration.mini_task_strip', n: 48, intervention: 'task_decomposition', effectiveness_pct: 72, avg_latency_sec: 3.2 },
  { trigger_type: 'adaptive_alert.confusion.side_panel', n: 35, intervention: 'scaffolded_hint', effectiveness_pct: 68, avg_latency_sec: 4.1 },
  { trigger_type: 'adaptive_alert.boredom.popup_card', n: 22, intervention: 'interactive_case_switch', effectiveness_pct: 81, avg_latency_sec: 5.5 },
  { trigger_type: 'adaptive_alert.test_anxiety.information_window', n: 18, intervention: 'neutral_reassurance', effectiveness_pct: 65, avg_latency_sec: 2.8 },
  { trigger_type: 'adaptive_alert.no_face_low_confidence.operational_safety_protocol', n: 31, intervention: 'operational_safety_protocol', effectiveness_pct: 58, avg_latency_sec: 8.2 },
  { trigger_type: 'adaptive_alert.high_engagement.advanced_path', n: 14, intervention: 'advanced_path', effectiveness_pct: 79, avg_latency_sec: 1.9 },
  { trigger_type: 'adaptive_alert.neutral.standard_path', n: 120, intervention: 'do_nothing', effectiveness_pct: 92, avg_latency_sec: 0 },
];

// ── Research: Reflection Depth ─────────────────────────────────
export const MOCK_REFLECTION_DEPTH = [
  { participant_id: 'STEP-2026-001', cohort: 'experimental', reflection_depth: 'critical',    count: 5, avg_score: 0.87, avg_valence:  0.214 },
  { participant_id: 'STEP-2026-002', cohort: 'experimental', reflection_depth: 'analytical',  count: 4, avg_score: 0.72, avg_valence:  0.156 },
  { participant_id: 'STEP-2026-003', cohort: 'control',      reflection_depth: 'descriptive', count: 6, avg_score: 0.45, avg_valence:  0.089 },
  { participant_id: 'STEP-2026-004', cohort: 'experimental', reflection_depth: 'critical',    count: 7, avg_score: 0.91, avg_valence:  0.302 },
  { participant_id: 'STEP-2026-005', cohort: 'control',      reflection_depth: 'descriptive', count: 3, avg_score: 0.38, avg_valence: -0.041 },
  { participant_id: 'STEP-2026-006', cohort: 'experimental', reflection_depth: 'analytical',  count: 5, avg_score: 0.78, avg_valence:  0.188 },
  { participant_id: 'STEP-2026-007', cohort: 'control',      reflection_depth: 'analytical',  count: 4, avg_score: 0.52, avg_valence:  0.067 },
  { participant_id: 'STEP-2026-008', cohort: 'experimental', reflection_depth: 'critical',    count: 6, avg_score: 0.89, avg_valence:  0.275 },
  { participant_id: 'STEP-2026-009', cohort: 'control',      reflection_depth: 'descriptive', count: 2, avg_score: 0.33, avg_valence: -0.125 },
  { participant_id: 'STEP-2026-010', cohort: 'experimental', reflection_depth: 'critical',    count: 8, avg_score: 0.94, avg_valence:  0.341 },
];

export const MOCK_RESPONSE_TYPE_DISTRIBUTION = [
  { cohort: 'experimental', response_type: 'adaptive_responder', n: 9 },
  { cohort: 'experimental', response_type: 'support_seeking', n: 4 },
  { cohort: 'experimental', response_type: 'challenge_oriented', n: 3 },
  { cohort: 'control', response_type: 'steady_linear', n: 7 },
  { cohort: 'control', response_type: 'hesitant_linear', n: 5 },
];

export const MOCK_TIMELINE_HEATMAP = [
  { participantId: 'EXP00000000000000001', sessionId: 's1', timestamp: '2026-04-06T09:12:00Z', detectedEmotion: 'neutral', confidence: 0.71, currentLessonActivity: 'M3E1', engagementLevel: 'moderate', triggeredAdaptiveAction: 'do_nothing', postActionOutcome: 'continue-current-activity', matchedScenario: 'neutral' },
  { participantId: 'EXP00000000000000001', sessionId: 's1', timestamp: '2026-04-06T09:18:00Z', detectedEmotion: 'confusion', confidence: 0.78, currentLessonActivity: 'M3E1', engagementLevel: 'moderate', triggeredAdaptiveAction: 'scaffolded_hint', postActionOutcome: 'clarification-path-opened', matchedScenario: 'confusion' },
  { participantId: 'EXP00000000000000001', sessionId: 's1', timestamp: '2026-04-06T09:24:00Z', detectedEmotion: 'frustration', confidence: 0.81, currentLessonActivity: 'M3E1', engagementLevel: 'low', triggeredAdaptiveAction: 'task_decomposition', postActionOutcome: 'supportive-scaffold-delivered', matchedScenario: 'frustration' },
  { participantId: 'EXP00000000000000001', sessionId: 's1', timestamp: '2026-04-06T09:30:00Z', detectedEmotion: 'no_face_low_confidence', confidence: 0.62, currentLessonActivity: 'M3E1', engagementLevel: 'low', triggeredAdaptiveAction: 'operational_safety_protocol', postActionOutcome: 'performance-only-fallback', matchedScenario: 'no_face_low_confidence' },
  { participantId: 'EXP00000000000000001', sessionId: 's1', timestamp: '2026-04-06T09:36:00Z', detectedEmotion: 'boredom_disengagement', confidence: 0.73, currentLessonActivity: 'M3E2', engagementLevel: 'low', triggeredAdaptiveAction: 'interactive_case_switch', postActionOutcome: 'interactive-reengagement-activated', matchedScenario: 'boredom_disengagement' },
  { participantId: 'EXP00000000000000001', sessionId: 's1', timestamp: '2026-04-06T09:42:00Z', detectedEmotion: 'high_engagement', confidence: 0.88, currentLessonActivity: 'M3E2', engagementLevel: 'high', triggeredAdaptiveAction: 'advanced_path', postActionOutcome: 'challenge-lane-unlocked', matchedScenario: 'high_engagement' },
];

// ── Research: Participant Summary ──────────────────────────────
export const MOCK_PARTICIPANT_SUMMARY = {
  participantId: 'STEP-2026-001',
  cohort: 'experimental',
  createdAt: '2026-03-15T08:00:00Z',
  competencyRecords: [
    { c1: 0.82, c2: 0.75, c3: 0.61, c4: 0.42, c5: 0.38, recordedAt: '2026-04-06T10:00:00Z' },
  ],
  moduleProgress: MOCK_MODULE_PROGRESS,
  assessments: [
    { id: 'a1', form: 'pre',  isComplete: true, totalScore: 8.2,  scoreS1: 2.0, scoreS2: 1.5, scoreS3: 1.8, scoreS4: 1.4, scoreS5: 1.5 },
    { id: 'a2', form: 'mid',  isComplete: true, totalScore: 12.4, scoreS1: 2.8, scoreS2: 2.5, scoreS3: 2.6, scoreS4: 2.1, scoreS5: 2.4 },
    { id: 'a3', form: 'post', isComplete: true, totalScore: 14.8, scoreS1: 3.4, scoreS2: 3.1, scoreS3: 2.9, scoreS4: 2.7, scoreS5: 2.7 },
  ],
  sessions: MOCK_SESSIONS,
};

// ── Feature flag: use mock data when backend is unavailable ────
export const USE_MOCK = false;
