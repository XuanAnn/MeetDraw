import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = AuthService.verifyToken(token);
    if (decoded && decoded.id && decoded.sessionId) {
      const activeSession = AuthService.getActiveSession(decoded.id);
      if (activeSession && activeSession !== decoded.sessionId) {
        return res.status(401).json({
          message: 'Tài khoản của bạn đã được đăng nhập từ một thiết bị hoặc trình duyệt khác.',
          code: 'DUPLICATE_LOGIN',
        });
      }
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = AuthService.verifyToken(token);
      req.user = decoded;
    } catch {
      // ignore guest
    }
  }
  next();
}
