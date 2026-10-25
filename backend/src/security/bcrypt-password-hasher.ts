// src/security/bcrypt-password-hasher.ts
// Hash de contraseñas con bcrypt (bcryptjs: JavaScript puro, sin compilación nativa).
import bcrypt from 'bcryptjs';
import type { IPasswordHasher } from './security.interfaces.js';

export class BcryptPasswordHasher implements IPasswordHasher {
  constructor(private readonly rounds = 10) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
