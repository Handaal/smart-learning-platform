# STEP — Smart Training for Emotion-Aware Professional Development
## Platform Design Specification · Document 2 of 5
### Core Modules · Learner Journey · Adaptive Scenarios

---

> **Cross-reference:** This document assumes the competency framework defined in `00_overview_and_foundations.md` (Section 2.2) and the affective state taxonomy (Section 2.3).

---

## 4. Core Modules

The STEP curriculum is structured as **five progressive training modules**, each targeting one primary IDPM competency cluster and one secondary competency cluster. Modules are delivered through a combination of **scenario simulations**, **micro-skill exercises**, and **structured reflections**.

### Module Architecture Pattern

Every module follows a consistent five-phase instructional sequence:

```
Phase 1: Orientation (10 min)
  └── Activate prior knowledge + establish authentic context

Phase 2: Exploration (20–30 min)
  └── Guided scenario interaction with progressive challenge

Phase 3: Application (30–40 min)
  └── Independent scenario task — emotion-monitored, adaptive

Phase 4: Reflection (10–15 min)
  └── Structured journal + sentiment-analyzed text input

Phase 5: Synthesis (10 min)
  └── Competency consolidation feedback + next-module preview
```

---

### Module 1: Scoping the Learning Project
**Primary Competency:** C1 — Scope & Requirements Management  
**Secondary Competency:** C3 — Stakeholder Communication  
**Estimated Duration:** 90 minutes | **Sessions:** 2 × 45 min

#### Learning Context
Learners assume the role of a **newly assigned lead content developer** at a mid-size technology company. They have been handed a vague stakeholder brief for a compliance training refresh and must navigate ambiguity to produce a defensible content scope document.

#### Scenario Episodes

| Episode | Description | IDPM Task | Emotional Trigger |
|---------|-------------|-----------|------------------|
| 1A — The Brief | Receive a poorly-specified stakeholder email | Identify ambiguities; prepare clarifying questions | Confusion spike expected |
| 1B — The Interview | Conduct a structured needs analysis conversation | Extract functional and contextual requirements | Flow → anxiety if overwhelmed by detail |
| 1C — Scope Draft | Produce a scope document using the provided template | Document requirements; set exclusions | Frustration from template constraints |
| 1D — Scope Review | Present scope to a skeptical stakeholder character | Defend scope decisions; manage pushback | Anxiety / frustration under simulated challenge |

#### Key Deliverable (Authentic Artifact)
A completed **Content Scope Document** (CSD) rated against a 12-criterion rubric by the automated assessment engine.

#### Adaptive Triggers in Module 1

```yaml
# Confusion during 1A
trigger: dwell_time > 90s AND au4_intensity > 0.6
response:
  - inject: "Expert Tip" overlay — common ambiguity patterns in client briefs
  - offer: option to view annotated example brief
  - log: confusion_event, episode: 1A

# Frustration during 1C
trigger: click_rate_spike AND sentiment_score < -0.4 AND task_completion < 0.4
response:
  - reduce: template field count (surface only required fields)
  - inject: inline tooltip on "what belongs in a scope document"
  - log: frustration_event, episode: 1C

# Flow confirmation in 1D
trigger: steady_pacing AND au6_au12 > 0.5 AND completion_on_track
response:
  - maintain: current difficulty
  - unlock: bonus challenge — stakeholder asks for scope expansion
  - log: flow_confirmed, episode: 1D
```

---

### Module 2: Building the Content Production Plan
**Primary Competency:** C2 — Planning & Scheduling  
**Secondary Competency:** C4 — Risk & Quality Management  
**Estimated Duration:** 100 minutes | **Sessions:** 2–3 × varied

#### Learning Context
Learners receive the scope document from Module 1 (or a provided equivalent) and must build a full project plan for a 12-week blended learning production. They work within a simulated **project management workspace** (built into STEP) with timeline, WBS, and resource allocation views.

#### Scenario Episodes

| Episode | Description | IDPM Task | Complexity Level |
|---------|-------------|-----------|-----------------|
| 2A — Decompose | Break scope into production work packages | Build WBS to Level 3 | Level 1 |
| 2B — Estimate | Apply estimation techniques per task type | Three-point estimation on 8 selected tasks | Level 2 |
| 2C — Sequence | Set task dependencies and milestone markers | Dependency mapping; critical path identification | Level 3 |
| 2D — Constrained | Receive scope reduction — revise plan | Re-plan under 20% scope cut without moving launch date | Level 4 |

#### Built-in IDPM Tool Simulations

The platform embeds lightweight but realistic simulations of:

- **WBS Builder** — drag-and-drop hierarchical work breakdown with validation against provided scope
- **Gantt Light** — interactive timeline with dependency arrows and float calculation
- **Estimation Calculator** — guided three-point estimation with PERT formula support
- **Resource Panel** — simple allocation grid across four standard IDPM roles

#### Adaptive Scaffolding Levels

```
Scaffold Level 4 (Maximum Support):
  - Pre-populated WBS template with level-1 nodes
  - Inline worked examples for each estimation type
  - System suggests task sequences automatically
  [Triggered by: frustration + low completion after Episode 2A]

Scaffold Level 3:
  - WBS checklist of categories to complete
  - Estimation prompts per task type
  - Dependency hints on request
  [Default starting scaffold]

Scaffold Level 2:
  - Blank tools only; hints available on demand
  - Competency-specific performance feedback active
  [Triggered by: flow + >80% accuracy in 2A and 2B]

Scaffold Level 1 (Minimum Support):
  - Blank tools; no hint system
  - Constraint variation added (e.g., SME unavailability)
  [Triggered by: sustained flow + boredom signal + high accuracy]
```

---

### Module 3: Stakeholder Communication Dynamics
**Primary Competency:** C3 — Stakeholder Communication  
**Secondary Competency:** C5 — Adaptive Problem-Solving  
**Estimated Duration:** 80 minutes | **Sessions:** 2 × 40 min

#### Learning Context
Learners manage a **live-project scenario** at week 6 of a 12-week content project. Three communication challenges arrive simultaneously: an overdue SME review, an executive stakeholder requesting scope changes, and a team member reporting a quality issue. The learner must triage and respond.

#### Communication Simulation Mechanics

The module uses a **message-thread interface** simulating an email/messaging environment. Learners:

1. Read incoming messages from three character types (executive, SME, peer)
2. Select or compose response strategies
3. Observe simulated reactions based on language analysis
4. Manage relationship health indicators (trust, responsiveness, clarity) that affect later episodes

#### Relationship Health Model

```
stakeholder_state = {
  "executive": {trust: 0.8, clarity: 0.7, urgency_tolerance: 0.4},
  "sme":       {trust: 0.6, clarity: 0.5, availability: 0.3},
  "peer":      {trust: 0.9, morale: 0.7, support_need: 0.5}
}

# Example: aggressive escalation response from learner
if response_type == "demand" AND stakeholder == "executive":
  executive.trust -= 0.15
  inject_consequence: "Executive copies senior manager on next message"
  log: stakeholder_damage_event
```

#### Sentiment-Responsive Feedback

Learner-composed text responses (free text) are analyzed for:
- **Tone** (assertive vs. passive vs. aggressive)
- **Clarity** (information completeness score)
- **Empathy markers** (acknowledgment of stakeholder concern)

Feedback is delivered as a **Communication Effectiveness Score** with specific dimensioned commentary — not generic praise.

---

### Module 4: Risk Intelligence and Quality Gates
**Primary Competency:** C4 — Risk & Quality Management  
**Secondary Competency:** C1 — Scope & Requirements Management  
**Estimated Duration:** 90 minutes | **Sessions:** 2 × 45 min

#### Learning Context
A previously healthy project hits three simultaneous risks: SME availability collapse, a newly mandated accessibility standard, and a client-requested scope addition mid-production. Learners must update their risk register, invoke quality gate procedures, and make a go/no-go decision on the launch milestone.

#### Risk Register Simulation

Learners populate a risk register with structured fields:

```
Risk Entry Schema:
  risk_id: string
  category: [scope | schedule | resource | technical | stakeholder | quality]
  description: string (max 100 words)
  probability: [1–5 Likert]
  impact: [1–5 Likert]
  risk_score: auto-calculated (probability × impact)
  mitigation_strategy: string
  contingency_plan: string
  owner: [learner | SME | executive | external]
  review_date: date
```

Automated assessment compares learner entries against an expert-generated reference register using:
- **Coverage score** — % of canonical risks identified
- **Calibration score** — accuracy of probability/impact ratings
- **Mitigation quality score** — NLP rubric on strategy descriptions

#### Quality Gate Protocol

Learners are walked through a simulated **ADDIE Alpha review gate** using a 20-criterion checklist:

- Instructional objectives aligned to assessments ✓/✗
- Content accuracy verified by SME ✓/✗
- Accessibility compliance (WCAG 2.1 AA) ✓/✗
- Navigation and interaction functionality ✓/✗
- File naming and version control conventions ✓/✗
*(... 15 additional criteria)*

The system injects deliberate errors from a content artifact (mock e-learning module screenshots) that learners must identify against the checklist.

---

### Module 5: Decision-Making Under Ambiguity
**Primary Competency:** C5 — Adaptive Problem-Solving  
**Secondary Competency:** C2 — Planning & Scheduling  
**Estimated Duration:** 80 minutes | **Sessions:** 2 × 40 min

#### Learning Context
The capstone module simulates full project crisis: the launch is in 72 hours; two critical tasks are incomplete; the SME is unreachable; the executive is threatening to cancel. Learners must make a structured decision under genuine time pressure (real countdown clock: 25 minutes decision window).

#### Decision Architecture

```
Crisis Decision Tree (Simplified):
│
├── Option A: Request launch delay (2 weeks)
│   ├── Consequence: Executive trust -0.2, stakeholder satisfaction -0.15
│   └── Mitigation available: Pre-written executive brief template
│
├── Option B: Partial launch — Module 1 only
│   ├── Consequence: Learner engagement risk flagged, scope document updated
│   └── Mitigation available: Phased launch communication template
│
├── Option C: Emergency content substitution
│   ├── Consequence: Quality risk logged; requires quality gate bypass justification
│   └── Mitigation available: Documented rationale builder
│
└── Option D: Launch as-is without notification
    ├── Consequence: Stakeholder trust collapse event; post-launch quality complaint
    └── No mitigation available — negative outcome guaranteed
```

Each decision propagates forward consequences that learners must then manage in the second session (post-decision retrospective and lessons-learned facilitation).

---

## 5. Learner Journey

### 5.1 Journey Map

```
Week 1          Week 2          Week 3-4        Week 5-6        Week 7-8
   │               │               │               │               │
[Onboarding]  [Module 1]      [Module 2]      [Module 3-4]    [Module 5]
   │               │               │               │               │
Profile        Scope &         Planning &      Stakeholder     Decision &
Setup +        Requirements    Scheduling      Communication   Capstone
Baseline                                       + Risk Mgmt
Assessment                                                          │
   │               │               │               │               │
Emotion        Emotion          Emotion         Emotion        Emotion
Calibration    Monitoring        Monitoring      Monitoring     Monitoring
(10 min)       + Adapt           + Adapt         + Adapt        + Adapt
                                                                    │
                                                             [Exit Survey]
                                                             [Final Reflection]
                                                             [Competency Report]
```

### 5.2 Onboarding Protocol

The onboarding session (60 minutes) accomplishes three critical functions:

#### A. Learner Profile Construction
Learners complete a structured intake survey covering:
- IDPM experience level (years, project types, team sizes)
- Self-assessed competency per cluster (1–7 scale, each C1–C5)
- Preferred learning modality (reading, video, simulation, discussion)
- Emotional regulation strategy preference (informational, analytical approach)
- Consent to emotion data collection (full informed consent with granular options)

#### B. Baseline Competency Assessment
A 30-minute pre-assessment covering all five competency clusters through:
- Scenario-response multiple choice (12 items, authentic IDPM vignettes)
- Short-answer response on one WBS decomposition task
- Self-efficacy scale for project management (adapted PSE-12 instrument)

Baseline data establishes the **adaptive difficulty starting point** for each module.

#### C. Emotion Sensing Calibration
A 10-minute calibration protocol:
1. Neutral baseline recording (60 seconds, resting neutral prompt)
2. Induced mild challenge (math sequence task — calibrate frustration/confusion baseline)
3. Induced mild positive state (brief success notification + encouraging message)
4. Webcam lighting and positioning check with quality feedback
5. Informed confirmation and opt-out reminder

#### Personalization Outputs from Onboarding

```yaml
learner_profile:
  id: unique_participant_id
  cohort: [experimental | control]
  baseline_competency:
    C1: 0.42  # normalized 0–1 from assessment
    C2: 0.55
    C3: 0.38
    C4: 0.61
    C5: 0.30
  starting_scaffold: [1 | 2 | 3 | 4]  # per module, set from baseline
  emotion_baselines:
    neutral_au_vector: [...]
    frustration_threshold: 0.72
    confusion_threshold: 0.68
  learning_pref: simulation_first
  consent:
    facial_analysis: true
    text_sentiment: true
    behavioral_tracking: true
    data_sharing_research: true
```

### 5.3 Session-Level Experience Flow

Each training session follows a defined experience architecture:

```
[Session Start]
  ├── Webcam activation confirmation
  ├── Brief re-orientation (last session summary — 2 min)
  └── Session goal statement

[Active Learning Block]
  ├── Emotion monitoring: continuous (2-second sampling)
  ├── Behavioral tracking: continuous
  ├── Adaptive engine: decision every 90 seconds or on trigger event
  └── Hint/scaffold injection: as needed

[Mandatory Break Prompt] (at 45-minute mark if session exceeds threshold)
  └── 5-minute guided breathing/reset prompt (optional but recommended)

[Reflection Phase]
  ├── Structured prompt (1–3 questions, scenario-specific)
  ├── Free-text input (150–300 words)
  └── Sentiment analysis: real-time, results stored

[Session Close]
  ├── Performance summary (task completion, accuracy, key decisions)
  ├── Emotional journey visualization (affect timeline for the session)
  └── Next session preview
```

### 5.4 Progression and Gating Rules

| Transition | Requirement | Override |
|------------|-------------|----------|
| Onboarding → Module 1 | Consent complete + calibration successful | Instructor manual bypass |
| Module 1 → Module 2 | CSD artifact scored ≥60% OR 2 attempts completed | Instructor review |
| Module 2 → Module 3 | Plan completeness ≥70% OR adaptive plan accepted | Auto-progress after 3 attempts |
| Module 3 → Module 4 | Communication effectiveness ≥55% | No gate — all learners proceed |
| Module 4 → Module 5 | Risk register coverage ≥65% | Auto-progress after 3 attempts |
| Module 5 → Completion | Decision justified + retrospective completed | Required — no bypass |

---

## 6. Adaptive Scenarios

### 6.1 Adaptive Engine Overview

The STEP adaptive engine operates on a **three-loop architecture**:

```
┌─────────────────────────────────────────────────────┐
│                  ADAPTIVE ENGINE                     │
│                                                      │
│  Micro-loop (2s)    Meso-loop (90s)   Macro-loop    │
│  ─────────────      ─────────────     ──────────     │
│  Facial AU          Affect state      Competency     │
│  sampling           classification    trajectory     │
│                                       (session/      │
│  Behavior           Intervention      module level)  │
│  event log          decision                         │
│                                       Module         │
│  Text               Content           difficulty     │
│  sentiment          adaptation        recalibration  │
│  (on input)                                          │
└─────────────────────────────────────────────────────┘
```

### 6.2 Affect State Transition Model

```
States: {Flow, Confusion, Frustration, Anxiety, Boredom, Neutral}

Transition Rules:
  Neutral → Confusion:   dwell > threshold AND au4 active
  Confusion → Frustration: confusion unresolved > 3 min
  Frustration → Abandonment_risk: frustration Duration > 5 min without resolution
  Neutral → Anxiety:     high-stakes scenario introduced + au1 + hesitation
  Anxiety → Flow:        successful task completion + positive feedback
  Flow → Boredom:        low interaction density + flat affect > 8 min
  Boredom → Flow:        difficulty increment + challenge injection
  Any → Neutral:         explicit break + reset action
```

### 6.3 Adaptive Response Matrix

| Detected State | Signal Pattern | Content Adaptation | Interaction Adaptation | Communication Adaptation |
|---------------|---------------|-------------------|----------------------|-------------------------|
| **Confusion** | AU4 + dwell + re-read loop | Inject concept explainer | Highlight relevant UI elements | "This is a common challenge area — here's what expert IDs do" |
| **Frustration** | Click spike + negative sentiment + low progress | Reduce task scope; offer worked example | Simplify interface; reduce fields | "You're making real progress — let's break this down together" |
| **Anxiety** | AU1 + hesitation + avoidance navigation | Lower apparent stakes; reframe as low-risk | Add "you can revise this later" affordances | "There's no single right answer here — let's explore your thinking" |
| **Boredom** | Flat affect + long latency + low accuracy | Accelerate to challenge variant | Remove scaffolding; add constraint | "Ready for a harder challenge? Here's a curveball." |
| **Flow** | Steady pace + neutral-positive + high accuracy | Introduce next complexity level | Minimal intervention; remove distractors | Affirm without interrupting |

### 6.4 Scenario Branching Example: Module 3, Episode 3B

```
[Scenario Start]
Learner receives three simultaneous stakeholder messages.
Initial state detected: Neutral

                    ┌─────────────────────┐
                    │ Triage Decision Point│
                    └───────────┬─────────┘
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                  │
         [Executive        [SME email]        [Peer chat]
          email first]      first]             first]
              │                 │                  │
     Trust +0.1          Availability+0.1     Peer morale+0.1
     Urgency managed     SME rapport built    Team trust built
              │
        [Confusion detected during executive response drafting]
              │
    ┌─────── ADAPT ────────┐
    │ Inject: BLUF template │
    │ Optional: example     │
    └──────────────────────┘
              │
    [Learner uses template]
              │
    [Frustration detected — template feels too formal]
              │
    ┌─────── ADAPT ────────────────────┐
    │ Inject: "Adjust the tone" prompt  │
    │ Show: before/after tone examples  │
    └──────────────────────────────────┘
              │
    [Successful message sent]
              │
    [Flow restored — proceed to SME triage]
```

### 6.5 Control Group Differentiation

For the research design, the platform operates in two modes:

| Dimension | Experimental Group | Control Group |
|-----------|-------------------|---------------|
| Emotion sensing | Active (webcam + behavioral) | Behavioral only (no webcam) |
| Content adaptation | Full adaptive engine | Fixed linear sequence |
| Scaffold adjustment | Automatic per affect state | Learner-requested only |
| Feedback timing | Real-time + emotion-informed | Post-task only |
| Personalization | Full profile-driven | None (uniform difficulty) |
| Data collection | Full multimodal | Performance + reflection only |

Both groups complete identical scenarios and assessments; only the adaptation mechanism differs. This isolates the effect of emotion-informed adaptation.

---

*Document 2 of 5 — Continue with `02_system_architecture_and_data_model.md`*

---

**STEP Platform Design Specification**  
*PhD Research Artifact · Confidential · 2026*
