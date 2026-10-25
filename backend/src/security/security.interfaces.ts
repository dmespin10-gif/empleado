// src/security/security.interfaces.ts
// Abstracciones de seguridad: el controlador depende de ellas, no de bcrypt ni de jsonwebtoken.
// Así el login también se puede probar con mocks (igual que el CRUD de empleados).
import type { AuthPayload } from '../domain/user.entity.js';

export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export interface ITokenService {
  sign(payload: AuthPayload): string;
  /** Devuelve el payload si el token es válido; null si es inválido o expiró. */
  verify(token: string): AuthPayload | null;
}
