// src/middlewares/auth.middleware.ts
// Protege rutas: exige el header "Authorization: Bearer <token>".
// El payload verificado queda en res.locals.auth para el controlador.
import type { NextFunction, Request, Response } from 'express';
import type { ITokenService } from '../security/security.interfaces.js';
import type { AuthPayload, UserRole } from '../domain/user.entity.js';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';

export const authenticate =
  (tokens: ITokenService) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      next(new UnauthorizedError('Debe iniciar sesión (falta el token Bearer)'));
      return;
    }

    const payload = tokens.verify(token);
    if (!payload) {
      next(new UnauthorizedError('El token es inválido o ha expirado'));
      return;
    }

    res.locals['auth'] = payload;
    next();
  };

/** Uso: router.delete('/x', auth, authorize('admin'), handler) */
export const authorize =
  (...roles: UserRole[]) =>
  (_req: Request, res: Response, next: NextFunction): void => {
    const auth = res.locals['auth'] as AuthPayload | undefined;
    if (!auth || !roles.includes(auth.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
