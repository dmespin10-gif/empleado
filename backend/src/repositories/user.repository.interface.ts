// src/repositories/user.repository.interface.ts
// Contrato abstracto de persistencia de usuarios (Patrón Repository + Inversión de Dependencias).
import type { User, UserInput, UserWithPassword } from '../domain/user.entity.js';

export interface IUserRepository {
  /** Devuelve el usuario con su hash (para comparar la contraseña) o null. */
  findByEmail(email: string): Promise<UserWithPassword | null>;
  findById(id: string): Promise<User | null>;
  create(data: UserInput): Promise<User>;
}
