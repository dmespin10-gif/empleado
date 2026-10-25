// src/app.ts
// Fábrica de la aplicación Express. Recibe sus dependencias desde afuera (index.ts).
import express, { type Express } from 'express';
import cors, { type CorsOptions } from 'cors';
import morgan from 'morgan';
import type { IEmployeeRepository } from './repositories/employee.repository.interface.js';
import type { IUserRepository } from './repositories/user.repository.interface.js';
import type { IPasswordHasher, ITokenService } from './security/security.interfaces.js';
import { EmployeeController } from './controllers/employee.controller.js';
import { AuthController } from './controllers/auth.controller.js';
import { createEmployeeRouter } from './routes/employee.routes.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { authenticate } from './middlewares/auth.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

/**
 * Construye la configuración de CORS de forma dinámica:
 * - Producción: solo permite el origen definido en FRONTEND_URL.
 * - Desarrollo (sin FRONTEND_URL): permite cualquier origen localhost (puertos comunes).
 */
const buildCorsOptions = (): CorsOptions => {
  // FRONTEND_URL admite varios orígenes separados por coma, por ejemplo:
  // https://front-empleados-xxx.azurewebsites.net,http://front-empleados-xxx.azurewebsites.net
  const allowedOrigins = (process.env['FRONTEND_URL'] ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => o.length > 0);

  if (allowedOrigins.length > 0) {
    // Producción: whitelist exacta (Azure App Service u otro origen)
    console.log(`🔒 [CORS]: Orígenes permitidos → ${allowedOrigins.join(', ')}`);
    return {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    };
  }

  // Desarrollo local: permite localhost en puertos típicos de Angular / Vite / CRA
  const localhostOrigins = [
    'http://localhost:4200',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:4200',
    'http://127.0.0.1:3000',
  ];
  console.log('🔓 [CORS]: Modo desarrollo – orígenes localhost permitidos.');
  return {
    origin: localhostOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
};

export interface AppDependencies {
  employeeRepository: IEmployeeRepository;
  userRepository: IUserRepository;
  passwordHasher: IPasswordHasher;
  tokenService: ITokenService;
}

export const createApp = ({
  employeeRepository,
  userRepository,
  passwordHasher,
  tokenService,
}: AppDependencies): Express => {
  const app = express();

  // Settings
  app.set('nombreApp', 'Gestión de empleados');

  // Middlewares globales
  app.use(cors(buildCorsOptions()));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '100kb' }));

  // Rutas
  const requireAuth = authenticate(tokenService);
  const authController = new AuthController(userRepository, passwordHasher, tokenService);
  const employeeController = new EmployeeController(employeeRepository);
  app.use('/api/v1', createAuthRouter(authController, requireAuth));
  app.use('/api/v1', createEmployeeRouter(employeeController, requireAuth));

  // Interceptores finales (el orden importa: 404 y luego errores)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
