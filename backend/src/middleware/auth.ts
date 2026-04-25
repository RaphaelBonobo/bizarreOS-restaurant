import { Request, Response, NextFunction } from 'express';

const DESKTOP_TENANT_ID = 'restaurant-desktop-tenant';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string; role: string; tenantId: string };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  req.user = {
    userId: 'desktop',
    email: 'desktop@local',
    role: 'ADMIN',
    tenantId: DESKTOP_TENANT_ID,
  };
  return next();
}
