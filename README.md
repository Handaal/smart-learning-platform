# STEP Platform

**Smart Training & Emotion Platform** · PhD Research Project

A research-grade adaptive eLearning system that combines affective computing, real-time emotion sensing, and NLP-driven reflection analysis to study the impact of emotion-adaptive scaffolding on IDPM (Instructional Design Project Management) competency development.

## Doctoral Core Alignment

The current doctoral implementation is aligned to a facial-expression-only research model:

- Webcam-based facial expression sensing is the only core affective input
- Adaptive decisions are scenario-based and interpretable, not black-box
- Redis is used for live emotion, engagement, lesson context, performance, and intervention state
- Participant identity is handled through fixed 20-character participant IDs
- The researcher dashboard exposes an exportable emotional engagement timeline heatmap built from adaptive decision logs

Modalities such as voice emotion analysis, eye tracking, and wearable/physiological sensors are treated as future extensions rather than doctoral-core dependencies.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  React + Vite  ←→  MediaPipe FaceMesh (local AU compute)   │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + WebSocket (AU vectors only)
┌──────────────────────────▼──────────────────────────────────┐
│              Backend API  (Node.js / Express / TypeScript)   │
│  Auth · Learner · Session · Emotion WS · Adaptation         │
│  Reflection · Assessment · Scenario · Research              │
└───────────┬──────────────────────────┬──────────────────────┘
            │ Prisma ORM               │ HTTP (API key)
┌───────────▼──────────┐   ┌──────────▼──────────────────────┐
│  PostgreSQL /         │   │  AI Services  (FastAPI / Python) │
│  TimescaleDB          │   │  /affect/classify (RF/rule)      │
│  (time-series)        │   │  /sentiment/analyse (VADER)      │
└───────────────────────┘   └──────────────────────────────────┘
            │
┌───────────▼──────────┐
│  Redis               │
│  Session state cache  │
│  JWT refresh tokens   │
└──────────────────────┘
```

---

## Prerequisites

| Tool        | Version  | Purpose                      |
|-------------|----------|------------------------------|
| Node.js     | ≥ 20 LTS | Backend + Frontend           |
| npm         | ≥ 10     | Package manager              |
| Python      | ≥ 3.11   | AI services                  |
| Docker      | ≥ 24     | PostgreSQL + Redis containers|
| PostgreSQL  | ≥ 15 + TimescaleDB | Database         |

---

## Quick Start

### 1. Start Infrastructure (Docker)

```bash
docker compose up db redis -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # edit JWT_SECRET and DB credentials
npm install
npx prisma migrate deploy
npm run db:seed               # loads all modules, episodes, prompts
npm run dev                   # starts on http://localhost:3001
```

Apply TimescaleDB hypertables (requires psql):

```bash
psql $DATABASE_URL -f ../database/timescale_setup.sql
```

### 3. AI Services

```bash
cd ai-services
pip install -r requirements.txt
# Set API_KEY env var (must match backend AI_SERVICE_API_KEY)
python main.py                # starts on http://localhost:8000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev                   # starts on http://localhost:5173
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable              | Required | Description                          |
|-----------------------|----------|--------------------------------------|
| `DATABASE_URL`        | ✅       | PostgreSQL connection string         |
| `REDIS_URL`           | ✅       | Redis connection string              |
| `JWT_SECRET`          | ✅       | Min 64-char random string            |
| `AI_SERVICE_URL`      | ✅       | `http://localhost:8000`              |
| `AI_SERVICE_API_KEY`  | ✅       | Must match AI service `API_KEY` env  |
| `PORT`                | —        | Default: `3001`                      |
| `NODE_ENV`            | —        | `development` or `production`        |

---

## Running Tests

```bash
# Backend unit + integration tests
cd backend
npm test

# Run tests with coverage
npm test -- --coverage

# AI services (pytest)
cd ai-services
pip install pytest
pytest tests/
```

---

## Training the Affect Classifier (Phase 2)

Once the pilot study produces annotated AU data:

```bash
cd ai-services
python train.py \
  --input data/pilot_annotated.csv \
  --output models/affect_classifier.pkl \
  --irr   # optional: compute Cohen's Kappa inter-rater reliability
```

The trained model is automatically loaded by `AffectClassifierML` at startup, replacing the rule-based v0.1 classifier with no API changes required.

**Required CSV columns:** `session_id, learner_id, au1, au4, au6, au12, au20, au23, confidence, label`

---

## Project Structure

```
smart-training-emotion-platform/
├── backend/
│   ├── src/
│   │   ├── api/           # Route + Controller + Service per domain
│   │   ├── lib/           # Prisma, Redis, Logger singletons
│   │   ├── middleware/    # Auth, errorHandler, rateLimiter, requestId
│   │   ├── services/      # AdaptiveEngine, AffectClassifier, CompetencyTracker
│   │   ├── scripts/       # seed.ts
│   │   └── server.ts
│   ├── prisma/schema.prisma
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Layout, Emotion, PM Tools
│   │   ├── pages/         # Auth, Learner, Research
│   │   ├── services/      # api.ts, webcamService.ts
│   │   ├── store/         # authStore, emotionStore (Zustand)
│   │   └── styles/        # globals.css (design system)
│   └── package.json
├── ai-services/
│   ├── main.py            # FastAPI entry
│   ├── services/          # affect_classifier.py, sentiment_analyser.py
│   ├── train.py           # ML training pipeline
│   └── models/            # .pkl files (git-ignored)
├── database/
│   └── timescale_setup.sql # Hypertables + indexes (run once after first deploy)
│       # schema.sql / seed.sql here are pre-Prisma leftovers — unused
├── tests/
│   ├── unit/              # AffectClassifier.test.ts, AdaptiveEngine.test.ts
│   └── integration/       # auth.api.test.ts
└── docker-compose.yml
```

---

## Privacy & Ethics

- Raw webcam footage is **never recorded or transmitted**
- Only 6 AU intensity values (floating point 0–1) are sent per 2-second frame
- Consent is granular and tracked in the `consent_record` table
- Participants may withdraw at any time via `/api/learners/:id/withdraw`
- All data is anonymised via `participant_id` (no real names stored)
- The `step_researcher` DB role has read-only access to prevent accidental mutation

---

## Research Design

| Cohort       | N   | Condition                          |
|--------------|-----|------------------------------------|
| Experimental | ~20 | Adaptive scaffolding + emotion sensing |
| Control      | ~20 | Fixed scaffolding, no adaptation   |

**Instruments:** Pre/Mid/Post competency assessment (0–4 rubric, 5 dimensions) · NLP-scored reflections · Session performance metrics

**Research Questions:** RQ1: Competency gain · RQ2: Adaptive effectiveness · RQ3: Reflection depth × affect co-regulation

---

*PhD Research · Confidential · 2026*
