import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { Server as HttpServer, createServer } from 'http';
import { access } from 'fs/promises';
import path from 'path';

import { logger } from './lib/logger';
import { getAllowedOrigins } from './lib/cors';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestId } from './middleware/requestId';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { uploadsDir, ensureUploadsDir } from './lib/uploads';

import authRoutes       from './api/auth/auth.routes';
import learnerRoutes    from './api/learner/learner.routes';
import sessionRoutes    from './api/session/session.routes';
import emotionRoutes    from './api/emotion/emotion.routes';
import adaptationRoutes from './api/adaptation/adaptation.routes';
import reflectionRoutes from './api/reflection/reflection.routes';
import assessmentRoutes from './api/assessment/assessment.routes';
import scenarioRoutes   from './api/scenario/scenario.routes';
import quizRoutes       from './api/quiz/quiz.routes';
import researchRoutes   from './api/research/research.routes';
import settingsRoutes   from './api/settings/settings.routes';

import { setupSocketIO } from './api/emotion/emotion.ws';

export const app = express();
const PORT = Number(process.env.PORT ?? 3001);

async function checkDbReady() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'DB check failed' };
  }
}

async function checkRedisReady() {
  try {
    if (redis.status !== 'ready' && redis.status !== 'connecting') {
      await redis.connect();
    }
    const ping = await redis.ping();
    return { ok: ping === 'PONG' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Redis check failed' };
  }
}

async function checkFaceModelAssets() {
  const configuredDir = process.env.FACE_MODEL_ASSETS_DIR;
  const manifest = 'tiny_face_detector_model-weights_manifest.json';
  const candidates = [
    configuredDir,
    path.resolve(process.cwd(), '../frontend/public/faceapi-models'),
    path.resolve(process.cwd(), '../frontend/public/models/faceapi'),
    path.resolve(process.cwd(), './public/faceapi-models'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      await access(path.join(candidate, manifest));
      return { ok: true, source: candidate };
    } catch {
      // try next
    }
  }

  return {
    ok: false,
    source: configuredDir ?? null,
    error: `Model manifest not found (${manifest}). Set FACE_MODEL_ASSETS_DIR or place assets in frontend/public/faceapi-models.`,
  };
}

// ── Security & parsing ────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.http(msg.trim()) } }));
app.use(requestId);

// Admin-uploaded lesson files (PDFs) — served statically so learners can view
// them in an iframe. Registered before the rate limiter so document viewing
// isn't throttled like API calls.
ensureUploadsDir();
app.use('/uploads', express.static(uploadsDir, { maxAge: '1h' }));

app.use(rateLimiter);

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', ts: new Date().toISOString() })
);

app.get('/api/health/ready', async (_req, res) => {
  const [db, redisState, modelAssets] = await Promise.all([
    checkDbReady(),
    checkRedisReady(),
    checkFaceModelAssets(),
  ]);
  const requireModelAssetsCheck = String(process.env.REQUIRE_MODEL_ASSETS_CHECK ?? '')
    .trim()
    .toLowerCase() === 'true';

  const envChecks = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    redisUrl: Boolean(process.env.REDIS_URL),
    jwtSecret: Boolean(process.env.JWT_SECRET),
    apiPort: Boolean(process.env.PORT ?? '3001'),
    faceModelAssetsDir: Boolean(process.env.FACE_MODEL_ASSETS_DIR),
    requireModelAssetsCheck,
  };
  const envOk = envChecks.databaseUrl && envChecks.redisUrl && envChecks.jwtSecret;

  const modelAssetsOk = modelAssets.ok || !requireModelAssetsCheck;
  const ready = db.ok && redisState.ok && modelAssetsOk && envOk;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'degraded',
    ts: new Date().toISOString(),
    checks: {
      db,
      redis: redisState,
      modelAssets,
      env: envChecks,
    },
  });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/learners',   learnerRoutes);
app.use('/api/sessions',   sessionRoutes);
app.use('/api/emotion',    emotionRoutes);
app.use('/api/adaptation', adaptationRoutes);
app.use('/api/reflections',reflectionRoutes);
app.use('/api/assessments',assessmentRoutes);
app.use('/api/scenarios',  scenarioRoutes);
app.use('/api/quizzes',    quizRoutes);
app.use('/api/research',   researchRoutes);
app.use('/api/settings',   settingsRoutes);

// ── Error handler (must be last) ─────────────────────────────
app.use(errorHandler);

// ── HTTP + WebSocket server ──────────────────────────────────
const httpServer = createServer(app);

setupSocketIO(httpServer);

// Guard: don't bind port during jest test runs
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    logger.info(`STEP backend started on port ${PORT}`);
  });
}

export { httpServer };
export default app;
