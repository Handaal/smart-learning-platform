-- ============================================================
-- STEP Platform — Reference Data Seeds
-- Modules, Episodes, Reflection Prompts
-- ============================================================

-- ---- MODULES -----------------------------------------------
INSERT INTO module (id, title, description, primary_competency, secondary_competency,
                    estimated_duration_min, session_count, sequence_order, is_assessable)
VALUES
  ('M0', 'Onboarding & Calibration',
   'Profile setup, informed consent, baseline assessment, and emotion sensing calibration.',
   NULL, NULL, 60, 1, 0, FALSE),
  ('M1', 'Scoping the Learning Project',
   'Navigate ambiguous stakeholder briefs, conduct needs analysis, and produce a defensible Content Scope Document.',
   'C1', 'C3', 90, 2, 1, TRUE),
  ('M2', 'Building the Content Production Plan',
   'Construct a full project plan — WBS, Gantt, estimation, and constraint-handling — for a 12-week blended learning project.',
   'C2', 'C4', 100, 3, 2, TRUE),
  ('M3', 'Stakeholder Communication Dynamics',
   'Manage simultaneous stakeholder communication challenges using a simulated message-thread environment.',
   'C3', 'C5', 80, 2, 3, TRUE),
  ('M4', 'Risk Intelligence and Quality Gates',
   'Identify, classify, and mitigate IDPM-specific project risks; apply quality gate procedures under simulated crisis.',
   'C4', 'C1', 90, 2, 4, TRUE),
  ('M5', 'Decision-Making Under Ambiguity',
   'Capstone scenario: manage a launch-day project crisis with real time pressure, branching consequences, and retrospective facilitation.',
   'C5', 'C2', 80, 2, 5, TRUE);

-- ---- EPISODES (Module 1) -----------------------------------
INSERT INTO episode (id, module_id, title, sequence_order, base_scaffold,
                     expected_duration_min, emotional_trigger_expected, is_adaptive)
VALUES
  ('M1-1A', 'M1', 'The Brief — Receiving the Stakeholder Email',          1, 3, 15, 'Confusion', TRUE),
  ('M1-1B', 'M1', 'The Interview — Structured Needs Analysis',            2, 3, 25, 'Anxiety',   TRUE),
  ('M1-1C', 'M1', 'Scope Draft — Completing the CSD Template',           3, 3, 30, 'Frustration',TRUE),
  ('M1-1D', 'M1', 'Scope Review — Presenting to a Skeptical Stakeholder', 4, 3, 20, 'Anxiety',   TRUE);

-- ---- EPISODES (Module 2) -----------------------------------
INSERT INTO episode (id, module_id, title, sequence_order, base_scaffold,
                     expected_duration_min, emotional_trigger_expected, is_adaptive)
VALUES
  ('M2-2A', 'M2', 'Decompose — Work Breakdown Structure',           1, 3, 25, 'Confusion',   TRUE),
  ('M2-2B', 'M2', 'Estimate — Three-Point Task Estimation',         2, 3, 25, 'Frustration', TRUE),
  ('M2-2C', 'M2', 'Sequence — Dependencies and Critical Path',      3, 2, 25, 'Confusion',   TRUE),
  ('M2-2D', 'M2', 'Constrained — Revise Plan Under Scope Cut',      4, 2, 25, 'Anxiety',     TRUE);

-- ---- EPISODES (Module 3) -----------------------------------
INSERT INTO episode (id, module_id, title, sequence_order, base_scaffold,
                     expected_duration_min, emotional_trigger_expected, is_adaptive)
VALUES
  ('M3-3A', 'M3', 'Triage — Prioritise Three Simultaneous Messages', 1, 3, 20, 'Anxiety',     TRUE),
  ('M3-3B', 'M3', 'Executive Response — BLUF Structure',             2, 3, 25, 'Confusion',   TRUE),
  ('M3-3C', 'M3', 'SME Negotiation — Availability Crisis',           3, 3, 20, 'Frustration', TRUE),
  ('M3-3D', 'M3', 'Escalation — Managing the Consequence Cascade',   4, 2, 15, 'Anxiety',     TRUE);

-- ---- EPISODES (Module 4) -----------------------------------
INSERT INTO episode (id, module_id, title, sequence_order, base_scaffold,
                     expected_duration_min, emotional_trigger_expected, is_adaptive)
VALUES
  ('M4-4A', 'M4', 'Risk Register — Identify and Rate Project Risks',  1, 3, 30, 'Confusion',   TRUE),
  ('M4-4B', 'M4', 'Quality Gate — ADDIE Alpha Review',                2, 3, 30, 'Frustration', TRUE),
  ('M4-4C', 'M4', 'Go/No-Go — Launch Milestone Decision',             3, 2, 30, 'Anxiety',     TRUE);

-- ---- EPISODES (Module 5) -----------------------------------
INSERT INTO episode (id, module_id, title, sequence_order, base_scaffold,
                     expected_duration_min, emotional_trigger_expected, is_adaptive)
VALUES
  ('M5-5A', 'M5', 'Crisis Point — 72-Hour Launch Decision',     1, 2, 30, 'Anxiety',     TRUE),
  ('M5-5B', 'M5', 'Retrospective — Lessons Learned Facilitation', 2, 2, 25, 'Frustration', TRUE),
  ('M5-5C', 'M5', 'Debrief — Reflective Practice Synthesis',    3, 1, 25, 'Neutral',     FALSE);

-- ---- REFLECTION PROMPTS ------------------------------------
INSERT INTO reflection_prompt (id, module_id, episode_id, prompt_text, min_words, max_words, sequence_order)
VALUES
  ('RP-M1-1C', 'M1', 'M1-1C',
   'Describe a moment during the scope drafting task where you felt uncertain or frustrated. What triggered this feeling, and how did you work through it? What would you do differently when approaching a similar scope document in a real project?',
   150, 300, 1),

  ('RP-M1-1D', 'M1', 'M1-1D',
   'Reflect on how you handled the stakeholder challenge during the scope review. What communication strategy did you use, and how effective was it? What does this reveal about your confidence in defending scope decisions?',
   150, 300, 2),

  ('RP-M2-2D', 'M2', 'M2-2D',
   'You were asked to revise your project plan under a 20% scope reduction. Describe the reasoning behind the decisions you made. What trade-offs did you identify, and what would the consequences of each have been in a real project context?',
   150, 300, 1),

  ('RP-M3-3D', 'M3', 'M3-3D',
   'Reflecting on the stakeholder communication scenarios in this module: which interaction felt most difficult and why? What does this suggest about your current strengths and development needs in professional communication?',
   150, 300, 1),

  ('RP-M4-4C', 'M4', 'M4-4C',
   'Describe your Go/No-Go decision and the risk reasoning behind it. How did managing uncertainty affect your confidence and approach? What would you communicate to a project sponsor in this situation?',
   150, 300, 1),

  ('RP-M5-5B', 'M5', 'M5-5B',
   'The crisis scenario pushed you to make decisions under genuine time pressure. Looking back: what did your decision reveal about how you respond to project emergencies? What self-management strategies helped or would have helped?',
   200, 350, 1),

  ('RP-M5-5C', 'M5', 'M5-5C',
   'Across all five modules of this programme, describe the single most significant shift in how you think about managing instructional design projects. What will you do differently in your work starting now?',
   200, 400, 2);
