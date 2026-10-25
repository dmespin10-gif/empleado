// src/controllers/auth.controller.ts
// Controlador de autenticación. Igual que EmployeeController, solo depende de abstracciones:
// IUserRepository, IPasswordHasher e ITokenService (no conoce Mongoose, bcrypt ni jsonwebtoken).
import type { Request, Response } from 'express';
import type { IUserRepository } from '../repositories/user.repository.interface.js';
import type { IPasswordHasher, ITokenService } from '../security/security.interfaces.js';
import type { LoginDto, RegisterDto } from '../dtos/auth.dto.js';
import type { AuthPayload, User } from '../domain/user.entity.js';
import { ConflictError, UnauthorizedError } from '../errors/app-error.js';
import { ResponseWrapper } from '../utils/api-response.js';

// Mismo mensaje para "email no existe" y "contraseña incorrecta": no se revela qué falló.
const INVALID_CREDENTIALS = 'Email o contraseña incorrectos';

export class AuthController {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly tokens: ITokenService,
  ) {}

  private issueToken(user: User): string {
    return this.tokens.sign({ sub: user.id, email: user.email, role: user.role });
  }

  /** POST /auth/register */
  register = async (req: Request, res: Response): Promise<void> => {
    const { nombre, email, password } = req.body as RegisterDto;

    if (await this.users.findByEmail(email)) {
      throw new ConflictError('Ya existe un usuario registrado con ese email');
    }

    const passwordHash = await this.hasher.hash(password);
    const user = await this.users.create({ nombre, email, passwordHash, role: 'user' });

    ResponseWrapper.success(res, { user, token: this.issueToken(user) }, 'Usuario registrado correctamente', 201);
  };

  /** POST /auth/login */
  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as LoginDto;

    const found = await this.users.findByEmail(email);
    if (!found || !(await this.hasher.compare(password, found.passwordHash))) {
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    const { passwordHash: _omit, ...user } = found;
    ResponseWrapper.success(res, { user, token: this.issueToken(user) }, 'Inicio de sesión exitoso');
  };

  /** GET /auth/me (requiere token) */
  me = async (_req: Request, res: Response): Promise<void> => {
    const auth = res.locals['auth'] as AuthPayload | undefined;
    const user = auth ? await this.users.findById(auth.sub) : null;
    if (!user) throw new UnauthorizedError('La sesión no es válida');
    ResponseWrapper.success(res, user, 'Usuario autenticado');
  };
}
