# STEP — Smart Training for Emotion-Aware Professional Development
## Platform Design Specification · Document 5 of 5
### Implementation Phases · Deliverables · Innovation Value

---

## 12. Implementation Phases

### Overview

STEP is implemented across **five sequential phases** spanning approximately 24 months. Each phase has defined entry/exit criteria, key milestones, and produces testable outputs. The phases are structured to align with a typical PhD research timeline: platform development, pilot, full study, analysis, and dissemination.

```
Phase 1        Phase 2        Phase 3        Phase 4        Phase 5
Months 1-5     Months 6-9     Months 10-16   Months 17-21   Months 22-24
    │               │               │               │               │
Foundation     Prototype      Research       Analysis &     Dissemination
& Design       Build          Deployment     Reporting      & Future Work
    │               │               │               │               │
Frameworks     Alpha build    IRB-approved   Statistical    Publications
Research       Pilot study    full study     analysis       Open source
Architecture   Refinement     Data           Mixed methods  Thesis
Ethics         Tool sims      collection     Recommendations Handover
```

---

### Phase 1: Foundation & Design (Months 1–5)

**Goal:** Establish the theoretical, technical, and ethical foundations for the platform.

#### 1.1 Research & Framework Development

| Task | Output | Owner | Month |
|------|--------|-------|-------|
| Systematic literature review: affective computing in e-learning | Literature synthesis report | Researcher | 1–2 |
| Competency framework validation | Expert panel review (n=5 IDPM practitioners) | Researcher + Supervisor | 2 |
| Scenario design: all 5 modules, all episodes | Scenario design documents | Researcher | 2–4 |
| Assessment instrument development | 3 parallel assessment forms (pre/mid/post) | Researcher | 3–4 |
| Affective taxonomy finalization | AU mapping guide, appraisal dimension specification | Researcher | 2–3 |

#### 1.2 Technical Architecture

| Task | Output | Owner | Month |
|------|--------|-------|-------|
| Technology stack evaluation | Architecture Decision Records (ADRs) | Developer | 1 |
| Database schema design | ERD + schema SQL files | Developer | 2 |
| API contract specification | OpenAPI 3.0 specification | Developer | 2–3 |
| Emotion detection library evaluation | Comparison report: MediaPipe vs. OpenFace vs. py-feat | Developer | 2 |
| Security & privacy design review | Threat model document | Developer + Researcher | 3 |
| CI/CD pipeline setup | GitHub Actions workflows operational | Developer | 3 |

#### 1.3 Ethics & Governance

| Task | Output | Owner | Month |
|------|--------|-------|-------|
| IRB application preparation | Full ethics application submitted | Researcher | 3–4 |
| Consent form development (all levels) | Plain-language consent forms reviewed | Researcher + Legal | 3 |
| Data management plan | DMP conforming to institutional requirements | Researcher | 4 |
| GDPR/privacy impact assessment | PIA document | Researcher + IT | 4 |

**Phase 1 Exit Criteria:**
- [ ] Scenario design documents approved by supervisor
- [ ] IRB application submitted (approval not required to proceed to Phase 2)
- [ ] Database schema finalized and reviewed
- [ ] All foundational documentation in version control

---

### Phase 2: Prototype Build (Months 6–9)

**Goal:** Build a functional alpha prototype covering Modules 1–2 and the onboarding flow; conduct a pilot study.

#### 2.1 Alpha Build Sprint Plan

```
Sprint 1 (weeks 1-2): Foundation
  ├── Auth system (JWT, role management)
  ├── Learner profile & onboarding flow
  └── Database setup + seed data

Sprint 2 (weeks 3-4): Emotion Pipeline
  ├── Webcam integration (MediaPipe client-side)
  ├── AU vector computation + WebSocket streaming
  └── AffectClassifier v0.1 (rule-based, pre-ML)

Sprint 3 (weeks 5-6): Module 1
  ├── Scenario engine (branching, episode sequencing)
  ├── Content Scope Document artifact tool
  └── Module 1 scenario content (Episodes 1A–1D)

Sprint 4 (weeks 7-8): Adaptive Engine v0.1
  ├── BehaviorWindow collection service
  ├── AdaptiveEngine core decision logic
  └── Hint and scaffold injection UI components

Sprint 5 (weeks 9-10): Module 2 + Assessment
  ├── WBS Builder, Gantt Light, Estimation Calculator tools
  ├── Module 2 scenario content (Episodes 2A–2D)
  └── Assessment engine v0.1 + feedback card component

Sprint 6 (weeks 11-12): Researcher Dashboard + Pilot Prep
  ├── Researcher analytics dashboard
  ├── Data export endpoints (anonymized CSV)
  └── Pilot study setup (participant management, cohort assignment)
```

#### 2.2 Pilot Study

**Pilot purpose:** Validate platform usability, technical stability, and emotion detection quality — not to test research hypotheses.

```
Pilot design:
  Participants: n=10 (convenience sample, IDPM-adjacent roles)
  Cohort assignment: All receive experimental condition
  Scope: Onboarding + Modules 1-2 only
  Duration: 2 weeks
  Data collected: Usability (SUS score), technical error logs, 
                  emotion detection confidence distribution,
                  think-aloud observations (n=5)

Pilot Success Criteria:
  ├── System Usability Scale (SUS) score ≥ 70
  ├── Webcam detection confidence ≥ 0.65 for ≥ 75% of frames
  ├── Zero critical data loss events
  ├── Session completion rate ≥ 70% for Modules 1-2
  └── No IRB compliance findings
```

**Phase 2 Exit Criteria:**
- [ ] IRB approval received
- [ ] Pilot study completed + SUS ≥ 70
- [ ] All pilot-identified issues resolved (P1/P2 severity)
- [ ] Emotion detection pipeline validated on diverse test participants
- [ ] Full research dataset schema tested and verified

---

### Phase 3: Research Deployment (Months 10–16)

**Goal:** Conduct full quasi-experimental study with N ≥ 60 participants across all 5 modules.

#### 3.1 Participant Recruitment

```
Recruitment Strategy:
  ├── Partnership channels:
  │   ├── Corporate L&D networks (LinkedIn Learning community)
  │   ├── ATD (Association for Talent Development) regional chapters
  │   ├── University professional development programs
  │   └── E-learning industry communities (eLearning Guild, DevLearn)
  ├── Inclusion criteria:
  │   ├── Current role: content developer, instructional designer, or e-learning author
  │   ├── Experience: 1–8 years in role
  │   └── Technical: Desktop computer + webcam + Chrome/Edge browser
  ├── Exclusion criteria:
  │   ├── Formal PM certification (PMP, PRINCE2, AgilePM)
  │   └── Prior participant in STEP pilot study
  └── Incentive: Certificate of completion + £50/$60 gift card at 8-week completion
```

#### 3.2 Study Timeline

```
Week 0:    Participant onboarding, consent, profile setup, baseline assessment
Week 1:    Module 1 (2 sessions)
Week 2:    Module 1 completion + Module 2 start (1-2 sessions)
Week 3-4:  Module 2 completion (2-3 sessions)
Week 5-6:  Modules 3 and 4 (2-3 sessions)
Week 7-8:  Module 5 + post-assessment + exit survey + debrief
Month 3:   Follow-up transfer assessment (online, 45 minutes)
Month 4:   Qualitative interviews (selected participants, n=16)
```

#### 3.3 Data Quality Controls

| Risk | Control |
|------|---------|
| Dropout | Weekly automated check-in emails; researcher outreach if 7-day inactivity |
| Attrition bias | Compare dropouts vs. completers on baseline characteristics |
| Webcam quality | Real-time confidence threshold; flag low-quality sessions for researcher review |
| Contamination (group sharing) | Participants instructed no group sharing; scenario narratives different enough to limit disclosure |
| Technical failures | Auto-save every 30 seconds; session resume from last checkpoint; 24-hour technical support |
| Data integrity | Immutable event logs (append-only TimescaleDB); hash-verified export files |

**Phase 3 Exit Criteria:**
- [ ] N ≥ 55 participants with ≥ 80% module completion rate (conservative drop adjustment)
- [ ] All modules delivering adaptive events (experimental group: ≥15 adaptive events per participant average)
- [ ] Post-assessment completed by all active participants
- [ ] 3-month follow-up data collected (≥75% follow-up response rate)

---

### Phase 4: Analysis & Reporting (Months 17–21)

**Goal:** Complete statistical and qualitative analysis; generate thesis chapter drafts and research publications.

#### 4.1 Analysis Workstreams

```
Workstream A: Quantitative Analysis (parallel)
  ├── Data cleaning and validation (month 17)
  ├── Descriptive statistics and group equivalence checks (month 17)
  ├── Primary ANCOVA — competency gain by condition (month 18)
  ├── Secondary analyses — engagement, self-efficacy, transfer (month 18)
  ├── Emotion-performance correlation analysis (month 19)
  ├── Adaptive effectiveness analysis (month 19)
  └── Longitudinal trajectory modeling (month 20)

Workstream B: Qualitative Analysis (sequential)
  ├── Interview transcription and member-checking (month 18-19)
  ├── Thematic analysis — Phase 1 coding (month 19)
  ├── Thematic analysis — Phase 2 refinement (month 20)
  └── Theme finalization and narrative development (month 20)

Workstream C: Integration (month 21)
  ├── Convergent mixed methods integration
  ├── Full adaptive event audit (retrospective analysis)
  └── Discussion synthesis and recommendation development
```

#### 4.2 Research Outputs per Phase 4

| Output | Format | Target Month |
|--------|--------|-------------|
| Competency gain analysis report | Internal research report | 18 |
| Emotion-performance correlation findings | Journal article draft | 19 |
| Adaptive effectiveness analysis | Conference paper draft | 20 |
| Mixed methods integration chapter | Thesis chapter | 21 |
| Platform evaluation (SUS + qualitative) | Journal article draft | 21 |

**Phase 4 Exit Criteria:**
- [ ] All five thesis chapters drafted
- [ ] Statistical analysis script peer-reviewed by supervisor
- [ ] Two manuscript submissions to peer-reviewed journals
- [ ] Adaptive event audit completed; anomalous findings investigated and explained

---

### Phase 5: Dissemination & Future Work (Months 22–24)

**Goal:** Complete thesis; publish research; prepare platform for future use.

#### 5.1 Thesis Completion

```
Thesis Structure:
  Chapter 1: Introduction and Research Context
  Chapter 2: Literature Review
             ├── Affective computing in education
             ├── Adaptive learning systems
             ├── IDPM competency development
             └── Mixed methods frameworks in ed-tech research
  Chapter 3: Methodology
             ├── Research design
             ├── Platform development process
             └── Instruments and data collection
  Chapter 4: Platform Description (STEP)
             └── Architecture, modules, adaptive engine
  Chapter 5: Quantitative Findings
  Chapter 6: Qualitative Findings
  Chapter 7: Integration and Discussion
  Chapter 8: Conclusions, Recommendations, Limitations
  References
  Appendices: Platform screenshots, instrument forms, codebooks, R/Python scripts
```

#### 5.2 Platform Handover

Upon thesis completion, the STEP platform is prepared for sustainability:

- **Code release:** GitHub public repository under MIT License (source code) and CC-BY 4.0 (research instruments and scenario content)
- **Documentation:** Full developer setup guide, scenario authoring guide, researcher guide for secondary use
- **Open dataset:** Anonymized participant dataset submitted to institutional data repository with DOI
- **Replication package:** Full analysis scripts (R + Python), codebooks, and raw output files
- **Future access:** Platform instance maintained for 12 months post-thesis for follow-up research access

---

## 13. Deliverables Registry

### 13.1 Platform Deliverables

| # | Deliverable | Description | Phase | Format |
|---|------------|-------------|-------|--------|
| D1 | Architecture Decision Records | Technical design decisions with rationale | 1 | Markdown (docs/adr/) |
| D2 | Database Schema | Full PostgreSQL schema with comments | 1 | SQL + ERD diagram |
| D3 | OpenAPI Specification | Complete API contract | 1 | OpenAPI 3.0 YAML |
| D4 | Consent Management System | Granular, revocable consent UI + backend | 2 | Platform feature |
| D5 | Emotion Detection Pipeline | Webcam → AU → affect classification | 2 | Platform feature |
| D6 | Adaptive Engine v1.0 | Decision logic + content injection system | 2 | Platform feature |
| D7 | Module 1–5 Scenarios | All 20 episodes with branching | 2–3 | Platform content |
| D8 | PM Tool Simulations | WBS Builder, Gantt, Risk Register, Estimation | 2 | Platform features |
| D9 | Learner Dashboard | Progress visualization + emotion timeline | 2 | Platform feature |
| D10 | Researcher Dashboard | Analytics + data export + adaptive audit | 2 | Platform feature |
| D11 | IDPM Assessment (3 forms) | Pre/mid/post competency assessments | 1 | Platform + PDF |
| D12 | Open Source Repository | Full codebase + documentation | 5 | GitHub |

### 13.2 Research Deliverables

| # | Deliverable | Target Venue | Phase |
|---|------------|-------------|-------|
| R1 | Ethics application + approval | University IRB | 1–2 |
| R2 | Data management plan | Institutional repository | 1 |
| R3 | Pilot study report | Internal (supervisor) | 2 |
| R4 | P1: Emotion-adaptive training and competency gain | Journal (BJET or C&E) | 4–5 |
| R5 | P2: Affective states and learning performance in IDPM | Journal (IJAIED) | 4–5 |
| R6 | P3: Adaptive intervention effectiveness review | Conference (EC-TEL or LAK) | 4–5 |
| R7 | PhD Thesis | University repository | 5 |
| R8 | Anonymized research dataset + DOI | Institutional data repository | 5 |
| R9 | Replication package (analysis scripts) | OSF or GitHub | 5 |

### 13.3 Documentation Deliverables (This Suite)

| File | Contents | Status |
|------|----------|--------|
| `00_overview_and_foundations.md` | Executive overview, educational foundations, objectives | ✓ Complete |
| `01_core_modules_and_learner_journey.md` | Core modules, learner journey, adaptive scenarios | ✓ Complete |
| `02_system_architecture_and_data_model.md` | System architecture, data model | ✓ Complete |
| `03_ux_ethics_and_research_alignment.md` | UX principles, ethics & privacy, research alignment | ✓ Complete |
| `04_implementation_and_innovation.md` | Implementation phases, deliverables, innovation value | ✓ This document |

---

## 14. Innovation Value

### 14.1 Contribution to Knowledge

STEP makes **four distinct contributions** to the scholarly literature:

#### Contribution 1: Domain-Specific Affective Computing Application

The vast majority of affective computing research in education targets K-12 mathematics or computer science — domains with clear correctness signals and structured, individual tasks. STEP extends affective computing to:

- **Professional skills domains** — where evaluation is multi-dimensional and often ambiguous
- **Collaborative scenario contexts** — where affect is shaped by social and inter-role dynamics, not just task difficulty
- **Project-based learning environments** — where performance plays out over extended time horizons

This represents a genuine frontier in affective computing application.

#### Contribution 2: Appraisal-Based Adaptive Response

Existing adaptive learning systems predominantly use performance (accuracy, speed) as the adaptation signal. STEP introduces **appraisal-based affect** as a first-class adaptive signal, operationalizing:

- Cognitive appraisal dimensions (goal congruence, perceived control, coping potential) as system-interpretable signals
- Affect-state transition modeling as a basis for pedagogical intervention sequencing
- The distinction between affect-triggered and performance-triggered adaptations

This contributes a new theoretical architecture for adaptive learning system design.

#### Contribution 3: Multimodal Signal Fusion in Professional Training

While multimodal emotion recognition is well-researched in laboratory settings, its application in naturalistic professional training environments is sparse. STEP contributes:

- A practical architecture for multimodal fusion (facial AU + behavioral + textual) under real-world constraints (variable lighting, partial face occlusion, learner multitasking)
- Evidence on the relative predictive validity of each signal type in professional training contexts
- A privacy-preserving architecture (client-side processing, AU-only transmission) that enables affective computing research without raw biometric data collection

#### Contribution 4: Emotion-Aware IDPM Training Design

No prior platform specifically targets IDPM skill development in content developers using adaptive methods. STEP provides:

- A validated competency framework for IDPM in content production contexts
- Authentic scenario designs grounded in practitioner experience (expert panel validated)
- Evidence on which IDPM competencies are most responsive to emotion-aware adaptive scaffolding

### 14.2 Practical Innovation

Beyond research contribution, STEP demonstrates practical innovations in three areas:

#### Educational Technology Design

| Innovation | Description | Over Existing Practice |
|------------|-------------|----------------------|
| **Affect-calibrated scaffolding** | Scaffold level dynamically responds to detected affect, not just performance | Existing: scaffold adjusts on accuracy only |
| **Emotional journey visualization** | Learners see their own affect timeline post-session, framed growth-positively | Existing: learners receive only performance data |
| **Sentiment-responsive feedback** | Feedback tone adapts to learner's current emotional register (detected in reflection text) | Existing: static feedback templates |
| **Privacy-preserving affect sensing** | Full client-side processing; no raw facial data transmitted | Existing: server-side emotion analysis with biometric data exposure risk |

#### Project Management Training Design

| Innovation | Description |
|------------|-------------|
| **Authentic artifact production** | Learners produce real work artifacts (CSD, WBS, Risk Register) assessed against professional standards — not MCQ completions |
| **Consequence-propagating scenarios** | Decisions made in one episode affect the state of subsequent episodes — more authentic than isolated tasks |
| **Relationship health modeling** | Stakeholder communication simulations track multi-session relationship state, making communication choices consequential |
| **Temporal realism** | Module 5 uses a real countdown clock — introducing time pressure as a genuine emotional variable, not a narrative device |

#### Research Methodology

| Innovation | Description |
|------------|-------------|
| **Platform-as-instrument** | The training platform doubles as the research data collection instrument, achieving ecological validity impossible with traditional survey-based research |
| **Micro-temporal affect analysis** | 2-second sampling creates high-resolution affect timelines enabling millisecond-level analysis of affect-performance co-variation |
| **Adaptive event causal modeling** | Logging pre/post affect states for every adaptive intervention enables quasi-experimental causal inference on intervention effectiveness within the same study |

### 14.3 Transferability and Scalability

The STEP architecture is explicitly designed for transferability beyond the original research context:

```
Transferable Components:
  │
  ├── Emotion Detection Pipeline
  │   └── Can be adapted for any web-based professional training domain
  │
  ├── Adaptive Engine
  │   └── Domain-agnostic; configureable via YAML rules per domain
  │
  ├── Scenario Authoring Framework
  │   └── Documented authoring guide enables non-technical scenario creation
  │
  ├── PM Tool Simulations
  │   └── Standalone usable for WBS, risk management, and PM skills training
  │
  └── Research Instrumentation Layer
      └── Researcher dashboard + data export can support secondary research
          on any domain implemented on the STEP platform
```

**Potential Future Applications:**
1. Leadership development training with emotional regulation focus
2. Medical simulation training with affect-responsive difficulty adjustment
3. Customer service training with sentiment-aware scenario branching
4. Software development team training on agile-scrum practices

### 14.4 Strategic Value Statement

> STEP demonstrates that emotion is not a nuisance variable in professional training — it is an informative signal that, when interpreted correctly and acted upon ethically, unlocks more effective, more humane, and more engaging learning experiences. This platform proves the concept in a rigorous research context and provides the foundation architecture, validated instruments, and open codebase for the next generation of affectively-aware professional development platforms.

---

## Appendix A: Technology Decisions Reference

| Decision | Choice | Rationale | ADR Reference |
|----------|--------|-----------|---------------|
| Frontend framework | React 18 + TypeScript | Ecosystem maturity, component model suits scenario engine | ADR-001 |
| Webcam processing | MediaPipe (client-side) | Privacy-preserving; no raw frame transmission | ADR-002 |
| Primary database | PostgreSQL + TimescaleDB | TimescaleDB hypertable for emotion time-series; ACID compliance for research integrity | ADR-003 |
| AU classification | Rule-based v0.1 → ML-based v1.0 | Iterative: rule-based for pilot validates approach; ML trained on study data | ADR-004 |
| Sentiment analysis | VADER + fine-tuned BERT | VADER for speed; BERT for professional register accuracy | ADR-005 |
| State management | Zustand | Lighter than Redux; sufficient for STEP state complexity | ADR-006 |
| Job queue | Bull (Redis-backed) | Reliable async processing for emotion batch jobs | ADR-007 |

## Appendix B: Scenario Narrative Master Summary

| Module | Scenario Title | Setting | Key Conflict |
|--------|--------------|---------|-------------|
| M1 | "The Compliance Refresh" | Mid-size technology company | Vague brief; scope ambiguity; skeptical stakeholder |
| M2 | "Planning the Blended Programme" | E-learning vendor | Unrealistic timeline; resource constraints |
| M3 | "Week 6 Crisis" | Corporate L&D department | Three simultaneous stakeholder communication failures |
| M4 | "The Quality Emergency" | Ed-tech startup | SME collapse + new accessibility mandate + scope request |
| M5 | "72 Hours to Launch" | Government training provider | Complete project crisis; irrecoverable timeline; decision under pressure |

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| **Action Unit (AU)** | A facial muscle movement unit defined in the Facial Action Coding System (FACS) by Ekman & Friesen |
| **Adaptive scaffolding** | Instructional support structures that are dynamically adjusted based on learner performance and/or emotional state |
| **Affect classification** | The computational task of assigning a discrete emotional category to a set of signals |
| **Appraisal theory** | The cognitive theory that emotions result from how an individual evaluates (appraises) a situation relative to their goals and coping capacity |
| **CSD** | Content Scope Document; the primary artifact deliverable of Module 1 |
| **IDPM** | Instructional Design Project Management; the skill domain targeted by STEP |
| **Micro-temporal** | Operating at very fine time scales (seconds or sub-seconds), as opposed to session or module level |
| **WBS** | Work Breakdown Structure; a hierarchical decomposition of project deliverables into work packages |
| **Scaffold level** | A discrete level (1–4) in STEP's instructional support hierarchy |
| **TimescaleDB** | A time-series database extension for PostgreSQL, used in STEP for emotion event storage |

---

*End of STEP Platform Design Specification*  
*Documents 1–5 of 5 | Total: ~15,000 words of specification-grade content*

---

**STEP Platform Design Specification**  
*PhD Research Artifact · Confidential · 2026*  
*d:\smart-training-emotion-platform\docs\*
