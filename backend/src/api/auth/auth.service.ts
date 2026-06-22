import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import {
  generateParticipantId,
  isValidParticipantId,
  normalizeParticipantId,
} from '../../lib/participantId';
import { AppError } from '../../middleware/errorHandler';
import { resolveLearnerAccessSnapshot } from '../../services/learnerAccess';
import type { CohortType, UserRole } from '../../types';

const JWT_SECRET          = process.env.JWT_SECRET!;
const ACCESS_EXPIRES_IN   = process.env.JWT_ACCESS_EXPIRES_IN  ?? '15m';
const REFRESH_EXPIRES_IN  = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

interface RegisterInput {
  participantId?: string;
  password: string;
  cohort: CohortType;
  role: UserRole | 'researcher' | 'admin';
}

function normalizeUserRole(role?: UserRole | 'researcher' | 'admin' | null): UserRole {
  if (role === 'researcher' || role === 'admin' || role === 'research_admin') {
    return 'research_admin';
  }
  return 'learner';
}

function inferRoleFromParticipantId(participantId: string): UserRole {
  const normalizedId = normalizeParticipantId(participantId);
  if (normalizedId.includes('ADMIN') || normalizedId.includes('RESEARCHER') || normalizedId.includes('RADMIN')) {
    return 'research_admin';
  }
  return 'learner';
}

function signAccess(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN } as any);
}

function signRefresh() {
  return uuidv4();   // opaque token stored in Redis
}

export async function register(input: RegisterInput) {
  const normalizedRole = normalizeUserRole(input.role);
  const participantId = input.participantId
    ? normalizeParticipantId(input.participantId)
    : generateParticipantId(normalizedRole === 'research_admin' ? 'RADMIN' : 'PHD');

  if (!isValidParticipantId(participantId)) {
    throw new AppError(
      400,
      'Participant ID must be a secure fixed 20-character identifier.',
      'INVALID_PARTICIPANT_ID',
    );
  }

  const existing = await prisma.learner.findUnique({
    where: { participantId },
  });
  if (existing) throw new AppError(409, 'Participant ID already registered', 'DUPLICATE_ID');

  const learner = await prisma.learner.create({
    data: {
      participantId,
      cohort: input.cohort as any,
      role: normalizedRole as any,
      isActive: normalizedRole === 'research_admin',
    },
  });

  const hash = await bcrypt.hash(input.password, 12);
  await prisma.authCredential.create({
    data: { learnerId: learner.id, passwordHash: hash },
  });

  return { learnerId: learner.id, participantId: learner.participantId };
}

export async function login(participantId: string, password: string) {
  const learner = await prisma.learner.findUnique({
    where: { participantId: normalizeParticipantId(participantId) },
  });
  if (!learner) throw new AppError(401, 'Invalid credentials', 'BAD_CREDENTIALS');

  const cred = await prisma.authCredential.findUnique({ where: { learnerId: learner.id } });
  if (!cred) throw new AppError(401, 'Invalid credentials', 'BAD_CREDENTIALS');

  // Lock check
  if (cred.lockedUntil && cred.lockedUntil > new Date()) {
    throw new AppError(423, 'Account temporarily locked', 'ACCOUNT_LOCKED');
  }

  const valid = await bcrypt.compare(password, cred.passwordHash);
  if (!valid) {
    const attempts = cred.failedAttempts + 1;
    await prisma.authCredential.update({
      where: { learnerId: learner.id },
      data: {
        failedAttempts: attempts,
        lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
    });
    throw new AppError(401, 'Invalid credentials', 'BAD_CREDENTIALS');
  }

  // Reset failed attempts
  await prisma.authCredential.update({
    where: { learnerId: learner.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLogin: new Date() },
  });

  const role = normalizeUserRole((learner as any).role ?? inferRoleFromParticipantId(learner.participantId));

  const payload = {
    sub: learner.id,
    participantId: learner.participantId,
    cohort: learner.cohort,
    role,
  };

  const accessToken  = signAccess(payload);
  const refreshToken = signRefresh();

  // Store refresh token in Redis (learner.id → token)
  await redis.set(`refresh:${learner.id}`, refreshToken, 'EX', REFRESH_TTL_SECONDS);

  return { accessToken, refreshToken, learnerId: learner.id };
}

export async function refreshTokens(refreshToken: string) {
  // Find which learner owns it by scanning (small user base — acceptable)
  // In production, store learner→token mapping with index
  const keys = await redis.keys('refresh:*');
  let learnerId: string | null = null;

  for (const key of keys) {
    const stored = await redis.get(key);
    if (stored === refreshToken) {
      learnerId = key.replace('refresh:', '');
      break;
    }
  }

  if (!learnerId) throw new AppError(401, 'Refresh token invalid or expired', 'BAD_REFRESH');

  const learner = await prisma.learner.findUnique({ where: { id: learnerId } });
  if (!learner) throw new AppError(401, 'Learner not found', 'NOT_FOUND');

  const role = normalizeUserRole((learner as any).role ?? inferRoleFromParticipantId(learner.participantId));

  const payload = {
    sub: learner.id,
    participantId: learner.participantId,
    cohort: learner.cohort,
    role,
  };

  const newAccess  = signAccess(payload);
  const newRefresh = signRefresh();
  await redis.set(`refresh:${learnerId}`, newRefresh, 'EX', REFRESH_TTL_SECONDS);

  return { accessToken: newAccess, refreshToken: newRefresh };
}

export async function logout(learnerId: string) {
  await redis.del(`refresh:${learnerId}`);
}

export async function getMe(learnerId: string) {
  const learner = await prisma.learner.findUnique({
    where: { id: learnerId },
    select: {
      id: true, participantId: true, cohort: true, role: true,
      createdAt: true, lastActive: true,
    },
  });
  if (!learner) throw new AppError(404, 'Learner not found', 'NOT_FOUND');
  const access = await resolveLearnerAccessSnapshot(learnerId);
  return {
    ...learner,
    role: normalizeUserRole((learner as any).role ?? inferRoleFromParticipantId(learner.participantId)),
    isActive: access.isActive,
    groupLabel: access.groupLabel,
    groupEmotionTrackingEnabled: access.groupEmotionTrackingEnabled,
    emotionTrackingOverride: access.emotionTrackingOverride,
    emotionTrackingEnabled: access.emotionTrackingEnabled,
  };
}
