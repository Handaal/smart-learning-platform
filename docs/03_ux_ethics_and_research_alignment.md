# STEP — Smart Training for Emotion-Aware Professional Development
## Platform Design Specification · Document 4 of 5
### UX Principles · Ethics & Privacy · Research Alignment

---

## 9. UX Principles

### 9.1 Design Philosophy

STEP's UX is governed by a single overarching principle: **the interface must never become a source of cognitive or emotional load in itself**. Every design decision is evaluated against this standard. The platform must feel calm, professional, and trustworthy — not gamified, pressuring, or surveillant.

Six specific UX principles operationalize this philosophy:

---

### Principle 1: Affective Transparency Without Surveillance

Learners must never feel that they are being watched or judged. The emotion monitoring system should be:

- **Visible but unobtrusive** — a small, dismissible indicator shows when webcam is active
- **Controllable** — learners can pause emotion monitoring at any time (behavioral tracking continues)
- **Self-serving** — learners see their own emotion timeline after each session, framed positively
- **Named accurately** — always referred to as "learning support" signals, not "tracking" or "surveillance"

**UI Implementation:**
```
Webcam indicator:
  ├── Position: bottom-right corner, z-index on top of scenario content
  ├── State: small green dot (active) | amber dot (paused) | gray dot (off)
  ├── Click action: opens "Your Learning Support Settings" modal
  └── Tooltip: "STEP is using your camera to provide personalised support"

Emotion timeline (post-session):
  ├── Shown as: colored area chart (calm color palette — no alarming reds)
  ├── States labeled: Flow / Engaged / Focused / Thinking / Challenged
  │   (not raw labels like 'Frustrated' or 'Anxious' — reframed positively)
  └── Accompanied by: "When you were most challenged, here's what happened..."
```

---

### Principle 2: Adaptive Invisibility

Adaptive interventions should feel like natural, helpful features — not algorithmic triggers. Learners should not experience the system as reacting to them in a mechanical way.

- **No pop-ups** — hints appear inline, integrated into the content flow
- **Soft language** — "Here's a useful reference" not "We detected you were confused"
- **User agency** — learners can always dismiss hints or request more help
- **Gradual emergence** — interventions fade in, not abruptly appear

**Anti-patterns to avoid:**

| ❌ Avoid | ✅ Instead |
|---------|-----------|
| "We noticed you might be struggling" | "Here's something that might help at this stage" |
| Red warning banners | Soft amber inline card |
| Automatic task simplification without notice | "Would you like a simpler version of this task?" |
| Emotion state label shown to learner | Affect-aware message without naming the state |

---

### Principle 3: Competence-Affirming Feedback

All feedback is designed to support a **growth mindset** orientation (Dweck, 2006). This means:

- **Specific, dimensional feedback** — not "Good job!" or "You need improvement"
- **Progress-referenced** — compare to the learner's own baseline, not peers
- **Action-oriented** — every feedback point includes a suggested next step
- **Non-punitive gating** — learners are never told they "failed"; they are offered additional attempts

**Feedback Card Design:**
```
┌────────────────────────────────────────────────────────┐
│  📋 Scope Document Assessment                          │
│  ─────────────────────────────────────────────────     │
│  Overall Score: 74/100  ▲ Progress from baseline: +18  │
│                                                        │
│  ✅ Strong: Stakeholder needs clearly documented       │
│  ✅ Strong: In-scope / out-of-scope distinction clear  │
│  ⚡ Develop: Acceptance criteria need more specificity  │
│     → Tip: Use measurable verbs (e.g., "the learner    │
│       will be able to...") not vague descriptors       │
│  ⚡ Develop: Version control section incomplete        │
│     → Tip: Review the versioning protocol reference    │
│                                                        │
│  [ Try Again ]    [ Continue to Module 2 ]             │
└────────────────────────────────────────────────────────┘
```

---

### Principle 4: Cognitive Load Management by Design

Interface complexity is calibrated to the learner's current state and scaffold level:

```
Scaffold Level 4 (Maximum Support):
  Interface shows: current task card + one tool panel + progress indicator
  Hidden: all tool toggles, module map, settings
  Typography: larger base size (18px body), increased line height

Scaffold Level 3 (Default):
  Interface shows: task + tools panel + sidebar navigation + progress map
  Available: hint system, example library

Scaffold Level 2:
  Interface shows: full tool suite + optional advanced panels
  Available: expert reference panel for voluntary consultation

Scaffold Level 1 (Expert Mode):
  Interface: all panels available; no guided hints visible
  New: constraint counter, additional scenario variables shown
```

**Micro-interaction Design:**
- All state changes animate at 200–300ms (no jarring transitions)
- Error states use gentle amber — never red unless a hard error (system failure)
- Success states use soft green confirmation, auto-dismiss after 3 seconds
- Loading states always accompanied by a micro progress indicator

---

### Principle 5: Accessible and Inclusive by Architecture

WCAG 2.1 AA compliance is not retrofitted — it is embedded in the design system:

| Accessibility Requirement | Implementation |
|--------------------------|----------------|
| Color contrast ≥ 4.5:1 (text) | Design tokens enforce minimum ratios |
| Keyboard navigability | All interactive elements in tab order; focus rings visible |
| Screen reader support | ARIA labels on all dynamic content; live regions for adaptive hints |
| Motion sensitivity | All animations respect `prefers-reduced-motion` |
| Font size adjustment | Learner can increase base font size (100%–150%) in settings |
| Webcam alternatives | Full equivalent experience without webcam (behavior-only mode) |
| Cognitive accessibility | Consistent layout across all modules; no hidden navigation |

---

### Principle 6: Professional and Trustworthy Aesthetic

The visual design targets a **professional learning platform** register — not a gamified consumer app:

**Design Language:**
- **Color palette** — neutral slate base (#0F172A, #1E293B, #334155) with teal accent (#0D9488) for interactive elements and amber (#F59E0B) for attention states
- **Typography** — Inter (body), Space Grotesk (headings) — both from Google Fonts; geometric, modern, legible at all sizes
- **Spacing** — generous whitespace; 8px base grid; content width max-constrained to 760px for reading comfort
- **Icons** — Lucide React icon set; consistent weight; no decorative icons unless functional
- **Tone of voice** — direct, supportive, professional; second-person ("you"), present tense

---

## 10. Ethics and Privacy

### 10.1 Ethical Framework

STEP operates under a rigorous ethical framework developed in consultation with university research ethics requirements. The platform is designed to the standards of:

- **APA Ethical Principles for Research with Human Participants** (2017)
- **General Data Protection Regulation (GDPR)** — applicable to EU participants
- **IEEE Ethically Aligned Design** (2019) — specifically for AI/affective computing systems
- **ACM Code of Ethics** (2023)

### 10.2 Informed Consent Architecture

Consent is **granular, layered, and revocable** — not a single checkbox:

```
Consent Level 1: Required (base research participation)
  ├── Participation in training program
  ├── Collection of task performance data
  ├── Collection of reflection text (anonymized)
  └── Use of pseudonymized data in research publications

Consent Level 2: Optional (enhances adaptive features)
  ├── Webcam-based facial analysis
  │   └── Sub-option: retain AU data beyond session (default: session-only)
  ├── Text sentiment analysis of reflections
  └── Behavioral interaction tracking (beyond performance metrics)

Consent Level 3: Optional (broader research contribution)
  ├── Data sharing with IRB-approved secondary researchers
  ├── Use of anonymized data in open dataset publication
  └── Follow-up research contact (post-study)
```

**Consent UI Requirements:**
- Plain language — no legal jargon; validated at Grade 8 reading level (Flesch-Kincaid)
- Each consent item: title + plain-language explanation + what data, how used, how long stored
- Toggle-based selection (not checkbox fine-print)
- Re-accessible at any time via "My Privacy Settings" in learner profile
- Withdrawal pathway: one-click from settings, triggers pseudonymized data deletion within 72 hours

### 10.3 Emotion Data Ethics

Emotion sensing introduces specific ethical obligations that go beyond standard data privacy:

#### 10.3.1 The Inference Problem

The system draws inferences about internal mental states from external signals. This requires:

- **Epistemic humility** — the system does not claim to definitively "know" a learner's emotion; outputs are probabilistic estimates used only for pedagogical support decisions
- **Non-diagnostic scope** — the system is explicitly scoped to detect affect states relevant to learning; it does not diagnose psychological conditions
- **Inference boundaries** — the system will not infer identity, health status, personality traits, or group characteristics from facial data
- **Human oversight** — adaptive interventions are designed by educators; no AI intervention acts without a defined pedagogical rationale

#### 10.3.2 Bias and Fairness

Facial action unit models trained on limited demographic datasets show known performance disparities across skin tones, ages, and facial structures. STEP addresses this through:

```
Bias Mitigation Measures:
  1. Multi-dataset training: DISFA, CK+, AffectNet (combined ~130K samples)
  2. Demographic distribution audit prior to deployment
  3. Individual calibration: onboarding calibration personalizes AU baselines
     per learner, reducing systematic group bias impact
  4. Confidence thresholding: AU vectors below 0.65 confidence are not used
     for affect classification — behavioral signals take precedence
  5. Quarterly bias audit: performance metrics disaggregated by
     self-reported demographic groups (participant-optional)
  6. Researcher notification: any group performance disparity > 10%
     triggers automatic researcher alert for manual review
```

#### 10.3.3 Affective Privacy

Emotional states are intensely personal. Beyond data privacy, affective privacy requires:

- No emotion data is ever used for purposes beyond pedagogical support
- Learners receive their own emotion timeline data in a positive, growth-oriented frame
- No emotion data is shared with employers, institutions, or third parties
- Emotion data is stored separately from performance data and requires additional authorization to join

### 10.4 Data Governance

#### Retention and Deletion

| Data Category | Retention Period | Deletion Trigger |
|--------------|-----------------|-----------------|
| Participant PII | Study duration + 1 year | Study completion or withdrawal |
| Performance data (anonymized) | 10 years | Researcher request or IRB expiry |
| Emotion AU data (raw) | Session duration only (default) | Auto-deleted at session end |
| Emotion AU data (retained, if consented) | 3 years | Consent withdrawal or study close |
| Reflection text (anonymized) | 5 years | Consent withdrawal |
| Adaptive event logs | 5 years | Consent withdrawal |
| Consent records | Permanent | Never deleted (legal obligation) |

#### Access Control Matrix

| Role | Learner Data | Own Data | Group Aggregates | Full Dataset | PII |
|------|-------------|----------|-----------------|-------------|-----|
| Learner | Own only | ✓ | ✗ | ✗ | Own only |
| Researcher | Anonymized | N/A | ✓ | ✓ | ✗ |
| Supervisor | Anonymized | N/A | ✓ | ✓ | ✗ |
| IRB Auditor | Log access only | N/A | ✗ | ✗ | ✗ |
| Admin | System logs | N/A | ✓ | ✗ | ✗ |

### 10.5 Algorithmic Accountability

The adaptive engine is subject to the following accountability mechanisms:

- **Decision logging** — every adaptive decision is logged with full context (trigger, affect state, intervention, outcome)
- **Explainability** — researchers can query the full decision trail for any session
- **Override mechanism** — learners can always dismiss adaptive interventions; researcher can disable adaptation per-participant
- **Post-study audit** — retrospective analysis of all adaptive decisions is a mandated deliverable
- **Model versioning** — all changes to the affective classifier or adaptive engine are versioned and logged with a change rationale

---

## 11. Research Alignment

### 11.1 Research Design Integration

STEP functions simultaneously as a **training platform** and a **research instrument**. The platform is designed to support a **mixed-methods, quasi-experimental research design**:

```
Research Design Summary:
  Design type:       Quasi-experimental (pre-post) with control group
  Groups:            Experimental (emotion-adaptive) vs. Control (non-adaptive)
  Assignment:        Stratified random allocation (matched on baseline competency)
  Cohort size:       N ≥ 60 (30 per group, power analysis: power = 0.80, α = 0.05)
  Duration:          8-week training; 3-month follow-up measurement
  Primary outcome:   IDPM competency gain (pre–post assessment delta)
  Secondary outcomes: Engagement (completion rate, time-on-task),
                      Reflection depth (NLP analysis),
                      Transfer (3-month follow-up scenario performance)
  Qualitative strand: Semi-structured interviews, n=16 (8 per group, purposive)
```

### 11.2 Research Instrument Mapping

| Research Question | Instrument | Data Source in STEP |
|------------------|------------|---------------------|
| RQ1: Does emotion-adaptive training improve IDPM competency? | Pre/post competency assessment | `competency_record` pre vs. post |
| RQ2: Which affect states are most associated with competency gain? | Emotion-performance correlation | `emotion_event` × `competency_record` (join via `research_emotion_performance` view) |
| RQ3: How effective are specific adaptive interventions? | Adaptive event analysis | `adaptive_event.was_effective` aggregated by trigger/intervention type |
| RQ4: Does adaptation affect learner engagement and retention? | Session completion and time-on-task | `session.completion_pct` + `session.duration_min` by cohort |
| RQ5: How do learners experience affective sensing in training? | Semi-structured interview + exit survey | External; triangulated with `reflection_entry` sentiment |

### 11.3 Measurement Instruments

#### Primary: IDPM Competency Assessment

- **Format:** Scenario-based performance assessment (not MCQ)
- **Items:** 5 scenarios × 1 per competency cluster; each scored on a 4-point rubric
- **Scoring:** Automated (AI rubric scorer for WBS/risk register artifacts) + blind human rater for open-response items
- **Reliability:** Inter-rater reliability target: κ ≥ 0.75
- **Equivalence:** Three parallel forms (pre, mid, post) to prevent test-retest effects
- **Validity:** Face validity reviewed by 3 IDPM practitioners; content validity index (CVI) ≥ 0.80

#### Secondary: Project Management Self-Efficacy Scale

- Adapted from PSE-12 (Loo, 2002) — 12-item scale, 7-point Likert
- Administered at: onboarding, mid-study (week 4), post-study, 3-month follow-up
- STEP customization: 3 items adapted for IDPM context (validated through expert panel)

#### Secondary: Engagement Analytics

```python
# Engagement composite index calculation
engagement_score = (
  (completion_rate * 0.35) +           # % of tasks fully completed
  (reflection_depth_score * 0.25) +    # NLP reflection depth (0-1 normalized)
  (time_on_task_ratio * 0.20) +        # actual / expected time
  (hint_utilization_rate * 0.10) +     # voluntary hint requests
  (session_consistency_score * 0.10)   # regularity of session attendance
)
```

#### Qualitative: Semi-Structured Interview Protocol

Key interview domains (used at post-study, n=16):
1. Experience of the adaptive support features — perceived helpfulness, intrusiveness
2. Emotional awareness during training — was the emotion monitoring visible? Comfortable?
3. Perceived competency development — which IDPM skills felt most developed?
4. Transfer intentions — how do learners plan to apply IDPM skills in their work?
5. Improvement recommendations — what would change about the platform?

### 11.4 Research Variables Summary

```
Independent Variable:
  Adaptive condition (experimental vs. control)
  Operationalized: emotion-sensing + adaptive delivery vs. fixed delivery

Dependent Variables (primary):
  IDPM competency gain (pre–post delta on 5-cluster assessment)
  Project management self-efficacy gain

Dependent Variables (secondary):
  Session engagement composite (behavioral)
  Reflection depth (NLP-scored)
  3-month transfer performance

Moderator Variables:
  Prior IDPM experience (years)
  Baseline competency level (pre-assessment score)
  Webcam consent level (affects AU data quality)

Mediator Variables (exploratory):
  Emotion state frequency distribution (from `emotion_event`)
  Adaptive intervention frequency and type
  Self-regulation marker density in reflections

Covariate Controls:
  Participant age range
  Primary job role category
  Organization type (corporate L&D vs. ed-tech vendor)
```

### 11.5 Statistical Analysis Plan

| Analysis | Method | Tool | Research Question |
|----------|--------|------|------------------|
| Primary competency gain | ANCOVA (post-score covaried on pre-score) | R (car package) | RQ1 |
| Effect size | Cohen's d (experimental vs. control post-scores) | R | RQ1 |
| Emotion-performance correlation | Pearson r / Spearman ρ per affect state | Python (scipy) | RQ2 |
| Adaptive intervention effectiveness | Logistic regression (effective/not) | Python (sklearn) | RQ3 |
| Engagement by group | Independent samples t-test / Mann-Whitney U | R | RQ4 |
| Longitudinal competency trajectory | Linear mixed model | R (lme4) | RQ1 + RQ4 |
| Qualitative coding | Thematic analysis (Braun & Clarke, 2006) | NVivo | RQ5 |
| Triangulation | Convergent mixed methods analysis | Manual | All RQs |

---

*Document 4 of 5 — Continue with `04_implementation_and_innovation.md`*

---

**STEP Platform Design Specification**  
*PhD Research Artifact · Confidential · 2026*
