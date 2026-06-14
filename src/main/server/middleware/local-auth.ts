/**
 * Local Authentication Middleware
 * 
 * For the desktop app, we use a simplified auth flow:
 * - User logs in once (credentials verified against local SQLite)
 * - JWT token issued locally
 * - All subsequent requests validated against this token
 * 
 * Since this runs locally, we don't need the same level of
 * security as the cloud version (no CSRF, simpler rate limiting).
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Local JWT secret (generated on first run, stored in electron-store)
const LOCAL_JWT_SECRET = process.env.LOCAL_JWT_SECRET || 'syncbooks-desktop-local-secret-key';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  organizationId?: string;
  role?: string;
}

export function localAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, LOCAL_JWT_SECRET) as {
      sub: string;
      organizationId: string;
      role: string;
      email: string;
    };

    req.userId = decoded.sub;
    req.organizationId = decoded.organizationId;
    req.role = decoded.role;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signLocalToken(payload: {
  sub: string;
  organizationId: string;
  role: string;
  email: string;
}): string {
  return jwt.sign(payload, LOCAL_JWT_SECRET, { expiresIn: '30d' });
}

export function verifyLocalToken(token: string) {
  return jwt.verify(token, LOCAL_JWT_SECRET);
}
