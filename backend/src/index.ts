// src/index.ts
// Composition Root: único lugar donde se decide QUÉ implementación concreta se usa.

// Cargar variables de entorno antes de acceder a process.env
try {
  process.loadEnvFile();
} catch {
  // Ignorar si el archivo .env no existe o ya fue cargado por flags de Node
}

import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { securityConfig, seedAdmin } from './config/security.js';
import { MongoEmployeeRepository } from './repositories/mongo-employee.repository.js';
import { MongoUserRepository } from './repositories/mongo-user.repository.js';
import { BcryptPasswordHasher } from './security/bcrypt-password-hasher.js';
import { JwtTokenService } from './security/jwt-token.service.js';

const PORT = Number(process.env['PORT'] ?? 5000);
const MONGO_URI = process.env['MONGO_URI'] ?? 'mongodb://127.0.0.1/usuarios_db';

const bootstrap = async (): Promise<void> => {
  await connectDatabase(MONGO_URI);

  const config = securityConfig();
  const userRepository = new MongoUserRepository();
  const passwordHasher = new BcryptPasswordHasher();
  await seedAdmin(userRepository, passwordHasher, config.adminEmail, config.adminPassword);

  const app = createApp({
    employeeRepository: new MongoEmployeeRepository(),
    userRepository,
    passwordHasher,
    tokenService: new JwtTokenService(config.jwtSecret, config.jwtExpiresIn),
  });
  // 0.0.0.0 → acepta conexiones externas (necesario para http://18.222.83.229:5000)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor escuchando en http://0.0.0.0:${PORT}/api/v1`);
  });
};

void bootstrap();
