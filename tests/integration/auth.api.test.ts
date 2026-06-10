/**
 * Integration test — Auth API
 * Tests registration, login, token refresh, and protected routes.
 * Requires a running test DB (set TEST_DATABASE_URL in backend/.env).
 */
import request   from 'supertest';
import { app }   from '../../backend/src/server';
import { prisma } from '../../backend/src/lib/prisma';

const TEST_PID  = `TEST-${Date.now()}`;
const TEST_PASS = 'test-password-123';

let accessToken  = '';
let refreshToken = '';

afterAll(async () => {
  const learner = await prisma.learner.findUnique({ where: { participantId: TEST_PID } });
  if (learner) {
    await prisma.authCredential.deleteMany({ where: { learnerId: learner.id } });
    await prisma.learner.delete({ where: { id: learner.id } });
  }
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates a new learner account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ participantId: TEST_PID, password: TEST_PASS, cohort: 'experimental' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('learnerId');
  });

  it('rejects duplicate participant ID', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ participantId: TEST_PID, password: TEST_PASS, cohort: 'experimental' });

    expect(res.status).toBe(409);
  });

  it('rejects short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ participantId: 'TEST-SHORT', password: '123', cohort: 'experimental' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ participantId: TEST_PID, password: TEST_PASS });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    accessToken  = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ participantId: TEST_PID, password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('rejects unknown participant', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ participantId: 'UNKNOWN-999', password: 'any' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user info with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.participantId).toBe(TEST_PID);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues new access token from valid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });
});
