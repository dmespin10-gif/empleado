// src/security/jwt-token.service.ts
// Emisión y verificación de JSON Web Tokens (HS256).
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AuthPayload, UserRole } from '../domain/user.entity.js';
import type { ITokenService } from './security.interfaces.js';

export class JwtTokenService implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: SignOptions['expiresIn'] = '1h',
  ) {}

  sign(payload: AuthPayload): string {
    return jwt.sign({ email: payload.email, role: payload.role }, this.secret, {
      subject: payload.sub,
      expiresIn: this.expiresIn ?? '1h',
      algorithm: 'HS256',
    });
  }

  verify(token: string): AuthPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret, { algorithms: ['HS256'] });
      if (typeof decoded === 'string' || !decoded.sub) return null;
      return { sub: decoded.sub, email: String(decoded['email']), role: decoded['role'] as UserRole };
    } catch {
      return null; // firma inválida, token mal formado o expirado
    }
  }
}
