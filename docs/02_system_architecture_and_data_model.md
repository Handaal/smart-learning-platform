# STEP — Smart Training for Emotion-Aware Professional Development
## Platform Design Specification · Document 3 of 5
### System Architecture · Data Model

---

> **Cross-reference:** This document details the technical implementation supporting the adaptive behaviors defined in `01_core_modules_and_learner_journey.md` (Section 6).

---

## 7. System Architecture

### 7.1 Architectural Overview

STEP is built as a **modular, layered web application** designed for research-grade reliability, data integrity, and extensibility. The architecture separates concerns across five distinct layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│     React SPA · Responsive Web · Accessibility-First (WCAG 2.1) │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST + WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                       APPLICATION LAYER                          │
│  Session Manager · Scenario Engine · Assessment Engine           │
│  Reflection Analyzer · Progress Tracker · Notification Service   │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     AI SERVICES LAYER                            │
│  Emotion Detection Engine · Affect Classification Service        │
│  Adaptive Decision Engine · NLP Sentiment Analyzer               │
│  Text Rubric Scorer · Competency Inference Model                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                       DATA LAYER                                 │
│  PostgreSQL (primary) · Redis (session cache) · S3 (artifacts)   │
│  TimescaleDB (time-series emotion logs) · Elasticsearch (search) │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                           │
│  Docker Containers · NGINX Reverse Proxy · Let's Encrypt TLS    │
│  GitHub Actions CI/CD · Prometheus Monitoring · Grafana Dashboards│
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Frontend Architecture

**Technology Stack:** React 18 + TypeScript · Vite · Zustand (state) · React Query (server state) · Recharts (analytics)

#### Key Frontend Components

```
frontend/
├── src/
│   ├── features/
│   │   ├── onboarding/          # Profile setup, consent, calibration
│   │   ├── emotion-monitor/     # Webcam feed, AU detection UI
│   │   ├── scenario-engine/     # Scenario rendering & branching
│   │   ├── pm-tools/            # WBS builder, Gantt, Risk Register
│   │   ├── communication-sim/   # Message thread simulation
│   │   ├── reflection/          # Reflection journal interface
│   │   ├── analytics/           # Learner-facing dashboard
│   │   └── admin/               # Researcher dashboard
│   ├── components/
│   │   ├── AdaptiveHint/        # Context-aware hint overlay
│   │   ├── EmotionIndicator/    # Optional self-monitoring panel
│   │   ├── ProgressMap/         # Module journey visualization
│   │   ├── FeedbackCard/        # Dimensioned performance feedback
│   │   └── ConsentModal/        # Granular consent management
│   ├── services/
│   │   ├── webcamService.ts     # MediaDevices API + frame capture
│   │   ├── emotionStream.ts     # WebSocket emotion event handler
│   │   ├── adaptiveClient.ts    # Adaptive engine API client
│   │   └── analyticsService.ts  # Event tracking (research-grade)
│   └── hooks/
│       ├── useEmotionState.ts   # Real-time affect state subscription
│       ├── useAdaptation.ts     # Adaptive intervention consumer
│       └── useScenario.ts       # Scenario state machine hook
```

#### Webcam Integration Flow

```typescript
// webcamService.ts — simplified flow
class WebcamService {
  private stream: MediaStream | null = null;
  private frameInterval: NodeJS.Timeout | null = null;
  private readonly SAMPLE_RATE_MS = 2000; // 2-second sampling

  async initialize(consentGranted: boolean): Promise<void> {
    if (!consentGranted) throw new ConsentRequiredError();
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false
    });
  }

  startCapture(onFrame: (blob: Blob) => void): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    this.frameInterval = setInterval(() => {
      ctx.drawImage(this.videoElement, 0, 0, 640, 480);
      canvas.toBlob(blob => {
        if (blob) onFrame(blob);
      }, 'image/jpeg', 0.8);
    }, this.SAMPLE_RATE_MS);
  }

  stop(): void {
    clearInterval(this.frameInterval!);
    this.stream?.getTracks().forEach(t => t.stop());
  }
}
```

### 7.3 Backend Architecture

**Technology Stack:** Node.js + Express + TypeScript · PostgreSQL with Prisma ORM · Redis · Bull (job queues)

#### Service Decomposition

```
backend/
├── src/
│   ├── api/
│   │   ├── auth/                # JWT auth, role management
│   │   ├── learner/             # Learner profile & progress APIs
│   │   ├── session/             # Session management & state
│   │   ├── scenario/            # Scenario delivery & branching
│   │   ├── emotion/             # Emotion event ingest endpoint
│   │   ├── adaptation/          # Adaptive engine trigger interface
│   │   ├── reflection/          # Reflection submission & analysis
│   │   ├── assessment/          # Rubric scoring & feedback
│   │   └── research/            # Researcher data export APIs
│   ├── services/
│   │   ├── AdaptiveEngine.ts    # Core adaptation decision logic
│   │   ├── AffectClassifier.ts  # State transition model
│   │   ├── SessionOrchestrator.ts # Session flow control
│   │   ├── CompetencyTracker.ts # Longitudinal competency modeling
│   │   └── NotificationService.ts # Adaptive communication events
│   ├── jobs/
│   │   ├── emotionBatchProcess.ts # Batch affect log processing
│   │   └── competencyInference.ts # Async competency recalculation
│   └── middleware/
│       ├── auth.middleware.ts
│       ├── consent.middleware.ts # Consent gate on all data endpoints
│       └── rateLimit.middleware.ts
```

#### Adaptive Engine Core Logic

```typescript
// AdaptiveEngine.ts — simplified
interface AdaptiveDecision {
  intervention: 'hint' | 'scaffold_up' | 'scaffold_down' | 'challenge' | 'break' | 'none';
  content?: AdaptiveContent;
  logEvent: AdaptiveEvent;
}

class AdaptiveEngine {
  decide(context: AdaptiveContext): AdaptiveDecision {
    const { affectState, behaviorMetrics, competencyScore, scaffoldLevel } = context;

    // Priority 1: Prevent abandonment risk
    if (affectState === 'Frustration' && behaviorMetrics.sessionMinutes > 5) {
      return this.buildResponse('scaffold_up', context, 'frustration_prolonged');
    }

    // Priority 2: Resolve confusion before it cascades
    if (affectState === 'Confusion' && behaviorMetrics.dwellExceedsThreshold) {
      return this.buildResponse('hint', context, 'confusion_dwell');
    }

    // Priority 3: Re-engage bored high-performers
    if (affectState === 'Boredom' && competencyScore > 0.75 && scaffoldLevel > 1) {
      return this.buildResponse('scaffold_down', context, 'boredom_able');
    }

    // Priority 4: Challenge learners in flow
    if (affectState === 'Flow' && competencyScore > 0.80) {
      return this.buildResponse('challenge', context, 'flow_high_performance');
    }

    return { intervention: 'none', logEvent: this.buildLogEvent('no_action', context) };
  }
}
```

### 7.4 AI Services Layer

#### 7.4.1 Emotion Detection Engine

**Approach:** Client-side face landmark detection (TensorFlow.js + MediaPipe Face Mesh) with server-side AU classification.

```
Detection Pipeline:
  1. Frame captured client-side (640×480 JPEG)
  2. MediaPipe Face Mesh → 468 facial landmarks
  3. AU calculation: geometric relationships between landmark groups
     - AU1 (Inner Brow Raise): landmarks 107, 336 relative to 33, 263
     - AU4 (Brow Lowerer): landmarks 65, 295 relative to 159, 386
     - AU6 (Cheek Raiser): landmarks 116, 345 relative to 133, 362
     - AU12 (Lip Corner Puller): landmarks 61, 291 relative to 0, 17
     - AU20 (Lip Stretcher): landmarks 61, 291 width ratio
     - AU23 (Lip Tightener): landmarks upper/lower lip compression
  4. AU vectors transmitted to server (not raw frames — privacy by design)
  5. Server-side: affect classification using trained SVM or Random Forest
     (trained on DISFA, CK+, AffectNet datasets)
  6. State assigned per affective taxonomy (Flow/Confusion/Frustration/Anxiety/Boredom)
  7. State logged to TimescaleDB with session context
```

> **Privacy Note:** Raw video frames are **never transmitted** to the server. Only the computed AU vector (12 values, 0–1 normalized) is sent. This is a core architectural privacy guarantee.

#### 7.4.2 Behavioral Analytics Engine

Behavioral signals are collected via event listeners and aggregated into a **behavioral signature** every 90 seconds:

```typescript
interface BehaviorSignature {
  sessionId: string;
  windowStart: Date;
  windowEnd: Date;
  // Attention signals
  dwellTimeSeconds: number;
  scrollEvents: number;
  reReadCount: number;       // Re-reading same content block
  // Interaction signals
  clickCount: number;
  clickRatePerMinute: number;
  taskProgressPercent: number;
  // Navigation signals
  pageReturns: number;       // Back navigation count
  hintRequests: number;
  abandonmentAttempts: number;
  // Text signals (when applicable)
  typingRateWPM: number;
  backspaceRatio: number;    // Backspaces / total keystrokes
}
```

#### 7.4.3 NLP Sentiment & Rubric Analyzer

**Reflection text analysis pipeline:**

```
Input: Learner reflection text (150–300 words)

Pipeline:
  1. Language detection (ensure English; flag for researcher if otherwise)
  2. Valence scoring: VADER + fine-tuned BERT for academic/professional register
  3. Arousal estimation: linguistic intensity markers (LIWCat dictionary)
  4. Rubric assessment dimensions:
     a. Depth of reflection (surface → analytical → critical)
     b. Self-regulation language markers
     c. Competency concept integration
     d. Problem identification vs. solution orientation
  5. Reflection score: composite 0–100 scale
  6. Qualitative feedback generation (template-anchored, not fully LLM-generated)

Output:
  ReflectionAnalysis {
    sentiment: { valence: -0.3, arousal: 0.6 }
    reflectionDepth: 'analytical'
    selfRegulationMarkers: ['identified difficulty', 'planned next step']
    competencyConcepts: ['scope management', 'stakeholder communication']
    score: 72
    feedbackPoints: ['Strong identification of scope challenge', 
                     'Consider: how might you prevent this earlier?']
  }
```

### 7.5 Infrastructure

#### Deployment Architecture

```
Production Environment:
  ├── Application Server: 2× EC2 t3.large (Node.js backend)
  ├── Frontend: CloudFront + S3 static hosting
  ├── Database: RDS PostgreSQL (db.t3.medium, encrypted)
  ├── Cache: ElastiCache Redis (cache.t3.small)
  ├── Time-series: Self-hosted TimescaleDB on EC2 t3.medium
  ├── File Storage: S3 (artifact storage, encrypted at rest)
  ├── AI Processing: Lambda functions (emotion AU processing)
  └── Monitoring: CloudWatch + self-hosted Grafana

Research Data Environment (isolated):
  ├── Anonymized data export: scheduled nightly to encrypted S3
  ├── Researcher access: VPN-gated Jupyter environment
  └── IRB compliance: access log maintained for all data queries
```

#### Security Controls

| Control | Implementation |
|---------|---------------|
| Authentication | JWT (15-min access + 7-day refresh) with device fingerprinting |
| Authorization | RBAC: learner / researcher / admin / IRB-auditor roles |
| Data in transit | TLS 1.3 enforced (HSTS, no TLS 1.0/1.1) |
| Data at rest | AES-256 (PostgreSQL TDE + S3 SSE-KMS) |
| Webcam data | Client-side only processing; AU vectors ≠ biometric identifiers |
| PII handling | Separated from research data; pseudonymized participant IDs |
| Audit logging | All data access logged with timestamp, user, query hash |
| Penetration testing | Quarterly, per university research ethics requirements |

---

## 8. Data Model

### 8.1 Entity Relationship Overview

```
Learner ─────────────── LearnerProfile
   │                          │
   ├── Session ───────────────┤
   │      │                   │
   │      ├── EmotionEvent     │
   │      ├── BehaviorWindow   │
   │      ├── AdaptiveEvent    │
   │      └── ReflectionEntry  │
   │                          │
   ├── CompetencyRecord ───────┤
   ├── ModuleProgress ─────────┤
   └── ConsentRecord          │
                              │
Scenario ─────────────── ScenarioAttempt
   │                          │
   ├── ScenarioEpisode         │
   └── BranchingNode      ArtifactSubmission
                               │
AssessmentRubric ────── AssessmentScore
```

### 8.2 Core Entity Schemas

#### Learner

```sql
CREATE TABLE learner (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  VARCHAR(12) UNIQUE NOT NULL,  -- pseudonymized ID for research
  cohort          cohort_type NOT NULL,          -- 'experimental' | 'control'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_active     TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  CONSTRAINT valid_cohort CHECK (cohort IN ('experimental', 'control'))
);

-- No PII stored in primary learner table
-- PII in separate encrypted store, linked only by participant_id
```

#### LearnerProfile

```sql
CREATE TABLE learner_profile (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id            UUID REFERENCES learner(id) ON DELETE CASCADE,
  years_experience      SMALLINT CHECK (years_experience BETWEEN 0 AND 40),
  primary_role          VARCHAR(100),
  learning_pref         learning_pref_type,
  baseline_c1_score     NUMERIC(4,3) CHECK (baseline_c1_score BETWEEN 0 AND 1),
  baseline_c2_score     NUMERIC(4,3) CHECK (baseline_c2_score BETWEEN 0 AND 1),
  baseline_c3_score     NUMERIC(4,3) CHECK (baseline_c3_score BETWEEN 0 AND 1),
  baseline_c4_score     NUMERIC(4,3) CHECK (baseline_c4_score BETWEEN 0 AND 1),
  baseline_c5_score     NUMERIC(4,3) CHECK (baseline_c5_score BETWEEN 0 AND 1),
  emotion_neutral_au    JSONB,        -- calibrated neutral AU vector
  frustration_threshold NUMERIC(4,3),
  confusion_threshold   NUMERIC(4,3),
  pse_scale_score       NUMERIC(4,1), -- Project Self-Efficacy baseline
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

#### Session

```sql
CREATE TABLE session (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID REFERENCES learner(id),
  module_id       VARCHAR(10) NOT NULL,   -- 'M0' through 'M5'
  episode_id      VARCHAR(20),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  duration_min    NUMERIC(6,2),
  completion_pct  NUMERIC(5,2) DEFAULT 0,
  scaffold_level  SMALLINT CHECK (scaffold_level BETWEEN 1 AND 4),
  final_affect    affect_state_type,
  session_notes   TEXT,                   -- researcher annotations
  is_complete     BOOLEAN DEFAULT FALSE
);
```

#### EmotionEvent (TimescaleDB hypertable)

```sql
CREATE TABLE emotion_event (
  time            TIMESTAMPTZ NOT NULL,   -- hypertable partition key
  session_id      UUID REFERENCES session(id),
  learner_id      UUID REFERENCES learner(id),
  au1             NUMERIC(4,3),  -- Inner Brow Raise
  au4             NUMERIC(4,3),  -- Brow Lowerer
  au6             NUMERIC(4,3),  -- Cheek Raiser
  au12            NUMERIC(4,3),  -- Lip Corner Puller
  au20            NUMERIC(4,3),  -- Lip Stretcher
  au23            NUMERIC(4,3),  -- Lip Tightener
  au_confidence   NUMERIC(4,3),  -- face detection confidence
  classified_state affect_state_type,
  classification_confidence NUMERIC(4,3),
  episode_context VARCHAR(20)    -- which episode was active
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('emotion_event', 'time');
CREATE INDEX ON emotion_event (learner_id, time DESC);
```

#### BehaviorWindow

```sql
CREATE TABLE behavior_window (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID REFERENCES session(id),
  window_start          TIMESTAMPTZ NOT NULL,
  window_end            TIMESTAMPTZ NOT NULL,
  dwell_time_sec        NUMERIC(8,2),
  scroll_events         INTEGER DEFAULT 0,
  reread_count          INTEGER DEFAULT 0,
  click_count           INTEGER DEFAULT 0,
  click_rate_per_min    NUMERIC(6,2),
  task_progress_pct     NUMERIC(5,2),
  page_returns          INTEGER DEFAULT 0,
  hint_requests         INTEGER DEFAULT 0,
  abandonment_attempts  INTEGER DEFAULT 0,
  typing_rate_wpm       NUMERIC(6,2),
  backspace_ratio       NUMERIC(4,3),
  derived_affect_signal affect_state_type  -- behavior-derived, no webcam
);
```

#### AdaptiveEvent

```sql
CREATE TABLE adaptive_event (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID REFERENCES session(id),
  occurred_at       TIMESTAMPTZ DEFAULT NOW(),
  trigger_type      VARCHAR(50) NOT NULL,  -- e.g., 'confusion_dwell'
  affect_state      affect_state_type,
  behavior_signal   JSONB,                 -- snapshot of BehaviorWindow values
  intervention      VARCHAR(50) NOT NULL,  -- e.g., 'hint', 'scaffold_up'
  content_id        VARCHAR(100),          -- ID of injected content
  learner_response  VARCHAR(50),           -- did learner use the intervention?
  response_latency_sec NUMERIC(8,2),
  post_affect_state affect_state_type,     -- state 90s after intervention
  was_effective     BOOLEAN                -- computed post-hoc
);
```

#### CompetencyRecord

```sql
CREATE TABLE competency_record (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id      UUID REFERENCES learner(id),
  recorded_at     TIMESTAMPTZ DEFAULT NOW(),
  source          VARCHAR(50) NOT NULL,  -- 'assessment' | 'artifact' | 'simulation'
  module_id       VARCHAR(10),
  competency_c1   NUMERIC(4,3),
  competency_c2   NUMERIC(4,3),
  competency_c3   NUMERIC(4,3),
  competency_c4   NUMERIC(4,3),
  competency_c5   NUMERIC(4,3),
  composite_score NUMERIC(4,3) GENERATED ALWAYS AS (
    (competency_c1 + competency_c2 + competency_c3 + competency_c4 + competency_c5) / 5
  ) STORED,
  notes           TEXT
);
```

#### ReflectionEntry

```sql
CREATE TABLE reflection_entry (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID REFERENCES session(id),
  learner_id            UUID REFERENCES learner(id),
  submitted_at          TIMESTAMPTZ DEFAULT NOW(),
  prompt_id             VARCHAR(50) NOT NULL,
  response_text         TEXT NOT NULL,
  word_count            INTEGER,
  sentiment_valence     NUMERIC(4,3) CHECK (sentiment_valence BETWEEN -1 AND 1),
  sentiment_arousal     NUMERIC(4,3) CHECK (sentiment_arousal BETWEEN 0 AND 1),
  reflection_depth      VARCHAR(20),  -- 'surface' | 'analytical' | 'critical'
  self_reg_markers      TEXT[],
  competency_concepts   TEXT[],
  reflection_score      NUMERIC(5,2),
  auto_feedback         JSONB         -- structured feedback points
);
```

#### ConsentRecord

```sql
CREATE TABLE consent_record (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id              UUID REFERENCES learner(id),
  recorded_at             TIMESTAMPTZ DEFAULT NOW(),
  consent_version         VARCHAR(20) NOT NULL,  -- consent form version
  facial_analysis         BOOLEAN NOT NULL DEFAULT FALSE,
  text_sentiment          BOOLEAN NOT NULL DEFAULT FALSE,
  behavioral_tracking     BOOLEAN NOT NULL DEFAULT TRUE,
  data_sharing_research   BOOLEAN NOT NULL DEFAULT FALSE,
  data_retention_years    SMALLINT DEFAULT 5,
  withdrawal_requested_at TIMESTAMPTZ,
  ip_hash                 VARCHAR(64),  -- hashed IP for audit trail
  user_agent_hash         VARCHAR(64)
);
```

### 8.3 Research Analytics Views

Pre-defined database views for research analysis, designed to anonymize at the query layer:

```sql
-- Emotion-Performance Correlation View
CREATE VIEW research_emotion_performance AS
SELECT
  l.participant_id,
  l.cohort,
  lp.baseline_c1_score,
  ee.classified_state AS affect_state,
  COUNT(ee.*) AS affect_state_frequency,
  cr.competency_c1 AS post_competency_c1,
  cr.competency_c5 AS post_competency_c5
FROM learner l
JOIN learner_profile lp ON l.id = lp.learner_id
JOIN session s ON l.id = s.learner_id
JOIN emotion_event ee ON s.id = ee.session_id
JOIN competency_record cr ON l.id = cr.learner_id
WHERE cr.source = 'assessment'
GROUP BY l.participant_id, l.cohort, lp.baseline_c1_score,
         ee.classified_state, cr.competency_c1, cr.competency_c5;

-- Adaptive Effectiveness View
CREATE VIEW research_adaptive_effectiveness AS
SELECT
  ae.trigger_type,
  ae.intervention,
  ae.affect_state AS pre_state,
  ae.post_affect_state AS post_state,
  ae.was_effective,
  l.cohort,
  COUNT(*) AS intervention_count,
  AVG(ae.response_latency_sec) AS avg_response_latency,
  SUM(CASE WHEN ae.was_effective THEN 1 ELSE 0 END)::FLOAT /
    COUNT(*) AS effectiveness_rate
FROM adaptive_event ae
JOIN session s ON ae.session_id = s.id
JOIN learner l ON s.learner_id = l.id
WHERE l.cohort = 'experimental'
GROUP BY ae.trigger_type, ae.intervention, ae.affect_state,
         ae.post_affect_state, ae.was_effective, l.cohort;
```

### 8.4 Data Dictionary Summary

| Table | Purpose | Row Estimate (per participant) | Retention |
|-------|---------|-------------------------------|-----------|
| `learner` | Core identity record | 1 | Study + 5 years |
| `learner_profile` | Profile & baselines | 1 | Study + 5 years |
| `session` | Session metadata | ~16 | Study + 5 years |
| `emotion_event` | AU time-series | ~8,000–14,000 | Study + 3 years |
| `behavior_window` | Behavior aggregates | ~200 | Study + 5 years |
| `adaptive_event` | Adaptation log | ~80–200 | Study + 5 years |
| `competency_record` | Competency scores | ~20–40 | Study + 10 years |
| `reflection_entry` | Reflection analysis | ~16 | Study + 5 years |
| `consent_record` | Consent audit | 1–3 | Permanent (legal) |

---

*Document 3 of 5 — Continue with `03_ux_ethics_and_research_alignment.md`*

---

**STEP Platform Design Specification**  
*PhD Research Artifact · Confidential · 2026*
