// src/controllers/auth.controller.spec.ts
// Prueba unitaria del login: repositorio, hasher y servicio de tokens son MOCKS.
// No se importa mongoose, bcrypt ni jsonwebtoken.
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller.js';
import type { IUserRepository } from '../repositories/user.repository.interface.js';
import type { IPasswordHasher, ITokenService } from '../security/security.interfaces.js';
import type { User, UserWithPassword } from '../domain/user.entity.js';
import { ConflictError, UnauthorizedError } from '../errors/app-error.js';

describe('🔐 Unit Test: AuthController (login aislado con mocks)', () => {
  let controller: AuthController;
  let users: jest.Mocked<IUserRepository>;
  let hasher: jest.Mocked<IPasswordHasher>;
  let tokens: jest.Mocked<ITokenService>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let res: Partial<Response>;

  const user: User = {
    id: '665f1c2b9a1e4b0012345678',
    nombre: 'Deysi Espín',
    email: 'deysi@empresa.com',
    role: 'user',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
  const stored: UserWithPassword = { ...user, passwordHash: 'hash-guardado' };

  beforeEach(() => {
    users = { findByEmail: jest.fn(), findById: jest.fn(), create: jest.fn() } as jest.Mocked<IUserRepository>;
    hasher = { hash: jest.fn(), compare: jest.fn() } as jest.Mocked<IPasswordHasher>;
    tokens = { sign: jest.fn(), verify: jest.fn() } as jest.Mocked<ITokenService>;
    tokens.sign.mockReturnValue('token-falso');

    controller = new AuthController(users, hasher, tokens);

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = { status: statusMock, locals: {} } as unknown as Partial<Response>;
  });

  it('login correcto: responde 200 con el token y sin la contraseña', async () => {
    users.findByEmail.mockResolvedValue(stored);
    hasher.compare.mockResolvedValue(true);
    const req = { body: { email: user.email, password: 'Secreta123' } } as Request;

    await controller.login(req, res as Response);

    expect(hasher.compare).toHaveBeenCalledWith('Secreta123', 'hash-guardado');
    expect(tokens.sign).toHaveBeenCalledWith({ sub: user.id, email: user.email, role: 'user' });
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { user, token: 'token-falso' } }),
    );
  });

  it('login con contraseña incorrecta: lanza 401 y no emite token', async () => {
    users.findByEmail.mockResolvedValue(stored);
    hasher.compare.mockResolvedValue(false);
    const req = { body: { email: user.email, password: 'mala' } } as Request;

    await expect(controller.login(req, res as Response)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(tokens.sign).not.toHaveBeenCalled();
  });

  it('login con email inexistente: lanza 401 sin comparar contraseñas', async () => {
    users.findByEmail.mockResolvedValue(null);
    const req = { body: { email: 'nadie@empresa.com', password: 'x' } } as Request;

    await expect(controller.login(req, res as Response)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(hasher.compare).not.toHaveBeenCalled();
  });

  it('registro: guarda el hash (nunca la contraseña) y responde 201', async () => {
    users.findByEmail.mockResolvedValue(null);
    hasher.hash.mockResolvedValue('hash-nuevo');
    users.create.mockResolvedValue(user);
    const req = { body: { nombre: user.nombre, email: user.email, password: 'Secreta123' } } as Request;

    await controller.register(req, res as Response);

    expect(users.create).toHaveBeenCalledWith({
      nombre: user.nombre,
      email: user.email,
      passwordHash: 'hash-nuevo',
      role: 'user',
    });
    expect(statusMock).toHaveBeenCalledWith(201);
  });

  it('registro con email repetido: lanza 409', async () => {
    users.findByEmail.mockResolvedValue(stored);
    const req = { body: { nombre: user.nombre, email: user.email, password: 'Secreta123' } } as Request;

    await expect(controller.register(req, res as Response)).rejects.toBeInstanceOf(ConflictError);
    expect(users.create).not.toHaveBeenCalled();
  });
});
