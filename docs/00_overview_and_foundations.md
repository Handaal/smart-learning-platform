# STEP — Smart Training for Emotion-Aware Professional Development
## Platform Design Specification · Document 1 of 5
### Executive Overview · Educational Foundation · Objectives

---

> **Project:** PhD Research Initiative  
> **Full Title:** Emotion-Sensing Adaptive Training for Instructional Design Project Management Skills Among Content Developers  
> **Acronym:** STEP — Smart Training & Emotion Platform  
> **Document Version:** 1.0 | April 2026  
> **Classification:** Research Prototype — Internal Use

---

## 1. Executive Overview

### 1.1 Problem Statement

Content developers in corporate learning and e-learning production environments occupy a complex dual role: they are simultaneously *subject matter experts in instructional design* and *project managers* responsible for scope, schedules, stakeholder communication, and quality assurance. Despite this, formal training for instructional design project management (IDPM) is rarely offered in a structured, adaptive, or emotionally-responsive way.

Traditional LMS-based training is:

- **Static** — the same content regardless of learner affect or performance trajectory
- **Reactive** — learner frustration, confusion, or disengagement go undetected in real-time
- **Generic** — not situated in authentic IDPM scenarios specific to content developers
- **Measured poorly** — relying on post-hoc surveys rather than continuous behavioral signals

### 1.2 Solution Summary

**STEP** is a research-driven, web-based adaptive training platform that:

1. **Senses learner emotional states** using multimodal signals (facial action units via webcam, text sentiment in reflections, interaction behavioral analytics)
2. **Adapts content delivery, pacing, and scaffolding** dynamically based on detected affect and performance
3. **Develops IDPM competencies** through authentic scenario-based simulations, micro-tasks, and reflective practice
4. **Generates research-grade longitudinal data** on the relationship between emotion, adaptive interventions, and skill acquisition

### 1.3 Research Position

This platform is developed as the primary artifact of a PhD research project examining:

> *To what extent does emotion-aware adaptive scaffolding improve instructional design project management competency development among content developers, compared to non-adaptive training?*

The platform constitutes both the **experimental intervention** and the **data collection instrument**, with embedded mixed-methods research instrumentation.

### 1.4 Target Population

| Dimension | Specification |
|-----------|--------------|
| Learner profile | Content developers, e-learning authors, LMS administrators |
| Experience range | 1–8 years in instructional or digital content roles |
| Context | Corporate learning & development departments, ed-tech vendors |
| Technical access | Desktop browser with webcam; institutional or personal login |
| Research cohort size | 60–120 participants (experimental vs. control split) |

---

## 2. Educational Foundation

### 2.1 Theoretical Frameworks

The platform integrates four evidence-based theoretical frameworks into a unified pedagogical model:

#### 2.1.1 Cognitive Load Theory (Sweller, 1988; Paas et al., 2003)

STEP manages **intrinsic**, **extraneous**, and **germane** cognitive load through:

- Dynamic element interactivity — tasks are decomposed progressively, introducing project management complexity in controlled increments
- Redundancy elimination — emotion detection flags extraneous overload (e.g., dwell time exceeding threshold + frustrated affect → simplify interface)
- Schema formation support — repeated authentic scenarios with variation build robust IDPM mental models

#### 2.1.2 Self-Determination Theory (Deci & Ryan, 1985; 2000)

The platform is designed to support three basic psychological needs:

| Need | Platform Mechanism |
|------|--------------------|
| **Autonomy** | Learners choose scenario order, sub-task approach, and reflection style |
| **Competence** | Immediate, granular, non-judgmental feedback on task performance |
| **Relatedness** | Facilitated peer reflection pools and shared scenario outcomes |

Adaptive responses are calibrated to avoid triggering *amotivation* during high-frustration states.

#### 2.1.3 Affective Computing & Appraisal Theory (Picard, 1997; Lazarus, 1991)

Emotion is treated as **appraisal-based and context-dependent**, not as a fixed stimulus-response mapping. The system interprets:

- Facial action unit combinations (Ekman FACS-derived)
- Text-based sentiment in typed reflections (valence + arousal axes)
- Behavioral micro-signals (click hesitation, scroll reversal, task abandonment patterns)

Appraisal dimensions used: **goal congruence**, **perceived control**, **novelty**, and **coping potential**. These map detected signals to pedagogically actionable states rather than raw emotion labels.

#### 2.1.4 Situated Learning & Cognitive Apprenticeship (Lave & Wenger, 1991; Collins et al., 1989)

IDPM skills are situated in authentic work contexts through:

- **Modeling** — expert project manager narrations embedded in scenarios
- **Coaching** — adaptive hints and prompts responding to observed difficulties
- **Scaffolding** — temporary support structures removed as competence increases
- **Fading** — progressive withdrawal of structural guidance across the learner journey
- **Articulation** — required reflective journals after each scenario phase
- **Exploration** — open-ended decision points with branching consequence modeling

### 2.2 Instructional Design Competency Framework

STEP targets competencies aligned with the **Association for Talent Development (ATD) Capability Model** and the **Project Management Institute (PMI) PMBOK® 7th Edition**, specifically mapped to the instructional design production lifecycle:

```
IDPM Competency Clusters
│
├── [C1] Scope & Requirements Management
│   ├── Translating stakeholder needs into content requirements
│   ├── Managing scope creep in course development projects
│   └── Version control and change request protocols
│
├── [C2] Planning & Scheduling
│   ├── Work breakdown structure (WBS) for content production
│   ├── Milestone setting with buffer management
│   └── Resource allocation across SME, developer, reviewer roles
│
├── [C3] Stakeholder Communication
│   ├── Status reporting cadence and format
│   ├── Escalation protocols and conflict navigation
│   └── Managing SME availability and feedback loops
│
├── [C4] Risk & Quality Management
│   ├── Identifying content production risks (scope, technical, SME)
│   ├── ADDIE/SAM phase gate quality checks
│   └── Usability and accessibility compliance management
│
└── [C5] Adaptive Problem-Solving
    ├── Decision-making under ambiguous project constraints
    ├── Iterative revision management
    └── Post-project review and lessons-learned facilitation
```

### 2.3 Emotion States Targeted

The system monitors for and responds to five pedagogically-relevant affective states:

| Affect State | Detection Signals | Pedagogical Risk | Adaptive Response |
|-------------|-------------------|-----------------|-------------------|
| **Flow** | Steady pacing, neutral-positive affect, low hesitation | — (optimal) | Maintain current difficulty, introduce complexity increment |
| **Confusion** | Furrowed brow (AU4), extended dwell, re-reading loops | Unresolved → disengagement | Deploy clarifying hint; offer conceptual explainer |
| **Frustration** | Compressed lips (AU20+AU23), rapid clicking, abandonment | Task dropout | Reduce complexity, offer worked example, affirm progress |
| **Anxiety** | Raised inner brow (AU1), hesitation spikes, negative self-reflection text | Avoidance behavior | Reframe task stakes, provide autonomy choice point |
| **Boredom** | Flat affect, long response latency, low engagement signals | Disengagement | Accelerate to next complexity level; introduce challenge variant |

---

## 3. Learning Objectives

### 3.1 Terminal Objectives

Upon successful completion of the STEP program, learners will be able to:

**TO-1:** Independently manage the full lifecycle of an instructional design content development project — from requirements analysis through post-launch review — using structured project management practices adapted to e-learning production contexts.

**TO-2:** Apply stakeholder communication strategies appropriate to the complexity and emotional dynamics of cross-functional content development teams.

**TO-3:** Diagnose and mitigate scope, schedule, and quality risks specific to digital content production projects.

**TO-4:** Demonstrate reflective awareness of their own emotional responses to project management challenges and apply self-regulation strategies to sustain professional performance.

### 3.2 Enabling Objectives by Competency Cluster

#### C1 — Scope & Requirements Management
- **EO-1.1:** Distinguish between functional and contextual content requirements from stakeholder interviews
- **EO-1.2:** Document a content scope document using a standardized template within 45 minutes given a realistic briefing
- **EO-1.3:** Identify and classify scope creep triggers in a simulated mid-project change scenario

#### C2 — Planning & Scheduling
- **EO-2.1:** Construct a WBS for a 12-week blended learning project with ≥85% completeness
- **EO-2.2:** Apply effort estimation techniques (t-shirt sizing, three-point estimation) to content production tasks
- **EO-2.3:** Revise a project schedule under a simulated constraint change without violating launch dependencies

#### C3 — Stakeholder Communication
- **EO-3.1:** Draft a project status report using the BLUF (Bottom Line Up Front) structure for executive stakeholders
- **EO-3.2:** Apply the RACI matrix to an IDPM team composition and identify accountabilities
- **EO-3.3:** Navigate a simulated stakeholder escalation scenario using principled negotiation techniques

#### C4 — Risk & Quality Management
- **EO-4.1:** Populate a risk register with IDPM-specific risks, probability/impact ratings, and mitigation actions
- **EO-4.2:** Apply a defined quality gate checklist at the ADDIE Alpha stage of a simulated project
- **EO-4.3:** Evaluate an accessibility compliance gap in a delivered course artifact and draft a remediation plan

#### C5 — Adaptive Problem-Solving
- **EO-5.1:** Make and justify a project decision under simulated ambiguity within a defined time constraint
- **EO-5.2:** Facilitate a retrospective discussion using a structured protocol (e.g., Start/Stop/Continue)
- **EO-5.3:** Revise a project approach based on stakeholder feedback without compromising core quality criteria

### 3.3 Affective Objectives

- **AO-1:** Articulate their emotional responses to project management pressure in structured reflection prompts
- **AO-2:** Demonstrate self-regulation strategies (cognitive reappraisal, planning behavior) when confronted with simulated project crises
- **AO-3:** Maintain sustained engagement across an 8-week adaptive training program as measured by session completion rates and reflection depth scores

---

*Document 1 of 5 — Continue with `01_core_modules_and_learner_journey.md`*

---

**STEP Platform Design Specification**  
*PhD Research Artifact · Confidential · 2026*
