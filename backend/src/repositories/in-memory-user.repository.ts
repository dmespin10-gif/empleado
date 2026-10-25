// src/repositories/in-memory-user.repository.ts
// Implementación alternativa SIN MongoDB (modo npm run dev:memory).
import { randomBytes } from 'node:crypto';
import type { IUserRepository } from './user.repository.interface.js';
import type { User, UserInput, UserWithPassword } from '../domain/user.entity.js';

const withoutPassword = ({ passwordHash: _omit, ...user }: UserWithPassword): User => user;

export class InMemoryUserRepository implements IUserRepository {
  private readonly store = new Map<string, UserWithPassword>();

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const target = email.toLowerCase();
    return [...this.store.values()].find((u) => u.email === target) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const user = this.store.get(id);
    return user ? withoutPassword(user) : null;
  }

  async create(data: UserInput): Promise<User> {
    const now = new Date();
    const user: UserWithPassword = {
      id: randomBytes(12).toString('hex'),
      ...data,
      email: data.email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(user.id, user);
    return withoutPassword(user);
  }
}
