// src/middlewares/auth.middleware.spec.ts
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { authenticate, authorize } from './auth.middleware.js';
import type { ITokenService } from '../security/security.interfaces.js';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';

describe('🛡️ Unit Test: middleware authenticate / authorize', () => {
  let tokens: jest.Mocked<ITokenService>;
  let res: Response;
  let next: jest.Mock;

  const reqWith = (authorization?: string) =>
    ({ headers: authorization ? { authorization } : {} }) as Request;

  beforeEach(() => {
    tokens = { sign: jest.fn(), verify: jest.fn() } as jest.Mocked<ITokenService>;
    res = { locals: {} } as unknown as Response;
    next = jest.fn();
  });

  it('sin header Authorization: responde 401', () => {
    authenticate(tokens)(reqWith(), res, next as unknown as NextFunction);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('token inválido o expirado: responde 401', () => {
    tokens.verify.mockReturnValue(null);
    authenticate(tokens)(reqWith('Bearer abc'), res, next as unknown as NextFunction);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('token válido: guarda el usuario en res.locals y continúa', () => {
    const payload = { sub: '1', email: 'a@b.com', role: 'user' as const };
    tokens.verify.mockReturnValue(payload);
    authenticate(tokens)(reqWith('Bearer bueno'), res, next as unknown as NextFunction);
    expect(res.locals['auth']).toEqual(payload);
    expect(next).toHaveBeenCalledWith();
  });

  it('authorize("admin") con rol user: responde 403', () => {
    res.locals['auth'] = { sub: '1', email: 'a@b.com', role: 'user' };
    authorize('admin')({} as Request, res, next as unknown as NextFunction);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});
