import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface JwtPayload {
  sub: string;        // learner UUID
  participantId: string;
  cohort: 'experimental' | 'control';
  role: 'learner' | 'research_admin';
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return next(new AppError(401, 'Missing or invalid authorisation header', 'UNAUTHENTICATED'));

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    next();
  } catch {
    next(new AppError(401, 'Token invalid or expired', 'TOKEN_EXPIRED'));
  }
}

export function requireRole(...roles: JwtPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role))
      return next(new AppError(403, 'Insufficient permissions', 'FORBIDDEN'));
    next();
  };
}

export function requireConsent(field: string) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // Consent gate enforced at service layer with DB lookup;
    // this middleware marks intent for OpenAPI docs.
    void field;
    next();
  };
}
